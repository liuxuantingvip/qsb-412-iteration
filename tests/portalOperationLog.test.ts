import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildOperationLogCsv,
  filterOperationLogs,
  getDateRangeError,
  mockOperationLogs,
} from '../src/pages/portalOperationLog/model.ts';
import { portalOperationLogAnnotations } from '../src/components/portalOperationLogAnnotations/data.ts';

test('operation log annotations keep the approved order and account navigation target', () => {
  assert.deepEqual(portalOperationLogAnnotations.map((item) => item.noteId), [
    'POL-1', 'POL-2', 'POL-3', 'POL-4', 'POL-5', 'POL-6',
  ]);
  assert.ok(portalOperationLogAnnotations.every((item) => item.topTab === '个人中心'));
  assert.ok(portalOperationLogAnnotations.every((item) => item.menuKey === '操作日志'));
});

test('portal marker renders each annotation number from the approved mapping', () => {
  const markerAdapter = readFileSync(
    new URL('../src/components/portalOperationLogAnnotations/index.tsx', import.meta.url),
    'utf8',
  );
  const numbers = ['POL-1', 'POL-2', 'POL-3', 'POL-4', 'POL-5', 'POL-6'].map((noteId) => (
    portalOperationLogAnnotations.find((item) => item.noteId === noteId)?.number
  ));

  assert.deepEqual(numbers, ['1', '2', '3', '4', '5', '6']);
  assert.equal(new Set(numbers).size, 6);
  assert.match(markerAdapter, /{annotation\.number}/);
});

test('operation log annotations are wired into the active set and dedicated drawer', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

  assert.match(
    app,
    /activeRequirement === 'portalOperationLog'[\s\S]*?\? portalOperationLogAnnotations/,
  );
  assert.match(
    app,
    /activeRequirement === 'portalOperationLog'[\s\S]*?<PortalOperationLogAnnotationDrawer/,
  );
});

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
  assert.doesNotMatch(page, /data-note-id=["']POL-/);
  for (const id of ['POL-1', 'POL-2', 'POL-3', 'POL-4', 'POL-5', 'POL-6']) {
    assert.equal(
      (page.match(new RegExp(`<PortalOperationLogAnnotationMarker noteId=["']${id}["']`, 'g')) ?? []).length,
      1,
    );
  }
});

test('POL-4 marker owns the remaining flex height and its table fills the marker', () => {
  const styles = readFileSync(
    new URL('../src/pages/portalOperationLog/index.module.less', import.meta.url),
    'utf8',
  );

  assert.match(
    styles,
    /\.page\s*>\s*\[data-note-id=['"]POL-4['"]\]\s*{[\s\S]*?flex:\s*1;[\s\S]*?min-height:\s*0;/,
  );
  assert.match(
    styles,
    /\.page\s*>\s*\[data-note-id=['"]POL-4['"]\]\s*>\s*\.tableWrap\s*{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/,
  );
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

test('PRD covers the approved portal operation log review scope', () => {
  const prd = readFileSync(
    new URL('../src/pages/portalOperationLogPrd/index.tsx', import.meta.url),
    'utf8',
  );

  for (const text of [
    '背景', '目标', '需求范围', '用户故事', '核心流程', '权限与租户隔离',
    '字段说明', '保留与查询规则', '异常处理', '本期不做', '验收清单',
    '180 天', '近 7 天', '90 天', '门户操作', 'API', 'MCP',
  ]) {
    assert.match(prd, new RegExp(text));
  }
  assert.match(prd, /不记录浏览行为/);
  assert.match(prd, /系统自动行为不展示/);
  assert.match(prd, /操作内容和操作结果不作为筛选条件/);
});

test('PRD branch mounts the portal operation log PRD explicitly', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

  assert.match(app, /import PortalOperationLogPrd from '@\/pages\/portalOperationLogPrd';/);
  assert.match(
    app,
    /if \(activeRequirement === 'portalOperationLog'\) return <PortalOperationLogPrd \/>;/,
  );
});

test('POL-5 keeps its detail-opening event for annotation location', () => {
  assert.equal(
    portalOperationLogAnnotations.find((item) => item.noteId === 'POL-5')?.openEvent,
    'portal-operation-log:open-detail',
  );
});

test('PRD defines the reviewed failure, operation type and log compensation rules', () => {
  const prd = readFileSync(
    new URL('../src/pages/portalOperationLogPrd/index.tsx', import.meta.url),
    'utf8',
  );

  for (const text of [
    '查询接口失败时页面应展示失败状态和“重新加载”',
    '当前原型 mock 不模拟该状态',
    '新增、修改、删除、启用、停用、执行、重试、导入、导出、授权、其他',
    '三类来源统一分类口径',
    '服务端日志写入失败时应告警并进入补偿',
    '不得改变原业务操作结果或向用户返回原业务失败',
    '当前原型 mock 不模拟补偿',
  ]) {
    assert.match(prd, new RegExp(text));
  }
  assert.equal((prd.match(/查询接口失败时页面应展示失败状态和“重新加载”/g) ?? []).length, 2);
  assert.equal((prd.match(/服务端日志写入失败时应告警并进入补偿/g) ?? []).length, 2);
});
