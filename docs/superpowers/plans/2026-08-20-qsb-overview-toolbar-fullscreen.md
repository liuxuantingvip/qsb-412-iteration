# 概览中心标题栏与全屏入口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除概览中心的日期选择器，保留现有固定周期数据口径，并将全屏入口从页面右下角迁移到标题栏右侧。

**Architecture:** 不调整指标计算、趋势数据或热力图口径。布局契约先声明“无周期选择器、全屏位于全局标题栏”，React 页面随后删除日期交互状态与悬浮按钮，仅复用现有全屏切换逻辑渲染标题栏按钮。

**Tech Stack:** React 18、TypeScript、CSS Modules/Less、Arco Design、Node test、Vite

**Spec:** `docs/superpowers/specs/2026-08-20-qsb-overview-reference-style-design.md`

## Global Constraints

- 标题栏左侧仅展示“概览中心”，右侧仅展示全屏按钮。
- 页面继续使用 `2025-08-01` 至 `2026-07-31` 的默认固定周期数据，不改成全生命周期累计。
- 删除日期选择、清空日期和日期切换加载逻辑，不保留不可触达的交互代码。
- 全屏按钮不得使用 `position: fixed`，页面右下角不得再出现悬浮全屏入口。
- 不改动资产、服务入口、趋势图、热力图和交付模块的业务内容。

---

### Task 1: 固化标题栏契约

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Test: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: `getOverviewLayout()`
- Produces: `periodToolbar.showPeriodPicker = false`、`fullscreen.placement = 'global-toolbar'`

- [ ] **Step 1: 先修改测试，断言日期选择器隐藏且全屏位于标题栏**

```ts
assert.equal(layout.periodToolbar.placement, 'global-row');
assert.equal(layout.periodToolbar.showPeriodPicker, false);
assert.equal(layout.fullscreen.placement, 'global-toolbar');
```

- [ ] **Step 2: 运行聚焦测试确认失败**

Run: `node --import tsx --test tests/qsbOverviewContent.test.ts`

Expected: FAIL，旧契约缺少 `showPeriodPicker`，且全屏位置仍为 `floating`。

- [ ] **Step 3: 最小修改布局契约**

```ts
periodToolbar: {
  placement: 'global-row',
  showPeriodPicker: false,
},
fullscreen: {
  placement: 'global-toolbar',
},
```

- [ ] **Step 4: 运行聚焦测试确认通过**

Run: `node --import tsx --test tests/qsbOverviewContent.test.ts`

Expected: PASS。

### Task 2: 删除日期交互并迁移全屏按钮

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: `defaultPeriod`、`toggleFullscreen()`、`isFullscreen`
- Produces: 标题栏内 `.toolbarFullscreen` 按钮

- [ ] **Step 1: 删除日期选择器依赖和交互状态**

删除 `DatePicker`、`RangePicker`、`useRef`、`loadingTimerRef`、`updatePeriod` 以及加载计时器清理逻辑。保留固定默认周期：

```ts
const [periodRange] = useState<PeriodRange>(defaultPeriod);
const [periodStatus] = useState<PeriodStatus>('ready');
```

确保指标、趋势与热力图仍从 `periodRange` 读取当前默认周期。

- [ ] **Step 2: 将全屏按钮放入标题栏右侧**

```tsx
<div className={styles.periodToolbar}>
  <h1>{overviewCopy.pageTitle}</h1>
  <Tooltip content={isFullscreen ? '退出全屏' : '全屏查看'}>
    <Button
      className={styles.toolbarFullscreen}
      shape="circle"
      aria-label={isFullscreen ? '退出全屏' : '全屏查看'}
      icon={isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
      onClick={toggleFullscreen}
    />
  </Tooltip>
</div>
```

- [ ] **Step 3: 删除旧悬浮全屏按钮**

删除页面根节点底部的 `.floatingFullscreen` 按钮块，确保只保留一个全屏入口。

- [ ] **Step 4: 收口标题栏样式**

删除 `.rangePicker`、`.periodToolbar .arco-picker`、`.floatingFullscreen` 及对应响应式规则；新增非 fixed 的 `.toolbarFullscreen`，按钮尺寸沿用 Arco 小型圆形操作按钮。

- [ ] **Step 5: 检查本轮产生的无用符号**

Run: `grep -RInE "DatePicker|RangePicker|loadingTimerRef|updatePeriod|floatingFullscreen|rangePicker" src/pages/qsbOverview`

Expected: 无匹配。

### Task 3: 完整验证与真页复查

**Files:**
- Modify: `audit/qsb-overview-design-qa.md`

**Interfaces:**
- Consumes: 已实现的标题栏与全屏交互
- Produces: 自动化和内嵌浏览器验收记录

- [ ] **Step 1: 运行完整测试和构建**

Run: `npm run test:etl && npm run build`

Expected: 现有测试全部通过，TypeScript 与 Vite 构建成功。

- [ ] **Step 2: 使用内嵌浏览器检查标题栏**

打开 `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype`，验证：

- 标题栏左侧为“概览中心”，右侧只有全屏按钮。
- DOM 中不存在 `.arco-picker`。
- 全屏按钮计算样式不是 `position: fixed`。
- 页面右下角不再出现悬浮全屏按钮。
- 全屏按钮可进入和退出全屏，Tooltip 与图标状态同步。
- 页面无横向溢出，控制台无新增错误。

- [ ] **Step 3: 更新设计 QA**

记录固定周期口径未变、日期选择器已删除、全屏入口已迁移以及自动化和浏览器验证结果。
