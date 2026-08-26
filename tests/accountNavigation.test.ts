import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  accountDefaultMenuKey,
  accountNavigation,
  isAccountMenuKey,
} from '../src/accountNavigation.ts';

test('defines the approved account navigation hierarchy', () => {
  assert.deepEqual(accountNavigation['个人中心'], [
    '账号设置',
    '连接器管理',
    '短信队列管理',
    '机器人设备管理',
  ]);
  assert.deepEqual(accountNavigation['开放平台'], ['API Keys', 'MCP 服务', '回调服务']);
  assert.equal(accountDefaultMenuKey['个人中心'], '账号设置');
  assert.equal(accountDefaultMenuKey['开放平台'], 'API Keys');
  assert.equal(isAccountMenuKey('MCP 服务'), true);
});

test('uses the approved 16px flat icons and account settings interactions', () => {
  const styles = readFileSync(
    new URL('../src/pages/openApiOptimization/index.module.less', import.meta.url),
    'utf8',
  );
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const pageSource = readFileSync(
    new URL('../src/pages/openApiOptimization/index.tsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(styles, /gap:\s*(16|24)px/);
  assert.doesNotMatch(styles, /padding-(top|bottom):\s*8px/);
  assert.doesNotMatch(styles, /accountResourceTabs/);
  assert.doesNotMatch(pageSource, /<Space size=\{8\}/);
  assert.match(pageSource, /accountWorkspace/);
  assert.match(pageSource, /storagePanel/);
  assert.doesNotMatch(pageSource, /currentKey === '存储管理'/);
  for (const icon of [
    'user-profile-focus',
    'link-chain',
    'mail-send-email-message',
    'cyborg',
  ]) {
    assert.match(appSource, new RegExp(icon));
  }
  assert.match(appSource, /height=\{16\}/);
  assert.match(appSource, /width=\{16\}/);
  assert.doesNotMatch(appSource, /账号设置:\s*<IconUser/);
  assert.doesNotMatch(appSource, /连接器管理:\s*<IconLink/);
  assert.doesNotMatch(appSource, /短信队列管理:\s*<IconMessage/);
  assert.doesNotMatch(appSource, /机器人设备管理:\s*<IconRobot/);

  assert.match(pageSource, /database\.svg/);
  assert.match(pageSource, /dingtalk-logo\.svg/);
  assert.match(pageSource, /feishu-logo\.svg/);
  assert.match(pageSource, /item\.key === 'database'.*推荐/s);
  assert.doesNotMatch(pageSource, />账号信息</);
  assert.doesNotMatch(pageSource, />编辑资料</);
  assert.match(pageSource, /profileEditing/);
  assert.match(pageSource, /aria-label="姓名"/);
  assert.match(pageSource, /aria-label="账号"/);
  assert.match(pageSource, /profileIdentityActions/);
  assert.match(pageSource, />修改密码</);
});
