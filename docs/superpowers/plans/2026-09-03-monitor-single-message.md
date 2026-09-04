# 多视图单条消息 Implementation Plan

**Goal:** 同一策略的多个监控视图在每个渠道合并为一条消息，不逐个拆发。

**Spec:** 用户确认单条消息内按视图分区；公共标题、截止时间、策略名称和门户入口只显示一次。本方案替代 2026-09-02 的企微图片与信息卡分开发送方案。

**Architecture:** 共享消息模型增加视图数组，图片资源按视图 ID 对应；预览与 PRD 复用同一组件。飞书、钉钉卡片内嵌多图，企微监控改用 markdown_v2；其他业务类型不变。

**Tech Stack:** React、Arco、TypeScript、Node test。

## 范围与验证

- [x] 修改 `src/pages/pushStrategyCenter/messagePayload.ts`：三渠道每次返回一条消息；空视图不发送；单图失败保留原区块失败提示；飞书与企微超限省略完整尾部区块，保留入口，不拆条。
- [x] 修改 `src/pages/pushStrategyCenter/index.tsx` 与样式：同一卡片展示两个不同视图，关联范围支持全部或自定义。第二张图片由原型监控记录生成，不重复使用第一张图片。
- [x] 同步 `src/pages/pushStrategyOptimizationPrd/content.ts` 与 `src/components/pushStrategyAnnotations/data.ts`：先处理视图，再合并发送；整条消息以渠道接收结果记录成功或失败，失败不补发。
- [x] 更新两个消息测试文件：135 项通过，覆盖合并、唯一公共信息、图片对应、空范围、局部图片失败和发送体积限制。
- [x] TypeScript 与 Vite 构建通过；标注检查通过；内嵌浏览器验证 PRD、原型弹窗、三渠道、全部/自定义和第二张图片放大。

## 官方能力依据（2026-09-03 核对）

- [飞书卡片 JSON 2.0](https://open.feishu.cn/document/feishu-cards/card-json-v2-structure)：正文组件数组按顺序展示，一张卡片最多 200 个元素或组件，包含嵌套文本元素。
- [企微消息推送配置说明](https://developer.work.weixin.qq.com/document/path/91770)：markdown_v2 支持图片、标题、链接和分隔线，正文最多 4096 UTF-8 字节；低版本客户端可能以纯文本展示。图片使用可访问 URL，不沿用 image 消息的 base64/2 MB 限制。
- [钉钉自定义机器人](https://open.dingtalk.com/document/group/custom-robot-access)：ActionCard 正文使用 Markdown，官方示例包含图片，支持单一跳转按钮。按此能力将多个视图图文串接在同一正文中；最终客户端表现未进行真实群聊验收。

仅修改原型与消息格式示例，未接入发送服务、未向群聊发送、未提交代码。原有 VChart 分包及大包构建警告未处理。
