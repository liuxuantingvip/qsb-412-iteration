# 数据监控下钻评审修订 Implementation Plan

> 按用户已确认方案在当前 412 原型顺序执行，不提交无关变更。

**Goal:** 三段筛选使用独立枚举，列设置支持拖拽，原型和标注完整说明本期差异。

**Architecture:** 原始状态不变，在详情展示层映射；共享筛选、标题和列设置供页面与 After 预览复用。Arco Popover + 扁平 Tree 管理当前详情的显示列与顺序。

**Tech Stack:** React、TypeScript、Arco、Node test。

**Spec:** 用户本轮及前轮已确认的 11 条浏览器评审意见。

## 约束

- 只改 412 原型，不调用线上写接口，不改状态聚合及接口字段。
- 必显列不可隐藏但可排序；操作列锁定末尾。修改立即生效，恢复默认同时恢复顺序和可见性；状态仅在当前下钻期间保留。
- Before 使用已有线上实拍；After 使用共享组件，不能以新截图冒充线上历史。
- 执行结果仅前端隐藏；连接器名称→数据源、平台名称→子平台、店铺名称→店铺、关联任务名→关联计划。

## 执行步骤

- [x] `detailPresentation.ts` 定义状态映射和排序纯函数；`tests/etlDetailPresentation.test.ts` 覆盖独立枚举、原值映射、操作末尾与非法移动。
- [x] `DetailColumnSettings.tsx` 接入 Arco Tree 勾选与 onDrop，使用 `moveDetailColumn(order, dragged, target, after)` 更新顺序。
- [x] `DetailToolbar.tsx` 复用两组组合筛选与标题；详情筛选按映射后的状态匹配，表格按列顺序映射；操作列及按钮左对齐。
- [x] `data.ts` / `ComparisonPreview.tsx` 增加页签、标题、筛选、列设置、字段命名标注；PRD 同步，移除本期不改列设置的旧排除项。
- [x] 27 项相关测试、14 个标注 ID、`npm run build`、`git diff --check` 通过。浏览器安全限制仍生效，未做交互复验；未通过其他工具绕过。
