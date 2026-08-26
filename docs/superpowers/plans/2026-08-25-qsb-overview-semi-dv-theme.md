# QSB Overview Semi DV Theme Implementation Plan

> **For Codex:** Execute this plan in the current 412 prototype checkout.

**Goal:** Replace qsbOverview's local VChart color management with the designated Qushubao Semi DV theme package and registration flow.

**Architecture:** The React entry registers the designated package's `light.json` with VChart ThemeManager once. Chart specs retain layout/interaction settings but stop overriding the package's palette and animation.

**Tech Stack:** React 18, TypeScript, VChart 2, `@visactor/react-vchart`, `@semi-bot/semi-vchart-theme-qushubao`.

---

### Task 1: Lock the theme registration contract

**Files:**
- Modify: `tests/qsbOverviewContent.test.ts`
- Modify: `src/pages/qsbOverview/overviewContent.ts`

1. Add a test proving the sparkline spec leaves color and animation selection to the global theme.
2. Run the test and confirm it fails because the theme-compatible spec builder does not exist.
3. Implement the minimum spec builder and rerun the test.

### Task 2: Integrate the designated Qushubao Semi DV package

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/main.tsx`
- Modify: `src/pages/qsbOverview/index.tsx`

1. Install the designated package and inspect its exported theme assets.
2. Register and activate `light.json` once in the React entry.
3. Remove hard-coded sparkline colors and animation flags that override the theme.

### Task 3: Verify

1. Run the full prototype test command.
2. Run the production build.
3. Reload the 5178 in-app browser page and verify the charts render without console errors.
