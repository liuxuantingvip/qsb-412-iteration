# 运行详情第二轮视觉修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 412 运行详情原型的父子表错位、抽屉比例失衡、结果表裁切和日志字段不可见问题，同时保持线上信息架构与 Arco 设计体系。

**Architecture:** 不改变现有 `runDetail` 数据模型和下钻层级，只在三个现有 UI 组件及其局部 Less 中收敛列定义、响应式宽度和可访问性。新增一个轻量的展示契约测试，先锁定必须保持的父子列对齐、Drawer 宽度和可读展开入口，再进行视觉修复。

**Tech Stack:** React 18, TypeScript 5.6, Arco Design React 2.66, Less, Vite 5, Node.js test runner

**Spec:** `docs/superpowers/specs/2026-09-01-run-detail-storage-log-entry-design.md`

## Global Constraints

- 只能使用当前 412 工程已有的 Arco Design React 组件与 `@arco-design/web-react/icon` 图标。
- 不引入 Ant Design、Semi、其他组件库或跨组件库样式。
- 运行记录详情 Drawer 桌面端宽度约 520px；日志 Drawer 保持约 830px。
- PRD 和交互标注继续保持空状态。
- 不修改数据模型、mock 业务口径、生产取数宝前端或其他 requirement 页面。
- 不修改 `dist/`，不清理当前工作树内其他未提交变更。
- 按用户约束不创建 Git 提交；每个任务以测试、构建、限定路径 diff 和内嵌浏览器截图作为检查点。

---

## File Structure

- Create `tests/runDetailPresentation.test.ts`: 锁定父子列对齐、Drawer 宽度、固定操作列和展开按钮可访问名称。
- Modify `package.json`: 将展示契约测试加入 `test:etl`。
- Modify `src/pages/autoRetryOptimization/runDetail/RunDetailModal.tsx`: 统一父子业务列、补齐展开占位、固定子表操作列。
- Modify `src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx`: 收窄 Drawer、重排基础信息、修复结果表滚动和展开入口。
- Modify `src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx`: 收敛筛选工具栏、列宽、固定状态列和长文本 Tooltip。
- Modify `src/pages/autoRetryOptimization/runDetail/index.module.less`: 只用 Arco 变量修复间距、宽度、滚动和响应式。

### Task 1: 锁定视觉展示契约

**Files:**
- Create: `tests/runDetailPresentation.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the three existing TSX files and `index.module.less` as UTF-8 source.
- Produces: source-level regression checks for alignment, responsive Drawer widths and accessible expand controls.

- [ ] **Step 1: Write the failing presentation contract test**

Create `tests/runDetailPresentation.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('keeps parent and child run-detail columns aligned with visible actions', async () => {
  const source = await read('../src/pages/autoRetryOptimization/runDetail/RunDetailModal.tsx');
  assert.match(source, /EXPAND_COLUMN_WIDTH/);
  assert.match(source, /childColumns/);
  assert.match(source, /fixed:\s*'right'/);
  assert.match(source, /aria-label="展开运行记录"/);
});

test('uses the approved responsive drawer widths', async () => {
  const detail = await read('../src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx');
  const logs = await read('../src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx');
  assert.match(detail, /width=\{520\}/);
  assert.match(logs, /width=\{830\}/);
});

test('keeps long log content discoverable without replacing Arco', async () => {
  const source = await read('../src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx');
  assert.match(source, /Tooltip/);
  assert.match(source, /fixed:\s*'right'/);
  assert.doesNotMatch(source, /antd|@douyinfe\/semi/);
});
```

- [ ] **Step 2: Register and verify the test fails**

Append `tests/runDetailPresentation.test.ts` to `test:etl` in `package.json`.

Run: `node --test --experimental-strip-types tests/runDetailPresentation.test.ts`

Expected: FAIL because the current components do not contain the approved alignment constant, 520px Drawer width or accessible expand label.

### Task 2: Repair the run-detail Modal alignment

**Files:**
- Modify: `src/pages/autoRetryOptimization/runDetail/RunDetailModal.tsx`
- Modify: `src/pages/autoRetryOptimization/runDetail/index.module.less`
- Test: `tests/runDetailPresentation.test.ts`

**Interfaces:**
- Consumes: existing `RunExecuteRecord`, `DetailStatusTag`, `RunRecordDetailDrawer`.
- Produces: one shared `businessColumns` definition, `EXPAND_COLUMN_WIDTH = 48`, aligned parent and child table columns.

- [ ] **Step 1: Extract shared business columns**

Define `const EXPAND_COLUMN_WIDTH = 48;` and one `businessColumns` array for plan name through storage status. Parent columns prepend the Arco expand column supplied by `Table`; child columns prepend one empty column with `width: EXPAND_COLUMN_WIDTH`.

- [ ] **Step 2: Keep actions visible at both levels**

Use separate parent and child action columns with `width: 152` and `fixed: 'right'`. Parent actions render retry controls; child actions render the “详情” text button. Set table `scroll.x` to the exact sum of the shared widths plus expand and action columns.

- [ ] **Step 3: Add an accessible expand control**

Configure the Arco table expand icon renderer so the interactive control has `aria-label="展开运行记录"` when collapsed and `aria-label="收起运行记录"` when expanded. Preserve Arco's icon and keyboard behavior.

- [ ] **Step 4: Verify the Modal contract**

Run: `node --test --experimental-strip-types tests/runDetailPresentation.test.ts --test-name-pattern="parent and child"`

Expected: PASS.

### Task 3: Repair the record-detail and log Drawers

**Files:**
- Modify: `src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx`
- Modify: `src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx`
- Modify: `src/pages/autoRetryOptimization/runDetail/index.module.less`
- Test: `tests/runDetailPresentation.test.ts`

**Interfaces:**
- Consumes: existing run result filters, log filters and mock rows.
- Produces: 520px responsive detail Drawer, 830px log Drawer, fixed right-side actions/status and Tooltip-backed ellipsis.

- [ ] **Step 1: Apply the approved detail Drawer width**

Set Arco `Drawer width={520}`. Remove the 760px minimum width. Under `@media (max-width: 560px)`, use `width: calc(100vw - 24px)` through the component style/class without creating a global override.

- [ ] **Step 2: Reflow basic information**

Long values (`planName`, `robotToken`, `recordId`) occupy a full grid row. Short values (`planType`, `dataCycle`, `platformType`, `platformName`) use two columns. Values remain single-line with Arco `Tooltip` for overflow.

- [ ] **Step 3: Repair the result toolbar and table**

Allow filters to wrap with two 148px controls per line where space permits. Keep one table scroll container, use `scroll={{ x: 980 }}`, fix the operation column to the right, and add readable labels to store expand controls.

- [ ] **Step 4: Repair the log table hierarchy**

Keep `width={830}`. Runtime log columns use widths `168 / 500 / 110`. Storage log columns use widths `168 / 150 / 190 / 180 / 110 / 320 / 110`; fix the status or level action-side column to the right. Wrap long cell content with Arco `Tooltip` and the existing ellipsis class.

- [ ] **Step 5: Verify the Drawer contracts**

Run: `node --test --experimental-strip-types tests/runDetailPresentation.test.ts`

Expected: all presentation tests PASS.

### Task 4: Build and visually verify the complete flow

**Files:**
- Verify: `src/pages/autoRetryOptimization/runDetail/**`
- Verify: `tests/runDetailModel.test.ts`
- Verify: `tests/runDetailPresentation.test.ts`

**Interfaces:**
- Consumes: the repaired components and the current local service on port 5178.
- Produces: same-viewport screenshots of the repaired Modal, detail Drawer, expanded connector rows, runtime log Drawer and storage log Drawer.

- [ ] **Step 1: Run scoped automated checks**

Run:

```bash
node --test --experimental-strip-types tests/runDetailModel.test.ts tests/runDetailPresentation.test.ts
npm run build
git diff --check
! grep -RInE "from ['\"](antd|@douyinfe/semi-ui|@douyinfe/semi-icons)['\"]" src/pages/autoRetryOptimization/runDetail
```

Expected: focused tests and build PASS; no whitespace errors or non-Arco UI imports.

- [ ] **Step 2: Verify the complete interaction in the Codex in-app browser**

At `?requirement=runDetailStorageLog&tab=prototype`:

1. Open the first failed record's run detail.
2. Confirm parent/child fields align and both retry/detail actions remain visible at 1280px and the current wide viewport.
3. Open the child detail and confirm the Drawer is approximately 520px wide.
4. Expand the store and confirm connector statuses and actions are reachable without overlap.
5. Open runtime log and storage log Drawers; verify filters, fixed columns, Tooltip ellipsis, pagination and close-return behavior.

Expected: no clipped primary action, no shifted child row, no overlapping fixed column and no broken Drawer layering.

- [ ] **Step 3: Run the full existing suite and report unrelated failures separately**

Run: `npm run test:etl`

Expected: new run-detail tests PASS. If an unrelated pre-existing test fails, preserve it and report its exact name without changing out-of-scope PRD or annotation files.

- [ ] **Step 4: Review the final scoped diff**

Run:

```bash
git diff --stat -- package.json src/pages/autoRetryOptimization/runDetail tests/runDetailPresentation.test.ts
git diff --check
```

Expected: every new change maps to the approved second-round visual repair; no PRD, annotation, production or unrelated requirement code changed.
