# 概览 Mock 数据一致性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将概览页所有时间、合计、比例、环比、平台分布和排期位置改为可从基础 mock 事实自动推导并相互校验的数据模型。

**Architecture:** `overviewContent.ts` 作为唯一事实源，保存账户、周期、运行、交付、平台、异常和排期基础数据，并导出纯计算函数。`index.tsx` 只消费派生结果，不再手写比例或排期百分比；`qsbOverviewContent.test.ts` 先锁定业务恒等式，再驱动最小实现。

**Tech Stack:** TypeScript、React、Node Test Runner、Vite、Arco Design、VChart

**Spec:** `docs/superpowers/specs/2026-08-25-qsb-overview-data-consistency-design.md`

## Global Constraints

- 数据时点固定为 `2026-08-25T10:00:00+08:00`，累计范围为近 365 天。
- 所有比例、环比、合计和排期百分比必须由基础事实计算。
- 四个异常 Tab 仍各 20 条，80 个运行记录 Key 全局唯一。
- 不新增页面板块，不改变局部全屏、内部滚动和整体布局。
- 412 原型源码当前属于父仓未跟踪目录；不得暂存或提交实现文件，只提交本计划文档。

---

### Task 1: 统一时间、账户和运行指标

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Modify: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Produces: `overviewDataClock`、`overviewAccountSummary`、`overviewAssets`、`overviewRunMetricsByPeriod`
- Produces: `calculateRate(numerator, denominator)`、`calculatePercentageChange(current, previous)`

- [ ] **Step 1: 写时间、账户和运行恒等式失败测试**

```ts
assert.deepEqual(overviewDataClock.cumulative, {
  startDate: '2025-08-26',
  endDate: '2026-08-25',
});
assert.equal(overviewAccountSummary.savedMinutes / overviewAccountSummary.workdayMinutes, 155.5);
assert.equal(overviewAccountSummary.expiresAt, '2027-08-21');
for (const period of Object.values(overviewRunMetricsByPeriod)) {
  assert.equal(period.current.success + period.current.failed, period.current.runs);
  assert.equal(period.previous.success + period.previous.failed, period.previous.runs);
}
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:etl`

Expected: FAIL，提示 `overviewDataClock` 或新的 `current/previous` 结构不存在。

- [ ] **Step 3: 实现单一事实源和计算函数**

```ts
export const calculateRate = (numerator: number, denominator: number) => numerator / denominator * 100;
export const calculatePercentageChange = (current: number, previous: number) => (current / previous - 1) * 100;

export const overviewDataClock = {
  asOf: '2026-08-25T10:00:00+08:00',
  daily: { startDate: '2026-08-25', endDate: '2026-08-25' },
  weekly: { startDate: '2026-08-19', endDate: '2026-08-25' },
  cumulative: { startDate: '2025-08-26', endDate: '2026-08-25' },
} as const;
```

运行指标按规格保存 `current`、`previous`，通过映射生成页面所需的四项指标和环比。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm run test:etl`

Expected: 新增时间、账户、资产和运行一致性测试通过，原有测试中的旧固定结构断言同步为新结构。

- [ ] **Step 5: 检查变更范围，不提交实现源码**

Run: `git status --short --untracked-files=all -- src/pages/qsbOverview tests/qsbOverviewContent.test.ts`

Expected: 仅目标原型文件保持未跟踪状态。

### Task 2: 重建完成率、交付和平台数据

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Modify: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Produces: `overviewDataCompletion`、`overviewStoreDelivery`、`overviewPlatformDelivery`
- Consumes: `calculateRate`

- [ ] **Step 1: 写数据概况失败测试**

```ts
assert.equal(calculateRate(overviewDataCompletion.completed, overviewDataCompletion.total).toFixed(1), '98.0');
assert.equal(Object.values(overviewStoreDelivery.statuses).reduce((sum, value) => sum + value, 0), overviewStoreDelivery.total);
assert.equal(overviewPlatformDelivery.platforms.reduce((sum, item) => sum + item.delivered, 0), overviewPlatformDelivery.delivered);
assert.equal(overviewPlatformDelivery.platforms.reduce((sum, item) => sum + item.total, 0), overviewPlatformDelivery.total);
assert.ok(new Set(overviewPlatformDelivery.platforms.map((item) => calculateRate(item.delivered, item.total).toFixed(1))).size > 1);
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:etl`

Expected: FAIL，提示数据概况导出不存在。

- [ ] **Step 3: 实现规格中的完成率、店铺和八平台基础数据**

完成率使用 `12,140/12,388`；店铺状态使用 `14/3/10`；平台明细使用规格中的八组分子/分母，并由聚合函数得到 `620/1,000`。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm run test:etl`

Expected: 所有完成率、合计和平台差异测试通过。

- [ ] **Step 5: 检查变更范围，不提交实现源码**

Run: `git status --short --untracked-files=all -- src/pages/qsbOverview tests/qsbOverviewContent.test.ts`

### Task 3: 用时间生成机器人排期位置

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Produces: `overviewRobotSchedules`
- Produces: `getScheduleBlockPosition(startTime, endTime): { left: number; width: number }`

- [ ] **Step 1: 写排期失败测试**

```ts
assert.deepEqual(getScheduleBlockPosition('06:00', '12:00'), { left: 25, width: 25 });
assert.equal(new Set(overviewRobotSchedules.map((robot) => robot.name)).size, overviewRobotSchedules.length);
for (const robot of overviewRobotSchedules) {
  assert.equal(robot.planCount, robot.blocks.length);
  for (const block of robot.blocks) assert.ok(block.startTime < block.endTime);
}
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:etl`

Expected: FAIL，提示排期函数或排期数据不存在。

- [ ] **Step 3: 实现时间解析和排期数据**

```ts
const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const getScheduleBlockPosition = (startTime: string, endTime: string) => ({
  left: toMinutes(startTime) / 1440 * 100,
  width: (toMinutes(endTime) - toMinutes(startTime)) / 1440 * 100,
});
```

将重复的 `Sophia Sun` 替换为唯一机器人，渲染文案改为“`N 个计划`”，样式只消费计算结果。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm run test:etl`

- [ ] **Step 5: 检查变更范围，不提交实现源码**

Run: `git status --short --untracked-files=all -- src/pages/qsbOverview tests/qsbOverviewContent.test.ts`

### Task 4: 重建公告与异常事件分布

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Modify: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Produces: 带 `platform`、`planName`、`occurredAt` 的 `overviewAnomalyGroups`
- Consumes: `overviewDataClock.asOf`

- [ ] **Step 1: 写公告和异常分布失败测试**

```ts
assert.ok(overviewAnnouncements.every((item) => item.publishedAt <= '2026-08-25'));
assert.ok(new Set(overviewAnnouncements.map((item) => item.publishedAt)).size === 10);
const rows = overviewAnomalyGroups.flatMap((group) => group.rows);
assert.equal(rows.length, 80);
assert.equal(new Set(rows.map((row) => row.runRecordKey)).size, 80);
assert.ok(rows.every((row) => row.platform && row.planName && row.occurredAt));
assert.ok(new Set(rows.map((row) => row.storeName)).size > 20);
assert.ok(overviewAnomalyGroups.every((group) => {
  const counts = group.rows.reduce<Record<string, number>>((result, row) => {
    result[row.issueType] = (result[row.issueType] ?? 0) + 1;
    return result;
  }, {});
  return Object.values(counts).some((count) => count !== 5);
}));
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:etl`

Expected: FAIL，提示异常事件字段或非均匀分布条件不成立。

- [ ] **Step 3: 实现分散公告日期、32 家店铺池和确定性非均匀异常模板**

每组通过不同 offset 选 20 家店铺；模板索引使用显式序列而不是 `% templates.length`；`buildOverviewRunFilters` 增加 `planName`。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm run test:etl`

- [ ] **Step 5: 检查变更范围，不提交实现源码**

Run: `git status --short --untracked-files=all -- src/pages/qsbOverview tests/qsbOverviewContent.test.ts`

### Task 5: 页面消费派生数据并同步 PRD

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverviewPrd/index.tsx`
- Test: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: Task 1-4 的所有数据与计算接口
- Produces: `buildOverviewViewModel(periodKey)`，作为页面唯一的派生数据入口

- [ ] **Step 1: 写页面 ViewModel 行为失败测试**

```ts
const dailyView = buildOverviewViewModel('daily');
assert.equal(dailyView.updatedAtLabel, '2026-08-25 10:00:00');
assert.equal(dailyView.completionRate.toFixed(1), '98.0');
assert.equal(dailyView.anomalyRate.toFixed(1), '11.5');
assert.equal(dailyView.runMetrics.find((item) => item.key === 'runs')?.change.toFixed(1), '4.0');
assert.deepEqual(dailyView.platformRates.map((item) => item.rate.toFixed(1)), [
  '68.6', '65.0', '62.7', '58.0', '59.1', '57.5', '60.0', '52.2',
]);
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:etl`

- [ ] **Step 3: 替换 `index.tsx` 中所有硬编码业务数字**

账户、资产、更新时间、运行指标、完成率、店铺交付、平台交付、异常率、环比和排期全部从 `overviewContent.ts` 读取；异常率显示一位小数，平台显示各自交付率。

- [ ] **Step 4: 同步 PRD**

新增 V2.2 变更记录，写明统一数据时点、近 365 天累计、基础事实派生指标及关键恒等式。

- [ ] **Step 5: 运行完整自动验证**

Run: `npm run test:etl && npm run build && git diff --check`

Expected: 0 个测试失败、TypeScript 和 Vite 构建成功；允许保留项目既有 VChart/Rollup 分包警告。

- [ ] **Step 6: 5178 真页验收**

打开 `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype`：

- 每日、每周、累计切换后指标和环比变化；运行 = 成功 + 失败。
- 更新时间为 2026-08-25，账号未过期，资产值与规格一致。
- 完成率显示 98.0%，异常率显示 11.5%，不再显示 30%。
- 八个平台交付率不同且合计为 620/1,000。
- 排期块边界与文字时间一致，机器人名称唯一、计划数准确。
- 四个异常 Tab 各 20 条，下钻携带计划、店铺和记录 Key。
- 控制台无 error。

- [ ] **Step 7: 核对 PRD 真页并保持原型标签页为交付页**

打开 `?requirement=qsbOverview&tab=prd` 核对 V2.2 和一致性规则，再返回 `tab=prototype`；不提交未跟踪实现源码。
