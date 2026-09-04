import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileStrategy, validateSchedule, scopedObjects, latestDailyStatus, aggregateDelivery, deliveryStatus, claimNotification, newException, buildStrategySnapshot } from '../src/pages/pushStrategyCenter/strategyRules.ts';
import { getStrategyDetail, queryHistory, getHistoryDetail, setProductAvailability, setObjectAvailability, updateStrategyStatus } from '../src/pages/pushStrategyCenter/services.ts';
import type { PushStrategy, PushChannel, RelatedObjectOption } from '../src/pages/pushStrategyCenter/interface.ts';

const schedule = { cycle: 'DAY' as const, weekDays: [], monthDays: [], timeRanges: [{ id: '1', time: '09:00' }] };
const strategy: PushStrategy = { id: 's', name: '测试策略', productCategory: '电商取数宝', pushMode: 'SCHEDULED', messageType: 'PROGRESS', relatedObjectType: 'TASK', relatedMode: 'CUSTOM', relatedObjectIds: ['o'], channelIds: ['c'], status: 'ENABLED', schedule, updatedAt: '' };
const object: RelatedObjectOption = { id: 'o', name: '测试计划', type: 'TASK', productCategory: '电商取数宝', group: '计划', delivery: 'failed' };
const channel = { id: 'c', status: 'ENABLED' } as PushChannel;
const reconcile = (s = strategy, products = ['电商取数宝'], objects = [object], channels = [channel]) => reconcileStrategy(s, products, objects, channels);

test('specific times require a complete time and at least 30 minute separation', () => {
  assert.equal(validateSchedule(schedule), '');
  for (const time of ['', '25:00', '09:15', '09:00']) {
    assert.ok(validateSchedule({ ...schedule, timeRanges: [...schedule.timeRanges, { id: '2', time }] }));
  }
  assert.equal(validateSchedule({ ...schedule, timeRanges: [...schedule.timeRanges, { id: '2', time: '09:30' }] }), '');
  assert.ok(validateSchedule({ ...schedule, cycle: 'WEEK' }));
  assert.ok(validateSchedule({ ...schedule, cycle: 'MONTH' }));
});

test('automatic expiry and renewal preserve manual disable and all blocking reasons', () => {
  const expired = reconcile(strategy, []);
  assert.equal(expired.status, 'DISABLED');
  assert.equal(reconcile(expired).status, 'ENABLED');
  const manual = reconcile({ ...strategy, status: 'DISABLED', manualDisabled: true }, []);
  assert.equal(reconcile(manual).status, 'DISABLED');
  const both = reconcile(strategy, [], [{ ...object, invalid: true }]);
  assert.deepEqual(both.autoStopReasons, ['PRODUCT', 'OBJECTS']);
  const productBack = reconcile(both, ['电商取数宝'], [{ ...object, invalid: true }]);
  assert.equal(productBack.status, 'DISABLED');
  assert.equal(reconcile(productBack).status, 'DISABLED');
});

test('custom object identity and ALL empty scope have different lifecycle behavior', () => {
  const gone = reconcile(strategy, ['电商取数宝'], []);
  assert.equal(gone.status, 'DISABLED');
  assert.equal(reconcile(gone, ['电商取数宝'], [{ ...object, id: 'same-name-new-id' }]).status, 'DISABLED');
  assert.equal(reconcile(gone).status, 'DISABLED');
  assert.equal(reconcile({ ...gone, requiresManualEnable: false, autoStopReasons: [] }).status, 'ENABLED');
  assert.equal(reconcile({ ...strategy, relatedMode: 'ALL' }, ['电商取数宝'], []).status, 'ENABLED');
  assert.equal(scopedObjects({ ...strategy, productCategory: '跨境取数宝' }, [object]).length, 0);
});

test('all channels disabled preserves enabled, deletion requires manual reenable', () => {
  const paused = reconcile(strategy, ['电商取数宝'], [object], [{ ...channel, status: 'DISABLED' }]);
  assert.equal(paused.status, 'ENABLED');
  assert.equal(paused.unavailableReason, '无可用推送渠道');
  const deleted = reconcile({ ...strategy, channelIds: [] }, ['电商取数宝'], [object], []);
  assert.equal(deleted.status, 'DISABLED');
  assert.equal(reconcile({ ...deleted, channelIds: ['c'] }).status, 'DISABLED');
  assert.equal(reconcile({ ...deleted, channelIds: ['c'], manualDisabled: false }).status, 'ENABLED');
});

test('latest daily record replaces former failure and each object aggregates its own details', () => {
  assert.equal(latestDailyStatus([{ order: 1, fetch: 'success', storage: 'failed' }, { order: 2, fetch: 'success', storage: 'success', check: 'success' }]), 'success');
  assert.equal(deliveryStatus({ fetch: 'success', storage: 'success', check: 'waiting' }), 'running');
  assert.equal(deliveryStatus({ fetch: 'success', storage: 'failed' }), 'failed');
  const firstShop = aggregateDelivery(['success', 'success']);
  const secondShop = aggregateDelivery(['failed', 'running']);
  assert.equal(firstShop, 'success');
  assert.equal(secondShop, 'failed');
  assert.equal(aggregateDelivery([firstShop, secondShop]), 'failed');
});

test('attempt ledger is independent per strategy/channel and does not retry failed attempts', () => {
  const attempts = new Set<string>();
  const event = { strategyId: 's', objectId: 'o', channelId: 'c', kind: 'exception' as const, period: 'round1', eligible: true };
  assert.equal(claimNotification(attempts, event), true);
  assert.equal(claimNotification(attempts, event), false);
  assert.equal(claimNotification(attempts, { ...event, strategyId: 's2' }), true);
  assert.equal(claimNotification(attempts, { ...event, channelId: 'c2' }), true);
  assert.equal(claimNotification(attempts, { ...event, period: 'round2' }), true);
  assert.equal(newException('failed', 'failed'), false);
  assert.equal(newException('failed', 'failed', true), false);
  assert.equal(newException('success', 'failed'), true);
  assert.equal(claimNotification(attempts, { ...event, kind: 'success', period: '2026-09-03' }), true);
  assert.equal(claimNotification(attempts, { ...event, kind: 'success', period: '2026-09-03' }), false);
});

test('draft preview uses product/scope/channel, one cutoff and previous business day for all views', () => {
  const views = ['v1', 'v2'].map(id => ({ ...object, id, type: 'MONITOR_VIEW' as const, name: id }));
  const draft = { ...strategy, name: '未保存名称', relatedObjectType: 'MONITOR_VIEW' as const, relatedObjectIds: ['v1', 'v2'] };
  const snapshot = buildStrategySnapshot(draft, views, 'FEISHU', new Date(2026, 8, 3, 15, 0));
  assert.equal(snapshot.model.strategy, draft.name);
  assert.equal(snapshot.model.monitorViews?.length, 2);
  assert.equal(new Set(snapshot.model.monitorViews?.map(v => v.startTime)).size, 1);
  assert.equal(snapshot.target.businessDate, '2026-09-02');
  assert.equal(snapshot.target.single, false);
  const single = buildStrategySnapshot({ ...draft, relatedObjectIds: ['v2'] }, views, 'WECOM');
  assert.deepEqual(single.target.ids, ['v2']);
  assert.equal(single.target.single, true);
  const zero = buildStrategySnapshot({ ...draft, messageType: 'EXCEPTION_SUMMARY' }, views.map(v => ({ ...v, delivery: 'success' })), 'FEISHU');
  assert.equal(zero.model.monitorViews?.length, 0);
});

test('frozen snapshot retains only actually retained view blocks after channel truncation', () => {
  const views = Array.from({ length: 40 }, (_, i) => ({ ...object, id: 'v' + i, name: '很长的视图名称'.repeat(12) + i, type: 'MONITOR_VIEW' as const }));
  const snapshot = buildStrategySnapshot({ ...strategy, relatedMode: 'ALL', relatedObjectType: 'MONITOR_VIEW' }, views, 'WECOM');
  assert.equal(snapshot.omitted, true);
  assert.ok(snapshot.model.monitorViews!.length < views.length);
  assert.equal(snapshot.target.ids.length, views.length);
});

test('mock service reconciles original identities and history stays unchanged', async () => {
  const before = await getStrategyDetail('strategy-1');
  const history = await getHistoryDetail('history-monitor');
  setProductAvailability('电商取数宝', false);
  assert.equal((await getStrategyDetail('strategy-1')).status, 'DISABLED');
  setProductAvailability('电商取数宝', true);
  assert.equal((await getStrategyDetail('strategy-1')).status, before.status);
  await updateStrategyStatus('strategy-1', 'DISABLED');
  setProductAvailability('电商取数宝', false);
  setProductAvailability('电商取数宝', true);
  assert.equal((await getStrategyDetail('strategy-1')).status, 'DISABLED');
  await updateStrategyStatus('strategy-1', 'ENABLED');
  setObjectAvailability('task-1', false);
  setObjectAvailability('task-2', false);
  assert.equal((await getStrategyDetail('strategy-1')).status, 'DISABLED');
  setObjectAvailability('task-1', true);
  setObjectAvailability('task-2', true);
  assert.equal((await getStrategyDetail('strategy-1')).status, 'DISABLED');
  await updateStrategyStatus('strategy-1', 'ENABLED');
  assert.equal((await getStrategyDetail('strategy-1')).status, 'ENABLED');
  assert.deepEqual(await getHistoryDetail('history-monitor'), history);
  assert.ok((await queryHistory({ page: 1, pageSize: 100 })).list.some(h => h.snapshot));
});
