# 门户操作日志 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 412 PRD 原型中新增「门户操作日志」需求，交付个人中心入口、门户/API/MCP 三类 mock 日志、筛选、详情、脱敏导出、PRD 和交互标注。

**Architecture:** 412 壳层只负责需求注册和「个人中心 / 操作日志」挂载；独立 `portalOperationLog` 页面负责 UI，独立 `model.ts` 负责日志类型、过滤、时间校验、脱敏和 CSV 生成，便于以 Node 测试直接验证业务规则。PRD 和标注分别使用现有 `*Prd`、`*Annotations` 模式，所有数据均明确为原型 mock，不声明真实后端已实现。

**Tech Stack:** React 18、TypeScript 5.6、Arco Design 2.66、Less、Node `node:test`、Vite 5

**Spec:** `docs/superpowers/specs/2026-09-01-portal-operation-log-design.md`

## Global Constraints

- 仅租户管理员可见，且只展示当前租户日志；原型用固定当前租户模拟，不能声称已接入真实鉴权或后端。
- 门户只记录业务操作，不记录进入页面、查看详情、搜索、筛选和切换 Tab；API、MCP 记录可归属到成员凭证的调用。
- 系统定时任务、自动重试、自动推送等自动行为不展示。
- 成功和失败均记录；日志保留 180 天，默认近 7 天，单次查询最长 90 天。
- 列表展示操作内容和操作结果，但二者不作为筛选条件。
- Token、API Key、密码、Cookie、密钥和完整敏感参数不得出现在页面或导出文件中。
- 导出仅使用当前 Tab 和当前筛选结果，导出动作自身写入门户操作 mock 日志。
- 不编辑 `dist/`、截图或生产子应用；只修改 412 PRD 原型源码、测试和文档。
- 当前工作树已有无关改动；每次提交只暂存本任务列出的文件。

## File Structure

- Create `src/pages/portalOperationLog/model.ts`: 日志类型、mock 数据、筛选、时间跨度校验、脱敏和 CSV 生成。
- Create `src/pages/portalOperationLog/index.tsx`: 三 Tab、筛选、表格、详情抽屉和导出交互。
- Create `src/pages/portalOperationLog/index.module.less`: 操作日志页面局部样式。
- Create `src/pages/portalOperationLogPrd/index.tsx`: 与确认设计一致的可评审 PRD 页面。
- Create `src/pages/portalOperationLogPrd/index.module.less`: PRD 页面局部样式。
- Create `src/components/portalOperationLogAnnotations/data.ts`: `POL-1` 至 `POL-6` 标注规则。
- Create `src/components/portalOperationLogAnnotations/index.tsx`: 标注 Marker 和 Drawer 适配器。
- Create `tests/portalOperationLog.test.ts`: 业务规则、脱敏导出和页面/PRD/标注接线回归。
- Modify `src/context/RequirementContext.tsx`: 新增 `portalOperationLog` requirement key。
- Modify `src/iterationRequirements.ts`: 将「门户操作日志」加入 412 顶部需求入口。
- Modify `src/accountNavigation.ts`: 将「操作日志」加入个人中心菜单。
- Modify `src/App.tsx`: 默认门户落点、页面/PRD/标注挂载及菜单图标。
- Modify `tests/accountNavigation.test.ts`: 固化个人中心菜单结构。
- Modify `tests/iterationRequirements.test.ts`: 固化 412 需求顺序。
- Modify `package.json`: 将新测试加入现有 `test:etl` 聚合脚本。

---

### Task 1: 注册需求入口和个人中心菜单

**Files:**
- Modify: `src/context/RequirementContext.tsx`
- Modify: `src/iterationRequirements.ts`
- Modify: `src/accountNavigation.ts`
- Modify: `src/App.tsx`
- Modify: `tests/accountNavigation.test.ts`
- Modify: `tests/iterationRequirements.test.ts`

**Interfaces:**
- Produces: `RequirementKey` 成员 `'portalOperationLog'`。
- Produces: `AccountMenuKey` 成员 `'操作日志'`。
- Produces: `getRequirementDefaultPortalState('portalOperationLog') -> { topTab: '个人中心', menuKey: '操作日志' }`。

- [ ] **Step 1: 更新注册测试，先表达失败预期**

在 `tests/iterationRequirements.test.ts` 的需求顺序中，把以下条目放在 `runDetailStorageLog` 之后：

```ts
['portalOperationLog', '门户操作日志'],
```

把测试名称从 six 更新为 seven，并补充：

```ts
assert.equal(isRequirementPendingAlignment('portalOperationLog'), false);
```

在 `tests/accountNavigation.test.ts` 的个人中心期望数组末尾增加：

```ts
'操作日志',
```

并补充：

```ts
assert.equal(isAccountMenuKey('操作日志'), true);
```

- [ ] **Step 2: 运行注册测试，确认失败**

Run:

```bash
node --test --experimental-strip-types tests/accountNavigation.test.ts tests/iterationRequirements.test.ts
```

Expected: FAIL，差异明确指出缺少 `portalOperationLog` 和「操作日志」。

- [ ] **Step 3: 最小化补齐 key、需求入口和菜单**

在 `RequirementKey` 联合类型中增加：

```ts
| 'portalOperationLog'
```

在 `iterationRequirements` 的 `runDetailStorageLog` 后增加：

```ts
{ key: 'portalOperationLog', label: '门户操作日志' },
```

把个人中心菜单更新为：

```ts
个人中心: ['账号设置', '连接器管理', '短信队列管理', '机器人设备管理', '操作日志'],
```

在 `App.tsx` 中：

```tsx
if (key === 'portalOperationLog') return { topTab: '个人中心', menuKey: '操作日志' };
```

并在 `accountMenuIcons` 中复用已导入的列表图标：

```tsx
操作日志: <IconList />,
```

- [ ] **Step 4: 运行注册测试，确认通过**

Run:

```bash
node --test --experimental-strip-types tests/accountNavigation.test.ts tests/iterationRequirements.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交入口变更**

```bash
git add src/context/RequirementContext.tsx src/iterationRequirements.ts src/accountNavigation.ts src/App.tsx tests/accountNavigation.test.ts tests/iterationRequirements.test.ts
git commit -m "feat: 注册门户操作日志需求入口"
```

### Task 2: 建立可测试的日志模型

**Files:**
- Create: `src/pages/portalOperationLog/model.ts`
- Create: `tests/portalOperationLog.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `OperationLogSource = 'portal' | 'api' | 'mcp'`。
- Produces: `OperationLogRecord`，字段为 `id`、`tenantId`、`source`、`operatedAt`、`operatorId`、`operatorName`、`module`、`operationType`、`content`、`result`、`ip`、可选 `credentialName`、`failureReason`、`changes`、`requestSummary`。
- Produces: `OperationLogFilters`，强制包含 `tenantId`、`source`、`asOf`，可选包含起止日期、操作者、模块、操作类型和凭证名称。
- Produces: `filterOperationLogs(records, filters): OperationLogRecord[]`。
- Produces: `getDateRangeError(start, end): string | null`，超过 90 天返回提示。
- Produces: `buildOperationLogCsv(records): string`，只导出脱敏字段。
- Produces: `mockOperationLogs`，仅包含租户成员或其凭证发起的 portal/API/MCP 样例。

- [ ] **Step 1: 写模型失败测试**

创建 `tests/portalOperationLog.test.ts`，至少覆盖：

```ts
test('filters by tenant, source, operator, module, type and credential', () => {
  const otherTenantRecord = { ...mockOperationLogs[0], id: 'other-tenant', tenantId: 'tenant-other', source: 'api' as const };
  const result = filterOperationLogs([...mockOperationLogs, otherTenantRecord], {
    tenantId: 'tenant-aa',
    source: 'api',
    asOf: '2026-09-01',
    operatorId: 'user-sensen',
    module: '开放平台',
    operationType: '执行',
    credentialName: '经营分析 Agent',
  });
  assert.equal(result.length, 1);
  assert.ok(result.every(item => item.tenantId === 'tenant-aa' && item.source === 'api'));
});

test('excludes records older than 180 days', () => {
  const expired = { ...mockOperationLogs[0], id: 'expired', operatedAt: '2026-03-04 12:00:00' };
  const result = filterOperationLogs([...mockOperationLogs, expired], {
    tenantId: 'tenant-aa', source: 'portal', asOf: '2026-09-01',
  });
  assert.equal(result.some(item => item.id === 'expired'), false);
});

test('rejects a date range longer than 90 days', () => {
  assert.equal(getDateRangeError('2026-05-01', '2026-08-01'), '单次查询时间范围不能超过 90 天');
  assert.equal(getDateRangeError('2026-08-26', '2026-09-01'), null);
});

test('csv never exposes secrets and keeps visible audit fields', () => {
  const csv = buildOperationLogCsv(mockOperationLogs);
  assert.match(csv, /操作时间,操作者,功能模块,操作类型,操作内容,操作结果,IP 地址,凭证名称/);
  assert.doesNotMatch(csv, /qsb_sk_|Bearer |password|cookie/i);
});
```

另加断言：mock 中没有 `source: 'system'`，且门户浏览/搜索/筛选文案不在 `operationType` 中。

- [ ] **Step 2: 运行模型测试，确认失败**

Run:

```bash
node --test --experimental-strip-types tests/portalOperationLog.test.ts
```

Expected: FAIL，提示 `model.ts` 尚不存在。

- [ ] **Step 3: 实现最小模型和 mock**

创建模型类型：

```ts
export type OperationLogSource = 'portal' | 'api' | 'mcp';
export type OperationResult = 'success' | 'failed';
export type OperationType = '新增' | '修改' | '删除' | '启用' | '停用' | '执行' | '重试' | '导入' | '导出' | '授权' | '其他';

export interface OperationLogChange {
  field: string;
  before: string;
  after: string;
}

export interface OperationLogRecord {
  id: string;
  tenantId: string;
  source: OperationLogSource;
  operatedAt: string;
  operatorId: string;
  operatorName: string;
  module: string;
  operationType: OperationType;
  content: string;
  result: OperationResult;
  ip: string;
  credentialName?: string;
  failureReason?: string;
  changes?: OperationLogChange[];
  requestSummary?: string;
}

export interface OperationLogFilters {
  tenantId: string;
  source: OperationLogSource;
  asOf: string;
  startDate?: string;
  endDate?: string;
  operatorId?: string;
  module?: string;
  operationType?: OperationType;
  credentialName?: string;
}
```

`filterOperationLogs` 必须先按 `tenantId`、`source` 和相对 `asOf` 的 180 天保留边界强制过滤，再应用可选时间、操作者、模块、类型、凭证条件，最后按 `operatedAt` 倒序。

`mockOperationLogs` 至少包含：门户修改成功、门户删除失败、门户导出成功、API 调用成功/失败、MCP 调用成功/失败；变更值和请求摘要只放脱敏内容。

`buildOperationLogCsv` 固定列为：操作时间、操作者、功能模块、操作类型、操作内容、操作结果、IP 地址、凭证名称；用双引号转义逗号、引号和换行，不导出变更详情、失败堆栈或未脱敏请求参数。

- [ ] **Step 4: 把测试加入聚合脚本并确认通过**

在 `package.json` 的 `test:etl` 命令末尾加入：

```text
tests/portalOperationLog.test.ts
```

Run:

```bash
node --test --experimental-strip-types tests/portalOperationLog.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交模型**

```bash
git add src/pages/portalOperationLog/model.ts tests/portalOperationLog.test.ts package.json
git commit -m "feat: 建立门户操作日志模型与脱敏导出"
```

### Task 3: 实现三 Tab 交互原型

**Files:**
- Create: `src/pages/portalOperationLog/index.tsx`
- Create: `src/pages/portalOperationLog/index.module.less`
- Modify: `src/App.tsx`
- Modify: `tests/portalOperationLog.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `mockOperationLogs`、`filterOperationLogs`、`getDateRangeError`、`buildOperationLogCsv`。
- Produces: 默认导出组件 `PortalOperationLog`。
- Produces: 页面标注目标 `POL-1` 至 `POL-6` 的稳定 `data-note-id` 容器。

- [ ] **Step 1: 增加页面结构失败测试**

在 `tests/portalOperationLog.test.ts` 读取 `index.tsx`，断言：

```ts
assert.match(page, /门户操作/);
assert.match(page, /API/);
assert.match(page, /MCP/);
assert.match(page, /时间范围/);
assert.match(page, /操作者/);
assert.match(page, /功能模块/);
assert.match(page, /操作类型/);
assert.doesNotMatch(page, /placeholder="搜索操作内容"|操作结果.*Select/s);
for (const id of ['POL-1', 'POL-2', 'POL-3', 'POL-4', 'POL-5', 'POL-6']) {
  assert.match(page, new RegExp(id));
}
```

再读取 `App.tsx`，断言 `PortalOperationLog` 已在账户区域显式挂载。

- [ ] **Step 2: 运行页面测试，确认失败**

Run:

```bash
node --test --experimental-strip-types tests/portalOperationLog.test.ts
```

Expected: FAIL，提示页面或接线缺失。

- [ ] **Step 3: 实现页面布局和筛选**

页面使用 Arco `Tabs`、`DatePicker.RangePicker`、`Select`、`Table`、`Tag`、`Drawer`、`Descriptions`、`Button`、`Message`：

```tsx
const sourceTabs = [
  { key: 'portal', label: '门户操作' },
  { key: 'api', label: 'API' },
  { key: 'mcp', label: 'MCP' },
] as const;
```

- 页头显示「操作日志」、租户隔离说明和「导出」按钮。
- 默认范围为 mock 当前日 `2026-09-01` 向前 7 天。
- 切换 Tab 后清空凭证筛选并重新按来源过滤。
- 公共筛选只有时间范围、操作者、功能模块、操作类型；API/MCP 追加凭证名称。
- 表格默认时间倒序、每页 10 条；API/MCP 动态增加凭证名称列。
- 成功使用绿色 Tag，失败使用红色 Tag；点击整行打开详情抽屉。
- 抽屉展示基础信息、失败原因、脱敏请求摘要和编辑字段的变更前后值；缺失详情时显示「详情暂不可用」。

- [ ] **Step 4: 实现导出和可恢复反馈**

导出时只传当前筛选结果给 `buildOperationLogCsv`，通过 Blob 下载 `操作日志-<Tab>-20260901.csv`。成功后在本地 `records` 状态顶部增加一条来源为 `portal`、类型为 `导出`、结果为 `success` 的 mock 日志，并显示 `Message.success('操作日志已导出')`。

时间跨度超过 90 天时不更新查询条件，显示 `Message.warning('单次查询时间范围不能超过 90 天')`。表格空数据使用当前 Tab 对应空状态。

- [ ] **Step 5: 在 App 中独立挂载页面**

导入：

```tsx
import PortalOperationLog from '@/pages/portalOperationLog';
```

账户区域 content 改为：

```tsx
const accountContent = selectedMenuKey === '操作日志'
  ? <PortalOperationLog />
  : <OpenApiOptimization activeKey={selectedMenuKey} onActiveKeyChange={setSelectedMenuKey} />;
```

保持其他个人中心和开放平台页面行为不变。

- [ ] **Step 6: 运行测试和 TypeScript 构建**

Run:

```bash
node --test --experimental-strip-types tests/portalOperationLog.test.ts tests/accountNavigation.test.ts tests/iterationRequirements.test.ts
npm run build
```

Expected: 测试 PASS，TypeScript 和 Vite build PASS。

- [ ] **Step 7: 提交交互原型**

```bash
git add src/pages/portalOperationLog/index.tsx src/pages/portalOperationLog/index.module.less src/App.tsx tests/portalOperationLog.test.ts
git commit -m "feat: 实现门户操作日志交互原型"
```

### Task 4: 补齐可评审 PRD

**Files:**
- Create: `src/pages/portalOperationLogPrd/index.tsx`
- Create: `src/pages/portalOperationLogPrd/index.module.less`
- Modify: `src/App.tsx`
- Modify: `tests/portalOperationLog.test.ts`

**Interfaces:**
- Produces: 默认导出组件 `PortalOperationLogPrd`。
- Consumes: 已确认设计文档的背景、目标、范围、权限、流程、字段、异常和验收口径。

- [ ] **Step 1: 增加 PRD 内容失败测试**

在 `tests/portalOperationLog.test.ts` 读取 PRD 源码并逐项断言：

```ts
for (const text of [
  '背景', '目标', '需求范围', '用户故事', '核心流程', '权限与租户隔离',
  '字段说明', '保留与查询规则', '异常处理', '本期不做', '验收清单',
  '180 天', '近 7 天', '90 天', '门户操作', 'API', 'MCP',
]) assert.match(prd, new RegExp(text));
```

另断言 PRD 包含“不记录浏览行为”“系统自动行为不展示”“操作内容和操作结果不作为筛选条件”。
读取 `App.tsx`，断言 `getPrdContent` 已将 `portalOperationLog` 显式映射到 `PortalOperationLogPrd`。

- [ ] **Step 2: 运行 PRD 测试，确认失败**

Run:

```bash
node --test --experimental-strip-types tests/portalOperationLog.test.ts
```

Expected: FAIL，提示 PRD 页面不存在或内容缺失。

- [ ] **Step 3: 按现有 PRD 模板实现页面**

复用项目既有 `PrdTable` 和两列 panel 结构，不改变全局 PRD 模板。PRD 至少包含：

- 版本记录；
- 背景、目标、需求范围；
- 租户管理员用户故事；
- 门户/API/MCP 核心流程；
- 三 Tab、筛选、列表、详情和导出说明；
- 权限、租户隔离、180/7/90 天规则；
- 日志字段、操作类型、成功/失败、变更前后值和脱敏；
- 查询失败、详情缺失、导出失败、无权限和超范围处理；
- 本期不做与可测试验收清单。

所有数据源表述为“服务端应提供/原型 mock 展示”，不写成已上线事实。

在 `App.tsx` 导入并挂载：

```tsx
import PortalOperationLogPrd from '@/pages/portalOperationLogPrd';

if (activeRequirement === 'portalOperationLog') return <PortalOperationLogPrd />;
```

- [ ] **Step 4: 运行 PRD 测试并构建**

Run:

```bash
node --test --experimental-strip-types tests/portalOperationLog.test.ts
npm run build
```

Expected: PASS。

- [ ] **Step 5: 提交 PRD**

```bash
git add src/pages/portalOperationLogPrd/index.tsx src/pages/portalOperationLogPrd/index.module.less src/App.tsx tests/portalOperationLog.test.ts
git commit -m "docs: 补齐门户操作日志评审 PRD"
```

### Task 5: 增加交互标注并接入标注抽屉

**Files:**
- Create: `src/components/portalOperationLogAnnotations/data.ts`
- Create: `src/components/portalOperationLogAnnotations/index.tsx`
- Modify: `src/pages/portalOperationLog/index.tsx`
- Modify: `src/App.tsx`
- Modify: `tests/portalOperationLog.test.ts`

**Interfaces:**
- Produces: `portalOperationLogAnnotations: RequirementAnnotation[]`。
- Produces: `PortalOperationLogAnnotationMarker`、`PortalOperationLogAnnotationDrawer`。
- Consumes: 页面 `POL-1` 至 `POL-6` 标记。

- [ ] **Step 1: 增加标注失败测试**

在 `tests/portalOperationLog.test.ts` 导入 `portalOperationLogAnnotations` 并断言：

```ts
assert.deepEqual(portalOperationLogAnnotations.map(item => item.noteId), [
  'POL-1', 'POL-2', 'POL-3', 'POL-4', 'POL-5', 'POL-6',
]);
assert.ok(portalOperationLogAnnotations.every(item => item.topTab === '个人中心'));
assert.ok(portalOperationLogAnnotations.every(item => item.menuKey === '操作日志'));
```

读取 `App.tsx`，断言 active annotations 和 Drawer 均包含 `portalOperationLog` 分支。

- [ ] **Step 2: 运行标注测试，确认失败**

Run:

```bash
node --test --experimental-strip-types tests/portalOperationLog.test.ts
```

Expected: FAIL，提示 annotations 模块不存在。

- [ ] **Step 3: 编写六条具体标注**

`data.ts` 使用以下映射：

```text
POL-1 入口与权限：个人中心入口、仅租户管理员、本租户隔离
POL-2 来源 Tab：门户操作/API/MCP 的归属与自动行为排除
POL-3 筛选与时间：公共筛选、凭证筛选、近 7 天、最长 90 天
POL-4 列表与结果：字段、倒序、分页、成功/失败和空/失败状态
POL-5 详情与脱敏：失败原因、变更前后值、凭证快照、敏感字段禁显
POL-6 导出：当前 Tab 和筛选结果、脱敏、导出动作自身记录、失败重试
```

每条标注都写明业务数据来源、状态、异常恢复和验收，不把 mock 值描述成真实接口事实。

- [ ] **Step 4: 创建 Marker/Drawer 并接入 App**

沿用 `openApiAnnotations` 适配器模式，requirement key 固定为 `portalOperationLog`。在 `App.tsx`：

- 导入 annotation data 和 Drawer；
- 将 `activeRequirement === 'portalOperationLog'` 映射到六条标注；
- 在现有抽屉渲染分支中增加 `PortalOperationLogAnnotationDrawer`；
- 定位标注时切换到「个人中心 / 操作日志」。

在 `portalOperationLog/index.tsx` 使用 `PortalOperationLogAnnotationMarker` 包裹六个对应区域；块级区域使用 `layout="block"` 或 `layout="fill"`，保证页面上可见标号和抽屉定位目标一致。

- [ ] **Step 5: 运行标注测试、聚合测试和构建**

Run:

```bash
node --test --experimental-strip-types tests/portalOperationLog.test.ts
npm run test:etl
npm run build
```

Expected: 全部 PASS。

- [ ] **Step 6: 提交标注**

```bash
git add src/components/portalOperationLogAnnotations/data.ts src/components/portalOperationLogAnnotations/index.tsx src/pages/portalOperationLog/index.tsx src/App.tsx tests/portalOperationLog.test.ts
git commit -m "docs: 增加门户操作日志交互标注"
```

### Task 6: 完整验证与 5178 真页验收

**Files:**
- Modify only if verification exposes an in-scope defect: files listed in Tasks 1-5

**Interfaces:**
- Consumes: 完整 `portalOperationLog` requirement、PRD、prototype 和 annotations。
- Produces: 可复查的测试、构建和内嵌浏览器验收结论。

- [ ] **Step 1: 检查 5178 服务真实 cwd**

Run:

```bash
lsof -nP -iTCP:5178 -sTCP:LISTEN
ps -o pid=,cwd= -p <上一步得到的PID>
```

Expected: cwd 为 `/Users/sensen/Desktop/storedata/qsb-requirement-iterations/412 迭代需求文件`。若不是，停止真页验收并先从该目录启动 412 服务。

- [ ] **Step 2: 运行完整自动验证**

Run:

```bash
npm run test:etl
npm run build
git diff --check
```

Expected: 全部 PASS；`git diff --check` 不新增空白错误。

- [ ] **Step 3: 用 Codex 内嵌浏览器验收 PRD**

打开：

```text
http://127.0.0.1:5178/?requirement=portalOperationLog&tab=prd
```

核对背景、目标、范围、核心流程、权限、字段、异常、本期不做和验收清单均可读，且没有“已接真实后端”的错误表述。

- [ ] **Step 4: 用 Codex 内嵌浏览器验收交互原型**

打开：

```text
http://127.0.0.1:5178/?requirement=portalOperationLog&tab=prototype
```

逐项验证：

- 默认落到「个人中心 / 操作日志」；
- 门户操作、API、MCP 三 Tab 内容分离；
- 门户筛选没有凭证名称，API/MCP 有凭证名称；
- 操作者、模块、类型和日期筛选生效，操作内容/结果没有筛选控件；
- 成功/失败标签、失败原因、变更前后值和脱敏请求摘要正确；
- 导出使用当前筛选数据并新增门户导出日志；
- 91 天范围被阻止；
- 六条标注可打开、定位并回到正确页面；
- 页面控制台无新增 error。

- [ ] **Step 5: 复核最终变更范围**

Run:

```bash
git status --short
git log -5 --oneline --name-only
```

Expected: 本任务提交只包含计划列出的 412 源码、测试和文档；现有无关脏改动仍保持原样。
