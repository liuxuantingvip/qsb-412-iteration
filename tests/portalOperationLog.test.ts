import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOperationLogCsv,
  filterOperationLogs,
  getDateRangeError,
  mockOperationLogs,
} from '../src/pages/portalOperationLog/model.ts';

test('filters by tenant, source, operator, module, type and credential', () => {
  const otherTenantRecord = {
    ...mockOperationLogs[0],
    id: 'other-tenant',
    tenantId: 'tenant-other',
    source: 'api' as const,
  };
  const result = filterOperationLogs([...mockOperationLogs, otherTenantRecord], {
    tenantId: 'tenant-aa',
    source: 'api',
    asOf: '2026-09-01',
    operatorId: 'user-sensen',
    module: '开放平台',
    operationType: '执行',
    credentialName: '经营分析 Agent',
  });

  assert.equal(result.length, 1);
  assert.ok(result.every(item => item.tenantId === 'tenant-aa' && item.source === 'api'));
});

test('excludes records older than 180 days', () => {
  const expired = {
    ...mockOperationLogs[0],
    id: 'expired',
    operatedAt: '2026-03-04 12:00:00',
  };
  const result = filterOperationLogs([...mockOperationLogs, expired], {
    tenantId: 'tenant-aa',
    source: 'portal',
    asOf: '2026-09-01',
  });

  assert.equal(result.some(item => item.id === 'expired'), false);
});

test('rejects a date range longer than 90 days', () => {
  assert.equal(getDateRangeError('2026-05-01', '2026-08-01'), '单次查询时间范围不能超过 90 天');
  assert.equal(getDateRangeError('2026-08-26', '2026-09-01'), null);
});

test('csv never exposes secrets and keeps visible audit fields', () => {
  const csv = buildOperationLogCsv(mockOperationLogs);

  assert.match(csv, /操作时间,操作者,功能模块,操作类型,操作内容,操作结果,IP 地址,凭证名称/);
  assert.doesNotMatch(csv, /qsb_sk_|Bearer |password|cookie/i);
});

test('mock only includes member-triggered business actions', () => {
  assert.equal(mockOperationLogs.some(item => item.source === ('system' as never)), false);
  assert.equal(
    mockOperationLogs.some(item => ['浏览', '搜索', '筛选'].includes(item.operationType)),
    false,
  );
});
