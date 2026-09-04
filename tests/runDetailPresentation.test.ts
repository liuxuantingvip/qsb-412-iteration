import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('keeps parent and child run-detail columns aligned with visible actions', async () => {
  const source = await read('../src/pages/autoRetryOptimization/runDetail/RunDetailModal.tsx');
  assert.match(source, /EXPAND_COLUMN_WIDTH/);
  assert.match(source, /children:/);
  assert.doesNotMatch(source, /expandedRowRender=/);
  assert.match(source, /fixed:\s*'right'/);
  assert.match(source, /展开运行记录/);
  assert.match(source, /收起运行记录/);
});

test('uses the approved responsive drawer widths', async () => {
  const detail = await read('../src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx');
  const logs = await read('../src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx');
  assert.match(detail, /width=\{drawerWidth\}/);
  assert.match(detail, /role="separator"/);
  assert.match(detail, /aria-orientation="vertical"/);
  assert.match(detail, /document\.addEventListener\('mousemove'/);
  assert.match(detail, /document\.removeEventListener\('mousemove'/);
  assert.match(detail, /RESULT_ACTION_COLUMN_WIDTH\s*=\s*180/);
  assert.match(detail, /RESULT_SCROLL_X\s*=\s*1140/);
  assert.match(logs, /width=\{mode === 'storage' \? 'min\(1200px, calc\(100vw - 48px\)\)' : 830\}/);
});

test('keeps child selection, action widths, and the resize handle aligned', async () => {
  const detail = await read('../src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx');
  const styles = await read('../src/pages/autoRetryOptimization/runDetail/index.module.less');
  const actionWidthUses = detail.match(/width:\s*RESULT_ACTION_COLUMN_WIDTH/g) ?? [];

  assert.match(detail, /Checkbox/);
  assert.match(detail, /isConnectorSelectable\(row\)/);
  assert.equal(actionWidthUses.length, 2);
  assert.match(styles, /\.recordDrawer\s+:global\(\.arco-drawer-content\)[\s\S]*overflow:\s*visible/);
  assert.match(styles, /\.recordDrawer\s+:global\(\.arco-drawer-inner\),[\s\S]*\.recordDrawer\s+:global\(\.arco-drawer-scroll\)[\s\S]*overflow:\s*visible/);
  assert.match(styles, /\.recordDrawerResizeHandle[\s\S]*border-radius:\s*@radius-large/);
});

test('opens every store child table when run-record detail is entered', async () => {
  const detail = await read('../src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx');

  assert.match(detail, /if \(!visible \|\| !record\) return;[\s\S]*setExpandedStoreKeys\(record\.stores\.map\(\(store\) => store\.id\)\)/);
});

test('uses 14px section titles and the approved rerun action', async () => {
  const detail = await read('../src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx');
  const styles = await read('../src/pages/autoRetryOptimization/runDetail/index.module.less');
  assert.match(styles, /\.sectionHeader h3,[\s\S]*\.resultSection h3[\s\S]*font-size:\s*@font-size-body-3/);
  assert.doesNotMatch(detail, />重置<\/Button>/);
  assert.match(detail, />重新运行<\/Button>/);
  assert.match(detail, /已提交 \$\{selectedCount\} 条重新运行/);
  assert.match(detail, /disabled=\{!selectedCount\}/);
});

test('keeps long log content discoverable without replacing Arco', async () => {
  const source = await read('../src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx');
  const styles = await read('../src/pages/autoRetryOptimization/runDetail/index.module.less');
  assert.match(source, /Tooltip/);
  assert.match(source, /STORAGE_SCROLL_X\s*=\s*1160/);
  assert.match(source, /latest\.failureStage/);
  assert.match(styles, /\.logDrawer\s+:global\(\.arco-table-cell\)[\s\S]*white-space:\s*nowrap/);
  assert.match(styles, /\.storageEnglishName\s*\{[\s\S]*white-space:\s*normal[\s\S]*-webkit-line-clamp:\s*2/);
  assert.match(styles, /\.storageFailureReason\s*\{[\s\S]*white-space:\s*normal[\s\S]*-webkit-line-clamp:\s*2/);
  assert.doesNotMatch(source, /antd|@douyinfe\/semi/);
});

test('uses the approved mode-specific log actions and Arco 8px search radius', async () => {
  const source = await read('../src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx');
  const styles = await read('../src/pages/autoRetryOptimization/runDetail/index.module.less');

  assert.match(source, /mode === 'storage'[\s\S]*>重置<\/Button>[\s\S]*aria-label="重新加载"/);
  assert.doesNotMatch(source, /<Button icon=\{<IconRefresh \/>\} onClick=\{reload\}>重新加载<\/Button>/);
  assert.match(styles, /\.logSearch\s+:global\(\.arco-input-inner-wrapper\)[\s\S]*border-radius:\s*@radius-large/);
});

test('names the runtime log entry and drawer as fetch logs', async () => {
  const detail = await read('../src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx');
  const logs = await read('../src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx');

  assert.match(detail, />取数日志<\/Button>/);
  assert.match(logs, /mode === 'runtime' \? '取数日志' : '入库日志'/);
  assert.doesNotMatch(`${detail}\n${logs}`, /查看日志/);
});

test('presents concise latest table outcomes without attempt history', async () => {
  const source = await read('../src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx');
  const styles = await read('../src/pages/autoRetryOptimization/runDetail/index.module.less');

  assert.match(source, /buildStorageTableResults/);
  assert.match(source, /filterStorageTableResults/);
  assert.doesNotMatch(source, /Statistic|summarizeStorageTableResults|storageSummary/);
  assert.doesNotMatch(source, /Checkbox/);
  assert.match(source, /mode === 'storage'[\s\S]*placeholder="搜索数据表中英文名"/);
  assert.match(source, /placeholder="失败筛选"[\s\S]*label: '仅看失败'/);
  const columnLabels = ['数据表', '数据库类型', '最新入库结果', '写入条数', '业务日期', '完成时间', '失败原因'];
  columnLabels.reduce((previousIndex, label) => {
    const nextIndex = source.indexOf(label, previousIndex + 1);
    assert.ok(nextIndex > previousIndex, `${label} should follow the previous storage-log column`);
    return nextIndex;
  }, source.indexOf('const storageColumns'));
  assert.doesNotMatch(source, /title:\s*'数据表中文名'|title:\s*'数据表英文名'/);
  assert.match(source, /row\.tableChineseName[\s\S]*row\.tableEnglishName/);
  assert.match(source, /status === '成功\(部分无数据\)'[\s\S]*<DetailStatusTag status="成功" \/>[\s\S]*>部分无数据<\/span>/);
  assert.doesNotMatch(source, /expandedRowRender|入库尝试记录|第 \{attempt\.attemptNo\} 次尝试/);
  assert.doesNotMatch(styles, /\.storageHistory|\.storageAttempt/);
  assert.match(styles, /\.storagePartialStatus/);
  assert.doesNotMatch(styles, /\.storageSummary/);
  assert.match(styles, /\.storageFailureReason/);
});
