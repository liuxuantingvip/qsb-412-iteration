import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('operation log page exposes the three source tabs and approved filters', () => {
  const page = readFileSync(
    new URL('../src/pages/portalOperationLog/index.tsx', import.meta.url),
    'utf8',
  );

  assert.match(page, /门户操作/);
  assert.match(page, /API/);
  assert.match(page, /MCP/);
  assert.match(page, /时间范围/);
  assert.match(page, /操作者/);
  assert.match(page, /功能模块/);
  assert.match(page, /操作类型/);
  assert.doesNotMatch(page, /placeholder="搜索操作内容"|操作结果.*Select/s);
  for (const id of ['POL-1', 'POL-2', 'POL-3', 'POL-4', 'POL-5', 'POL-6']) {
    assert.match(page, new RegExp(id));
  }
});

test('account area mounts the operation log page explicitly', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

  assert.match(app, /import PortalOperationLog from '@\/pages\/portalOperationLog';/);
  assert.match(
    app,
    /style={{ display: selectedMenuKey === '操作日志' \? 'none' : 'contents' }}[\s\S]*?<OpenApiOptimization[\s\S]*?<\/div>[\s\S]*?{selectedMenuKey === '操作日志' \? <PortalOperationLog \/> : null}/,
  );
});

test('required date range cannot be cleared and safely ignores empty changes', () => {
  const page = readFileSync(
    new URL('../src/pages/portalOperationLog/index.tsx', import.meta.url),
    'utf8',
  );

  assert.match(
    page,
    /const changeDateRange = \(nextRange: string\[\] \| null \| undefined\) => {[\s\S]*?if \(!nextRange \|\| nextRange\.length !== 2\) return;/,
  );
  assert.match(
    page,
    /<DatePicker\.RangePicker[\s\S]*?allowClear={false}[\s\S]*?onChange={changeDateRange}/,
  );
});
