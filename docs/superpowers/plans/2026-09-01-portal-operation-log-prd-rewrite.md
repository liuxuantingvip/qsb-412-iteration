# 门户操作日志 PRD 重写 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将门户操作日志 PRD 重写为单列瀑布流，以流程图呈现核心流程，并让系统自动行为作为“系统”操作者展示在门户操作 Tab。

**Architecture:** PRD 页面沿用现有 Arco 表格和页面壳，但改为一个连续内容列；核心流程拆为单用途 `OperationLogFlowchart` 组件，通过 Mermaid 动态渲染。原型不新增来源类型，仅用既有 `source: 'portal'` 和 `operatorId/operatorName: 'system'/'系统'` 表示系统自动行为，并同步交互标注与需求设计。

**Tech Stack:** React、TypeScript、Arco Design、Less、Mermaid、Node.js test runner、Vite

**Spec:** `docs/superpowers/specs/2026-09-01-portal-operation-log-prd-rewrite-design.md`

## Global Constraints

- PRD 页面采用单列瀑布流，不使用左右分屏、折叠章节或悬浮侧栏。
- 正式章节顺序固定为：版本信息、变更日志、文档说明、需求背景、目标、用户故事、需求范围、用户场景与交互说明、用户操作流程、非功能需求、埋点。
- 系统自动行为进入「门户操作」Tab，操作者显示“系统”，不新增第四个 Tab。
- 进入页面、搜索、筛选、切换 Tab 等浏览行为不记录。
- 不恢复操作详情入口。
- 不新增未确认的产品分析埋点，埋点表保留 `- / - / -`。

---

### Task 1: 将系统自动行为纳入门户操作数据与标注

**Files:**
- Modify: `tests/portalOperationLog.test.ts`
- Modify: `src/pages/portalOperationLog/model.ts`
- Modify: `src/components/portalOperationLogAnnotations/data.ts`
- Modify: `docs/superpowers/specs/2026-09-01-portal-operation-log-design.md`

**Interfaces:**
- Consumes: `OperationLogRecord`、`mockOperationLogs`、`filterOperationLogs()`、`portalOperationLogAnnotations`
- Produces: 通过既有 `PortalOperationLogRecord` 表达的系统日志，固定使用 `source: 'portal'`、`operatorId: 'system'`、`operatorName: '系统'`

- [ ] **Step 1: 写入失败测试**

将“mock only includes member-triggered business actions”测试改为：

```ts
test('portal records include system-triggered actions but exclude browsing behavior', () => {
  const systemRecords = mockOperationLogs.filter((item) => item.operatorId === 'system');
  assert.ok(systemRecords.length > 0);
  assert.ok(systemRecords.every((item) => (
    item.source === 'portal'
    && item.operatorName === '系统'
    && !item.credentialName
  )));
  assert.equal(
    mockOperationLogs.some((item) => ['浏览', '搜索', '筛选'].includes(item.operationType)),
    false,
  );
});
```

增加标注断言：

```ts
const sourceRules = portalOperationLogAnnotations
  .find((item) => item.noteId === 'POL-2')
  ?.ruleItems.map(({ text }) => text).join('\n') ?? '';
assert.match(sourceRules, /系统自动行为.*门户操作/);
assert.match(sourceRules, /操作者.*系统/);
assert.doesNotMatch(sourceRules, /系统.*不展示/);
```

- [ ] **Step 2: 运行专项测试并确认失败**

Run: `node --test tests/portalOperationLog.test.ts`

Expected: FAIL，当前 mock 没有 `operatorId === 'system'` 的门户记录，标注仍写系统自动行为不展示。

- [ ] **Step 3: 添加最小系统自动行为样例**

在 `mockOperationLogs` 中加入一条使用已确认模块的记录：

```ts
{
  id: 'portal-system-auto-retry',
  tenantId: 'tenant-aa',
  source: 'portal',
  operatedAt: '2026-09-01 10:08:32',
  operatorId: 'system',
  operatorName: '系统',
  module: '数据监控',
  operationType: '重试',
  content: '系统自动重试“商品日报”采集任务',
  result: 'success',
  ip: '10.18.2.10',
},
```

不新增 `system` 来源类型，确保现有三个 Tab、筛选、分页和导出继续复用同一模型。

- [ ] **Step 4: 同步交互标注和需求设计**

将 `POL-2` 记录范围改为：

```ts
{ text: '门户操作同时包含成员在前台主动发起的业务动作，以及本租户的系统定时任务、自动重试、自动推送等系统自动行为；系统自动行为的操作者显示“系统”。' }
```

删除“系统自动行为不展示”“无法归属时不进入任一 Tab”等冲突文案；保留浏览行为不记录。同步 `2026-09-01-portal-operation-log-design.md` 的背景、记录范围、本期不做和验收标准。

- [ ] **Step 5: 运行专项测试**

Run: `node --test tests/portalOperationLog.test.ts`

Expected: 27 tests PASS。

- [ ] **Step 6: 提交数据口径变更**

```bash
git add tests/portalOperationLog.test.ts src/pages/portalOperationLog/model.ts src/components/portalOperationLogAnnotations/data.ts docs/superpowers/specs/2026-09-01-portal-operation-log-design.md
git commit -m "feat: 展示门户系统自动行为"
```

---

### Task 2: 重写正式 PRD 内容并接入核心流程图

**Files:**
- Create: `src/pages/portalOperationLogPrd/OperationLogFlowchart.tsx`
- Modify: `src/pages/portalOperationLogPrd/index.tsx`
- Modify: `tests/portalOperationLog.test.ts`

**Interfaces:**
- Consumes: Mermaid 动态模块 `import('mermaid')`
- Produces: `OperationLogFlowchart(): JSX.Element`，渲染固定的 `portalOperationLogFlowchart` 流程图

- [ ] **Step 1: 写入正式章节和流程图失败测试**

在 PRD 测试中增加：

```ts
const requiredSections = [
  '版本信息', '变更日志', '文档说明', '需求背景', '目标', '用户故事',
  '需求范围', '用户场景与交互说明', '用户操作流程', '非功能需求', '埋点',
];
const sectionIndexes = requiredSections.map((title) => prd.indexOf(`title="${title}"`));
assert.ok(sectionIndexes.every((index) => index >= 0));
assert.deepEqual(sectionIndexes, [...sectionIndexes].sort((a, b) => a - b));
assert.match(prd, /<OperationLogFlowchart \/>/);
assert.doesNotMatch(prd, /const flowRows/);
```

读取 `OperationLogFlowchart.tsx` 并约束流程内容：

```ts
assert.match(flowchart, /flowchart LR/);
for (const text of [
  '门户成员操作', '系统自动行为', 'API 调用', 'MCP 调用',
  '执行结果', '生成成功日志', '生成失败日志', '按当前租户隔离存储',
  '门户操作 Tab', 'API Tab', 'MCP Tab', '按当前条件导出',
]) assert.match(flowchart, new RegExp(text));
assert.match(flowchart, /成员名称或系统/);
```

- [ ] **Step 2: 运行专项测试并确认失败**

Run: `node --test tests/portalOperationLog.test.ts`

Expected: FAIL，当前 PRD 缺少正式章节，核心流程仍使用 `flowRows` 表格，流程图文件不存在。

- [ ] **Step 3: 创建单用途 Mermaid 流程图组件**

`OperationLogFlowchart.tsx` 定义固定图表：

```ts
export const portalOperationLogFlowchart = `flowchart LR
  member[门户成员操作] --> classify{识别操作来源}
  system[系统自动行为] --> classify
  api[API 调用] --> classify
  mcp[MCP 调用] --> classify
  classify --> execute[校验并执行业务请求]
  execute --> outcome{执行结果}
  outcome -->|成功| success[生成成功日志]
  outcome -->|失败| failed[生成失败日志]
  success --> storage[按当前租户隔离存储]
  failed --> storage
  storage --> portal[门户操作 Tab<br/>成员名称或系统]
  storage --> apiTab[API Tab<br/>成员与凭证快照]
  storage --> mcpTab[MCP Tab<br/>成员与凭证快照]
  portal --> query[租户管理员查询、筛选、分页]
  apiTab --> query
  mcpTab --> query
  query --> export[按当前条件导出]`;
```

组件使用 `useEffect` 动态导入 Mermaid，`securityLevel: 'strict'`、`theme: 'base'`、`curve: 'linear'`。成功时渲染 SVG；失败时在流程图区显示“流程图加载失败”，不回退为步骤表格。

- [ ] **Step 4: 按正式模板重写 PRD 页面**

`index.tsx` 只保留一个内容流：

```tsx
<div className={styles.layout}>
  <Section title="版本信息"><PrdTable rows={versionRows} /></Section>
  <Section title="变更日志"><PrdTable rows={changeLogRows} /></Section>
  <Section title="文档说明"><PrdTable rows={glossaryRows} /></Section>
  <Section title="需求背景"><p className={styles.paragraph}>...</p></Section>
  <Section title="目标"><p className={styles.paragraph}>...</p></Section>
  <Section title="用户故事"><PrdTable rows={storyRows} /></Section>
  <Section title="需求范围"><PrdTable rows={scopeRows} /></Section>
  <Section title="用户场景与交互说明"><PrdTable rows={sceneRows} /></Section>
  <Section title="用户操作流程"><OperationLogFlowchart /></Section>
  <Section title="非功能需求"><PrdTable rows={nonFunctionalRows} /></Section>
  <Section title="埋点"><PrdTable rows={trackingRows} /></Section>
</div>
```

版本信息使用「版本号 / 创建日期」；变更日志使用「时间 / 版本号 / 变更人 / 主要变更内容」；需求范围使用「功能模块 / 新增或优化 / 功能点 / 端 / 产品线 / 优先级」；埋点使用 `[['事件名称', '触发时机', '上报属性'], ['-', '-', '-']]`。

- [ ] **Step 5: 运行专项测试**

Run: `node --test tests/portalOperationLog.test.ts`

Expected: 27 tests PASS。

- [ ] **Step 6: 提交 PRD 内容与流程图**

```bash
git add src/pages/portalOperationLogPrd/OperationLogFlowchart.tsx src/pages/portalOperationLogPrd/index.tsx tests/portalOperationLog.test.ts
git commit -m "feat: 重写门户日志瀑布流 PRD"
```

---

### Task 3: 收口单列样式并完成全量验收

**Files:**
- Modify: `src/pages/portalOperationLogPrd/index.module.less`
- Modify: `tests/portalOperationLog.test.ts`

**Interfaces:**
- Consumes: `.page`、`.layout`、`.section`、`.flowBlock`、`.flowViewport`、`.flowCanvas`、`.flowError`
- Produces: 单列连续 PRD 布局和可横向滚动的流程图容器

- [ ] **Step 1: 写入布局失败测试**

```ts
const styles = readFileSync(
  new URL('../src/pages/portalOperationLogPrd/index.module.less', import.meta.url),
  'utf8',
);
assert.match(styles, /\.layout[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
assert.doesNotMatch(styles, /grid-template-columns:\s*repeat\(2/);
assert.match(styles, /\.flowViewport[\s\S]*?overflow:\s*auto/);
```

- [ ] **Step 2: 运行专项测试并确认失败**

Run: `node --test tests/portalOperationLog.test.ts`

Expected: FAIL，当前 `.layout` 仍为两列，且缺少流程图样式。

- [ ] **Step 3: 实现单列瀑布流和流程图样式**

```less
.layout {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: @spacing-8;
}

.flowBlock {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: @border-radius-medium;
  background: var(--color-bg-1);
}

.flowViewport {
  min-height: 360px;
  overflow: auto;
}

.flowCanvas {
  width: max-content;
  min-width: 100%;
  padding: @spacing-6;
}
```

删除 `.panel` 和两列媒体查询，不添加独立滚动列或悬浮目录。

- [ ] **Step 4: 运行专项、全量测试和构建**

Run: `node --test tests/portalOperationLog.test.ts`

Expected: 27 tests PASS。

Run: `npm run test:etl`

Expected: all tests PASS。

Run: `npm run build`

Expected: TypeScript check and Vite build PASS。

Run: `git diff --check`

Expected: no output。

- [ ] **Step 5: 使用内嵌浏览器验收**

打开 `http://127.0.0.1:5178/?requirement=portalOperationLog&tab=prd` 并验证：

- 页面从版本信息到埋点为一个连续内容列；
- 页面不存在左右分屏；
- 用户操作流程以流程图渲染且包含系统自动行为；
- PRD 不出现“系统自动行为不展示”的旧口径；

切换到 `tab=prototype` 并验证：

- 门户操作列表存在操作者“系统”的自动重试记录；
- API、MCP 仍为独立 Tab；
- 列表行仍不打开操作详情；
- 控制台无新增业务错误。

- [ ] **Step 6: 提交布局与验收约束**

```bash
git add src/pages/portalOperationLogPrd/index.module.less tests/portalOperationLog.test.ts
git commit -m "fix: 收口门户日志 PRD 单列布局"
```
