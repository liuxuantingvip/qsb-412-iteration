import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as overviewContentModule from '../src/pages/qsbOverview/overviewContent.ts';
import {
  buildOverviewRunFilters,
  getOverviewAnomalyRate,
  getOverviewLayout,
  overviewAnomalyGroups,
  overviewAnomalySummary,
  overviewCopy,
  overviewPeriod,
  overviewSchedule,
  validateFeedback,
} from '../src/pages/qsbOverview/overviewContent.ts';

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

test('builds animated data overview charts without overriding the Qushubao theme', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    buildDataOverviewDonutSpec?: (values: readonly { type: string; value: number }[]) => Record<string, unknown>;
    buildDataCompletionSpec?: (value: number) => Record<string, unknown>;
  };

  assert.equal(typeof module.buildDataOverviewDonutSpec, 'function');
  assert.equal(typeof module.buildDataCompletionSpec, 'function');

  const donut = module.buildDataOverviewDonutSpec?.([
    { type: '已完成', value: 14 },
    { type: '重试中', value: 3 },
  ]);
  assert.ok(donut);
  assert.equal(donut.type, 'pie');
  assert.equal(donut.padAngle, 2);
  assert.equal('color' in donut, false);
  assert.equal('animation' in donut, false);

  const progress = module.buildDataCompletionSpec?.(98);
  assert.ok(progress);
  assert.equal(progress.type, 'linearProgress');
  assert.equal('color' in progress, false);
  assert.equal('animation' in progress, false);
  assert.deepEqual(progress.data, [{ id: 'completion', values: [{ type: '完成率', value: 98 }] }]);
});

test('provides deterministic mock snapshots for the animated data overview', () => {
  const snapshots = (overviewContentModule as typeof overviewContentModule & {
    overviewDataSnapshots?: readonly {
      completionRate: number;
      completedSourceCount: number;
      totalSourceCount: number;
      storeDelivery: { completed: number; retrying: number; pending: number };
      platformDelivered: number;
      platformTotal: number;
      platforms?: readonly { name: string; delivered: number; total: number }[];
    }[];
  }).overviewDataSnapshots;

  assert.ok(snapshots);
  assert.equal(snapshots.length, 4);
  assert.deepEqual(snapshots.at(-1), {
    completionRate: 98,
    completedSourceCount: 12140,
    totalSourceCount: 12388,
    storeDelivery: { completed: 14, retrying: 3, pending: 10 },
    platformDelivered: 620,
    platformTotal: 1000,
    platforms: [
      { name: '淘宝', delivered: 151, total: 220 },
      { name: '京东', delivered: 117, total: 180 },
      { name: '抖音', delivered: 94, total: 150 },
      { name: '唯品会', delivered: 58, total: 100 },
      { name: '快手', delivered: 65, total: 110 },
      { name: '得物', delivered: 46, total: 80 },
      { name: '有赞', delivered: 42, total: 70 },
      { name: '聚水潭', delivered: 47, total: 90 },
    ],
  });
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
    overviewAssets?: readonly { key: string; used: number; total: number }[];
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
    { key: 'stores', used: 155, total: 200 },
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

test('uses the Figma overview structure with a left account rail and three main sections', () => {
  const layout = getOverviewLayout();

  assert.equal(overviewCopy.pageTitle, '概况');
  assert.equal(layout.accountPanel.placement, 'left-rail');
  assert.equal(layout.accountPanel.width, 301);
  assert.equal(layout.assetPanel.placement, 'left-rail');
  assert.equal(layout.assetPanel.display, 'grid-2x2');
  assert.deepEqual(layout.assetPanel.items, ['stores', 'connectors', 'cloudDesktops', 'robots']);
  assert.deepEqual(layout.leftRail, ['accountValue', 'assets', 'announcements', 'resources']);
  assert.deepEqual(layout.mainSections, ['runTrend', 'dataOverview', 'dataAnomaly']);
});

test('uses the Figma copy for the three-step overview narrative', () => {
  const layout = getOverviewLayout();

  assert.equal(overviewCopy.trendTitle, '运行趋势');
  assert.equal(overviewCopy.dataOverviewTitle, '数据概况');
  assert.equal(overviewCopy.anomalyTitle, '数据异常率');
  assert.deepEqual(layout.runTrend.metrics, ['planRuns', 'ingestions', 'rows', 'failedRuns']);
  assert.deepEqual(layout.runTrend.periods, ['daily', 'weekly', 'cumulative']);
});

test('provides ten unique announcements in descending ISO date order', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
    overviewAnnouncements?: readonly { title: string; publishedAt: string }[];
    formatOverviewAnnouncementDate?: (publishedAt: string) => string;
  };
  assert.ok(module.overviewAnnouncements);
  assert.equal(typeof module.formatOverviewAnnouncementDate, 'function');
  const overviewAnnouncements = module.overviewAnnouncements;
  const formatOverviewAnnouncementDate = module.formatOverviewAnnouncementDate;

  assert.equal(overviewAnnouncements.length, 10);
  assert.equal(new Set(overviewAnnouncements.map((item) => item.title)).size, 10);
  assert.ok(overviewAnnouncements.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt)));
  assert.deepEqual(
    overviewAnnouncements.map((item) => item.publishedAt),
    ['2026-08-25', '2026-08-22', '2026-08-19', '2026-08-15', '2026-08-11', '2026-08-07', '2026-08-02', '2026-07-28', '2026-07-21', '2026-07-15'],
  );
  assert.equal(formatOverviewAnnouncementDate?.('2026-08-25'), '08/25');
});

test('provides nested store and plan details for pending deliveries', () => {
  const pendingDetails = (overviewContentModule as typeof overviewContentModule & {
    overviewPendingStoreDetails?: readonly {
      storeName: string;
      plans: readonly { planName: string; errorDetail: string }[];
    }[];
  }).overviewPendingStoreDetails;

  assert.ok(pendingDetails);
  assert.ok(pendingDetails.length >= 2);
  assert.ok(pendingDetails.every((store) => store.storeName && store.plans.length > 0));
  assert.ok(pendingDetails.every((store) => store.plans.every((plan) => (
    plan.planName && plan.errorDetail
  ))));
});

test('keeps overview delivery legends readable and removes the announcement more action', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/pages/qsbOverview/index.module.less', import.meta.url), 'utf8');

  assert.doesNotMatch(pageSource, />更多<\/button>/);
  assert.match(pageSource, /overviewPendingStoreDetails\.map/);
  assert.match(styles, /\.compactLegend span, \.platformLegend span \{[^}]*font-size:\s*14px/s);
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
  assert.deepEqual(
    getOverviewScheduleAxis?.('weekly').labels,
    Array.from({ length: 31 }, (_, index) => `08/${String(index + 1).padStart(2, '0')}`),
  );
  assert.deepEqual(getOverviewScheduleAxis?.('cumulative').labels, ['09月', '10月', '11月', '12月', '01月', '02月', '03月', '04月', '05月', '06月', '07月', '08月']);
  assert.ok((getOverviewScheduleAxis?.('weekly').unitWidth ?? 0) > (getOverviewScheduleAxis?.('daily').unitWidth ?? 0));
});

test('builds a full-month weekly calendar with dynamic robot rows', () => {
  const module = overviewContentModule as typeof overviewContentModule & {
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
    buildWeeklyRobotLayout?: (robot: {
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
    }) => {
      rowHeight: number;
      blocks: readonly {
        top: number;
        conflictIndex: number;
        conflictCount: number;
      }[];
    };
  };

  assert.equal(typeof module.buildWeeklyRobotLayout, 'function');
  const schedules = module.getOverviewRobotSchedules?.('weekly');
  assert.ok(schedules);

  for (const robot of schedules) {
    for (let dayIndex = 0; dayIndex < 31; dayIndex += 1) {
      const tasks = robot.blocks.filter((block) => block.startSlot === dayIndex);
      assert.ok(tasks.length >= 10 && tasks.length <= 20);
      assert.ok(tasks.every((block) => block.endSlot === dayIndex + 1));
    }

    const layout = module.buildWeeklyRobotLayout?.(robot);
    assert.ok(layout && layout.rowHeight > 64);
    assert.equal(layout.blocks.length, robot.blocks.length);
    assert.ok(layout.blocks.some((block) => block.conflictCount > 1));
    assert.ok(layout.blocks.every((block) => block.top >= 8));
  }
});

test('supports toggling and fluid sizing in the in-app fullscreen schedule', () => {
  const pageSource = readFileSync(new URL('../src/pages/qsbOverview/index.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/pages/qsbOverview/index.module.less', import.meta.url), 'utf8');

  assert.match(pageSource, /if \(isFullscreen\)/);
  assert.match(pageSource, /styles\.scheduleViewportFullscreen/);
  assert.match(pageSource, /--schedule-row-count/);
  assert.match(styles, /\.scheduleViewportFullscreen/);
  assert.match(styles, /grid-template-rows:\s*40px repeat\(var\(--schedule-row-count\), minmax\(64px, 1fr\)\)/);
  assert.match(styles, /repeat\(var\(--schedule-unit-count\), minmax\(0, 1fr\)\)/);
});

test('derives non-overlapping robot schedule positions from clock times', () => {
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
    assert.ok(robot.blocks.every((block) => block.startTime < block.endTime));
    assert.ok(robot.blocks.slice(1).every((block, index) => robot.blocks[index].endTime <= block.startTime));
  }
  const dailySchedules = module.getOverviewRobotSchedules?.('daily');
  const weeklySchedules = module.getOverviewRobotSchedules?.('weekly');
  const cumulativeSchedules = module.getOverviewRobotSchedules?.('cumulative');
  assert.ok(dailySchedules && weeklySchedules && cumulativeSchedules);
  assert.deepEqual(
    module.getOverviewScheduleBlockPosition?.('weekly', weeklySchedules[0].blocks[0]),
    { left: 0, width: 1 / 31 * 100 },
  );
  assert.deepEqual(
    module.getOverviewScheduleBlockPosition?.('cumulative', cumulativeSchedules[0].blocks[0]),
    { left: 0, width: 1 / 12 * 100 },
  );
  assert.notDeepEqual(weeklySchedules, dailySchedules);
  assert.notDeepEqual(cumulativeSchedules, weeklySchedules);
  for (const robot of weeklySchedules) {
    assert.equal(robot.planCount, robot.blocks.length);
    for (let dayIndex = 0; dayIndex < 31; dayIndex += 1) {
      const dailyStack = robot.blocks.filter((block) => block.startSlot === dayIndex);
      assert.ok(dailyStack.length >= 10 && dailyStack.length <= 20);
      assert.ok(dailyStack.every((block) => block.endSlot === dayIndex + 1));
    }
  }
  for (const robot of cumulativeSchedules) {
    assert.equal(robot.planCount, 36);
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const monthlyStack = robot.blocks.filter((block) => block.startSlot === monthIndex);
      assert.equal(monthlyStack.length, 3);
      assert.deepEqual(monthlyStack.map((block) => block.stackIndex), [0, 1, 2]);
      assert.ok(monthlyStack.every((block) => block.endSlot === monthIndex + 1));
      assert.ok(monthlyStack.every((block) => block.stackCount === 3));
    }
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
    { key: 'data', label: '运行数据视图' },
    { key: 'robot', label: '机器人视图' },
  ]);
  const spec = module.buildOverviewRunTrendSpec?.('weekly');
  assert.ok(spec);
  assert.equal(spec.type, 'area');
  assert.equal(spec.stack, false);
  assert.equal(spec.xField, 'date');
  assert.equal(spec.yField, 'value');
  assert.equal(spec.seriesField, 'metric');
  assert.deepEqual(spec.color, ['#4e5969', '#f53f3f', '#165dff']);
  assert.equal(spec.legends.visible, false);
  assert.deepEqual(spec.data[0].values.slice(0, 3), [
    { date: '2026-08-19', metric: '总运行', value: 25180 },
    { date: '2026-08-19', metric: '取数失败次数', value: 1290 },
    { date: '2026-08-19', metric: '入库成功次数', value: 23890 },
  ]);
  const trendRows = spec.data[0].values;
  const sum = (metric: string) => trendRows
    .filter((item) => item.metric === metric)
    .reduce((total, item) => total + item.value, 0);
  assert.equal(sum('总运行'), 187960);
  assert.equal(sum('取数失败次数'), 9620);
  assert.equal(sum('入库成功次数'), 178340);

  const dailySpec = module.buildOverviewRunTrendSpec?.('daily');
  const cumulativeSpec = module.buildOverviewRunTrendSpec?.('cumulative');
  assert.ok(dailySpec && cumulativeSpec);
  assert.equal(dailySpec.data[0].values.length, 33);
  assert.equal(dailySpec.data[0].values.at(-3)?.date, '10:00');
  assert.equal(dailySpec.data[0].values.at(-3)?.value, 28755);
  assert.equal(cumulativeSpec.data[0].values.length, 36);
  assert.equal(cumulativeSpec.data[0].values[0].date, '2025-09');
  assert.equal(cumulativeSpec.data[0].values.at(-3)?.date, '2026-08');
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
    login: ['账号异常', '凭证失效', '验证异常', '权限异常'],
    collection: ['页面异常', '下载异常', '采集异常', '任务异常'],
    ingestion: ['连接异常', '映射异常', '写入异常', '分区异常'],
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
