import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateFinalStatus,
  aggregateTaskFinalStatus,
  classifyTaskFinalStatus,
} from '../src/pages/etlDataMonitoringOptimization/statusModel.ts';

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
