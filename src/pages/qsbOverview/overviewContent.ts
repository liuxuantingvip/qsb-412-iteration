export const overviewCopy = {
  pageTitle: '概况',
  primaryMetricTitle: '累计节省人力',
  trendTitle: '运行趋势',
  dataOverviewTitle: '数据概况',
  anomalyTitle: '数据异常率',
  showOutcomeHeading: true,
  showIngestionSuccessRateInSummary: false,
} as const;

export const calculateRate = (numerator: number, denominator: number) => numerator / denominator * 100;

export const calculatePercentageChange = (current: number, previous: number) => (current / previous - 1) * 100;

export const overviewDataClock = {
  asOf: '2026-08-25T10:00:00+08:00',
  daily: { startDate: '2026-08-25', endDate: '2026-08-25' },
  weekly: { startDate: '2026-08-19', endDate: '2026-08-25' },
  cumulative: { startDate: '2025-08-26', endDate: '2026-08-25' },
} as const;

export const overviewPeriod = overviewDataClock.cumulative;

export const overviewAccountSummary = {
  savedMinutes: 74640,
  workdayMinutes: 480,
  savedLaborDays: 74640 / 480,
  expiresAt: '2027-08-21',
  sparklineValues: [10.5, 21.8, 34.2, 48.6, 63.7, 79.1, 94.8, 110.6, 126.3, 139.4, 149.2, 155.5],
} as const;

export const overviewAssets = [
  { key: 'stores', used: 155, total: 200 },
  { key: 'connectors', used: 125, total: 200 },
  { key: 'cloud', used: 83, total: 120 },
  { key: 'robots', used: 48, total: 60 },
] as const;

export const overviewAnnouncements = [
  { title: '8 月数据源稳定性维护通知', publishedAt: '2026-08-25' },
  { title: '京东商智连接器升级公告', publishedAt: '2026-08-22' },
  { title: '抖音电商罗盘字段调整说明', publishedAt: '2026-08-19' },
  { title: '拼多多商家后台采集窗口变更', publishedAt: '2026-08-15' },
  { title: '云桌面资源扩容完成通知', publishedAt: '2026-08-11' },
  { title: '机器人运行上限规则更新', publishedAt: '2026-08-07' },
  { title: '入库校验规则优化公告', publishedAt: '2026-08-02' },
  { title: '跨境数据源服务时间调整', publishedAt: '2026-07-28' },
  { title: '数据异常重试策略升级', publishedAt: '2026-07-21' },
  { title: '取数宝服务月度巡检通知', publishedAt: '2026-07-15' },
] as const;

export function formatOverviewAnnouncementDate(publishedAt: string) {
  return publishedAt.slice(5).replace('-', '/');
}

export const overviewSchedule = {
  hourCount: 24,
  rowAxis: 'robots',
  scrollAxes: ['horizontal', 'vertical'],
} as const;

export const overviewScheduleViews = [
  { key: 'data', label: '运行数据视图' },
  { key: 'robot', label: '机器人视图' },
] as const;

export type OverviewScheduleViewKey = (typeof overviewScheduleViews)[number]['key'];

export type OverviewPeriodKey = 'daily' | 'weekly' | 'cumulative';

const overviewScheduleAxes = {
  daily: {
    labels: Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`),
    unitWidth: 80,
  },
  weekly: {
    labels: Array.from({ length: 31 }, (_, index) => `08/${String(index + 1).padStart(2, '0')}`),
    unitWidth: 180,
  },
  cumulative: {
    labels: ['09月', '10月', '11月', '12月', '01月', '02月', '03月', '04月', '05月', '06月', '07月', '08月'],
    unitWidth: 120,
  },
} as const satisfies Record<OverviewPeriodKey, { labels: readonly string[]; unitWidth: number }>;

export function getOverviewScheduleAxis(period: OverviewPeriodKey) {
  return overviewScheduleAxes[period];
}

export type OverviewRobotSchedule = {
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
    tone: string;
  }[];
};

const withPlanCount = (robots: readonly Omit<OverviewRobotSchedule, 'planCount'>[]) => robots.map((robot) => ({
  ...robot,
  planCount: robot.blocks.length,
}));

const dailyRobotSchedules = withPlanCount([
  { name: 'Zane Zhou', blocks: [
    { startTime: '00:00', endTime: '06:55', label: 'P3-拼多多商家后台-财务数据采集 17', tone: 'orange' },
    { startTime: '07:00', endTime: '11:00', label: 'P2-拼多多商家后台-财务数据', tone: 'blue' },
    { startTime: '11:00', endTime: '15:25', label: 'P2-拼多多商家后台', tone: 'violet' },
    { startTime: '15:30', endTime: '20:00', label: 'P2-拼多多商家后台', tone: 'blue' },
  ] },
  { name: 'Ethan Sun', blocks: [
    { startTime: '00:00', endTime: '06:55', label: 'P3-拼多多商家后台', tone: 'orange' },
    { startTime: '07:00', endTime: '11:00', label: 'P2-拼多多商家后台-财务数据', tone: 'blue' },
    { startTime: '11:00', endTime: '15:25', label: 'P2-拼多多商家后台', tone: 'violet' },
  ] },
  { name: 'Sophia Sun', blocks: [
    { startTime: '00:00', endTime: '06:55', label: 'P3-拼多多商家后台-财务数据采集', tone: 'orange' },
    { startTime: '07:00', endTime: '11:00', label: 'P2-拼多多商家后台', tone: 'blue' },
    { startTime: '11:00', endTime: '15:25', label: 'P2-拼多多商家后台-财务数据', tone: 'violet' },
  ] },
  { name: 'Mia Chen', blocks: [
    { startTime: '00:00', endTime: '06:55', label: 'P3-拼多多商家后台-财务数据采集 17', tone: 'orange' },
    { startTime: '07:00', endTime: '15:25', label: 'P2-拼多多商家后台', tone: 'blue' },
  ] },
]);

const weeklyRobotNames = ['Zane Zhou', 'Ethan Sun', 'Sophia Sun', 'Mia Chen'] as const;
const weeklyTaskLabels = [
  ['京东商智-订单明细', '拼多多-库存', '抖音罗盘-交易'],
  ['淘宝生意参谋-商品', '唯品会-订单', '快手-商品'],
  ['小红书-商品', '得物-交易', '有赞-订单'],
  ['聚水潭-订单', '京东-评价', '拼多多-财务数据'],
] as const;
const weeklyTaskCatalog = [
  '京东商智-订单明细', '拼多多-库存', '抖音罗盘-交易', '淘宝生意参谋-商品', '唯品会-订单',
  '快手-商品', '小红书-商品', '得物-交易', '有赞-订单', '聚水潭-订单',
  '京东-评价', '拼多多-财务数据', '天猫-商品', '抖店-订单', '京东物流-库存',
  '淘宝直播-流量', '快手小店-订单', '唯品会-商品', '小红书-笔记', '得物-库存',
] as const;
const weeklyTaskWindows = [
  ['00:20', '01:10'], ['01:15', '02:00'], ['02:05', '03:00'], ['03:10', '04:00'], ['04:05', '05:00'],
  ['05:10', '06:05'], ['06:10', '07:00'], ['07:10', '08:00'], ['08:05', '09:00'], ['09:10', '10:00'],
  ['09:40', '10:35'], ['10:40', '11:30'], ['11:35', '12:25'], ['12:30', '13:20'], ['13:25', '14:15'],
  ['14:20', '15:10'], ['15:15', '16:05'], ['16:10', '17:00'], ['17:05', '17:55'], ['17:30', '18:30'],
] as const;
const weeklyTaskTones = ['blue', 'orange', 'violet'] as const;

const weeklyRobotSchedules = withPlanCount(weeklyRobotNames.map((name, robotIndex) => ({
  name,
  blocks: overviewScheduleAxes.weekly.labels.flatMap((date, dayIndex) => {
    const taskCount = 10 + ((robotIndex * 7 + dayIndex * 3) % 11);
    return weeklyTaskWindows.slice(0, taskCount).map(([start, end], taskIndex) => ({
      startTime: `${date} ${start}`,
      endTime: `${date} ${end}`,
      startSlot: dayIndex,
      endSlot: dayIndex + 1,
      label: weeklyTaskCatalog[(robotIndex * 3 + dayIndex + taskIndex) % weeklyTaskCatalog.length],
      tone: weeklyTaskTones[(robotIndex + dayIndex + taskIndex) % weeklyTaskTones.length],
    }));
  }),
})));

const cumulativeTaskWindows = [
  ['第1周', '第2周'],
  ['第2周', '第3周'],
  ['第3周', '第4周'],
] as const;

const cumulativeRobotSchedules = withPlanCount(weeklyRobotNames.map((name, robotIndex) => ({
  name,
  blocks: overviewScheduleAxes.cumulative.labels.flatMap((month, monthIndex) => cumulativeTaskWindows.map(([start, end], stackIndex) => ({
    startTime: `${month}${start}`,
    endTime: `${month}${end}`,
    startSlot: monthIndex,
    endSlot: monthIndex + 1,
    stackIndex,
    stackCount: cumulativeTaskWindows.length,
    label: weeklyTaskLabels[(robotIndex + monthIndex) % weeklyTaskLabels.length][stackIndex],
    tone: weeklyTaskTones[stackIndex],
  }))),
})));

const overviewRobotSchedulesByPeriod: Record<OverviewPeriodKey, readonly OverviewRobotSchedule[]> = {
  daily: dailyRobotSchedules,
  weekly: weeklyRobotSchedules,
  cumulative: cumulativeRobotSchedules,
};

export function getOverviewRobotSchedules(period: OverviewPeriodKey) {
  return overviewRobotSchedulesByPeriod[period];
}

export const overviewRobotSchedules = getOverviewRobotSchedules('daily');

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

export function getScheduleBlockPosition(startTime: string, endTime: string) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  return {
    left: start / 1440 * 100,
    width: (end - start) / 1440 * 100,
  };
}

export function getOverviewScheduleBlockPosition(
  period: OverviewPeriodKey,
  block: { startTime: string; endTime: string; startSlot?: number; endSlot?: number },
) {
  if (period === 'daily') return getScheduleBlockPosition(block.startTime, block.endTime);
  const slotCount = getOverviewScheduleAxis(period).labels.length;
  return {
    left: (block.startSlot ?? 0) / slotCount * 100,
    width: ((block.endSlot ?? slotCount) - (block.startSlot ?? 0)) / slotCount * 100,
  };
}

const WEEKLY_TASK_HEIGHT = 44;
const WEEKLY_TASK_GAP = 8;
const WEEKLY_CONFLICT_OFFSET = 4;
const WEEKLY_CELL_PADDING = 8;

const getClockMinutes = (dateTime: string) => {
  const clock = dateTime.match(/(\d{2}:\d{2})$/)?.[1] ?? dateTime;
  return toMinutes(clock);
};

export function buildWeeklyRobotLayout(robot: OverviewRobotSchedule) {
  const layoutBlocks: Array<OverviewRobotSchedule['blocks'][number] & {
    top: number;
    conflictIndex: number;
    conflictCount: number;
  }> = [];
  let rowHeight = 64;

  for (let dayIndex = 0; dayIndex < overviewScheduleAxes.weekly.labels.length; dayIndex += 1) {
    const dayBlocks = robot.blocks
      .filter((block) => block.startSlot === dayIndex)
      .map((block) => ({ block, start: getClockMinutes(block.startTime), end: getClockMinutes(block.endTime) }))
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const conflictGroups: typeof dayBlocks[] = [];

    for (const item of dayBlocks) {
      const group = conflictGroups[conflictGroups.length - 1];
      const groupEnd = group ? Math.max(...group.map((entry) => entry.end)) : -1;
      if (!group || item.start >= groupEnd) conflictGroups.push([item]);
      else group.push(item);
    }

    let cursor = WEEKLY_CELL_PADDING;
    for (const group of conflictGroups) {
      group.forEach(({ block }, conflictIndex) => {
        layoutBlocks.push({
          ...block,
          top: cursor + conflictIndex * WEEKLY_CONFLICT_OFFSET,
          conflictIndex,
          conflictCount: group.length,
        });
      });
      cursor += WEEKLY_TASK_HEIGHT + (group.length - 1) * WEEKLY_CONFLICT_OFFSET + WEEKLY_TASK_GAP;
    }
    rowHeight = Math.max(rowHeight, cursor + WEEKLY_CELL_PADDING - WEEKLY_TASK_GAP);
  }

  return { rowHeight, blocks: layoutBlocks };
}

const weeklyRunTrendValues = [
  { date: '2026-08-19', total: 25180, failed: 1290, success: 23890 },
  { date: '2026-08-20', total: 26340, failed: 1320, success: 25020 },
  { date: '2026-08-21', total: 27020, failed: 1350, success: 25670 },
  { date: '2026-08-22', total: 26580, failed: 1340, success: 25240 },
  { date: '2026-08-23', total: 26536, failed: 1264, success: 25272 },
  { date: '2026-08-24', total: 27549, failed: 1549, success: 26000 },
  { date: '2026-08-25', total: 28755, failed: 1507, success: 27248 },
] as const;

const dailyTotals = [1210, 2450, 3810, 5320, 7140, 9450, 12380, 15720, 19790, 24120, 28755];
const dailyFailed = [75, 150, 230, 320, 420, 540, 670, 830, 1000, 1230, 1507];
const dailyRunTrendValues = dailyTotals.map((total, index) => ({
  date: `${String(index).padStart(2, '0')}:00`,
  total,
  failed: dailyFailed[index],
  success: total - dailyFailed[index],
}));

const cumulativeTotals = [592340, 625120, 661450, 682380, 708640, 719510, 731230, 748420, 760610, 776320, 792460, 843830];
const cumulativeFailed = [36240, 38100, 40250, 41380, 42310, 43520, 44120, 45240, 46350, 47120, 48260, 42980];
const cumulativeRunTrendValues = cumulativeTotals.map((total, index) => ({
  date: `${index < 4 ? 2025 : 2026}-${String((index + 8) % 12 + 1).padStart(2, '0')}`,
  total,
  failed: cumulativeFailed[index],
  success: total - cumulativeFailed[index],
}));

const overviewRunTrendValuesByPeriod = {
  daily: dailyRunTrendValues,
  weekly: weeklyRunTrendValues,
  cumulative: cumulativeRunTrendValues,
} satisfies Record<OverviewPeriodKey, readonly { date: string; total: number; failed: number; success: number }[]>;

export function buildOverviewRunTrendSpec(period: OverviewPeriodKey) {
  const values = overviewRunTrendValuesByPeriod[period].flatMap((item) => [
    { date: item.date, metric: '总运行', value: item.total },
    { date: item.date, metric: '取数失败次数', value: item.failed },
    { date: item.date, metric: '入库成功次数', value: item.success },
  ]);
  return {
    type: 'area' as const,
    stack: false,
    background: 'transparent',
    padding: { top: 8, right: 12, bottom: 28, left: 48 },
    data: [{ id: 'run-trend', values }],
    xField: 'date',
    yField: 'value',
    seriesField: 'metric',
    color: ['#4e5969', '#f53f3f', '#165dff'],
    point: { visible: true, size: 5 },
    line: { style: { lineWidth: 2 } },
    area: { style: { fillOpacity: 0.08 } },
    legends: { visible: false },
    tooltip: { visible: true },
  };
}

interface OverviewRunFacts {
  runs: number;
  success: number;
  failed: number;
  rows: number;
}

const runMetricDefinitions = [
  { key: 'runs', label: '计划运行次数', suffix: '次' },
  { key: 'success', label: '入库成功次数', suffix: '次' },
  { key: 'rows', label: '入库数据量', suffix: '亿条' },
  { key: 'failed', label: '取数失败次数', suffix: '次' },
] as const;

const buildOverviewRunPeriod = (
  comparisonLabel: string,
  current: OverviewRunFacts,
  previous: OverviewRunFacts,
) => ({
  comparisonLabel,
  current,
  previous,
  metrics: runMetricDefinitions.map((definition) => ({
    ...definition,
    value: current[definition.key],
    change: calculatePercentageChange(current[definition.key], previous[definition.key]),
  })),
});

export const overviewRunMetricsByPeriod = {
  daily: buildOverviewRunPeriod(
    '较昨日',
    { runs: 28755, success: 27248, failed: 1507, rows: 15.54 },
    { runs: 27649, success: 26100, failed: 1549, rows: 14.94 },
  ),
  weekly: buildOverviewRunPeriod(
    '较上周',
    { runs: 187960, success: 178340, failed: 9620, rows: 102.68 },
    { runs: 181429, success: 171292, failed: 10137, rows: 97.6 },
  ),
  cumulative: buildOverviewRunPeriod(
    '较上期',
    { runs: 8642310, success: 8126440, failed: 515870, rows: 4782.16 },
    { runs: 7688888, success: 7123861, failed: 565027, rows: 4363.28 },
  ),
} as const satisfies Record<OverviewPeriodKey, ReturnType<typeof buildOverviewRunPeriod>>;

export const overviewDataCompletion = { completed: 12140, total: 12388 } as const;

export const overviewStoreDelivery = {
  total: 27,
  statuses: { completed: 14, retrying: 3, pending: 10 },
} as const;

export const overviewPendingStoreDetails = [
  {
    storeName: '森森拼多多专营店',
    plans: [
      { planName: '商品库存计划', errorDetail: '页面元素未加载完成' },
      { planName: '订单明细计划', errorDetail: '下载文件生成超时' },
    ],
  },
  {
    storeName: '森宗京东自营店',
    plans: [
      { planName: '订单明细计划', errorDetail: '账号凭证已失效' },
    ],
  },
] as const;

export const overviewPlatformDelivery = {
  delivered: 620,
  total: 1000,
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
} as const;

const buildOverviewDataSnapshot = (
  completedSourceCount: number,
  totalSourceCount: number,
  storeDelivery: { completed: number; retrying: number; pending: number },
  platformDeliveredValues: readonly number[],
) => {
  const platforms = overviewPlatformDelivery.platforms.map((platform, index) => ({
    name: platform.name,
    delivered: platformDeliveredValues[index],
    total: platform.total,
  }));
  return {
    completionRate: Number(calculateRate(completedSourceCount, totalSourceCount).toFixed(1)),
    completedSourceCount,
    totalSourceCount,
    storeDelivery,
    platformDelivered: platforms.reduce((sum, platform) => sum + platform.delivered, 0),
    platformTotal: platforms.reduce((sum, platform) => sum + platform.total, 0),
    platforms,
  };
};

export const overviewDataSnapshots = [
  buildOverviewDataSnapshot(11844, 12388, { completed: 11, retrying: 7, pending: 9 }, [139, 108, 87, 54, 59, 42, 38, 41]),
  buildOverviewDataSnapshot(11942, 12388, { completed: 12, retrying: 6, pending: 9 }, [143, 111, 89, 55, 61, 44, 40, 41]),
  buildOverviewDataSnapshot(12041, 12388, { completed: 13, retrying: 5, pending: 9 }, [147, 114, 92, 57, 63, 45, 41, 44]),
  buildOverviewDataSnapshot(
    overviewDataCompletion.completed,
    overviewDataCompletion.total,
    overviewStoreDelivery.statuses,
    overviewPlatformDelivery.platforms.map((platform) => platform.delivered),
  ),
] as const;

export const overviewDataSnapshotIntervalMs = 2400;

export const overviewAnomalySummary = {
  abnormalTableCount: 1400,
  totalTableCount: 12140,
  previousAbnormalTableCount: 1458,
  previousTotalTableCount: 12140,
} as const;

export function buildSemiSparklineSpec(values: readonly number[]) {
  return {
    type: 'area' as const,
    background: 'transparent',
    padding: 0,
    data: [{ id: 'spark', values: values.map((value, index) => ({ index, value })) }],
    xField: 'index',
    yField: 'value',
    point: { visible: false },
    line: { style: { lineWidth: 2 } },
    area: { style: { fillOpacity: 0.12 } },
    axes: [{ orient: 'left' as const, visible: false }, { orient: 'bottom' as const, visible: false }],
    tooltip: { visible: false },
  };
}

export function buildDataOverviewDonutSpec(
  values: readonly { type: string; value: number }[],
  colors?: readonly string[],
) {
  const spec = {
    type: 'pie' as const,
    background: 'transparent',
    padding: 0,
    data: [{ id: 'distribution', values: [...values] }],
    categoryField: 'type',
    valueField: 'value',
    innerRadius: 0.64,
    outerRadius: 0.92,
    padAngle: 2,
    cornerRadius: 2,
    label: { visible: false },
    legends: { visible: false },
    tooltip: { visible: true },
  };
  return colors ? { ...spec, color: [...colors] } : spec;
}

export function buildDataCompletionSpec(value: number) {
  return {
    type: 'linearProgress' as const,
    background: 'transparent',
    padding: 0,
    data: [{ id: 'completion', values: [{ type: '完成率', value }] }],
    xField: 'value',
    yField: 'type',
    direction: 'horizontal' as const,
    bandWidth: 8,
    axes: [
      { orient: 'bottom' as const, min: 0, max: 100, visible: false },
      { orient: 'left' as const, visible: false },
    ],
    progress: { style: { cornerRadius: 4 } },
    track: { style: { cornerRadius: 4, fill: '#d8dee9' } },
    tooltip: { visible: false },
  };
}

const anomalyStores = [
  '森森天猫旗舰店', '森森京东自营店', '森森抖音官方店', '森森拼多多专营店',
  '森森快手品牌店', '森森小红书旗舰店', '森森唯品会官方店', '森森得物品牌店',
  '森森有赞微商城', '森森淘宝企业店', '华东天猫旗舰店', '华南京东专营店',
  '华北抖音直营店', '西南拼多多官方店', '华中快手旗舰店', '东北唯品会专卖店',
  '杭州小红书体验店', '苏州得物品牌店', '成都有赞微商城', '深圳淘宝企业店',
  '广州淘宝企业店', '南京天猫专营店', '武汉京东旗舰店', '重庆抖音品牌店',
  '厦门拼多多体验店', '青岛快手官方店', '宁波唯品会旗舰店', '天津得物潮流店',
  '西安有赞微商城', '福州小红书品牌店', '合肥淘宝旗舰店', '济南京东专营店',
] as const;

const anomalyTemplatePattern = [0, 0, 1, 0, 2, 1, 0, 3, 0, 1, 2, 0, 0, 1, 3, 0, 2, 1, 0, 3] as const;

const getStorePlatform = (storeName: string) => (
  ['天猫', '京东', '抖音', '拼多多', '快手', '小红书', '唯品会', '得物', '有赞', '淘宝']
    .find((platform) => storeName.includes(platform)) ?? '其他平台'
);

const anomalyPlanNames = {
  login: ['经营分析日报', '财务数据采集', '订单明细同步'],
  collection: ['商品表现日报', '流量来源采集', '销售明细下载'],
  ingestion: ['经营数据入库', '订单数据入库', '商品数据入库'],
  validation: ['经营数据校验', '订单数据校验', '商品数据校验'],
} as const;

const formatOccurredAt = (minutes: number) => {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minute = String(minutes % 60).padStart(2, '0');
  return `2026-08-25T${hours}:${minute}:00+08:00`;
};

const buildAnomalyRows = (
  key: keyof typeof anomalyPlanNames,
  templates: readonly { issueType: string; reason: string }[],
  storeOffset: number,
  timeOffset: number,
) => (
  anomalyTemplatePattern.map((templateIndex, index) => {
    const storeName = anomalyStores[(storeOffset + index) % anomalyStores.length];
    const template = templates[templateIndex];
    const platform = getStorePlatform(storeName);
    return {
      storeName,
      platform,
      planName: `${platform}${anomalyPlanNames[key][index % anomalyPlanNames[key].length]}`,
      occurredAt: formatOccurredAt(595 - timeOffset - index * 9),
      issueType: template.issueType,
      reason: template.reason,
      runRecordKey: `overview-${key}-${index + 1}`,
    };
  })
);

export const overviewAnomalyGroups = [
  {
    key: 'login',
    label: '登录异常',
    rows: buildAnomalyRows('login', [
      { issueType: '账号异常', reason: '账号或密码校验未通过，请更新登录凭证' },
      { issueType: '凭证失效', reason: '平台登录态已过期，请重新授权' },
      { issueType: '验证异常', reason: '平台触发二次验证，需要完成人工校验' },
      { issueType: '权限异常', reason: '当前账号缺少报表访问权限' },
    ], 0, 0),
  },
  {
    key: 'collection',
    label: '取数执行异常',
    rows: buildAnomalyRows('collection', [
      { issueType: '页面异常', reason: '报表页面加载超时，未获取到查询结果' },
      { issueType: '下载异常', reason: '平台未在限定时间内生成下载文件' },
      { issueType: '采集异常', reason: '采集进程中断，原始文件未完整保存' },
      { issueType: '任务异常', reason: '计划执行超时，已停止本次取数' },
    ], 7, 30),
  },
  {
    key: 'ingestion',
    label: '入库异常',
    rows: buildAnomalyRows('ingestion', [
      { issueType: '连接异常', reason: '目标数据库连接超时，未建立入库会话' },
      { issueType: '映射异常', reason: '源字段未匹配到目标表字段' },
      { issueType: '写入异常', reason: '批次写入被目标库拒绝，事务已回滚' },
      { issueType: '分区异常', reason: '目标日期分区不存在，无法完成写入' },
    ], 14, 60),
  },
  {
    key: 'validation',
    label: '入库校验异常',
    rows: buildAnomalyRows('validation', [
      { issueType: '结构异常', reason: '入库结果缺少必填列，结构校验未通过' },
      { issueType: '类型异常', reason: '字段值与目标表字段类型不匹配' },
      { issueType: '行数异常', reason: '入库行数与源文件行数差异超过阈值' },
      { issueType: '完整性异常', reason: '关键业务字段空值率超过允许范围' },
    ], 21, 90),
  },
] as const;

export type OverviewAnomalyGroup = (typeof overviewAnomalyGroups)[number];
export type OverviewAnomalyRow = OverviewAnomalyGroup['rows'][number];

export function getOverviewAnomalyRate() {
  return calculateRate(overviewAnomalySummary.abnormalTableCount, overviewAnomalySummary.totalTableCount);
}

export function buildOverviewViewModel(period: OverviewPeriodKey) {
  const anomalyRate = getOverviewAnomalyRate();
  const previousAnomalyRate = calculateRate(
    overviewAnomalySummary.previousAbnormalTableCount,
    overviewAnomalySummary.previousTotalTableCount,
  );
  return {
    updatedAtLabel: overviewDataClock.asOf.slice(0, 19).replace('T', ' '),
    completionRate: calculateRate(overviewDataCompletion.completed, overviewDataCompletion.total),
    anomalyRate,
    anomalyChange: calculatePercentageChange(anomalyRate, previousAnomalyRate),
    runMetrics: overviewRunMetricsByPeriod[period].metrics,
    platformRates: overviewPlatformDelivery.platforms.map((item) => ({
      ...item,
      rate: calculateRate(item.delivered, item.total),
    })),
  };
}

export interface OverviewRunFilters {
  startDate: string;
  endDate: string;
  issueType: OverviewAnomalyGroup['key'];
  issueLabel: OverviewAnomalyGroup['label'];
  planName?: string;
  storeName?: string;
  targetRecordKey?: string;
}

export function buildOverviewRunFilters(
  group: OverviewAnomalyGroup,
  row?: OverviewAnomalyRow,
): OverviewRunFilters {
  return {
    ...overviewPeriod,
    issueType: group.key,
    issueLabel: group.label,
    ...(row ? { planName: row.planName, storeName: row.storeName, targetRecordKey: row.runRecordKey } : {}),
  };
}

export type OverviewScope = 'current' | 'selected-period';

const overviewLayout = {
  accountPanel: {
    placement: 'left-rail',
    width: 301,
  },
  assetPanel: {
    placement: 'left-rail',
    display: 'grid-2x2',
    scope: 'current' as OverviewScope,
    items: ['stores', 'connectors', 'cloudDesktops', 'robots'] as const,
  },
  leftRail: ['accountValue', 'assets', 'announcements', 'resources'] as const,
  mainSections: ['runTrend', 'dataOverview', 'dataAnomaly'] as const,
  runTrend: {
    metrics: ['planRuns', 'ingestions', 'rows', 'failedRuns'] as const,
    periods: ['daily', 'weekly', 'cumulative'] as const,
  },
} as const;

export function getOverviewLayout() {
  return overviewLayout;
}

export function validateFeedback(content: string) {
  return content.trim() ? null : '请输入反馈内容';
}
