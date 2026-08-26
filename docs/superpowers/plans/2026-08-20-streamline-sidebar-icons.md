# Streamline Sidebar Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five product sidebar line icons with approved Streamline Core Flat - Free SVG icons rendered at 16×16.

**Architecture:** Store the five licensed SVG assets locally and render them through one small sidebar icon component. Keep the existing Arco menu structure and spacing contract, changing only the icon source, size, and alignment styles.

**Tech Stack:** React 18, TypeScript, Vite, Less, Node test runner

**Spec:** User-approved mapping in the current task: Dashboard 3, Store 1, Blank Calendar, Database, Vertical Slider Square; all 16×16 and from Streamline Core Flat - Free.

## Global Constraints

- Use original SVG assets from Streamline Core Flat - Free.
- Render every sidebar icon at exactly 16×16.
- Preserve the native flat two-color fills.
- Keep the current menu labels, hierarchy, row heights, and collapse behavior unchanged.
- Verify in the Codex in-app browser at the actual 5178 prototype URL.

---

### Task 1: Lock the icon contract

**Files:**
- Modify: `tests/productSidebarIcons.test.ts`

**Interfaces:**
- Consumes: the current sidebar source and global styles.
- Produces: a regression contract for exact icon mapping, SVG source, 16×16 rendering, and collapse spacing.

- [x] Replace the old Tabler assertions with the five approved Streamline icon names and 16×16 expectations.
- [x] Run `node --test --experimental-strip-types tests/productSidebarIcons.test.ts` and confirm it fails because Streamline assets are not implemented.

### Task 2: Add and render the SVG assets

**Files:**
- Create: `src/assets/icons/streamline-core-flat-free/*.svg`
- Create: `src/assets/icons/streamline-core-flat-free/README.md`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.less`

**Interfaces:**
- Consumes: five local SVG URL imports.
- Produces: `StreamlineMenuIcon` rendering the selected asset at 16×16.

- [x] Add the five original SVG files and license/source attribution.
- [x] Replace `TablerMenuIcon` with `StreamlineMenuIcon` and preserve the approved menu mapping.
- [x] Replace Tabler-specific CSS selectors with Streamline-specific 16×16 alignment selectors.
- [x] Re-run the sidebar icon test and confirm it passes.

### Task 3: Verify the complete result

**Files:**
- Verify only: current source, tests, and live page.

**Interfaces:**
- Consumes: the completed sidebar implementation.
- Produces: fresh automated and visual evidence.

- [x] Run the complete test command including `productSidebarIcons.test.ts`.
- [x] Run `npm run build` and confirm exit code 0.
- [x] Reload the 5178 page in the Codex in-app browser.
- [x] Measure icon size and icon/label vertical alignment in expanded mode.
- [x] Collapse the sidebar and confirm centered 16×16 icons with no overflow.
- [x] Check selected state plus browser console errors; hover uses the same fixed-size image element and shared row layout.
