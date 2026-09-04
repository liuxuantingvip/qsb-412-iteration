# QSB Overview PRD Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the overview PRD inside its existing template so development and QA can review the current 412 prototype from business context through executable acceptance criteria.

**Architecture:** Keep `QsbOverviewPrd` and its eight existing sections as the rendering boundary. Lock the document-to-prototype contract with source assertions in `qsbOverviewContent.test.ts`, then replace only the PRD copy and table rows in `qsbOverviewPrd/index.tsx`.

**Tech Stack:** React 18, TypeScript, Arco Design Typography/Table, CSS Modules/Less, Node test runner, Vite.

**Spec:** `docs/superpowers/specs/2026-08-29-qsb-overview-prd-rewrite-design.md`

## Global Constraints

- Preserve the existing section order: 版本信息、需求背景、目标、需求范围、用户故事、用户场景与交互说明、非功能要求、本期不做。
- Preserve the existing JSX layout, `Section`, `PrdTable`, and `index.module.less` styles.
- Keep exactly one `V1.0` version record.
- Describe the current 412 prototype; do not claim production APIs, real data, persistence, or backend delivery.
- Do not modify `qsbOverview`, its mock content, routing, annotations, or other requirement PRDs.
- Preserve unrelated uncommitted changes in the target worktree.

---

### Task 1: Lock the PRD-to-prototype content contract

**Files:**
- Modify: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: the rendered PRD source at `src/pages/qsbOverviewPrd/index.tsx`.
- Produces: one regression test that requires the approved template, current prototype vocabulary, core flow, and removal of stale scope.

- [ ] **Step 1: Extend the existing PRD source test**

Replace the current `keeps a single V1.0 entry` test with:

```ts
test('keeps the PRD template while matching the current overview prototype', () => {
  const prdSource = readFileSync(new URL('../src/pages/qsbOverviewPrd/index.tsx', import.meta.url), 'utf8');

  assert.equal(prdSource.match(/\['V\d+\.\d+'/g)?.length, 1);
  assert.match(prdSource, /\['V1\.0', '2026\/06\/30', '森森', '创建需求 PRD'\]/);

  for (const title of ['版本信息', '需求背景', '目标', '需求范围', '用户故事', '用户场景与交互说明', '非功能要求', '本期不做']) {
    assert.match(prdSource, new RegExp(`title="${title}"`));
  }

  for (const copy of [
    '累计节省人力', '昨日、周、月', '机器人视图', '运行数据视图',
    '登录异常', '取数执行异常', '入库异常', '入库校验异常',
    '已提交重试', '运行记录', '涉及店铺', '涉及入库表',
  ]) {
    assert.match(prdSource, new RegExp(copy));
  }

  assert.match(prdSource, /进入概览.*选择昨日\/周\/月.*查看运行指标.*机器人\/运行数据视图.*数据完成率与异常率.*运行记录/s);
  assert.doesNotMatch(prdSource, /支持自定义周期|提交带截图的需求反馈|展示数据完成率、今日涉及店铺|平台交付情况|2438:10205/);
});
```

- [ ] **Step 2: Run the test and confirm the old PRD fails**

Run: `npm run test:etl`

Expected: FAIL because the existing PRD still contains stale scope and omits current schedule, Tooltip, and anomaly-flow copy.

### Task 2: Rewrite the PRD content inside the existing template

**Files:**
- Modify: `src/pages/qsbOverviewPrd/index.tsx`

**Interfaces:**
- Consumes: the current prototype behavior in `qsbOverview/index.tsx`, `overviewContent.ts`, and `App.tsx`.
- Produces: unchanged PRD component/template with rewritten copy and tables.

- [ ] **Step 1: Keep version and replace scope and user stories**

Keep `changeRows` unchanged. Replace `scopeRows` and `storyRows` with:

```ts
const scopeRows = [
  ['功能模块', '功能点', '端', '产品线', '新增/优化', '优先级'],
  ['前台-概况', '账户价值、资产与公告、周期运行指标、机器人排期、运行数据趋势、数据完成率及异常处置', 'PC 端', '全产品线', '优化', 'P0'],
];

const storyRows = [
  ['角色', '场景', '期望结果'],
  ['电商业务负责人', '续费、阶段复盘或经营汇报前，需要判断取数宝是否持续创造价值。', '进入概览即可看到累计节省人力、资产使用情况，以及昨日、周、月的运行结果与同期变化。'],
  ['运营人员', '需要判断机器人负载是否合理，并定位某个周期内的具体计划安排。', '可按昨日、周、月查看机器人排期，在机器人视图和运行数据视图间切换，并查看计划起止时间、耗时和最新结果。'],
  ['异常处理人员', '数据完成率下降或异常率升高时，需要快速识别异常环节并继续处理。', '可按四个处理环节查看异常原因，提交重试，或携带当前筛选条件进入运行记录定位目标详情。'],
];
```

- [ ] **Step 2: Replace scenario rows with the current prototype rules**

Use these ten rows:

```ts
const scenarioRows = [
  ['页面/事项', '规则', '验收口径'],
  ['账户价值', '展示企业名称、版本、累计节省人力和到期时间；累计节省人力支持查看计算说明；保留续期入口。', '累计节省人力按成功执行计划的标准人工时长合计÷480 分钟/天计算；当前原型为 74,640÷480=155.5 天。'],
  ['我的资产', '展示店铺、连接器、云桌面和机器人的使用量/总量，并保留增购入口。', '四类资产分别显示 155/200、125/200、83/120、48/60；概览不承担资产分配、释放和配置。'],
  ['公告与资源中心', '公告按发布日期倒序展示；点击公告打开消息中心对应公告，点击更多打开公告分类；资源中心提供帮助文档和 SLA 服务手册。', '公告详情被打开后更新为已读；更多默认定位公告分类；两个资源链接在新窗口打开。'],
  ['周期运行指标', '周期仅支持昨日、周、月，默认选中月；四项指标为计划运行次数、入库成功次数、入库数据量、取数失败次数，并展示与上一周期的变化。', '切换周期后四项指标、对比文案、机器人排期和运行数据趋势同步更新；计划运行次数=入库成功次数+取数失败次数。'],
  ['机器人排期', '默认展示机器人视图；昨日为单日24小时时间轴，周为周日到周六×24小时时间轴，月为7×6自然月历；机器人作为外层分组。', '卡片按起止时间定位；计划名称、起止时间和耗时可见；超出运行上限的机器人显示超限提示。'],
  ['排期导航与全屏', '昨日按日、周按7天、月按自然月前后切换；不得进入今天之后的日视图、下一周或下一月；全屏仅作用于机器人排期容器。', '达到当前允许的最晚周期后下一周期按钮禁用；进入或按Esc退出全屏时按钮状态同步。'],
  ['计划卡片与详情', '短卡片单行省略，达到双行高度后展示计划名和时间/耗时两行；悬浮或键盘聚焦展示完整详情。', '详情包含计划名称、运行次数、最新结果；失败时显示错误码，并完整展示涉及店铺与涉及入库表。'],
  ['运行数据视图', '切换到运行数据视图后，按当前周期展示总运行、取数失败、重试和入库成功四条趋势。', '图表周期与顶部周期一致；图例和曲线口径一致；运行数据视图不展示机器人超限提示、计划周期图例和全屏按钮。'],
  ['数据完成与异常', '同一区域展示数据完成率和数据异常率、对应分子/分母及同期变化；右侧展示异常分类和明细。', '完成率由完成数据表/总数据表计算；异常率由异常数据表/总数据表计算；百分比不得脱离分子分母单独配置。'],
  ['异常明细与处置', '异常分为登录异常、取数执行异常、入库异常、入库校验异常；明细展示店铺、异常类型和原因，并提供重试、查看。', '重试后提示“已提交重试”；查看时进入运行记录，保留日期、异常环节、计划、店铺和目标运行记录，并打开对应详情。'],
];
```

- [ ] **Step 3: Replace background and goal copy without adding sections**

Use this background paragraph:

```tsx
<p className={styles.paragraph}>
  取数宝的账户价值、资产使用、计划运行、机器人负载、数据交付和异常处置分散在多个业务页面。业务负责人进行续费、阶段复盘或经营汇报时，需要跨页面汇总信息；运营人员发现运行波动后，也难以从总体指标直接定位到机器人排期、具体计划和异常记录。因此需要重构概览，使用户在一个入口完成价值判断、运行检查和异常处置。
</p>
```

Use this goal paragraph, including the core flow inside the existing section:

```tsx
<p className={styles.paragraph}>
  建立以账户价值、周期运行、机器人排期和数据异常为主线的概览：让业务负责人看清使用价值，让运营人员判断运行负载，让异常处理人员从异常指标进入具体处置。核心流程为：进入概览 → 选择昨日/周/月 → 查看运行指标及同期变化 → 切换机器人/运行数据视图 → 查看计划详情 → 检查数据完成率与异常率 → 提交重试或进入运行记录。
</p>
```

- [ ] **Step 4: Replace non-functional and out-of-scope rows**

```ts
const nonFunctionalRows = [
  ['类型', '详细说明'],
  ['性能', '运行图表异步加载，不阻塞账户、资产、公告和异常明细首屏展示；周期和视图切换应及时反馈。'],
  ['一致性', '计划运行、入库成功、取数失败、数据完成率和数据异常率等术语与计划中心、运行记录和数据监控保持一致。'],
  ['可用性', '排期区域支持横向与纵向滚动；短计划卡片按高度控制单/双行并省略，完整信息始终可通过Tooltip查看。'],
  ['可访问性', '周期、视图、全屏、异常Tab、计划卡片及明细操作支持键盘访问；选中态、趋势和异常状态不只依赖颜色表达。'],
  ['数据口径', '页面指标必须由同一周期事实派生；分子、分母、汇总指标和趋势明细保持可核对。'],
];

const outOfScopeRows = [
  ['事项', '说明'],
  ['生产接口与持久化', '本需求验证概览产品结构与交互，不新增或确认生产后端接口、实时数据接入和持久化能力。'],
  ['自定义周期', '本期仅支持昨日、周、月，不提供任意日期范围选择。'],
  ['概览数据导出', '本期不提供指标、排期和异常明细导出。'],
  ['财务收益核算', '累计节省人力只按标准人工时长折算天数，不折算薪资、收入或利润。'],
  ['资产配置', '概览提供资产查看和增购入口，不承担资产分配、释放、规格变更和连接配置。'],
  ['异常规则配置', '概览展示既有异常分类与处置入口，不提供异常分类、阈值和重试策略配置。'],
  ['新增权限', '沿用现有产品线、菜单和运行记录权限，不新增独立概览权限。'],
];
```

- [ ] **Step 5: Run tests and confirm the PRD contract passes**

Run: `npm run test:etl`

Expected: all tests PASS.

### Task 3: Verify template preservation and PRD rendering

**Files:**
- Verify only: `src/pages/qsbOverviewPrd/index.tsx`
- Verify only: `src/pages/qsbOverviewPrd/index.module.less`

**Interfaces:**
- Consumes: rewritten PRD content from Task 2.
- Produces: source, build, and 5178 in-app-browser verification evidence.

- [ ] **Step 1: Confirm only PRD copy changed for this task**

Run:

```bash
git diff --check -- src/pages/qsbOverviewPrd/index.tsx tests/qsbOverviewContent.test.ts docs/superpowers/plans/2026-08-29-qsb-overview-prd-rewrite.md
git diff -- src/pages/qsbOverviewPrd/index.module.less
```

Expected: no whitespace errors and no PRD style changes introduced by this task.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build PASS. Existing VChart chunk-size warnings are non-blocking if no new error appears.

- [ ] **Step 3: Verify the PRD in the Codex in-app browser**

Open `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prd`. Verify all eight existing sections render in their original order; tables remain readable; the core flow, day/week/month, robot/data views, plan Tooltip, four anomaly categories, retry, and run-record drilldown are visible; stale scope is absent.

- [ ] **Step 4: Compare PRD against the prototype**

Switch to `tab=prototype` and verify every PRD scenario row has a visible prototype counterpart. Treat mock values as prototype evidence only; do not report production implementation.

- [ ] **Step 5: Preserve the dirty worktree boundary**

Because `src/pages/qsbOverviewPrd/index.tsx` and `tests/qsbOverviewContent.test.ts` already contain uncommitted work, do not create an implementation commit that would capture unrelated changes. Report the completed scoped diff and leave implementation changes unstaged unless the user explicitly asks for selective staging or a commit.
