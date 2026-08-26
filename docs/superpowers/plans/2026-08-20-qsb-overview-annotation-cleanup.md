# QSB Overview Annotation Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the “概览中心” title, remove unused right-rail whitespace, unify help/feedback actions, and keep the runtime chart inside its card.

**Architecture:** Keep the existing overview information architecture and 60:40 right rail. Extend the overview content contract for the approved title and layout invariants, then make surgical JSX/CSS changes; use in-app-browser geometry as the visual acceptance test.

**Tech Stack:** React, TypeScript, Arco Design React, Less modules, VisActor React VChart, Node test runner, Vite.

**Spec:** `docs/superpowers/specs/2026-08-20-qsb-overview-reference-style-design.md`

## Global Constraints

- The global row title is exactly `概览中心`.
- The right rail keeps the approved 60:40 asset/service height ratio.
- Assets remain a 2×2 grid; help center remains an external link and feedback remains a modal trigger.
- The runtime chart keeps 24px card padding and must not exceed its content box.
- No unrelated refactor or new dependency.

---

### Task 1: Lock the approved UI contract and add the title

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Modify: `src/pages/qsbOverview/index.tsx`
- Test: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: existing `qsbOverviewContent` layout contract.
- Produces: `qsbOverviewContent.pageTitle: '概览中心'` and visible title text in the global toolbar.

- [ ] **Step 1: Write the failing contract test**

```ts
assert.equal(qsbOverviewContent.pageTitle, '概览中心');
assert.equal(qsbOverviewContent.assetPanel.fillAvailableHeight, true);
assert.equal(qsbOverviewContent.servicePanel.uniformActions, true);
assert.equal(qsbOverviewContent.trendPanel.clipToContent, true);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types tests/qsbOverviewContent.test.ts`

Expected: FAIL because the four approved contract fields do not exist.

- [ ] **Step 3: Add the minimum contract fields**

```ts
pageTitle: '概览中心',
assetPanel: { ...existingAssetPanel, fillAvailableHeight: true },
servicePanel: { ...existingServicePanel, uniformActions: true },
trendPanel: { clipToContent: true },
```

- [ ] **Step 4: Render the title in the global row**

```tsx
<div className={styles.periodToolbar}>
  <h1>{qsbOverviewContent.pageTitle}</h1>
  <RangePicker ... />
</div>
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test --experimental-strip-types tests/qsbOverviewContent.test.ts`

Expected: all overview content tests pass.

### Task 2: Fill the asset area and normalize service actions

**Files:**
- Modify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: existing `.assetSection`, `.assetGrid`, `.serviceActions` markup.
- Produces: a stretched 2×2 asset grid and identical anchor/button action boxes.

- [ ] **Step 1: Make the asset section a two-row grid**

```less
.assetSection {
  display: grid;
  grid-template-rows: 24px minmax(0, 1fr);
  gap: 12px;
}

.assetGrid {
  grid-template-rows: repeat(2, minmax(0, 1fr));
  margin-top: 0;
}
```

- [ ] **Step 2: Normalize both service action elements**

```less
.serviceActions > :global(.arco-btn) {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
```

- [ ] **Step 3: Verify right-rail geometry in the in-app browser**

At 1963×1320, evaluate asset section and grid rectangles. Expected: asset grid bottom gap is at most 18px; the two service items have equal width, height, `display`, and `align-items`.

### Task 3: Contain the runtime chart and complete regression verification

**Files:**
- Modify: `src/pages/qsbOverview/index.module.less`
- Modify: `audit/qsb-overview-design-qa.md`

**Interfaces:**
- Consumes: existing `.trendSection` and `.chartWrap` grid structure.
- Produces: a shrinkable chart grid item whose canvas stays inside the card content box.

- [ ] **Step 1: Constrain the chart grid item**

```less
.chartWrap {
  min-width: 0;
  overflow: hidden;
}
```

- [ ] **Step 2: Run automated regression checks**

Run: `npm run test:etl && npm run build`

Expected: 16 tests pass and Vite production build succeeds; existing large-chunk warnings are allowed.

- [ ] **Step 3: Reload and measure the real page**

At 1963×1320, measure the trend section, chart wrapper, and canvas. Expected: canvas left/right/bottom remain inside the 24px content boundary with at most 1px rendering error; no horizontal page overflow; console has no errors.

- [ ] **Step 4: Verify interactions**

Expected: help center still has `target="_blank"` and `rel="noopener noreferrer"`; clicking `需求反馈` opens one dialog; floating fullscreen remains `position: fixed`.

- [ ] **Step 5: Record measured results in Design QA**

Update `audit/qsb-overview-design-qa.md` with the final asset bottom gap, service item geometry, and chart boundary measurements.

