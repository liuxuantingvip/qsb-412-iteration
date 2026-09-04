# QSB Overview Schedule Card Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make day and week schedule cards switch between one-line and two-line content according to their rendered time-based height.

**Architecture:** Add a pure layout classifier beside the existing time-event position calculation in `overviewContent.ts`. `TimeRobotCalendar` consumes that classifier and asks the shared task-content component for compact or regular markup, while CSS Modules own the corresponding truncation behavior.

**Tech Stack:** React 18, TypeScript, CSS Modules/Less, Node test runner, Vite.

**Spec:** `docs/superpowers/specs/2026-08-29-qsb-overview-schedule-card-height-design.md`

## Global Constraints

- Use `44px` as the single-line/two-line threshold.
- A card below `44px` shows one combined line with ellipsis.
- A card at or above `44px` shows title and time on two separately truncated lines.
- Keep the existing Tooltip as the complete-information path.
- Change only day and week time-calendar cards; do not change month view, data view, mock schedules, time scale, or Tooltip content.
- Preserve unrelated uncommitted changes in the 412 prototype.

---

### Task 1: Classify time-event information density

**Files:**
- Modify: `tests/qsbOverviewContent.test.ts`
- Modify: `src/pages/qsbOverview/overviewContent.ts`

**Interfaces:**
- Consumes: `startTime: string`, `endTime: string`, and the existing `40px`-per-hour time scale.
- Produces: `getOverviewTimeEventLayout(startTime: string, endTime: string): { top: number; height: number; compact: boolean }`.

- [ ] **Step 1: Write the failing boundary test**

Add the following import and test to `tests/qsbOverviewContent.test.ts`:

```ts
import { getOverviewTimeEventLayout } from '../src/pages/qsbOverview/overviewContent.ts';

test('uses one line below 44px and two lines from 44px', () => {
  assert.equal(getOverviewTimeEventLayout('02:05', '03:00').compact, true);
  assert.equal(getOverviewTimeEventLayout('02:00', '03:05').compact, true);
  assert.equal(getOverviewTimeEventLayout('02:00', '03:06').compact, false);
});
```

- [ ] **Step 2: Run the test and confirm the missing export fails**

Run: `npm run test:etl`

Expected: FAIL because `getOverviewTimeEventLayout` is not exported.

- [ ] **Step 3: Implement the classifier next to the existing position helper**

Add the explicit scale and threshold, then return the existing percentage geometry plus the compact flag:

```ts
export const overviewTimeCalendarPixelsPerHour = 40;
export const overviewTimeEventTwoLineMinHeight = 44;

export function getOverviewTimeEventLayout(startTime: string, endTime: string) {
  const position = getOverviewTimeEventPosition(startTime, endTime);
  const durationMinutes = Math.max(0, toMinutes(endTime.match(/(\d{2}:\d{2})(?::\d{2})?$/)?.[1] ?? endTime)
    - toMinutes(startTime.match(/(\d{2}:\d{2})(?::\d{2})?$/)?.[1] ?? startTime));
  return {
    ...position,
    compact: durationMinutes / 60 * overviewTimeCalendarPixelsPerHour < overviewTimeEventTwoLineMinHeight,
  };
}
```

- [ ] **Step 4: Run tests and confirm the boundary passes**

Run: `npm run test:etl`

Expected: all tests PASS, including 55 minutes and the 65/66-minute boundary.

### Task 2: Render compact and regular task content

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`
- Modify: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: `getOverviewTimeEventLayout(...).compact` from Task 1.
- Produces: `ScheduleTaskContent({ block, compact? })`, `compactScheduleTaskItem`, and overflow-safe one-line/two-line markup.

- [ ] **Step 1: Add source and style regression assertions**

Extend `tests/qsbOverviewContent.test.ts` with assertions that the page calls `getOverviewTimeEventLayout`, passes `compact`, and the Less file defines overflow handling on `.compactScheduleTaskItem > span`.

```ts
test('switches schedule task content between compact and regular layouts', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/pages/qsbOverview/index.module.less', import.meta.url), 'utf8');
  assert.match(pageSource, /getOverviewTimeEventLayout/);
  assert.match(pageSource, /compact=\{position\.compact\}/);
  assert.match(styles, /\.compactScheduleTaskItem\s*>\s*span\s*\{[^}]*white-space:\s*nowrap[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/s);
});
```

- [ ] **Step 2: Run tests and confirm the UI assertions fail**

Run: `npm run test:etl`

Expected: FAIL because compact markup and styles do not exist.

- [ ] **Step 3: Implement minimal conditional markup**

Update `ScheduleTaskContent` so compact time-calendar cards render one combined text span; retain the existing two-row markup when `compact` is false or omitted so month cards remain unchanged.

```tsx
function ScheduleTaskContent({ block, compact = false }: { block: ScheduleTaskBlock; compact?: boolean }) {
  const timeAndDuration = <><time>{getScheduleClock(block.startTime)}~{getScheduleClock(block.endTime)}</time>（{formatOverviewTaskDuration(block.startTime, block.endTime)}）</>;
  if (compact) return <><i /><span>{block.label} {timeAndDuration}</span></>;
  return <><i /><span>{block.label}</span><small>{timeAndDuration}</small></>;
}
```

In `TimeRobotCalendar`, replace `getOverviewTimeEventPosition` with `getOverviewTimeEventLayout`, add the compact class only when needed, and pass `compact={position.compact}`. Leave `MonthlyRobotCalendar` unchanged.

- [ ] **Step 4: Add the compact overflow rule without changing regular cards**

```less
.compactScheduleTaskItem { grid-template-columns: 6px minmax(0, 1fr); }
.compactScheduleTaskItem > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scheduleTaskItem small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

- [ ] **Step 5: Run tests and type/build verification**

Run: `npm run test:etl`

Expected: all tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite build PASS.

### Task 3: Verify the 5178 prototype behavior

**Files:**
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: completed day/week schedule-card behavior.
- Produces: current-source, build, and in-app-browser evidence.

- [ ] **Step 1: Confirm the listener belongs to the 412 project**

Run: `lsof -nP -iTCP:5178 -sTCP:LISTEN`, then inspect the returned PID working directory with `ps -o pid=,cwd= -p <pid>`.

Expected: the working directory is `/Users/sensen/Desktop/storedata/qsb-requirement-iterations/412 迭代需求文件`.

- [ ] **Step 2: Check the scoped diff**

Run: `git diff --check -- src/pages/qsbOverview/index.tsx src/pages/qsbOverview/index.module.less src/pages/qsbOverview/overviewContent.ts tests/qsbOverviewContent.test.ts design-qa.md`

Expected: no whitespace errors and no unrelated files touched by this task.

- [ ] **Step 3: Verify day and week in the Codex in-app browser**

Open `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype`. Confirm the 55-minute `02:05~03:00` card is one line with ellipsis when narrow, a task at least 66 minutes tall uses two lines, neither layout overflows, and hover/focus still reveals the complete Tooltip.

- [ ] **Step 4: Record concise QA evidence**

Append the source revision, URL, period views checked, 55-minute result, 66-minute boundary result, Tooltip result, tests, build, and final result to `design-qa.md` without rewriting existing entries.

- [ ] **Step 5: Commit only task-scoped files**

```bash
git add src/pages/qsbOverview/index.tsx src/pages/qsbOverview/index.module.less src/pages/qsbOverview/overviewContent.ts tests/qsbOverviewContent.test.ts design-qa.md docs/superpowers/plans/2026-08-29-qsb-overview-schedule-card-height.md
git commit -m "fix: 按高度调整排期卡片信息密度" -m "复现路径：日或周排期中查看 55 分钟阶段卡片，固定两行内容会发生拥挤或溢出。" -m "修复思路：以 44px 为阈值切换单行与双行结构，并分别限制文本溢出。"
```
