import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as overviewContentModule from '../src/pages/qsbOverview/overviewContent.ts';

test('shows the overload warning only for a robot view with confirmed over-limit robots', () => {
  const shouldShow = (overviewContentModule as typeof overviewContentModule & {
    shouldShowOverviewOverloadWarning?: (view: 'robot' | 'data', robots: readonly { overLimit?: boolean }[]) => boolean;
  }).shouldShowOverviewOverloadWarning;
  assert.equal(typeof shouldShow, 'function');
  assert.equal(shouldShow!('robot', [{ overLimit: false }, { overLimit: true }]), true);
  assert.equal(shouldShow!('robot', [{ overLimit: false }]), false);
  assert.equal(shouldShow!('robot', [{}]), false);
  assert.equal(shouldShow!('robot', []), false);
  assert.equal(shouldShow!('data', [{ overLimit: true }]), false);
});
import {
  buildOverviewRunFilters,
  getOverviewTimeEventLayout,
  getOverviewAnomalyRate,
  getOverviewLayout,
  overviewAnomalyGroups,
  overviewAnomalySummary,
  overviewCopy,
  overviewPeriod,
  overviewSchedule,
  validateFeedback,
} from '../src/pages/qsbOverview/overviewContent.ts';

test('uses one line below 44px and two lines from 44px', () => {
  assert.equal(getOverviewTimeEventLayout('02:05', '03:00').compact, true);
  assert.equal(getOverviewTimeEventLayout('02:00', '03:05').compact, true);
  assert.equal(getOverviewTimeEventLayout('02:00', '03:06').compact, false);
});

test('defines ten overview annotations as structured business and UI contracts', async () => {
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const expectedMappings = [
    ['QSB-1.1', '账户与服务', '个人信息板块', '', undefined],
    ['QSB-1.2', '账户与服务', '我的资产板块', '资产用量与增购', undefined],
    ['QSB-1.3', '账户与服务', '公告与资源中心', '公告列表与资源入口', undefined],
    ['QSB-2.1', '运行趋势', '周期与运行指标', '周期选择与四项指标', undefined],
    ['QSB-2.2', '运行趋势', '运行视图切换', '机器人视图与运行数据视图', undefined],
    ['QSB-2.3', '运行趋势', '排期导航与全屏', '周期导航与排期全屏', 'qsb-overview:show-robot-view'],
    ['QSB-2.4', '运行趋势', '计划卡片', '计划排期卡片', 'qsb-overview:show-robot-view'],
    ['QSB-2.5', '运行趋势', '运行数据趋势', '四条运行趋势序列', 'qsb-overview:show-data-view'],
    ['QSB-3.1', '数据完成与异常', '完成率与异常率', '比率指标与同期变化', undefined],
    ['QSB-3.2', '数据完成与异常', '异常明细与处置', '异常分类、明细与操作', undefined],
  ] as const;

  assert.equal(qsbOverviewAnnotations.length, 10);
  assert.deepEqual(qsbOverviewAnnotations.map((item) => [
    item.noteId,
    item.page,
    item.module,
    item.target,
    item.openEvent,
  ]), expectedMappings);
  assert.deepEqual(
    Object.fromEntries(['账户与服务', '运行趋势', '数据完成与异常'].map((page) => [
      page,
      qsbOverviewAnnotations.filter((item) => item.page === page).length,
    ])),
    { '账户与服务': 3, '运行趋势': 5, '数据完成与异常': 2 },
  );
  assert.ok(qsbOverviewAnnotations.every((item) => item.topTab === '电商取数宝'));
  assert.ok(qsbOverviewAnnotations.every((item) => item.menuKey === '取数宝概览'));
  for (const annotation of qsbOverviewAnnotations) {
    assert.equal(annotation.stateLabel, '交互与反馈');
    assert.equal(annotation.recoveryLabel, '失败恢复与跳转');
    for (const field of ['ruleItems', 'exceptionItems', 'stateItems', 'recoveryItems', 'acceptanceItems'] as const) {
      if (annotation.noteId === 'QSB-2.5' && field === 'recoveryItems') {
        assert.equal(annotation[field], undefined, '运行趋势不再展示失败恢复区');
        continue;
      }
      assert.ok(annotation[field]?.length, `${annotation.noteId} 缺少 ${field}`);
    }
  }
  assert.deepEqual(
    qsbOverviewAnnotations.filter((item) => item.openEvent).map((item) => [item.noteId, item.openEvent]),
    [
      ['QSB-2.3', 'qsb-overview:show-robot-view'],
      ['QSB-2.4', 'qsb-overview:show-robot-view'],
      ['QSB-2.5', 'qsb-overview:show-data-view'],
    ],
  );
});

test('covers every required overview field, boundary, feedback and destination without implementation explanations', async () => {
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const collectItemText = (items: typeof qsbOverviewAnnotations[number]['ruleItems'] = []): string[] => (
    items.flatMap((item) => [
      item.text,
      ...(item.previews ?? []).map((preview) => `${'label' in preview ? preview.label : preview.type}:${'color' in preview ? preview.color : preview.type}`),
      ...collectItemText(item.children),
    ])
  );
  const annotationText = Object.fromEntries(qsbOverviewAnnotations.map((annotation) => [
    annotation.noteId,
    [
      annotation.module,
      annotation.target,
      ...collectItemText(annotation.ruleItems),
      ...collectItemText(annotation.exceptionItems),
      ...collectItemText(annotation.stateItems),
      ...collectItemText(annotation.recoveryItems),
      ...collectItemText(annotation.acceptanceItems),
    ].join('；'),
  ]));
  const requiredPatterns: Record<string, RegExp[]> = {
    'QSB-1.1': [/tenantName/, /avatar/, /租户详情/, /森森科技有限公司/, /自用版.*绿色/, /全托版.*紫色/, /字段为空时不展示标签/, /分钟.*480/, /保留 1 位/, /0\.0 天/, /YYYY-MM-DD/, /长期有效/, /Tooltip/, /加载骨架/, /页面级控制/, /升级/, /外部会话 URL 地址：@千秋/],
    'QSB-1.2': [/店铺/, /连接器/, /云桌面/, /机器人/, /不展示分母/, /0\/0/, /--\/--/, /实际使用数量超过已购买数量/, /固定.*钉钉商务会话 URL/, /不拼接租户 ID.*资产类型/, /不进入站内下单、支付/, /返回概览不自动刷新/],
    'QSB-1.3': [/后台管理 > 公告管理/, /已发布/, /全部租户.*电商取数宝/, /发布时间倒序/, /同一批已发布公告数据/, /动态宽度计算/, /日期实际宽度/, /12px/, /真实溢出/, /Arco Empty/, /重试按钮/, /https:\/\/help\.shizai\.com\//, /https:\/\/help\.shizai\.com\/sla/, /外部链接/, /右侧内容区显示“公告加载失败”缺省页/, /不标记为已读/],
    'QSB-2.1': [/昨日/, /周/, /月/, /时区/, /时间范围/, /去年同期/, /计划运行/, /入库成功/, /入库数据量/, /取数失败/, /“入库成功次数”与“取数失败次数”相加，应等于“计划运行次数”/, /0 与无数据/, /禁止重复点击/, /局部 Alert/, /不触发全局 Message/, /回退到原周期/],
    'QSB-2.2': [/默认.*机器人视图/, /保留.*周期/, /任何时候只选中一个视图/, /排期导航/, /趋势图/, /失败.*回退/, /重试/],
    'QSB-2.3': [/单日/, /7 天/, /自然月/, /最晚周期/, /机器人排期区域/, /Esc/, /无法进入全屏/, /加载中/, /禁用/, /保留原周期/],
    'QSB-2.4': [/计划名称/, /起止时间/, /耗时/, /运行次数/, /最新结果/, /错误码/, /涉及店铺/, /入库表/, /小于 44px/, /大于等于 44px/, /Tooltip/, /hover/, /focus/, /入库成功/, /失败/, /键盘/],
    'QSB-2.5': [/总运行/, /取数失败/, /重试/, /入库成功/, /统计/, /横轴粒度/, /同一周期/, /图例/, /Tooltip/, /加载/, /不画曲线/, /补 0/, /连线/],
    'QSB-3.1': [/完成数据表.*总数据表/, /异常数据表.*总数据表/, /1 位小数/, /分母为 0.*--/, /同比/, /去年同期/, /相对增长率/, /单位为“%”/, /颜色.*箭头/, /加载/, /失败/],
    'QSB-3.2': [/登录阶段/, /取数执行阶段/, /入库阶段/, /入库校验阶段/, /店铺/, /异常类型/, /原因/, /计划/, /发生时间/, /运行记录 ID/, /可重试/, /当前异常记录/, /禁用重复/, /成功/, /失败/, /保留当前分类和列表/, /直接打开对应 Work/, /打开.*详情/, /权限/],
  };

  for (const [noteId, patterns] of Object.entries(requiredPatterns)) {
    for (const pattern of patterns) assert.match(annotationText[noteId], pattern, `${noteId} 缺少 ${pattern}`);
  }

  const allUserVisibleText = Object.values(annotationText).join('\n');
  for (const forbidden of ['当前页面值', '原型', 'mock', 'overviewContent.ts', '生产接口待确认']) {
    assert.doesNotMatch(allUserVisibleText, new RegExp(forbidden, 'i'));
  }
});

test('renders service types using the same badge component as the account card', async () => {
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const serviceVersion = qsbOverviewAnnotations
    .find((annotation) => annotation.noteId === 'QSB-1.1')
    ?.ruleItems?.find((item) => item.text === '服务类型');

  assert.deepEqual(
    serviceVersion?.children?.map((item) => item.example).filter(Boolean),
    ['account-service-config', 'account-self', 'account-managed'],
  );
});

test('uses real component previews for every visual acceptance rule', async () => {
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  type AnnotationItem = NonNullable<typeof qsbOverviewAnnotations[number]['ruleItems']>[number];
  const collectPreviewTypes = (items: AnnotationItem[] = []): string[] => items.flatMap((item) => [
    ...(item.previews ?? []).map((preview) => preview.type),
    ...collectPreviewTypes(item.children),
  ]);
  const expectedTypes: Record<string, string[]> = {
    'QSB-1.1': [], // Account state examples reuse OverviewAccountContent via renderExample.
    'QSB-1.2': [],
    'QSB-1.3': ['empty-state'],
    'QSB-2.1': ['alert'],
    'QSB-2.2': ['view-switch'],
    'QSB-2.3': [],
    'QSB-2.4': ['result-text'],
    'QSB-2.5': [], // Trend examples reuse the chart, legend, loading skeleton and tooltip formatting.
    'QSB-3.1': [],
    'QSB-3.2': ['empty-state'],
  };

  for (const annotation of qsbOverviewAnnotations) {
    const items = [
      ...(annotation.ruleItems ?? []),
      ...(annotation.exceptionItems ?? []),
      ...(annotation.stateItems ?? []),
      ...(annotation.recoveryItems ?? []),
      ...(annotation.acceptanceItems ?? []),
    ];
    assert.deepEqual(
      [...new Set(collectPreviewTypes(items))].sort(),
      expectedTypes[annotation.noteId],
      `${annotation.noteId} 的样式预览类型不完整`,
    );
  }
});

test('hides an empty annotation target subtitle', () => {
  const drawerSource = readFileSync(new URL('../src/components/requirementAnnotations/index.tsx', import.meta.url), 'utf8');

  assert.match(drawerSource, /\{item\.target \? <span>\{item\.target\}<\/span> : null\}/);
});

test('places every overview annotation on its real target and keeps locating state-aware', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/pages/qsbOverview/index.module.less', import.meta.url), 'utf8');
  const countNoteId = (noteId: string) => pageSource.match(new RegExp(noteId.replace('.', '\\.'), 'g'))?.length ?? 0;
  const timeCalendarSource = pageSource.slice(pageSource.indexOf('function TimeRobotCalendar'), pageSource.indexOf('function MonthlyRobotCalendar'));
  const monthlyCalendarSource = pageSource.slice(pageSource.indexOf('function MonthlyRobotCalendar'), pageSource.indexOf('export default function QsbOverview'));

  assert.deepEqual(Object.fromEntries([
    ['QSB-1.1', countNoteId('QSB-1.1')],
    ['QSB-1.2', countNoteId('QSB-1.2')],
    ['QSB-1.3', countNoteId('QSB-1.3')],
    ['QSB-2.1', countNoteId('QSB-2.1')],
    ['QSB-2.2', countNoteId('QSB-2.2')],
    ['QSB-2.3', countNoteId('QSB-2.3')],
    ['QSB-2.4', countNoteId('QSB-2.4')],
    ['QSB-2.5', countNoteId('QSB-2.5')],
    ['QSB-3.1', countNoteId('QSB-3.1')],
    ['QSB-3.2', countNoteId('QSB-3.2')],
  ]), {
    'QSB-1.1': 1, 'QSB-1.2': 1, 'QSB-1.3': 1,
    'QSB-2.1': 1, 'QSB-2.2': 1, 'QSB-2.3': 3, 'QSB-2.4': 2, 'QSB-2.5': 1,
    'QSB-3.1': 1, 'QSB-3.2': 1,
  });

  assert.match(pageSource, /<section className=\{`\$\{styles\.card\} \$\{styles\.accountCard\}`\} data-note-id="QSB-1\.1">/);
  assert.doesNotMatch(pageSource, /<div className=\{styles\.valueRow\} data-note-id="QSB-1\.1">/);
  assert.match(pageSource, /<section className=\{`\$\{styles\.card\} \$\{styles\.assetCard\}`\} data-note-id="QSB-1\.2">/);
  assert.match(pageSource, /<section className=\{`\$\{styles\.card\} \$\{styles\.announcementCard\}`\} data-note-id="QSB-1\.3">/);
  assert.match(pageSource, /<div className=\{styles\.runTrendSummary\} data-note-id="QSB-2\.1"><div className=\{styles\.runTrendHeading\}>[\s\S]*<div className=\{styles\.runMetricGrid\}>[\s\S]*<\/div><\/div>\s*<div className=\{styles\.trendDivider\}/);
  assert.doesNotMatch(pageSource, /<div className=\{styles\.runTrendHeading\} data-note-id="QSB-2\.1">/);
  assert.doesNotMatch(pageSource, /<section className=\{`\$\{styles\.card\} \$\{styles\.runTrendCard\}`\} data-note-id="QSB-2\.1">/);
  assert.match(styles, /\.runTrendSummary\s*\{[^}]*display:\s*grid;[^}]*gap:\s*16px;[^}]*\}/s);
  assert.match(pageSource, /<div className=\{styles\.viewSwitch\} data-note-id="QSB-2\.2">/);
  assert.match(pageSource, /<div className=\{styles\.monthNavigator\} data-note-id="QSB-2\.3" aria-label="排期日期切换">/);
  assert.match(timeCalendarSource, /<Button data-note-id=\{annotated \? 'QSB-2\.3' : undefined\} className=\{styles\.scheduleFullscreenButton\}/);
  assert.match(monthlyCalendarSource, /<Button data-note-id=\{annotated \? 'QSB-2\.3' : undefined\} className=\{styles\.scheduleFullscreenButton\}/);
  assert.match(pageSource, /<div className=\{styles\.runTrendDataView\} data-note-id="QSB-2\.5" aria-label="运行数据视图">/);
  assert.match(pageSource, /<div className=\{styles\.completionMetrics\} data-note-id="QSB-3\.1">/);
  assert.match(pageSource, /<div className=\{styles\.anomalyDetails\} data-note-id="QSB-3\.2">/);

  assert.match(timeCalendarSource, /const firstScheduleTask = robots\.flatMap\(\(robot\) => days\.flatMap\(\(day, dayIndex\) => \([\s\S]*robot\.blocks[\s\S]*period === 'daily' \|\| block\.startSlot === dayIndex[\s\S]*\)\)\)\[0\];/);
  assert.match(timeCalendarSource, /className=\{`\$\{styles\.scheduleTaskItem\}[\s\S]*data-note-id=\{annotated && scheduleTaskId === firstScheduleTask \? 'QSB-2\.4' : undefined\}/);
  assert.match(monthlyCalendarSource, /const firstScheduleTask = robots\.flatMap\(\(robot\) => calendarDays\.flatMap\(\(day\) => \([\s\S]*robot\.blocks[\s\S]*block\.startTime\.startsWith\(day\.date\)[\s\S]*\)\)\)\[0\];/);
  assert.match(monthlyCalendarSource, /className=\{`\$\{styles\.scheduleTaskItem\}[\s\S]*data-note-id=\{annotated && `\$\{robot\.name\}:\$\{day\.date\}:\$\{block\.startTime\}:\$\{block\.label\}` === firstScheduleTask \? 'QSB-2\.4' : undefined\}/);

  for (const [eventName, handlerName, view] of [
    ['qsb-overview:show-data-view', 'showDataView', 'data'],
    ['qsb-overview:show-robot-view', 'showRobotView', 'robot'],
  ]) {
    const escapedEventName = eventName.replace(/:/g, '\\:');
    assert.match(pageSource, new RegExp(`const ${handlerName} = \\(\\) => setScheduleView\\('${view}'\\);[\\s\\S]*window\\.addEventListener\\('${escapedEventName}', ${handlerName}\\);[\\s\\S]*window\\.removeEventListener\\('${escapedEventName}', ${handlerName}\\);`));
  }
});

test('opens overflow announcements, saved labor, and schedule tasks on hover and focus', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const timeCalendarSource = pageSource.slice(pageSource.indexOf('function TimeRobotCalendar'), pageSource.indexOf('function MonthlyRobotCalendar'));
  const monthlyCalendarSource = pageSource.slice(pageSource.indexOf('function MonthlyRobotCalendar'), pageSource.indexOf('export default function QsbOverview'));
  const overviewSource = readFileSync(new URL('../src/pages/qsbOverview/OverviewAccountContent.tsx', import.meta.url), 'utf8');
  const hoverFocusTrigger = /trigger=\{\['hover', 'focus'\]\}/g;

  const anomalySource = readFileSync(new URL('../src/pages/qsbOverview/AnomalyElements.tsx', import.meta.url), 'utf8');
  assert.equal(pageSource.match(hoverFocusTrigger)?.length, 3);
  assert.match(anomalySource, hoverFocusTrigger);
  assert.equal(overviewSource.match(hoverFocusTrigger)?.length, 2);
  assert.match(pageSource, /return overflow \? <Tooltip content=\{title\} trigger=\{\['hover', 'focus'\]\}>/);
  assert.match(timeCalendarSource, /<Tooltip[^>]*trigger=\{\['hover', 'focus'\]\}[^>]*content=\{<ScheduleTaskTooltip block=\{block\} \/>\}/);
  assert.match(monthlyCalendarSource, /<Tooltip[\s\S]*?trigger=\{\['hover', 'focus'\]\}[\s\S]*?content=\{<ScheduleTaskTooltip block=\{block\} \/>\}/);
  assert.match(overviewSource, /<Tooltip content=\{overviewSavedLaborFormula\} trigger=\{\['hover', 'focus'\]\}>/);
});

test('keeps annotation filter tabs within the desktop drawer', () => {
  const drawerStyles = readFileSync(new URL('../src/components/requirementAnnotations/index.module.less', import.meta.url), 'utf8');
  const baseDrawerBlock = drawerStyles.match(/\.drawer\s*\{([\s\S]*?)\n\}/)?.[1];
  const filterTitleBlock = drawerStyles.match(/\.filterTabs :global\(\.arco-tabs-header-title\)\s*\{([\s\S]*?)\n\}/)?.[1];

  assert.ok(baseDrawerBlock);
  assert.doesNotMatch(baseDrawerBlock, /position:\s*relative;/);
  assert.ok(filterTitleBlock);
  assert.doesNotMatch(filterTitleBlock, /padding:\s*0 12px;/);
  assert.match(filterTitleBlock, /padding-left:\s*12px;/);
  assert.match(filterTitleBlock, /padding-right:\s*12px;/);
  assert.match(drawerStyles, /\.filterTabs :global\(\.arco-tabs-header-title:first-child\)\s*\{[\s\S]*margin-left:\s*0;/);
});

test('switches schedule task content between compact and regular layouts', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/pages/qsbOverview/index.module.less', import.meta.url), 'utf8');
  assert.match(pageSource, /getOverviewTimeEventLayout/);
  assert.match(pageSource, /compact=\{position\.compact\}/);
  assert.match(styles, /\.compactScheduleTaskItem\s*>\s*span\s*\{[^}]*white-space:\s*nowrap[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/s);
});

test('leaves sparkline colors to the global Semi DV theme', () => {
  const buildSemiSparklineSpec = (overviewContentModule as typeof overviewContentModule & {
    buildSemiSparklineSpec?: (values: readonly number[]) => Record<string, unknown>;
  }).buildSemiSparklineSpec;

  assert.equal(typeof buildSemiSparklineSpec, 'function');
  const spec = buildSemiSparklineSpec?.([8, 14, 22]);
  assert.ok(spec);
  assert.equal('color' in spec, false);
  assert.equal('animation' in spec, false);
  assert.deepEqual(spec.data, [{
    id: 'spark',
    values: [{ index: 0, value: 8 }, { index: 1, value: 14 }, { index: 2, value: 22 }],
  }]);
});

test('builds the themed data completion progress without overriding the Qushubao theme', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    buildDataCompletionSpec?: (value: number) => Record<string, unknown>;
  };

  assert.equal(typeof module.buildDataCompletionSpec, 'function');

  const progress = module.buildDataCompletionSpec?.(98);
  assert.ok(progress);
  assert.equal(progress.type, 'linearProgress');
  assert.equal('color' in progress, false);
  assert.equal('animation' in progress, false);
  assert.deepEqual(progress.data, [{ id: 'completion', values: [{ type: '完成率', value: 98 }] }]);
});

test('merges completion and anomaly details while giving run trend the freed space', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/pages/qsbOverview/index.module.less', import.meta.url), 'utf8');
  const trendSource = readFileSync(new URL('../src/pages/qsbOverview/TrendIndicator.tsx', import.meta.url), 'utf8');

  assert.match(pageSource, /styles\.completionCard/);
  assert.match(pageSource, /styles\.completionSummary/);
  assert.match(pageSource, /styles\.anomalySummary/);
  assert.match(pageSource, /<Tabs[^>]*type="rounded"/s);
  assert.match(pageSource, /同比：<TrendIndicator/);
  assert.match(pageSource, /overviewRunTrendSeries\.map\(\(series\) => <RunTrendLegendItem/);
  const anomalySource = readFileSync(new URL('../src/pages/qsbOverview/AnomalyElements.tsx', import.meta.url), 'utf8');
  assert.equal(pageSource.match(/<Button type="text" size="mini"/g)?.length, 1);
  assert.equal(anomalySource.match(/<Button type="text" size="mini"/g)?.length, 3);
  assert.equal(pageSource.match(/<TrendIndicator/g)?.length, 3);
  assert.doesNotMatch(pageSource, /'↑'|'↓'/);
  assert.match(trendSource, /IconArrowRise/);
  assert.match(trendSource, /IconArrowFall/);
  assert.doesNotMatch(pageSource, /styles\.dataOverviewCard/);
  assert.doesNotMatch(pageSource, /今日涉及店铺/);
  assert.doesNotMatch(pageSource, /平台交付分布/);
  assert.doesNotMatch(pageSource, /buildPlatformDeliveryBands/);
  assert.match(styles, /\.announcementList\s*\{[^}]*gap:\s*8px/s);
  assert.match(styles, /\.mainColumn\s*\{[^}]*grid-template-rows:\s*720px minmax\(250px, 1fr\)/s);
  assert.match(styles, /\.runTrendCard\s*\{[^}]*height:\s*720px/s);
  assert.match(styles, /\.completionCard\s*\{[^}]*grid-template-columns:\s*220px 1px minmax\(0, 1fr\)/s);
  assert.match(styles, /\.scheduleCanvas\s*\{[^}]*min-height:\s*100%[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);
  assert.match(styles, /\.scheduleRow\s*\{[^}]*flex:\s*1 0 auto/s);
  assert.match(styles, /\.taskLayer\s*\{[^}]*top:\s*50%[^}]*height:\s*64px[^}]*translateY\(-50%\)/s);
  assert.match(styles, /\.assetItem\s*\{[^}]*padding:\s*8px[^}]*border:\s*1px solid transparent/s);
  assert.match(styles, /\.assetItem:hover\s*\{[^}]*border-color:\s*#165dff/s);
  assert.doesNotMatch(styles, /\.assetItem:hover\s*\{[^}]*background:/s);
  assert.match(styles, /\.completionSummary small,\s*\.anomalySummary small\s*\{[^}]*display:\s*flex[^}]*align-items:\s*center/s);
  assert.equal(pageSource.match(/className=\{styles\.comparisonRow\}/g)?.length, 3);
  assert.match(styles, /\.comparisonRow\s*\{[^}]*display:\s*flex[^}]*align-items:\s*center[^}]*min-height:\s*20px/s);
  assert.match(styles, /\.expiry button\s*\{[^}]*font-size:\s*14px/s);
  assert.doesNotMatch(styles, /\.anomalySummary small b\s*\{[^}]*color:/s);
  assert.match(styles, /\.anomalyRow\s*\{[^}]*margin:\s*0[^}]*padding:\s*4px 16px[^}]*border-radius:\s*8px/s);
  assert.match(styles, /\.anomalyRow button:hover,\s*\.anomalyRow button:focus-visible\s*\{[^}]*background:\s*#e8f3ff/s);
});

test('provides deterministic mock snapshots for the animated data overview', () => {
  const snapshots = (overviewContentModule as typeof overviewContentModule & {
    overviewDataSnapshots?: readonly {
      completionRate: number;
      completionYoYChange: number;
      completedSourceCount: number;
      totalSourceCount: number;
      storeDelivery: { completed: number; retrying: number; pending: number };
      platformDelivered: number;
      platformTotal: number;
      platforms?: readonly {
        name: string;
        delivered: number;
        total: number;
        children: readonly { name: string; delivered: number; total: number }[];
      }[];
    }[];
  }).overviewDataSnapshots;

  assert.ok(snapshots);
  assert.equal(snapshots.length, 4);
  const lastSnapshot = snapshots.at(-1);
  assert.ok(lastSnapshot);
  assert.deepEqual({
    completionRate: lastSnapshot.completionRate,
    completionYoYChange: lastSnapshot.completionYoYChange,
    completedSourceCount: lastSnapshot.completedSourceCount,
    totalSourceCount: lastSnapshot.totalSourceCount,
    storeDelivery: lastSnapshot.storeDelivery,
    platformDelivered: lastSnapshot.platformDelivered,
    platformTotal: lastSnapshot.platformTotal,
  }, {
    completionRate: 98,
    completionYoYChange: 4.6,
    completedSourceCount: 12140,
    totalSourceCount: 12388,
    storeDelivery: { completed: 14, retrying: 3, pending: 10 },
    platformDelivered: 620,
    platformTotal: 1000,
  });
  assert.deepEqual(lastSnapshot.platforms?.map(({ name, delivered, total }) => ({ name, delivered, total })), [
    { name: '淘系', delivered: 151, total: 220 },
    { name: '京东', delivered: 117, total: 180 },
    { name: '抖音', delivered: 94, total: 150 },
    { name: '唯品会', delivered: 58, total: 100 },
    { name: '快手', delivered: 65, total: 110 },
    { name: '得物', delivered: 46, total: 80 },
    { name: '有赞', delivered: 42, total: 70 },
    { name: '聚水潭', delivered: 47, total: 90 },
  ]);
  assert.ok(snapshots.every((snapshot) => (
    snapshot.storeDelivery.completed + snapshot.storeDelivery.retrying + snapshot.storeDelivery.pending === 27
  )));
  assert.ok(snapshots.every((snapshot) => snapshot.platformDelivered <= snapshot.platformTotal));
  assert.ok(snapshots.every((snapshot) => (
    snapshot.platforms?.reduce((sum, item) => sum + item.delivered, 0) === snapshot.platformDelivered
      && snapshot.platforms.reduce((sum, item) => sum + item.total, 0) === snapshot.platformTotal
  )));
  assert.ok(snapshots.every((snapshot) => (
    snapshot.completionRate === Number((snapshot.completedSourceCount / snapshot.totalSourceCount * 100).toFixed(1))
  )));
});

test('derives completion and delivery totals from reconciled facts', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    calculateRate?: (numerator: number, denominator: number) => number;
    overviewDataCompletion?: { completed: number; total: number };
    overviewStoreDelivery?: {
      total: number;
      statuses: { completed: number; retrying: number; pending: number };
    };
    overviewPlatformDelivery?: {
      delivered: number;
      total: number;
      platforms: readonly { name: string; delivered: number; total: number }[];
    };
  };

  assert.ok(module.overviewDataCompletion);
  assert.equal(module.calculateRate?.(module.overviewDataCompletion.completed, module.overviewDataCompletion.total).toFixed(1), '98.0');
  assert.ok(module.overviewStoreDelivery);
  assert.equal(Object.values(module.overviewStoreDelivery.statuses).reduce((sum, value) => sum + value, 0), module.overviewStoreDelivery.total);
  assert.equal(module.overviewStoreDelivery.total, 27);
  assert.ok(module.overviewPlatformDelivery);
  assert.equal(module.overviewPlatformDelivery.platforms.reduce((sum, item) => sum + item.delivered, 0), module.overviewPlatformDelivery.delivered);
  assert.equal(module.overviewPlatformDelivery.platforms.reduce((sum, item) => sum + item.total, 0), module.overviewPlatformDelivery.total);
  assert.equal(module.overviewPlatformDelivery.delivered, 620);
  assert.equal(module.overviewPlatformDelivery.total, 1000);
  assert.deepEqual(module.overviewPlatformDelivery.platforms.map((item) => (
    module.calculateRate?.(item.delivered, item.total).toFixed(1)
  )), ['68.6', '65.0', '62.7', '58.0', '59.1', '57.5', '60.0', '52.2']);
  const platformShares = module.overviewPlatformDelivery.platforms.map((item) => (
    Number((module.calculateRate?.(item.total, module.overviewPlatformDelivery!.total) ?? 0).toFixed(1))
  ));
  assert.deepEqual(platformShares, [22, 18, 15, 10, 11, 8, 7, 9]);
  assert.equal(platformShares.reduce((sum, value) => sum + value, 0), 100);
});

test('builds the visible overview values without hard-coded rates or dates', () => {
  const buildOverviewViewModel = (overviewContentModule as typeof overviewContentModule & {
    buildOverviewViewModel?: (period: 'daily' | 'weekly' | 'cumulative') => {
      updatedAtLabel: string;
      completionRate: number;
      anomalyRate: number;
      anomalyChange: number;
      runMetrics: readonly { key: string; change: number }[];
      platformRates: readonly { name: string; rate: number }[];
    };
  }).buildOverviewViewModel;

  assert.equal(typeof buildOverviewViewModel, 'function');
  const dailyView = buildOverviewViewModel?.('daily');
  assert.ok(dailyView);
  assert.equal(dailyView.updatedAtLabel, '2026-08-25 10:00:00');
  assert.equal(dailyView.completionRate.toFixed(1), '98.0');
  assert.equal(dailyView.anomalyRate.toFixed(1), '11.5');
  assert.equal(dailyView.anomalyChange.toFixed(1), '-4.0');
  assert.equal(dailyView.runMetrics.find((item) => item.key === 'runs')?.change.toFixed(1), '4.0');
  assert.deepEqual(dailyView.platformRates.map((item) => item.rate.toFixed(1)), [
    '68.6', '65.0', '62.7', '58.0', '59.1', '57.5', '60.0', '52.2',
  ]);
});

test('keeps saved labor as the primary value in the operation summary', () => {
  assert.equal(overviewCopy.primaryMetricTitle, '累计节省人力');
  assert.equal(overviewCopy.showOutcomeHeading, true);
  assert.equal(overviewCopy.showIngestionSuccessRateInSummary, false);
});

test('keeps the PRD template while matching the current overview prototype', () => {
  const prdSource = readFileSync(new URL('../src/pages/qsbOverviewPrd/index.tsx', import.meta.url), 'utf8');
  const annotationDesign = readFileSync(new URL('../docs/superpowers/specs/2026-08-30-qsb-overview-interaction-annotations-design.md', import.meta.url), 'utf8');
  const templateTitles = ['版本信息', '需求背景', '目标', '需求范围', '用户故事', '用户场景与交互说明', '非功能要求', '本期不做'];

  assert.equal(prdSource.match(/\['V\d+\.\d+'/g)?.length, 1);
  assert.match(prdSource, /\['V1\.0', '2026\/06\/30', '森森', '创建需求 PRD'\]/);
  assert.match(prdSource, />新增取数宝概况<\/Typography\.Title>/);
  assert.match(prdSource, /\['前台-概况', '[^']+', 'PC 端', '全产品线', '新增', 'P0'\]/);
  assert.doesNotMatch(prdSource, />优化取数宝概况<\/Typography\.Title>|因此需要重构概况/);

  for (const title of templateTitles) {
    assert.match(prdSource, new RegExp(`title="${title}"`));
  }
  assert.deepEqual(
    templateTitles.map((title) => prdSource.indexOf(`title="${title}"`)),
    [...templateTitles].map((title) => prdSource.indexOf(`title="${title}"`)).sort((left, right) => left - right),
  );

  for (const copy of [
    '个人信息板块', '累计节省人力', '昨日、周、月', '机器人视图', '运行数据视图',
    '登录异常', '取数执行异常', '入库异常', '入库校验异常',
    '已提交重试', '运行记录', '涉及店铺', '涉及入库表',
  ]) {
    assert.match(prdSource, new RegExp(copy));
  }

  assert.match(prdSource, /进入概览.*选择昨日\/周\/月.*查看运行指标.*机器人\/运行数据视图.*数据完成率与异常率.*运行记录/s);
  assert.match(prdSource, /\['个人信息板块', '[^']*avatar[^']*tenantName[^']*自用版[^']*绿色标签[^']*全托版[^']*紫色标签[^']*空值不展示标签[^']*成功执行计划[^']*有效产品授权结束日期[^']*', '[^']*480 分钟\/天[^']*0\.0天[^']*YYYY-MM-DD[^']*长期有效[^']*权限仅控制页面[^']*'\]/);
  assert.match(prdSource, /租户详情—服务类型/);
  assert.match(prdSource, /外部会话 URL 地址：@千秋/);
  assert.doesNotMatch(prdSource, /\['账户价值',/);
  assert.doesNotMatch(prdSource, /支持自定义周期|提交带截图的需求反馈|展示数据完成率、今日涉及店铺|平台交付情况|2438:10205/);
});

test('derives account value and period metrics from one 2026-08-25 data clock', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    calculateRate?: (numerator: number, denominator: number) => number;
    calculatePercentageChange?: (current: number, previous: number) => number;
    overviewDataClock?: {
      asOf: string;
      daily: { startDate: string; endDate: string };
      weekly: { startDate: string; endDate: string };
      cumulative: { startDate: string; endDate: string };
    };
    overviewAccountSummary?: {
      savedMinutes: number;
      workdayMinutes: number;
      savedLaborDays: number;
      expiresAt: string;
      sparklineValues: readonly number[];
    };
    overviewAssets?: readonly { key: string; used: number; total?: number }[];
    overviewRunMetricsByPeriod?: Record<string, {
      current: { runs: number; success: number; failed: number; rows: number };
      previous: { runs: number; success: number; failed: number; rows: number };
    }>;
  };

  assert.equal(typeof module.calculateRate, 'function');
  assert.equal(typeof module.calculatePercentageChange, 'function');
  assert.deepEqual(module.overviewDataClock, {
    asOf: '2026-08-25T10:00:00+08:00',
    daily: { startDate: '2026-08-25', endDate: '2026-08-25' },
    weekly: { startDate: '2026-08-19', endDate: '2026-08-25' },
    cumulative: { startDate: '2025-08-26', endDate: '2026-08-25' },
  });
  assert.ok(module.overviewAccountSummary);
  assert.equal(module.overviewAccountSummary.savedMinutes / module.overviewAccountSummary.workdayMinutes, 155.5);
  assert.equal(module.overviewAccountSummary.savedLaborDays, 155.5);
  assert.equal(module.overviewAccountSummary.sparklineValues.at(-1), 155.5);
  assert.equal(module.overviewAccountSummary.expiresAt, '2027-08-21');
  assert.deepEqual(module.overviewAssets, [
    { key: 'stores', used: 155 },
    { key: 'connectors', used: 125, total: 200 },
    { key: 'cloud', used: 83, total: 120 },
    { key: 'robots', used: 48, total: 60 },
  ]);
  assert.ok(module.overviewRunMetricsByPeriod);
  for (const period of Object.values(module.overviewRunMetricsByPeriod)) {
    assert.equal(period.current.success + period.current.failed, period.current.runs);
    assert.equal(period.previous.success + period.previous.failed, period.previous.runs);
  }
});

test('uses the approved overview structure with a left account rail and two main sections', () => {
  const layout = getOverviewLayout();

  assert.equal(overviewCopy.pageTitle, '概况');
  assert.equal(layout.accountPanel.placement, 'left-rail');
  assert.equal(layout.accountPanel.width, 301);
  assert.equal(layout.assetPanel.placement, 'left-rail');
  assert.equal(layout.assetPanel.display, 'grid-2x2');
  assert.deepEqual(layout.assetPanel.items, ['stores', 'connectors', 'cloudDesktops', 'robots']);
  assert.deepEqual(layout.leftRail, ['accountValue', 'assets', 'announcements', 'resources']);
  assert.deepEqual(layout.mainSections, ['runTrend', 'dataCompletion']);
});

test('uses the approved copy for the completion-first overview narrative', () => {
  const layout = getOverviewLayout();

  assert.equal(overviewCopy.trendTitle, '运行趋势');
  assert.equal(overviewCopy.completionTitle, '数据完成率');
  assert.equal(overviewCopy.anomalyTitle, '数据异常率');
  assert.deepEqual(layout.runTrend.metrics, ['planRuns', 'ingestions', 'rows', 'failedRuns']);
  assert.deepEqual(layout.runTrend.periods, ['daily', 'weekly', 'cumulative']);
});

test('provides ten unique announcements in descending ISO date order', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    overviewAnnouncements?: readonly { id: string; title: string; summary: string; publishedAt: string }[];
    formatOverviewAnnouncementDate?: (publishedAt: string) => string;
  };
  assert.ok(module.overviewAnnouncements);
  assert.equal(typeof module.formatOverviewAnnouncementDate, 'function');
  const overviewAnnouncements = module.overviewAnnouncements;
  const formatOverviewAnnouncementDate = module.formatOverviewAnnouncementDate;

  assert.equal(overviewAnnouncements.length, 10);
  assert.equal(new Set(overviewAnnouncements.map((item) => item.id)).size, 10);
  assert.equal(new Set(overviewAnnouncements.map((item) => item.title)).size, 10);
  assert.ok(overviewAnnouncements.every((item) => item.summary.length > 0));
  assert.ok(overviewAnnouncements.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt)));
  assert.deepEqual(
    overviewAnnouncements.map((item) => item.publishedAt),
    ['2026-08-25', '2026-08-22', '2026-08-19', '2026-08-15', '2026-08-11', '2026-08-07', '2026-08-02', '2026-07-28', '2026-07-21', '2026-07-15'],
  );
  assert.equal(formatOverviewAnnouncementDate?.('2026-08-25'), '08/25');
});

test('uses yesterday, week, and month as the overview period labels', () => {
  const periodOptions = (overviewContentModule as typeof overviewContentModule & {
    overviewPeriodOptions?: readonly { key: string; label: string }[];
  }).overviewPeriodOptions;

  assert.deepEqual(periodOptions, [
    { key: 'daily', label: '昨日' },
    { key: 'weekly', label: '周' },
    { key: 'cumulative', label: '月' },
  ]);
});

test('explains the saved-labor calculation with the current mock inputs', () => {
  const formula = (overviewContentModule as typeof overviewContentModule & {
    overviewSavedLaborFormula?: string;
  }).overviewSavedLaborFormula;

  assert.match(formula ?? '', /74,640 分钟/);
  assert.match(formula ?? '', /480 分钟\/天/);
  assert.match(formula ?? '', /155\.5 天/);
});

test('provides nested store and plan details for every delivery status', () => {
  const deliveryDetails = (overviewContentModule as typeof overviewContentModule & {
    overviewStoreDeliveryDetails?: Record<'completed' | 'retrying' | 'pending', readonly {
      storeName: string;
      plans: readonly { planName: string; errorDetail: string }[];
    }[]>;
  }).overviewStoreDeliveryDetails;

  assert.ok(deliveryDetails);
  assert.deepEqual(Object.keys(deliveryDetails), ['completed', 'retrying', 'pending']);
  for (const status of Object.values(deliveryDetails)) {
    assert.ok(status.length >= 2);
    assert.ok(status.every((store) => store.storeName && store.plans.length > 0));
    assert.ok(status.every((store) => store.plans.every((plan) => plan.planName && plan.errorDetail)));
  }
});

test('opens the message center on announcement messages from the more action', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const messageCenterSource = readFileSync(new URL('../src/components/messageCenter/index.tsx', import.meta.url), 'utf8');

  assert.match(pageSource, /onOpenAnnouncements\?: \(\) => void/);
  assert.match(pageSource, /<Button type="text" size="mini" onClick=\{onOpenAnnouncements\}>更多<\/Button>/);
  assert.match(appSource, /onOpenAnnouncements=\{\(\) => \{[\s\S]*setMessageCenterInitialCategory\('announcement'\);[\s\S]*setMessageCenterVisible\(true\);[\s\S]*\}\}/);
  assert.match(appSource, /initialCategory=\{messageCenterInitialCategory\}/);
  assert.match(messageCenterSource, /initialCategory\?: MessageCenterCategory/);
  assert.match(messageCenterSource, /const nextCategory = hasTargetAnnouncement \? 'announcement' : initialCategory/);
  assert.match(messageCenterSource, /setCategory\(nextCategory\)/);
});

test('uses backend-published announcements and dynamic title overflow on overview', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const pageStyles = readFileSync(new URL('../src/pages/qsbOverview/index.module.less', import.meta.url), 'utf8');
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

  assert.match(appSource, /announcements=\{announcementMessages\}/);
  assert.match(pageSource, /item\.status === 'published'/);
  assert.match(pageSource, /item\.range === '全部租户' \|\| item\.range === '电商取数宝'/);
  assert.match(pageSource, /Date\.parse\(right\.publishedAt\) - Date\.parse\(left\.publishedAt\)/);
  assert.match(pageSource, /titleElement\.scrollWidth > titleElement\.clientWidth/);
  assert.match(pageSource, /new ResizeObserver\(updateOverflow\)/);
  assert.match(pageSource, /overflow \? <Tooltip content=\{title\} trigger=\{\['hover', 'focus'\]\}>/);
  assert.match(pageSource, /<Empty description="暂无公告" \/>/);
  assert.match(pageStyles, /\.announcementList\s*>\s*button\s*\{[^}]*gap:\s*12px/s);
  assert.match(pageStyles, /\.announcementList span\s*\{[^}]*flex:\s*1/s);
  assert.match(pageStyles, /\.announcementList time\s*\{[^}]*flex:\s*none/s);
});

test('provides explicit mock metrics for every overview period', () => {
  const periodMetrics = (overviewContentModule as typeof overviewContentModule & {
    overviewRunMetricsByPeriod?: Record<string, {
      comparisonLabel: string;
      current: { runs: number; success: number; failed: number; rows: number };
      previous: { runs: number; success: number; failed: number; rows: number };
      metrics: readonly { key: string; value: number; suffix: string; change: number }[];
    }>;
  }).overviewRunMetricsByPeriod;

  assert.ok(periodMetrics);
  assert.deepEqual(Object.keys(periodMetrics), ['daily', 'weekly', 'cumulative']);
  assert.deepEqual(periodMetrics.daily.current, { runs: 28755, success: 27248, failed: 1507, rows: 15.54 });
  assert.deepEqual(periodMetrics.daily.previous, { runs: 27649, success: 26100, failed: 1549, rows: 14.94 });
  assert.deepEqual(periodMetrics.weekly.current, { runs: 187960, success: 178340, failed: 9620, rows: 102.68 });
  assert.deepEqual(periodMetrics.weekly.previous, { runs: 181429, success: 171292, failed: 10137, rows: 97.6 });
  assert.deepEqual(periodMetrics.cumulative.current, { runs: 8642310, success: 8126440, failed: 515870, rows: 4782.16 });
  assert.deepEqual(periodMetrics.cumulative.previous, { runs: 7688888, success: 7123861, failed: 565027, rows: 4363.28 });
  assert.deepEqual(periodMetrics.daily.metrics.map((item) => Number(item.change.toFixed(1))), [4, 4.4, 4, -2.7]);
  assert.deepEqual(periodMetrics.weekly.metrics.map((item) => Number(item.change.toFixed(1))), [3.6, 4.1, 5.2, -5.1]);
  assert.deepEqual(periodMetrics.cumulative.metrics.map((item) => Number(item.change.toFixed(1))), [12.4, 14.1, 9.6, -8.7]);
});

test('models the robot schedule axis at the selected period granularity', () => {
  const getOverviewScheduleAxis = (overviewContentModule as typeof overviewContentModule & {
    getOverviewScheduleAxis?: (period: 'daily' | 'weekly' | 'cumulative') => {
      labels: readonly string[];
      unitWidth: number;
    };
  }).getOverviewScheduleAxis;

  assert.equal(overviewSchedule.hourCount, 24);
  assert.equal(overviewSchedule.rowAxis, 'robots');
  assert.deepEqual(overviewSchedule.scrollAxes, ['horizontal', 'vertical']);
  assert.equal(typeof getOverviewScheduleAxis, 'function');
  assert.deepEqual(getOverviewScheduleAxis?.('daily').labels, Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`));
  assert.deepEqual(getOverviewScheduleAxis?.('weekly').labels, ['周日', '周一', '周二', '周三', '周四', '周五', '周六']);
  assert.deepEqual(getOverviewScheduleAxis?.('cumulative').labels, ['周日', '周一', '周二', '周三', '周四', '周五', '周六']);
});

test('builds daily and weekly time calendars around the selected date', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    buildOverviewTimeCalendarDays?: (period: 'daily' | 'weekly', anchorDate: string) => readonly {
      date: string;
      day: number;
      weekday: string;
    }[];
    getOverviewTimeEventPosition?: (startTime: string, endTime: string) => { top: number; height: number };
    getOverviewRobotSchedules?: (period: 'weekly') => readonly {
      name: string;
      planCount: number;
      blocks: readonly {
        startTime: string;
        endTime: string;
        startSlot?: number;
        endSlot?: number;
        label: string;
        tone: string;
      }[];
    }[];
  };

  assert.deepEqual(module.buildOverviewTimeCalendarDays?.('daily', '2026-08-25'), [
    { date: '2026-08-25', day: 25, weekday: '周二' },
  ]);
  const week = module.buildOverviewTimeCalendarDays?.('weekly', '2026-08-25');
  assert.ok(week);
  assert.equal(week.length, 7);
  assert.deepEqual(week[0], { date: '2026-08-23', day: 23, weekday: '周日' });
  assert.deepEqual(week[6], { date: '2026-08-29', day: 29, weekday: '周六' });

  const position = module.getOverviewTimeEventPosition?.('09:15', '10:00');
  assert.ok(position);
  assert.ok(Math.abs(position.top - 38.5416666667) < 0.001);
  assert.ok(Math.abs(position.height - 3.125) < 0.001);

  const schedules = module.getOverviewRobotSchedules?.('weekly');
  assert.ok(schedules);

  for (const robot of schedules) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const tasks = robot.blocks.filter((block) => block.startSlot === dayIndex);
      assert.ok(tasks.length >= 3 && tasks.length <= 5);
      assert.ok(tasks.every((block) => block.endSlot === dayIndex + 1));
    }
    assert.ok(robot.blocks.every((block) => (block.startSlot ?? -1) >= 0 && (block.startSlot ?? 7) < 7));
  }
});

test('provides latest-work results and complete store sets for calendar tooltips', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    getOverviewRobotSchedules?: (period: 'daily' | 'weekly' | 'cumulative') => readonly {
      blocks: readonly {
        runCount?: number;
        latestWorkResult?: 'success' | 'failed';
        latestWorkErrorCode?: string;
        stores?: readonly string[];
        tables?: readonly string[];
      }[];
    }[];
  };

  const blocks = (['daily', 'weekly', 'cumulative'] as const)
    .flatMap((period) => module.getOverviewRobotSchedules?.(period) ?? [])
    .flatMap((robot) => robot.blocks);

  assert.ok(blocks.length > 0);
  assert.ok(blocks.every((block) => (block.runCount ?? 0) > 0));
  assert.ok(blocks.every((block) => block.latestWorkResult === 'success' || block.latestWorkResult === 'failed'));
  assert.ok(blocks.filter((block) => block.latestWorkResult === 'failed').every((block) => Boolean(block.latestWorkErrorCode)));
  assert.ok(blocks.filter((block) => block.latestWorkResult === 'success').every((block) => block.latestWorkErrorCode === undefined));
  assert.ok(blocks.every((block) => (block.stores?.length ?? 0) > 0));
  assert.ok(blocks.every((block) => (block.tables?.length ?? 0) > 0));
  assert.ok(blocks.some((block) => block.latestWorkResult === 'failed'));
  assert.ok(blocks.some((block) => block.stores?.length === 8));
  assert.ok(blocks.some((block) => (block.tables?.length ?? 0) > 4));
});

test('prevents schedule navigation from entering today or a future period', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    overviewCalendarToday?: string;
    canNavigateOverviewScheduleForward?: (period: 'daily' | 'weekly' | 'cumulative', anchorDate: string, year: number, monthIndex: number) => boolean;
  };

  assert.equal(module.overviewCalendarToday, '2026-08-28');
  assert.equal(module.canNavigateOverviewScheduleForward?.('daily', '2026-08-26', 2026, 7), true);
  assert.equal(module.canNavigateOverviewScheduleForward?.('daily', '2026-08-27', 2026, 7), false);
  assert.equal(module.canNavigateOverviewScheduleForward?.('weekly', '2026-08-18', 2026, 7), true);
  assert.equal(module.canNavigateOverviewScheduleForward?.('weekly', '2026-08-25', 2026, 7), false);
  assert.equal(module.canNavigateOverviewScheduleForward?.('cumulative', '2026-08-25', 2026, 6), true);
  assert.equal(module.canNavigateOverviewScheduleForward?.('cumulative', '2026-08-25', 2026, 7), false);
});

test('builds the monthly robot schedule on a 7 by 6 natural-month calendar', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    overviewMonthlyCalendarDays?: readonly {
      date: string;
      day: number;
      inCurrentMonth: boolean;
    }[];
    overviewMonthlyPlanCycleLegend?: readonly { label: string; tone: string }[];
    formatOverviewTaskDuration?: (startTime: string, endTime: string) => string;
    buildOverviewMonthlyCalendarDays?: (year: number, monthIndex: number) => readonly {
      date: string;
      day: number;
      inCurrentMonth: boolean;
    }[];
    getOverviewMonthlyRobotSchedules?: (year: number, monthIndex: number) => readonly {
      name: string;
      planCount: number;
      blocks: readonly {
        startTime: string;
        runCount?: number;
        successCount?: number;
        failedCount?: number;
        stores?: readonly string[];
      }[];
    }[];
  };
  const days = module.overviewMonthlyCalendarDays;

  assert.ok(days);
  assert.equal(days.length, 42);
  assert.deepEqual(days[0], { date: '2026-07-26', day: 26, inCurrentMonth: false });
  assert.deepEqual(days[6], { date: '2026-08-01', day: 1, inCurrentMonth: true });
  assert.deepEqual(days.at(-1), { date: '2026-09-05', day: 5, inCurrentMonth: false });
  assert.deepEqual(module.overviewMonthlyPlanCycleLegend, [
    { label: '日', tone: 'blue' },
    { label: '周', tone: 'orange' },
    { label: '月', tone: 'violet' },
  ]);
  assert.equal(module.formatOverviewTaskDuration?.('2026-08-01 11:00:21', '2026-08-01 12:21:08'), '耗时1h21min');

  const septemberDays = module.buildOverviewMonthlyCalendarDays?.(2026, 8);
  assert.ok(septemberDays);
  assert.equal(septemberDays.length, 42);
  assert.deepEqual(septemberDays[0], { date: '2026-08-30', day: 30, inCurrentMonth: false });
  assert.deepEqual(septemberDays[2], { date: '2026-09-01', day: 1, inCurrentMonth: true });
  assert.deepEqual(septemberDays.at(-1), { date: '2026-10-10', day: 10, inCurrentMonth: false });

  const septemberRobots = module.getOverviewMonthlyRobotSchedules?.(2026, 8);
  assert.ok(septemberRobots);
  assert.ok(septemberRobots.every((robot) => robot.blocks.every((block) => block.startTime.startsWith('2026-09-'))));
  const septemberBlocks = septemberRobots.flatMap((robot) => robot.blocks);
  assert.ok(septemberBlocks.length > 0);
  assert.ok(septemberBlocks.every((block) => block.runCount === (block.successCount ?? 0) + (block.failedCount ?? 0)));
  assert.ok(septemberBlocks.every((block) => (block.stores?.length ?? 0) > 0));
  assert.ok(septemberBlocks.some((block) => (block.failedCount ?? 0) > 0));
});

test('supports the Fullscreen API and fluid scrollable schedule sizing', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/pages/qsbOverview/index.module.less', import.meta.url), 'utf8');

  assert.match(pageSource, /if \(isFullscreen\)/);
  assert.match(pageSource, /requestFullscreen\(\)/);
  assert.match(pageSource, /fullscreenchange/);
  assert.match(pageSource, /TimeRobotCalendar/);
  assert.match(pageSource, /function ScheduleTaskContent/);
  assert.match(pageSource, /function ScheduleTaskTooltip/);
  assert.match(pageSource, /最新结果：/);
  assert.match(pageSource, /入库成功/);
  assert.match(pageSource, /latestWorkErrorCode/);
  assert.doesNotMatch(pageSource, /更新时间：/);
  assert.doesNotMatch(pageSource, /成功 \{block\.successCount/);
  assert.doesNotMatch(pageSource, /失败 \{block\.failedCount/);
  assert.match(pageSource, /title=\{`\$\{block\.label\} \$\{block\.startTime\}~\$\{block\.endTime\}`\}/);
  assert.match(pageSource, /<strong>\{block\.label\}<\/strong>/);
  assert.match(pageSource, /period === 'cumulative'/);
  assert.match(pageSource, /styles\.monthlyRobotCalendar/);
  assert.match(pageSource, /overviewMonthlyPlanCycleLegend\.map/);
  assert.match(pageSource, /<div className=\{styles\.scheduleToolbarActions\}/);
  assert.match(pageSource, /<RobotOverloadWarning \/>/);
  assert.match(pageSource, /dayTasks\.map/);
  assert.match(pageSource, /formatOverviewTaskDuration\(block\.startTime, block\.endTime\)/);
  assert.match(pageSource, /styles\.scheduleTaskTooltip/);
  assert.match(pageSource, /运行次数：/);
  assert.match(pageSource, /涉及店铺（\{stores\.length\}）/);
  assert.match(pageSource, /涉及入库表/);
  assert.match(pageSource, /useState<OverviewPeriodKey>\('cumulative'\)/);
  assert.match(pageSource, /IconLeft/);
  assert.match(pageSource, /IconRight/);
  assert.match(pageSource, /getOverviewMonthlyRobotSchedules/);
  assert.match(pageSource, /buildOverviewMonthlyCalendarDays/);
  assert.match(pageSource, /setScheduleMonth/);
  assert.match(pageSource, /disabled=\{!canNavigateForward\}/);
  assert.match(pageSource, /canNavigateOverviewScheduleForward/);
  assert.match(pageSource, /buildOverviewTimeCalendarDays/);
  assert.match(pageSource, /getOverviewTimeEventLayout/);
  assert.doesNotMatch(pageSource, /MONTHLY_VISIBLE_TASK_COUNT|还有\{/);
  assert.match(styles, /\.scheduleViewport:fullscreen/);
  assert.match(styles, /\.taskBlock:hover,\s*\.taskBlock:focus-visible\s*\{[^}]*transform:\s*translateY\(-2px\)/s);
  assert.doesNotMatch(styles, /\.stackedTask:hover/);
  assert.match(styles, /\.taskBlock strong > span\s*\{[^}]*text-overflow:\s*ellipsis/s);
  assert.match(styles, /\.monthlyRobotGroup\s*\{[^}]*grid-template-columns:\s*120px minmax\(0, 1fr\)/s);
  assert.match(styles, /\.monthlyCalendarGrid\s*\{[^}]*grid-template-columns:\s*repeat\(7, minmax\(0, 1fr\)\)/s);
  assert.match(styles, /\.scheduleTaskItem\s*\{[^}]*grid-template-columns:\s*6px minmax\(0, 1fr\)/s);
  assert.match(styles, /\.scheduleTaskItem small\s*\{[^}]*white-space:\s*normal/s);
  assert.match(styles, /\.scheduleToolbar\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\) auto/s);
  assert.match(styles, /\.scheduleAlert\s*\{[^}]*justify-self:\s*center/s);
  assert.match(styles, /\.scheduleToolbarActions\s*\{/);
  assert.match(styles, /\.monthNavigator\s*\{/);
  assert.match(styles, /\.scheduleTaskTooltip\s*\{/);
  assert.match(styles, /\.timeCalendarHeader\s*\{/);
  assert.match(styles, /\.timeRobotGroup\s*\{[^}]*grid-template-columns:\s*120px minmax\(0, 1fr\)/s);
  assert.match(styles, /\.timeDayColumns\s*\{[^}]*repeat\(var\(--calendar-day-count\), minmax\(140px, 1fr\)\)/s);
  assert.match(styles, /\.timeCalendarBody\s*\{[^}]*height:\s*960px/s);
  assert.match(styles, /\.timeCalendarEvent\s*\{/);
  assert.match(styles, /\.scheduleTaskItem\.timeCalendarEvent\s*\{[^}]*padding:\s*4px/s);
  assert.match(styles, /\.scheduleTaskTooltip\s*\{[^}]*width:\s*max-content/s);
  assert.match(styles, /\.scheduleTaskTooltip\s*\{[^}]*max-width:\s*min\(660px, calc\(100vw - 48px\)\)/s);
  assert.doesNotMatch(styles, /\.tooltipStoreList\s*\{[^}]*max-height:/s);
  assert.doesNotMatch(styles, /\.tooltipStoreList\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(styles, /\.tooltipStoreList\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.doesNotMatch(styles, /\.monthlyMore/);
  assert.match(styles, /\.schedule\s*\{[^}]*overflow:\s*auto/s);
  assert.match(styles, /repeat\(var\(--schedule-unit-count\), var\(--schedule-unit-width\)\)/);
  assert.match(styles, /\.completionMetrics\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  assert.doesNotMatch(styles, /\.completionMetrics\s*\{[^}]*grid-template-columns:[^;}]*minmax\(0, 1fr\)[^;}]*minmax\(0, 1fr\)/s);
});

test('derives dense, irregular daily robot schedule positions from clock times', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    getScheduleBlockPosition?: (startTime: string, endTime: string) => { left: number; width: number };
    getOverviewScheduleBlockPosition?: (
      period: 'daily' | 'weekly' | 'cumulative',
      block: { startTime: string; endTime: string; startSlot?: number; endSlot?: number },
    ) => { left: number; width: number };
    getOverviewRobotSchedules?: (period: 'daily' | 'weekly' | 'cumulative') => readonly {
      name: string;
      planCount: number;
      blocks: readonly {
        startTime: string;
        endTime: string;
        startSlot?: number;
        endSlot?: number;
        stackIndex?: number;
        stackCount?: number;
        label: string;
      }[];
    }[];
    overviewRobotSchedules?: readonly {
      name: string;
      planCount: number;
      blocks: readonly { startTime: string; endTime: string }[];
    }[];
  };

  assert.equal(typeof module.getScheduleBlockPosition, 'function');
  assert.equal(typeof module.getOverviewScheduleBlockPosition, 'function');
  assert.equal(typeof module.getOverviewRobotSchedules, 'function');
  assert.deepEqual(module.getScheduleBlockPosition?.('06:00', '12:00'), { left: 25, width: 25 });
  assert.ok(module.overviewRobotSchedules);
  assert.equal(new Set(module.overviewRobotSchedules.map((robot) => robot.name)).size, module.overviewRobotSchedules.length);
  for (const robot of module.overviewRobotSchedules) {
    assert.equal(robot.planCount, robot.blocks.length);
    assert.ok(robot.planCount >= 10 && robot.planCount <= 20);
    assert.ok(robot.blocks.every((block) => block.startTime < block.endTime));
    assert.ok(robot.blocks.slice(1).every((block, index) => robot.blocks[index].endTime <= block.startTime));
    assert.ok(new Set(robot.blocks.map((block) => block.startTime.slice(3))).size >= 5);
    assert.ok(new Set(robot.blocks.map((block) => (
      Number(block.endTime.slice(0, 2)) * 60 + Number(block.endTime.slice(3))
      - Number(block.startTime.slice(0, 2)) * 60 - Number(block.startTime.slice(3))
    ))).size >= 5);
  }
  const dailySchedules = module.getOverviewRobotSchedules?.('daily');
  const weeklySchedules = module.getOverviewRobotSchedules?.('weekly');
  const cumulativeSchedules = module.getOverviewRobotSchedules?.('cumulative');
  assert.ok(dailySchedules && weeklySchedules && cumulativeSchedules);
  assert.deepEqual(
    module.getOverviewScheduleBlockPosition?.('weekly', weeklySchedules[0].blocks[0]),
    { left: 0, width: 1 / 7 * 100 },
  );
  assert.notDeepEqual(weeklySchedules, dailySchedules);
  assert.notDeepEqual(cumulativeSchedules, weeklySchedules);
  for (const robot of weeklySchedules) {
    assert.equal(robot.planCount, robot.blocks.length);
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dailyStack = robot.blocks.filter((block) => block.startSlot === dayIndex);
      assert.ok(dailyStack.length >= 3 && dailyStack.length <= 5);
      assert.ok(dailyStack.every((block) => block.endSlot === dayIndex + 1));
    }
  }
  for (const robot of cumulativeSchedules) {
    assert.equal(robot.planCount, robot.blocks.length);
    assert.ok(robot.planCount >= 40);
    assert.ok(robot.blocks.every((block) => block.startTime.startsWith('2026-08-')));
    assert.ok(robot.blocks.every((block) => / \d{2}:\d{2}:\d{2}$/.test(block.startTime)));
    assert.ok(robot.blocks.every((block) => / \d{2}:\d{2}:\d{2}$/.test(block.endTime)));
    assert.ok(robot.blocks.slice(1).every((block, index) => robot.blocks[index].startTime <= block.startTime));
    assert.ok(Array.from({ length: 31 }, (_, dayIndex) => {
      const date = `2026-08-${String(dayIndex + 1).padStart(2, '0')}`;
      return robot.blocks.filter((block) => block.startTime.startsWith(date)).length;
    }).some((count) => count > 2));
  }
  assert.deepEqual(
    [dailySchedules, weeklySchedules, cumulativeSchedules].map((schedules) => schedules.map((robot) => robot.name)),
    [
      ['Zane Zhou', 'Ethan Sun', 'Sophia Sun', 'Mia Chen'],
      ['Zane Zhou', 'Ethan Sun', 'Sophia Sun', 'Mia Chen'],
      ['Zane Zhou', 'Ethan Sun', 'Sophia Sun', 'Mia Chen'],
    ],
  );
});

test('builds the Figma run data view from the same trend facts used by the view switch', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    overviewScheduleViews?: readonly { key: string; label: string }[];
    buildOverviewRunTrendSpec?: (period: 'daily' | 'weekly' | 'cumulative') => {
      type: string;
      stack: boolean;
      data: readonly { values: readonly { date: string; metric: string; value: number }[] }[];
      xField: string;
      yField: string;
      seriesField: string;
      color: readonly string[];
      legends: { visible: boolean };
    };
  };

  assert.deepEqual(module.overviewScheduleViews, [
    { key: 'robot', label: '机器人视图' },
    { key: 'data', label: '运行数据视图' },
  ]);
  const spec = module.buildOverviewRunTrendSpec?.('weekly');
  assert.ok(spec);
  assert.equal(spec.type, 'line');
  assert.equal(spec.stack, false);
  assert.equal(spec.xField, 'date');
  assert.equal(spec.yField, 'value');
  assert.equal(spec.seriesField, 'metric');
  assert.deepEqual(spec.color, ['#4e5969', '#ff7d00', '#722ed1', '#165dff']);
  assert.equal(spec.legends.visible, false);
  assert.equal('area' in spec, false);
  assert.deepEqual(spec.data[0].values.slice(0, 4), [
    { date: '2026-08-19', metric: '总运行', value: 25180 },
    { date: '2026-08-19', metric: '取数失败次数', value: 1290 },
    { date: '2026-08-19', metric: '重试次数', value: 410 },
    { date: '2026-08-19', metric: '入库成功次数', value: 23890 },
  ]);
  const trendRows = spec.data[0].values;
  const sum = (metric: string) => trendRows
    .filter((item) => item.metric === metric)
    .reduce((total, item) => total + item.value, 0);
  assert.equal(sum('总运行'), 187960);
  assert.equal(sum('取数失败次数'), 9620);
  assert.equal(sum('重试次数'), 3132);
  assert.equal(sum('入库成功次数'), 178340);

  const dailySpec = module.buildOverviewRunTrendSpec?.('daily');
  const cumulativeSpec = module.buildOverviewRunTrendSpec?.('cumulative');
  assert.ok(dailySpec && cumulativeSpec);
  assert.equal(dailySpec.data[0].values.length, 44);
  assert.equal(dailySpec.data[0].values.at(-4)?.date, '10:00');
  assert.equal(dailySpec.data[0].values.at(-4)?.value, 28755);
  assert.equal(cumulativeSpec.data[0].values.length, 48);
  assert.equal(cumulativeSpec.data[0].values[0].date, '2025-09');
  assert.equal(cumulativeSpec.data[0].values.at(-4)?.date, '2026-08');
  assert.notDeepEqual(dailySpec.data[0].values, spec.data[0].values);
  assert.notDeepEqual(cumulativeSpec.data[0].values, spec.data[0].values);
});

test('keeps the global statistics period explicit without inventing an SLA', () => {
  assert.deepEqual(overviewPeriod, {
    startDate: '2025-08-26',
    endDate: '2026-08-25',
  });
  assert.equal('overviewSla' in overviewCopy, false);
});

test('calculates the anomaly rate from abnormal and total data tables', () => {
  assert.equal(overviewAnomalySummary.abnormalTableCount, 1400);
  assert.equal(overviewAnomalySummary.totalTableCount, 12140);
  assert.equal(getOverviewAnomalyRate(), 1400 / 12140 * 100);
});

test('groups anomaly details by the four confirmed processing stages', () => {
  assert.deepEqual(overviewAnomalyGroups.map((item) => item.label), [
    '登录异常',
    '取数执行异常',
    '入库异常',
    '入库校验异常',
  ]);
  assert.ok(overviewAnomalyGroups.every((item) => item.rows.length === 20));
  const anomalyRows = overviewAnomalyGroups.flatMap((item) => item.rows);
  assert.equal(anomalyRows.length, 80);
  assert.equal(new Set(anomalyRows.map((row) => row.runRecordKey)).size, 80);
  assert.ok(overviewAnomalyGroups.every((item) => new Set(item.rows.map((row) => row.storeName)).size === 20));
  assert.ok(new Set(anomalyRows.map((row) => row.storeName)).size > 20);
  assert.ok(anomalyRows.every((row) => {
    const event = row as typeof row & { platform?: string; planName?: string; occurredAt?: string };
    return Boolean(event.platform && event.planName && event.occurredAt);
  }));
  assert.ok(overviewAnomalyGroups.every((group) => {
    const counts = group.rows.reduce<Record<string, number>>((result, row) => {
      result[row.issueType] = (result[row.issueType] ?? 0) + 1;
      return result;
    }, {});
    return Object.values(counts).some((count) => count !== 5);
  }));

  const allowedIssueTypes = {
    login: ['当前账号密码不匹配', '账号登录出现短信验证码', '检测到图片验证码未通过', '当前账号模块权限未开通'],
    collection: ['平台数据暂未更新', '平台报表生成-等待超时', '平台页面可能改版', 'Chrome类型元素查找失败'],
    ingestion: ['数据库连接超时-请您稍后重试入库', '存在映射关系不存在的字段-请您检查当前表是否有字段变动', 'sql执行插入异常-请联系技术支持', '检查未开启自动建表-请您检查取数宝配置'],
    validation: ['结构异常', '类型异常', '行数异常', '完整性异常'],
  } as const;
  assert.ok(overviewAnomalyGroups.every((item) => item.rows.every((row) => (
    (allowedIssueTypes[item.key] as readonly string[]).includes(row.issueType)
  ))));
  assert.ok(overviewAnomalyGroups.every((item) => item.rows.every((row) => (
    row.storeName && row.issueType && row.reason && row.runRecordKey
      && !('impactRows' in row) && !('sla' in row)
  ))));
});

test('keeps overview context when drilling into run records', () => {
  const group = overviewAnomalyGroups[1];
  const row = group.rows[0];

  assert.deepEqual(buildOverviewRunFilters(group, row), {
    startDate: '2025-08-26',
    endDate: '2026-08-25',
    issueType: 'collection',
    issueLabel: '取数执行异常',
    planName: row.planName,
    storeName: row.storeName,
    targetRecordKey: row.runRecordKey,
  });
});

test('requires meaningful feedback content before submission', () => {
  assert.equal(validateFeedback('   '), '请输入反馈内容');
  assert.equal(validateFeedback('希望增加订单字段筛选'), null);
});

test('connects the overview annotation list and drawer to the requirement shell', async () => {
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const activeAnnotationsSource = appSource.slice(
    appSource.indexOf('const activeAnnotations ='),
    appSource.indexOf('const updateRequirementUrl ='),
  );
  const annotationEntryStart = appSource.indexOf('className="annotation-entry"');
  const annotationEntrySource = appSource.slice(
    annotationEntryStart,
    appSource.indexOf('</Button>', annotationEntryStart),
  );
  const overviewDrawerStart = appSource.indexOf("{activeRequirement === 'qsbOverview' ? (");
  const overviewDrawerSource = appSource.slice(
    overviewDrawerStart,
    appSource.indexOf(") : activeRequirement === 'autoRetryOptimization' ? (", overviewDrawerStart),
  );

  assert.match(appSource, /qsbOverviewAnnotations/);
  assert.match(appSource, /QsbOverviewAnnotationDrawer/);
  assert.match(activeAnnotationsSource, /const activeAnnotations = activeRequirement === 'qsbOverview'\s*\? qsbOverviewAnnotations\s*:\s*activeRequirement === 'messageCenter'/s);
  assert.equal(qsbOverviewAnnotations.length, 10);
  assert.match(annotationEntrySource, /交互标注 \{activeAnnotations\.length\}/);
  assert.match(overviewDrawerSource, /<QsbOverviewAnnotationDrawer\s+visible=\{annotationDrawerOpen\}\s+onClose=\{\(\) => setAnnotationDrawerOpen\(false\)\}\s+onLocate=\{handleLocateAnnotation\}\s*\/>/s);
  assert.match(appSource, /\{activeRequirement === 'qsbOverview' \? \([\s\S]*?\) : activeRequirement === 'autoRetryOptimization' \? \([\s\S]*?\) : activeRequirement === 'etlDataMonitoringOptimization' \? \([\s\S]*?\) : \(\s*<MessageCenterAnnotationDrawer/s);
});
