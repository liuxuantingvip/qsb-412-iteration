# 概览中心周视图整月排期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将机器人“每周”视图改为可双向滚动的当月完整排期日历，并完整展示每天 10 至 20 个任务。

**Architecture:** 周视图数据层输出当月 31 个日期和带日期、分钟区间的任务事实；纯函数计算每日任务顺序、时间冲突组和每台机器人的动态行高。React 仅消费布局结果，CSS 使用固定日期列宽、sticky 表头和机器人列实现双向滚动。

**Tech Stack:** React, TypeScript, CSS Modules/Less, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-26-qsb-overview-monthly-calendar-design.md`

## Global Constraints

- 仅修改 `qsbOverview` 周视图和所有周期共用的任务卡白底样式。
- 周视图横轴固定为 2026-08-01 至 2026-08-31。
- 每个日期列固定 180px，超出视口必须横向滚动。
- 机器人行按单日最大任务布局高度动态撑高，排期容器必须支持纵向滚动。
- 每日和累计数据模型保持不变。
- 不提交 Git；当前 412 原型目录整体未纳入可隔离的 Git baseline。

---

### Task 1: 整月 mock 与冲突布局契约

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts:71-189`
- Test: `tests/qsbOverviewContent.test.ts:288-398`

**Interfaces:**
- Produces: `getOverviewScheduleAxis('weekly')` 返回 31 个日期；`getOverviewRobotSchedules('weekly')` 返回每天 10 至 20 个任务。
- Produces: `buildWeeklyRobotLayout(robot)` 返回 `{ rowHeight, blocks }`，每个 block 包含 `dayIndex`, `top`, `conflictIndex`, `conflictCount`。
- Consumes: `OverviewRobotSchedule` 的任务日期、开始时间、结束时间、名称和类型。

- [ ] **Step 1: 写失败测试**

```ts
test('builds a full-month weekly calendar with dynamic robot rows', () => {
  const axis = getOverviewScheduleAxis('weekly');
  assert.equal(axis.labels.length, 31);
  assert.deepEqual(axis.labels.slice(0, 2), ['08/01', '08/02']);
  assert.equal(axis.labels.at(-1), '08/31');

  for (const robot of getOverviewRobotSchedules('weekly')) {
    for (let dayIndex = 0; dayIndex < 31; dayIndex += 1) {
      const tasks = robot.blocks.filter((block) => block.startSlot === dayIndex);
      assert.ok(tasks.length >= 10 && tasks.length <= 20);
      assert.ok(tasks.every((block) => block.endSlot === dayIndex + 1));
    }
    const layout = buildWeeklyRobotLayout(robot);
    assert.ok(layout.rowHeight > 64);
    assert.ok(layout.blocks.some((block) => block.conflictCount > 1));
  }
});
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `node --test --experimental-strip-types --test-name-pattern='full-month weekly calendar' tests/qsbOverviewContent.test.ts`

Expected: FAIL，因为周视图仍只有 7 天且没有 `buildWeeklyRobotLayout`。

- [ ] **Step 3: 实现整月轴和确定性 mock**

```ts
const augustLabels = Array.from({ length: 31 }, (_, index) => `08/${String(index + 1).padStart(2, '0')}`);

weekly: {
  labels: augustLabels,
  unitWidth: 180,
}
```

为每台机器人、每天生成 10 至 20 个确定性任务；开始、结束时间来自固定时间模板，其中至少一组时间重叠，不创建跨日任务。

- [ ] **Step 4: 实现纯布局函数**

```ts
export function buildWeeklyRobotLayout(robot: OverviewRobotSchedule) {
  // 按 dayIndex 分组，再按开始分钟排序。
  // 使用区间重叠判断建立冲突组；非冲突任务顺序排列。
  // 每个任务返回 top/conflictIndex/conflictCount，rowHeight 取单日最大底部位置。
}
```

- [ ] **Step 5: 运行目标测试**

Run: `node --test --experimental-strip-types --test-name-pattern='full-month weekly calendar|models the robot schedule axis' tests/qsbOverviewContent.test.ts`

Expected: PASS。

---

### Task 2: 动态日历渲染与白底任务卡

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx:103-113`
- Modify: `src/pages/qsbOverview/index.module.less:79-109`
- Test: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: `buildWeeklyRobotLayout(robot)`。
- Produces: 周视图动态 `scheduleRow` 高度和按日期列定位的任务卡；每日、累计继续使用现有定位。

- [ ] **Step 1: 写失败的源码契约测试**

```ts
test('renders weekly rows from the dynamic calendar layout', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/pages/qsbOverview/index.module.less', import.meta.url), 'utf8');
  assert.match(pageSource, /buildWeeklyRobotLayout/);
  assert.match(pageSource, /rowHeight/);
  assert.match(styles, /background:\s*#fff/);
  assert.match(styles, /overflow:\s*auto/);
});
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `node --test --experimental-strip-types --test-name-pattern='renders weekly rows' tests/qsbOverviewContent.test.ts`

Expected: FAIL，因为页面尚未消费周视图动态布局。

- [ ] **Step 3: 在 React 中接入动态布局**

周视图对每台机器人调用 `buildWeeklyRobotLayout`，将 `rowHeight` 写入 `.scheduleRow`，将日期列定位和布局函数返回的 `top` 写入任务卡；每日和累计保留现有分支。

- [ ] **Step 4: 更新滚动与卡片样式**

```less
.schedule { overflow: auto; }
.scheduleCanvas { width: calc(120px + var(--schedule-content-width)); }
.taskBlock { background: #fff; border: 1px solid #e5e6eb; box-shadow: 0 3px 10px rgba(29, 33, 41, .12); }
.weeklyTask { height: 44px; }
.weeklyTaskConflict { transform: translateX(calc(var(--conflict-index) * 4px)); }
```

将排期区域高度用于滚动内容，移除周视图底部固定空白。

- [ ] **Step 5: 运行目标测试与构建**

Run: `node --test --experimental-strip-types --test-name-pattern='full-month weekly calendar|renders weekly rows|derives non-overlapping robot schedule positions' tests/qsbOverviewContent.test.ts && npm run build`

Expected: 目标测试与构建通过。

---

### Task 3: 5178 真页验收

**Files:**
- Verify: `src/pages/qsbOverview/overviewContent.ts`
- Verify: `src/pages/qsbOverview/index.tsx`
- Verify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: Task 1 的整月数据和 Task 2 的动态布局。
- Produces: 当前内嵌浏览器中的可验收周视图。

- [ ] **Step 1: 核对真实服务**

Run: `lsof -nP -iTCP:5178 -sTCP:LISTEN`，再核对 PID 的 cwd 为当前 412 子项目。

- [ ] **Step 2: 在内嵌浏览器切换周视图**

打开 `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype`，选择“每周”和“机器人视图”。

- [ ] **Step 3: 验证数据与布局**

确认日期为 08/01—08/31；每台机器人每天 10—20 个任务；机器人行被任务真实撑高；任务卡白底有阴影；冲突任务存在错位堆叠。

- [ ] **Step 4: 验证双向滚动和对齐**

确认 `scrollWidth > clientWidth`、`scrollHeight > clientHeight`；滚动后日期表头与任务列对齐、机器人名称仍可辨认。

- [ ] **Step 5: 回归每日与累计**

切换“每日”和“累计”，确认 24 小时与 12 个月轴、指标和任务数据仍分别变化。
