# QSB Overview Schedule Defaults And Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 默认打开月度机器人排期，并补齐统一计划 Tooltip 的最新结果、错误码、店铺和入库表信息。

**Architecture:** 扩展现有 schedule block 事实模型，由 `overviewContent.ts` 生成确定性 mock；`index.tsx` 的共享 `ScheduleTaskTooltip` 负责日、周、月统一渲染；样式仅收敛时间日历卡片和 Tooltip 集合区域。

**Tech Stack:** React、TypeScript、Arco Design、Less、Node test runner、Vite

**Spec:** `docs/superpowers/specs/2026-08-28-qsb-overview-schedule-defaults-tooltip-design.md`

## Global Constraints

- 仅修改 412 原型，不修改生产子应用或生成物。
- 首次状态必须为“月 + 机器人视图”。
- 失败结果必须展示错误码，成功结果文案为“入库成功”。
- 店铺和入库表不得截断为固定数量。
- 当前共享工作区存在用户未提交改动，本次不创建 Git 提交。

---

### Task 1: 固化默认状态和排期事实测试

**Files:**
- Modify: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: `overviewRobotSchedules`、`overviewWeeklyRobotSchedules`、`buildOverviewMonthlySchedule`
- Produces: 最新结果、错误码、入库表和默认 UI 状态的回归断言

- [x] **Step 1: 增加失败断言**

断言 schedule block 存在 `latestWorkResult`、失败错误码、非空 `stores` 和非空 `tables`；源码默认 period 为 `monthly`，机器人切换按钮在数据视图按钮之前。

- [x] **Step 2: 运行测试确认失败**

Run: `npm run test:etl`

Expected: 新增断言因缺少字段或默认周期不符而失败。

### Task 2: 扩展共享排期事实与 Tooltip

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: 现有 `ScheduleTaskBlock` 和 `ScheduleTaskTooltip`
- Produces: `latestWorkErrorCode?: string`、`tables?: string[]` 及统一 Tooltip 字段顺序

- [x] **Step 1: 扩展 block 数据类型和 mock 事实**

失败项生成稳定错误码；所有任务生成一组或多组入库表，店铺和入库表数量可大于 4。

- [x] **Step 2: 修改默认状态与按钮顺序**

将 period 默认值改为 `monthly`，机器人按钮放在数据视图按钮之前并保持默认 pressed。

- [x] **Step 3: 修改 Tooltip 与样式**

按“计划名称、运行次数、最新结果、涉及店铺、涉及入库表”渲染；时间日历卡片四向 `4px`，集合项支持换行和滚动。

- [x] **Step 4: 运行自动化测试**

Run: `npm run test:etl`

Expected: 全部测试通过。

### Task 3: 构建与真页验收

**Files:**
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype`
- Produces: 默认状态、周卡片间距、成功/失败 Tooltip 和多集合展示的验收记录

- [x] **Step 1: 执行构建和差异检查**

Run: `npm run build && git diff --check`

Expected: 命令退出码为 0。

- [x] **Step 2: 使用内嵌浏览器验收**

检查默认“月 + 机器人视图”、按钮顺序、周卡片计算样式、失败错误码，以及多店铺、多入库表完整展示。

- [x] **Step 3: 更新 Design QA**

记录测试、构建、控制台和交互检查结果。
