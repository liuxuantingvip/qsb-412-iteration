import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { selectAnnotationTargets } from '../src/components/requirementAnnotations/locateTargets.ts';
import { etlDataMonitoringAnnotations } from '../src/components/etlDataMonitoringAnnotations/data.ts';
import { canRetryDetail, mockExecutionDateRange, monitoringPlatformExamples } from '../src/pages/etlDataMonitoringOptimization/detailModel.ts';

test('column annotation selects only its three headers, not repeated row cells', () => {
  const targets = [
    { tagName: 'TH', id: 'collect' },
    { tagName: 'TH', id: 'import' },
    { tagName: 'TH', id: 'validation' },
    { tagName: 'DIV', id: 'collect-row-1' },
    { tagName: 'DIV', id: 'import-row-1' },
  ];
  assert.deepEqual(selectAnnotationTargets(targets, 'column-headers').map(x => x.id), [
    'collect', 'import', 'validation',
  ]);
});

test('does not locate a row cell while the column headers are not mounted', () => {
  assert.deepEqual(selectAnnotationTargets([{ tagName: 'DIV' }], 'column-headers'), []);
});

test('ordinary annotation preserves its original targets', () => {
  const targets = [{ tagName: 'BUTTON' }, { tagName: 'SPAN' }];
  assert.deepEqual(selectAnnotationTargets(targets), targets);
});

test('store and table drilldown annotations locate the complete detail table', () => {
  for (const [id, dimension] of [['ETL-4.2', 'store'], ['ETL-4.3', 'table']]) {
    const annotation = etlDataMonitoringAnnotations.find(item => item.noteId === id);
    assert.ok(annotation);
    assert.equal(annotation.openEvent, `etl-monitor:open-${dimension}-detail`);
    assert.ok(annotation.ruleItems?.some(item => item.example === `${dimension}-detail`));
    assert.equal(annotation.locateMode, undefined);
    assert.match(annotation.target, /明细表/);
    assert.ok(annotation.rule.includes(dimension === 'store' ? '固定选中店铺' : '固定选中数据表'));
  }
});

test('drilldown page assigns the active dimension marker once to the complete table', () => {
  const page = readFileSync(new URL('../src/pages/etlDataMonitoringOptimization/index.tsx', import.meta.url), 'utf8');
  assert.match(page, /dimension === 'store' \? 'ETL-4\.2' : 'ETL-4\.3'/);
  assert.match(page, /<DrilldownDetailView\s+dimension="store"/);
  assert.match(page, /<DrilldownDetailView\s+dimension="table"/);
  assert.equal((page.match(/data-note-id=\{detailNoteId\}/g) || []).length, 1);
  assert.doesNotMatch(page, /onHeaderCell: \(\) => \(\{ 'data-note-id': detailNoteId \}\)/);
  assert.doesNotMatch(page, /'data-note-id': 'ETL-4\.2'/);
});

test('both drilldowns have annotation mappings and live screenshot evidence', () => {
  for (const id of ['ETL-4.2', 'ETL-4.3']) {
    assert.ok(etlDataMonitoringAnnotations.some(annotation => annotation.noteId === id));
  }
  for (const dimension of ['store', 'table']) {
    const screenshot = readFileSync(new URL(`../public/etl-monitoring-before/${dimension}-detail-20260831.jpg`, import.meta.url));
    assert.deepEqual([...screenshot.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  }
});

test('status help uses customer-facing copy while keeping all five statuses', () => {
  const page = readFileSync(new URL('../src/pages/etlDataMonitoringOptimization/index.tsx', import.meta.url), 'utf8');
  const help = page.match(/const statusHelpItems[^=]*= \[([\s\S]*?)\n\];/)?.[1];
  assert.ok(help);
  for (const [status, description] of [
    ['failed', '数据入库失败、取数执行失败或计划运行超时'],
    ['abnormal', '入库后表校验不通过'],
    ['waiting', '取数、重试、入库或校验尚未结束'],
    ['success', '数据成功入库，表校验通过/无需校验/无数据'],
    ['noTask', '该日未执行任何取数并入库计划'],
  ]) {
    assert.ok(help.includes(`status: '${status}', description: '${description}'`));
  }
  assert.doesNotMatch(help, /错误码|[123]xxx/);
});

test('status help comparison keeps the screenshot without duplicate legacy copy or capture commentary', () => {
  const preview = readFileSync(new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url), 'utf8');
  const help = preview.slice(preview.indexOf("if (kind === 'status-help')"));
  assert.ok(help.includes('<BeforeScreenshot'));
  assert.match(preview, /<img[\s\S]*?src=\{src\}[\s\S]*?alt=\{label\}/);
  assert.doesNotMatch(preview, /backgroundImage/);
  assert.ok(help.includes('<StatusHelpContent />'));
  assert.doesNotMatch(help, /<LegacyStatusRules\s*\/>|本次实拍浮层已向下展开/);
});

test('summary status annotations use dimension-specific previews and keep shared rules concise', () => {
  const preview = readFileSync(new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url), 'utf8');
  for (const [id, example] of [['ETL-2.3', 'store-status'], ['ETL-3.3', 'table-status']]) {
    const annotation = etlDataMonitoringAnnotations.find(item => item.noteId === id);
    assert.ok(annotation?.ruleItems?.some(item => item.example === example));
    assert.doesNotMatch(JSON.stringify(annotation), /原因不在列表列内展示|同一天存在多个|行 hover 时展示/);
  }
  assert.match(preview, /reasons=\{item\.status === 'failed' \? \[/);
  assert.match(preview, /计划运行超时：本次阈值 60 分钟，已运行 61 分钟/);
  assert.doesNotMatch(preview, /StageStatusTag status="失败" stage="collectStatus" reason="计划运行超时/);
  assert.doesNotMatch(preview, /旧版为成功、提醒|旧版混合状态的后端优先级|取数 1xxx → 异常/);
});

test('visual acceptance objects have dedicated frontend examples', () => {
  for (const [id, example] of [
    ['ETL-2.4', 'store-filters'],
    ['ETL-3.4', 'table-filters'],
  ]) {
    const annotation = etlDataMonitoringAnnotations.find(item => item.noteId === id);
    assert.ok(annotation?.ruleItems?.some(item => item.example === example));
  }
});

test('summary filter previews reuse bounded toolbar controls inside the annotation drawer', () => {
  const preview = readFileSync(new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url), 'utf8');
  const branch = preview.slice(preview.indexOf('function SummaryFiltersPreview'), preview.indexOf('function RefreshAfterPreview'));

  assert.match(branch, /className=\{pageStyles\.dateRangeWide\}/);
  assert.match(branch, /className=\{pageStyles\.platformCascader\}/);
  assert.match(branch, /className=\{`\$\{pageStyles\.keywordSearchGroup\} qsb-arco-composite-search`\}/);
  assert.match(branch, /className=\{pageStyles\.keywordFieldSelect\}/);
  assert.match(branch, /className=\{pageStyles\.keywordSearch\}/);
  assert.match(branch, /className=\{pageStyles\.connectorSearch\}/);
  assert.match(branch, /className=\{pageStyles\.statusRefreshGroup\}/);
  assert.match(branch, /className=\{pageStyles\.statusSelect\}/);
});

test('annotation scope excludes the incidental card color change and names refresh as a new action', () => {
  const page = readFileSync(new URL('../src/pages/etlDataMonitoringOptimization/index.tsx', import.meta.url), 'utf8');
  const prd = readFileSync(new URL('../src/pages/etlDataMonitoringOptimizationPrd/index.tsx', import.meta.url), 'utf8');
  const preview = readFileSync(new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url), 'utf8');
  const refresh = etlDataMonitoringAnnotations.find(item => item.noteId === 'ETL-2.2');

  assert.equal(etlDataMonitoringAnnotations.some(item => item.noteId === 'ETL-1.1'), false);
  assert.equal(refresh?.module, '新增主动刷新按钮');
  assert.match(refresh?.rule || '', /新增主动刷新按钮/);
  assert.doesNotMatch(page, /data-note-id=\{index === 0 \? 'ETL-1\.1'/);
  assert.doesNotMatch(prd, /data-note-id="ETL-1\.1"|卡片配色|卡片顶部装饰|刷新位置与原型一致/);
  assert.doesNotMatch(preview, /view-card-colors|ViewCardColorsComparison/);
});

test('fixed and closable monitor view tabs are separated by a 12px divider', () => {
  const styles = readFileSync(
    new URL('../src/pages/etlDataMonitoringOptimization/index.module.less', import.meta.url),
    'utf8',
  );
  const dividerRule = styles.slice(
    styles.indexOf('.viewTabs :global(.arco-tabs-header-title:first-child)::after'),
    styles.indexOf('.viewTabs :global(.arco-tabs-header-title)', styles.indexOf('.viewTabs :global(.arco-tabs-header-title:first-child)::after') + 1),
  );

  assert.ok(dividerRule.length > 0);
  assert.match(dividerRule, /width:\s*1px/);
  assert.match(dividerRule, /height:\s*12px/);
  assert.match(dividerRule, /right:\s*-6px/);
  assert.match(dividerRule, /pointer-events:\s*none/);

  const annotation = etlDataMonitoringAnnotations.find(item => item.noteId === 'ETL-1.2');
  assert.ok(annotation);
  assert.match(JSON.stringify(annotation), /12px.*竖线/);
});

test('local annotations do not repeat rules already rendered by dedicated controls', () => {
  const refresh = etlDataMonitoringAnnotations.find(item => item.noteId === 'ETL-2.2');
  const storeFilters = etlDataMonitoringAnnotations.find(item => item.noteId === 'ETL-2.4');
  const fieldNames = etlDataMonitoringAnnotations.find(item => item.noteId === 'ETL-4.8');
  assert.match(refresh?.rule || '', /状态筛选右侧/);
  assert.doesNotMatch(JSON.stringify(storeFilters), /刷新/);
  assert.equal(fieldNames?.ruleItems?.length, 1);
});

test('column settings preview is isolated from the full detail comparison', () => {
  const preview = readFileSync(new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url), 'utf8');
  assert.match(preview, /function ColumnSettingsComparison/);
  const branch = preview.slice(preview.indexOf("if (kind === 'detail-column-settings')"), preview.indexOf("if (kind === 'detail-actions')"));
  assert.match(branch, /<ColumnSettingsComparison\s*\/>/);
  assert.doesNotMatch(branch, /<DetailComparison/);
});

test('monitoring headers and column settings use associated plan terminology', () => {
  const page = readFileSync(new URL('../src/pages/etlDataMonitoringOptimization/index.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /(?:title|label|relatedTasks): '关联任务(?:名)?'/);
  assert.match(page, /key: 'relatedTasks', label: '关联计划'/);
  assert.match(page, /key: 'taskName', label: '关联计划'/);
  assert.match(page, /relatedTasks: '关联计划'/);
  assert.equal((page.match(/title: '关联计划'/g) || []).length, 2);
});

test('store columns and previews omit the removed dynamic fetch range', () => {
  const page = readFileSync(new URL('../src/pages/etlDataMonitoringOptimization/index.tsx', import.meta.url), 'utf8');
  const preview = readFileSync(new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /fetchTimeRange|PlanFetchRangeCell|fetchRange/);
  assert.doesNotMatch(preview, /PlanFetchRangeCell|前五列/);
  assert.match(preview, /After · 本次前四列/);
  const labels = page.match(/export const storeMonitorColumnLabels = \{([\s\S]*?)\};/)?.[1];
  assert.ok(labels);
  assert.deepEqual([...labels.matchAll(/(\w+):/g)].map(match => match[1]), ['channel', 'platform', 'storeName', 'relatedTasks']);
  const annotation = etlDataMonitoringAnnotations.find(item => item.noteId === 'ETL-2.1');
  assert.match(annotation?.target || '', /前四列/);
  assert.doesNotMatch(JSON.stringify(annotation), /前五列|计划执行日为 T/);
});

test('detail status filter reuses the composite group styling and keeps dependent clearing', () => {
  const page = readFileSync(new URL('../src/pages/etlDataMonitoringOptimization/index.tsx', import.meta.url), 'utf8');
  const toolbar = readFileSync(new URL('../src/pages/etlDataMonitoringOptimization/DetailToolbar.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/styles/global.less', import.meta.url), 'utf8');
  for (const name of ['detailSearchGroup', 'detailStatusFilterGroup']) {
    assert.ok(toolbar.includes('<Input.Group compact className={`${styles.' + name + '} qsb-arco-composite-search`}>'));
  }
  assert.match(styles, /qsb-arco-composite-search\.arco-input-group > \.arco-select:last-child \.arco-select-view/);
  assert.match(toolbar, /onChange\(\{ \.\.\.value, stage, status: undefined \}\)/);
  assert.match(page, /setFilters\(value\); setPage\(1\)/);
});

test('new annotations cover controls, renamed fields, hidden result and left-aligned actions', () => {
  const page = readFileSync(new URL('../src/pages/etlDataMonitoringOptimization/index.tsx', import.meta.url), 'utf8');
  for (const id of ['ETL-1.2', 'ETL-4.4', 'ETL-4.5', 'ETL-4.6', 'ETL-4.7', 'ETL-4.8']) {
    assert.ok(etlDataMonitoringAnnotations.find(item => item.noteId === id));
    assert.ok(page.includes(id));
  }
  const fieldNote = etlDataMonitoringAnnotations.find(item => item.noteId === 'ETL-4.8');
  const preview = readFileSync(new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url), 'utf8');
  for (const label of ['连接器名称', '数据源', '平台名称', '子平台', '店铺名称', '店铺', '关联任务名', '关联计划', '执行结果', '前端不展示', '原始字段']) {
    assert.ok(`${JSON.stringify(fieldNote)}${preview}`.includes(label));
  }
  assert.equal(fieldNote?.ruleItems?.length, 1);
  assert.doesNotMatch(page, /(?:title|label): '执行结果'/);
  assert.match(page, /key: 'operation',[\s\S]*?align: 'left'/);
  assert.match(page, /const columns = detailColumnOrder/);
});

test('alignment annotation previews representative text, status and action cells', () => {
  const annotation = etlDataMonitoringAnnotations.find(item => item.noteId === 'ETL-4.7');
  const preview = readFileSync(new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url), 'utf8');
  const branch = preview.slice(preview.indexOf("if (kind === 'detail-actions')"), preview.indexOf("if (kind === 'store-detail'"));

  assert.equal(annotation?.module, '表格内容左对齐');
  assert.match(annotation?.rule || '', /表头、单元格内容统一左对齐/);
  for (const label of ['店铺', '取数执行', '操作']) assert.ok(branch.includes(label));
  assert.match(branch, /StageStatusTag/);
  assert.match(branch, /noData: true/);
  assert.doesNotMatch(branch, /结果说明/);
});

test('execution date ranges retain both endpoints including single-day and cross-month ranges', () => {
  assert.equal(mockExecutionDateRange('2026-07-14', 0), '2026-07-08 至 2026-07-14');
  assert.equal(mockExecutionDateRange('2026-07-14', 1), '2026-07-01 至 2026-07-14');
  assert.equal(mockExecutionDateRange('2026-07-14', 2), '2026-07-14 至 2026-07-14');
  assert.equal(mockExecutionDateRange('2026-03-02', 0), '2026-02-24 至 2026-03-02');
});

test('platform examples model parent-child platforms instead of business categories', () => {
  assert.deepEqual(monitoringPlatformExamples.天猫, { channel: '淘系', platform: '阿里妈妈' });
  assert.deepEqual(monitoringPlatformExamples.淘宝, { channel: '淘系', platform: '生意参谋' });
  assert.equal(monitoringPlatformExamples.京东.channel, '京东');
  assert.equal(monitoringPlatformExamples.拼多多.channel, '拼多多');
  assert.ok(Object.values(monitoringPlatformExamples).every(item => !['电商平台', '内容电商'].includes(item.channel)));
});

test('retry follows collection and import outcomes, not the aggregated date status', () => {
  assert.equal(canRetryDetail({ collectStatus: '失败', importStatus: '无任务' }), true);
  assert.equal(canRetryDetail({ collectStatus: '成功', importStatus: '失败' }), true);
  assert.equal(canRetryDetail({ collectStatus: '平台未更新', importStatus: '无任务' }), true);
  for (const collectStatus of ['成功', '运行中', '等待', '无任务']) {
    assert.equal(canRetryDetail({ collectStatus, importStatus: '成功' }), false);
  }
});

test('both detail paths and annotation previews use date ranges and the shared retry actions', () => {
  const page = readFileSync(new URL('../src/pages/etlDataMonitoringOptimization/index.tsx', import.meta.url), 'utf8');
  const preview = readFileSync(new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /bizDate: compactDate|channel: '电商平台'|channel: '内容电商'/);
  assert.match(page, /bizDateRange: mockExecutionDateRange\(date, index\)/);
  assert.match(page, /bizDateRange: mockExecutionDateRange\(date, index < 2 \? 0 : 1\)/);
  assert.match(page, /<DetailRowActions key=\{record.key\} record=\{record\}/);
  assert.match(preview, /<DetailRowActions key=\{record.key\} record=\{record\}/);
});

test('retry consistency annotation is rendered instead of repeated as prose', () => {
  const annotation = etlDataMonitoringAnnotations.find(
    item => item.noteId === 'ETL-4.9',
  );
  assert.ok(annotation);
  assert.equal(annotation?.module, '重试后父子状态同步');
  assert.ok(annotation?.ruleItems?.some(
    item => item.example === 'retry-consistency',
  ));
  assert.ok((annotation?.ruleItems?.length || 0) <= 2);

  const preview = readFileSync(
    new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url),
    'utf8',
  );
  for (const text of [
    'RetryConsistencyPreview',
    '重试采集',
    '重试入库',
    '提交失败',
    '刷新失败',
    '父表聚合',
  ]) assert.ok(preview.includes(text));
  assert.match(preview, /availableRetryKinds\(currentAttempt\)/);
});

test('PRD renders the retry parent-child flowchart while the annotation keeps only local interaction', () => {
  const preview = readFileSync(
    new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url),
    'utf8',
  );
  const prd = readFileSync(
    new URL('../src/pages/etlDataMonitoringOptimizationPrd/index.tsx', import.meta.url),
    'utf8',
  );
  const retry = prd.slice(
    prd.indexOf('const retryConsistencyFlowchart'),
    prd.indexOf('function Section'),
  );
  const diagram = prd.slice(
    prd.indexOf('const retryConsistencyFlowchart'),
    prd.indexOf('function RetryConsistencyFlowchart'),
  );

  assert.match(retry, /flowchart TB/);
  for (const text of [
    '点击状态进入下钻明细',
    '选择失败明细',
    '系统按三段状态识别可重试操作',
    '打开对应重试确认弹窗',
    '是否确认重试',
    '取消，本次操作结束',
    '提交已选择的重试',
    '重试是否提交成功',
    '取数执行：等待',
    '数据入库：等待',
    '父表立即按全部明细重新聚合',
    '父表可能仍显示失败、异常或等待',
    '按已选重试类型开始执行',
    '页面状态同步完成',
    '当前环节是否成功',
    '是否还有后续环节',
    '同一明细更新为当前环节成功',
    '提交失败',
    '刷新失败',
    '原失败结果保留在日志和运行记录',
    '主动刷新不改变重试流程',
  ]) assert.ok(retry.includes(text));
  assert.doesNotMatch(retry, /整体流程|重试是否受理成功|本次重试环节|是否确认重试采集|是否确认重试入库|重试采集是否提交成功|重试入库是否提交成功/);
  assert.doesNotMatch(diagram, /原失败结果保留在日志和运行记录|历史任务后续变化不再改变当前展示/);
  assert.match(diagram, /M --> N[\s\S]*?M --> O/);
  assert.doesNotMatch(retry, /当前有效执行|新尝试|迟到旧响应|回包|版本|定位唯一业务明细行/);
  assert.doesNotMatch(retry, /subgraph REFRESH/);
  assert.match(retry, /document\.createElement\('div'\)/);
  assert.match(retry, /setAttribute\('width'/);
  assert.match(retry, /setAttribute\('height'/);
  assert.match(prd, /<RetryConsistencyFlowchart\s*\/>/);
  assert.doesNotMatch(preview, /retryConsistencyFlowchart|RetryConsistencyFlowchart/);
});

test('retry consistency preview renders acceptance and completion as separate lifecycle actions', () => {
  const preview = readFileSync(
    new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url),
    'utf8',
  );
  const retry = preview.slice(
    preview.indexOf('function RetryConsistencyPreview'),
    preview.indexOf('export function EtlAnnotationComparison'),
  );

  for (const text of ['受理重试', '完成：成功', '完成：失败', '父对象：', '明细对象：', '取数执行', '数据入库', '数据校验']) {
    assert.ok(retry.includes(text));
  }
  assert.match(retry, /const acceptRetry = \(\) => \{/);
  assert.match(retry, /const completeRetry = \(outcome: RetryOutcome\) => \{/);
  assert.match(retry, /disabled=\{!isWaiting\}/);
  assert.match(retry, /<Button size="mini" disabled=\{isWaiting\} onClick=\{submitFailure\}>提交失败<\/Button>/);
  const acceptHandler = retry.slice(retry.indexOf('const acceptRetry'), retry.indexOf('const completeRetry'));
  assert.doesNotMatch(acceptHandler, /settleRetryAttempt/);
  assert.match(retry, /const parentObject = dimension === 'store' \? '示例店铺 A' : '订单履约费用明细';/);
  assert.match(retry, /const detailObject = dimension === 'store' \? '订单履约费用明细' : '示例店铺 A';/);
});

test('retry consistency preview resets to an eligible baseline when the retry stage changes', () => {
  const preview = readFileSync(
    new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url),
    'utf8',
  );
  const retry = preview.slice(
    preview.indexOf('function createRetryConsistencyAttempt'),
    preview.indexOf('export function EtlAnnotationComparison'),
  );

  assert.match(retry, /retryKind === 'collect'[\s\S]*?collectStatus: '失败',[\s\S]*?importStatus: '无任务',[\s\S]*?validationStatus: '无任务'/);
  assert.match(retry, /collectStatus: '成功',[\s\S]*?importStatus: '失败',[\s\S]*?validationStatus: '无任务'/);
  assert.match(retry, /const handleRetryKindChange = \(nextKind: RetryKind\) => \{[\s\S]*?setRetryKind\(nextKind\);[\s\S]*?reset\(nextKind\);[\s\S]*?\}/);
  assert.match(retry, /onChange=\{\(value\) => handleRetryKindChange\(value as RetryKind\)\}/);
  assert.match(retry, /const canAccept = !isWaiting && retryKinds\.includes\(retryKind\);/);
});

test('PRD keeps the retry business rule and retry flow while annotations define the local interaction lifecycle', () => {
  const prd = readFileSync(
    new URL('../src/pages/etlDataMonitoringOptimizationPrd/index.tsx', import.meta.url),
    'utf8',
  );
  const retryRuleStart = prd.indexOf("['重试后的状态同步'");
  assert.ok(retryRuleStart >= 0);
  const retryRuleEnd = prd.indexOf('\n  ],', retryRuleStart);
  const retryRule = prd.slice(retryRuleStart, retryRuleEnd);
  for (const text of ['重试受理成功', '失败 > 异常 > 等待 > 成功', '不新增明细行', '日志和运行记录']) {
    assert.ok(retryRule.includes(text));
  }
  assert.match(prd, /<Section title="重试后父子状态一致性流程">[\s\S]*?<RetryConsistencyFlowchart\s*\/>/);
  assert.doesNotMatch(prd, /整体流程/);
  assert.doesNotMatch(prd, /<Section title="页面改动清单"|data-note-id="ETL-/);

  const retryAnnotation = etlDataMonitoringAnnotations.find(item => item.noteId === 'ETL-4.9');
  assert.ok(retryAnnotation);
  const retryInteraction = JSON.stringify(retryAnnotation);

  for (const text of ['最新有效执行', '重试受理后更新当前行三段状态', '父表用同一结果重新聚合', '旧尝试仅在日志中保留']) {
    assert.ok(retryInteraction.includes(text));
  }

  const outOfScopeStart = prd.indexOf("['重试策略、权限与历史记录改版'");
  assert.ok(outOfScopeStart >= 0);
  const outOfScopeEnd = prd.indexOf('\n  ],', outOfScopeStart);
  const outOfScopeRow = prd.slice(outOfScopeStart, outOfScopeEnd);
  assert.ok(outOfScopeRow.includes('不新增自动重试策略'));
  assert.ok(outOfScopeRow.includes('不修改现有重试权限'));
  assert.ok(outOfScopeRow.includes('不删除历史执行记录'));
  assert.ok(outOfScopeRow.includes('不约束生产接口的具体地址或字段命名'));
});
