# QSB Overview Period Data And IconPark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the overview period tabs update realistic mock metrics and replace asset/resource icons with IconPark.

**Architecture:** Keep period mock content in `overviewContent.ts` as a typed record consumed by `index.tsx`. Keep the 24-hour robot schedule independent from period selection. Import only the required IconPark React components and reuse existing icon slots.

**Tech Stack:** React 18, TypeScript, Arco Design, `@icon-park/react`, Node test runner, Vite.

**Spec:** `docs/superpowers/specs/2026-08-25-qsb-overview-period-icons-design.md`

## Global Constraints

- Use the three approved mock datasets verbatim.
- The robot schedule stays on the current-day 24-hour view.
- Use IconPark outline icons with current color and preserve existing layout.
- Do not change unrelated page copy, navigation, charts, or styling.

---

### Task 1: Period mock model

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Test: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Produces: `OverviewPeriodKey` and `overviewRunMetricsByPeriod`.
- Consumes: The approved values and comparison labels in the spec.

- [ ] **Step 1: Write the failing test** asserting all three period records, values, units, changes, and comparison labels.
- [ ] **Step 2: Run `npm run test:etl` and confirm the new export is missing.**
- [ ] **Step 3: Add the typed period mock record with no runtime multiplier calculations.**
- [ ] **Step 4: Run `npm run test:etl` and confirm all tests pass.**

### Task 2: Period switch binding

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`

**Interfaces:**
- Consumes: `OverviewPeriodKey` and `overviewRunMetricsByPeriod`.
- Produces: Visible metric values and comparison labels driven by selected period state.

- [ ] **Step 1: Replace the local constant metric array with the selected period record.**
- [ ] **Step 2: Render that record's comparison label instead of the fixed “较上一周期”.**
- [ ] **Step 3: Keep `robotSchedules` and `overviewSchedule` independent from period state.**

### Task 3: IconPark replacement

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/pages/qsbOverview/index.tsx`

**Interfaces:**
- Consumes: Named components from `@icon-park/react`.
- Produces: IconPark icons in asset and resource-center slots.

- [ ] **Step 1: Install `@icon-park/react` using npm.**
- [ ] **Step 2: Confirm exact exported component names from the installed type declarations.**
- [ ] **Step 3: Replace only asset and resource-center Arco icon imports/usages.**
- [ ] **Step 4: Keep outline theme, current color, and the existing slot sizes.**

### Task 4: Verification

**Files:**
- Verify: `src/pages/qsbOverview/**`

**Interfaces:**
- Consumes: The completed page.
- Produces: Test, build, and in-app browser evidence.

- [ ] **Step 1: Run `npm run test:etl`.**
- [ ] **Step 2: Run `npm run build`.**
- [ ] **Step 3: In the existing in-app browser, click 每日 / 每周 / 累计 and verify all four metrics and comparison labels change.**
- [ ] **Step 4: Inspect asset and resource-center icon alignment and confirm no console errors.**
