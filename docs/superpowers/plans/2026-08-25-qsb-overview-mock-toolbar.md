# QSB Overview Mock and Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为概览页提供可验证的公告和异常 mock，并修正数据异常对齐、机器人工具栏与资源中心标题。

**Architecture:** 将公告和异常 mock 统一放在 `overviewContent.ts`，用确定性模板生成每组 20 条异常，并通过 Node 测试锁定数量、唯一性和口径。`index.tsx` 只负责渲染和交互，Less 负责板块内部滚动与工具位置。

**Tech Stack:** React 18, TypeScript, Less, Node test runner, Vite

**Spec:** `docs/superpowers/specs/2026-08-25-qsb-overview-mock-toolbar-design.md`

## Global Constraints

- 每个异常 Tab 恰好 20 条，80 个 `runRecordKey` 全局唯一。
- 公告恰好 10 条，标题唯一，ISO 日期倒序存储，界面显示 `MM/DD`。
- 不改变数据异常率数值口径、重试和查看行为。
- 全屏目标仍为 `.scheduleViewport`，仅改变按钮位置。
- 412 源码在父仓库中整体未跟踪，不暂存或提交实现文件。

---

### Task 1: 公告与异常 Mock 约束

**Files:**
- Modify: `tests/qsbOverviewContent.test.ts`
- Modify: `src/pages/qsbOverview/overviewContent.ts`

**Interfaces:**
- Produces: `overviewAnnouncements`, `formatOverviewAnnouncementDate`, `overviewAnomalyGroups`
- Consumes: `buildOverviewRunFilters` 使用的现有异常组和行结构

- [ ] **Step 1: 写公告失败测试**

Add imports for `overviewAnnouncements` and `formatOverviewAnnouncementDate`, then add:

```ts
test('provides ten unique announcements in descending ISO date order', () => {
  assert.equal(overviewAnnouncements.length, 10);
  assert.equal(new Set(overviewAnnouncements.map((item) => item.title)).size, 10);
  assert.ok(overviewAnnouncements.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt)));
  assert.deepEqual(
    overviewAnnouncements.map((item) => item.publishedAt),
    [...overviewAnnouncements.map((item) => item.publishedAt)].sort().reverse(),
  );
  assert.equal(formatOverviewAnnouncementDate('2026-08-25'), '08/25');
});
```

- [ ] **Step 2: 写异常数据失败测试**

Replace the existing three-row assertion with:

```ts
assert.ok(overviewAnomalyGroups.every((item) => item.rows.length === 20));
const anomalyRows = overviewAnomalyGroups.flatMap((item) => item.rows);
assert.equal(anomalyRows.length, 80);
assert.equal(new Set(anomalyRows.map((row) => row.runRecordKey)).size, 80);
assert.ok(overviewAnomalyGroups.every((item) => new Set(item.rows.map((row) => row.storeName)).size === 20));
```

Add allowed issue types per group and assert every row type belongs to its group.

- [ ] **Step 3: 运行测试确认红灯**

```bash
npm run test:etl
```

Expected: FAIL because announcement exports are missing and anomaly groups still contain 3 rows.

- [ ] **Step 4: 实现公告 mock**

Create 10 explicit `{ title, publishedAt }` entries dated from `2026-08-25` backwards with unique QSB operational titles. Implement:

```ts
export function formatOverviewAnnouncementDate(publishedAt: string) {
  return publishedAt.slice(5).replace('-', '/');
}
```

- [ ] **Step 5: 实现异常 mock**

Define 20 unique store names and four category-specific template arrays. Generate each group with deterministic index cycling:

```ts
const buildAnomalyRows = (key: string, templates: readonly { issueType: string; reason: string }[]) => (
  anomalyStores.map((storeName, index) => ({
    storeName,
    issueType: templates[index % templates.length].issueType,
    reason: templates[index % templates.length].reason,
    runRecordKey: `overview-${key}-${index + 1}`,
  }))
);
```

- [ ] **Step 6: 运行测试确认绿灯**

```bash
npm run test:etl
```

Expected: all tests pass with 0 failures.

### Task 2: 组件渲染与工具位置

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`

**Interfaces:**
- Consumes: `overviewAnnouncements`, `formatOverviewAnnouncementDate`, `overviewAnomalyGroups`
- Produces: 10-row announcement rendering, robot-selected view switch, fullscreen control inside robot header

- [ ] **Step 1: 切换公告数据源**

Import `overviewAnnouncements` and `formatOverviewAnnouncementDate`, remove the local placeholder `announcements`, and render each entry with a unique title key and formatted date.

- [ ] **Step 2: 设置机器人默认选中**

Remove `styles.active` from the `IconApps` button and add it to the `IconRobot` button.

- [ ] **Step 3: 移动全屏按钮**

Remove the standalone fullscreen button before `.schedule`. Render the existing Tooltip and Button inside the sticky robot header cell:

```tsx
<span><span>机器人</span><Tooltip ...><Button ... /></Tooltip></span>
```

Keep `toggleFullscreen`, `scheduleViewportRef`, button labels and icons unchanged.

### Task 3: 板块对齐、滚动与标题样式

**Files:**
- Modify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: existing `.announcementCard`, `.anomalyCard`, `.scheduleToolbar`, `.scheduleAxis > span`
- Produces: internal scroll regions and approved alignment/typography

- [ ] **Step 1: 使公告列表内部滚动**

Make `.announcementCard` a flex column. Set `.announcementList` to `min-height: 0; flex: 1; overflow: auto; align-content: start;` and add the existing thin scrollbar treatment.

- [ ] **Step 2: 使异常区域顶部对齐并内部滚动**

Change `.anomalyCard` to `align-items: start`, remove the fixed summary height, stretch the divider, and make `.anomalyDetails` a flex column with `.anomalyRows { min-height: 0; flex: 1; overflow: auto; align-content: start; }`.

- [ ] **Step 3: 修正工具栏与全屏按钮位置**

Set `.scheduleAlert { justify-self: end; }`. Remove absolute positioning from `.scheduleFullscreenButton`, and style the sticky robot header as a flex row with an 8px gap.

- [ ] **Step 4: 修正资源中心标题**

Change `.resourceCard h2` to `font-size: 16px` at the base rule without breakpoint overrides.

### Task 4: 回归与真页验收

**Files:**
- Verify: `src/pages/qsbOverview/overviewContent.ts`
- Verify: `src/pages/qsbOverview/index.tsx`
- Verify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: Tasks 1-3 outputs
- Produces: test, build and 5178 browser evidence

- [ ] **Step 1: 运行完整现有测试**

```bash
npm run test:etl
```

Expected: all tests pass with 0 failures.

- [ ] **Step 2: 运行生产构建**

```bash
npm run build
```

Expected: TypeScript and Vite exit with code 0; existing bundle warnings may remain.

- [ ] **Step 3: 5178 真页验收**

Reload `?requirement=qsbOverview&tab=prototype` and verify:

- anomaly summary top matches the anomaly tabs top;
- each anomaly tab renders 20 rows and the list scrolls internally;
- announcements render 10 unique rows in descending date order and scroll internally;
- robot view button is active, alert is right aligned, fullscreen button is beside the robot header;
- resource heading computes to 16px;
- local schedule fullscreen still enters and exits; console errors remain empty.
