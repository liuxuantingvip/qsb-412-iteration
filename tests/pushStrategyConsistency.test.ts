import assert from 'node:assert/strict';
import test from 'node:test';
import * as pushServices from '../src/pages/pushStrategyCenter/services.ts';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildChannelMessages } from '../src/pages/pushStrategyCenter/messagePayload.ts';

// Render the actual channel components without a browser. LESS is omitted only
// for this content test; visual acceptance still requires the in-app browser.
const previewPath = new URL('../src/pages/pushStrategyCenter/index.tsx', import.meta.url);
const previewBundle = buildSync({
  stdin: {
    contents: `${readFileSync(previewPath, 'utf8')}\nexport { FeishuMessageBody, WeComContent, DingTalkMarkdown, FeishuMessagePreview, WeComMessagePreview, DingTalkMessagePreview, MonitorViewPreview, getPreviewMessageModel };`,
    resolveDir: fileURLToPath(new URL('../src/pages/pushStrategyCenter/', import.meta.url)),
    loader: 'tsx',
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  loader: { '.less': 'empty' },
  jsx: 'automatic',
}).outputFiles[0].text;
const previewModule = { exports: {} as Record<string, React.ComponentType<any>> };
new Function('require', 'module', 'exports', previewBundle)(createRequire(import.meta.url), previewModule, previewModule.exports);

const channels = ['FeishuMessagePreview', 'WeComMessagePreview', 'DingTalkMessagePreview'];
const objects = ['PLAN', 'STORE', 'DATA_TABLE'];
const kinds = ['PROGRESS', 'EXCEPTION_SUMMARY', 'EXCEPTION_ALERT', 'SUCCESS_ALERT'];
const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const renderCard = (component: string, kind: string, objectType: string) => renderToStaticMarkup(createElement(previewModule.exports[component], { kind, objectType }));

const getMessageModel = (kind: string, objectType: string): any => (previewModule.exports.getPreviewMessageModel as Function)(kind, objectType);

test('zero-exception summaries retain zero counts and a portal entry across all channels', () => {
  for (const objectType of objects) {
    const model = getMessageModel('EXCEPTION_SUMMARY', objectType);
    const zeroModel = { ...model, issues: [], groups: model.groups.map((group: any) => ({ ...group, metrics: group.metrics.map((metric: any) => ({ ...metric, value: 0 })) })) };
    for (const channel of ['FEISHU', 'WECOM', 'DINGTALK'] as const) {
      const messages = buildChannelMessages(channel, zeroModel, { portalUrl: 'https://example.com/portal' });
      assert.equal(messages.length, 1, `${channel} ${objectType}`);
      const body = JSON.stringify(messages);
      assert.match(body, /0/);
      assert.match(body, /前往门户/);
      assert.doesNotMatch(body, /异常列表/);
    }
  }
});

test('embedded preview preserves native content without introducing annotation locate targets', () => {
  for (const component of channels) {
    for (const objectType of objects) {
      for (const kind of kinds) {
        const embedded = renderToStaticMarkup(createElement(previewModule.exports[component], { kind, objectType, annotated: false }));
        assert.doesNotMatch(embedded, /data-note-id/);
        assert.equal(plain(embedded), plain(renderCard(component, kind, objectType)));
      }
    }
  }
  for (const channel of ['FEISHU', 'WECOM', 'DINGTALK']) {
    for (const kind of ['PROGRESS', 'EXCEPTION_SUMMARY']) {
      const embedded = renderToStaticMarkup(createElement(previewModule.exports.MonitorViewPreview, { channel, kind, annotated: false }));
      const original = renderToStaticMarkup(createElement(previewModule.exports.MonitorViewPreview, { channel, kind }));
      assert.doesNotMatch(embedded, /data-note-id/);
      assert.equal(plain(embedded), plain(original));
    }
  }
});

test('all summary issue examples include a failure stage and fetch errors include an existing code', () => {
  for (const objectType of objects) {
    for (const kind of ['PROGRESS', 'EXCEPTION_SUMMARY']) {
      const model = getMessageModel(kind, objectType);
      for (const [, detail] of model.issues) {
        assert.match(detail, /取数执行失败|入库失败|入库校验失败/);
        if (detail.includes('取数执行失败')) assert.match(detail, /错误码 1201.*当前账号该模板权限未开通/);
      }
    }
  }
});

test('existing monitor strategy stores monitor view IDs, not data table IDs', async () => {
  const strategy = await pushServices.getStrategyDetail('strategy-2');
  assert.equal(strategy?.relatedObjectType, 'MONITOR_VIEW');
  assert.deepEqual(strategy?.relatedObjectIds, ['view-1', 'view-2']);
  const options = await pushServices.listRelatedObjects();
  assert.ok(strategy?.relatedObjectIds.every((id) => options.some((option) => option.id === id && option.type === 'MONITOR_VIEW')));
});

test('annotation message fragments reuse native content without duplicate locate anchors', () => {
  for (const channel of ['FEISHU', 'WECOM', 'DINGTALK']) {
    for (const section of ['statistics', 'issues', 'header', 'portal']) {
      for (const kind of ['PROGRESS', 'EXCEPTION_SUMMARY']) {
        const html = renderToStaticMarkup(createElement(previewModule.exports.PushMessageAnnotationExample, { section, channel, kind }));
        assert.doesNotMatch(html, /data-note-id/);
        assert.ok(html.includes(section === 'issues' ? '异常列表' : section === 'statistics' ? '日常' : '截止时间'));
      }
    }
  }
});
const assets = {
  portalUrl: 'https://example.com/portal/monitor',
  monitorImages: {
    'view-1': { feishuImageKey: 'img_v3_view1', imageUrl: 'https://example.com/monitor.png' },
    'view-2': { feishuImageKey: 'img_v3_view2', imageUrl: 'https://example.com/settlement.png' },
  },
};

for (const channel of ['FEISHU', 'WECOM', 'DINGTALK'] as const) {
  for (const objectType of [...objects, 'MONITOR_VIEW']) {
    for (const kind of objectType === 'MONITOR_VIEW' ? kinds.slice(0, 2) : kinds) {
      test(`protocol ${channel} ${objectType} ${kind}: shared fields and native envelope`, () => {
        const model = getMessageModel(kind, objectType);
        const messages = buildChannelMessages(channel, model, assets);
        const json = JSON.stringify(messages);
        for (const field of [model.title, model.time, model.strategy, ...model.facts.flat(), ...model.issues.flat()]) {
          assert.ok(json.includes(field), `missing ${field}`);
        }
        if (model.failure) assert.ok(json.includes(model.failure));
        for (const group of model.groups) {
          assert.ok(json.includes(group.title));
          for (const metric of group.metrics) assert.ok(json.includes(metric.label) && json.includes(String(metric.value)));
        }
        assert.equal((json.match(/前往门户/g) || []).length, 1);
        assert.doesNotMatch(json, /news_notice|localhost|127\.0\.0\.1|另有|公司名称|有限公司/);
        assert.equal(messages.length, 1);
        if (channel === 'FEISHU') {
          assert.match(json, /"msg_type":"interactive"/);
          assert.match(json, /"schema":"2.0"/);
          assert.ok(Buffer.byteLength(json) <= 20 * 1024);
          if (objectType === 'MONITOR_VIEW') assert.match(json, /"scale_type":"fit_horizontal".*"preview":true/);
          if (kind === 'EXCEPTION_SUMMARY' && objectType !== 'MONITOR_VIEW') assert.match(json, /"width":"128px"/);
        } else if (channel === 'WECOM') {
          assert.match(json, objectType === 'MONITOR_VIEW' ? /"msgtype":"markdown_v2"/ : /"card_type":"text_notice"/);
        } else {
          assert.match(json, /"msgtype":"actionCard"/);
          assert.match(json, /"text":"### /);
          assert.doesNotMatch(json, /<font|column_set/);
        }
      });
    }
  }
}

test('Feishu truncates whole issue entries only when the encoded request exceeds 20 KB', () => {
  const model = getMessageModel('PROGRESS', 'PLAN');
  model.issues = Array.from({ length: 80 }, (_, index) => [`计划${index}`, '错误详情'.repeat(100)]);
  const json = JSON.stringify(buildChannelMessages('FEISHU', model, assets)[0]);
  assert.ok(Buffer.byteLength(json) <= 20 * 1024);
  assert.ok(json.includes('…'));
  assert.ok(json.includes('应执行') && json.includes('前往门户') && json.includes(model.strategy));
  assert.doesNotMatch(json, /另有/);
  model.title = '过长标题'.repeat(10000);
  assert.throws(() => buildChannelMessages('FEISHU', model, assets), /20 KB/);
});

test('monitor payloads require per-view channel image resources', () => {
  const model = getMessageModel('PROGRESS', 'MONITOR_VIEW');
  for (const channel of ['FEISHU', 'WECOM', 'DINGTALK'] as const) {
    assert.throws(() => buildChannelMessages(channel, model, { portalUrl: assets.portalUrl }), /图片/);
  }
});

test('multiple views share one envelope, one portal and one strategy across all channels', () => {
  const model = getMessageModel('PROGRESS', 'MONITOR_VIEW');
  for (const channel of ['FEISHU', 'WECOM', 'DINGTALK'] as const) {
    const messages = buildChannelMessages(channel, model, assets);
    assert.equal(messages.length, 1);
    const json = JSON.stringify(messages);
    for (const view of model.monitorViews) {
      assert.ok(json.includes(view.name));
      assert.ok(json.includes(view.startTime.slice(0, 10)));
    }
    assert.equal((json.match(/策略名称/g) ?? []).length, 1);
    assert.equal((json.match(/前往门户/g) ?? []).length, 1);
    assert.ok(json.includes(channel === 'FEISHU' ? 'img_v3_view2' : 'settlement.png'));
    assert.deepEqual(buildChannelMessages(channel, { ...model, monitorViews: [] }, assets), []);
    const failed = { ...model, monitorViews: [{ ...model.monitorViews[0], failure: '上传失败' }, model.monitorViews[1]] };
    const failedJson = JSON.stringify(buildChannelMessages(channel, failed, { ...assets, monitorImages: { 'view-2': assets.monitorImages['view-2'] } }));
    assert.match(failedJson, /上传失败/);
    assert.ok(failedJson.includes(channel === 'FEISHU' ? 'img_v3_view2' : 'settlement.png'));
  }
});

test('monitor limits omit complete trailing views without splitting or losing the portal', () => {
  const model = getMessageModel('PROGRESS', 'MONITOR_VIEW');
  model.monitorViews = Array.from({ length: 100 }, (_, i) => ({ ...model.monitorViews[0], id: String(i), name: `监控${i}` }));
  const manyAssets = { ...assets, monitorImages: Object.fromEntries(model.monitorViews.map((view: any) => [view.id, assets.monitorImages['view-1']])) };
  const wecom = buildChannelMessages('WECOM', model, manyAssets);
  assert.equal(wecom.length, 1);
  const text = (wecom[0].markdown_v2 as any).content;
  assert.ok(Buffer.byteLength(text) <= 4096);
  assert.match(text, /…/);
  assert.match(text, /前往门户/);
  assert.doesNotMatch(text, /监控99/);
  assert.equal((text.match(/业务日期/g) ?? []).length, (text.match(/!\[/g) ?? []).length);
  const feishu = buildChannelMessages('FEISHU', model, manyAssets);
  assert.equal(feishu.length, 1);
  assert.ok(Buffer.byteLength(JSON.stringify(feishu[0])) <= 20 * 1024);
  assert.ok((JSON.stringify(feishu[0]).match(/"tag":/g) ?? []).length <= 200);
  assert.match(JSON.stringify(feishu), /…/);
});

function verifyCommon(html: string, kind: string) {
  assert.doesNotMatch(html, /公司名称|租户[：:]|有限公司|需关注|另有|更多异常|查看完整详情|生成仅异常|统计时间|推送类型|交付成功|[🟢🔴🟠🔵]/u);
  assert.equal((html.match(/data-section="header"/g) || []).length, 1);
  assert.equal((html.match(/策略名称/g) || []).length, 1);
  assert.equal((html.match(/前往门户/g) || []).length, 1);
  assert.equal((html.match(/2026-09-0[23] 15:\d{2}:\d{2}/g) || []).length, 1);
  const label = kind === 'SUCCESS_ALERT' ? '完成时间' : kind === 'EXCEPTION_ALERT' ? '发生时间' : '截止时间';
  assert.ok(html.includes(label));
  assert.ok(html.indexOf('data-section="header"') < html.indexOf('策略名称'));
  assert.ok(html.indexOf('策略名称') < html.indexOf('前往门户'));
  assert.match(html, /<button[^>]*data-section="action"/);
}

for (const component of channels) {
  for (const objectType of objects) {
    for (const kind of kinds) {
      test([component, objectType, kind, 'shared structure and required fields'].join(' '), () => {
        const html = renderCard(component, kind, objectType);
        verifyCommon(html, kind);
        const summary = kind === 'PROGRESS' || kind === 'EXCEPTION_SUMMARY';
        assert.equal(html.includes('异常列表'), summary);
        assert.equal(html.includes('data-section="statistics"'), summary);
        assert.equal(html.includes('失败原因'), kind === 'EXCEPTION_ALERT');
        if (summary) {
          assert.ok(html.indexOf('data-section="statistics"') < html.indexOf('异常列表'));
          assert.ok(html.indexOf('异常列表') < html.indexOf('策略名称'));
          if (objectType === 'PLAN') {
            for (const field of ['日常', '实时', '回溯', '错误码 1201', '目标表写入失败', '入库校验失败']) assert.ok(html.includes(field));
          }
          if (objectType === 'STORE') for (const name of ['海雅天猫旗舰店', '海雅京东自营店', '海雅天猫专营店', '海雅拼多多旗舰店', '海雅唯品会旗舰店']) assert.ok(html.includes(name));
          if (objectType === 'DATA_TABLE') for (const field of ['阿里妈妈账户报表', '生意参谋商品日报', '海雅天猫旗舰店', '字段 amount', '近 1 天数据缺失']) assert.ok(html.includes(field));
        }
        if (kind === 'EXCEPTION_ALERT' && objectType === 'PLAN') {
          assert.ok(html.includes('实时计划') && html.includes('1201') && html.includes('当前账号该模板权限未开通'));
          assert.ok(!html.includes('近 1 天数据缺失'));
        }
        if (kind === 'SUCCESS_ALERT') {
          assert.ok(html.includes('成功提醒') && !html.includes('失败阶段'));
          if (objectType === 'PLAN') assert.ok(html.includes('今日应执行 48 次，成功 48 次'));
        }
      });
    }
  }
}

for (const channel of ['FEISHU', 'WECOM', 'DINGTALK']) {
  for (const kind of ['PROGRESS', 'EXCEPTION_SUMMARY']) {
    test(channel + ' monitor ' + kind + ': real view without process narration', () => {
      const html = renderToStaticMarkup(createElement(previewModule.exports.MonitorViewPreview, { channel, kind }));
      verifyCommon(html, kind);
      assert.ok(html.includes('全量店铺数据交付监控'));
      assert.ok(html.includes('商品货款交付监控'));
      assert.equal((html.match(/data-monitor-view=/g) ?? []).length, 2);
      assert.ok(html.includes('业务日期：2026-09-02'));
      assert.ok(html.includes(kind === 'PROGRESS' ? 'monitor-progress.png' : 'monitor-exception.png'));
      assert.match(html, /<button[^>]*aria-label="放大查看全量店铺数据交付监控(?:完整|异常)视图"[^>]*>\s*<img/);
      assert.doesNotMatch(html, /本次生成|存在 5 条|仅异常 ·|完整看板<\/span>/);
      if (channel === 'WECOM') {
        assert.doesNotMatch(html, /news_notice/);
        assert.match(html, /data-template="markdown_v2"/);
        assert.doesNotMatch(html, /data-template="image"|data-template="text_notice"/);
      }
    });
  }
}

for (const objectType of objects) {
  for (const kind of kinds) {
    test(objectType + ' ' + kind + ': channel field parity', () => {
      const normalized = channels.map((component) => plain(renderCard(component, kind, objectType)).replace(/[·→]/g, '').replace(/：/g, ' ').replace(/\b([12345])\./g, '$1').replace(/\s+/g, ' ').trim());
      assert.equal(normalized[0], normalized[1]);
      assert.equal(normalized[0], normalized[2]);
    });
  }
}

test('plan preview counts match its three failures without mixing plan and execution totals', () => {
  for (const component of channels) {
    const progress = plain(renderCard(component, 'PROGRESS', 'PLAN')).replace(/·/g, '').replace(/\s+/g, ' ');
    assert.match(progress, /日常计划 应执行 42 成功 30 失败 1 运行中 11/);
    assert.match(progress, /实时计划 总次数 54 成功 37 失败 1 运行中 16/);
    assert.match(progress, /回溯计划 实际次数 3 成功 2 失败 1 运行中 0/);
    const exception = plain(renderCard(component, 'EXCEPTION_SUMMARY', 'PLAN'));
    for (const type of ['日常', '实时', '回溯']) assert.ok(exception.includes(type + '异常计划 1'));
    assert.equal((progress.match(/异常列表/g) || []).length, 1);
  }
});

test('native channel treatment stays separate from shared business fields', () => {
  for (const component of channels) {
    const html = renderCard(component, 'PROGRESS', 'PLAN');
    assert.equal(html.includes('data-feishu-component="column_set"'), component === 'FeishuMessagePreview');
    assert.equal(html.includes('data-wecom-field="sub_title_text"'), component === 'WeComMessagePreview');
    assert.ok(!html.includes('emphasis_content'));
  }
});

test('merges scheduled expected counts and manual actual counts without losing future executions', () => {
  const mergeCounts = Reflect.get(pushServices, 'mergeRealtimeExecutionCounts');
  assert.equal(typeof mergeCounts, 'function');
  assert.deepEqual(mergeCounts(
    { total: 48, success: 32, failed: 2, running: 14 },
    { total: 6, success: 5, failed: 1, running: 0 },
  ), { total: 54, success: 37, failed: 3, running: 14 });
  assert.deepEqual(mergeCounts(
    { total: 0, success: 0, failed: 0, running: 0 },
    { total: 3, success: 1, failed: 1, running: 1 },
  ), { total: 3, success: 1, failed: 1, running: 1 });
});

test('returns only currently authorized product categories', async () => {
  const listAuthorizedProductCategories = Reflect.get(pushServices, 'listAuthorizedProductCategories');
  assert.equal(typeof listAuthorizedProductCategories, 'function');
  assert.deepEqual(await listAuthorizedProductCategories(), ['电商取数宝', '跨境取数宝']);
});

test('prevents an invalid-product strategy from being enabled', async () => {
  await assert.rejects(
    pushServices.updateStrategyStatus('strategy-3', 'ENABLED'),
    /该产品类别已失效，无法启用推送策略/,
  );
});

test('rejects editing an invalid-product strategy even if the draft selects a valid product', async () => {
  const original = await pushServices.getStrategyDetail('strategy-3');
  assert.ok(original);
  await assert.rejects(pushServices.saveStrategy({
    ...original,
    name: '不应保存的改动',
    productCategory: '电商取数宝',
    productInvalid: false,
  }), /仅支持删除/);
  assert.deepEqual(await pushServices.getStrategyDetail('strategy-3'), original);
});

test('models scheduled and realtime strategy types explicitly', async () => {
  const { list } = await pushServices.queryStrategies({ page: 1, pageSize: 100 });
  const ordinaryStrategies = list.filter((strategy) => !strategy.systemStrategy);

  assert.ok(ordinaryStrategies.every((strategy) => strategy.pushMode === 'SCHEDULED' || strategy.pushMode === 'REALTIME'));
  assert.ok(ordinaryStrategies.some((strategy) => strategy.messageType === 'EXCEPTION_SUMMARY'));
  assert.ok(ordinaryStrategies.some((strategy) => strategy.messageType === 'EXCEPTION_ALERT'));
  assert.ok(ordinaryStrategies.some((strategy) => strategy.messageType === 'SUCCESS_ALERT'));
});

test('uses plan terminology for current strategies and selectable objects', async () => {
  const [{ list }, objects] = await Promise.all([
    pushServices.queryStrategies({ page: 1, pageSize: 100 }),
    pushServices.listRelatedObjects(),
  ]);

  const currentCopy = [
    ...list.map((strategy) => strategy.name),
    ...objects.map((object) => object.group),
  ].join('\n');
  assert.doesNotMatch(currentCopy, /任务/);
});

test('allows deleting an invalid-product strategy without deleting push history', async () => {
  const historyBefore = await pushServices.queryHistory({ page: 1, pageSize: 100 });
  await pushServices.deleteStrategy('strategy-3');
  const { list } = await pushServices.queryStrategies({ page: 1, pageSize: 100 });
  assert.equal(list.some((strategy) => strategy.id === 'strategy-3'), false);
  assert.deepEqual(await pushServices.queryHistory({ page: 1, pageSize: 100 }), historyBefore);
});
