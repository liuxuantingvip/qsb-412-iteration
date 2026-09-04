# 运行详情新增入库日志交互原型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 412 原型中使用 Arco Design 将当前单层运行详情抽屉重构为线上同层级的运行详情弹窗、运行记录详情抽屉、查看日志抽屉和入库日志抽屉。

**Architecture:** 保留现有运行记录列表和需求入口，在 `autoRetryOptimization/runDetail` 下新增独立的数据模型、mock 和分层 UI 组件。列表只传入当前 `RunRecord`，由纯函数构造稳定的原型详情数据；Modal 和 Drawer 负责各自层级的状态、筛选与关闭恢复，避免继续扩大现有千行页面文件。

**Tech Stack:** React 18, TypeScript 5.6, Arco Design React 2.66, Less, Vite 5, Node.js test runner

**Spec:** `docs/superpowers/specs/2026-09-01-run-detail-storage-log-entry-design.md`

## Global Constraints

- 只能使用当前 412 工程已有的 Arco Design React 组件与 `@arco-design/web-react/icon` 图标。
- 不引入 Ant Design、Semi、其他组件库或跨组件库样式。
- 颜色、字号、间距、圆角、阴影、边框和状态色复用 `src/styles/global.less`、Arco Less 变量及现有页面变量；不得新建第二套全局变量。
- 保持 412 现有取数宝后台壳层、表格密度、状态标签、按钮等级和抽屉风格。
- PRD 和交互标注继续保持空状态。
- 只修改 412 可运行原型，不修改生产取数宝前端。
- 不复制线上租户数据；所有详情、日志与操作使用原型 mock。
- 不修改 `dist/`，不覆盖或清理当前工作树内其他未提交变更。
- 按用户既有约束不创建 Git 提交；每个任务用测试、构建和限定路径 diff 作为检查点。

---

## File Structure

- Create `src/pages/autoRetryOptimization/runDetail/model.ts`: 详情层级、筛选条件、日志类型和纯函数。
- Create `src/pages/autoRetryOptimization/runDetail/mock.ts`: 从现有 `RunRecord` 生成稳定且可演示的详情、连接器和日志数据。
- Create `src/pages/autoRetryOptimization/runDetail/StatusTag.tsx`: 各层共用的 Arco 状态标签。
- Create `src/pages/autoRetryOptimization/runDetail/RunDetailModal.tsx`: 第一层运行详情宽表 Modal。
- Create `src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx`: 第二层运行记录详情 Drawer 和连接器下钻。
- Create `src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx`: 查看日志与入库日志共用的 Arco Drawer 外壳，按 `mode` 渲染不同筛选和表格。
- Create `src/pages/autoRetryOptimization/runDetail/index.module.less`: 只使用 Arco/当前全局变量的局部视觉规格。
- Modify `src/pages/autoRetryOptimization/index.tsx`: 删除旧 `RunRecordDetailDrawer`，将列表入口接到 `RunDetailModal`。
- Modify `src/pages/autoRetryOptimization/index.module.less`: 删除旧单层抽屉样式，只保留列表和策略页样式。
- Modify `package.json`: 将新的纯函数测试加入 `test:etl`。
- Create `tests/runDetailModel.test.ts`: 覆盖层级数据、状态、筛选、分页与关闭恢复所依赖的默认值。

---

### Task 1: 建立运行详情模型和稳定 mock

**Files:**
- Create: `src/pages/autoRetryOptimization/runDetail/model.ts`
- Create: `src/pages/autoRetryOptimization/runDetail/mock.ts`
- Create: `tests/runDetailModel.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `RunRecord` from `../interface`.
- Produces: `RunDetailData`, `RunExecuteRecord`, `StoreExecution`, `ConnectorExecution`, `RuntimeLog`, `StorageLog`, `RunResultFilters`, `StorageLogFilters`.
- Produces: `buildRunDetailData(record: RunRecord): RunDetailData`.
- Produces: `filterConnectorExecutions(rows, filters)`, `filterRuntimeLogs(rows, keyword, level)`, `filterStorageLogs(rows, filters)`, `paginateRows(rows, page, pageSize)`.

- [ ] **Step 1: Write the failing model test**

Create `tests/runDetailModel.test.ts` with these exact behaviors:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterConnectorExecutions,
  filterStorageLogs,
  paginateRows,
} from '../src/pages/autoRetryOptimization/runDetail/model.ts';
import { buildRunDetailData } from '../src/pages/autoRetryOptimization/runDetail/mock.ts';
import type { RunRecord } from '../src/pages/autoRetryOptimization/interface.ts';

const failedRecord: RunRecord = {
  key: 'run-failed',
  planName: '店铺登录计划',
  storeName: '华东示例店铺',
  startTime: '2026-07-31 10:00:00',
  endTime: '2026-07-31 10:12:00',
  collectionStatus: '失败',
  validationStatus: '待运行',
  storageStatus: '待运行',
  issueStage: 'login',
  issueReason: '账号校验失败',
};

test('builds the online run-detail hierarchy from one run record', () => {
  const detail = buildRunDetailData(failedRecord);
  assert.equal(detail.summary.planName, failedRecord.planName);
  assert.equal(detail.executeRecords.length, 1);
  assert.equal(detail.executeRecords[0].stores.length, 1);
  assert.ok(detail.executeRecords[0].stores[0].connectors.length >= 2);
  assert.equal(detail.executeRecords[0].collectionStatus, '运行失败');
  assert.equal(detail.executeRecords[0].storageStatus, '待运行');
});

test('filters connector results by execution and ingestion status', () => {
  const connectors = buildRunDetailData(failedRecord).executeRecords[0].stores[0].connectors;
  assert.ok(filterConnectorExecutions(connectors, { collectionStatus: '运行失败' }).every((row) => row.collectionStatus === '运行失败'));
  assert.ok(filterConnectorExecutions(connectors, { storageStatus: '待运行' }).every((row) => row.storageStatus === '待运行'));
});

test('filters storage logs and paginates without mutating source rows', () => {
  const logs = buildRunDetailData(failedRecord).storageLogs;
  const sourceLength = logs.length;
  const failed = filterStorageLogs(logs, { status: '失败', keyword: '写入' });
  assert.ok(failed.every((row) => row.status === '失败' && row.content.includes('写入')));
  assert.deepEqual(paginateRows(logs, 1, 2), logs.slice(0, 2));
  assert.equal(logs.length, sourceLength);
});
```

- [ ] **Step 2: Register and run the failing test**

Append `tests/runDetailModel.test.ts` to the existing `test:etl` command in `package.json`.

Run: `npm run test:etl -- --test-name-pattern="run-detail hierarchy|filters connector|filters storage"`

Expected: FAIL because `runDetail/model.ts` and `runDetail/mock.ts` do not exist.

- [ ] **Step 3: Implement the minimal typed model**

Define exact status and filter contracts in `model.ts`:

```ts
export type DetailStatus =
  | '待运行'
  | '运行中'
  | '成功'
  | '成功(部分无数据)'
  | '运行失败'
  | '异常(1)'
  | '失败';

export interface RunResultFilters {
  collectionStatus?: DetailStatus;
  validationStatus?: DetailStatus;
  storageStatus?: DetailStatus;
}

export interface StorageLogFilters {
  keyword?: string;
  storeName?: string;
  connectorName?: string;
  status?: DetailStatus;
  level?: '输出日志' | '警告日志' | '错误日志';
}
```

Implement the exported interfaces listed above. All IDs must derive deterministically from `record.key`; do not use `Date.now()` or random values.

- [ ] **Step 4: Implement stable mock construction**

`buildRunDetailData` must cover four visible scenarios by mapping the source record:

```ts
const collectionStatus = record.collectionStatus === '失败' ? '运行失败' : record.collectionStatus;
const validationStatus = record.validationStatus === '失败' ? '异常(1)' : record.validationStatus;
const storageStatus = record.storageStatus === '部分成功'
  ? '成功(部分无数据)'
  : record.storageStatus;
```

Each detail must contain one summary, one execute record, one store, at least two connectors, at least twelve runtime logs and at least twelve storage logs so pagination is visible.

- [ ] **Step 5: Run the focused and full model tests**

Run: `npm run test:etl -- --test-name-pattern="run-detail hierarchy|filters connector|filters storage"`

Expected: PASS for all three new tests.

Run: `npm run test:etl`

Expected: all existing and new tests PASS.

- [ ] **Step 6: Check the task boundary**

Run: `git diff --check && git diff -- package.json tests/runDetailModel.test.ts src/pages/autoRetryOptimization/runDetail/model.ts src/pages/autoRetryOptimization/runDetail/mock.ts`

Expected: only model, mock, test registration and test changes appear; no UI changes yet.

---

### Task 2: Replace the single Drawer with the Arco run-detail Modal

**Files:**
- Create: `src/pages/autoRetryOptimization/runDetail/StatusTag.tsx`
- Create: `src/pages/autoRetryOptimization/runDetail/RunDetailModal.tsx`
- Create: `src/pages/autoRetryOptimization/runDetail/index.module.less`
- Modify: `src/pages/autoRetryOptimization/index.tsx`
- Modify: `src/pages/autoRetryOptimization/index.module.less`

**Interfaces:**
- Consumes: `RunRecord | null`, `buildRunDetailData`, `DetailStatus`.
- Produces: `RunDetailModal({ record, onClose }: { record: RunRecord | null; onClose: () => void })`.
- Produces: `DetailStatusTag({ status }: { status: DetailStatus })`.

- [ ] **Step 1: Add the shared Arco status component**

Use only Arco `Tag`. Export `detailStatusColorMap: Record<DetailStatus, string>` and map waiting/processing/success/partial/failure consistently to gray/arcoblue/green/orange/red.

- [ ] **Step 2: Implement the first-layer Modal**

Use Arco components only:

```tsx
<Modal
  visible={Boolean(record)}
  title={`运行详情（${detail?.summary.planName ?? ''}）`}
  footer={null}
  unmountOnExit
  style={{ width: 'calc(100vw - 24px)' }}
  onCancel={onClose}
>
  <Table
    rowKey="id"
    columns={columns}
    data={detail?.executeRecords ?? []}
    expandedRowRender={(row) => <ExecuteRecordChildRow record={row} />}
    scroll={{ x: 1760, y: 'calc(100vh - 280px)' }}
    pagination={false}
  />
</Modal>
```

Columns must follow the spec order. IDs use Arco `Typography.Text copyable`; long text uses `ellipsis` and Arco `Tooltip`. Parent failure actions use Arco text buttons and `Message.info` only.

- [ ] **Step 3: Integrate the existing list entry**

In `index.tsx`:

- Remove the old exported `RunRecordDetailDrawer` implementation.
- Import `RunDetailModal`.
- Keep the existing `detailRecord` state and “运行详情” button.
- Replace `<RunRecordDetailDrawer ... />` with `<RunDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />`.

- [ ] **Step 4: Replace obsolete styles with local Arco-variable styles**

Delete only `.runDetailDrawer`, `.runDetailBody`, `.runDetailGrid` rules from the parent Less file. New styles must use existing `@spacing-*`, `@radius-*`, `@border-*`, `@font-size-*` and `var(--color-*)` values.

- [ ] **Step 5: Build and inspect the scoped diff**

Run: `npm run build`

Expected: TypeScript and Vite build PASS with no new dependency.

Run: `git diff --check && git diff -- src/pages/autoRetryOptimization/index.tsx src/pages/autoRetryOptimization/index.module.less src/pages/autoRetryOptimization/runDetail/StatusTag.tsx src/pages/autoRetryOptimization/runDetail/RunDetailModal.tsx src/pages/autoRetryOptimization/runDetail/index.module.less`

Expected: the old single Drawer is removed and the list opens only the new Arco Modal.

---

### Task 3: Add the Arco run-record detail Drawer and connector hierarchy

**Files:**
- Create: `src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx`
- Modify: `src/pages/autoRetryOptimization/runDetail/RunDetailModal.tsx`
- Modify: `src/pages/autoRetryOptimization/runDetail/index.module.less`

**Interfaces:**
- Consumes: `RunExecuteRecord | null`, `filterConnectorExecutions`.
- Produces: `RunRecordDetailDrawer({ record, visible, onClose })`.
- Produces: child-row `onOpenDetail(record: RunExecuteRecord)` callback from `RunDetailModal`.

- [ ] **Step 1: Add child-row selection to the Modal**

Store `selectedExecuteRecord` in `RunDetailModal`. The expanded child row renders a text button named “详情”; clicking it sets the selected record. Closing the Modal clears both the selected record and the parent selection through `onClose`.

- [ ] **Step 2: Implement the second-layer Drawer**

Use Arco `Drawer`, `Descriptions` or the existing compact label/value pattern, `Button`, `Select`, `Table`, `Pagination`, `Tooltip`, `Message` and Arco icons only.

The Drawer must render:

- title “运行记录详情”;
- plan name, plan type, cycle, platform type/name, robot token and run record ID;
- text actions “查看录屏 / 查看日志 / 入库日志”;
- three stage filters, reset, disabled-until-selected retry;
- store parent row and connector child rows;
- connector failure reason, result detail and retry actions.

- [ ] **Step 3: Implement filter and close-reset behavior**

State starts with empty `RunResultFilters`, empty selection and expanded store row. `handleClose` resets filters, selected keys and expansion before calling `onClose`. “重置” restores the same defaults.

- [ ] **Step 4: Build and verify the hierarchy manually in the current service**

Run: `npm run build`

Expected: PASS.

Browser verification in Codex in-app browser:

1. Open `?requirement=runDetailStorageLog&tab=prototype`.
2. Click a failed record “运行详情”.
3. Expand the parent record.
4. Click child “详情”.
5. Expand the store row.
6. Verify failure reason and both retry actions are visible.
7. Close the Drawer and confirm the Modal remains.

Expected: the interaction matches the live layering without console errors.

---

### Task 4: Add independent Arco runtime-log and storage-log Drawers

**Files:**
- Create: `src/pages/autoRetryOptimization/runDetail/LogDrawer.tsx`
- Modify: `src/pages/autoRetryOptimization/runDetail/RunRecordDetailDrawer.tsx`
- Modify: `src/pages/autoRetryOptimization/runDetail/index.module.less`

**Interfaces:**
- Consumes: `mode: 'runtime' | 'storage'`, `RunExecuteRecord`, runtime and storage log arrays.
- Produces: `LogDrawer({ mode, visible, record, onClose })`.

- [ ] **Step 1: Implement one shared Drawer shell with separate mode content**

Use this exact public contract:

```ts
interface LogDrawerProps {
  mode: 'runtime' | 'storage';
  visible: boolean;
  record: RunExecuteRecord | null;
  onClose: () => void;
}
```

`runtime` renders title “查看日志”, keyword/level filters and columns 时间、日志内容、日志级别.

`storage` renders title “入库日志”, keyword/store/connector/status/level filters and columns 时间、店铺、连接器、数据表、入库状态、日志内容、日志级别.

- [ ] **Step 2: Add states and Arco feedback**

- Filter changes reset page to 1.
- Empty results render Arco `Empty`.
- Mock reload renders Arco `Spin` followed by `Message.success('日志已重新加载')`.
- Closing resets mode-local filters and page.
- Status always renders text plus `DetailStatusTag`; it never relies on color alone.

- [ ] **Step 3: Wire the two independent entries**

In `RunRecordDetailDrawer`, “查看日志” sets `logMode` to `runtime`; “入库日志” sets it to `storage`. Render one `LogDrawer` with the selected mode. Closing it must keep the run-record Drawer open.

- [ ] **Step 4: Run full automated verification**

Run: `npm run test:etl && npm run build && git diff --check`

Expected: all tests and build PASS; no whitespace errors.

- [ ] **Step 5: Perform same-viewport visual verification**

Using only the Codex in-app browser:

1. Capture the current prototype list, run-detail Modal, run-record Drawer, expanded connector state, runtime log Drawer and storage log Drawer.
2. Compare each corresponding state with the current-run online screenshots at the same viewport.
3. Check title position, Modal width, Drawer width, table density, cell truncation, status colors/text, border/radius, mask layering and close-return behavior.
4. Fix visible mismatches using existing Arco/global variables only, then recapture the affected state.
5. Check browser console for errors.

Expected: no structural mismatch remains in the primary flow; any unavoidable Arco-versus-online component rendering difference is documented rather than patched with a second design system.

- [ ] **Step 6: Final scope review**

Run:

```bash
git diff --stat
git diff -- package.json \
  src/pages/autoRetryOptimization/index.tsx \
  src/pages/autoRetryOptimization/index.module.less \
  src/pages/autoRetryOptimization/runDetail \
  tests/runDetailModel.test.ts
```

Expected: every changed line traces to the run-detail prototype; PRD, annotations, production app, generated artifacts and unrelated dirty files are untouched.
