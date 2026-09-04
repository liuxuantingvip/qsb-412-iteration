import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { pushStrategyAnnotations } from '../src/components/pushStrategyAnnotations/data.ts';
import * as content from '../src/pages/pushStrategyOptimizationPrd/content.ts';

const source = readFileSync(new URL('../src/pages/pushStrategyCenter/index.tsx', import.meta.url), 'utf8');
const services = readFileSync(new URL('../src/pages/pushStrategyCenter/services.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const prd = readFileSync(new URL('../src/pages/pushStrategyOptimizationPrd/index.tsx', import.meta.url), 'utf8');
const rules = JSON.stringify(content);

test('all 14 annotations retain unique IDs, a real UI anchor and locate route', () => {
  assert.equal(pushStrategyAnnotations.length, 14);
  assert.equal(new Set(pushStrategyAnnotations.map((note) => note.noteId)).size, 14);
  for (const note of pushStrategyAnnotations) {
    assert.ok(source.includes('data-note-id="' + note.noteId + '"') || source.includes("data-note-id={annotated ? '" + note.noteId + "' : undefined}"), note.noteId);
    assert.ok(note.openEvent && source.includes(note.openEvent), 'route: ' + note.noteId);
    assert.equal(note.topTab, '推送策略中心');
    assert.ok(note.ruleItems?.length && note.acceptance);
  }
  assert.match(app, /\? pushStrategyAnnotations/);
  assert.match(app, /<PushStrategyAnnotationDrawer/);
});

test('strategy status locates the invalid record row instead of the status header', () => {
  assert.match(source, /id === 'strategy-3'[\s\S]*?<tr[^>]*data-note-id="PS-1"/);
  assert.doesNotMatch(source, /<span data-note-id="PS-1">状态/);
  assert.equal(pushStrategyAnnotations[0].openEvent, 'push-strategy:show-invalid-strategy');
  assert.match(pushStrategyAnnotations[0].target, /数据表更新失败提醒整行/);
  assert.match(source, /annotationRequest.event === 'push-strategy:show-invalid-strategy'[\s\S]*?setPage\(1\)/);
  assert.match(app, /targets.length === 1 && targets\[0\].tagName !== 'TR'/);
});

test('each annotation has a frontend example and message fragments reuse actual renderers', () => {
  const examples = readFileSync(new URL('../src/components/pushStrategyAnnotations/VisualExample.tsx', import.meta.url), 'utf8');
  for (const note of pushStrategyAnnotations) {
    const keys = [...note.ruleItems || [], ...note.stateItems || [], ...note.recoveryItems || []].flatMap((item) => item.example ? [item.example] : []);
    assert.ok(keys.length, note.noteId);
    keys.forEach((key) => assert.ok(examples.includes("'" + key + "'"), key));
  }
  assert.match(examples, /PushMessageAnnotationExample/);
  assert.match(source, /Annotation examples reuse the preview renderers/);
  assert.doesNotMatch(examples, /data-note-id/);
});

test('PRD has six business chapters with rules grouped under their matching flows', () => {
  const titles = ['需求背景', '目标', '需求范围', '业务方案', '验收标准', '文档说明', '版本信息', '变更日志'];
  for (const title of titles) {
    assert.ok(prd.includes('title="' + title + '"'), title);
  }
  const positions = titles.map((title) => prd.indexOf('title="' + title + '"'));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.doesNotMatch(prd, /用户场景与交互说明|用户操作流程|非功能需求|title="埋点"/);
  assert.equal(content.pushFlows.length, 4);
  assert.doesNotMatch(prd, /用户故事|本期不做|storyRows|outOfScopeRows/);
  assert.doesNotMatch(prd, /configurationRows/);
  assert.match(prd, /统计范围与单位/);
  assert.equal(new Set(content.pushFlows.map((flow) => flow.id)).size, 4);
  assert.deepEqual(content.pushFlows.map((flow) => flow.id), ['configure', 'scheduled', 'realtime', 'monitor']);
  assert.deepEqual(content.pushFlows.map((flow) => flow.title), ['1. 策略生效与停用', '2. 定时汇总', '3. 实时提醒', '4. 数据监控视图推送']);
  assert.match(prd, /pushFlows.map/);
  assert.match(prd, /flow.id === 'scheduled'[\s\S]*rows=\{scopeRuleRows\}[\s\S]*rows=\{deliveryRows\}/);
  assert.match(prd, /flow.id === 'monitor'[\s\S]*rows=\{monitorRows\}/);
  assert.match(prd, /5\. 消息展示与查看/);
  assert.doesNotMatch(prd, /<Section title="(?:业务流程|统计口径|消息输出)"/);
  for (const name of ['scopeRuleRows', 'deliveryRows', 'monitorRows', 'messageRows', 'channelRows']) {
    assert.equal(prd.split('rows={' + name + '}').length - 1, 1, name);
  }
  assert.match(prd, /产品和自定义对象失效后的停用与恢复/);
  for (const flow of content.pushFlows) {
    if (flow.flows) flow.flows.forEach(reminder => assert.match(reminder.chart, /flowchart LR/));
    else assert.match(flow.chart, /flowchart TB/);
  }
});

test('message output omits preview interactions and visual styling rules', () => {
  assert.doesNotMatch(JSON.stringify(content.messageRows), /预览切换|回到顶部|正常标题大小/);
  assert.doesNotMatch(JSON.stringify(content.messageRows), /进度汇总推送分类统计|计划分日常、实时、回溯/);
  assert.match(JSON.stringify(content.triggerRows), /分类进度统计和异常列表/);
  assert.match(JSON.stringify(content.triggerRows), /分类异常数量和异常列表/);
  assert.doesNotMatch(JSON.stringify(content.channelRows), /浅色标题区|标签上数字下/);
});

test('PRD embeds the shared preview and maps all supported content/message combinations', () => {
  assert.match(prd, /import \{ PushMessagePreview \} from '..\/pushStrategyCenter'/);
  assert.match(prd, /<PushMessagePreview annotated=\{false\} \/>/);
  assert.match(source, /<PushMessagePreview visible=\{visible\} annotationRequest=\{annotationRequest\} \/>/);
  assert.match(prd, /rows=\{messageTypeRows\}/);
  assert.deepEqual(content.messageTypeRows.slice(1).map(row => row[0]), ['计划', '店铺', '数据表', '数据监控视图', '账号登录异常']);
  assert.deepEqual(content.messageTypeRows[0], ['内容类型', '进度汇总（定时）', '异常汇总（定时）', '异常提醒（实时）', '成功提醒（实时）']);
  assert.deepEqual(content.messageTypeRows[4].slice(3), ['不支持', '不支持']);
  assert.equal(content.messageTypeRows.slice(1).flatMap(row => row.slice(1)).filter(value => value !== '不支持').length * 3, 45);
});

test('business flows retain eligibility, no-send, deduplication and image fallback without UI steps', () => {
  const charts = Object.fromEntries(content.pushFlows.map((flow) => [flow.id, flow.chart]));
  for (const text of ['产品授权有效？', '自动停用策略', '策略已启用？', '存在有效对象和渠道？', '不推送']) assert.ok(charts.configure.includes(text));
  assert.doesNotMatch(charts.configure, /取消|关闭抽屉|刷新列表|保存成功|保留输入/);
  for (const text of ['内容类型？', '最终交付结果', '异常分类数量', '按渠道发送消息']) assert.ok(charts.scheduled.includes(text));
  assert.match(JSON.stringify(content.channelRows), /仍超限则不发送并记录失败原因/);
  for (const text of ['最终交付成功后再失败', '手动实时执行', '本策略、本渠道、同一对象和业务日期', '已尝试成功提醒']) assert.ok(JSON.stringify(content.realtimeFlows).includes(text));
  for (const text of ['结束本次推送', '加入该视图失败提示', '合并为一条消息', '发送合并消息']) assert.ok(charts.monitor.includes(text));
});

test('authorization expiry is independent of a push attempt', () => {
  const chart = content.pushFlows[0].chart;
  assert.match(chart, /subgraph expiration\["授权失效时"\][\s\S]*产品授权失效[\s\S]*自动停用策略[\s\S]*end\s+subgraph eligibility\["每次推送前"\]/);
  assert.match(chart, /F -->\|否\| G\(\["本次不推送"\]\)/);
  assert.doesNotMatch(chart, /F -->\|否\| B/);
});

test('scheduled summary covers four content types and sends zero-exception summaries', () => {
  const chart = content.pushFlows[1].chart;
  for (const type of ['计划', '店铺', '数据表', '数据监控视图']) assert.ok(chart.includes(`E -->|${type}|`), type);
  assert.doesNotMatch(chart, /监控视图？/);
  assert.match(chart, /日常取最新有效运行记录.*各对象仅取自身交付明细/);
  assert.match(chart, /S -->\|是\| T\["最终交付结果：失败"\]/);
  assert.match(chart, /无校验：入库成功<br\/>有校验：校验通过/);
  assert.match(chart, /U -->\|是\| V\["最终交付结果：成功"\]/);
  assert.match(chart, /U -->\|否\| W\["最终交付结果：运行中"\]/);
  assert.match(chart, /N -->\|否\| P\["异常数量显示 0，隐藏异常列表"\]/);
  assert.match(chart, /P --> L/);
  assert.doesNotMatch(chart, /待确认/);
  assert.match(JSON.stringify(content.triggerRows), /零异常时仍发送/);
  assert.match(JSON.stringify(pushStrategyAnnotations.find(note => note.noteId === 'PS-2.2')), /零异常时仍发送/);
});

test('realtime reminders have independent purpose, main paths and local exits', () => {
  assert.equal(content.pushFlows[2].chart, undefined);
  assert.equal(content.pushFlows[2].flows, content.realtimeFlows);
  assert.deepEqual(content.realtimeFlows.map(flow => flow.id), ['realtime-exception', 'realtime-success']);
  const [exception, success] = content.realtimeFlows;
  assert.match(exception.description, /新异常.*及时通知/);
  assert.match(exception.chart, /B -->\|否\| C\(\["持续异常或基线异常，不发送"\]\)/);
  assert.match(exception.chart, /D -->\|否\| E\(\["不匹配，不发送"\]\)/);
  assert.match(exception.chart, /D -->\|是\| F\["按策略和渠道记录本轮提醒尝试"\]/);
  assert.match(exception.notes.join(''), /策略、渠道、对象.*持续异常不重复.*最终交付成功后再失败/);
  assert.doesNotMatch(exception.chart, /成功提醒|已提醒|消息类型/);
  assert.match(success.description, /当天应交付.*全部完成/);
  assert.match(success.chart, /D -->\|否\| E\(\["尚未完成，不发送"\]\)/);
  assert.match(success.chart, /F -->\|是\| G\(\["已提醒，不重复发送"\]\)/);
  assert.match(success.chart, /F -->\|否\| H\["记录提醒尝试"\]/);
  assert.doesNotMatch(success.chart, /手动|异常提醒|消息类型/);
  assert.match(success.notes.join(''), /不等于异常恢复通知.*手动实时执行.*不发送全天完成提醒/);
  assert.deepEqual(content.realtimeCompletionRows.slice(1).map(row => row[0]), ['日常计划', '实时计划', '回溯计划', '店铺', '数据表']);
  assert.match(prd, /flow.flows.map/);
  assert.match(prd, /rows=\{realtimeCompletionRows\}/);
  assert.match(prd, /reminder.notes.map/);
  assert.doesNotMatch(prd, /startsWith\('实时'\)/);
});

test('monitor collects all views before one send, records acceptance without resending', () => {
  const chart = content.pushFlows[3].chart;
  assert.match(chart, /Q\{"还有未处理视图？"\}/);
  assert.match(chart, /Q -->\|否\| V\{"有异常视图或图片失败？"\}/);
  assert.match(chart, /V -->\|否\| V1\["异常视图 0/);
  assert.match(chart, /F -->\|否\| G\["记录当前视图无异常"\]\s+G --> Q/);
  assert.match(chart, /N --> Y\{"仍超过发送限制？"\}/);
  assert.match(chart, /Y -->\|是\| X/);
  assert.match(chart, /Y -->\|否\| O\["发送合并消息"\]/);
  assert.match(chart, /P\{"渠道接收成功？"\}/);
  assert.match(chart, /P -->\|是\| S\["记录发送成功"\]/);
  assert.match(chart, /P -->\|否\| X\["记录失败原因，不补发"\]/);
  assert.match(chart, /S --> Z/);
  assert.match(chart, /X --> Z/);
  assert.match(chart, /J --> Q/);
  assert.match(chart, /L --> Q/);
  assert.doesNotMatch(chart, /待确认|重试|均发送成功/);
  assert.match(JSON.stringify(content.messageRows), /渠道接收成功即记为发送成功.*发送失败记录原因，不补发/);
  assert.match(JSON.stringify(content.monitorRows), /在每个渠道只发送一条消息/);
  assert.doesNotMatch(JSON.stringify([content.monitorRows, content.channelRows]), /先发送|分开发送，顺序|分别记录结果/);
  assert.match(JSON.stringify(pushStrategyAnnotations.find(note => note.noteId === 'PS-3')), /渠道接收成功.*不补发/);
});

test('scope lists concrete changes and each business topic explains its change before the flow', () => {
  assert.match(prd, /\['改动项', '本次要做什么'\]/);
  assert.doesNotMatch(prd, /适用全产品线|以下调整优先级|\['功能模块', '调整类型'/);
  for (const flow of content.pushFlows) {
    assert.ok(flow.description.length > 40 && flow.description.length < 180, flow.id);
    assert.match(flow.description, /本次/);
  }
  const renderer = readFileSync(new URL('../src/pages/pushStrategyOptimizationPrd/FlowDiagram.tsx', import.meta.url), 'utf8');
  assert.ok(renderer.indexOf('{description}</p>') < renderer.indexOf('className={styles.flowViewport}'));
  assert.match(prd, /5\. 消息展示与查看<\/h4>\s*<p[^>]*>本次统一/);
  assert.match(content.pushFlows[0].description, /沿用现有配置入口/);
  assert.match(content.pushFlows[0].description, /产品授权失效自动停用/);
  assert.match(content.pushFlows[1].description, /取数成功不直接计为交付成功/);
  assert.match(content.pushFlows[3].description, /同一策略关联的多个视图合并为一条消息/);
});

test('confirmed counting and content rules are retained without mixing units', () => {
  for (const text of ['全天定时应执行次数', '手动实际次数', '按计划数', '去重异常计划数', '失败优先', '最终成功', '异常列表', '前往门户', '按渠道保存当次策略名', '不预估未来执行']) {
    assert.ok(rules.includes(text), text);
  }
  assert.ok(rules.includes('不能用') || rules.includes('不是同一指标'));
});

test('channel requirements describe message results instead of implementation', () => {
  const channels = JSON.stringify(content.channelRows);
  for (const text of ['发送限制', '4096 字节', '完整视图区块', '普通文本', '门户入口', '不拆条']) assert.ok(channels.includes(text), text);
  assert.equal(content.channelRows.length, 4);
});

test('rendered PRD uses concise product language and preserves direct view association', () => {
  const visibleContent = JSON.stringify({ ...content, configurationRows: undefined });
  assert.doesNotMatch(visibleContent, /请求体|报文|HTML|CSS|ActionCard|Markdown|原子操作|发送链路|编码前|补齐用例|固定样例推断|原型选项当作/);
  assert.match(JSON.stringify(content.monitorRows), /推送策略关联的数据监控视图/);
  assert.doesNotMatch(visibleContent, /关联数据表.*(?:定位|匹配).*监控视图|数据表与监控视图匹配/);
  assert.equal(content.acceptanceRows[0].length, 2);
});

test('monitor configuration selects views and annotation explains that association', () => {
  assert.match(source, /candidates\(draft, objects\)/);
  assert.doesNotMatch(source, /relatedSelectionType|监控视图 · 关联数据表/);
  assert.match(source, /label=\{draft.relatedObjectType === 'MONITOR_VIEW' \? '关联数据监控视图'/);
  assert.match(source, /placeholder=\{draft.relatedObjectType === 'MONITOR_VIEW' \? '请选择关联数据监控视图'/);
  const scope = pushStrategyAnnotations.find((note) => note.noteId === 'PS-1.3');
  assert.match(JSON.stringify(scope), /数据监控视图列表选择，保存视图标识、显示视图名称/);
  const monitor = pushStrategyAnnotations.find((note) => note.noteId === 'PS-2.4');
  assert.match(JSON.stringify(monitor), /图片取自策略关联的数据监控视图/);
  assert.match(content.pushFlows.find((flow) => flow.id === 'monitor')!.chart, /获取策略关联的数据监控视图/);
  const styles = readFileSync(new URL('../src/pages/pushStrategyCenter/index.module.less', import.meta.url), 'utf8');
  assert.match(styles, /:global\(\.arco-tree-select-view\)/);
  assert.match(styles, /--control-border-radius: 8px/);
});

test('confirmed decisions replace old pending rules and preserve lifecycle distinctions', () => {
  assert.doesNotMatch(prd, /待确认事项/);
  assert.match(rules, /同日取最新有效运行记录/);
  assert.match(JSON.stringify(content.lifecycleRows), /手动停用保持停用.*自定义对象.*同名新对象.*全部关联渠道|关联渠道全部删除/);
  assert.match(rules, /失败不补发/);
});

test('final review decisions stay aligned across PRD, prototype and annotations', () => {
  const annotationRules = JSON.stringify(pushStrategyAnnotations);
  for (const text of ['最后一天', '北京时间']) assert.ok(source.includes(text), text);
  for (const text of ['策略名称已存在', '系统保留名称']) assert.ok(services.includes(text), text);
  for (const text of ['修复关联对象后由用户手动启用', '基线，不补发', '本次回溯执行完成', '异常视图 0', '账号登录异常提醒', '保留 180 天']) assert.ok(rules.includes(text), text);
  for (const text of ['最后一天', '北京时间', '手动启用', '不回放', '异常视图 0', '180 天']) assert.ok(annotationRules.includes(text), text);
  assert.match(source, /停用后将不再产生新的推送，是否停用/);
  assert.match(source, /删除后该策略将停止推送且无法恢复，历史记录仍保留/);
});

test('all rule tables have consistent cell counts', () => {
  for (const [name, rows] of Object.entries(content)) {
    if (!name.endsWith('Rows')) continue;
    const table = rows as string[][];
    for (const row of table) assert.equal(row.length, table[0].length, name);
  }
});

test('PRD spacing separates sections and groups without changing typography', () => {
  const styles = readFileSync(new URL('../src/pages/pushStrategyOptimizationPrd/index.module.less', import.meta.url), 'utf8');
  assert.match(styles, /\.panel\s*\{\s*gap: 32px/);
  assert.match(styles, /\.section\s*\{\s*gap: 12px/);
  assert.match(styles, /\.subsection\s*\{[^}]*gap: 12px/);
  assert.match(styles, /\.subsection \+ \.subsection\s*\{\s*margin-top: 12px/);
  assert.match(styles, /\.flow \+ \.paragraph,\s*\.flow \+ \.table\s*\{\s*margin-top: 4px/);
  assert.match(styles, /padding: 12px 16px/);
  assert.match(styles, /:global\(\.arco-table-th-item\)\s*\{\s*padding: 0/);
  assert.match(styles, /white-space: nowrap/);
  assert.match(styles, /min-width: 128px/);
  assert.doesNotMatch(styles.match(/\.prominentSection\s*\{[^}]*\}/)?.[0] || '', /border-top|20px/);
  assert.match(styles, /font-size: 14px/);
  assert.match(styles, /font-size: 16px/);
});

test('flow dimensions support multiline Mermaid labels without magnifying a fallback width', () => {
  const renderer = readFileSync(new URL('../src/pages/pushStrategyOptimizationPrd/FlowDiagram.tsx', import.meta.url), 'utf8');
  assert.match(renderer, /parseFromString\(svg, 'text\/html'\)\.querySelector\('svg'\)/);
  assert.doesNotMatch(renderer, /parseFromString\(svg, 'image\/svg\+xml'\)/);
  assert.match(renderer, /fontSize: '14px'/);
});

test('background stays concise, three goals are separate from acceptance details', () => {
  assert.equal(content.backgroundParagraphs.length, 2);
  assert.ok(content.backgroundParagraphs.join('').length < 300);
  assert.deepEqual(content.goalItems.map((item) => item.title), ['进度可信', '异常可定位', '表达一致、阅读简洁']);
  assert.match(content.goalItems[0].description, /100%/);
  assert.match(content.goalItems[1].description, /100%/);
  assert.equal(content.acceptanceRows.length, 4);
  assert.match(JSON.stringify(content.acceptanceRows), /24 种定时＋18 种实时/);
  assert.doesNotMatch(rules + prd, /30 秒|90%|基线待采集|测评题/);
  assert.match(prd, /title="需求背景" prominent/);
  assert.match(prd, /title="目标" prominent/);
  assert.match(prd, /<p className=\{styles.paragraph\}>\{goalItems.map\(\(item\) => item.description\).join\(''\)\}<\/p>/);
  assert.doesNotMatch(prd, /styles.goalList/);
  assert.match(prd, /title="验收标准"/);
  assert.doesNotMatch(prd, /goalRows|backgroundGrid|metricNote/);
});
