# QSB Overview Card Borders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将概览页背景改为白色，并为全部页面板块增加 Arco 中性色描边。

**Architecture:** 复用 `qsbOverview` 现有公共 `.card` 容器，一处定义所有板块的描边。页面背景只在该页 `.page` 根容器内修改，不影响门户壳或其他需求页。

**Tech Stack:** React 18, Less, Arco Design CSS variables, Vite

**Spec:** `docs/superpowers/specs/2026-08-25-qsb-overview-card-borders-design.md`

## Global Constraints

- 页面容器背景必须为 `#fff`。
- `.card` 描边必须为 `1px solid var(--color-neutral-2)`。
- 保留现有 8px 圆角、8px 板块间距、内边距和固定高度。
- 不新增断点特例，不修改板块内部元素样式。

---

### Task 1: 概览页板块边界样式

**Files:**
- Modify: `src/pages/qsbOverview/index.module.less:3-7`

**Interfaces:**
- Consumes: `index.tsx` 已有的 `styles.page` 和 `styles.card` className
- Produces: 页面白色背景及 7 个 `.card` 板块的统一描边

- [ ] **Step 1: 记录当前样式基线**

Run:

```bash
sed -n '1,12p' src/pages/qsbOverview/index.module.less
```

Expected: `.page` 使用 `background: #f5f7fa`，`.card` 没有 `border` 声明。

- [ ] **Step 2: 实现最小样式修改**

将两条规则更新为：

```less
.page { min-height: 100%; color: #1d2129; background: #fff; }
.card { min-width: 0; overflow: hidden; border: 1px solid var(--color-neutral-2); border-radius: 8px; background: #fff; }
```

- [ ] **Step 3: 检查变更范围和格式**

Run:

```bash
git diff --check -- src/pages/qsbOverview/index.module.less
git diff -- src/pages/qsbOverview/index.module.less
```

Expected: 只有 `.page` 背景和 `.card` 描边两处样式变更，`git diff --check` 无输出。

- [ ] **Step 4: 构建验证**

Run:

```bash
npm run build
```

Expected: Vite 构建成功退出，无 Less 或 TypeScript 错误。

- [ ] **Step 5: 5178 真页验收**

在 Codex 内嵌浏览器打开：

```text
http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype
```

Expected:

- 页面容器背景为白色。
- 账户、我的资产、公告、资源中心、运行趋势、数据概况和数据异常均显示中性色 1px 描边。
- 板块内容无溢出、裁切或明显尺寸偏移。

- [ ] **Step 6: 提交实现**

```bash
git add -- src/pages/qsbOverview/index.module.less
git commit -m 'style: 增强概览板块边界' \
  -m '问题描述：概览页白色板块缺少清晰边界。' \
  -m '修复思路：页面背景改白，并在公共 card 容器上统一增加 neutral-2 描边。'
```
