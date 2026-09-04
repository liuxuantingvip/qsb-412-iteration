# QSB Overview Calendar Boundary And Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复计划 Tooltip 截断、日历未来导航和运行趋势更新时间冗余。

**Architecture:** 在 `overviewContent.ts` 提供确定性业务今天与日期边界判断；`index.tsx` 统一计算下一周期是否可用并双重阻止越界；Less 让 Tooltip 内容自适应并完整换行。

**Tech Stack:** React、TypeScript、Arco Design、Less、Node test runner、Vite

**Spec:** `docs/superpowers/specs/2026-08-28-qsb-overview-calendar-boundary-tooltip-design.md`

## Global Constraints

- 原型业务今天固定为 `2026-08-28`。
- 当前日、周、月允许查看；未来周期禁止进入。
- Tooltip 内容必须完整展示且不超出视口。
- 当前共享 `main` 工作区不创建 Git 提交。

---

### Task 1: 日期边界与源码回归测试

**Files:**
- Modify: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: `overviewCalendarToday`、`canNavigateOverviewScheduleForward`
- Produces: 日周月边界、禁用按钮、Tooltip 自适应和删除更新时间的断言

- [x] 增加失败测试并运行 `npm run test:etl` 确认失败。

### Task 2: 实现边界与 Tooltip

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Produces: `overviewCalendarToday`、`canNavigateOverviewScheduleForward(period, anchorDate, year, monthIndex)`

- [x] 实现日周月下一周期边界函数。
- [x] 禁用并拦截越界导航，删除更新时间节点。
- [x] Tooltip 改为内容自适应宽度并取消列表裁剪。
- [x] 运行 `npm run test:etl` 确认通过。

### Task 3: 构建与真页验收

**Files:**
- Modify: `design-qa.md`

- [x] 运行 `npm run build && git diff --check`。
- [x] 内嵌浏览器验证 Tooltip、日周月边界和更新时间移除。
- [x] 更新 Design QA。
