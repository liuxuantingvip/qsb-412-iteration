# Work Retry Feedback Implementation Plan

> **For agentic workers:** Use inline execution with verification after each task.

**Goal:** 四类异常显示计划名称，重试反馈可识别计划并打开本次运行记录，成功后倒计时六秒移除。

**Architecture:** 复用现有 AnomalyElements 与 useWorkRetry；成功结果保留行，记录本次运行详情和删除截止时间。列表、标注演示使用同一反馈组件和计时逻辑。

**Tech Stack:** React、TypeScript、Arco、Node test、内嵌浏览器。

**Spec:** 用户于当前任务确认的方案：计划列位于店铺后；成功保留六秒，失败保留并更新；查看详情不暂停倒计时，行移除不关闭已打开详情。

**执行结果：** 已完成下面三项任务。87 项测试通过，构建通过（保留已有的 VChart 分块告警），标注检查及 diff 检查通过。内嵌浏览器已核对四类计划列、成功新记录详情、到期移除后详情保持、失败新记录与原因更新；演示不提交生产任务。

## Global Constraints

- 仅修改 412 原型，不提交真实任务；不改生产代码或无关脏工作树。
- 不缩小字号；窄容器横向滚动，长计划名省略并提供完整 Tooltip。
- 查看本次重试记录，缺少记录 ID 时禁用，不使用旧记录替代。
- 保留 PRD 模板，更新对应场景及 QSB-3.2 标注。

## Task 1: 重试结果与延迟移除

Files: `src/pages/qsbOverview/workRetry.ts`, `AnomalyElements.tsx`, `tests/qsbOverviewAccount.test.ts`。

- [ ] 将成功立即删除的测试改为成功保留行；新增截止前 5999ms 保留、6000ms 删除、多 Work 独立删除测试，运行确认失败。
- [ ] 成功结果携带 `record: RunRecord`；反馈记录不与旧异常数据混用。
- [ ] 导出 `getRetryRemovalSeconds(deadline, now)` 与 `removeExpiredWorkRetries(rows, deadlines, now)`，以绝对时间避免后台计时漂移。
- [ ] Hook 保存成功记录与截止时间，周期检查到期行；卸载清理定时器，成功等待期间禁止重复提交。

## Task 2: 列表与反馈共享组件

Files: `AnomalyElements.tsx`, `index.tsx`, `index.module.less`, `src/components/qsbOverviewAnnotations/AnomalyExamples.tsx`。

- [ ] 四分类共享行增加计划列；表头与行使用同一网格，计划列 176px（小屏 152px）。
- [ ] 成功文案：`{planName} 计划重试成功，该异常即将从列表移除（{seconds}s）`。
- [ ] 失败文案：`{planName} 计划重试失败，已更新该异常数据`。
- [ ] 两种结果均提供“查看运行记录”，打开关联详情对象；成功移除行不影响外层保存的详情对象。
- [ ] 标注演示保留直接模拟按钮，成功后六秒内按钮禁用，到期可重置演示；静态反馈样式也携带计划名称与可用详情链接。

## Task 3: 规则同步与验收

Files: `src/components/qsbOverviewAnnotations/data.ts`, `src/pages/qsbOverviewPrd/index.tsx`, 既有交互设计说明。

- [ ] 替换立即移除、计划仅在 Tooltip 等旧规则，补充成功倒计时、缺失记录 ID 和详情保持规则。
- [ ] 运行 `npm run test:etl`、`npm run build`、`git diff --check`、标注检查。
- [ ] 内嵌浏览器验证四分类计划列、失败数据更新及记录链接、成功 6s 到期移除、倒计时期间打开详情后仍可阅读、重置取消旧计时器。
