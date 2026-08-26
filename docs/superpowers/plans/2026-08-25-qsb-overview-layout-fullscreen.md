# QSB Overview Layout and Schedule Fullscreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 动态填满概览页可视区，将全屏范围限定到机器人排期表，并修正表头和任务标题的垂直对齐。

**Architecture:** 使用门户 `.portal-content` 已有的 `height: 100%` 作为高度基线，在 `qsbOverview` 内用 CSS Grid 将剩余高度分配给公告和数据异常率。React 仅使用 `ref` 对机器人排期容器调用 Fullscreen API，不引入高度测量或新依赖。

**Tech Stack:** React 18, TypeScript, Less, Arco Design, Browser Fullscreen API, Vite

**Spec:** `docs/superpowers/specs/2026-08-25-qsb-overview-layout-fullscreen-design.md`

## Global Constraints

- 左栏仅公告板块吸收剩余高度，右栏仅数据异常率板块吸收剩余高度。
- 全屏不包含标题、周期、指标、视图切换或超限提示。
- 固定列宽度保持 120px，时间轴密度保持每小时 80px。
- 表头高度统一为 40px，任务标题图标与文字垂直居中。
- 不修改业务 mock、指标口径、路由、PRD 或其他需求页。

---

### Task 1: 可视区高度分配

**Files:**
- Modify: `src/pages/qsbOverview/index.module.less:3-45`

**Interfaces:**
- Consumes: `.portal-content.portal-content-qsb-overview { height: 100%; padding: 0; }`
- Produces: `.page` / `.dashboard` / `.leftRail` / `.mainColumn` 的高度链与剩余行分配

- [ ] **Step 1: 记录布局基线**

```bash
sed -n '1,48p' src/pages/qsbOverview/index.module.less
sed -n '752,776p' src/styles/global.less
```

Expected: 门户内容高度为 `100%`，概览页内部列容器仅有 `align-content: start`，公告和异常板块使用固定高度。

- [ ] **Step 2: 实现 CSS Grid 剩余高度分配**

```less
.page { height: 100%; min-height: 100%; color: #1d2129; background: #fff; }
.dashboard { min-height: 100%; }
.leftRail { grid-template-rows: 242px 244px minmax(213px, 1fr) 213px; }
.mainColumn { grid-template-rows: 530px 212px minmax(178px, 1fr); }
.announcementCard, .resourceCard { min-height: 213px; padding: 24px; }
.anomalyCard { min-height: 178px; }
```

Remove only the fixed `height` declarations from `.announcementCard` and `.anomalyCard`; retain the current minimums and all other card dimensions.

- [ ] **Step 3: 检查普通视口布局**

Open `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype` and verify:

- `.dashboard` bottom aligns with the visible portal content bottom.
- Announcement height is greater than or equal to 213px.
- Anomaly card height is greater than or equal to 178px.
- No card overlap or new page-level horizontal overflow appears.

### Task 2: 机器人排期局部全屏

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx:1,97-245`
- Modify: `src/pages/qsbOverview/index.module.less:4,57-88`

**Interfaces:**
- Consumes: Browser `document.fullscreenElement`, `HTMLElement.requestFullscreen()`, `document.exitFullscreen()`
- Produces: `scheduleViewportRef: RefObject<HTMLDivElement>` and `.scheduleViewport:fullscreen`

- [ ] **Step 1: 记录当前全屏基线**

```bash
grep -nE 'fullscreen|toggleFullscreen|scheduleToolbar|className=\{styles.schedule\}' src/pages/qsbOverview/index.tsx src/pages/qsbOverview/index.module.less
```

Expected: 根 `.page` 根据 `isFullscreen` 获得 `.fullscreenPage`，`requestFullscreen()` 目标为 `document.documentElement`。

- [ ] **Step 2: 将全屏状态绑定到排期容器**

Add `useRef` to the React import and create:

```tsx
const scheduleViewportRef = useRef<HTMLDivElement>(null);
```

Change the fullscreen listener and action to:

```tsx
const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === scheduleViewportRef.current);

const toggleFullscreen = async () => {
  try {
    if (document.fullscreenElement === scheduleViewportRef.current) await document.exitFullscreen();
    else await scheduleViewportRef.current?.requestFullscreen();
  } catch {
    Message.warning('当前浏览器未允许进入全屏');
  }
};
```

Remove `.fullscreenPage` from the page root. Move the fullscreen button out of `.scheduleToolbar` and into a new `ref={scheduleViewportRef}` `.scheduleViewport` wrapper around only the schedule table.

- [ ] **Step 3: 样式化局部全屏容器**

```less
.scheduleToolbar { grid-template-columns: auto minmax(0, 1fr); }
.scheduleViewport { position: relative; min-width: 0; min-height: 0; flex: 1; }
.scheduleFullscreenButton { position: absolute; top: 4px; right: 4px; z-index: 6; }
.scheduleViewport:fullscreen { width: 100vw; height: 100vh; padding: 16px; background: #fff; }
.scheduleViewport:fullscreen .schedule { height: 100%; }
```

Keep the button visible above the sticky header in normal and fullscreen states.

- [ ] **Step 4: 验证全屏范围和恢复**

In the 5178 page, click the schedule fullscreen button and verify:

- `document.fullscreenElement` is `.scheduleViewport`.
- Only the robot schedule and its exit button are visible.
- The schedule can scroll horizontally and vertically.
- Exiting via the button restores the same period selection and page layout.

### Task 3: 表头与任务标题垂直对齐

**Files:**
- Modify: `src/pages/qsbOverview/index.module.less:72-88`

**Interfaces:**
- Consumes: `.scheduleAxis`, `.scheduleAxis > span`, `.scheduleAxis time`, `.taskBlock strong`, `.taskBlock strong::before`
- Produces: 40px unified schedule header and flex-aligned task label row

- [ ] **Step 1: 实现表头统一高度**

```less
.scheduleAxis { height: 40px; align-items: center; }
.scheduleAxis > span { align-self: stretch; display: flex; align-items: center; }
.scheduleAxis time { align-self: stretch; display: flex; align-items: center; justify-content: center; }
```

- [ ] **Step 2: 修正任务图标与文字对齐**

```less
.taskBlock strong { display: flex; align-items: center; }
.taskBlock strong::before { flex: none; }
```

Remove `vertical-align: -4px` from `.taskBlock strong::before`; preserve truncation and the two-line task layout.

- [ ] **Step 3: 验证表头与任务对齐**

In the 5178 page, verify computed styles and visible alignment:

- The robot header cell and each time cell are 40px high.
- Header text is vertically centered.
- The `日/月/周` badge and task title share one vertical centerline.
- Task title and time retain ellipsis behavior without clipping.

### Task 4: 回归验证

**Files:**
- Test: `tests/qsbOverviewContent.test.ts`
- Verify: `src/pages/qsbOverview/index.tsx`
- Verify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: all outputs from Tasks 1-3
- Produces: build, test, source-format and real-page evidence

- [ ] **Step 1: 运行项目现有测试**

```bash
npm run test:etl
```

Expected: all existing Node tests pass with 0 failures.

- [ ] **Step 2: 运行生产构建**

```bash
npm run build
```

Expected: TypeScript and Vite build exit with code 0; existing bundle warnings may remain but no new errors are introduced.

- [ ] **Step 3: 检查源码格式与变更范围**

```bash
grep -nE 'scheduleViewport|requestFullscreen|grid-template-rows|scheduleAxis|taskBlock strong' src/pages/qsbOverview/index.tsx src/pages/qsbOverview/index.module.less
```

Expected: changes are limited to the approved overview layout, fullscreen target and alignment rules. Because the 412 source tree is pre-existing and untracked in the parent repository, do not stage or commit implementation files.

- [ ] **Step 4: 5178 终验**

Reload the page and verify all four browser comments at the active viewport, then inspect console errors. Keep the verified tab open for the user.
