# ETL Annotation Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 ETL 数据监控的交互标注以当前前端界面为主、隐藏业务规则为辅，并与 PRD 和可运行原型一致。

**Architecture:** 保持现有 annotation data、ComparisonPreview 和 requirementAnnotations 渲染链路不变；只收敛标注内容、补充专用预览并把明细字段标记移动到整表对象。公共状态逻辑不再在店铺和数据表标注中逐字重复。

**Tech Stack:** React 18、TypeScript、Arco Design、Node test、Vite

**Spec:** 2026-09-01 用户确认的交互标注 Review 修复清单

## Global Constraints

- UI 能直接表达的内容使用实际前端组件渲染。
- 标注只保留界面无法表达的业务规则、边界和验收条件。
- 不改生产接口、不增加需求范围、不覆盖工作区已有改动。

---

### Task 1: Annotation quality regression tests

**Files:**
- Modify: `tests/annotationLocateTargets.test.ts`

- [ ] 添加卡片、店铺筛选、数据表筛选、分维度状态预览和整表定位的断言。
- [ ] 运行目标测试，确认因当前实现缺失而失败。

### Task 2: Annotation copy and marker scope

**Files:**
- Modify: `src/components/etlDataMonitoringAnnotations/data.ts`
- Modify: `src/pages/etlDataMonitoringOptimization/index.tsx`

- [ ] 去除刷新位置、字段改名和状态规则的重复描述。
- [ ] 店铺与数据表状态标注分别使用对应预览。
- [ ] 将 4.2、4.3 从三列表头标记调整为完整明细表标记。

### Task 3: Rendered previews

**Files:**
- Modify: `src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx`
- Modify: `src/components/etlDataMonitoringAnnotations/comparison.module.less`

- [ ] 渲染卡片配色 Before/After。
- [ ] 渲染店铺和数据表筛选、计划搜索、刷新与无结果空态。
- [ ] 将列设置示例收敛为独立浮层和精简表头。
- [ ] 删除评审过程文案，并用汇总状态展示计划超时失败。

### Task 4: Verification and review

**Files:**
- Verify: `src/pages/etlDataMonitoringOptimizationPrd/index.tsx`

- [ ] 运行 annotation validator、相关测试和构建。
- [ ] 启动 5178 并在内嵌浏览器检查 16 条标注、代表性 Popover、筛选、空态和明细定位。
- [ ] 重新按覆盖、前端渲染、赘述和过度描述四项 Review。
