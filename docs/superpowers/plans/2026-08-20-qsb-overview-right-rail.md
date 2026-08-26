# 概况右侧资产与服务栏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将概况页资产区移到右侧窄栏，上方 60% 展示资产，下方 40% 展示帮助中心和需求反馈。

**Architecture:** 保留现有价值、运行、交付组件和数据口径，仅重排 CSS Grid。新增右侧 `sideRail` 容器承载资产与服务区；桌面端主内容约 80%、右栏约 20%，1080px 以下回退为单列。

**Tech Stack:** React 18、TypeScript、CSS Modules/Less、Arco Design、Node test、Vite

**Spec:** `docs/superpowers/specs/2026-08-20-qsb-overview-reference-style-design.md`

## Global Constraints

- 页面内容底保持白色，不使用深色或大面积灰底。
- 模块使用 16px 圆角和轻阴影，不增加描边框。
- 右侧栏宽度约占内容区 20%。
- 右侧栏上方 60% 展示资产，下方 40% 展示帮助中心和需求反馈。
- 不新增业务指标或解释文案。

---

### Task 1: 固化右侧栏布局模型

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Test: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: `getOverviewLayout()`
- Produces: `assetPanel.placement = 'right-rail'`、`assetPanel.widthRatio = 0.2`、`assetPanel.heightRatio = 0.6`、`servicePanel.heightRatio = 0.4`

- [ ] **Step 1: 修改布局测试，断言右栏与 60:40 比例**

```ts
assert.equal(layout.assetPanel.placement, 'right-rail');
assert.equal(layout.assetPanel.widthRatio, 0.2);
assert.equal(layout.assetPanel.heightRatio, 0.6);
assert.equal(layout.servicePanel.heightRatio, 0.4);
assert.deepEqual(layout.servicePanel.items, ['helpCenter', 'feedback']);
```

- [ ] **Step 2: 运行测试确认旧模型失败**

Run: `npm run test:etl`
Expected: FAIL，旧值仍为 `left-rail` 且缺少比例字段。

- [ ] **Step 3: 最小修改布局模型**

```ts
assetPanel: { placement: 'right-rail', widthRatio: 0.2, heightRatio: 0.6, ... },
servicePanel: { heightRatio: 0.4, items: ['helpCenter', 'feedback'] as const },
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm run test:etl`
Expected: 16 tests passed。

### Task 2: 实现右侧资产与服务栏

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: `assetEntitlements`、`HELP_CENTER_URL`、`setFeedbackVisible`
- Produces: `.mainColumn`、`.sideRail`、`.serviceSection`

- [ ] **Step 1: 将价值、运行内容包进主列**

```tsx
<div className={styles.mainColumn}>
  <section className={styles.performanceSection}>...</section>
  <div className={styles.insightGrid}>...</div>
</div>
```

- [ ] **Step 2: 将资产与服务入口包进右栏**

```tsx
<aside className={styles.sideRail}>
  <section className={styles.assetSection}>...</section>
  <section className={styles.serviceSection}>
    <Button href={HELP_CENTER_URL}>帮助中心</Button>
    <Button onClick={() => setFeedbackVisible(true)}>需求反馈</Button>
  </section>
</aside>
```

- [ ] **Step 3: 实现桌面端 80:20 与右栏 60:40**

```less
.overviewGrid { grid-template-columns: minmax(0, 4fr) minmax(220px, 1fr); }
.sideRail { display: grid; grid-template-rows: 3fr 2fr; gap: 12px; }
.assetSection, .serviceSection { min-height: 0; }
```

- [ ] **Step 4: 压缩资产项并移除旧悬浮帮助按钮**

资产项保留图标、总量、已用、可用和进度条；服务区使用两个整宽按钮，全屏入口保留为小型独立按钮。

- [ ] **Step 5: 实现响应式回退**

```less
@media (max-width: 1080px) {
  .overviewGrid { grid-template-columns: minmax(0, 1fr); }
  .sideRail { grid-template-rows: auto auto; }
  .assetGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

### Task 3: 同步文档并验证真页

**Files:**
- Modify: `src/pages/qsbOverviewPrd/index.tsx`
- Modify: `audit/qsb-overview-design-qa.md`

**Interfaces:**
- Consumes: 已实现的桌面端与响应式布局
- Produces: 与真页一致的 PRD 和 QA 记录

- [ ] **Step 1: 更新 PRD 中资产位置和服务入口规则**

将“左侧资产栏跨两行”改为“右侧窄栏，上方资产 60%、下方服务入口 40%”。

- [ ] **Step 2: 运行完整验证**

Run: `npm run test:etl && npm run build`
Expected: 16 tests passed，TypeScript 与 Vite 构建成功。

- [ ] **Step 3: 在内嵌浏览器检查布局**

验证：右栏在主内容右侧、宽度约 20%、资产和服务区高度比约 60:40、无横向溢出、反馈弹窗可打开、帮助中心链接保持 `_blank` 与 `noopener noreferrer`。

