# QSB Overview Calendar Task Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify day, week, and month schedule task content and tooltip semantics while preserving their calendar layouts.

**Architecture:** Extract shared task content and tooltip components in `qsbOverview/index.tsx`. Extend deterministic schedule mock facts in `overviewContent.ts`, then apply the shared components to both time and month calendars.

**Tech Stack:** React, TypeScript, CSS Modules/Less, Arco Design Tooltip, Node test runner, Vite.

**Spec:** `docs/superpowers/specs/2026-08-28-qsb-overview-calendar-task-consistency-design.md`

## Global Constraints

- Work only in the 412 requirement prototype.
- Keep robots as the outer vertical grouping.
- Day and week retain their 24-hour time axes; month retains its 7 × 6 natural-month calendar.
- Latest work result is singular, not an aggregate success/failure count.
- Store collections must remain fully accessible when large.

---

### Task 1: Lock the latest-work and multi-store facts

**Files:**
- Modify: `tests/qsbOverviewContent.test.ts`
- Modify: `src/pages/qsbOverview/overviewContent.ts`

**Interfaces:**
- Produces: `latestWorkResult: 'success' | 'failed'` on every schedule block with tooltip metadata.

- [ ] Add failing assertions that monthly, daily, and weekly blocks expose `runCount`, `latestWorkResult`, and non-empty `stores`.
- [ ] Add a fixture assertion proving at least one block contains all 8 mock stores.
- [ ] Run `npm run test:etl` and confirm the new assertions fail.
- [ ] Add deterministic runtime facts to daily, weekly, and monthly blocks.
- [ ] Run `npm run test:etl` and confirm the assertions pass.

### Task 2: Share task content and Tooltip rendering

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`
- Modify: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: `runCount`, `latestWorkResult`, and `stores`.
- Produces: `ScheduleTaskContent` and `ScheduleTaskTooltip` shared by time and month calendars.

- [ ] Add source assertions for both shared components and the copy `最新运行结果`.
- [ ] Add style assertions for a wrapping, height-limited store collection.
- [ ] Run the targeted test and confirm it fails.
- [ ] Extract the shared content and Tooltip components.
- [ ] Render them from `TimeRobotCalendar` and `MonthlyRobotCalendar`.
- [ ] Replace the aggregate success/failure count with the singular latest-work result.
- [ ] Run `npm run test:etl` and confirm all tests pass.

### Task 3: Verify runtime and visual consistency

**Files:**
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: the completed shared task UI.
- Produces: passing build and visual QA evidence.

- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Verify port 5178 is served from the 412 project.
- [ ] In the in-app browser, inspect day, week, and month task content at the same viewport.
- [ ] Hover a successful latest work, a failed latest work, and a task with many stores.
- [ ] Record findings in `design-qa.md`; fix P0/P1/P2 issues until `final result: passed`.
