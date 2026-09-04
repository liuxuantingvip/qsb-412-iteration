import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterConnectorExecutions,
  filterStorageLogs,
  isConnectorSelectable,
  paginateRows,
} from '../src/pages/autoRetryOptimization/runDetail/model.ts';
import { buildRunDetailData } from '../src/pages/autoRetryOptimization/runDetail/mock.ts';
import {
  clampRunRecordDrawerWidth,
  RUN_RECORD_DRAWER_MIN_WIDTH,
} from '../src/pages/autoRetryOptimization/runDetail/drawerWidth.ts';
import type { RunRecord } from '../src/pages/autoRetryOptimization/interface.ts';

const failedRecord: RunRecord = {
  key: 'run-failed',
  planName: '店铺登录计划',
  storeName: '华东示例店铺',
  startTime: '2026-07-31 10:00:00',
  endTime: '2026-07-31 10:12:00',
  collectionStatus: '失败',
  validationStatus: '待运行',
  storageStatus: '待运行',
  issueStage: 'login',
  issueReason: '账号校验失败',
};

test('builds the online run-detail hierarchy from one run record', () => {
  const detail = buildRunDetailData(failedRecord);
  assert.equal(detail.summary.planName, failedRecord.planName);
  assert.equal(detail.executeRecords.length, 1);
  assert.equal(detail.executeRecords[0].stores.length, 1);
  assert.ok(detail.executeRecords[0].stores[0].connectors.length >= 2);
  assert.equal(detail.executeRecords[0].collectionStatus, '运行失败');
  assert.equal(detail.executeRecords[0].storageStatus, '待运行');
});

test('filters connector results by execution and ingestion status', () => {
  const connectors = buildRunDetailData(failedRecord).executeRecords[0].stores[0].connectors;
  assert.ok(filterConnectorExecutions(connectors, { collectionStatus: '运行失败' }).every((row) => row.collectionStatus === '运行失败'));
  assert.ok(filterConnectorExecutions(connectors, { storageStatus: '待运行' }).every((row) => row.storageStatus === '待运行'));
});

test('only login connectors omit the child-row selection entry', () => {
  const connectors = buildRunDetailData(failedRecord).executeRecords[0].stores[0].connectors;
  const loginConnector = connectors.find((row) => row.connectorName.endsWith('-登录'));
  const businessConnector = connectors.find((row) => !row.connectorName.endsWith('-登录'));

  assert.ok(loginConnector);
  assert.ok(businessConnector);
  assert.equal(isConnectorSelectable(loginConnector), false);
  assert.equal(isConnectorSelectable(businessConnector), true);
});

test('filters storage logs and paginates without mutating source rows', () => {
  const logs = buildRunDetailData(failedRecord).storageLogs;
  const sourceLength = logs.length;
  const failed = filterStorageLogs(logs, { status: '失败', keyword: '写入' });
  assert.ok(failed.every((row) => row.status === '失败' && row.content.includes('写入')));
  assert.deepEqual(paginateRows(logs, 1, 2), logs.slice(0, 2));
  assert.equal(logs.length, sourceLength);
});

test('clamps the run-record drawer between its minimum width and viewport left gap', () => {
  assert.equal(RUN_RECORD_DRAWER_MIN_WIDTH, 520);
  assert.equal(clampRunRecordDrawerWidth(360, 1440), 520);
  assert.equal(clampRunRecordDrawerWidth(860, 1440), 860);
  assert.equal(clampRunRecordDrawerWidth(1400, 1440), 1320);
  assert.equal(clampRunRecordDrawerWidth(520, 560), 440);
});

test('projects one latest effective ingestion result per data table and keeps attempt history', async () => {
  const model = await import('../src/pages/autoRetryOptimization/runDetail/model.ts');
  assert.equal(typeof model.buildStorageTableResults, 'function');

  const logs = [
    {
      id: 'orders-1',
      time: '2026-07-31 17:40:00',
      storeName: '示例店铺',
      connectorName: '订单连接器',
      databaseType: 'MySQL',
      tableChineseName: '订单明细日表',
      tableEnglishName: 'dwd_order_detail_di',
      businessDate: '2026-07-31',
      attemptNo: 1,
      durationSeconds: 18,
      writtenRows: 0,
      status: '失败',
      content: '写入超时',
      failureStage: '写入目标表',
      level: '错误日志',
    },
    {
      id: 'orders-2',
      time: '2026-07-31 17:42:00',
      storeName: '示例店铺',
      connectorName: '订单连接器',
      databaseType: 'MySQL',
      tableChineseName: '订单明细日表',
      tableEnglishName: 'dwd_order_detail_di',
      businessDate: '2026-07-31',
      attemptNo: 2,
      durationSeconds: 21,
      writtenRows: 1280,
      status: '成功',
      content: '写入完成',
      level: '输出日志',
    },
    {
      id: 'promotion-1',
      time: '2026-07-31 17:44:00',
      storeName: '示例店铺',
      connectorName: '推广连接器',
      databaseType: 'ClickHouse',
      tableChineseName: '推广消耗日表',
      tableEnglishName: 'ads_campaign_cost_di',
      businessDate: '2026-07-31',
      attemptNo: 1,
      durationSeconds: 16,
      writtenRows: 0,
      status: '失败',
      content: '唯一键冲突',
      failureStage: '写入目标表',
      level: '错误日志',
    },
  ];

  const results = model.buildStorageTableResults(logs);
  assert.equal(results.length, 2);
  assert.deepEqual(results.map((item) => item.tableChineseName), ['推广消耗日表', '订单明细日表']);
  assert.equal(results[1].latestAttempt.id, 'orders-2');
  assert.deepEqual(results[1].attempts.map((item) => item.id), ['orders-2', 'orders-1']);
});

test('searches ingestion results only by Chinese or English table names', async () => {
  const model = await import('../src/pages/autoRetryOptimization/runDetail/model.ts');
  assert.equal(typeof model.filterStorageTableResults, 'function');

  const results = model.buildStorageTableResults([
    {
      id: 'failed', time: '2026-07-31 17:44:00', storeName: '示例店铺', connectorName: '推广连接器',
      databaseType: 'ClickHouse', tableChineseName: '推广消耗日表', tableEnglishName: 'ads_campaign_cost_di',
      businessDate: '2026-07-31', attemptNo: 1, durationSeconds: 16,
      writtenRows: 0, status: '失败', content: '唯一键冲突', failureStage: '写入目标表', level: '错误日志',
    },
    {
      id: 'partial', time: '2026-07-31 17:45:00', storeName: '示例店铺', connectorName: '商品连接器',
      databaseType: 'MySQL', tableChineseName: '商品效果日表', tableEnglishName: 'dwd_product_effect_di',
      businessDate: '2026-07-31', attemptNo: 1, durationSeconds: 20,
      writtenRows: 328, status: '成功(部分无数据)', content: '2 个业务日期无数据', level: '警告日志',
    },
    {
      id: 'success', time: '2026-07-31 17:46:00', storeName: '示例店铺', connectorName: '订单连接器',
      databaseType: 'MySQL', tableChineseName: '订单明细日表', tableEnglishName: 'dwd_order_detail_di',
      businessDate: '2026-07-31', attemptNo: 1, durationSeconds: 22,
      writtenRows: 1280, status: '成功', content: '写入完成', level: '输出日志',
    },
  ]);

  assert.deepEqual(
    model.filterStorageTableResults(results, { keyword: 'ads_campaign', onlyFailed: true }).map((item) => item.tableChineseName),
    ['推广消耗日表'],
  );
  assert.deepEqual(
    model.filterStorageTableResults(results, { keyword: '商品效果' }).map((item) => item.tableChineseName),
    ['商品效果日表'],
  );
  assert.equal(model.filterStorageTableResults(results, { keyword: 'ClickHouse' }).length, 0);
  assert.equal(model.filterStorageTableResults(results, { keyword: '唯一键' }).length, 0);
  assert.deepEqual(
    model.filterStorageTableResults(results, { onlyFailed: true }).map((item) => item.tableChineseName),
    ['推广消耗日表'],
  );
});

test('provides diagnostic ingestion mock facts for every latest table result', async () => {
  const model = await import('../src/pages/autoRetryOptimization/runDetail/model.ts');
  const storageLogs = buildRunDetailData(failedRecord).storageLogs;
  const results = model.buildStorageTableResults(storageLogs);

  assert.ok(results.length >= 4);
  assert.ok(storageLogs.every((row) => row.businessDate && row.attemptNo > 0));
  assert.ok(storageLogs.every((row) => Number.isFinite(row.durationSeconds) && Number.isFinite(row.writtenRows)));
  assert.ok(storageLogs.every((row) => row.databaseType));
  assert.ok(storageLogs.every((row) => row.tableChineseName && row.tableEnglishName));
  assert.ok(results.some((row) => row.latestAttempt.status === '成功'));
  assert.ok(results.some((row) => row.latestAttempt.status === '成功(部分无数据)'));
  assert.ok(results.find((row) => row.latestAttempt.status === '失败')?.latestAttempt.failureStage);
});
