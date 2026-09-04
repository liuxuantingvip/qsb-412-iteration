import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { etlDataMonitoringAnnotations } from '../src/components/etlDataMonitoringAnnotations/data.ts';
import { detailRowSpans, filterMonitorDates, matchesPlanKeyword, showNoDataLabel } from '../src/pages/etlDataMonitoringOptimization/monitoringPresentation.ts';

test('range is inclusive and clearing restores available dates', () => {
  const dates = ['2026-07-14', '2026-07-13', '2026-07-12'];
  assert.deepEqual(filterMonitorDates(dates, ['2026-07-13', '2026-07-14']), dates.slice(0, 2));
  assert.deepEqual(filterMonitorDates(dates, []), dates);
  assert.deepEqual(filterMonitorDates(dates, ['2026-08-01', '2026-08-31']), []);
});
test('plan search matches any associated plan with trimmed keyword', () => {
  assert.equal(matchesPlanKeyword(['订单采集', '商品采集'], ' 商品 '), true);
  assert.equal(matchesPlanKeyword(['订单采集'], '商品'), false);
  assert.equal(matchesPlanKeyword([], ''), true);
});
test('no data is an explicit successful outcome, not no task or generic success', () => {
  assert.equal(showNoDataLabel('成功', true), true);
  assert.equal(showNoDataLabel('成功'), false);
  assert.equal(showNoDataLabel('失败', true), false);
  assert.equal(showNoDataLabel('无任务', true), false);
});
test('merge only matching contiguous shared values and never execution fields', () => {
  const row = { channel: '淘系', platform: '阿里妈妈', bizDateRange: '2026-07-08 至 2026-07-14', dataCycle: '日', tableName: '订单', tableNameEn: 'order', connectorName: '来源A' };
  const rows = [row, { ...row }, { ...row, connectorName: '来源B' }, { ...row, bizDateRange: '2026-07-14 至 2026-07-14' }];
  assert.deepEqual(detailRowSpans(rows, 'tableName'), [3, 0, 0, 1]);
  assert.deepEqual(detailRowSpans(rows, 'connectorName'), [2, 0, 1, 1]);
  for (const field of ['storeName', 'taskName', 'collectStatus', 'operation']) assert.deepEqual(detailRowSpans(rows, field), [1, 1, 1, 1]);
  assert.deepEqual(detailRowSpans(rows.slice(1, 3), 'tableName'), [2, 0]);
  assert.deepEqual(detailRowSpans([], 'tableName'), []);
  assert.deepEqual(detailRowSpans([row, { ...row, tableNameEn: 'other' }, row], 'tableName'), [1, 1, 1]);
  assert.deepEqual(detailRowSpans([row, { ...row, connectorName: 'B' }, row], 'connectorName'), [1, 1, 1]);
});

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('src/pages/etlDataMonitoringOptimization/index.tsx');

test('all detail and summary cells align left', () => {
  const detail = page.slice(page.indexOf('function DrilldownDetailView'), page.indexOf('export function ViewTabs'));
  assert.equal((detail.match(/className=\{styles.detailStatusCell\}/g) || []).length, 3);
  assert.doesNotMatch(detail, /styles.annotationStatusCell/);
  assert.match(detail, /return \{ \.\.\.column, align: 'left' as const/);
  const styles = read('src/pages/etlDataMonitoringOptimization/index.module.less');
  assert.match(styles, /\.detailStatusCell\s*\{\s*justify-content: flex-start/);
  assert.match(styles, /\.annotationStatusCell,[\s\S]*?justify-content: flex-start/);
  const summary = page.slice(page.indexOf('function StoreMonitoringView'));
  assert.equal((summary.match(/align: 'left' as const/g) || []).length, 2);
  assert.doesNotMatch(summary, /align: 'center' as const/);
  assert.equal((summary.match(/styles.annotationStatusCell/g) || []).length, 2);
});

test('column settings remove only the requested copy, retaining required fields and fixed operation', () => {
  const settings = read('src/pages/etlDataMonitoringOptimization/DetailColumnSettings.tsx');
  assert.doesNotMatch(settings, /必显|即时生效 · 操作列固定最右 · 仅当前下钻有效|IconLock/);
  assert.match(settings, /disableCheckbox: option.disabled/);
  assert.match(settings, /draggable: key !== 'operation'/);
  assert.match(settings, /new Set\(\[\.\.\.keys, \.\.\.required\]\)/);
  assert.match(settings, /恢复默认/);
});

test('PRD does not explain UI elements and unchanged capabilities that were removed from scope', () => {
  const prd = read('src/pages/etlDataMonitoringOptimizationPrd/index.tsx');
  assert.doesNotMatch(prd, /浮层不展示“必显”文字及底部说明|汇总视图列设置保持原能力/);
});

test('failure info is focusable and no-data rendering consumes explicit outcome', () => {
  assert.match(page, /Tooltip content=\{reason\} trigger=\{\['hover', 'focus'\]\}/);
  assert.match(page, /aria-label="查看错误码和原因"><IconInfoCircleFill/);
  assert.match(page, /noData=\{record.collectNoData\}/);
  assert.match(page, /showNoDataLabel\(displayStatus, noData\)/);
});

test('both summary views search displayed plans and use selected dates before pagination', () => {
  for (const dimension of ['Store', 'Table']) {
    const start = page.indexOf(`function ${dimension}MonitoringView`);
    const end = page.indexOf('\nfunction ', start + 1);
    const view = page.slice(start, end === -1 ? undefined : end);
    assert.match(view, /filterMonitorDates\(tableDateColumns, dateRange\)/);
    assert.ok(view.includes(`matchesPlanKeyword(get${dimension}RelatedTasks(record)`));
    assert.match(view, /label: '计划名称', value: 'planName'/);
    assert.match(view, /visibleDates.some/);
    assert.match(view, /className=\{styles\.statusRefreshGroup\}/);
    assert.ok(view.indexOf('placeholder="状态筛选"') < view.indexOf('aria-label="刷新"'));
    assert.match(view, /setDateRange\(value\); setPage\(1\)/);
  }
});

test('platform filters precede pagination and merged cells use only the page slice', () => {
  assert.match(page, /record.channel === detailChannel/);
  assert.match(page, /record.platform === detailPlatform/);
  assert.match(page, /filterMultiple: false/);
  assert.match(page, /setDetailPlatform\(channel !== detailChannel \? undefined : filters.platform\?\.\[0\]\)/);
  assert.match(page, /const pagedRecords = filteredRecords.slice/);
  assert.match(page, /dimension === 'table' \? detailRowSpans\(pagedRecords, column.key\) : \[\]/);
  const preview = read('src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx');
  assert.match(preview, /detailRowSpans\(rows, key\)/);
});

test('new interactions have matching annotations and page targets without duplicate PRD anchors', () => {
  const prd = read('src/pages/etlDataMonitoringOptimizationPrd/index.tsx');
  for (const id of ['ETL-2.4', 'ETL-3.4']) {
    assert.ok(etlDataMonitoringAnnotations.some(note => note.noteId === id));
    assert.ok(page.includes(id));
  }
  assert.ok(etlDataMonitoringAnnotations.some(note => note.noteId === 'ETL-4.9'));
  assert.doesNotMatch(prd, /<Section title="页面改动清单"|data-note-id="ETL-/);
  const detail = etlDataMonitoringAnnotations.find(note => note.noteId === 'ETL-4.3');
  for (const text of ['不跨页合并', '仍逐行展示']) assert.ok(JSON.stringify(detail).includes(text));
  const preview = read('src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx');
  assert.match(preview, /reason=\{value === '失败'/);
  assert.match(preview, /noData=\{key === 'collectStatus' && record\.collectNoData\}/);
  const refresh = etlDataMonitoringAnnotations.find(note => note.noteId === 'ETL-2.2');
  assert.match(refresh!.rule, /状态筛选右侧/);
});

test('monitor page owns one retry simulation and only clears completed successes', () => {
  const root = page.slice(page.indexOf('export default function EtlDataMonitoringOptimization'));
  const store = page.slice(page.indexOf('function StoreMonitoringView'), page.indexOf('function TableMonitoringView'));
  const table = page.slice(page.indexOf('function TableMonitoringView'), page.indexOf('export default function EtlDataMonitoringOptimization'));
  const retryHook = read('src/pages/etlDataMonitoringOptimization/useRetrySimulation.ts');

  assert.match(root, /const \{ attempts, phases, submitRetry \} = useRetrySimulation\(\);/);
  assert.doesNotMatch(store, /useRetrySimulation\(\)/);
  assert.doesNotMatch(table, /useRetrySimulation\(\)/);
  for (const view of [store, table]) {
    assert.match(view, /getDrilldownFinalStatus\(detail\) === 'success'/);
    assert.doesNotMatch(view, /detail\.lifecycle === 'completed'\s*\?/);
    assert.match(view, /attempts,/);
    assert.match(view, /phases,/);
    assert.match(view, /submitRetry,/);
  }
  assert.match(retryHook, /startRetrySimulation/);
  assert.match(retryHook, /acceptRetrySimulation/);
  assert.match(retryHook, /await waitForAcceptance\(\)/);
});
