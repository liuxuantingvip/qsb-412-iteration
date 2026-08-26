# QSB Overview Completion Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除独立数据概况，将完成率并入异常明细卡，并增高运行趋势排期区域。

**Architecture:** 保持现有单页组件和 mock 数据结构，仅重排 `QsbOverview` 的主内容卡片。完成率进度图继续复用现有 Semi DV 主题组件，异常 Tab 和明细交互保持原实现。

**Tech Stack:** React、TypeScript、Less、Arco Design、VChart、Node test runner

**Spec:** `docs/superpowers/specs/2026-08-26-qsb-overview-completion-consolidation-design.md`

## Global Constraints

- 不新增业务指标或解释文案。
- 删除“数据概况”“今日涉及店铺”“平台交付分布”。
- 主内容区仅保留“运行趋势”和“数据完成率”。
- 运行趋势卡片高度为 720px。
- 只修改 412 原型与对应测试。

---

### Task 1: 固化两段式页面结构

**Files:**
- Modify: `tests/qsbOverviewContent.test.ts`
- Modify: `src/pages/qsbOverview/overviewContent.ts`

**Interfaces:**
- Consumes: `getOverviewLayout()`、`overviewCopy`
- Produces: `mainSections: ['runTrend', 'dataCompletion']`，`overviewCopy.completionTitle: '数据完成率'`

- [ ] **Step 1: 写失败测试**

断言主区只保留 `runTrend` 与 `dataCompletion`，并断言页面文案中不再包含 `dataOverviewTitle`。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test --experimental-strip-types tests/qsbOverviewContent.test.ts`

Expected: FAIL，现有结构仍返回三张主卡片。

- [ ] **Step 3: 最小修改布局描述**

将 `mainSections` 改成两段式结构，并把主卡标题收敛为“数据完成率”。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test --experimental-strip-types tests/qsbOverviewContent.test.ts`

Expected: PASS。

### Task 2: 合并完成率与异常明细

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`
- Test: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: `dataSnapshot.completionRate`、`overviewAnomalySummary`、`overviewAnomalyGroups`
- Produces: 单张 `completionCard`，左侧为完成率和异常率，右侧为异常 Tab 与明细

- [ ] **Step 1: 写失败测试**

源码断言中要求不存在 `dataOverviewCard`、`deliveryBlock`、`platformBlock`，并要求存在 `completionCard` 与 `completionSummary`。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test --experimental-strip-types tests/qsbOverviewContent.test.ts`

Expected: FAIL，现有独立数据概况仍存在。

- [ ] **Step 3: 实现最小合并结构**

删除独立数据概况 JSX 和其专属计算、Tooltip、分布图代码；在完成率卡左侧并列完成率与异常率，保留右侧异常明细。

- [ ] **Step 4: 收敛样式**

将主列改成 `720px minmax(250px, 1fr)`；完成率卡使用指标区、分隔线、明细区三列布局，继续支持异常明细滚动。

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test --experimental-strip-types tests/qsbOverviewContent.test.ts`

Expected: PASS。

### Task 3: 构建与真页验收

**Files:**
- Verify: `src/pages/qsbOverview/index.tsx`
- Verify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: 当前 5178 原型服务
- Produces: 可构建、可交互的两段式概览页

- [ ] **Step 1: 运行完整测试和构建**

Run: `npm run test:etl && npm run build`

Expected: 两条命令均退出码 0。

- [ ] **Step 2: 检查变更质量**

Run: `git diff --check`

Expected: 无空白错误。

- [ ] **Step 3: 在 Codex 内嵌浏览器验收**

打开 `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype`，确认两张主卡片、720px 排期区、完成率与异常明细并存，且异常 Tab、横纵滚动正常。

