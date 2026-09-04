# Push Message Native Card Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐计划、店铺、数据表、数据监控视图的消息预览，并按飞书交互式卡片、企业微信模板卡片、钉钉 ActionCard 的官方能力分别渲染。

**Architecture:** 保留统一的消息数据和类型元数据，但将渠道视图拆成各自的结构组件；公共业务字段由小型纯展示函数复用，不跨渠道复用不受支持的视觉布局。

**Tech Stack:** React、TypeScript、Arco Design、Less、Vite

**Spec:** `docs/superpowers/specs/2026-09-02-push-message-native-card-simplification-design.md`

## Global Constraints

- 用户可见术语统一使用“计划”。
- 仅使用三个渠道群机器人 Webhook 官方支持的消息形式。
- 同一业务信息在一张卡片中只出现一次。
- 数据监控视图只支持定时进度汇总和异常汇总，异常为空时不推送。
- 不修改推送策略配置逻辑和其他需求页面。
- 不提交代码。2026-09-02 用户已批准消息进度区的留白分组修订，当前会话直接实施。

### 当前修订：计划进度排版

- [x] 保留 `planProgressSections` 的三个分类及原统计值；按最新批注，标题行仅展示类型，指标行使用完整 `section.metrics`，依次展示总数、成功、失败、运行中。
- [x] `PlanMetricValues` 仅成功和失败使用 `strong`（企微保持原生字重）；飞书使用文本圆点 `●`，其他渠道使用单色文字圆点 `·`，不使用彩色圆球 emoji；颜色 CSS 仅作用于飞书。
- [x] 企微、钉钉计划进度与异常汇总补齐共享失败计划明细：标题仅计划名称，描述为计划类型和本次失败阶段的具体错误；取数执行带错误码，入库与校验保留各自详情，不统一替换。三种计划类型及三种失败阶段由共享预览记录呈现，不修改统计口径。
- [x] 扩展三渠道进度、异常汇总和实时计划异常提醒的正文渲染测试，先复现 9 项失败，再修复；原有小圆点测试保留。
- [ ] 替换两张独立绘制的监控示意图为所选数据监控视图截图。内嵌浏览器不可取图，已向用户确认目标视图并请求截图；该项未完成。
- [x] Less 删除分组灰底、边框和圆角；标题、指标均为 14px，分组间距 20px；飞书指标等宽四列，其余渠道保持线性文本。计划进度明细标题改为“失败计划”，不修改其他对象或异常汇总标题。
- [x] 同步当前 PRD 和设计文档，不改业务口径和其他消息类型。
- [x] 执行 `npm run test:etl`（199/199，包含三渠道正文的 6 项渲染测试）、`npm run build`（通过，保留既有 bundle/chunk 警告）和目标文件 `git diff --check`（通过）。
- [ ] 使用现有 Codex 内嵌浏览器复查三个渠道；如 URL 策略仍阻止访问，记录未验收，不切换浏览器绕过限制。当前旧浏览器会话和对应运行包均已失效，本次未完成真页复查；不将构建通过视作视觉验收。

---

### Task 1: 精简并按渠道重构消息预览

**Files:**
- Modify: `src/pages/pushStrategyCenter/index.tsx`
- Modify: `src/pages/pushStrategyCenter/index.module.less`

**Interfaces:**
- Consumes: `PreviewMessageKind`、`previewMessage`、`previewKindMeta`
- Produces: `FeishuMessagePreview`、`WeComMessagePreview`、`DingTalkMessagePreview`

- [ ] **Step 1: 收紧四类消息的数据范围**

删除重复摘要、重复结果面板和重复时间，仅保留设计文档列出的业务字段。

- [ ] **Step 2: 实现飞书交互式卡片预览**

使用卡片头、文本/字段和底部按钮模拟 `interactive` 官方结构，汇总数据可使用字段布局。

- [ ] **Step 3: 实现企业微信模板卡片预览**

使用来源、主标题、强调内容、横向内容列表和跳转入口模拟 `template_card` 的 `text_notice` 结构。

- [ ] **Step 4: 实现钉钉 ActionCard 预览**

使用标题、Markdown 线性正文和单按钮模拟 `actionCard`，不使用指标宫格或自定义彩色卡片头。

- [ ] **Step 5: 验证**

Run: `npm run build`

Expected: TypeScript 检查和 Vite 构建成功；仅允许既有的 VChart chunk warning。

Run: `git diff --check -- src/pages/pushStrategyCenter/index.tsx src/pages/pushStrategyCenter/index.module.less`

Expected: 无输出，退出码为 0。

### Task 2: 补齐内容类型和数据监控图片预览

**Files:**
- Modify: `src/pages/pushStrategyCenter/index.tsx`
- Modify: `src/pages/pushStrategyCenter/index.module.less`
- Modify: `src/pages/pushStrategyOptimizationPrd/index.tsx`

**Interfaces:**
- Consumes: `PreviewPushMode`、`PreviewMessageKind`、三个渠道消息组件
- Produces: `PreviewObjectType`、内容类型选择器、按对象变化的正文、数据监控图片消息

- [ ] **Step 1: 新增内容类型与组合约束**

定时推送展示计划、店铺、数据表、数据监控视图；实时推送只展示计划、店铺、数据表。切换推送方式时若当前内容类型不支持，则重置为计划。

- [ ] **Step 2: 按计划、店铺、数据表切换文本消息内容**

进度、异常、实时异常和实时成功根据对象类型展示不同统计与定位字段；店铺进度不展示等待状态。

- [ ] **Step 3: 实现数据监控视图图片消息**

进度汇总展示完整看板图片；异常汇总展示仅异常看板图片，并标注视图名称、统计范围和数据截止时间。飞书使用卡片图片元素，企微使用图文模板卡片图片，钉钉使用 ActionCard Markdown 图片。

- [ ] **Step 4: 同步 PRD 规则**

明确两类看板均按推送时间截止，异常为空时不推送且不生成图片。

- [ ] **Step 5: 验证**

Run: `npm run test:etl && npm run build`

Expected: 测试、TypeScript 检查和 Vite 构建成功；仅允许既有的 VChart chunk warning。

Run: `git diff --check -- src/pages/pushStrategyCenter/index.tsx src/pages/pushStrategyCenter/index.module.less src/pages/pushStrategyOptimizationPrd/index.tsx`

Expected: 无输出，退出码为 0。
