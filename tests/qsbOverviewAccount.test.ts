import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as account from '../src/pages/qsbOverview/overviewContent.ts';
import { collectionErrorCodes, ingestionErrorCodes, resolveOverviewError } from '../src/pages/qsbOverview/errorCodeMappings.ts';
import { applyWorkRetryResult, buildOverviewWorkRecord, getRetryRemovalSeconds, removeExpiredWorkRetries, retryRemovalDelayMs } from '../src/pages/qsbOverview/workRetry.ts';

test('calendar auxiliary text uses Arco 12px token and all views display the full robot count', async () => {
  const styles = readFileSync(new URL('../src/pages/qsbOverview/index.module.less', import.meta.url), 'utf8');
  assert.doesNotMatch(styles, /font-size:\s*11px/);
  for (const selector of ['.timeCalendarHeader > small', '.hourAxis time', '.scheduleTaskItem small']) {
    const block = styles.slice(styles.indexOf(`${selector} {`)).split('}')[0];
    assert.match(block, /font-size: @font-size-body-1/);
  }
  const page = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  assert.equal(page.match(/机器人（\{robotCount\}）/g)?.length, 2);
  assert.equal(page.match(/robotCount = robots.length/g)?.length, 2);
  const preview = readFileSync(new URL('../src/components/qsbOverviewAnnotations/RobotScheduleExample.tsx', import.meta.url), 'utf8');
  assert.equal(preview.match(/robots=\{robots.slice\(0, 1\)\} robotCount=\{robots.length\}/g)?.length, 2);
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  assert.match(JSON.stringify(qsbOverviewAnnotations), /机器人（0）/);
  assert.match(JSON.stringify(qsbOverviewAnnotations), /Arco 12px/);
});

test('all overview comparisons use relative YoY percentages', async () => {
  for (const period of Object.values(account.overviewRunMetricsByPeriod)) {
    assert.equal(period.comparisonLabel, '同比');
    assert.equal(period.comparisonBasis, 'year-over-year');
    for (const metric of period.metrics) assert.equal(metric.change, (period.current[metric.key] / period.previous[metric.key] - 1) * 100);
  }
  assert.ok(Number.isNaN(account.calculatePercentageChange(5, 0)));
  assert.ok(Number.isNaN(account.calculatePercentageChange(5, NaN)));
  assert.equal(account.calculatePercentageChange(90, 80), 12.5);
  assert.equal(account.calculatePercentageChange(0, 80), -100);
  const summary = account.overviewAnomalySummary;
  const expectedAnomalyChange = (summary.abnormalTableCount / summary.totalTableCount / (summary.yearAgoAbnormalTableCount / summary.yearAgoTotalTableCount) - 1) * 100;
  assert.ok(Math.abs(account.buildOverviewViewModel('daily').anomalyChange - expectedAnomalyChange) < 1e-10);
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const page = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const prd = readFileSync(new URL('../src/pages/qsbOverviewPrd/index.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(JSON.stringify(qsbOverviewAnnotations) + page + prd, /比昨日同时段|异常率昨日同时段|较上期|较昨日|较上周|上一周期/);
  const indicator = readFileSync(new URL('../src/pages/qsbOverview/TrendIndicator.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page + prd + indicator + JSON.stringify(qsbOverviewAnnotations), /百分点/);
  assert.match(indicator, /formattedValue\}%/);
  assert.match(prd, /去年同期/);
  assert.match(prd, /相对增长率.*单位“%”/);
});

test('robot annotation preview renders shared calendars instead of screenshots without duplicate markers', async () => {
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const note = qsbOverviewAnnotations.find((item) => item.noteId === 'QSB-2.3');
  assert.ok(note?.ruleItems?.some((item) => item.example === 'robot-schedule'));
  const source = readFileSync(new URL('../src/components/qsbOverviewAnnotations/RobotScheduleExample.tsx', import.meta.url), 'utf8');
  assert.match(source, /<MonthlyRobotCalendar/);
  assert.match(source, /<TimeRobotCalendar/);
  assert.doesNotMatch(source, /<img|<Image|\.png/);
  assert.equal(source.match(/annotated=\{false\}/g)?.length, 2);
  assert.match(source, /overviewPeriodOptions\.map/);
  assert.match(source, /disabled=\{offset === 0\}/);
  assert.match(source, /requestFullscreen/);
  assert.match(source, /放大查看/);
});

test('trend annotations show real visual examples and remove obsolete empty and failure states', async () => {
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const note = qsbOverviewAnnotations.find((item) => item.noteId === 'QSB-2.5');
  assert.equal(note?.recoveryItems, undefined);
  const text = JSON.stringify(note);
  assert.doesNotMatch(text, /趋势加载失败|不补 0|不得补 0|不连线|时间桶/);
  assert.match(text, /补 0/);
  for (const key of ['chart', 'legend-total', 'legend-failed', 'legend-retry', 'legend-success', 'loading', 'tooltip', 'boundary']) {
    assert.ok(text.includes(`trend-${key}`));
  }
  const anomaly = qsbOverviewAnnotations.find((item) => item.noteId === 'QSB-3.2');
  const preview = anomaly?.exceptionItems?.flatMap((item) => item.previews ?? []).find((item) => item.label === '异常明细加载失败');
  assert.deepEqual(preview, { type: 'empty-state', label: '异常明细加载失败', status: 'error', textColor: '#4e5969', actionLabel: '重试' });
  assert.equal(anomaly?.exceptionItems?.flatMap((item) => item.previews ?? []).find((item) => item.label === '暂无异常记录')?.textColor, '#4e5969');
  const example = readFileSync(new URL('../src/components/qsbOverviewAnnotations/RunTrendExamples.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(example, /<Image|trend-screenshot/);
  assert.match(example, /运行数据趋势实时预览/);
  assert.equal(account.buildOverviewRunTrendSpec('weekly').axes[1].title?.visible, false);
});

test('submission results preserve original anomaly facts and other Work rows', () => {
  const rows = account.overviewAnomalyGroups[0].rows;
  for (const kind of ['submission-failed', 'accepted'] as const) {
    const next = applyWorkRetryResult(rows, rows[0].workId, { kind });
    assert.deepEqual(next, rows);
    assert.equal(next[0], rows[0]);
  }
});

test('failed execution refreshes only the matching Work and detail points to its latest run', () => {
  const group = account.overviewAnomalyGroups[0];
  const first = group.rows[0];
  const latest = { runRecordKey: 'latest-run-42', occurredAt: '2026-08-25T10:05:00+08:00', issueType: '最新异常', errorCode: '9999', reason: '最新返回原因' };
  const next = applyWorkRetryResult(group.rows, first.workId, { kind: 'failed', latest });
  assert.deepEqual(next[0], { ...first, ...latest });
  assert.deepEqual(next.slice(1), group.rows.slice(1));
  const detail = buildOverviewWorkRecord(group, next[0]);
  assert.equal(detail.workId, first.workId);
  assert.equal(detail.key, latest.runRecordKey);
  assert.equal(detail.issueReason, latest.reason);
  assert.equal(detail.storeName, first.storeName);
  assert.equal(detail.planName, first.planName);
  assert.equal(group.rows[0], first);
});

test('successful execution retains the anomaly until its six-second deadline', () => {
  const rows = account.overviewAnomalyGroups[0].rows;
  const record = { ...buildOverviewWorkRecord(account.overviewAnomalyGroups[0], rows[0]), key: 'successful-retry-42' };
  assert.deepEqual(applyWorkRetryResult(rows, rows[0].workId, { kind: 'succeeded', record }), rows);
  const deadlines = { [rows[0].workId]: 1000 + retryRemovalDelayMs, [rows[1].workId]: 3000 + retryRemovalDelayMs };
  assert.equal(getRetryRemovalSeconds(7000, 1000), 6);
  assert.equal(getRetryRemovalSeconds(7000, 2000), 5);
  assert.equal(getRetryRemovalSeconds(7000, 6999), 1);
  assert.equal(getRetryRemovalSeconds(7000, 7000), 0);
  assert.deepEqual(removeExpiredWorkRetries(rows, deadlines, 6999), rows);
  assert.deepEqual(removeExpiredWorkRetries(rows, deadlines, 7000), rows.slice(1));
  assert.deepEqual(removeExpiredWorkRetries(rows, deadlines, 9500), rows.slice(2));
  assert.equal(record.key, 'successful-retry-42');
});

test('annotations share actual ellipsis, disabled, loading and feedback components with the page', async () => {
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const text = JSON.stringify(qsbOverviewAnnotations.find((item) => item.noteId === 'QSB-3.2'));
  for (const key of ['ellipsis', 'view-disabled', 'retry-loading', 'retry-feedback', 'retry-data']) assert.ok(text.includes(`anomaly-${key}`));
  assert.match(text, /176px/);
  assert.match(text, /152px/);
  assert.match(text, /不按固定字数/);
  assert.match(text, /点击重试只提交当前异常记录的 Work/);
  assert.doesNotMatch(text, /按参数筛选列表|携带日期/);
  const page = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  assert.match(page, /<OverviewAnomalyRecord/);
  assert.match(page, /<RunRecordDetailDrawer/);
  assert.doesNotMatch(page, /onViewRuns/);
  const shared = readFileSync(new URL('../src/pages/qsbOverview/AnomalyElements.tsx', import.meta.url), 'utf8');
  assert.match(shared, /scrollWidth > element.clientWidth/);
  assert.match(shared, /disabled=\{!recordKey\}/);
  assert.match(shared, /loading=\{state === 'submitting'\}/);
  assert.match(shared, /busy.current.has\(row.workId\)/);
});

test('trend fills missing times with zero only for series with data, keeping empty axes and stable colors', () => {
  const empty = account.buildOverviewRunTrendSpec('weekly', []);
  assert.deepEqual(empty.data[0].values, []);
  assert.equal(empty.axes[0].domain?.length, 7);
  const partial = account.buildOverviewRunTrendSpec('weekly', [
    { date: '2026-08-19', success: 0, failed: null },
    { date: '2026-08-21', success: 10 },
  ]);
  assert.equal(partial.data[0].values.length, 7);
  assert.deepEqual(partial.data[0].values.slice(0, 3).map((item) => item.value), [0, 0, 10]);
  assert.ok(partial.data[0].values.every((item) => item.metric === '入库成功次数'));
  assert.deepEqual(partial.data[0].fields.metric.domain, ['总运行', '取数失败次数', '重试次数', '入库成功次数']);
  assert.equal(account.formatOverviewTrendValue(25180), '25,180 次');
  assert.equal(account.formatOverviewTrendValue(0), '0 次');
});

test('schedule annotations use product wording and share overload visuals', async () => {
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const notes = JSON.stringify(qsbOverviewAnnotations.filter((item) => ['QSB-2.2', 'QSB-2.3'].includes(item.noteId)));
  assert.doesNotMatch(notes, /aria-pressed|fullscreen|loading/i);
  assert.match(notes, /robot-overload/);
  assert.match(notes, /任何时候只选中一个视图/);
  assert.match(notes, /无法进入全屏/);
  const preview = readFileSync(new URL('../src/components/qsbOverviewAnnotations/AccountExamples.tsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  for (const component of ['RobotOverloadWarning', 'RobotOverloadBadge']) {
    assert.ok(preview.includes(`<${component} />`));
    assert.ok(page.includes(`<${component} />`));
  }
  const warning = readFileSync(new URL('../src/pages/qsbOverview/RobotOverloadWarning.tsx', import.meta.url), 'utf8');
  assert.match(warning, /role="status"><i \/>当机器人超出运行上限时/);
  // Accessibility attributes belong to the implementation, not the product copy.
  assert.match(page, /aria-pressed=/);
});

test('plan-card location scrolls both axes and nested ancestors without changing period', () => {
  const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const branch = source.slice(source.indexOf("if (activeRequirement === 'qsbOverview' && annotation.noteId === 'QSB-2.4')"), source.indexOf('window.setTimeout(() => highlightAnnotationTargets(markers)'));
  assert.match(branch, /scrollIntoView\(\{ behavior: 'smooth', block: 'center', inline: 'center' \}\)/);
  assert.doesNotMatch(branch, /setPeriod|setScheduleMonth|setScheduleAnchorDate/);
});

test('error types follow the Notion detail tables and separate collection from ingestion', () => {
  assert.equal(Object.keys(collectionErrorCodes).length, 31);
  assert.equal(Object.keys(ingestionErrorCodes).length, 13);
  assert.equal(resolveOverviewError('login', '1103').issueType, '当前账号密码不匹配');
  assert.equal(resolveOverviewError('collection', '1001').issueType, '短信接收器获取手机验证码失败');
  assert.equal(resolveOverviewError('ingestion', '1001').issueType, '数据库连接超时-请您稍后重试入库');
  assert.equal(resolveOverviewError('collection', '2001').issueType, '平台数据暂未更新');
  assert.equal(resolveOverviewError('ingestion', '2001').issueType, '自定义数据处理异常-请检查数据文件字段是否变动');
  assert.equal(resolveOverviewError('collection', '1401').issueType, '浏览器RPA插件是否安装启用');
  assert.equal(resolveOverviewError('collection', '1501').issueType, '当前类目选择失败-请检查类目是否填写正确');
});

test('error descriptions preserve runtime detail without inventing undocumented mappings', () => {
  assert.equal(resolveOverviewError('login', '1103', '本次平台返回的详情').reason, '本次平台返回的详情');
  assert.equal(resolveOverviewError('login', '1103').reason, '账号密码平台校验不匹配-请您检查当前账密信息是否变动');
  assert.equal(resolveOverviewError('collection', '3002').reason, '--');
  assert.deepEqual(resolveOverviewError('collection', '9999', '原始异常'), { errorCode: '9999', issueType: '错误码 9999', reason: '原始异常' });
  assert.equal(resolveOverviewError('validation', '1001').issueType, '错误码 1001');
  for (const group of account.overviewAnomalyGroups.filter((group) => group.key !== 'validation')) {
    for (const row of group.rows) {
      assert.ok(row.errorCode);
      assert.equal(row.issueType, resolveOverviewError(group.key, row.errorCode!).issueType);
    }
  }
});

test('service type is optional, self-service green and fully-managed purple', () => {
  assert.deepEqual(account.getOverviewServicePresentation('自用版'), { label: '自用版', color: 'green' });
  assert.deepEqual(account.getOverviewServicePresentation('全托版'), { label: '全托版', color: 'purple' });
  for (const value of [null, undefined, '', 'unknown']) {
    assert.equal(account.getOverviewServicePresentation(value), null);
  }
});

test('authorization always offers renew or upgrade, without an internal payment route', () => {
  assert.equal(account.getOverviewAccountAction(true), '续期');
  assert.equal(account.getOverviewAccountAction(false), '升级');
});

test('never-purchased tenants have an upgrade action without any expiry date', () => {
  assert.deepEqual(account.getOverviewAuthorizationPresentation({ kind: 'never-purchased' }), { text: '尚未购买', action: '升级' });
  assert.deepEqual(account.getOverviewAuthorizationPresentation({ kind: 'dated', expiresAt: '2027-08-21', renewable: true }), { text: '到期时间：2027-08-21', action: '续期' });
  assert.deepEqual(account.getOverviewAuthorizationPresentation({ kind: 'dated', expiresAt: '2027-08-21', renewable: false }), { text: '到期时间：2027-08-21', action: '升级' });
  assert.deepEqual(account.getOverviewAuthorizationPresentation({ kind: 'permanent', renewable: false }), { text: '到期时间：长期有效', action: '升级' });
});

test('stores have no purchased quota and asset notes use product language', async () => {
  const stores = account.overviewAssets.find((item) => item.key === 'stores');
  assert.equal(stores?.used, 155);
  assert.equal('total' in stores!, false);
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const assets = JSON.stringify(qsbOverviewAnnotations.find((item) => item.noteId === 'QSB-1.2'));
  assert.doesNotMatch(assets, /used|total|已购买店铺额度/);
  assert.match(assets, /asset-loading/);
});

test('annotation examples include complete skeletons and real announcement screenshots', () => {
  const component = readFileSync(new URL('../src/pages/qsbOverview/OverviewAccountContent.tsx', import.meta.url), 'utf8');
  for (const slot of ['头像骨架', '租户名称骨架', '服务类型骨架', '累计天数骨架', '天数单位骨架', '累计已节省人力文案骨架', '人力趋势图骨架', '到期信息与操作骨架']) assert.ok(component.includes(slot), slot);
  const examples = readFileSync(new URL('../src/components/qsbOverviewAnnotations/AccountExamples.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(examples, /保存示例|取消编辑|保存后的概览效果/);
  for (const file of ['announcement-source', 'announcement-scope', 'announcement-message-box', 'announcement-empty-box', 'announcement-error-box']) {
    const bytes = readFileSync(new URL(`../public/annotation-examples/qsb-overview/${file}.png`, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  }
});

test('announcement failures and empty results stay inside the message box', async () => {
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const notes = JSON.stringify(qsbOverviewAnnotations.find((item) => item.noteId === 'QSB-1.3'));
  assert.match(notes, /暂无公告消息/);
  assert.match(notes, /右侧内容区显示“公告加载失败”缺省页/);
  assert.doesNotMatch(notes, /页面顶部显示错误提示|4秒后消失/);
  const modal = readFileSync(new URL('../src/components/messageCenter/index.tsx', import.meta.url), 'utf8');
  assert.match(modal, /announcementLoadState === 'error'/);
  assert.match(modal, /onClick=\{onRetryAnnouncements\}>重试/);
  assert.match(modal, /announcementLoadState === 'ready' && hasTargetAnnouncement/);
  assert.match(modal, /if \(!sortedAnnouncementMessages.some\(\(item\) => item.id === initialAnnouncementId\)\) return \[\]/);
  const page = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /showAnnouncementOpenFailure/);
  const metrics = JSON.stringify(qsbOverviewAnnotations.find((item) => item.noteId === 'QSB-2.1'));
  assert.doesNotMatch(metrics, /planRuns|ingestSuccess|collectFailure|Arco Alert/);
});

test('annotations share account visuals and do not invent field-level permissions', async () => {
  const { qsbOverviewAnnotations } = await import('../src/components/qsbOverviewAnnotations/data.ts');
  const notes = JSON.stringify(qsbOverviewAnnotations);
  assert.doesNotMatch(notes, /无权限查看|无查看权限|无处置权限|无权限序列|无到期值/);
  const personal = JSON.stringify(qsbOverviewAnnotations.find((item) => item.noteId === 'QSB-1.1'));
  for (const text of ['avatar', '租户详情', '非必填', '紫色', '升级', '外部会话 URL 地址：@千秋', '待确认']) {
    assert.ok(personal.includes(text), text);
  }
  for (const example of ['account-loading', 'account-long-name', 'account-formula', 'account-service-config']) {
    assert.ok(personal.includes(example), example);
  }
  const page = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const previews = readFileSync(new URL('../src/components/qsbOverviewAnnotations/AccountExamples.tsx', import.meta.url), 'utf8');
  assert.match(page, /<OverviewAccountContent/);
  assert.match(previews, /<OverviewAccountContent/);
});
