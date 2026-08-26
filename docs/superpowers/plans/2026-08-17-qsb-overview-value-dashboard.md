# 取数宝「概况」价值看板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有偏日常运维的概况页重构为以「预计节省人工取数工时」为核心、兼顾资源覆盖与交付保障的年度价值汇报页面。

**Architecture:** 保留现有取数宝应用框架和路由，只重构 `qsbOverview` 页面。页面数据在组件内以明确的周期指标、当前快照和今日运行类型组织；筛选、日期、统计、提示、进度和按钮使用 Arco Design，趋势可视化使用正式图表组件，禁止手写 SVG 或 CSS 假图。

**Tech Stack:** React 18、TypeScript 5.6、Vite 5、Arco Design React 2.66、Less CSS Modules。

## Global Constraints

- 页面标题固定为「概况」。
- 默认最近 12 个月，支持自定义日期范围、上一等长周期对比和全屏，不提供导出。
- 北极星指标固定为「预计节省人工取数工时」。
- 事实指标固定为「计划取数运行次数」「成功入库次数」「成功入库数据量」。
- 当前资源固定展示店铺、计划、连接器、云桌面和目标数据库。
- 周期指标随日期筛选变化；当前资源快照不随日期筛选变化。
- 文案使用「计划取数运行」，禁止使用「自动运行」。
- 不展示「无人干预完成率」「主下钻路径」「独立分析维度」等内部语言。
- 所有通用交互控件优先使用 `@arco-design/web-react` 和 `@arco-design/web-react/icon`。
- 不修改 `source-copy`、`dist` 或与概况页无关的现有文件。

---

### Task 1: 确定视觉目标

**Files:**
- Reference: `overview-current-reference.png`
- Reference: `.superpowers/brainstorm/13621-1786971724/content/overview-product-v7.html`
- Reference: `docs/superpowers/specs/2026-08-17-qsb-overview-value-dashboard-design.md`

**Interfaces:**
- Consumes: 已确认的产品规格、现有取数宝真页截图和低保真信息架构。
- Produces: 用户明确选中的一张 1440 × 1024 视觉目标图，作为后续实现和视觉 QA 的唯一目标。

- [ ] **Step 1: 生成三套独立视觉方向**

每套必须保留现有取数宝导航、Arco 设计语言和相同产品内容，但分别探索不同的信息层级、栅格和汇报感；不得生成三个配色不同但结构相同的版本。

- [ ] **Step 2: 检查三套方案完整性**

逐张确认可见：标题、日期范围、周期对比、全屏、北极星指标、三项事实指标、人效趋势、业务覆盖、五项当前资源、周期质量和今日运行。

- [ ] **Step 3: 获取用户选择**

用户选择后，将该图记为唯一视觉基准；若用户要求组合或调整，先生成修订图并重新选择，禁止直接在代码里猜测。

### Task 2: 建立概况数据模型与筛选状态

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`

**Interfaces:**
- Consumes: `QsbOverviewProps` 现有页面入口回调。
- Produces: `PeriodRange`、`PeriodMetrics`、`CurrentResourceSnapshot`、`CoverageMetrics`、`QualityMetrics`、`TodayRunMetrics` 类型和对应 mock 数据。

- [ ] **Step 1: 定义周期与指标类型**

```tsx
type CompareMode = 'previous-period' | 'none';

interface PeriodRange {
  start: string;
  end: string;
}

interface PeriodMetrics {
  estimatedSavedHours: number;
  savedHoursChangeRate: number;
  equivalentPersonYears: number;
  estimateCoverageRate: number;
  estimateVersion: string;
  planRunCount: number;
  planRunChangeRate: number;
  successfulIngestionCount: number;
  ingestionSuccessRate: number;
  ingestedRowCount: number;
  ingestedFileSize: string;
}

interface CurrentResourceSnapshot {
  shopCount: number;
  planCount: number;
  connectorCount: number;
  cloudDesktopUsed: number;
  cloudDesktopTotal: number;
  targetDatabaseCount: number;
}
```

- [ ] **Step 2: 定义覆盖、质量和今日运行类型**

```tsx
interface PlatformCoverageItem {
  platform: string;
  shopCount: number;
  share: number;
}

interface CoverageMetrics {
  runningShopCount: number;
  runningPlanCount: number;
  usedConnectorCount: number;
  platformCount: number;
  platforms: PlatformCoverageItem[];
}

interface QualityMetrics {
  ingestionSuccessRate: number;
  onTimeCompletionRate: number;
  exceptionRecoveryRate: number;
}

interface TodayRunMetrics {
  completed: number;
  retrying: number;
  pending: number;
  delayed: number;
}
```

- [ ] **Step 3: 建立组件状态**

```tsx
const [periodRange, setPeriodRange] = useState<PeriodRange>({
  start: '2025-08-01',
  end: '2026-07-31',
});
const [compareMode, setCompareMode] = useState<CompareMode>('previous-period');
const [isFullscreen, setIsFullscreen] = useState(false);
```

- [ ] **Step 4: 删除旧概况专用数据与状态**

移除旧的异常 Tabs、公告、手写环形图、旧趋势范围以及只服务于旧布局的类型和常量；保留 `QsbOverviewProps` 中仍被外层调用的回调，避免破坏路由接口。

- [ ] **Step 5: 运行类型检查**

Run: `npm run build`

Expected: TypeScript 不再引用被移除的旧类型、常量或图标；构建通过。

### Task 3: 实现顶部筛选与取数成效区

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: Task 2 的 `periodRange`、`compareMode`、`PeriodMetrics`。
- Produces: 可交互的页面头部与四项成效指标。

- [ ] **Step 1: 使用 Arco 组件实现顶部操作区**

```tsx
import {
  Button,
  DatePicker,
  Grid,
  Select,
  Statistic,
  Tooltip,
} from '@arco-design/web-react';
import { IconFullscreen } from '@arco-design/web-react/icon';

const { RangePicker } = DatePicker;
const { Row, Col } = Grid;
```

日期范围使用 `RangePicker`；比较方式使用 `Select`；全屏使用带 `IconFullscreen` 的主操作按钮。禁止用普通 `div` 模拟输入框或按钮。

- [ ] **Step 2: 实现北极星指标**

北极星指标展示：预计节省人工取数工时、周期变化、约合人年、估算覆盖率和口径版本。信息提示使用 Arco `Tooltip`，不得把完整计算方法塞进主卡片。

- [ ] **Step 3: 实现三项事实指标**

使用相同栅格和文字层级展示计划取数运行次数、成功入库次数、成功入库数据量；数据量主值为条，容量为辅助说明。

- [ ] **Step 4: 校验响应式栅格**

在 1440 × 1024 下首屏不横向滚动；页面低于 1280px 时指标允许按现有项目响应式规则换行，但不得把字号压缩到不可读。

- [ ] **Step 5: 构建验证**

Run: `npm run build`

Expected: 构建通过，Arco 组件 API 和图标导入无类型错误。

### Task 4: 实现趋势、覆盖与当前资源

**Files:**
- Modify: `package.json` only if the selected visual requires a trend chart and the project仍无可复用图表组件
- Modify: lockfile corresponding to the package manager actually used by the repository
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: Task 2 的周期趋势数据、`CoverageMetrics`、`CurrentResourceSnapshot`。
- Produces: 正式趋势图、业务覆盖和五项当前资源快照。

- [ ] **Step 1: 复用或引入正式图表组件**

先检索项目内可复用图表；若不存在，只引入一个 React 18 兼容的正式图表依赖。不得手写 SVG、Canvas 绘图代码或 CSS 折线。

- [ ] **Step 2: 实现预计节省工时趋势**

趋势图默认按月显示，具备坐标轴、Tooltip 和空数据状态。日期短周期时将聚合粒度切换为日或周，但不在页面展示内部聚合规则。

- [ ] **Step 3: 实现业务覆盖**

展示运行店铺、运行计划、使用连接器和覆盖平台四项摘要，并用 Arco `Progress` 展示主要平台店铺分布；其余平台合并为「其他」。

- [ ] **Step 4: 实现当前资源快照**

同一行展示店铺数、计划数、连接器数、云桌面已用/总数和目标数据库数；模块标题明确标注「当前资源」，并注明不随时间范围变化。

- [ ] **Step 5: 验证数据语义**

切换日期范围后，周期趋势和业务覆盖更新；当前资源数值保持不变。关闭对比后，所有变化比例同时消失且不保留空白占位。

### Task 5: 实现运行质量、今日运行与全屏

**Files:**
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`

**Interfaces:**
- Consumes: Task 2 的 `QualityMetrics`、`TodayRunMetrics`、`isFullscreen`。
- Produces: 周期质量、今日运行、异常入口和完整全屏汇报状态。

- [ ] **Step 1: 实现周期质量**

展示入库成功率、按期完成率和异常恢复率。默认使用中性色，只有低于阈值的指标使用警示色。

- [ ] **Step 2: 实现今日运行**

展示已完成、正在重试、待处理和延迟；「待处理」提供现有异常处理入口。没有异常时显示正常状态，不使用庆祝插画或大面积绿色。

- [ ] **Step 3: 实现全屏交互**

```tsx
async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
    setIsFullscreen(true);
    return;
  }
  await document.exitFullscreen();
  setIsFullscreen(false);
}
```

同时监听 `fullscreenchange`，确保用户按 Esc 退出时按钮状态同步。全屏时隐藏外围导航但保留时间和对比筛选。

- [ ] **Step 4: 增加加载、空数据和部分失败状态**

使用 Arco `Skeleton`、`Empty` 和 `Alert`：周期数据加载、无周期数据、估算覆盖不足、当前资源失败必须互不阻塞。

- [ ] **Step 5: 构建验证**

Run: `npm run build`

Expected: 构建通过；全屏 API、状态组件和页面回调无类型错误。

### Task 6: 同步 PRD 页面

**Files:**
- Modify: `src/pages/qsbOverviewPrd/index.tsx`

**Interfaces:**
- Consumes: 已确认产品规格和 Task 2-5 的最终页面行为。
- Produces: 与运行原型一致的 PRD 范围、用户故事、交互规则和验收口径。

- [ ] **Step 1: 更新目标和用户故事**

将旧的「30 秒判断今日交付」主目标调整为「年度价值证明优先、日常交付监控其次」，核心角色改为电商业务负责人，并保留运营交付角色的次级场景。

- [ ] **Step 2: 更新功能范围**

PRD 必须包含：自定义周期、上一等长周期对比、全屏、预计节省人工取数工时、三项事实指标、业务覆盖、当前资源、周期质量、今日运行和本期不导出。

- [ ] **Step 3: 更新验收口径**

写明周期指标与当前快照的时间差异、估算工时口径、条与容量的主辅关系，以及不得展示的内部方法论和旧指标。

- [ ] **Step 4: 构建验证**

Run: `npm run build`

Expected: PRD 页面和运行原型均可构建，文案无旧目标残留。

### Task 7: 产品与视觉双重 QA

**Files:**
- Create: `overview-value-dashboard-implementation.png`
- Create: `overview-value-dashboard-comparison.png`
- Create: `docs/superpowers/reviews/2026-08-17-qsb-overview-visual-qa.md`

**Interfaces:**
- Consumes: 用户选中的视觉目标图和完成后的真页。
- Produces: 同视口对比图、问题清单和关闭结果。

- [ ] **Step 1: 启动当前项目**

Run: `npm run dev -- --port 5177`

Expected: `http://127.0.0.1:5177/?requirement=autoRetryOptimization&tab=prototype` 可在用户选定的内嵌浏览器打开。

- [ ] **Step 2: 验证核心交互**

在内嵌浏览器实点：日期范围、对比方式、全屏进入与 Esc 退出、趋势 Tooltip、贡献明细、平台明细和异常入口。

- [ ] **Step 3: 验证产品口径**

检查五项资源完整、周期与快照标识明确、不出现禁用文案、不推断下游数据库使用、今日运行不抢占首屏价值叙事。

- [ ] **Step 4: 进行同视口视觉对比**

以 1440 × 1024 分别截取选定目标图和真页，将两张图合并后检查栅格、间距、字号、颜色、边框、阴影、圆角、裁切和溢出。截图本身不算通过，必须记录差异并逐项修复。

- [ ] **Step 5: 循环修复**

每轮只修改 QA 清单中的可见问题，重新构建、重新截图和重新比较，直到没有阻断问题和高优先级视觉偏差。

- [ ] **Step 6: 最终验证**

Run: `npm run build`

Expected: 构建通过；浏览器控制台无新增错误；QA 文档中所有阻断项关闭。
