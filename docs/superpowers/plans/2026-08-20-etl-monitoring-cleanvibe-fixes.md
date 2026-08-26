# ETL Monitoring CleanVibe Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 411 ETL 顶部需求入口错显，并让任务最终状态由独立三阶段事实分类后再聚合。

**Architecture:** 壳层从独立需求配置模块读取 4 个入口；ETL 页面从独立纯函数模块读取任务分类与聚合结果。Mock 数据先保存取数、入库、校验事实，页面再生成下钻记录和日期汇总态，禁止用目标汇总态反向生成明细。

**Tech Stack:** React 18、TypeScript 5、Vite 5、Node.js 22 原生 test runner、Arco Design。

**Spec:** `docs/superpowers/specs/2026-08-20-etl-monitoring-cleanvibe-fixes-design.md`

## Global Constraints

- 不新增依赖。
- 不修改 `source-copy/**`、下载源码或真实后端契约。
- 下钻表继续只展示取数执行、数据入库、数据校验三段状态。
- 不提交当前工作树中用户已有的跨需求改动。

---

### Task 1: 任务状态分类与聚合

**Files:**
- Create: `src/pages/etlDataMonitoringOptimization/statusModel.ts`
- Create: `tests/etlDataMonitoringStatusModel.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `TaskStageFacts`、`DateStatus`、`classifyTaskFinalStatus(facts): DateStatus`、`aggregateFinalStatus(statuses): DateStatus`。
- Classification input uses `collectStatus`、`importStatus`、`validationStatus` and stage-specific error codes.

- [ ] **Step 1: Write failing classification and aggregation tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateFinalStatus,
  classifyTaskFinalStatus,
} from '../src/pages/etlDataMonitoringOptimization/statusModel.ts';

test('classifies collect 1xxx as abnormal', () => {
  assert.equal(classifyTaskFinalStatus({
    collectStatus: '失败',
    importStatus: '无任务',
    validationStatus: '无任务',
    collectErrorCode: '1103',
  }), 'abnormal');
});

test('classifies collect 2xxx and 3xxx as failed', () => {
  for (const code of ['2101', '3201']) {
    assert.equal(classifyTaskFinalStatus({
      collectStatus: '失败',
      importStatus: '无任务',
      validationStatus: '无任务',
      collectErrorCode: code,
    }), 'failed');
  }
});

test('classifies any import error as failed', () => {
  assert.equal(classifyTaskFinalStatus({
    collectStatus: '成功',
    importStatus: '失败',
    validationStatus: '无任务',
    importErrorCode: '1001',
  }), 'failed');
});

test('classifies validation failure after import as abnormal', () => {
  assert.equal(classifyTaskFinalStatus({
    collectStatus: '成功',
    importStatus: '成功',
    validationStatus: '异常',
  }), 'abnormal');
});

test('classifies unfinished and successful tasks', () => {
  assert.equal(classifyTaskFinalStatus({
    collectStatus: '运行中',
    importStatus: '等待',
    validationStatus: '无任务',
  }), 'waiting');
  assert.equal(classifyTaskFinalStatus({
    collectStatus: '成功',
    importStatus: '成功',
    validationStatus: '正常',
  }), 'success');
});

test('returns noTask only when every detail has no task', () => {
  assert.equal(aggregateFinalStatus(['noTask', 'noTask']), 'noTask');
  assert.equal(aggregateFinalStatus(['noTask', 'success']), 'success');
});

test('aggregates by failed abnormal waiting success priority', () => {
  assert.equal(aggregateFinalStatus(['success', 'waiting', 'abnormal', 'failed']), 'failed');
  assert.equal(aggregateFinalStatus(['success', 'waiting', 'abnormal']), 'abnormal');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test --experimental-strip-types tests/etlDataMonitoringStatusModel.test.ts`

Expected: FAIL because `statusModel.ts` does not exist.

- [ ] **Step 3: Implement the minimum pure status model**

Implement exact stage precedence:

```ts
export type DateStatus = 'success' | 'abnormal' | 'failed' | 'waiting' | 'noTask';
export type StageStatus = '成功' | '失败' | '运行中' | '等待' | '正常' | '异常' | '无数据' | '无任务';

export interface TaskStageFacts {
  collectStatus: StageStatus;
  importStatus: StageStatus;
  validationStatus: StageStatus;
  collectErrorCode?: string;
  importErrorCode?: string;
}
```

Classification order: all three `无任务` → `noTask`; import failure/error → `failed`; collect failure with `1xxx` → `abnormal`; any other collect failure → `failed`; validation `异常` → `abnormal`; any running/waiting stage → `waiting`; otherwise → `success`.

- [ ] **Step 4: Add the test script and verify GREEN**

Add `"test:etl": "node --test --experimental-strip-types tests/etlDataMonitoringStatusModel.test.ts tests/iterationRequirements.test.ts"` to `package.json` after the second test exists. Until then run the direct command from Step 2.

Expected: all status-model tests PASS.

---

### Task 2: Requirement Entry Configuration

**Files:**
- Create: `src/iterationRequirements.ts`
- Create: `tests/iterationRequirements.test.ts`
- Modify: `src/App.tsx:78-83,633-658`
- Modify: `package.json`

**Interfaces:**
- Produces: `iterationRequirements: Array<{ key: RequirementKey; label: string }>` containing message center, retry, ETL monitoring and push strategy.
- Consumed by URL validation and the iteration-bar render loop.

- [ ] **Step 1: Write the failing requirement-entry test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { iterationRequirements } from '../src/iterationRequirements.ts';

test('exposes all four 411 requirement entries', () => {
  assert.deepEqual(
    iterationRequirements.map(({ key, label }) => [key, label]),
    [
      ['messageCenter', '消息盒子与公告管理'],
      ['autoRetryOptimization', '重试策略'],
      ['etlDataMonitoringOptimization', '数据监控优化'],
      ['pushStrategyOptimization', '推送策略中心优化'],
    ],
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test --experimental-strip-types tests/iterationRequirements.test.ts`

Expected: FAIL because `src/iterationRequirements.ts` does not exist.

- [ ] **Step 3: Move the existing requirement array into the pure config module**

Export the four existing key/label pairs without changing copy. Import the array in `App.tsx`, retain `isRequirementKey` as the URL boundary, and replace the filtered render with direct `iterationRequirements.map(...)`.

- [ ] **Step 4: Run all ETL tests and verify GREEN**

Run: `npm run test:etl`

Expected: both test files PASS.

---

### Task 3: Replace Aggregate-Seeded ETL Mock Flow

**Files:**
- Modify: `src/pages/etlDataMonitoringOptimization/index.tsx:39-143,211-389,653-824,1524-1865`
- Test: `tests/etlDataMonitoringStatusModel.test.ts`

**Interfaces:**
- Consumes: `TaskStageFacts`, `classifyTaskFinalStatus`, `aggregateFinalStatus` from `statusModel.ts`.
- Produces: store/table date scenarios made from independent task-stage facts; drilldown records preserve three visible stage statuses and optional stage-specific code/reason.

- [ ] **Step 1: Add a failing mixed-task regression test**

Add a literal fixture containing `noTask`, success, collect-1xxx, validation-abnormal and import-failed tasks. Assert their classified statuses aggregate to `failed`; remove the import-failed task and assert `abnormal`.

- [ ] **Step 2: Run `npm run test:etl` and verify RED**

Expected: FAIL until the new scenario helper or exported classification path exists.

- [ ] **Step 3: Convert monitor date data to independent stage facts**

Replace each stored date-level target `status` with task-stage facts using small constructors for success, waiting, collect error, import error, validation abnormal and no-task scenarios. Generate store/table drilldown rows from those task facts; remove internal `executionResult` dependence.

- [ ] **Step 4: Compute all list/filter/hover results from classified task details**

For store and table views, classify each generated task record and feed those statuses to `aggregateFinalStatus`. Issue reason filtering must use the classified task result plus stage-specific error code/reason.

- [ ] **Step 5: Run tests and TypeScript build**

Run: `npm run test:etl && npm run build`

Expected: tests PASS; TypeScript and Vite build PASS.

---

### Task 4: Scope Review and Live Verification

**Files:**
- Review only: `src/App.tsx`, `src/iterationRequirements.ts`, `src/pages/etlDataMonitoringOptimization/index.tsx`, `src/pages/etlDataMonitoringOptimization/statusModel.ts`, `tests/*.test.ts`, `package.json`

**Interfaces:**
- Consumes the completed implementation.
- Produces verification evidence only; no unrelated cleanup.

- [ ] **Step 1: Run scoped checks**

Run: `npm run test:etl`, `npm run build`, `git diff --check`, then CleanVibe diff with findings restricted to the files above.

- [ ] **Step 2: Verify the 5177 prototype in the Codex in-app browser**

Confirm four requirement entries; ETL direct URL; store/table status labels; 1xxx abnormal and 2xxx/3xxx failed cases; no-task non-drilldown; three stage columns in drilldown; all 7 annotations; no console warnings/errors.

- [ ] **Step 3: Refresh guidance map if verification reports affected modules**

Run `guidance_map.py verify`; if it requests a refresh, invoke `guidance_map.py build --launcher auto` and let the coordinated builder update only the affected guides.

- [ ] **Step 4: Report scoped diff without committing overlapping user changes**

List only files changed by this implementation and explicitly leave all unrelated dirty files untouched.
