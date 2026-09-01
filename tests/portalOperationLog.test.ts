import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildOperationLogCsv,
  filterOperationLogs,
  getDateRangeError,
  initialPortalOperationLogMockState,
  mockActiveCredentials,
  mockOperationLogs,
  OPERATION_TYPES,
  prependOperationLogRecordOnce,
  reducePortalOperationLogMockState,
  toSafeOperationLogCsvRow,
} from '../src/pages/portalOperationLog/model.ts';
import type {
  OperationLogRecord,
  OperationType,
} from '../src/pages/portalOperationLog/model.ts';
import { portalOperationLogAnnotations } from '../src/components/portalOperationLogAnnotations/data.ts';

test('operation log annotations keep the approved order and account navigation target', () => {
  assert.deepEqual(portalOperationLogAnnotations.map((item) => item.noteId), [
    'POL-1', 'POL-2', 'POL-3', 'POL-4', 'POL-5', 'POL-6',
  ]);
  assert.ok(portalOperationLogAnnotations.every((item) => item.topTab === '个人中心'));
  assert.ok(portalOperationLogAnnotations.every((item) => item.menuKey === '操作日志'));
  const sourceAnnotation = portalOperationLogAnnotations.find((item) => item.noteId === 'POL-2');
  const sourceStateText = sourceAnnotation?.stateItems.map(({ text }) => text).join('\n') ?? '';
  assert.match(sourceStateText, /来源无法归属时不进入任一 Tab/);
  assert.doesNotMatch(sourceStateText, /服务端告警/);
});

test('portal markers keep locate targets without rendering visible page numbers', () => {
  const markerAdapter = readFileSync(
    new URL('../src/components/portalOperationLogAnnotations/index.tsx', import.meta.url),
    'utf8',
  );
  assert.match(markerAdapter, /<RequirementAnnotationMarker/);
  assert.doesNotMatch(markerAdapter, /numberAnchor|data-annotation-number|annotation\.number/);
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
  const apiRecord = mockOperationLogs.find((record) => record.source === 'api');
  assert.ok(apiRecord);
  const otherTenantRecord = {
    ...apiRecord,
    id: 'other-tenant',
    tenantId: 'tenant-other',
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

test('API and MCP records keep member and credential snapshots as separate identities', () => {
  const credentialRecords = mockOperationLogs.filter((record) => record.source !== 'portal');

  assert.ok(credentialRecords.length > 0);
  for (const record of credentialRecords) {
    assert.match(record.operatorId, /^user-/);
    assert.ok(record.operatorName);
    assert.ok(record.credentialId);
    assert.ok(record.credentialName);
    assert.notEqual(record.operatorId, record.credentialId);
    assert.notEqual(record.operatorName, record.credentialName);
  }
});

test('credential snapshots remain traceable after revocation and duplicate names', () => {
  const revokedSnapshot = mockOperationLogs.find(
    (record) => record.id === 'api-revoked-credential-snapshot',
  );
  assert.ok(revokedSnapshot?.source === 'api');
  assert.equal(revokedSnapshot.credentialId, 'credential-retired-report');
  assert.equal(revokedSnapshot.credentialName, '旧版报表助手');
  assert.equal(
    mockActiveCredentials.some(({ credentialId }) => credentialId === revokedSnapshot.credentialId),
    false,
  );

  const duplicateNameSnapshots = mockOperationLogs.filter((record) => (
    record.source !== 'portal' && record.credentialName === '经营分析 Agent'
  ));
  assert.deepEqual(
    new Set(duplicateNameSnapshots.map(({ credentialId }) => credentialId)),
    new Set(['credential-business-analysis', 'credential-business-analysis-backup']),
  );
  assert.equal(
    mockActiveCredentials.filter(({ credentialName }) => credentialName === '经营分析 Agent').length,
    2,
  );
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

test('csv sanitizes every exported field, neutralizes formulas and quotes newlines', () => {
  const maliciousRecord: OperationLogRecord = {
    id: 'malicious-export-row',
    tenantId: 'tenant-aa',
    source: 'api',
    operatedAt: '=2+2 token=secret-time',
    operatorId: 'user-attacker',
    operatorName: '+SUM(1,2) Cookie=session-operator',
    module: '-10 password=secret-module',
    operationType: '@cmd api_key=secret-type' as OperationType,
    content: '=HYPERLINK("https://evil.example")\nBearer secret-content qsb_sk_RAWSECRET',
    result: 'failed',
    ip: '+1-1 secret=secret-ip',
    credentialId: 'credential-attack-should-not-export',
    credentialName: '@cmd Cookie: sid=secret-credential; auth=secret-cookie-tail',
  };

  const safeRow = toSafeOperationLogCsvRow(maliciousRecord);
  assert.deepEqual(Object.keys(safeRow), [
    'operatedAt',
    'operatorName',
    'module',
    'operationType',
    'content',
    'operationResult',
    'ip',
    'credentialName',
  ]);
  for (const value of Object.values(safeRow)) {
    assert.doesNotMatch(value, /secret-|qsb_sk_|RAWSECRET/i);
    assert.doesNotMatch(value, /^\s*[=+@-]/);
  }
  assert.equal(safeRow.operationResult, '失败');
  assert.match(safeRow.content, /\n/);

  const csv = buildOperationLogCsv([maliciousRecord]);
  assert.doesNotMatch(csv, /credential-attack-should-not-export|secret-|qsb_sk_|RAWSECRET/i);
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/evil\.example""\)\n\[已脱敏\]"/);
});

test('csv redacts spaced API keys and quoted JSON credentials', () => {
  const maliciousRecord: OperationLogRecord = {
    id: 'quoted-json-secret-export-row',
    tenantId: 'tenant-aa',
    source: 'api',
    operatedAt: '2026-09-01 12:00:00',
    operatorId: 'user-attacker',
    operatorName: "{'password':'DUMMY_SINGLE_PASSWORD_VALUE'}",
    module: 'API Key: DUMMY_API_VALUE',
    operationType: '导出',
    content: '{"password":"DUMMY_PASSWORD_VALUE"}',
    result: 'success',
    ip: '10.18.2.99',
    credentialId: 'credential-malicious-json',
    credentialName: '{"cookie":"DUMMY_COOKIE_VALUE"}\n{\'cookie\':\'DUMMY_SINGLE_COOKIE_VALUE\'}',
  };

  const safeRow = toSafeOperationLogCsvRow(maliciousRecord);
  assert.doesNotMatch(
    Object.values(safeRow).join('\n'),
    /DUMMY_(?:API|PASSWORD|COOKIE|SINGLE_PASSWORD|SINGLE_COOKIE)_VALUE/,
  );

  const csv = buildOperationLogCsv([maliciousRecord]);
  assert.doesNotMatch(
    csv,
    /DUMMY_(?:API|PASSWORD|COOKIE|SINGLE_PASSWORD|SINGLE_COOKIE)_VALUE/,
  );
  assert.equal(csv.split('\n', 1)[0].split(',').length, 8);
});

test('mock only includes member-triggered business actions', () => {
  assert.equal(mockOperationLogs.some(item => item.source === ('system' as never)), false);
  assert.equal(
    mockOperationLogs.some(item => ['浏览', '搜索', '筛选'].includes(item.operationType)),
    false,
  );
});

test('portal samples only use verified current frontstage module names', () => {
  const verifiedFrontstageModules = new Set([
    '数据源市场', '店铺管理', '计划管理', '运行记录', '数据监控', '参数管理', '操作日志',
  ]);
  const portalRecords = mockOperationLogs.filter((item) => item.source === 'portal');

  assert.ok(portalRecords.every((item) => verifiedFrontstageModules.has(item.module)));
  assert.equal(portalRecords.some((item) => item.module === '任务计划'), false);
  assert.equal(portalRecords.some((item) => item.module === '连接器管理'), false);
});

test('all three tabs share the fixed eleven operation type options', () => {
  assert.deepEqual(OPERATION_TYPES, [
    '新增', '修改', '删除', '启用', '停用', '执行', '重试', '导入', '导出', '授权', '其他',
  ]);
  assert.equal(OPERATION_TYPES.length, 11);

  const page = readFileSync(
    new URL('../src/pages/portalOperationLog/index.tsx', import.meta.url),
    'utf8',
  );
  assert.match(page, /OPERATION_TYPES\.map\(\(operationType\)/);
  assert.doesNotMatch(page, /sourceRecords\.map\(\(record\) => record\.operationType\)/);
});

test('portal mock data spans more than one ten-row page', () => {
  const portalRecords = filterOperationLogs(mockOperationLogs, {
    tenantId: 'tenant-aa',
    source: 'portal',
    asOf: '2026-09-01',
    startDate: '2026-08-26',
    endDate: '2026-09-01',
  });

  assert.ok(portalRecords.length > 10);
  assert.ok(portalRecords.slice(10, 20).length > 0);
});

test('review mock state covers query recovery and deduplicated export outcomes', () => {
  const queryFailed = reducePortalOperationLogMockState(
    initialPortalOperationLogMockState,
    { type: 'query/fail' },
  );
  assert.equal(queryFailed.queryStatus, 'failed');
  const queryLoading = reducePortalOperationLogMockState(queryFailed, { type: 'query/reload' });
  assert.equal(queryLoading.queryStatus, 'loading');
  assert.equal(
    reducePortalOperationLogMockState(queryLoading, { type: 'query/succeed' }).queryStatus,
    'ready',
  );

  const exportLoading = reducePortalOperationLogMockState(
    initialPortalOperationLogMockState,
    { type: 'export/start' },
  );
  assert.equal(exportLoading.exportStatus, 'loading');
  assert.strictEqual(
    reducePortalOperationLogMockState(exportLoading, { type: 'export/start' }),
    exportLoading,
  );
  const exportFailed = reducePortalOperationLogMockState(
    exportLoading,
    { type: 'export/complete', outcome: 'failed' },
  );
  assert.equal(exportFailed.exportStatus, 'failed');
  assert.equal(exportFailed.nextExportOutcome, 'success');
  assert.equal(
    reducePortalOperationLogMockState(
      reducePortalOperationLogMockState(exportFailed, { type: 'export/start' }),
      { type: 'export/complete', outcome: 'success' },
    ).exportStatus,
    'success',
  );

  const auditRecord = mockOperationLogs.find((record) => record.id === 'portal-export-operation-log');
  assert.ok(auditRecord);
  const once = prependOperationLogRecordOnce([], auditRecord);
  assert.strictEqual(prependOperationLogRecordOnce(once, auditRecord), once);
  assert.equal(once.length, 1);
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
  assert.match(page, /const operationResultLabel = '操作结果';/);
  assert.doesNotMatch(page, /placeholder=["'](?:搜索|全部)?操作内容["']/);
  assert.doesNotMatch(page, /placeholder=["'](?:搜索|全部)?操作结果["']/);
  assert.doesNotMatch(page, /data-note-id=["']POL-/);
  for (const id of ['POL-1', 'POL-2', 'POL-3', 'POL-4', 'POL-5', 'POL-6']) {
    assert.equal(
      (page.match(new RegExp(`<PortalOperationLogAnnotationMarker noteId=["']${id}["']`, 'g')) ?? []).length,
      1,
    );
  }
});

test('page keeps failure recovery off the business UI and controls pagination', () => {
  const page = readFileSync(
    new URL('../src/pages/portalOperationLog/index.tsx', import.meta.url),
    'utf8',
  );

  for (const text of [
    '操作日志加载失败', '重新加载', '导出中', '导出成功', '导出失败', '重试导出',
  ]) {
    assert.match(page, new RegExp(text));
  }
  for (const explanationMeta of [
    '原型仅固定展示', '原型评审场景', '模拟查询失败', '下次导出成功', '下次导出失败',
  ]) {
    assert.doesNotMatch(page, new RegExp(explanationMeta));
  }
  assert.match(page, /operationLogScenario/);
  assert.match(page, /if \(exportLockRef\.current\) return;/);
  assert.match(page, /prependOperationLogRecordOnce\(current, auditRecord\)/);
  assert.match(page, /result: actualOutcome/);
  assert.match(page, /const \[currentPage, setCurrentPage\] = useState\(1\);/);
  assert.match(page, /current: currentPage/);
  assert.match(page, /onChange: \(pageNumber\) => setCurrentPage\(pageNumber\)/);
  assert.match(page, /const updateFilter[\s\S]*?setCurrentPage\(1\);/);
  assert.match(page, /const changeSource[\s\S]*?setCurrentPage\(1\);/);
  assert.match(page, /const changeDateRange[\s\S]*?setCurrentPage\(1\);/);

  const reloadBlock = page.slice(page.indexOf('const reloadQuery'), page.indexOf('const exportCurrentRecords'));
  assert.doesNotMatch(reloadBlock, /setSource|setFilters|setDateRange|setCurrentPage/);
  const exportBlock = page.slice(page.indexOf('const exportCurrentRecords'), page.indexOf('const detailAvailable'));
  assert.doesNotMatch(exportBlock, /setSource|setFilters|setDateRange|setCurrentPage/);
});

test('filter controls stay on one row and detail basics use the approved spacious layout', () => {
  const page = readFileSync(
    new URL('../src/pages/portalOperationLog/index.tsx', import.meta.url),
    'utf8',
  );

  for (const label of ['时间范围', '操作者', '功能模块', '操作类型', '凭证名称']) {
    assert.doesNotMatch(page, new RegExp(`<span>${label}<\\/span>`));
  }
  assert.match(page, /aria-label="时间范围"/);
  assert.match(page, /width=\{720\}/);
  assert.match(page, /className={styles\.basicInfoGrid}/);
  assert.match(page, /className={styles\.basicInfoItemWide}/);
  assert.doesNotMatch(page, /<Descriptions/);
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
  assert.match(prd, /列表按操作时间倒序分页/);
  assert.match(prd, /点击整行打开详情抽屉/);
  assert.match(prd, /变更时间、来源或任一筛选条件后回到第 1 页/);
  assert.match(prd, /固定八列安全 DTO/);
  assert.match(prd, /逐字段脱敏并中和表格公式载荷/);
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
    '新增、修改、删除、启用、停用、执行、重试、导入、导出、授权、其他',
    '三类来源统一分类口径',
    '服务端日志写入失败时应告警并进入补偿',
    '不得改变原业务操作结果或向用户返回原业务失败',
  ]) {
    assert.match(prd, new RegExp(text));
  }
  assert.doesNotMatch(prd, /原型|mock|评审场景/);
  assert.equal((prd.match(/查询接口失败时页面应展示失败状态和“重新加载”/g) ?? []).length, 1);
  assert.equal((prd.match(/服务端日志写入失败时应告警并进入补偿/g) ?? []).length, 2);
});
