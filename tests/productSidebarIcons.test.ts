import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../src/styles/global.less', import.meta.url), 'utf8');

test('product sidebar uses the approved 16px Streamline Core Flat SVG mapping', () => {
  const expectedMenuIcons = [
    ['取数宝概览', 'graph-dot'],
    ['店铺管理', 'store-1'],
    ['计划中心', 'blank-calendar'],
    ['数据中心', 'database'],
    ['参数管理', 'vertical-slider-square'],
  ] as const;

  assert.match(appSource, /data-streamline-icon=/);
  assert.match(
    appSource,
    /data-streamline-icon=\{name\}[\s\S]{0,240}height=\{16\}[\s\S]{0,240}width=\{16\}/,
    'Streamline menu SVGs should render at exactly 16x16',
  );
  assert.match(appSource, /className="portal-menu-streamline-icon"/);
  assert.match(globalStyles, /\.portal-menu-streamline-icon\s*\{[\s\S]*?display:\s*inline-block;[\s\S]*?width:\s*16px;[\s\S]*?height:\s*16px;[\s\S]*?margin-right:\s*@spacing-7;/);
  assert.match(globalStyles, /\.portal-side-menu \.arco-menu-inline-header \.portal-menu-streamline-icon\s*\{[\s\S]*?top:\s*-2px;/);
  assert.match(globalStyles, /\.portal-side-menu\.arco-menu-collapse \.portal-menu-streamline-icon\s*\{[\s\S]*?margin-right:\s*0;/);

  for (const [menuKey, iconName] of expectedMenuIcons) {
    assert.match(
      appSource,
      new RegExp(`key="${menuKey}"[\\s\\S]{0,180}<StreamlineMenuIcon name="${iconName}"`),
      `${menuKey} should use the ${iconName} Streamline icon`,
    );
  }

  assert.match(
    appSource,
    /key="取数宝概览"[\s\S]{0,220}<span className="portal-menu-label">概览中心<\/span>/,
    'the overview sidebar label should be 概览中心',
  );
});
