import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('connects the storage-log PRD and six annotations to the requirement shell', async () => {
  const app = await read('../src/App.tsx');
  const annotations = await read('../src/components/runDetailStorageLogAnnotations/data.ts');

  assert.match(app, /RunDetailStorageLogPrd/);
  assert.match(app, /runDetailStorageLogAnnotations/);
  assert.match(app, /activeRequirement === 'runDetailStorageLog'[\s\S]*runDetailStorageLogAnnotations/);
  assert.match(app, /activeRequirement === 'runDetailStorageLog'[\s\S]*<RunDetailStorageLogPrd/);
  assert.match(app, /<RunDetailStorageLogAnnotationDrawer/);
  assert.deepEqual(
    [...annotations.matchAll(/noteId:\s*'(RSL-\d)'/g)].map((match) => match[1]),
    ['RSL-1', 'RSL-2', 'RSL-3', 'RSL-4', 'RSL-5', 'RSL-6'],
  );
});

test('provides executable field, status, pagination and query-state annotation data', async () => {
  const { runDetailStorageLogAnnotations } = await import('../src/components/runDetailStorageLogAnnotations/data.ts');
  const byId = new Map(runDetailStorageLogAnnotations.map((annotation) => [annotation.noteId, annotation]));

  const fieldCopy = byId.get('RSL-3')?.ruleItems?.map((item) => item.text).join('\n') ?? '';
  assert.match(fieldCopy, /YYYY-MM-DD/);
  assert.match(fieldCopy, /YYYY-MM-DD HH:mm:ss/);
  assert.match(fieldCopy, /0 条/);

  const statusPreviews = byId.get('RSL-4')?.ruleItems
    ?.flatMap((item) => item.previews ?? []) ?? [];
  assert.deepEqual(
    statusPreviews.filter((preview) => preview.type === 'tag').map((preview) => preview.label),
    ['待运行', '运行中', '成功', '成功', '失败'],
  );
  assert.deepEqual(
    statusPreviews.filter((preview) => preview.type === 'result-text').map((preview) => preview.label),
    ['第 1 次：失败', '第 2 次：成功（列表展示）'],
  );

  assert.match(byId.get('RSL-5')?.ruleItems?.map((item) => item.text).join('\n') ?? '', /10、20、50/);

  const queryStatePreviews = byId.get('RSL-6')?.stateItems
    ?.flatMap((item) => item.previews ?? []) ?? [];
  assert.deepEqual(queryStatePreviews.map((preview) => preview.type), ['loading-state', 'empty-state', 'alert']);
  assert.match(byId.get('RSL-6')?.recoveryItems?.map((item) => item.text).join('\n') ?? '', /关闭后重新进入/);
});

test('provides a visual filter-bar example for the search and filter annotation', async () => {
  const { runDetailStorageLogAnnotations } = await import('../src/components/runDetailStorageLogAnnotations/data.ts');
  const filterAnnotation = runDetailStorageLogAnnotations.find((annotation) => annotation.noteId === 'RSL-2');
  const filterPreview = filterAnnotation?.ruleItems
    ?.flatMap((item) => item.previews ?? [])
    .find((preview) => preview.type === 'filter-bar');

  assert.deepEqual(filterPreview, {
    type: 'filter-bar',
    searchPlaceholder: '搜索数据表中英文名',
    selectPlaceholders: ['最新入库结果', '失败筛选'],
    actionLabel: '重置',
    relationLabel: '搜索 + 最新入库结果 + 失败筛选 → 同时生效',
  });
});

test('documents the storage-log scope, latest-result grain, fields and exclusions', async () => {
  const prd = await read('../src/pages/runDetailStorageLogPrd/index.tsx');

  assert.match(prd, /运行详情新增入库日志/);
  assert.match(prd, /当前运行记录/);
  assert.match(prd, /数据库类型.*数据表英文名.*业务日期/s);
  assert.match(prd, /最新一次入库结果/);
  assert.match(prd, /数据表中文名.*数据表英文名/s);
  assert.match(prd, /搜索仅匹配数据表中文名和英文名/);
  assert.match(prd, /成功.*部分无数据.*失败/s);
  assert.match(prd, /历史尝试记录/);
  assert.match(prd, /入库重试/);
  assert.match(prd, /验收清单/);
});

test('uses a flowchart for the core process without duplicating annotation rules', async () => {
  const prd = await read('../src/pages/runDetailStorageLogPrd/index.tsx');

  assert.match(prd, /<MermaidDiagram/);
  assert.match(prd, /flowchart LR/);
  assert.match(prd, /按当前运行记录 ID 查询/);
  assert.match(prd, /取每张表最新一次入库结果/);
  assert.doesNotMatch(prd, /const flowRows/);
  assert.doesNotMatch(prd, /用户场景与交互说明/);
  assert.doesNotMatch(prd, /const sceneRows/);
});

test('places annotations on the entry, filters, table, status and footer', async () => {
  const recordDrawer = await read('../src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx');
  const logDrawer = await read('../src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx');
  const modal = await read('../src/pages/autoRetryOptimization/runDetail/RunDetailModal.tsx');
  const runPage = await read('../src/pages/autoRetryOptimization/index.tsx');

  assert.match(recordDrawer, /noteId="RSL-1"/);
  assert.match(logDrawer, /noteId="RSL-2"/);
  assert.match(logDrawer, /noteId="RSL-3"/);
  assert.match(logDrawer, /noteId="RSL-4"/);
  assert.match(logDrawer, /noteId="RSL-5"/);
  assert.match(logDrawer, /noteId="RSL-6"/);
  assert.match(runPage, /run-detail-storage-log:open/);
  assert.match(modal, /run-detail-storage-log:open-record/);
  assert.match(recordDrawer, /run-detail-storage-log:open-drawer/);
});
