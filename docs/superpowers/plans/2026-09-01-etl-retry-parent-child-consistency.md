# ETL Retry Parent-Child Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make store and data-table drilldowns show the latest accepted retry attempt and keep both parent summaries aggregated from those same effective child states.

**Architecture:** Add a pure retry-projection model that converts accepted collect/import retries into a new effective attempt on a stable detail row. Each monitoring dimension owns one override map; the parent cells and child table both derive from those projected rows. Render the full lifecycle in an interactive annotation and document the production-facing contract in the existing PRD.

**Tech Stack:** React 18, TypeScript 5.6, Arco Design, Node test runner, Vite

**Spec:** `docs/superpowers/specs/2026-09-01-etl-retry-parent-child-consistency-design.md`

## Global Constraints

- One business detail remains one child-table row; retries do not append rows.
- Only an accepted retry replaces the current effective attempt.
- Accepted collect retry projects to `等待 / 无任务 / 无任务`.
- Accepted import retry preserves successful collection and projects to `成功 / 等待 / 无任务`.
- Store parent, table parent, and both drilldowns use the same projected rows.
- Parent priority remains `失败 > 异常 > 等待 > 成功`.
- Old attempts remain in logs/run records and stale responses cannot overwrite newer versions.
- Prototype timers and outcomes are demonstrations, not production API facts.
- Preserve unrelated dirty-worktree changes; commit only files whose ownership is verified.

---

### Task 1: Model the effective retry attempt

**Files:**
- Create: `src/pages/etlDataMonitoringOptimization/retryConsistency.ts`
- Modify: `tests/etlDataMonitoringStatusModel.test.ts`

**Interfaces:**
- Consumes: `StageStatus` and `TaskStageFacts` from `statusModel.ts`.
- Produces: `RetryKind`, `RetryLifecycle`, `RetryOutcome`, `EffectiveRetryAttempt`, `availableRetryKinds`, `acceptRetryAttempt`, `resolveRetryAttempt`, and `applyEffectiveAttempts`.

- [ ] **Step 1: Write failing accepted-retry tests**

Add imports and tests:

```ts
import {
  acceptRetryAttempt,
  applyEffectiveAttempts,
  availableRetryKinds,
  resolveRetryAttempt,
} from '../src/pages/etlDataMonitoringOptimization/retryConsistency.ts';

test('accepted collect retry resets every downstream stage', () => {
  const attempt = acceptRetryAttempt({
    version: 1,
    collectStatus: '失败',
    importStatus: '失败',
    validationStatus: '无任务',
  }, 'collect');

  assert.equal(attempt.version, 2);
  assert.equal(attempt.lifecycle, 'waiting');
  assert.deepEqual(
    [attempt.collectStatus, attempt.importStatus, attempt.validationStatus],
    ['等待', '无任务', '无任务'],
  );
});

test('accepted import retry keeps successful collection', () => {
  const attempt = acceptRetryAttempt({
    version: 3,
    collectStatus: '成功',
    importStatus: '失败',
    validationStatus: '无任务',
  }, 'import');

  assert.equal(attempt.version, 4);
  assert.deepEqual(
    [attempt.collectStatus, attempt.importStatus, attempt.validationStatus],
    ['成功', '等待', '无任务'],
  );
});

test('retry choices follow the failed stage', () => {
  assert.deepEqual(availableRetryKinds({ collectStatus: '失败', importStatus: '无任务' }), ['collect']);
  assert.deepEqual(availableRetryKinds({ collectStatus: '成功', importStatus: '失败' }), ['import']);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

```bash
node --test --experimental-strip-types tests/etlDataMonitoringStatusModel.test.ts
```

Expected: FAIL because `retryConsistency.ts` does not exist.

- [ ] **Step 3: Implement the pure model**

Create:

```ts
import type { TaskStageFacts } from './statusModel';

export type RetryKind = 'collect' | 'import';
export type RetryLifecycle = 'waiting' | 'completed';
export type RetryOutcome = 'success' | 'failure';

export interface EffectiveRetryAttempt extends TaskStageFacts {
  version: number;
  lifecycle: RetryLifecycle;
  retryKind: RetryKind;
  issueStage?: '取数执行' | '数据入库' | '数据校验';
  errorCode?: string;
  reason?: string;
  durationSeconds: number | string;
  actualImportTime: string;
}

export type EffectiveAttemptMap = Record<string, EffectiveRetryAttempt>;

export function availableRetryKinds(record: {
  collectStatus: string;
  importStatus: string;
}): RetryKind[] {
  if (record.collectStatus === '失败' || record.collectStatus === '平台未更新') return ['collect'];
  if (record.collectStatus === '成功' && record.importStatus === '失败') return ['import'];
  return [];
}

export function acceptRetryAttempt(
  current: TaskStageFacts & { version?: number },
  retryKind: RetryKind,
): EffectiveRetryAttempt {
  return {
    version: (current.version ?? 1) + 1,
    lifecycle: 'waiting',
    retryKind,
    collectStatus: retryKind === 'collect' ? '等待' : '成功',
    importStatus: retryKind === 'collect' ? '无任务' : '等待',
    validationStatus: '无任务',
    durationSeconds: '--',
    actualImportTime: '--',
  };
}
```

Implement these exact behaviors:

- `availableRetryKinds(record)` returns collect retry for collection failure/platform-not-updated and import retry only when collection is successful and import failed;
- `resolveRetryAttempt(attempt, 'success')` returns `成功 / 成功 / 正常`, clears failure metadata, and marks `completed`.
- `resolveRetryAttempt(attempt, 'failure')` fails the selected retry stage, keeps downstream stages `无任务`, and writes a new prototype reason.
- `applyEffectiveAttempts<T extends { key: string }>(records, attempts)` merges a matching override into the existing stable row and never changes row count.

- [ ] **Step 4: Add version and aggregation regression tests**

```ts
test('latest projection replaces one stable row without appending', () => {
  const rows = [{
    key: 'detail-1',
    collectStatus: '失败',
    importStatus: '失败',
    validationStatus: '无任务',
  }] as const;
  const accepted = acceptRetryAttempt({ ...rows[0], version: 1 }, 'collect');
  const projected = applyEffectiveAttempts(rows, {
    'detail-1': resolveRetryAttempt(accepted, 'success'),
  });

  assert.equal(projected.length, 1);
  assert.deepEqual(
    [projected[0].collectStatus, projected[0].importStatus],
    ['成功', '成功'],
  );
});

test('another failed child keeps the parent failed while retry waits', () => {
  const waiting = acceptRetryAttempt({
    version: 1,
    collectStatus: '失败',
    importStatus: '无任务',
    validationStatus: '无任务',
  }, 'collect');

  assert.equal(aggregateTaskFinalStatus([
    waiting,
    { collectStatus: '失败', importStatus: '无任务', validationStatus: '无任务' },
  ]), 'failed');
});
```

- [ ] **Step 5: Run tests and inspect the scoped diff**

```bash
node --test --experimental-strip-types tests/etlDataMonitoringStatusModel.test.ts
git diff --check -- src/pages/etlDataMonitoringOptimization/retryConsistency.ts tests/etlDataMonitoringStatusModel.test.ts
```

Expected: PASS and no whitespace errors.

- [ ] **Step 6: Create a scoped checkpoint**

If both files contain only this task's work:

```bash
git add src/pages/etlDataMonitoringOptimization/retryConsistency.ts tests/etlDataMonitoringStatusModel.test.ts
git commit -m "feat: model effective retry attempts" -m "问题：父子表引用不同执行版本。修复：统一最新有效尝试的状态投影。"
```

Otherwise retain the scoped diff without committing pre-existing user changes.

---

### Task 2: Drive parent and child views from one projection

**Files:**
- Create: `src/pages/etlDataMonitoringOptimization/useRetrySimulation.ts`
- Modify: `src/pages/etlDataMonitoringOptimization/DetailRowActions.tsx`
- Modify: `src/pages/etlDataMonitoringOptimization/index.tsx`
- Modify: `src/pages/etlDataMonitoringOptimization/index.module.less`
- Modify: `tests/etlDataMonitoringStatusModel.test.ts`

**Interfaces:**
- Consumes: Task 1's effective-attempt functions and map.
- Produces: `useRetrySimulation()` returning `{ attempts, phases, submitRetry }`; `DetailRowActions` receives `phase` and `onRetry`.

- [ ] **Step 1: Write a failing shared-projection source test**

Add the missing filesystem import to the test file, then add the source-contract test:

```ts
import { readFileSync } from 'node:fs';

test('monitor views aggregate the projected rows passed to drilldown', () => {
  const page = readFileSync(
    new URL('../src/pages/etlDataMonitoringOptimization/index.tsx', import.meta.url),
    'utf8',
  );
  assert.match(page, /applyEffectiveAttempts\(createStoreDrilldownRecords/);
  assert.match(page, /applyEffectiveAttempts\(createTableDrilldownRecords/);
  assert.match(page, /aggregateTaskFinalStatus\(currentStoreDetails/);
  assert.match(page, /aggregateTaskFinalStatus\(currentTableDetails/);
});
```

- [ ] **Step 2: Run the test and verify failure**

```bash
node --test --experimental-strip-types tests/etlDataMonitoringStatusModel.test.ts
```

Expected: FAIL because parents still aggregate static `taskResults`.

- [ ] **Step 3: Implement parent-owned retry lifecycle state**

Create `useRetrySimulation.ts` with this public shape:

```ts
export interface RetryableDetailRecord extends TaskStageFacts {
  key: string;
  issueStage?: '取数执行' | '数据入库' | '数据校验';
  errorCode?: string;
  reason?: string;
  durationSeconds: number | string;
  actualImportTime: string;
}

export type RetryPhase = 'submitting' | 'waiting' | 'completed' | 'submitFailed';

export function useRetrySimulation(): {
  attempts: EffectiveAttemptMap;
  phases: Record<string, RetryPhase>;
  submitRetry: (
    record: RetryableDetailRecord,
    retryKind: RetryKind,
  ) => Promise<'accepted' | 'rejected'>;
};
```

Implementation requirements:

- set `submitting` before acceptance;
- only after acceptance, store `acceptRetryAttempt(...)` and set `waiting`;
- resolve the main prototype path to success after 1600 ms;
- keep timer IDs in a ref and clear them on unmount;
- never modify module-level `storeRecords` or `tableRecords`;
- ignore any completion whose version is older than the current stored attempt.

- [ ] **Step 4: Replace local button-only state with lifecycle props**

Change `DetailRowActions` to:

```ts
interface DetailRowActionsProps {
  record: DetailActionRecord;
  phase?: RetryPhase;
  onRetry: (
    record: DetailActionRecord,
    kind: RetryKind,
  ) => Promise<'accepted' | 'rejected'>;
}
```

Required behavior:

- `submitting`: confirmation and row retry entry loading/disabled;
- `waiting`: action reads `重试中` and cannot submit again;
- `completed`: latest successful statuses remove the retry entry through `canRetryDetail`;
- rejected submission: preserve stages, restore the entry, and show `重试提交失败，请重试`;
- menu items come from `availableRetryKinds(record)`, so an invalid downstream retry is not offered;
- modal says only the current business detail is retried and history remains in logs;
- remove the old sentence saying statuses never update.

- [ ] **Step 5: Apply one override map to child rendering and parent aggregation**

In each parent view:

```ts
const { attempts, phases, submitRetry } = useRetrySimulation();

const currentStoreDetails = (record: StoreMonitorRecord, date: string) =>
  applyEffectiveAttempts(createStoreDrilldownRecords(record, date), attempts);

const currentTableDetails = (record: TableMonitorRecord, date: string) =>
  applyEffectiveAttempts(createTableDrilldownRecords(record, date), attempts);
```

Use the projected arrays for:

- records passed to `DrilldownDetailView`;
- parent date-cell aggregation;
- parent failure reasons;
- parent status filtering.

Pass `phases` and `submitRetry` through `DrilldownDetailView` to `DetailRowActions`.

- [ ] **Step 6: Render compact accessible progress feedback**

```tsx
{phase === 'waiting' ? (
  <span role="status" className={styles.retryProgress}>重试中</span>
) : null}
```

Do not add a final-result column. Preserve left alignment and the fixed-right operation column.

- [ ] **Step 7: Run tests and build**

```bash
npm run test:etl
npm run build
git diff --check -- src/pages/etlDataMonitoringOptimization tests/etlDataMonitoringStatusModel.test.ts
```

Expected: tests/build PASS and the diff contains no unrelated formatting.

- [ ] **Step 8: Create a scoped checkpoint**

Commit only if relevant files can be safely separated from prior user changes:

```bash
git add src/pages/etlDataMonitoringOptimization/retryConsistency.ts src/pages/etlDataMonitoringOptimization/useRetrySimulation.ts src/pages/etlDataMonitoringOptimization/DetailRowActions.tsx src/pages/etlDataMonitoringOptimization/index.tsx src/pages/etlDataMonitoringOptimization/index.module.less tests/etlDataMonitoringStatusModel.test.ts
git commit -m "feat: synchronize retry states across monitor levels" -m "复现：重试后父表更新但下钻仍显示旧失败。修复：父子共用最新有效执行投影。"
```

Otherwise keep the scoped implementation uncommitted and report why.

---

### Task 3: Render the lifecycle in interaction annotations

**Files:**
- Modify: `src/components/etlDataMonitoringAnnotations/data.ts`
- Modify: `src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx`
- Modify: `src/components/etlDataMonitoringAnnotations/comparison.module.less`
- Modify: `tests/annotationLocateTargets.test.ts`

**Interfaces:**
- Consumes: Task 1 projection functions and existing `StageStatusTag`/`DateStatusCell`.
- Produces: annotation `ETL-4.9`, example kind `retry-consistency`, and `RetryConsistencyPreview`.

- [ ] **Step 1: Write a failing annotation coverage test**

```ts
test('retry consistency annotation is rendered instead of repeated as prose', () => {
  const annotation = etlDataMonitoringAnnotations.find(
    item => item.noteId === 'ETL-4.9',
  );
  assert.ok(annotation);
  assert.equal(annotation?.module, '重试后父子状态同步');
  assert.ok(annotation?.ruleItems?.some(
    item => item.example === 'retry-consistency',
  ));
  assert.ok((annotation?.ruleItems?.length || 0) <= 2);

  const preview = readFileSync(
    new URL('../src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx', import.meta.url),
    'utf8',
  );
  for (const text of [
    'RetryConsistencyPreview',
    '重试采集',
    '重试入库',
    '提交失败',
    '刷新失败',
    '父表聚合',
  ]) assert.ok(preview.includes(text));
});
```

- [ ] **Step 2: Run the test and verify failure**

```bash
node --test --experimental-strip-types tests/annotationLocateTargets.test.ts
```

Expected: FAIL because `ETL-4.9` and its preview do not exist.

- [ ] **Step 3: Add one concise shared annotation**

Add:

```ts
{
  noteId: 'ETL-4.9',
  number: '4.9',
  page: '下钻明细页',
  module: '重试后父子状态同步',
  target: '下钻明细重试入口',
  rule: '两种下钻共用最新有效执行：重试受理后更新当前行三段状态，父表用同一结果重新聚合；旧尝试仅在日志中保留。',
  ruleItems: [{
    text: '直接操作采集重试、入库重试及失败恢复',
    example: 'retry-consistency',
  }],
  acceptance: '等待、成功、再次失败和提交失败时父子状态符合完整流程，且不新增明细行。',
  topTab: '电商取数宝',
  menuKey: '数据监控',
  openEvent: 'etl-monitor:open-store-detail',
}
```

Do not repeat the complete flow in `ETL-4.2` and `ETL-4.3`; each may contain only one short reference to the shared rule.

- [ ] **Step 4: Build an interactive frontend preview**

`RetryConsistencyPreview` must include:

- store/table dimension toggle;
- collect/import retry selector;
- `受理并成功`, `受理后失败`, `提交失败`, and reset controls;
- a `刷新失败` control that preserves the last confirmed stages and renders a retryable refresh message;
- one child row with the real three stage tags;
- one parent tag computed from the same facts;
- one history line showing the old attempt moved to logs;
- no production-facing mock outcome selector outside the annotation preview.

Use current Arco components and page styles. Keep prose to stable-row identity, same effective version, and stale-response protection.

- [ ] **Step 5: Run annotation tests and build**

```bash
node --test --experimental-strip-types tests/annotationLocateTargets.test.ts
npm run build
git diff --check -- src/components/etlDataMonitoringAnnotations tests/annotationLocateTargets.test.ts
```

Expected: PASS; preview stays within drawer width and deleted legacy copy does not return.

- [ ] **Step 6: Create a scoped checkpoint**

If safe:

```bash
git add src/components/etlDataMonitoringAnnotations/data.ts src/components/etlDataMonitoringAnnotations/ComparisonPreview.tsx src/components/etlDataMonitoringAnnotations/comparison.module.less tests/annotationLocateTargets.test.ts
git commit -m "docs: render retry consistency annotation" -m "问题：文字无法说明重试后的父子同步。修复：增加可操作状态流。"
```

Otherwise retain the diff without committing prior user work.

---

### Task 4: Align the PRD with the lifecycle

**Files:**
- Modify: `src/pages/etlDataMonitoringOptimizationPrd/index.tsx`
- Modify: `tests/annotationLocateTargets.test.ts`

**Interfaces:**
- Consumes: the confirmed spec and annotation ID `ETL-4.9`.
- Produces: PRD coverage for effective attempts, stage reset, error recovery, and acceptance.

- [ ] **Step 1: Write a failing PRD contract test**

```ts
test('PRD defines the accepted retry lifecycle', () => {
  const prd = readFileSync(
    new URL('../src/pages/etlDataMonitoringOptimizationPrd/index.tsx', import.meta.url),
    'utf8',
  );
  for (const text of [
    '当前有效执行',
    '重试采集',
    '等待／无任务／无任务',
    '重试入库',
    '提交失败',
    '父表',
    '旧尝试',
  ]) assert.ok(prd.includes(text));
  assert.ok(prd.includes('data-note-id="ETL-4.9"'));
});
```

- [ ] **Step 2: Run the test and verify failure**

```bash
node --test --experimental-strip-types tests/annotationLocateTargets.test.ts
```

Expected: FAIL because the PRD lacks the lifecycle contract.

- [ ] **Step 3: Update the existing PRD structure**

Cover these exact rules without creating a second PRD format:

- current effective execution switches only after retry acceptance;
- parent status aggregates latest projected child facts;
- stable child row and the collect/import reset matrix;
- submitting, waiting, final success/failure, and duplicate-submit prevention;
- submit failure and refresh failure preserve the last confirmed result;
- no automatic retry strategy, permission change, history deletion, or endpoint prescription;
- both dimensions and all eight acceptance cases from the spec.

Add `data-note-id="ETL-4.9"` to the corresponding PRD change row. Keep visual transitions in the annotation preview instead of repeating long prose.

- [ ] **Step 4: Run tests and build**

```bash
npm run test:etl
npm run build
git diff --check -- src/pages/etlDataMonitoringOptimizationPrd/index.tsx tests/annotationLocateTargets.test.ts
```

Expected: PASS with no contradiction between PRD and annotation states.

- [ ] **Step 5: Create a scoped checkpoint**

If safe:

```bash
git add src/pages/etlDataMonitoringOptimizationPrd/index.tsx tests/annotationLocateTargets.test.ts
git commit -m "docs: define retry state synchronization" -m "问题：PRD 未说明重试后父子如何更新。修复：补齐有效执行与恢复口径。"
```

Otherwise retain the diff without committing prior user work.

---

### Task 5: Complete regression and in-app browser acceptance

**Files:**
- Verify: `src/pages/etlDataMonitoringOptimization/**`
- Verify: `src/components/etlDataMonitoringAnnotations/**`
- Verify: `src/pages/etlDataMonitoringOptimizationPrd/index.tsx`
- Verify: `tests/etlDataMonitoringStatusModel.test.ts`
- Verify: `tests/annotationLocateTargets.test.ts`

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: separate evidence for source, tests/build, browser prototype, annotation, and PRD.

- [ ] **Step 1: Run the complete ETL tests**

```bash
npm run test:etl
```

Expected: all configured tests PASS.

- [ ] **Step 2: Run TypeScript and Vite build**

```bash
npm run build
```

Expected: `tsc --noEmit` and Vite build PASS. Do not edit or commit `dist/`.

- [ ] **Step 3: Audit the scoped diff**

```bash
git diff --check
git status --short
git diff -- src/pages/etlDataMonitoringOptimization src/components/etlDataMonitoringAnnotations src/pages/etlDataMonitoringOptimizationPrd tests/etlDataMonitoringStatusModel.test.ts tests/annotationLocateTargets.test.ts
```

Expected: no whitespace errors, unrelated deletions, or restored annotation copy that the user removed earlier.

- [ ] **Step 4: Verify the prototype in the Codex in-app browser**

Open `http://127.0.0.1:5178/?requirement=etlDataMonitoringOptimization&tab=prototype` and verify:

1. Drill into a failed store-date cell and submit collect retry.
2. The same child row becomes `等待 / 无任务 / 无任务` without adding a row.
3. Retry is disabled while waiting and final success replaces that row.
4. Return to the parent and confirm its date status uses the updated child rows.
5. Repeat from a failed data-table date cell.
6. Open annotation 4.9 and exercise success, final failure, and submit failure.
7. Confirm the drawer does not overflow and all table cells remain left aligned.

- [ ] **Step 5: Verify the PRD in the Codex in-app browser**

Open `http://127.0.0.1:5178/?requirement=etlDataMonitoringOptimization&tab=prd` and confirm:

- effective execution and stage reset are visible;
- both parent dimensions use latest child results;
- submit failure, refresh failure, and stale-response protection are explicit;
- no prototype timer or mock outcome is presented as production behavior.

- [ ] **Step 6: Report without overclaiming**

Report separately:

- source changes;
- tests/build;
- in-app browser prototype/annotation/PRD acceptance;
- production backend/API implementation still requires separate verification.

Do not call production fixed based only on the runnable PRD prototype.
