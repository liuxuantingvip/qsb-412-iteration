# CRM 自动化开通需求 Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在取数宝 412 迭代原型新增可切换的“CRM 自动化开通”需求 Tab，PRD 与交互原型均只展示待拉齐空状态。

**Architecture:** 在现有需求 Key 联合类型与需求注册表中增加新入口，并用一个纯函数标识“待拉齐”需求。`App.tsx` 在 PRD 和交互原型两个分发点共用该函数，避免新 Tab 误落到既有页面。

**Tech Stack:** React 18、TypeScript 5.6、Arco Design、Node.js test runner、Vite 5。

**Spec:** `docs/superpowers/specs/2026-08-26-crm-provisioning-automation-tab-design.md`

## Global Constraints

- 需求 Key 固定为 `crmProvisioningAutomation`。
- Tab 文案固定为“CRM 自动化开通”，且排在现有需求列表末尾。
- PRD 和交互原型均只显示“需求待拉齐”空状态。
- 不增加 CRM 业务流程、mock 数据、真实接口或生产实现。

---

### Task 1: 注册待拉齐需求

**Files:**
- Modify: `src/context/RequirementContext.tsx`
- Modify: `src/iterationRequirements.ts`
- Test: `tests/iterationRequirements.test.ts`

**Interfaces:**
- Consumes: 现有 `RequirementKey` 联合类型和 `iterationRequirements` 顺序列表。
- Produces: `crmProvisioningAutomation` 需求 Key，以及 `isRequirementPendingAlignment(key: RequirementKey): boolean`。

- [ ] **Step 1: 先更新需求注册测试**

```ts
import {
  isRequirementPendingAlignment,
  iterationMeta,
  iterationRequirements,
} from '../src/iterationRequirements.ts';

assert.deepEqual(
  iterationRequirements.map(({ key, label }) => [key, label]),
  [
    ['qsbOverview', '概览'],
    ['etlDataMonitoringOptimization', '数据监控优化'],
    ['pushStrategyOptimization', '推送策略中心优化'],
    ['messageCenter', '公告推送'],
    ['crmProvisioningAutomation', 'CRM 自动化开通'],
  ],
);

assert.equal(isRequirementPendingAlignment('crmProvisioningAutomation'), true);
assert.equal(isRequirementPendingAlignment('qsbOverview'), false);
```

- [ ] **Step 2: 运行定向测试确认失败**

Run: `node --test --experimental-strip-types tests/iterationRequirements.test.ts`

Expected: FAIL，因为新需求未注册且 `isRequirementPendingAlignment` 尚未导出。

- [ ] **Step 3: 实现最小需求注册**

```ts
export type RequirementKey =
  | 'basePortal'
  | 'cloudResourceAutomation'
  | 'autoRetryOptimization'
  | 'businessCustomParameterExperience'
  | 'qsbOverview'
  | 'openApiOptimization'
  | 'etlDataMonitoringOptimization'
  | 'messageCenter'
  | 'pushStrategyOptimization'
  | 'crmProvisioningAutomation';

export const iterationRequirements = [
  { key: 'qsbOverview', label: '概览' },
  { key: 'etlDataMonitoringOptimization', label: '数据监控优化' },
  { key: 'pushStrategyOptimization', label: '推送策略中心优化' },
  { key: 'messageCenter', label: '公告推送' },
  { key: 'crmProvisioningAutomation', label: 'CRM 自动化开通' },
];

export const isRequirementPendingAlignment = (key: RequirementKey) => (
  key === 'crmProvisioningAutomation'
);
```

- [ ] **Step 4: 重跑定向测试**

Run: `node --test --experimental-strip-types tests/iterationRequirements.test.ts`

Expected: PASS，共 3 个测试通过。

### Task 2: 接入 PRD 与交互原型空状态

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `isRequirementPendingAlignment(key: RequirementKey): boolean`。
- Produces: 新 Tab 在 `prd` 和 `prototype` 两个视图中的“需求待拉齐”空状态。

- [ ] **Step 1: 在 PRD 分发中增加待拉齐空状态**

```tsx
if (isRequirementPendingAlignment(activeRequirement)) {
  return <div className="portal-empty-page"><Empty description="需求待拉齐" /></div>;
}
```

- [ ] **Step 2: 在交互原型分发中阻止误入门户页**

```tsx
{isRequirementPendingAlignment(activeRequirement) ? (
  <div className="portal-empty-page"><Empty description="需求待拉齐" /></div>
) : (
  <div className="portal-popup-root">{/* existing portal */}</div>
)}
```

- [ ] **Step 3: 运行完整原型测试**

Run: `npm run test:etl`

Expected: PASS，包含更新后的需求注册测试。

- [ ] **Step 4: 运行构建与 diff check**

Run: `npm run build`

Expected: TypeScript 检查和 Vite 构建通过。

Run: `git diff --check -- '412 迭代需求文件/src' '412 迭代需求文件/tests'`

Expected: 无输出。

- [ ] **Step 5: 使用 Codex 内嵌浏览器验收**

打开 `http://127.0.0.1:5178/?requirement=crmProvisioningAutomation&tab=prototype`，验证 Tab、空状态和 URL；再切换到 PRD，确认同样显示空状态且控制台无错误。

- [ ] **Step 6: 提交实现**

```bash
git add -- \
  '412 迭代需求文件/src/App.tsx' \
  '412 迭代需求文件/src/context/RequirementContext.tsx' \
  '412 迭代需求文件/src/iterationRequirements.ts' \
  '412 迭代需求文件/tests/iterationRequirements.test.ts'
git commit -m 'feat: 新增 CRM 自动化开通待拉齐入口'
```
