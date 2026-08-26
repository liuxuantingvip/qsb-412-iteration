# Account and Open Platform Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 412 原型中补齐右上角用户菜单、个人中心和开放平台侧栏，并让下拉菜单与用户触发区等宽对齐。

**Architecture:** 将账号区域的菜单结构抽成纯 TypeScript 配置，由 `App.tsx` 负责区域切换和侧栏渲染，由现有 `OpenApiOptimization` 页面按菜单键渲染账号内容、API Keys 或统一空状态。样式只在全局门户样式中补充用户下拉宽度，不改动生产子应用。

**Tech Stack:** React 18、TypeScript 5.6、Arco Design、Less、Node test、Vite 5

**Spec:** `docs/superpowers/specs/2026-08-20-account-and-open-platform-navigation-design.md`

## Global Constraints

- 仅修改当前 `5178` 对应的 `412 迭代需求文件`。
- 不修改 411 相邻副本、生产子应用或后端接口。
- 不为占位页面新增 mock CRUD、持久化或鉴权逻辑。
- 同步修正相关 PRD 中“开发平台”的旧称和入口路径。

---

### Task 1: Account navigation model

**Files:**
- Create: `src/accountNavigation.ts`
- Create: `tests/accountNavigation.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `AccountArea`, `AccountMenuKey`, `accountNavigation`, `accountDefaultMenuKey`, `accountMenuKeys`, `isAccountArea(value)` and `isAccountMenuKey(value)`.
- Consumes: Chinese menu labels approved in the design spec.

- [ ] **Step 1: Write the failing navigation test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accountDefaultMenuKey,
  accountNavigation,
  isAccountMenuKey,
} from '../src/accountNavigation.ts';

test('defines the approved account navigation hierarchy', () => {
  assert.deepEqual(accountNavigation['个人中心'], [
    '账号设置', '连接器管理', '存储管理', '短信队列管理', '机器人设备管理',
  ]);
  assert.deepEqual(accountNavigation['开放平台'], ['API Keys', 'MCP 服务', '回调服务']);
  assert.equal(accountDefaultMenuKey['个人中心'], '账号设置');
  assert.equal(accountDefaultMenuKey['开放平台'], 'API Keys');
  assert.equal(isAccountMenuKey('MCP 服务'), true);
});
```

- [ ] **Step 2: Add the test to `test:etl` and verify it fails**

Run: `npm run test:etl`

Expected: FAIL because `src/accountNavigation.ts` does not exist.

- [ ] **Step 3: Implement the typed navigation model**

```ts
export const accountNavigation = {
  个人中心: ['账号设置', '连接器管理', '存储管理', '短信队列管理', '机器人设备管理'],
  开放平台: ['API Keys', 'MCP 服务', '回调服务'],
} as const;

export type AccountArea = keyof typeof accountNavigation;
export type AccountMenuKey = typeof accountNavigation[AccountArea][number];

export const accountDefaultMenuKey: Record<AccountArea, AccountMenuKey> = {
  个人中心: '账号设置',
  开放平台: 'API Keys',
};

export const accountMenuKeys = Object.values(accountNavigation).flat();

export const isAccountArea = (value: string): value is AccountArea => value in accountNavigation;
export const isAccountMenuKey = (value: string): value is AccountMenuKey => (
  accountMenuKeys.includes(value as AccountMenuKey)
);
```

- [ ] **Step 4: Run the focused tests**

Run: `npm run test:etl`

Expected: all Node tests PASS, including the new hierarchy test.

### Task 2: Header dropdown and context-specific sidebar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles/global.less`

**Interfaces:**
- Consumes: `accountNavigation`, `accountDefaultMenuKey`, `isAccountArea`, and `isAccountMenuKey` from Task 1.
- Produces: dropdown actions `profile`, `open-platform`, `logout`; account area switching; one-level side navigation for the selected account area.

- [ ] **Step 1: Replace local personal-center key checks with the typed model**

Import the Task 1 exports, include both account areas in `showPortalSider`, route both areas to `OpenApiOptimization`, and apply `portal-content-personal-center` to every `isAccountMenuKey(selectedMenuKey)` account page.

- [ ] **Step 2: Implement the three-item user dropdown**

```tsx
const handleUserMenuClick = (key: string) => {
  const area = key === 'profile' ? '个人中心' : key === 'open-platform' ? '开放平台' : null;
  if (!area) return;
  setSelectedTopTab(area);
  setSelectedMenuKey(accountDefaultMenuKey[area]);
  setCollapsed(false);
};

const userMenu = (
  <Menu className="portal-user-menu" onClickMenuItem={handleUserMenuClick}>
    <Menu.Item key="profile">个人中心</Menu.Item>
    <Menu.Item key="open-platform">开放平台</Menu.Item>
    <Menu.Item key="logout">退出登录</Menu.Item>
  </Menu>
);
```

- [ ] **Step 3: Render the selected account area's sidebar**

Map `accountNavigation[selectedTopTab]` into one-level `Menu.Item` entries whenever `isAccountArea(selectedTopTab)` is true. Keep product and backend menus unchanged.

- [ ] **Step 4: Match popup and trigger width**

```less
.portal-user-menu {
  width: @size-36;
}
```

Keep `.portal-user-trigger.arco-btn-text` at `width: @size-36` and `position="br"` so the popup and trigger share the right edge and width.

- [ ] **Step 5: Run type-check and production build**

Run: `npm run build`

Expected: TypeScript and Vite build complete with exit code 0.

### Task 3: Account pages, open-platform placeholders, and PRD copy

**Files:**
- Modify: `src/pages/openApiOptimization/index.tsx`
- Modify: `src/pages/openApiOptimizationPrd/index.tsx`

**Interfaces:**
- Consumes: `AccountMenuKey` from Task 1 and `activeKey` from `App.tsx`.
- Produces: account settings, connector/storage/SMS/robot pages, API Keys, and MCP/callback empty states.

- [ ] **Step 1: Expand the page key type and deterministic fallback**

Replace the local two-value `CenterKey` with `AccountMenuKey`; use `isAccountMenuKey(activeKey)` and fall back to `API Keys` only for invalid keys.

- [ ] **Step 2: Split existing account resources into independent pages**

Route keys as follows:

```ts
if (currentKey === '账号设置') return renderAccountSettings();
if (currentKey === '连接器管理') return renderDataSourceManagement();
if (currentKey === '存储管理') return renderStorageManagement();
if (currentKey === '短信队列管理') return renderSmsQueueManagement();
if (currentKey === '机器人设备管理') return renderRobotDeviceManagement();
if (currentKey === 'API Keys') return renderOpenApiKeyPage();
return renderPlatformPlaceholder(currentKey);
```

Remove the resource tabs and their local tab state because those resources now have dedicated navigation entries.

- [ ] **Step 3: Complete account-setting actions and fields**

Keep the existing profile mock data, add visible fields for “云资源”和“连接器”, and add buttons labeled “编辑头像”“编辑用户名”“修改密码”. The buttons may show Arco informational messages because this prototype does not persist account changes.

- [ ] **Step 4: Add explicit open-platform empty states**

Use Arco `Empty` with page headings “MCP 服务” and “回调服务” and descriptions “暂无已配置的 MCP 服务” / “暂无已配置的回调服务”. Do not add create/edit flows.

- [ ] **Step 5: Update PRD entry wording**

Replace the four `个人中心 / 开发平台 / API Keys` occurrences with `开放平台 / API Keys`, and change the feature list's API Keys location to “开放平台”. Preserve API Key behavior and all unrelated PRD copy.

- [ ] **Step 6: Run tests and build**

Run: `npm run test:etl && npm run build`

Expected: all tests PASS and Vite build exits with code 0.

### Task 4: In-app browser acceptance

**Files:**
- Verify only: `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype`

**Interfaces:**
- Consumes: running 412 Vite server and Tasks 1-3.
- Produces: visual and interaction evidence for the approved acceptance criteria.

- [ ] **Step 1: Reload the existing 5178 tab and inspect console errors**

Expected: the 412 overview prototype loads and there are no new application errors.

- [ ] **Step 2: Verify the user dropdown**

Click the right-side user trigger. Confirm three menu items and compare the popup and trigger bounding boxes: equal width with aligned left and right edges.

- [ ] **Step 3: Verify personal center navigation**

Click “个人中心”; confirm five sidebar entries, default “账号设置”, required fields/actions, and each dedicated resource page.

- [ ] **Step 4: Verify open platform navigation**

Open the user dropdown, click “开放平台”; confirm three sidebar entries, default “API Keys”, and the MCP/callback empty states.

- [ ] **Step 5: Recheck final diff scope**

Run: `git diff --check` and `git status --short` from the repository root. Confirm only the Task 1-3 source/test/package/PRD files and plan document are part of this change; leave unrelated existing files untouched.
