import { resolveOverviewError } from './errorCodeMappings.ts';

export const overviewCopy = {
  pageTitle: '概况',
  primaryMetricTitle: '累计节省人力',
  trendTitle: '运行趋势',
  completionTitle: '数据完成率',
  anomalyTitle: '数据异常率',
  showOutcomeHeading: true,
  showIngestionSuccessRateInSummary: false,
} as const;

export const calculateRate = (numerator: number, denominator: number) => numerator / denominator * 100;

export const calculatePercentageChange = (current: number, previous: number) => previous > 0 ? (current / previous - 1) * 100 : NaN;

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

export type OverviewServiceType = '自用版' | '全托版';

export function getOverviewServicePresentation(serviceType?: string | null) {
  if (serviceType === '自用版') return { label: serviceType, color: 'green' } as const;
  if (serviceType === '全托版') return { label: serviceType, color: 'purple' } as const;
  return null;
}

export function getOverviewAccountAction(renewable: boolean) {
  return renewable ? '续期' : '升级';
}

export type OverviewAuthorization =
  | { kind: 'dated'; expiresAt: string; renewable: boolean }
  | { kind: 'permanent'; renewable: boolean }
  | { kind: 'never-purchased' };

export function getOverviewAuthorizationPresentation(authorization: OverviewAuthorization) {
  if (authorization.kind === 'never-purchased') return { text: '尚未购买', action: '升级' };
  return {
    text: `到期时间：${authorization.kind === 'permanent' ? '长期有效' : authorization.expiresAt}`,
    action: getOverviewAccountAction(authorization.renewable),
  };
}

export const overviewSavedLaborFormula = '累计已节省人力 = 成功执行计划的标准人工时长合计 ÷ 8 小时/天；当前 74,640 分钟 ÷ 480 分钟/天 = 155.5 天。结果保留 1 位小数。';

export const overviewAssets = [
  { key: 'stores', used: 155 },
  { key: 'connectors', used: 125, total: 200 },
  { key: 'cloud', used: 83, total: 120 },
  { key: 'robots', used: 48, total: 60 },
] as const;

export const overviewAnnouncements = [
  { id: 'announcement-msg-overview-001', title: '8 月数据源稳定性维护通知', summary: '近期将进行数据源稳定性维护，维护期间部分计划可能延迟执行，请留意运行记录。', publishedAt: '2026-08-25' },
  { id: 'announcement-msg-overview-002', title: '京东商智连接器升级公告', summary: '京东商智连接器已完成版本升级，请及时检查授权状态及计划运行结果。', publishedAt: '2026-08-22' },
  { id: 'announcement-msg-overview-003', title: '抖音电商罗盘字段调整说明', summary: '抖音电商罗盘部分字段口径已调整，相关数据表将按新口径入库。', publishedAt: '2026-08-19' },
  { id: 'announcement-msg-overview-004', title: '拼多多商家后台采集窗口变更', summary: '拼多多商家后台采集窗口已更新，请检查跨窗口运行的计划安排。', publishedAt: '2026-08-15' },
  { id: 'announcement-msg-overview-005', title: '云桌面资源扩容完成通知', summary: '本次云桌面资源扩容已完成，新增资源现已可以分配使用。', publishedAt: '2026-08-11' },
  { id: 'announcement-msg-overview-006', title: '机器人运行上限规则更新', summary: '机器人并发运行上限规则已更新，请根据资源余量安排计划。', publishedAt: '2026-08-07' },
  { id: 'announcement-msg-overview-007', title: '入库校验规则优化公告', summary: '入库校验规则已优化，异常结果可在数据异常明细中查看。', publishedAt: '2026-08-02' },
  { id: 'announcement-msg-overview-008', title: '跨境数据源服务时间调整', summary: '跨境数据源服务时间已调整，请关注相关计划的执行时间。', publishedAt: '2026-07-28' },
  { id: 'announcement-msg-overview-009', title: '数据异常重试策略升级', summary: '数据异常重试策略已升级，可重试异常将自动进入重试队列。', publishedAt: '2026-07-21' },
  { id: 'announcement-msg-overview-010', title: '取数宝服务月度巡检通知', summary: '取数宝月度巡检已完成，巡检期间发现的问题已进入处理流程。', publishedAt: '2026-07-15' },
] as const;

export function formatOverviewAnnouncementDate(publishedAt: string) {
  return publishedAt.slice(5, 10).replace('-', '/');
}

export const overviewSchedule = {
  hourCount: 24,
  rowAxis: 'robots',
  scrollAxes: ['horizontal', 'vertical'],
} as const;

export const overviewScheduleViews = [
  { key: 'robot', label: '机器人视图' },
  { key: 'data', label: '运行数据视图' },
] as const;

export type OverviewScheduleViewKey = (typeof overviewScheduleViews)[number]['key'];

export type OverviewPeriodKey = 'daily' | 'weekly' | 'cumulative';

export const overviewPeriodOptions = [
  { key: 'daily', label: '昨日' },
  { key: 'weekly', label: '周' },
  { key: 'cumulative', label: '月' },
] as const satisfies readonly { key: OverviewPeriodKey; label: string }[];

const overviewScheduleAxes = {
  daily: {
    labels: Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`),
    unitWidth: 80,
  },
  weekly: {
    labels: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    unitWidth: 150,
  },
  cumulative: {
    labels: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    unitWidth: 150,
  },
} as const satisfies Record<OverviewPeriodKey, { labels: readonly string[]; unitWidth: number }>;

export function getOverviewScheduleAxis(period: OverviewPeriodKey) {
  return overviewScheduleAxes[period];
}

export type OverviewRobotSchedule = {
  name: string;
  planCount: number;
  overLimit: boolean;
  blocks: readonly {
    startTime: string;
    endTime: string;
    startSlot?: number;
    endSlot?: number;
    stackIndex?: number;
    stackCount?: number;
    label: string;
    tone: string;
    runCount?: number;
    successCount?: number;
    failedCount?: number;
    latestWorkResult?: 'success' | 'failed';
    latestWorkErrorCode?: string;
    stores?: readonly string[];
    tables?: readonly string[];
  }[];
};

export function shouldShowOverviewOverloadWarning(view: OverviewScheduleViewKey, robots: readonly { overLimit?: boolean }[]) {
  return view === 'robot' && robots.some((robot) => robot.overLimit === true);
}

const withPlanCount = (robots: readonly Omit<OverviewRobotSchedule, 'planCount'>[]) => robots.map((robot) => ({
  ...robot,
  planCount: robot.blocks.length,
}));

const dailyTaskCatalog = [
  '京东商智-订单明细', '拼多多商家后台-财务数据', '抖音罗盘-交易', '淘宝生意参谋-商品',
  '唯品会-订单', '快手小店-商品', '小红书-商品', '得物-交易', '有赞-订单',
  '聚水潭-订单', '京东-评价', '拼多多-库存', '天猫-流量', '抖店-售后',
] as const;
const dailyTaskDurations = [38, 52, 71, 34, 63, 46, 79, 41, 57, 68, 44, 75, 39, 61, 82, 48] as const;
const dailyGapWeights = [12, 21, 16, 28, 13, 25, 18, 31, 14, 23, 17, 27, 15, 22, 19] as const;
const dailyRobotProfiles = [
  { name: 'Zane Zhou', taskCount: 14 },
  { name: 'Ethan Sun', taskCount: 12 },
  { name: 'Sophia Sun', taskCount: 16 },
  { name: 'Mia Chen', taskCount: 11 },
] as const;
const scheduleStoreCatalog = [
  '森森天猫旗舰店', '森森京东自营店', '森森抖音官方店', '森森拼多多专营店',
  '森森快手品牌店', '森森小红书旗舰店', '森森唯品会官方店', '森森有赞微商城',
] as const;
const scheduleTableCatalog = [
  '订单明细表', '商品明细表', '库存明细表', '交易汇总表',
  '财务流水表', '售后明细表', '流量日报表', '店铺维度表',
] as const;
const scheduleErrorCodes = ['QSB-2101', 'QSB-2203', 'QSB-3102', 'QSB-4107'] as const;
const buildScheduleRuntimeFacts = (robotIndex: number, taskIndex: number, dayIndex = 0) => {
  const runCount = 1 + ((robotIndex + taskIndex + dayIndex) % 4);
  const failedCount = (robotIndex * 2 + taskIndex + dayIndex) % 7 === 0 ? 1 : 0;
  const storeCount = 1 + ((robotIndex + taskIndex + dayIndex) % scheduleStoreCatalog.length);
  const tableCount = 1 + ((robotIndex * 3 + taskIndex + dayIndex) % scheduleTableCatalog.length);
  return {
    runCount,
    successCount: runCount - failedCount,
    failedCount,
    latestWorkResult: failedCount ? 'failed' as const : 'success' as const,
    latestWorkErrorCode: failedCount ? scheduleErrorCodes[(robotIndex + taskIndex + dayIndex) % scheduleErrorCodes.length] : undefined,
    stores: Array.from({ length: storeCount }, (_, storeIndex) => scheduleStoreCatalog[(robotIndex * 2 + taskIndex + dayIndex + storeIndex) % scheduleStoreCatalog.length]),
    tables: Array.from({ length: tableCount }, (_, tableIndex) => scheduleTableCatalog[(robotIndex + taskIndex + dayIndex + tableIndex) % scheduleTableCatalog.length]),
  };
};
const formatScheduleTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const toMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const dailyRobotSchedules = withPlanCount(dailyRobotProfiles.map(({ name, taskCount }, robotIndex) => {
  const durations = Array.from({ length: taskCount }, (_, taskIndex) => dailyTaskDurations[(taskIndex + robotIndex * 3) % dailyTaskDurations.length]);
  const weights = Array.from({ length: taskCount - 1 }, (_, taskIndex) => dailyGapWeights[(taskIndex + robotIndex * 4) % dailyGapWeights.length]);
  const startAt = 7 + robotIndex * 11;
  const idleMinutes = 1370 - robotIndex * 7 - startAt - durations.reduce((total, duration) => total + duration, 0);
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  let cursor = startAt;
  return {
    name,
    overLimit: robotIndex < 2,
    blocks: durations.map((duration, taskIndex) => {
      const startTime = formatScheduleTime(cursor);
      cursor += duration;
      const endTime = formatScheduleTime(cursor);
      if (taskIndex < weights.length) cursor += Math.round(idleMinutes * weights[taskIndex] / totalWeight);
      return {
        startTime,
        endTime,
        label: dailyTaskCatalog[(taskIndex + robotIndex * 5) % dailyTaskCatalog.length],
        tone: (['orange', 'blue', 'violet'] as const)[(taskIndex + robotIndex) % 3],
        ...buildScheduleRuntimeFacts(robotIndex, taskIndex),
      };
    }),
  };
}));

const weeklyRobotNames = ['Zane Zhou', 'Ethan Sun', 'Sophia Sun', 'Mia Chen'] as const;
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

const formatCalendarDate = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

export const overviewCalendarToday = '2026-08-28';

const parseCalendarDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getCalendarWeekStart = (date: Date) => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return start;
};

export function canNavigateOverviewScheduleForward(period: OverviewPeriodKey, anchorDate: string, year: number, monthIndex: number) {
  const today = parseCalendarDate(overviewCalendarToday);
  if (period === 'cumulative') return new Date(year, monthIndex + 1, 1) <= new Date(today.getFullYear(), today.getMonth(), 1);
  const nextAnchor = parseCalendarDate(anchorDate);
  nextAnchor.setDate(nextAnchor.getDate() + (period === 'weekly' ? 7 : 1));
  if (period === 'daily') return nextAnchor < today;
  return getCalendarWeekStart(nextAnchor) <= getCalendarWeekStart(today);
}

const calendarWeekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;

export function buildOverviewTimeCalendarDays(period: 'daily' | 'weekly', anchorDate: string) {
  const [year, month, day] = anchorDate.split('-').map(Number);
  const anchor = new Date(year, month - 1, day);
  const start = new Date(anchor);
  if (period === 'weekly') start.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: period === 'daily' ? 1 : 7 }, (_, dayIndex) => {
    const date = new Date(start);
    date.setDate(start.getDate() + dayIndex);
    return { date: formatCalendarDate(date), day: date.getDate(), weekday: calendarWeekdays[date.getDay()] };
  });
}

export function getOverviewTimeEventPosition(startTime: string, endTime: string) {
  const start = toMinutes(startTime.match(/(\d{2}:\d{2})(?::\d{2})?$/)?.[1] ?? startTime);
  const end = toMinutes(endTime.match(/(\d{2}:\d{2})(?::\d{2})?$/)?.[1] ?? endTime);
  return { top: start / 1440 * 100, height: Math.max(0, end - start) / 1440 * 100 };
}

export const overviewTimeCalendarPixelsPerHour = 40;
export const overviewTimeEventTwoLineMinHeight = 44;

export function getOverviewTimeEventLayout(startTime: string, endTime: string) {
  const position = getOverviewTimeEventPosition(startTime, endTime);
  const start = toMinutes(startTime.match(/(\d{2}:\d{2})(?::\d{2})?$/)?.[1] ?? startTime);
  const end = toMinutes(endTime.match(/(\d{2}:\d{2})(?::\d{2})?$/)?.[1] ?? endTime);
  const height = Math.max(0, end - start) / 60 * overviewTimeCalendarPixelsPerHour;
  return { ...position, compact: height < overviewTimeEventTwoLineMinHeight };
}

export const overviewTimeCalendarAnchorDate = '2026-08-25';
export const overviewCalendarHourLabels = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
const overviewWeeklyCalendarDays = buildOverviewTimeCalendarDays('weekly', overviewTimeCalendarAnchorDate);

const weeklyRobotSchedules = withPlanCount(weeklyRobotNames.map((name, robotIndex) => ({
    name,
    overLimit: robotIndex < 2,
  blocks: overviewWeeklyCalendarDays.flatMap(({ date }, dayIndex) => {
    const taskCount = 3 + ((robotIndex + dayIndex) % 3);
    return Array.from({ length: taskCount }, (_, taskIndex) => {
      const [start, end] = weeklyTaskWindows[(8 + robotIndex * 2 + dayIndex + taskIndex * 3) % weeklyTaskWindows.length];
      return {
        startTime: `${date} ${start}`,
        endTime: `${date} ${end}`,
        startSlot: dayIndex,
        endSlot: dayIndex + 1,
        label: weeklyTaskCatalog[(robotIndex * 3 + dayIndex + taskIndex) % weeklyTaskCatalog.length],
        tone: weeklyTaskTones[(robotIndex + dayIndex + taskIndex) % weeklyTaskTones.length],
        ...buildScheduleRuntimeFacts(robotIndex, taskIndex, dayIndex),
      };
    });
  }),
})));

export function buildOverviewMonthlyCalendarDays(year: number, monthIndex: number) {
  const monthlyCalendarStart = new Date(year, monthIndex, 1 - new Date(year, monthIndex, 1).getDay());
  return Array.from({ length: 42 }, (_, dayIndex) => {
    const date = new Date(monthlyCalendarStart);
    date.setDate(monthlyCalendarStart.getDate() + dayIndex);
    return {
      date: formatCalendarDate(date),
      day: date.getDate(),
      inCurrentMonth: date.getFullYear() === year && date.getMonth() === monthIndex,
    };
  });
}

export const overviewMonthlyCalendarDays = buildOverviewMonthlyCalendarDays(2026, 7);

export const overviewMonthlyPlanCycleLegend = [
  { label: '日', tone: 'blue' },
  { label: '周', tone: 'orange' },
  { label: '月', tone: 'violet' },
] as const;

const toSeconds = (dateTime: string) => {
  const [, hour = '0', minute = '0', second = '0'] = dateTime.match(/(\d{2}):(\d{2})(?::(\d{2}))?$/) ?? [];
  return Number(hour) * 3600 + Number(minute) * 60 + Number(second);
};

const formatScheduleTimeWithSeconds = (seconds: number) => {
  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor(seconds % 3600 / 60);
  const second = seconds % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
};

export function formatOverviewTaskDuration(startTime: string, endTime: string) {
  const totalMinutes = Math.ceil((toSeconds(endTime) - toSeconds(startTime)) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `耗时${hours ? `${hours}h` : ''}${minutes ? `${minutes}min` : ''}`;
}

const monthlyTaskTimes = ['09:15:12', '11:00:21', '15:20:08', '18:30:45'] as const;
const monthlyTaskDurations = [2705, 4847, 3022, 4213] as const;
export function getOverviewMonthlyRobotSchedules(year: number, monthIndex: number) {
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  return withPlanCount(weeklyRobotNames.map((name, robotIndex) => ({
    name,
    overLimit: robotIndex < 2,
    blocks: Array.from({ length: dayCount }, (_, dayIndex) => {
      const date = formatCalendarDate(new Date(year, monthIndex, dayIndex + 1));
      const taskCount = 1 + ((dayIndex + robotIndex * 2) % monthlyTaskTimes.length);
      return monthlyTaskTimes.slice(0, taskCount).map((startTime, taskIndex) => {
        return {
          startTime: `${date} ${startTime}`,
          endTime: `${date} ${formatScheduleTimeWithSeconds(toSeconds(startTime) + monthlyTaskDurations[taskIndex])}`,
          label: weeklyTaskCatalog[(robotIndex * 4 + dayIndex + taskIndex) % weeklyTaskCatalog.length],
          tone: overviewMonthlyPlanCycleLegend[(robotIndex + dayIndex + taskIndex) % overviewMonthlyPlanCycleLegend.length].tone,
          ...buildScheduleRuntimeFacts(robotIndex, taskIndex, dayIndex),
        };
      });
    }).flat(),
  })));
}

const cumulativeRobotSchedules = getOverviewMonthlyRobotSchedules(2026, 7);

const overviewRobotSchedulesByPeriod: Record<OverviewPeriodKey, readonly OverviewRobotSchedule[]> = {
  daily: dailyRobotSchedules,
  weekly: weeklyRobotSchedules,
  cumulative: cumulativeRobotSchedules,
};

export function getOverviewRobotSchedules(period: OverviewPeriodKey) {
  return overviewRobotSchedulesByPeriod[period];
}

export const overviewRobotSchedules = getOverviewRobotSchedules('daily');

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

const weeklyRunTrendValues = [
  { date: '2026-08-19', total: 25180, failed: 1290, retry: 410, success: 23890 },
  { date: '2026-08-20', total: 26340, failed: 1320, retry: 435, success: 25020 },
  { date: '2026-08-21', total: 27020, failed: 1350, retry: 462, success: 25670 },
  { date: '2026-08-22', total: 26580, failed: 1340, retry: 448, success: 25240 },
  { date: '2026-08-23', total: 26536, failed: 1264, retry: 390, success: 25272 },
  { date: '2026-08-24', total: 27549, failed: 1549, retry: 501, success: 26000 },
  { date: '2026-08-25', total: 28755, failed: 1507, retry: 486, success: 27248 },
] as const;

const dailyTotals = [1210, 2450, 3810, 5320, 7140, 9450, 12380, 15720, 19790, 24120, 28755];
const dailyFailed = [75, 150, 230, 320, 420, 540, 670, 830, 1000, 1230, 1507];
const dailyRetry = [18, 38, 62, 86, 114, 148, 187, 231, 286, 354, 432];
const dailyRunTrendValues = dailyTotals.map((total, index) => ({
  date: `${String(index).padStart(2, '0')}:00`,
  total,
  failed: dailyFailed[index],
  retry: dailyRetry[index],
  success: total - dailyFailed[index],
}));

const cumulativeTotals = [592340, 625120, 661450, 682380, 708640, 719510, 731230, 748420, 760610, 776320, 792460, 843830];
const cumulativeFailed = [36240, 38100, 40250, 41380, 42310, 43520, 44120, 45240, 46350, 47120, 48260, 42980];
const cumulativeRetry = [10650, 11120, 11980, 12360, 12940, 13410, 13780, 14120, 14630, 15180, 15740, 13960];
const cumulativeRunTrendValues = cumulativeTotals.map((total, index) => ({
  date: `${index < 4 ? 2025 : 2026}-${String((index + 8) % 12 + 1).padStart(2, '0')}`,
  total,
  failed: cumulativeFailed[index],
  retry: cumulativeRetry[index],
  success: total - cumulativeFailed[index],
}));

const overviewRunTrendValuesByPeriod = {
  daily: dailyRunTrendValues,
  weekly: weeklyRunTrendValues,
  cumulative: cumulativeRunTrendValues,
} satisfies Record<OverviewPeriodKey, readonly { date: string; total: number; failed: number; retry: number; success: number }[]>;

export const overviewRunTrendSeries = [
  { key: 'total', label: '总运行', color: '#4e5969' },
  { key: 'failed', label: '取数失败次数', color: '#ff7d00' },
  { key: 'retry', label: '重试次数', color: '#722ed1' },
  { key: 'success', label: '入库成功次数', color: '#165dff' },
] as const;

export type OverviewRunTrendPoint = { date: string } & Partial<Record<(typeof overviewRunTrendSeries)[number]['key'], number | null>>;
export const formatOverviewTrendValue = (value: number) => `${value.toLocaleString('zh-CN')} 次`;
export const overviewTrendTooltipStyle = {
  panel: { padding: 12, backgroundColor: '#ffffff', border: { color: '#e5e6eb', width: 1, radius: 6 } },
  titleLabel: { fontSize: 12, fontColor: '#1d2129', fontWeight: 600, lineHeight: 20 },
  keyLabel: { fontSize: 12, fontColor: '#495969', lineHeight: 20 },
  valueLabel: { fontSize: 12, fontColor: '#1d2129', lineHeight: 20 },
  shape: { size: 8, spacing: 6 },
  spaceRow: 6,
};

export function buildOverviewRunTrendSpec(period: OverviewPeriodKey, points: readonly OverviewRunTrendPoint[] = overviewRunTrendValuesByPeriod[period]) {
  const dates = overviewRunTrendValuesByPeriod[period].map((item) => item.date);
  const pointsByDate = new Map(points.map((item) => [item.date, item]));
  const availableSeries = overviewRunTrendSeries.filter(({ key }) => dates.some((date) => typeof pointsByDate.get(date)?.[key] === 'number'));
  // 整条曲线无数据时不画线；已存在的曲线按当前周期补齐时间点，缺失值补 0。
  const values = dates.flatMap((date) => availableSeries.map(({ key, label }) => ({
    date, metric: label, value: pointsByDate.get(date)?.[key] ?? 0,
  })));
  return {
    type: 'line' as const,
    stack: false,
    background: 'transparent',
    padding: { top: 8, right: 12, bottom: 28, left: 48 },
    data: [{ id: 'run-trend', fields: { metric: { domain: overviewRunTrendSeries.map((item) => item.label) } }, values }],
    xField: 'date',
    yField: 'value',
    seriesField: 'metric',
    color: overviewRunTrendSeries.map((item) => item.color),
    axes: [
      { orient: 'bottom' as const, type: 'band' as const, domain: dates },
      { orient: 'left' as const, min: 0, ...(values.length ? {} : { max: 1 }), title: { visible: false } },
    ],
    point: { visible: true, size: 5 },
    line: { style: { lineWidth: 2 } },
    legends: { visible: false },
    tooltip: {
      visible: true,
      renderMode: 'html' as const,
      activeType: ['dimension' as const],
      style: overviewTrendTooltipStyle,
      dimension: {
        title: { value: (datum: { date: string }) => datum.date },
        content: [{
          key: (datum: { metric: string }) => datum.metric,
          value: (datum: { value: number }) => formatOverviewTrendValue(datum.value),
          shapeType: 'circle',
          shapeColor: (datum: { metric: string }) => overviewRunTrendSeries.find((item) => item.label === datum.metric)?.color,
        }],
      },
    },
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
  current: OverviewRunFacts,
  // 原型对比样本：去年同期事实，不代表前一个周期或生产数据。
  previous: OverviewRunFacts,
) => ({
  comparisonLabel: '同比',
  comparisonBasis: 'year-over-year' as const,
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
    { runs: 28755, success: 27248, failed: 1507, rows: 15.54 },
    { runs: 27649, success: 26100, failed: 1549, rows: 14.94 },
  ),
  weekly: buildOverviewRunPeriod(
    { runs: 187960, success: 178340, failed: 9620, rows: 102.68 },
    { runs: 181429, success: 171292, failed: 10137, rows: 97.6 },
  ),
  cumulative: buildOverviewRunPeriod(
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

export const overviewStoreDeliveryDetails = {
  completed: [
    { storeName: '森森天猫旗舰店', plans: [{ planName: '订单明细计划', errorDetail: '已成功入库' }] },
    { storeName: '森森抖音官方店', plans: [{ planName: '商品数据计划', errorDetail: '已成功入库' }] },
  ],
  retrying: [
    { storeName: '森森快手品牌店', plans: [{ planName: '商品库存计划', errorDetail: '正在进行第 2 次重试' }] },
    { storeName: '森森小红书旗舰店', plans: [{ planName: '交易数据计划', errorDetail: '正在进行第 1 次重试' }] },
  ],
  pending: overviewPendingStoreDetails,
} as const;

export const overviewPlatformDelivery = {
  delivered: 620,
  total: 1000,
  platforms: [
    { name: '淘系', delivered: 151, total: 220, children: [
      { name: '生意参谋', delivered: 48, total: 70 },
      { name: '淘宝商家后台', delivered: 41, total: 60 },
      { name: '天猫商家中心', delivered: 35, total: 50 },
      { name: '万相台', delivered: 27, total: 40 },
    ] },
    { name: '京东', delivered: 117, total: 180, children: [
      { name: '京东商智', delivered: 42, total: 60 },
      { name: '京麦后台', delivered: 33, total: 50 },
      { name: '京东广告', delivered: 25, total: 40 },
      { name: '京东物流', delivered: 17, total: 30 },
    ] },
    { name: '抖音', delivered: 94, total: 150, children: [
      { name: '抖音电商罗盘', delivered: 34, total: 50 },
      { name: '巨量千川', delivered: 25, total: 40 },
      { name: '抖店后台', delivered: 21, total: 35 },
      { name: '巨量算数', delivered: 14, total: 25 },
    ] },
    { name: '唯品会', delivered: 58, total: 100, children: [
      { name: '唯品会商家后台', delivered: 33, total: 55 },
      { name: '唯品会数据中心', delivered: 25, total: 45 },
    ] },
    { name: '快手', delivered: 65, total: 110, children: [
      { name: '快手生意通', delivered: 28, total: 45 },
      { name: '磁力金牛', delivered: 21, total: 35 },
      { name: '快手小店', delivered: 16, total: 30 },
    ] },
    { name: '得物', delivered: 46, total: 80, children: [
      { name: '得物商家后台', delivered: 27, total: 45 },
      { name: '得物数据中心', delivered: 19, total: 35 },
    ] },
    { name: '有赞', delivered: 42, total: 70, children: [
      { name: '有赞微商城', delivered: 25, total: 40 },
      { name: '有赞数据罗盘', delivered: 17, total: 30 },
    ] },
    { name: '聚水潭', delivered: 47, total: 90, children: [
      { name: '聚水潭 ERP', delivered: 27, total: 50 },
      { name: '聚水潭数据中心', delivered: 20, total: 40 },
    ] },
  ],
} as const;

const distributePlatformDelivered = (
  children: readonly { name: string; delivered: number; total: number }[],
  baseDelivered: number,
  targetDelivered: number,
) => {
  let allocated = 0;
  return children.map((child, index) => {
    const delivered = index === children.length - 1
      ? targetDelivered - allocated
      : Math.round(targetDelivered * child.delivered / baseDelivered);
    allocated += delivered;
    return { ...child, delivered };
  });
};

const buildOverviewDataSnapshot = (
  completedSourceCount: number,
  totalSourceCount: number,
  completionYoYChange: number, // 原型预设的相对同比增长率（%）。
  storeDelivery: { completed: number; retrying: number; pending: number },
  platformDeliveredValues: readonly number[],
) => {
  const platforms = overviewPlatformDelivery.platforms.map((platform, index) => ({
    name: platform.name,
    delivered: platformDeliveredValues[index],
    total: platform.total,
    children: distributePlatformDelivered(platform.children, platform.delivered, platformDeliveredValues[index]),
  }));
  return {
    completionRate: Number(calculateRate(completedSourceCount, totalSourceCount).toFixed(1)),
    completionYoYChange,
    completedSourceCount,
    totalSourceCount,
    storeDelivery,
    platformDelivered: platforms.reduce((sum, platform) => sum + platform.delivered, 0),
    platformTotal: platforms.reduce((sum, platform) => sum + platform.total, 0),
    platforms,
  };
};

export const overviewDataSnapshots = [
  buildOverviewDataSnapshot(11844, 12388, 2.8, { completed: 11, retrying: 7, pending: 9 }, [139, 108, 87, 54, 59, 42, 38, 41]),
  buildOverviewDataSnapshot(11942, 12388, 3.4, { completed: 12, retrying: 6, pending: 9 }, [143, 111, 89, 55, 61, 44, 40, 41]),
  buildOverviewDataSnapshot(12041, 12388, 4.0, { completed: 13, retrying: 5, pending: 9 }, [147, 114, 92, 57, 63, 45, 41, 44]),
  buildOverviewDataSnapshot(
    overviewDataCompletion.completed,
    overviewDataCompletion.total,
    4.6,
    overviewStoreDelivery.statuses,
    overviewPlatformDelivery.platforms.map((platform) => platform.delivered),
  ),
] as const;

export const overviewDataSnapshotIntervalMs = 2400;

export const overviewAnomalySummary = {
  abnormalTableCount: 1400,
  totalTableCount: 12140,
  yearAgoAbnormalTableCount: 1458,
  yearAgoTotalTableCount: 12140,
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
  templates: readonly { issueType: string; reason: string; errorCode?: string }[],
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
      errorCode: template.errorCode,
      runRecordKey: `overview-${key}-${index + 1}`,
      workId: `work-${key}-${index + 1}`,
    };
  })
);

export const overviewAnomalyGroups = [
  {
    key: 'login',
    label: '登录异常',
    rows: buildAnomalyRows('login', [
      resolveOverviewError('login', '1103'),
      resolveOverviewError('login', '1002'),
      resolveOverviewError('login', '1701'),
      resolveOverviewError('login', '1201'),
    ], 0, 0),
  },
  {
    key: 'collection',
    label: '取数执行异常',
    rows: buildAnomalyRows('collection', [
      resolveOverviewError('collection', '2001'),
      resolveOverviewError('collection', '2101'),
      resolveOverviewError('collection', '2201'),
      resolveOverviewError('collection', '3001'),
    ], 7, 30),
  },
  {
    key: 'ingestion',
    label: '入库异常',
    rows: buildAnomalyRows('ingestion', [
      resolveOverviewError('ingestion', '1001'),
      resolveOverviewError('ingestion', '2003'),
      resolveOverviewError('ingestion', '3001'),
      resolveOverviewError('ingestion', '2002'),
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
  const yearAgoAnomalyRate = calculateRate(
    overviewAnomalySummary.yearAgoAbnormalTableCount,
    overviewAnomalySummary.yearAgoTotalTableCount,
  );
  return {
    updatedAtLabel: overviewDataClock.asOf.slice(0, 19).replace('T', ' '),
    completionRate: calculateRate(overviewDataCompletion.completed, overviewDataCompletion.total),
    anomalyRate,
    anomalyChange: calculatePercentageChange(anomalyRate, yearAgoAnomalyRate),
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
  mainSections: ['runTrend', 'dataCompletion'] as const,
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
