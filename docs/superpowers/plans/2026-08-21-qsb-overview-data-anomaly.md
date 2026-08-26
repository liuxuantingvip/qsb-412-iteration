# 概览中心数据异常板块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用一张可操作的数据异常卡替换第四行错误的交付构成与影响计划，并删除未定义的 SLA 和影响数据量。

**Architecture:** 在 `overviewContent.ts` 中维护可测试的异常率口径、四类异常和明细数据；`QsbOverview` 只负责 Tab、重试和查看交互；运行记录通过既有回调接收异常类型、店铺、周期和目标记录键，打开对应详情。

**Tech Stack:** React 18、TypeScript、Arco Design、CSS Modules、Node test、Vite

**Spec:** `docs/superpowers/specs/2026-08-21-qsb-overview-data-anomaly-design.md`

## Global Constraints

- 数据异常率必须由异常数据表数除以当前周期数据表总数计算。
- 统计周期固定使用 `2025-08-01` 至 `2026-07-31`。
- 对比文案使用“较上期”，不使用“比昨日同时段”。
- 不展示 SLA、影响数据条数、未成功交付构成、影响最大的计划。
- 登录或取数失败时不得假设已产生文件。

---

### Task 1: 异常数据模型与口径测试

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Modify: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Produces: `overviewAnomalySummary`、`overviewAnomalyGroups`、`getOverviewAnomalyRate()`、`buildOverviewRunFilters(group, row)`。

- [ ] **Step 1: 写失败测试**

测试断言异常率等于 `1400 / 12140`，四个 Tab 文案依次为登录异常、取数执行异常、入库异常、入库校验异常，每条明细只包含店铺、异常类型、异常原因和运行记录键，不包含影响数据量或 SLA。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test:etl`

Expected: FAIL，提示新导出不存在。

- [ ] **Step 3: 实现最小数据模型**

删除 `deliveryFailureBreakdown`，增加异常摘要和四组异常明细；异常率通过函数实时计算。`OverviewRunFilters.issueType` 改为 `login | collection | ingestion | validation`，并允许携带 `targetRecordKey`。

- [ ] **Step 4: 运行测试并确认通过**

Run: `npm run test:etl`

Expected: PASS。

### Task 2: 单卡异常板块与交互

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: `overviewAnomalySummary`、`overviewAnomalyGroups`、`getOverviewAnomalyRate()`、`buildOverviewRunFilters()`。

- [ ] **Step 1: 删除错误内容**

从“计划与入库”删除 SLA 文案；删除底部两个卡片及影响数据量、恢复状态相关样式。

- [ ] **Step 2: 实现横向异常卡**

左侧显示数据异常率、`1,400 / 12,140` 和较上期变化；右侧使用四个 Tab 和三行明细，列为店铺、异常类型、异常原因、重试、查看。

- [ ] **Step 3: 实现操作**

“重试”仅显示提交成功反馈；“查看”调用 `onViewRuns(buildOverviewRunFilters(group, row))`。

- [ ] **Step 4: 构建验证**

Run: `npm run build`

Expected: TypeScript 与 Vite 构建通过。

### Task 3: 运行记录精确下钻与文档同步

**Files:**
- Modify: `src/pages/autoRetryOptimization/interface.ts`
- Modify: `src/pages/autoRetryOptimization/services.ts`
- Modify: `src/pages/autoRetryOptimization/index.tsx`
- Modify: `src/pages/qsbOverviewPrd/index.tsx`
- Modify: `docs/superpowers/specs/2026-08-21-qsb-overview-delivery-drilldown-design.md`

**Interfaces:**
- Consumes: `OverviewRunFilters.targetRecordKey` 和四类 `issueType`。
- Produces: 运行记录列表按周期、异常环节、店铺过滤，并在存在目标键时自动打开对应详情。

- [ ] **Step 1: 补充运行记录异常字段与样例**

在 `RunRecord` 增加可选 `issueStage`、`issueReason`；样例记录的键与概览异常明细一致。

- [ ] **Step 2: 应用筛选并打开详情**

优先使用 `issueStage` 判断异常环节；记录加载后按 `targetRecordKey` 打开详情抽屉；重置清空概览下钻条件。

- [ ] **Step 3: 同步 PRD**

增加 V1.9，使用数据异常率和四类异常明细替换旧交付问题下钻描述。

- [ ] **Step 4: 完整验证**

Run: `npm run test:etl && npm run build`

Expected: 全部测试与构建通过；5178 真页四个 Tab 可切换，重试有反馈，查看进入对应详情，页面不再出现已删除文案。
