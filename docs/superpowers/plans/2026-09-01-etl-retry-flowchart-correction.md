# ETL 重试流程图修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 PRD 重试流程图改为业务因果正确、分支完整且符合已确认 A1 状态口径的产品流程。

**Architecture:** 只修改 PRD Mermaid 流程和对应静态测试。流程按“识别可重试操作—确认—提交—状态同步与任务执行—环节结果”组织，展示同步与任务执行不互相作为触发条件。

**Tech Stack:** React、TypeScript、Mermaid、Node test、Vite

**Spec:** `docs/superpowers/specs/2026-09-01-etl-retry-parent-child-consistency-design.md`

## Global Constraints

- 重试采集受理后为“等待／无任务／无任务”。
- 重试入库受理后为“成功／等待／无任务”。
- 提交失败或取消时，本次操作不更新父子状态。
- 历史结果和主动刷新仅作为补充规则，不作为主流程步骤。
- 不提交 Git。

---

### Task 1: 锁定正确流程结构

**Files:**
- Test: `tests/annotationLocateTargets.test.ts`

- [ ] **Step 1: 更新流程图断言**

  要求覆盖系统识别可重试操作、确认与取消、提交结果、A1 状态、任务执行和父表聚合；禁止历史结果出现在主链路，并禁止展示同步触发任务执行。

- [ ] **Step 2: 运行测试并确认失败**

  Run: `node --test --experimental-strip-types tests/annotationLocateTargets.test.ts`

### Task 2: 重画 PRD 重试流程

**Files:**
- Modify: `src/pages/etlDataMonitoringOptimizationPrd/index.tsx`

- [ ] **Step 1: 改写 Mermaid 主流程**

  系统先识别唯一可重试操作；用户确认后提交。提交成功同时进入 A1 页面状态和后台任务执行，后续每个环节变化更新同一明细并触发父表重新聚合。

- [ ] **Step 2: 将历史与刷新移出主链路**

  历史记录和主动刷新仅保留在流程图下方补充规则中。

- [ ] **Step 3: 运行测试并确认通过**

  Run: `node --test --experimental-strip-types tests/annotationLocateTargets.test.ts`

### Task 3: 验证交付

**Files:**
- Verify: `src/pages/etlDataMonitoringOptimizationPrd/index.tsx`
- Verify: `tests/annotationLocateTargets.test.ts`

- [ ] **Step 1: 构建**

  Run: `npm run build`

- [ ] **Step 2: 浏览器验收**

  在 `http://127.0.0.1:5178/?requirement=etlDataMonitoringOptimization&tab=prd` 检查流程图渲染、完整分支、旧文案残留和控制台错误。

- [ ] **Step 3: 检查变更范围**

  Run: `git diff --check -- src/pages/etlDataMonitoringOptimizationPrd/index.tsx tests/annotationLocateTargets.test.ts`
