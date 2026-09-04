# 概览交互标注补全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为概览原型新增 10 条面向研发、测试评审的可定位交互标注，并与现有 PRD 场景和真页交互保持一致。

**Architecture:** 复用通用 `RequirementAnnotationDrawer` 和 `RequirementAnnotationMarker`，新增概览专属标注数据与薄封装组件。概览页负责真实 UI 锚点和视图切换事件，`App.tsx` 只负责把概览标注接入需求壳层与统一定位流程。

**Tech Stack:** React 18、TypeScript、Arco Design、Node test、Vite、现有 RequirementAnnotation 标注体系。

**Spec:** `docs/superpowers/specs/2026-08-30-qsb-overview-interaction-annotations-design.md`

## Global Constraints

- 标注总数固定为 10，分组固定为“账户与服务”3 条、“运行趋势”5 条、“数据完成与异常”2 条。
- 稳定标识固定为 `QSB-1.1` 至 `QSB-3.2`，具体顺序见 Task 1。
- 标注只解释不可见规则，不重复页面标签，不新增生产接口、权限、持久化或真实失败模拟。
- 运行数据趋势定位必须先切到运行数据视图；计划卡片定位必须先切到机器人视图。
- `QSB-1.3` 和 `QSB-2.3` 允许在多个紧邻真实对象上重复，用联合矩形高亮；其他标识在同一状态只出现一次。
- 现有工作区包含用户未提交改动；只修改本计划列出的文件，不提交或格式化无关变更，不自动创建实现提交。

## File Structure

- Create `src/components/qsbOverviewAnnotations/data.ts`: 10 条概览标注的唯一数据源。
- Create `src/components/qsbOverviewAnnotations/index.tsx`: 概览 Marker、Drawer 的薄封装与导出。
- Modify `src/pages/qsbOverview/index.tsx`: 真实 UI 锚点、运行数据/机器人视图定位事件。
- Modify `src/App.tsx`: activeAnnotations、概览 Drawer 分发和导入。
- Modify `tests/qsbOverviewContent.test.ts`: 数据数量、PRD 映射、锚点、定位事件和壳层接入回归测试。

---

### Task 1: 建立概览标注数据与抽屉封装

**Files:**
- Create: `src/components/qsbOverviewAnnotations/data.ts`
- Create: `src/components/qsbOverviewAnnotations/index.tsx`
- Test: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: `RequirementAnnotation`、`RequirementAnnotationDrawer`、`RequirementAnnotationMarker`。
- Produces: `qsbOverviewAnnotations: RequirementAnnotation[]`、`QsbOverviewAnnotationMarker`、`QsbOverviewAnnotationDrawer`。

- [ ] **Step 1: Write the failing annotation-data test**

```ts
test('defines ten overview annotations mapped to the approved PRD scenes', async () => {
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  assert.equal(qsbOverviewAnnotations.length, 10);
  assert.deepEqual(qsbOverviewAnnotations.map((item) => item.noteId), [
    'QSB-1.1', 'QSB-1.2', 'QSB-1.3',
    'QSB-2.1', 'QSB-2.2', 'QSB-2.3', 'QSB-2.4', 'QSB-2.5',
    'QSB-3.1', 'QSB-3.2',
  ]);
  assert.deepEqual([...new Set(qsbOverviewAnnotations.map((item) => item.page))], [
    '账户与服务', '运行趋势', '数据完成与异常',
  ]);
  assert.ok(qsbOverviewAnnotations.every((item) => item.topTab === '电商取数宝'));
  assert.ok(qsbOverviewAnnotations.every((item) => item.menuKey === '取数宝概览'));
  assert.equal(qsbOverviewAnnotations.find((item) => item.noteId === 'QSB-2.4')?.openEvent, 'qsb-overview:show-robot-view');
  assert.equal(qsbOverviewAnnotations.find((item) => item.noteId === 'QSB-2.5')?.openEvent, 'qsb-overview:show-data-view');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test --experimental-strip-types tests/qsbOverviewContent.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `qsbOverviewAnnotations/data.ts`.

- [ ] **Step 3: Create the ten annotation records**

Use this exact index and copy each annotation's rule/acceptance text from the matching numbered section in the approved spec:

```ts
const annotationIndex = [
  ['QSB-1.1', '1.1', '账户与服务', '账户价值', '累计节省人力与计算说明'],
  ['QSB-1.2', '1.2', '账户与服务', '我的资产', '资产使用量与增购边界'],
  ['QSB-1.3', '1.3', '账户与服务', '公告与资源', '公告、更多与资源入口'],
  ['QSB-2.1', '2.1', '运行趋势', '周期指标', '昨日、周、月与指标联动'],
  ['QSB-2.2', '2.2', '运行趋势', '视图切换', '机器人与运行数据视图'],
  ['QSB-2.3', '2.3', '运行趋势', '排期控制', '周期导航与全屏'],
  ['QSB-2.4', '2.4', '运行趋势', '计划卡片', '高度策略与完整详情'],
  ['QSB-2.5', '2.5', '运行趋势', '运行数据', '四条运行趋势'],
  ['QSB-3.1', '3.1', '数据完成与异常', '指标口径', '完成率与异常率'],
  ['QSB-3.2', '3.2', '数据完成与异常', '异常处置', '分类、重试与运行记录'],
] as const;
```

All records use `topTab: '电商取数宝'` and `menuKey: '取数宝概览'`. Set only `QSB-2.4` to `qsb-overview:show-robot-view` and `QSB-2.5` to `qsb-overview:show-data-view`. `QSB-3.2` must explicitly cover four anomaly categories, current-record retry, success feedback, preserved state on failure, and the five run-record contexts.

- [ ] **Step 4: Create thin marker and drawer wrappers**

```tsx
export function QsbOverviewAnnotationMarker({ noteId, children, layout }: {
  noteId: string;
  children?: ReactNode;
  layout?: 'inline' | 'block' | 'fill';
}) {
  return (
    <RequirementAnnotationMarker
      requirementKey="qsbOverview"
      annotations={qsbOverviewAnnotations}
      noteId={noteId}
      layout={layout}
    >
      {children}
    </RequirementAnnotationMarker>
  );
}

export function QsbOverviewAnnotationDrawer({ visible, onClose, onLocate }: {
  visible: boolean;
  onClose: () => void;
  onLocate: (annotation: RequirementAnnotation) => void;
}) {
  return (
    <RequirementAnnotationDrawer
      visible={visible}
      annotations={qsbOverviewAnnotations}
      pageLabel={(page) => page}
      onClose={onClose}
      onLocate={onLocate}
    />
  );
}
```

- [ ] **Step 5: Run the focused test**

Expected: the new data test passes.

- [ ] **Step 6: Review the task diff checkpoint**

Run:

```bash
git diff --check -- src/components/qsbOverviewAnnotations tests/qsbOverviewContent.test.ts
git status --short -- src/components/qsbOverviewAnnotations tests/qsbOverviewContent.test.ts
```

Expected: only the two new component files and intended test edit appear.

---

### Task 2: Add real UI anchors and state-aware locate events

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`
- Test: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: `QsbOverviewAnnotationMarker` and the two events defined in Task 1.
- Produces: ten reachable marker targets and event listeners that set `scheduleView` to `'robot'` or `'data'`.

- [ ] **Step 1: Write the failing anchor and event test**

```ts
test('places every overview annotation on a real target and supports stateful locating', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  for (const noteId of [
    'QSB-1.1', 'QSB-1.2', 'QSB-1.3', 'QSB-2.1', 'QSB-2.2',
    'QSB-2.3', 'QSB-2.4', 'QSB-2.5', 'QSB-3.1', 'QSB-3.2',
  ]) assert.match(pageSource, new RegExp(noteId.replace('.', '\\.')));
  assert.match(pageSource, /qsb-overview:show-data-view/);
  assert.match(pageSource, /qsb-overview:show-robot-view/);
  assert.match(pageSource, /setScheduleView\('data'\)/);
  assert.match(pageSource, /setScheduleView\('robot'\)/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Expected: FAIL because `QSB-1.1` and both state events are absent.

- [ ] **Step 3: Add state event listeners**

```tsx
useEffect(() => {
  const showDataView = () => setScheduleView('data');
  const showRobotView = () => setScheduleView('robot');
  window.addEventListener('qsb-overview:show-data-view', showDataView);
  window.addEventListener('qsb-overview:show-robot-view', showRobotView);
  return () => {
    window.removeEventListener('qsb-overview:show-data-view', showDataView);
    window.removeEventListener('qsb-overview:show-robot-view', showRobotView);
  };
}, []);
```

- [ ] **Step 4: Place the ten markers**

```text
QSB-1.1 -> accountCard 内 valueRow
QSB-1.2 -> assetCard 整体
QSB-1.3 -> announcementCard 与 resourceCard 标题区，联合定位
QSB-2.1 -> runTrendHeading 和 runMetricGrid 的稳定共同外层
QSB-2.2 -> viewSwitch
QSB-2.3 -> monthNavigator 与 scheduleFullscreenButton，联合定位
QSB-2.4 -> 当前日/周/月结构中的第一张真实 scheduleTaskItem
QSB-2.5 -> runTrendDataView
QSB-3.1 -> completionMetrics
QSB-3.2 -> anomalyDetails
```

Use `layout="block"` or `layout="fill"` for block objects without inserting marker nodes where they change Grid/Flex child counts. For `QSB-2.4`, wrap only the first task in the currently rendered schedule state; all other task DOM remains unchanged.

- [ ] **Step 5: Run the focused test**

Expected: the anchor/event test and all existing overview tests pass.

- [ ] **Step 6: Review the task diff checkpoint**

Run: `git diff --check -- src/pages/qsbOverview/index.tsx tests/qsbOverviewContent.test.ts`

Expected: no unrelated style or mock changes.

---

### Task 3: Connect overview annotations to the requirement shell

**Files:**
- Modify: `src/App.tsx`
- Test: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: `qsbOverviewAnnotations` and `QsbOverviewAnnotationDrawer`.
- Produces: enabled `交互标注 10` entry and the correct overview drawer branch.

- [ ] **Step 1: Write the failing shell integration test**

```ts
test('connects the overview annotation list and drawer to the requirement shell', () => {
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(appSource, /qsbOverviewAnnotations/);
  assert.match(appSource, /QsbOverviewAnnotationDrawer/);
  assert.match(appSource, /activeRequirement === 'qsbOverview'/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Expected: FAIL because overview annotation imports are absent.

- [ ] **Step 3: Add imports and active list selection**

```tsx
import {
  qsbOverviewAnnotations,
  QsbOverviewAnnotationDrawer,
} from '@/components/qsbOverviewAnnotations';

const activeAnnotations = activeRequirement === 'qsbOverview'
  ? qsbOverviewAnnotations
  : activeRequirement === 'messageCenter'
    ? messageCenterAnnotations
    : activeRequirement === 'autoRetryOptimization'
      ? autoRetryAnnotations
      : activeRequirement === 'etlDataMonitoringOptimization'
        ? etlDataMonitoringAnnotations
        : [];
```

- [ ] **Step 4: Add the overview drawer branch**

```tsx
{activeRequirement === 'qsbOverview' ? (
  <QsbOverviewAnnotationDrawer
    visible={annotationDrawerOpen}
    onClose={() => setAnnotationDrawerOpen(false)}
    onLocate={handleLocateAnnotation}
  />
) : activeRequirement === 'autoRetryOptimization' ? (
  <AutoRetryAnnotationDrawer
    visible={annotationDrawerOpen}
    onClose={() => setAnnotationDrawerOpen(false)}
    onLocate={handleLocateAnnotation}
  />
) : activeRequirement === 'etlDataMonitoringOptimization' ? (
  <EtlDataMonitoringAnnotationDrawer
    visible={annotationDrawerOpen}
    onClose={() => setAnnotationDrawerOpen(false)}
    onLocate={handleLocateAnnotation}
  />
) : (
  <MessageCenterAnnotationDrawer
    visible={annotationDrawerOpen}
    onClose={() => setAnnotationDrawerOpen(false)}
    onLocate={handleLocateAnnotation}
  />
)
```

Do not modify shared `handleLocateAnnotation`; Task 2 events make conditional targets visible before its retry loop finishes.

- [ ] **Step 5: Run the focused test**

Expected: all three annotation tests pass.

- [ ] **Step 6: Review the task diff checkpoint**

Run: `git diff --check -- src/App.tsx tests/qsbOverviewContent.test.ts`

Expected: only imports, active list selection, and drawer routing change in `App.tsx`.

---

### Task 4: Validate annotations, build, and verify the 5178 prototype

**Files:**
- Verify: `src/components/qsbOverviewAnnotations/data.ts`
- Verify: `src/components/qsbOverviewAnnotations/index.tsx`
- Verify: `src/pages/qsbOverview/index.tsx`
- Verify: `src/App.tsx`
- Verify: `tests/qsbOverviewContent.test.ts`

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: test, build, and browser evidence for all ten annotations.

- [ ] **Step 1: Run annotation validation**

Run:

```bash
python3 /Users/sensen/.codex/skills/prd-annotation/scripts/validate_annotations.py src
```

Expected: no missing required fields or broken IDs. Repeated page markers for `QSB-1.3` and `QSB-2.3` are intentional; annotation data records remain unique.

- [ ] **Step 2: Run the full available test suite**

Run: `npm run test:etl`

Expected: all tests pass, including the three new annotation tests.

- [ ] **Step 3: Run build and diff checks**

```bash
npm run build
git diff --check
```

Expected: TypeScript and Vite build pass; existing VChart chunk warnings may remain; no new error or whitespace failure.

- [ ] **Step 4: Confirm the 5178 server cwd**

```bash
lsof -nP -iTCP:5178 -sTCP:LISTEN
overview_server_pid=$(lsof -t -iTCP:5178 -sTCP:LISTEN | head -1)
lsof -a -p "$overview_server_pid" -d cwd -Fn
```

Expected cwd: `/Users/sensen/Desktop/storedata/qsb-requirement-iterations/412 迭代需求文件`.

- [ ] **Step 5: Verify entry, groups, copy, and all locate actions in the in-app browser**

Open `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype` and verify:

```text
入口：交互标注 10
分组：全部 / 账户与服务 / 运行趋势 / 数据完成与异常
数量：3 + 5 + 2 = 10
普通定位：QSB-1.1、1.2、2.1、2.2、3.1、3.2
联合定位：QSB-1.3、QSB-2.3
状态定位：QSB-2.4 自动切机器人视图；QSB-2.5 自动切运行数据视图
```

Confirm all cards have local rule and acceptance text, no stale `自定义周期`、`截图反馈`、`今日涉及店铺`、`平台交付情况`, and no console error/warning introduced by filtering, locating, switching, opening, or closing.

- [ ] **Step 6: Final scope review**

```bash
git status --short
git diff --stat
git diff -- src/components/qsbOverviewAnnotations src/pages/qsbOverview/index.tsx src/App.tsx tests/qsbOverviewContent.test.ts
```

Expected: implementation is limited to the five declared files/directories. Preserve all pre-existing user changes and leave implementation uncommitted unless the user explicitly requests a commit.
