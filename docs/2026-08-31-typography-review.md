# 412 原型字号 Review

日期：2026-08-31。范围：412 工程 `src` 下的 109 个 TS、TSX、CSS、Less 文件，包括业务页面、共享样式、交互标注和 PRD；不包括生产仓库、相邻迭代、依赖包内部实现或构建产物。

## 结论

仍有同类问题：1 处 11px 文字、2 处 10px 徽标文字，以及排期预览通过整体缩放把正常字号缩小的问题。另有不在当前 Arco 全局字号阶梯中的 15px 等尺寸。此次只 review 字号，未批量修改这些样式。

源码中共有 108 行直接设置像素字号，分布于 15 个文件。这是检索规模，不是 108 个缺陷：其中包含合规字号、图标和有意设计的大数字。

## P2：优先处理

### 1. 排期预览整体缩放，12px 文字实际约为 3.53px

- 位置：`src/components/qsbOverviewAnnotations/RobotScheduleExample.tsx:17`、`:45`。
- 原因：1180px 画布按容器宽度计算缩放比例，再对整个组件应用 `transform: scale(...)`，文字也一起缩小。
- 内嵌浏览器复核：1959px 视口、标注抽屉打开时，画布实际宽 347px，transform 为 `matrix(0.294068, 0, 0, 0.294068, 0, 0)`。12px 文字视觉约为 3.53px；只检查 computed font-size 会漏掉这个问题。
- 影响：虽然提供了“放大查看”，侧栏中的默认排期样式仍难以直接阅读，与“不缩小字号”的交互标注不一致。
- 建议：保持 1:1 字号，通过滚动或裁切展示局部，保留放大入口；不要随侧栏宽度缩小整个组件。

### 2. 共享通知徽标和消息分类徽标仍为 10px

- 位置：`src/styles/global.less:458`、`src/components/messageCenter/index.module.less:123`。
- 两处都直接覆盖 `.arco-badge-number` 的文字为 10px，同时把徽标高度压到 14px；不是图标尺寸。
- 内嵌浏览器复核：概览顶栏通知数字“4”的实际字号为 10px。消息分类徽标为源码确认，未逐状态浏览器复核。
- 建议：恢复组件默认尺寸，或同时用正文/辅助文字 token 和匹配的徽标高度；不能只增大字而保留过小容器。

### 3. 数据监控标注图注仍为 11px

- 位置：`src/components/etlDataMonitoringAnnotations/comparison.module.less:23`。
- `.evidence figcaption` 直接设置 11px，作用于 `ComparisonPreview.tsx` 的对比证据说明，是正文而非图标。
- 建议：使用 `@font-size-caption`（12px）。此次为源码确认，未逐条打开数据监控标注复核。

## P3：字号体系一致性与维护风险

### 4. 日期和消息标题使用 15px，缺少语义 token

- `src/pages/qsbOverview/index.module.less:154`：日/周日历日期数字。
- `src/components/messageCenter/index.module.less:214`：消息计划名称、公告标题。
- 当前项目安装的 Arco 全局字号阶梯不包含 15px。建议按层级选择正文 14px 或标题 16px，并复核行高和省略效果。

### 5. 更多文字尺寸脱离全局阶梯，需明确是品牌定制还是遗漏

- `src/pages/announcementManagement/index.module.less:39`：公告管理标题 18px。
- `src/pages/market/index.module.less:828`、`:981`：详情标题 18px、展示区标题 22px。
- `src/pages/qsbOverview/index.module.less:34`、`:85`、`:216`：指标大数字 32px。
- 这些不是“小于 12px”的问题；大数字与品牌展示可能是有意设计，不宜机械替换。建议将确认保留的值收敛为有语义的产品 token，其余回归 Arco 层级。
- 概览普通文字仍大量直接写 12px/14px/16px；当前大小不一定错误，但未来更改主题时不会随语义 token 一起变化。

## 已排除的误报与待验范围

- **13px 是合规字号**：当前安装的 `@arco-design/web-react` 中 `@font-size-body-2` 为 13px，不应把所有 13px 批量改成 12px/14px。
- `global.less` 通知图标的 18px、市场成功图标的 64px 等是图标尺寸，不按正文字号判错。
- `width: 111px`、行高、间距和正常平移 transform 不是 11px 字号问题。
- PRD 流程图也有缩放逻辑：`businessCustomParameterExperiencePrd/index.tsx:288`、`cloudResourceAutomationPrd/index.tsx:508`、`crmProvisioningAutomationPrd/index.tsx:332`。这些属于图形缩放，不直接判为字号违规；需另验默认阅读尺寸和放大后可读性，不能直接删除缩放功能。
- 全局结论来自源码审查；内嵌浏览器抽查了当前概览、通知徽标和排期预览，并未宣称全工程所有交互状态均已视觉验收。

## 本次另行完成的百分比修正

- 完成率与异常率同比均显示 `%`，同步页面、交互标注、PRD、设计说明和测试。
- 异常率按相对同比公式复算：`(本期比率 / 去年同期比率 - 1) × 100%`，当前样例下降约 4.0%。不再把原先的比率差直接换一个单位。
- 完成率同比仍为原型预设的相对增长率样例（2.8% / 3.4% / 4.0% / 4.6%），不是生产数据。
- 去年同期比率为 0 或缺失时，同比显示 `--`。
- 验证：82/82 测试通过、标注 noteId 检查通过、构建通过；构建仍有已有的 VChart 循环分块和体积告警。内嵌浏览器中已无“百分点”文案，比较值显示 `%`，控制台未见错误。
