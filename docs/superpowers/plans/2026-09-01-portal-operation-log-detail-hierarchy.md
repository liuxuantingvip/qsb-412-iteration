# 门户操作日志详情信息层级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将操作日志详情从灰底卡片集合收口为“无底色基础信息 + 按需审计详情”。

**Architecture:** 保留现有 `PortalOperationLog` 页面、抽屉和 `OperationLogRecord` 数据结构，只调整详情 JSX 与局部样式。抽屉直接从基础信息开始；失败原因、请求摘要和字段变更继续使用已有可选字段，并以 `detailAvailable` 控制详情区是否渲染。

**Tech Stack:** React、TypeScript、Arco Design、Less、Node.js test runner

**Spec:** `docs/superpowers/specs/2026-09-01-portal-operation-log-design.md`

## Global Constraints

- 抽屉桌面端宽度保持 `720px`。
- 不新增解释性文案、操作入口或数据字段。
- 基础信息不使用灰底卡片。
- 普通操作没有失败原因、请求摘要或字段变更时，不渲染空详情区块。
- Token、API Key、密码、Cookie、密钥和完整敏感参数不得展示。

---

### Task 1: 锁定详情信息层级回归

**Files:**
- Modify: `tests/portalOperationLog.test.ts`

**Interfaces:**
- Consumes: `src/pages/portalOperationLog/index.tsx` 与 `index.module.less` 源码文本
- Produces: 回归断言，约束无卡片基础信息和条件化详情

- [ ] **Step 1: 写入失败断言**

在现有详情布局测试中增加：

```ts
assert.doesNotMatch(page, /className=\{styles\.operationSummary\}/);
assert.match(page, /\{detailAvailable \? \(/);
assert.doesNotMatch(page, /<Empty description="详情暂不可用" \/>/);
assert.doesNotMatch(styles, /\.basicInfoItem[\s\S]*?background:/);
assert.match(styles, /\.changeHeader/);
```

- [ ] **Step 2: 运行专项测试并确认失败**

Run: `node --test --experimental-strip-types tests/portalOperationLog.test.ts`

Expected: FAIL，仍存在 `operationSummary` 和空详情，缺少 `changeHeader`，基础信息仍有背景色。

- [ ] **Step 3: 保留失败证据并进入实现**

确认失败仅来自本任务新增断言，不修改其他测试。

---

### Task 2: 重排详情抽屉

**Files:**
- Modify: `src/pages/portalOperationLog/index.tsx`
- Modify: `src/pages/portalOperationLog/index.module.less`
- Test: `tests/portalOperationLog.test.ts`

**Interfaces:**
- Consumes: `activeRecord: OperationLogRecord | null`、`detailAvailable: boolean`
- Produces: `.basicInfoGrid`、`.changeHeader`、`.changeRow` 详情结构

- [ ] **Step 1: 删除重复摘要**

抽屉直接从基础信息开始，不渲染以下重复结构：

```tsx
assert.doesNotMatch(page, /className=\{styles\.operationSummary\}/);
```

- [ ] **Step 2: 基础信息改为无卡片键值布局**

保留操作时间、操作者、功能模块、操作类型、操作结果、IP 地址及条件化凭证名称；移除基础信息中的操作内容，`.basicInfoItem` 仅使用网格、留白与底部分割线，不设置背景和圆角。

- [ ] **Step 3: 详情区仅在有数据时渲染**

将详情区外层改为：

```tsx
{detailAvailable ? (
  <div className={styles.detailSection}>
    <h3>操作详情</h3>
    <div className={styles.detailList}>
      {activeRecord.failureReason ? (
        <div><span>失败原因</span><strong>{activeRecord.failureReason}</strong></div>
      ) : null}
    </div>
  </div>
) : null}
```

失败原因、脱敏请求摘要继续使用两列键值行；存在 `changes` 时增加表头：

```tsx
<div className={styles.changeHeader}>
  <span>变更字段</span>
  <span>变更前</span>
  <span>变更后</span>
</div>
```

- [ ] **Step 4: 运行专项测试**

Run: `node --test --experimental-strip-types tests/portalOperationLog.test.ts`

Expected: 27 tests PASS。

- [ ] **Step 5: 运行完整验证**

Run: `npm run test:etl`

Expected: all tests PASS。

Run: `npm run build`

Expected: TypeScript check and Vite build PASS。

Run: `git diff --check`

Expected: no output。

- [ ] **Step 6: 内嵌浏览器验收**

打开 `http://127.0.0.1:5178/?requirement=portalOperationLog&tab=prototype`，分别检查：

- 普通导入记录：有行为摘要和基础信息，无灰底卡片、无“详情暂不可用”；
- 修改记录：展示“变更字段 / 变更前 / 变更后”；
- 失败记录：展示失败原因；
- 页面控制台无 error。

- [ ] **Step 7: 精确提交**

```bash
git add -- src/pages/portalOperationLog/index.tsx src/pages/portalOperationLog/index.module.less tests/portalOperationLog.test.ts
git commit -m "fix: 调整门户日志详情信息层级"
```
