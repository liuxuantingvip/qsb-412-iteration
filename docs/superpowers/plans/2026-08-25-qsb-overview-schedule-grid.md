# QSB Overview Schedule Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the overview schedule into a scrollable 24-hour-by-robot grid.

**Architecture:** Keep the existing schedule data and card. Add one shared schedule contract for hour count, row axis, and scroll axes; render the header and rows inside one fixed-width canvas so both axes use identical column sizing.

**Tech Stack:** React, TypeScript, CSS Modules/Less, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-25-qsb-overview-schedule-grid-design.md`

## Global Constraints

- Only change the run schedule inside `qsbOverview`.
- Horizontal axis is 24 hours; vertical axis is robots.
- The schedule viewport supports horizontal and vertical scrolling.
- Robot header, hour header, robot names, and task grid share the same dimensions.

---

### Task 1: Schedule contract and rendering

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`
- Test: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Produces: `overviewSchedule` with `hourCount`, `rowAxis`, and `scrollAxes`.
- Consumes: existing `robotSchedules` task data.

- [x] **Step 1: Write the failing test**

Add an assertion that `overviewSchedule` defines 24 hours, robots as rows, and both scroll axes.

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:etl`

Expected: FAIL because `overviewSchedule` does not exist.

- [x] **Step 3: Write minimal implementation**

Export the schedule contract, render 24 hour labels in a shared canvas, and add a two-axis scroll viewport with sticky time header and robot column.

- [x] **Step 4: Run tests and build**

Run: `npm run test:etl && npm run build`

Expected: all tests pass and Vite build succeeds.

- [x] **Step 5: Verify the live page**

Open `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype`; verify the robot header is first, all 24 hours exist, and both scroll directions work.

### Task 2: Weekly single-day task stacks

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`
- Test: `tests/qsbOverviewContent.test.ts`

- [x] **Step 1: Add a failing contract test**

Require three single-day tasks for every robot and date in the weekly mock.

- [x] **Step 2: Replace weekly cross-day blocks with daily stacks**

Keep the robot row height fixed and expose each layer with a small vertical offset.

- [x] **Step 3: Add independent card elevation**

Give every task card a shadow and raise the hovered weekly card above its stack.

- [x] **Step 4: Run tests, build, and verify weekly robot view**

### Task 3: Cumulative monthly task stacks

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`
- Test: `tests/qsbOverviewContent.test.ts`

- [x] **Step 1: Add a failing cumulative contract test**

Require three same-month tasks for every robot and month in the cumulative mock.

- [x] **Step 2: Replace cross-month blocks with monthly stacks**

Keep the robot row height fixed and reuse the weekly stack offset and shadow treatment.

- [x] **Step 3: Verify all three period models on the live page**

Confirm daily uses 24 hours, weekly uses 7 dates with 21 plans per robot, and cumulative uses 12 months with 36 plans per robot.

- [x] **Step 4: Build and visually inspect the cumulative robot view**
