# 门户操作日志布局收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除筛选区顶置字段名，并将操作详情基础信息改为更宽松的两列布局。

**Architecture:** 保留现有筛选状态、日志字段和抽屉交互，只调整 `PortalOperationLog` 的 JSX 和局部样式。筛选控件使用占位文案与无障碍名称；抽屉基础信息使用两列 CSS Grid，操作内容跨两列。

**Tech Stack:** React 18、TypeScript、Arco Design、CSS Modules/Less、Node test runner、Vite

**Spec:** `docs/superpowers/specs/2026-09-01-portal-operation-log-design.md`

## Global Constraints

- 筛选控件不展示独立的顶置字段名。
- 时间范围保留无障碍名称，但不额外占用可见行高。
- 详情抽屉桌面端宽度为 `720px`。
- 基础信息为两列留白布局，字段名在上、字段值在下，操作内容独占整行。
- 不改动日志字段、筛选逻辑、数据口径、脱敏与导出行为。

---

### Task 1: 收口筛选区与详情基础信息

**Files:**
- Modify: `src/pages/portalOperationLog/index.tsx`
- Modify: `src/pages/portalOperationLog/index.module.less`
- Test: `tests/portalOperationLog.test.ts`

**Interfaces:**
- Consumes: `OperationLogRecord`、`ResultTag`、现有 `PageFilters` 和 `updateFilter`。
- Produces: 不改变组件对外签名；仅新增 `basicInfoGrid`、`basicInfoItem`、`basicInfoItemWide`、`basicInfoLabel`、`basicInfoValue` 局部样式契约。

- [ ] **Step 1: 先写布局回归断言**

  在 `tests/portalOperationLog.test.ts` 的页面源码回归中增加：

  ```ts
  assert.doesNotMatch(page, /<span>时间范围<\/span>/);
  assert.doesNotMatch(page, /<span>操作者<\/span>/);
  assert.match(page, /aria-label="时间范围"/);
  assert.match(page, /width={720}/);
  assert.match(page, /className={styles\.basicInfoGrid}/);
  assert.match(page, /className={styles\.basicInfoItemWide}/);
  assert.doesNotMatch(page, /<Descriptions/);
  ```

- [ ] **Step 2: 运行聚焦测试确认红灯**

  Run: `node --test --experimental-strip-types tests/portalOperationLog.test.ts`

  Expected: FAIL，原因为页面仍渲染顶置字段名、`Descriptions` 和 `width={640}`。

- [ ] **Step 3: 实现最小 JSX 调整**

  - 删除四个公共筛选控件上方的 `<span>` 标签，API/MCP 凭证筛选同样去掉顶置标签。
  - 为 `RangePicker` 增加 `aria-label="时间范围"`，Select 保留现有占位文案。
  - 将 `Drawer width={640}` 改为 `width={720}`。
  - 移除 `Descriptions` 导入和组件，使用 `basicInfoGrid` 渲染基础信息；操作内容使用 `basicInfoItemWide`。

- [ ] **Step 4: 实现最小 Less 布局**

  ```less
  .filterBar {
    align-items: center;
  }

  .filterItem {
    display: block;
  }

  .basicInfoGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .basicInfoItem {
    display: grid;
    gap: 8px;
    padding: 16px;
    border-radius: var(--qsb-radius-8);
    background: var(--color-fill-1);
  }

  .basicInfoItemWide {
    grid-column: 1 / -1;
  }
  ```

- [ ] **Step 5: 运行聚焦、全量和构建验证**

  Run: `node --test --experimental-strip-types tests/portalOperationLog.test.ts`

  Expected: PASS。

  Run: `npm run test:etl`

  Expected: PASS。

  Run: `npm run build`

  Expected: PASS；允许既有 VChart circular-chunk 和大 chunk warning。

- [ ] **Step 6: 内嵌浏览器验收**

  在 `http://127.0.0.1:5178/?requirement=portalOperationLog&tab=prototype` 核对：

  - 筛选控件上方无独立字段名行；
  - 点击日志行打开 720px 抽屉；
  - 基础信息两列分组，操作内容独占整行；
  - 抽屉和页面无横向溢出，新会话控制台 0 error。

- [ ] **Step 7: 提交**

  ```bash
  git add src/pages/portalOperationLog/index.tsx src/pages/portalOperationLog/index.module.less tests/portalOperationLog.test.ts
  git commit -m "fix: 收口门户日志筛选与详情布局"
  ```
