# 消息推送模板收口

## 统一字段与文案

| 位置 | 文案/内容 |
| --- | --- |
| 标题 | 计划/店铺/数据表/数据监控视图 + 进度汇总/异常汇总/异常提醒/成功提醒 |
| 标题描述 | 定时：截止时间；实时异常：发生时间；实时成功：完成时间 |
| 进度正文 | 统计 → 异常列表 |
| 异常汇总正文 | 异常分类数量 → 异常列表 |
| 实时正文 | 当前对象、必要关联信息、结果或具体错误 |
| 监控正文 | 关联视图、统计起点、对应图片；终点采用标题的截止时间 |
| 来源 | 策略名称，在正文末尾仅一次 |
| 唯一入口 | 前往门户 |

公司名称、重复推送类型、重复时间、重复异常总数、“另有 X 条”和图片生成过程文案不展示。异常列表为普通分区标题。计划类型统一为日常计划、实时计划、回溯计划；字段名称跨渠道一致，但计划数、执行次数、店铺数、数据表数不混用。

异常明细完整展示已有数据，首行对象名称，次行必要关联及实际错误；不把所有失败改成入库校验失败。取数错误码仅使用返回值；入库与校验保留各自详情。只有实际协议长度限制触发截断时使用省略号，保留统计与入口。

## 组件收口

- MessageCard：三个渠道共用标题、业务时间、正文、入口顺序。
- SharedMessageBody：计划、店铺、数据表共用统计、明细、事件和策略来源组件，不再各写一套消息模板。
- SummaryStatistics：进度与异常统计共用数据读取及指标组件；仅飞书使用浅底分栏。
- MonitorViewPreview：飞书、钉钉复用消息外壳；企微使用独立原图 image + text_notice 信息卡，顺序为图片、信息卡，不再使用 news_notice 封面。
- 所有预览按钮提供相同交互反馈，不冒充已接通生产深链。

原型样例调整：日常 42=30成功+1失败+11运行中；实时 54=37成功+1失败+16运行中；回溯 3=2成功+1失败。三类各一条失败明细，同一计划在此样例中只有一次失败执行。此调整仅消除原型数字矛盾，不修改服务层统计方法，也不把失败次数当作生产异常计划去重数。

## 官方能力核对（2026-09-02）

| 渠道 | 官方形态与此次映射 | 边界 |
| --- | --- | --- |
| 飞书 | interactive；header.title/subtitle；column_set 分栏；文本字号、颜色；图片；URL 按钮 | CSS 仅是原型近似；不能把网页直接作为消息发送 |
| 企业微信 | template_card/text_notice；main_title 标题/时间；sub_title_text 顺序承载统计与明细；horizontal_content_list 承载策略名称；jump_list/card_action 门户入口；监控先发独立 image 再发信息卡 | 普通文本没有独立样式参数；news_notice 封面宽高比范围约 1.3～2.25，不适用于当前约 7.3 和 16 的超宽截图；image 原图编码前不超过 2 MB |
| 钉钉 | ActionCard；正文使用 Markdown 标题、加粗、段落和图片；singleTitle/singleURL 入口 | 不使用未列入官方 Markdown 子集的 HTML 颜色、CSS 宫格或固定字段表格 |

已读取官方正文（动态站点分别通过其公开 Markdown 或页面实际加载的官方文档存储读取）：

- [飞书标题](https://open.feishu.cn/document/feishu-cards/card-json-v2-components/content-components/title)、[分栏](https://open.feishu.cn/document/feishu-cards/card-json-v2-components/containers/column-set)、[图片](https://open.feishu.cn/document/feishu-cards/card-json-v2-components/content-components/image)、[按钮](https://open.feishu.cn/document/feishu-cards/card-json-v2-components/interactive-components/button)。
- [飞书自定义机器人](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)：请求体不超过 20 KB；不等于正文字符数。
- [企业微信消息推送配置](https://developer.work.weixin.qq.com/document/path/91770)：main_title.desc 建议 30 字、sub_title_text 建议 112 字；horizontal_content_list 不超过 6 项。当前仅使用 1 项策略来源。建议长度不作为强制截断阈值。
- [钉钉消息类型](https://open.dingtalk.com/document/orgapp/custom-bot-send-message-type)：官方正文由页面脚本加载的 [文档存储](https://icms-document.oss-cn-beijing.aliyuncs.com/zh-CN/dingtalk/orgapp/topics/custom-bot-send-message-type.html) 提供，已确认 ActionCard 与 Markdown 子集；该正文未给出明确 ActionCard 总字节上限，不套用其他消息接口的限制。

## 验证与剩余边界

- 42 种有效组合均有整卡渲染检查；12 组跨渠道业务字段逐字对齐检查。
- 内嵌浏览器实际切换 24 种定时、18 种实时组合；未更改策略配置或发送真实群消息。
- 页面示例展示完整数据，不新增前 N 条截断。
- 企微汇总文本超过建议长度，不把建议 112 字冒充硬限制；不承诺任意局部样式。当前范围仅核对协议与桌面原型，不测试手机或真实群客户端。链接权限、图片上传、消息返回码尚未接入生产验证。
- 图片仍是原型内已有的监控视图样例资产，不代表已接入按生产策略动态生成的截图链路。
- PRD 已同步当前字段、顺序、渠道映射及以上验收边界。

## 可执行协议样例

`src/pages/pushStrategyCenter/messagePayload.ts` 的 `buildChannelMessages(channel, model, assets)` 返回按顺序发送的 JSON 请求体数组，不发起网络请求。

- 模型由当前预览同源字段函数 `getPreviewMessageModel` 提供；测试覆盖 42 种有效组合，校对标题、时间、策略、统计、关联信息及异常详情。
- `assets.portalUrl` 需传入本次对象对应的门户绝对 URL。飞书图片需 `feishuImageKey`；钉钉需可访问的 `imageUrl`；企微需同一原图的 `wecomImage.base64` 和 `wecomImage.md5`。测试中的 example.com 和测试图片 key 仅为夹具，不可用于生产发送。
- 企微监控返回 `[image, template_card]`，信息卡不再内嵌图片。同视图两条消息需由发送链路维持顺序；此处不实现重试或部分发送失败协调。
- 飞书完整请求超出 20 KB 时才逐条省略列表，并使用单个省略号；统计与入口不丢失。基础内容仍超限则拒绝生成。未对其他渠道臆造字节上限。
- 本地原图查看工具仅用于预览检查；飞书有官方 `preview: true`，企微/钉钉不承诺与原型工具栏一致。
- 样例是协议映射，不是官方接口已接收的证明；字体、间距及圆角仍由渠道组件渲染，不能发送 CSS。
