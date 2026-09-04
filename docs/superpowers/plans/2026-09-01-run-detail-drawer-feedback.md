# Run Detail Drawer Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复运行记录详情抽屉的分区标题字号、宽度拖拽与持久化，并同步批量操作文案和筛选区按钮。

**Architecture:** 在 `RunRecordDetailDrawer.tsx` 内维护 Drawer 宽度、拖拽生命周期和持久化；把纯宽度收敛逻辑放入同目录独立模型，便于用真实函数测试边界。视觉继续由现有 CSS Module 和 Arco 全局变量控制，不引入第三方拖拽依赖。

**Tech Stack:** React 18、TypeScript、Arco Design React、CSS Modules/Less、Node test runner

**Spec:** `docs/superpowers/specs/2026-09-01-run-detail-storage-log-entry-design.md`

## Global Constraints

- PRD 与交互标注保持空状态。
- 只使用 `@arco-design/web-react`、`@arco-design/web-react/icon` 和现有全局变量。
- Drawer 默认及最小宽度为 520px，最大宽度为视口宽度减 120px。
- 拖拽结束后持久化宽度；未选择店铺时“重新运行”禁用。
- 不提交代码。

---

### Task 1: 锁定宽度边界和持久化契约

**Files:**
- Create: `src/pages/autoRetryOptimization/runDetail/drawerWidth.ts`
- Modify: `tests/runDetailModel.test.ts`

**Interfaces:**
- Produces: `clampRunRecordDrawerWidth(width: number, viewportWidth: number): number`
- Produces: `RUN_RECORD_DRAWER_MIN_WIDTH = 520`
- Produces: `RUN_RECORD_DRAWER_LEFT_GAP = 120`
- Produces: `RUN_RECORD_DRAWER_STORAGE_KEY`

- [ ] **Step 1: Write the failing test**

```ts
test('clamps the run-record drawer between 520px and the viewport left gap', () => {
  assert.equal(clampRunRecordDrawerWidth(360, 1440), 520);
  assert.equal(clampRunRecordDrawerWidth(860, 1440), 860);
  assert.equal(clampRunRecordDrawerWidth(1400, 1440), 1320);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types tests/runDetailModel.test.ts`
Expected: FAIL because `drawerWidth.ts` and the exported clamp function do not exist.

- [ ] **Step 3: Write minimal implementation**

Implement the three exported constants and a pure clamp function using `Math.min`/`Math.max`. When `viewportWidth - 120` is below 520, return the available positive width without producing a negative value.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types tests/runDetailModel.test.ts`
Expected: PASS.

### Task 2: 实现 Drawer 拖拽与宽度恢复

**Files:**
- Modify: `src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx`
- Modify: `src/pages/autoRetryOptimization/runDetail/index.module.less`
- Modify: `tests/runDetailPresentation.test.ts`

**Interfaces:**
- Consumes: `clampRunRecordDrawerWidth`, `RUN_RECORD_DRAWER_MIN_WIDTH`, `RUN_RECORD_DRAWER_STORAGE_KEY`
- Produces: 左侧 24px 拖拽热区、拖拽中的宽度更新、鼠标释放后的本地持久化和卸载清理

- [ ] **Step 1: Write the failing presentation test**

Assert the rendered source owns a resize handle with `role="separator"`, `aria-orientation="vertical"`, a dynamic `width={drawerWidth}`, and document-level `mousemove`/`mouseup` cleanup. Assert the stylesheet uses `cursor: ew-resize` and Arco variables.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types tests/runDetailPresentation.test.ts`
Expected: FAIL because the Drawer still has fixed `width={520}` and no resize handle.

- [ ] **Step 3: Write minimal implementation**

Initialize width from `localStorage`; on drawer open clamp the stored width to the current viewport. On handle mouse down, calculate `viewportWidth - clientX`, update state through `requestAnimationFrame`, and on mouse up persist the final width. Clean listeners, animation frame, cursor and user selection on mouse up and unmount.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types tests/runDetailPresentation.test.ts`
Expected: PASS.

### Task 3: 修正标题与运行结果操作

**Files:**
- Modify: `src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx`
- Modify: `src/pages/autoRetryOptimization/runDetail/index.module.less`
- Modify: `tests/runDetailPresentation.test.ts`

**Interfaces:**
- Produces: 14px 分区标题、无额外重置按钮、批量“重新运行”及对应 Message 反馈

- [ ] **Step 1: Write the failing presentation test**

Assert `.sectionHeader h3, .resultSection h3` uses `@font-size-body-3`; assert the toolbar no longer renders `>重置</Button>` and renders `>重新运行</Button>` with “已提交 N 条重新运行”反馈。

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types tests/runDetailPresentation.test.ts`
Expected: FAIL because current title is 12px and current buttons are “重置 / 重试”.

- [ ] **Step 3: Write minimal implementation**

Switch the title token to `@font-size-body-3`, delete only the extra reset button and now-unused reset handler, rename the primary button and Message copy. Keep Select `allowClear` and selection-based disabled behavior unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types tests/runDetailPresentation.test.ts`
Expected: PASS.

### Task 4: 浏览器与全量验收

**Files:**
- Verify: `src/pages/autoRetryOptimization/runDetail/**`

**Interfaces:**
- Consumes: completed Drawer interaction and presentation
- Produces: current-page evidence for minimum width, expanded width, reopened persisted width and final button states

- [ ] **Step 1: Run focused tests**

Run: `node --test --experimental-strip-types tests/runDetailModel.test.ts tests/runDetailPresentation.test.ts`
Expected: all focused tests pass.

- [ ] **Step 2: Verify in the Codex in-app browser**

Open `http://127.0.0.1:5178/?requirement=runDetailStorageLog&tab=prototype`, open one record detail, confirm titles are 14px, “重置” is absent, “重新运行” is disabled without selection, drag the left handle wider, close/reopen and confirm the width persists.

- [ ] **Step 3: Run full verification**

Run: `npm run test:etl && npm run build && git diff --check`
Expected: tests and build pass; only existing bundle warnings may remain.

- [ ] **Step 4: Check the component-library boundary**

Run: `! grep -RInE "from ['\"](antd|@douyinfe/semi-ui|@douyinfe/semi-icons)['\"]" src/pages/autoRetryOptimization/runDetail`
Expected: exit 0 with no matches.
