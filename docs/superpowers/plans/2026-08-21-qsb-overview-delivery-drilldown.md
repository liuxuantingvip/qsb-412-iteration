# QSB Overview Delivery Drilldown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disconnected delivery-quality totals and arbitrary abnormal-plan list with a linked failure-breakdown and affected-plan drilldown.

**Architecture:** Keep the existing bottom two-column layout. Store the four failure categories and their plan details in the overview page model, drive the selected category with local React state, and reuse the existing `onViewRuns` callback for drilldown navigation.

**Tech Stack:** React 18, TypeScript, CSS Modules with Less, Arco Design, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-21-qsb-overview-delivery-drilldown-design.md`

## Global Constraints

- Only change the 412 runnable prototype, its PRD, and its focused tests.
- Keep the existing white Arco SaaS visual language and 12/16px type system.
- The four failure counts must total 1,517 and represent 5.3% of 28,765 plan runs.
- Do not add a fifth content row or new dependencies.

---

### Task 1: Lock the content model

**Files:**
- Modify: `tests/qsbOverviewContent.test.ts`
- Modify: `src/pages/qsbOverview/overviewContent.ts`

**Interfaces:**
- Produces: `overviewCopy.deliveryLossTitle`, `overviewCopy.affectedPlansTitle`, and row items `deliveryLossBreakdown`, `affectedPlans`.

- [ ] Add failing assertions for the new section titles and fourth-row item names.
- [ ] Run `npm run test:etl` and confirm the old content model fails those assertions.
- [ ] Update the content model with the new titles and row item names.
- [ ] Run `npm run test:etl` and confirm all focused tests pass.

### Task 2: Build the linked bottom row

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: the content labels from Task 1 and existing `onViewRuns?: () => void`.
- Produces: selectable failure rows and a filtered affected-plan list.

- [ ] Add four failure categories whose counts sum to 1,517, each with three affected-plan records.
- [ ] Add `selectedFailureKey` state defaulting to `collection` and derive the selected plan list.
- [ ] Replace the quality metric cards with selectable horizontal breakdown rows.
- [ ] Replace the abnormal list with the affected-plan detail list and “查看全部”.
- [ ] Add equal-height, responsive CSS for the two panels, visible focus states, selected state, and compact detail columns.
- [ ] Run `npm run test:etl` and `npm run build`.

### Task 3: Synchronize the PRD and verify the real page

**Files:**
- Modify: `src/pages/qsbOverviewPrd/index.tsx`
- Create: `audit/qsb-overview-delivery-drilldown.png`

**Interfaces:**
- Consumes: the implemented labels, counts, interaction, and navigation semantics.
- Produces: product requirements and visual acceptance evidence matching the prototype.

- [ ] Add a PRD version row describing the bottom-row drilldown change.
- [ ] Replace the “数据交付质量” scenario with the failure-composition and affected-plan linkage rules.
- [ ] Run `npm run test:etl`, `npm run build`, and `git diff --check`.
- [ ] In the in-app browser at `?requirement=qsbOverview&tab=prototype`, click at least two failure categories and verify the plan list changes.
- [ ] Capture a full-page screenshot and visually check alignment, overflow, focus, and information hierarchy.
