import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  aggregateFinalStatus,
  aggregateTaskFinalStatus,
  classifyTaskFinalStatus,
  isPlanTimedOut,
} from '../src/pages/etlDataMonitoringOptimization/statusModel.ts';
import {
  acceptRetryAttempt,
  applyEffectiveAttempts,
  availableRetryKinds,
  acceptRetrySimulation,
  beginRetrySimulation,
  canStartRetry,
  completeRetrySimulation,
  createBusinessDetailKey,
  prepareRetryAttempt,
  startRetrySimulation,
  settleRetryAttempt,
} from '../src/pages/etlDataMonitoringOptimization/retryConsistency.ts';

test('accepted collect retry resets every downstream stage', () => {
  const attempt = acceptRetryAttempt({
    version: 1,
    collectStatus: '失败',
    importStatus: '失败',
    validationStatus: '无任务',
  }, 'collect');

  assert.equal(attempt.version, 2);
  assert.equal(attempt.lifecycle, 'waiting');
  assert.deepEqual(
    [attempt.collectStatus, attempt.importStatus, attempt.validationStatus],
    ['等待', '无任务', '无任务'],
  );
});

test('accepted import retry keeps successful collection', () => {
  const attempt = acceptRetryAttempt({
    version: 3,
    collectStatus: '成功',
    importStatus: '失败',
    validationStatus: '无任务',
  }, 'import');

  assert.equal(attempt.version, 4);
  assert.deepEqual(
    [attempt.collectStatus, attempt.importStatus, attempt.validationStatus],
    ['成功', '等待', '无任务'],
  );
});

test('submitting keeps the confirmed attempt until a legal retry is accepted', () => {
  const record = {
    key: 'detail-1',
    collectStatus: '成功' as const,
    importStatus: '失败' as const,
    validationStatus: '无任务' as const,
  };
  const initial = { attempts: {}, phases: {} };
  const submitting = startRetrySimulation(initial, record, 'import');
  const duplicate = startRetrySimulation(submitting.state, record, 'import');
  const accepted = acceptRetrySimulation(submitting.state, record, 'import');

  assert.equal(submitting.result, 'accepted');
  assert.deepEqual(submitting.state.attempts, {});
  assert.equal(submitting.state.phases[record.key], 'submitting');
  assert.equal(duplicate.result, 'rejected');
  assert.equal(accepted.result, 'accepted');
  assert.deepEqual(
    [accepted.attempt?.collectStatus, accepted.attempt?.importStatus, accepted.attempt?.validationStatus],
    ['成功', '等待', '无任务'],
  );
  assert.equal(accepted.state.phases[record.key], 'waiting');
});

test('completed retry failure keeps its new reason while clearing prior error facts', () => {
  const record = {
    key: 'detail-1',
    collectStatus: '失败' as const,
    importStatus: '无任务' as const,
    validationStatus: '无任务' as const,
    collectErrorCode: '2101',
    issueStage: '取数执行' as const,
    errorCode: '2101',
    reason: '旧失败原因',
    planElapsedMinutes: 301,
    planTimeoutMinutes: 300,
  };
  const accepted = acceptRetryAttempt(record, 'collect');
  const failed = settleRetryAttempt(accepted, accepted.version, 'failure');
  const projected = applyEffectiveAttempts([record], { [record.key]: failed })[0];

  assert.equal(projected.issueStage, '取数执行');
  assert.equal(projected.reason, '本次重试失败');
  assert.equal(projected.errorCode, undefined);
  assert.equal(projected.collectErrorCode, undefined);
  assert.equal(projected.planElapsedMinutes, undefined);
  assert.equal(projected.planTimeoutMinutes, undefined);
});

test('stable business detail keys are shared across store and table drilldowns', () => {
  const storeKey = createBusinessDetailKey({
    date: '2026-07-14',
    storeName: '内亲拼多多旗舰店',
    tableName: '订单履约费用明细',
    taskName: '拼多多商家后台订单履约费用明细采集',
  });
  const tableKey = createBusinessDetailKey({
    date: '2026-07-14',
    storeName: '内亲拼多多旗舰店',
    tableName: '订单履约费用明细',
    taskName: '拼多多商家后台订单履约费用明细采集',
  });

  assert.equal(storeKey, tableKey);
});

test('retry choices follow the failed stage', () => {
  assert.deepEqual(availableRetryKinds({ collectStatus: '失败', importStatus: '无任务' }), ['collect']);
  assert.deepEqual(availableRetryKinds({ collectStatus: '成功', importStatus: '失败' }), ['import']);
});

test('latest projection replaces one stable row without appending', () => {
  const rows = [{
    key: 'detail-1',
    version: 1,
    collectStatus: '失败',
    importStatus: '失败',
    validationStatus: '无任务',
  }] as const;
  const accepted = acceptRetryAttempt({ ...rows[0], version: 1 }, 'collect');
  const projected = applyEffectiveAttempts(rows, {
    'detail-1': settleRetryAttempt(accepted, accepted.version, 'success'),
  });

  assert.equal(projected.length, 1);
  assert.deepEqual(
    [projected[0].collectStatus, projected[0].importStatus],
    ['成功', '成功'],
  );
});

test('another failed child keeps the parent failed while retry waits', () => {
  const waiting = acceptRetryAttempt({
    version: 1,
    collectStatus: '失败',
    importStatus: '无任务',
    validationStatus: '无任务',
  }, 'collect');

  assert.equal(aggregateTaskFinalStatus([
    waiting,
    { collectStatus: '失败', importStatus: '无任务', validationStatus: '无任务' },
  ]), 'failed');
});

test('rejects retry kinds that are not available for the current failure', () => {
  assert.throws(() => acceptRetryAttempt({
    version: 1,
    collectStatus: '失败',
    importStatus: '无任务',
    validationStatus: '无任务',
  }, 'import'), /不允许重试/);
});

test('stale retry responses cannot overwrite a newer effective attempt', () => {
  const current = acceptRetryAttempt({
    version: 1,
    collectStatus: '失败',
    importStatus: '无任务',
    validationStatus: '无任务',
  }, 'collect');
  const settled = settleRetryAttempt(current, 1, 'success');

  assert.strictEqual(settled, current);
  assert.equal(settled.lifecycle, 'waiting');
  assert.equal(settled.collectStatus, '等待');
});

test('completed effective attempts cannot be settled again', () => {
  const current = acceptRetryAttempt({
    version: 1,
    collectStatus: '失败',
    importStatus: '无任务',
    validationStatus: '无任务',
  }, 'collect');
  const completed = settleRetryAttempt(current, current.version, 'success');
  const settled = settleRetryAttempt(completed, completed.version, 'failure');

  assert.strictEqual(settled, completed);
  assert.equal(settled.collectStatus, '成功');
  assert.equal(settled.lifecycle, 'completed');
});

test('lower-version candidates cannot overwrite a newer effective row', () => {
  const row = {
    key: 'detail-1',
    version: 3,
    lifecycle: 'completed' as const,
    collectStatus: '成功',
    importStatus: '成功',
    validationStatus: '正常',
  };
  const candidate = { ...row, version: 2, lifecycle: 'completed' as const, collectStatus: '失败' as const };

  assert.strictEqual(applyEffectiveAttempts([row], { 'detail-1': candidate })[0], row);
});

test('same-version waiting candidates cannot roll back a completed row', () => {
  const row = {
    key: 'detail-1',
    version: 3,
    lifecycle: 'completed' as const,
    collectStatus: '成功',
    importStatus: '成功',
    validationStatus: '正常',
  };
  const candidate = { ...row, lifecycle: 'waiting' as const, collectStatus: '等待' as const };

  assert.strictEqual(applyEffectiveAttempts([row], { 'detail-1': candidate })[0], row);
});

test('higher-version and waiting-to-completed candidates can project', () => {
  const row = {
    key: 'detail-1',
    version: 1,
    lifecycle: 'waiting' as const,
    collectStatus: '等待',
    importStatus: '无任务',
    validationStatus: '无任务',
  };
  const candidate = { ...row, version: 2, lifecycle: 'completed' as const, collectStatus: '成功', importStatus: '成功', validationStatus: '正常' };

  const projected = applyEffectiveAttempts([row], { 'detail-1': candidate });
  assert.strictEqual(projected[0].version, 2);
  assert.strictEqual(projected[0].lifecycle, 'completed');
});

test('timeout uses the effective per-plan threshold, strictly greater rather than equal', () => {
  assert.equal(isPlanTimedOut({ planElapsedMinutes: 61, planTimeoutMinutes: 60 }), true);
  assert.equal(isPlanTimedOut({ planElapsedMinutes: 61, planTimeoutMinutes: 120 }), false);
  assert.equal(isPlanTimedOut({ planElapsedMinutes: 300, planTimeoutMinutes: 300 }), false);
  assert.equal(isPlanTimedOut({ planElapsedMinutes: 301, planTimeoutMinutes: 300 }), true);
  assert.equal(isPlanTimedOut({ planElapsedMinutes: 301 }), false);
  assert.equal(isPlanTimedOut({ planElapsedMinutes: 1, planTimeoutMinutes: 0 }), false);
});

test('plan timeout overrides waiting and abnormal without changing execution facts', () => {
  const task = { collectStatus: '运行中', importStatus: '等待', validationStatus: '无任务', planElapsedMinutes: 61, planTimeoutMinutes: 60 } as const;
  assert.equal(classifyTaskFinalStatus(task), 'failed');
  assert.equal(classifyTaskFinalStatus({ ...task, planTimeoutMinutes: 120 }), 'waiting');
  assert.equal(classifyTaskFinalStatus({ ...task, collectStatus: '失败', collectErrorCode: '1103' }), 'failed');
  assert.equal(aggregateTaskFinalStatus([task, { collectStatus: '成功', importStatus: '成功', validationStatus: '正常' }]), 'failed');
  assert.equal(task.collectStatus, '运行中');
});

test('classifies collect 1xxx as abnormal', () => {
  assert.equal(classifyTaskFinalStatus({
    collectStatus: '失败',
    importStatus: '无任务',
    validationStatus: '无任务',
    collectErrorCode: '1103',
  }), 'abnormal');
});

test('classifies collect 2xxx and 3xxx as failed', () => {
  for (const code of ['2101', '3201']) {
    assert.equal(classifyTaskFinalStatus({
      collectStatus: '失败',
      importStatus: '无任务',
      validationStatus: '无任务',
      collectErrorCode: code,
    }), 'failed');
  }
});

test('classifies any import error as failed', () => {
  assert.equal(classifyTaskFinalStatus({
    collectStatus: '成功',
    importStatus: '失败',
    validationStatus: '无任务',
    importErrorCode: '1001',
  }), 'failed');
});

test('classifies validation failure after import as abnormal', () => {
  assert.equal(classifyTaskFinalStatus({
    collectStatus: '成功',
    importStatus: '成功',
    validationStatus: '异常',
  }), 'abnormal');
});

test('classifies unfinished and successful tasks', () => {
  assert.equal(classifyTaskFinalStatus({
    collectStatus: '运行中',
    importStatus: '等待',
    validationStatus: '无任务',
  }), 'waiting');
  assert.equal(classifyTaskFinalStatus({
    collectStatus: '成功',
    importStatus: '成功',
    validationStatus: '正常',
  }), 'success');
});

test('returns noTask only when every detail has no task', () => {
  assert.equal(aggregateFinalStatus(['noTask', 'noTask']), 'noTask');
  assert.equal(aggregateFinalStatus(['noTask', 'success']), 'success');
});

test('aggregates by failed abnormal waiting success priority', () => {
  assert.equal(aggregateFinalStatus(['success', 'waiting', 'abnormal', 'failed']), 'failed');
  assert.equal(aggregateFinalStatus(['success', 'waiting', 'abnormal']), 'abnormal');
});

test('aggregates independent task-stage facts without a seeded final status', () => {
  const taskFacts = [
    { collectStatus: '无任务', importStatus: '无任务', validationStatus: '无任务' },
    { collectStatus: '成功', importStatus: '成功', validationStatus: '正常' },
    {
      collectStatus: '失败',
      importStatus: '无任务',
      validationStatus: '无任务',
      collectErrorCode: '1103',
    },
    { collectStatus: '成功', importStatus: '成功', validationStatus: '异常' },
    {
      collectStatus: '成功',
      importStatus: '失败',
      validationStatus: '无任务',
      importErrorCode: '1001',
    },
  ] as const;

  assert.equal(aggregateTaskFinalStatus(taskFacts), 'failed');
  assert.equal(aggregateTaskFinalStatus(taskFacts.slice(0, -1)), 'abnormal');
});

test('monitor views aggregate the projected rows passed to drilldown', () => {
  const page = readFileSync(
    new URL('../src/pages/etlDataMonitoringOptimization/index.tsx', import.meta.url),
    'utf8',
  );
  assert.match(page, /applyEffectiveAttempts\(createStoreDrilldownRecords/);
  assert.match(page, /applyEffectiveAttempts\(createTableDrilldownRecords/);
  assert.match(page, /aggregateTaskFinalStatus\(currentStoreDetails/);
  assert.match(page, /aggregateTaskFinalStatus\(currentTableDetails/);
});

test('import retry waiting clears failed execution facts and keeps one projected row', () => {
  const rows = [{
    key: 'detail-1',
    collectStatus: '成功' as const,
    importStatus: '失败' as const,
    validationStatus: '无任务' as const,
    importErrorCode: '2003',
    issueStage: '数据入库' as const,
    errorCode: '2003',
    reason: '存在映射关系不存在的字段',
    planElapsedMinutes: 301,
    planTimeoutMinutes: 300,
    collectNoData: true,
  }];
  const pending = acceptRetryAttempt(rows[0], 'import');
  const projected = applyEffectiveAttempts(rows, { 'detail-1': pending });

  assert.equal(projected.length, 1);
  assert.equal(aggregateTaskFinalStatus(projected), 'waiting');
  assert.equal(projected[0].importErrorCode, undefined);
  assert.equal(projected[0].issueStage, undefined);
  assert.equal(projected[0].errorCode, undefined);
  assert.equal(projected[0].reason, undefined);
  assert.equal(projected[0].planElapsedMinutes, undefined);
  assert.equal(projected[0].planTimeoutMinutes, undefined);
  assert.equal(projected[0].collectNoData, undefined);
});

test('completed collect retry clears prior timeout facts and aggregates as success', () => {
  const rows = [{
    key: 'detail-1',
    collectStatus: '失败' as const,
    importStatus: '无任务' as const,
    validationStatus: '无任务' as const,
    collectErrorCode: '2101',
    issueStage: '取数执行' as const,
    errorCode: '2101',
    reason: '计划运行超时',
    planElapsedMinutes: 301,
    planTimeoutMinutes: 300,
    collectNoData: true,
  }];
  const pending = acceptRetryAttempt(rows[0], 'collect');
  const completed = settleRetryAttempt(pending, pending.version, 'success');
  const projected = applyEffectiveAttempts(rows, { 'detail-1': completed });

  assert.equal(projected.length, 1);
  assert.equal(aggregateTaskFinalStatus(projected), 'success');
  assert.equal(projected[0].planElapsedMinutes, undefined);
  assert.equal(projected[0].planTimeoutMinutes, undefined);
  assert.equal(projected[0].collectErrorCode, undefined);
});

test('new retry version advances from the active attempt and rejects in-flight duplicates', () => {
  const record = {
    key: 'detail-1',
    version: 1,
    collectStatus: '失败' as const,
    importStatus: '无任务' as const,
    validationStatus: '无任务' as const,
    durationSeconds: '--',
    actualImportTime: '--',
  };
  const active = {
    ...settleRetryAttempt(acceptRetryAttempt(record, 'collect'), 2, 'failure'),
    version: 7,
  };
  const next = prepareRetryAttempt(record, active, 'collect');

  assert.equal(next.version, 8);
  assert.equal(canStartRetry('submitting'), false);
  assert.equal(canStartRetry('waiting'), false);
  assert.equal(canStartRetry('completed'), true);
});

test('retry simulation rejects duplicates and ignores late completion after a newer attempt begins', () => {
  const record = {
    key: 'detail-1',
    collectStatus: '失败' as const,
    importStatus: '无任务' as const,
    validationStatus: '无任务' as const,
    durationSeconds: '--',
    actualImportTime: '--',
  };
  const initial = { attempts: {}, phases: {} };
  const first = beginRetrySimulation(initial, record, 'collect');
  const duplicate = beginRetrySimulation(first.state, record, 'collect');

  assert.equal(first.result, 'accepted');
  assert.equal(first.attempt?.version, 2);
  assert.equal(first.state.phases[record.key], 'waiting');
  assert.equal(duplicate.result, 'rejected');
  assert.strictEqual(duplicate.state, first.state);

  const failed = completeRetrySimulation(first.state, record.key, 2, 'failure');
  const second = beginRetrySimulation(failed, record, 'collect');
  const lateCompletion = completeRetrySimulation(second.state, record.key, 2, 'success');
  const completed = completeRetrySimulation(second.state, record.key, 3, 'success');

  assert.equal(failed.attempts[record.key].lifecycle, 'completed');
  assert.equal(second.result, 'accepted');
  assert.equal(second.attempt?.version, 3);
  assert.equal(second.state.phases[record.key], 'waiting');
  assert.strictEqual(lateCompletion, second.state);
  assert.equal(completed.attempts[record.key].lifecycle, 'completed');
  assert.equal(completed.attempts[record.key].collectStatus, '成功');
  assert.equal(completed.phases[record.key], 'completed');
});
