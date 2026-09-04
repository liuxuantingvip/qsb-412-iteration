# 平台交付分布树图实施计划

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将“平台交付情况”环图替换为体现父平台—子平台层级的“平台交付分布”树图，并把公告列表间距调整为 8px。

**Architecture:** 保留“今日涉及店铺”环图；平台侧新增子平台 mock 数据，由快照层按父平台交付量等比分配到子平台，再生成 VChart treemap spec。页面只替换平台区域，复用现有专属 VChart 主题与懒加载图表边界。

**Tech Stack:** React、TypeScript、Less、@visactor/react-vchart、Vitest

---

### Task 1: 建立父平台—子平台交付数据与树图 spec

**Files:**
- Modify: `src/pages/qsbOverview/overviewContent.ts`
- Test: `src/pages/qsbOverview/overviewContent.test.ts`

**Step 1: Write the failing test**

- 校验每个父平台包含子平台。
- 校验子平台 `delivered`、`total` 汇总分别等于父平台数据。
- 校验 treemap spec 的 `type`、层级数据、交付量字段与完成率字段。

**Step 2: Run test to verify it fails**

Run: `npm run test:etl -- src/pages/qsbOverview/overviewContent.test.ts`
Expected: FAIL，因为树图构建函数和子平台数据尚不存在。

**Step 3: Write minimal implementation**

- 给 8 个父平台补齐真实业务语义的子平台 mock。
- 快照切换时，按基础权重把父平台交付量分配到子平台，确保汇总值精确一致。
- 新增 `buildPlatformDeliveryTreemapSpec`，用面积表示交付量、蓝色深浅表示交付量层级，tooltip 展示父平台、子平台、交付量和完成率。

**Step 4: Run test to verify it passes**

Run: `npm run test:etl -- src/pages/qsbOverview/overviewContent.test.ts`
Expected: PASS。

### Task 2: 替换平台图表并调整公告间距

**Files:**
- Modify: `src/pages/qsbOverview/OverviewCharts.tsx`
- Modify: `src/pages/qsbOverview/index.tsx`
- Modify: `src/pages/qsbOverview/index.module.less`
- Test: `src/pages/qsbOverview/overviewContent.test.ts`

**Step 1: Write the failing test**

- 校验页面源码包含“平台交付分布”和 `PlatformDistributionChart`。
- 校验平台区域不再渲染原环图及百分比列表。

**Step 2: Run test to verify it fails**

Run: `npm run test:etl -- src/pages/qsbOverview/overviewContent.test.ts`
Expected: FAIL，因为页面仍使用环图。

**Step 3: Write minimal implementation**

- 在 `OverviewCharts.tsx` 暴露 Treemap 图表组件。
- 页面懒加载树图，标题固定为“平台交付分布”。
- 保留“今日涉及店铺”环图，不改其他数据概况内容。
- 树图填满原平台图区域；公告列表 `gap` 改为 `8px`。

**Step 4: Run tests and build**

Run: `npm run test:etl -- src/pages/qsbOverview/overviewContent.test.ts`
Expected: PASS。

Run: `npm run build`
Expected: PASS，无 TypeScript/Vite 构建错误。

**Step 5: Verify in the embedded browser**

- 确认 5178 listener 的 cwd 是 412 子项目。
- 打开 `?requirement=qsbOverview&tab=prototype`。
- 校验标题为“平台交付分布”，树图可见，父平台与子平台层级清楚，hover 展示下钻信息。
- 校验公告条目垂直间距为 8px，页面无控制台错误。
