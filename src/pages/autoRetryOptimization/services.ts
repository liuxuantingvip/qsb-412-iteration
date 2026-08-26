import type {
  MockResponse,
  RelatedPlan,
  RelatedStore,
  RetryStrategy,
  RetryStrategyDraft,
  RunRecord,
} from './interface';
import { getTriggerCodes, triggerOptions } from './triggerMappings';

const wait = (duration = 160) => new Promise((resolve) => window.setTimeout(resolve, duration));

const runStatuses: RunRecord['collectionStatus'][] = ['待运行', '运行中', '成功', '部分成功', '失败'];
const storageStatuses: RunRecord['storageStatus'][] = ['待运行', '运行中', '成功', '部分成功', '失败'];
const validationStatuses: RunRecord['validationStatus'][] = ['待运行', '运行中', '成功', '部分成功', '失败'];

const stores = [
  '森森旗舰店',
  '京东自营店',
  '拼多多品牌店',
  '抖音官方店',
  '快手专营店',
  '森森淘宝旗舰店',
  '杭州女装一店',
  '上海家清专营店',
  '广州食品旗舰店',
  '成都美妆专营店',
  '深圳数码旗舰店',
  '北京母婴优选店',
  '苏州家居生活馆',
  '南京运动户外店',
  '厦门食品专卖店',
];

const planNames = [
  '商品-库存计划',
  '订单-明细计划',
  '营销-活动计划',
  '商品-基础信息',
  '库存-小时计划',
  '订单-售后计划',
  '评价-采集计划',
  '淘宝每日数据抓取 9:00',
  '京东店铺日报采集 10:00',
  '拼多多商品数据同步 11:00',
  '抖音直播数据回收 12:00',
  '阿里妈妈投放数据采集 13:00',
];

const pad = (value: number) => String(value).padStart(2, '0');

const formatDateTime = (date: Date) => [
  date.getFullYear(),
  pad(date.getMonth() + 1),
  pad(date.getDate()),
].join('-').concat(
  ' ',
  [date.getHours(), date.getMinutes(), date.getSeconds()].map(pad).join(':'),
);

const buildStorageNote = (status: RunRecord['storageStatus'], index: number) => {
  if (status === '部分成功') return index % 2 === 0 ? '部分无数据' : '部分分区入库失败';
  if (status === '失败') return index % 2 === 0 ? '入库超时' : '字段映射异常';
  return undefined;
};

const overviewSeedRecords: RunRecord[] = [
  ['overview-login-1', '店铺登录计划', '内亲拼多多 18 店', 'login', '账号密码平台校验不匹配，请您检查'],
  ['overview-login-2', '店铺登录计划', '永博京东 20 店', 'login', '账号密码平台校验不匹配，请您检查'],
  ['overview-login-3', '店铺登录计划', '森森阿里妈妈 11 店', 'login', '页面元素发生变化，正在排查'],
  ['overview-collection-1', '商品-库存计划', '森森天猫旗舰店', 'collection', '页面加载超时'],
  ['overview-collection-2', '订单-明细计划', '京东自营店', 'collection', '报表下载失败'],
  ['overview-collection-3', '营销-活动计划', '抖音官方店', 'collection', '采集文件未生成'],
  ['overview-ingestion-1', '订单-明细计划', '京东自营店', 'ingestion', '目标数据库连接超时'],
  ['overview-ingestion-2', '商品-基础信息', '拼多多品牌店', 'ingestion', '字段映射失败'],
  ['overview-ingestion-3', '库存-小时计划', '森森天猫旗舰店', 'ingestion', '目标分区写入失败'],
  ['overview-validation-1', '评价-采集计划', '森森天猫旗舰店', 'validation', '文件缺少必填列'],
  ['overview-validation-2', '商品-基础信息', '拼多多品牌店', 'validation', '字段类型不匹配'],
  ['overview-validation-3', '订单-明细计划', '京东自营店', 'validation', '数据行数校验失败'],
].map(([key, planName, storeName, issueStage, issueReason], index) => ({
  key,
  planName,
  storeName,
  startTime: `2026-07-${String(31 - Math.floor(index / 3)).padStart(2, '0')} 10:${String(index * 4).padStart(2, '0')}:00`,
  endTime: `2026-07-${String(31 - Math.floor(index / 3)).padStart(2, '0')} 10:${String(index * 4 + 12).padStart(2, '0')}:00`,
  collectionStatus: issueStage === 'login' || issueStage === 'collection' ? '失败' : '成功',
  validationStatus: issueStage === 'validation' ? '失败' : issueStage === 'login' ? '待运行' : '成功',
  storageStatus: issueStage === 'ingestion' ? '失败' : issueStage === 'login' || issueStage === 'collection' ? '待运行' : '成功',
  issueStage: issueStage as RunRecord['issueStage'],
  issueReason,
}));

const generatedRunRecords: RunRecord[] = Array.from({ length: 100 }, (_, index) => {
  const start = new Date(2026, 5, 9, 23, 45, 39);
  start.setMinutes(start.getMinutes() - index * 173);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + (index % 4 === 0 ? 0 : 12 + (index % 17)));
  const collectionStatus = runStatuses[index % runStatuses.length];
  const storageStatus = storageStatuses[Math.floor(index / runStatuses.length) % storageStatuses.length];
  const validationStatus = validationStatuses[(index + Math.floor(index / storageStatuses.length)) % validationStatuses.length];

  return {
    key: `run-${index + 1}`,
    planName: planNames[index % planNames.length],
    storeName: stores[index % stores.length],
    startTime: formatDateTime(start),
    endTime: formatDateTime(end),
    collectionStatus,
    validationStatus,
    storageStatus,
    storageNote: buildStorageNote(storageStatus, index),
  };
});

const runRecords: RunRecord[] = [...overviewSeedRecords, ...generatedRunRecords];

let retryStrategies: RetryStrategy[] = [];

export const relatedPlans: RelatedPlan[] = [
  { key: 'plan-1', name: '日常计划-淘宝-计划 001', type: '日常计划', platform: '淘宝', store: 'sensen 的店1' },
  { key: 'plan-2', name: '日常计划-淘宝-计划 002', type: '回溯计划', platform: '京东', store: 'sensen 的店1' },
  { key: 'plan-3', name: '日常计划-淘宝-计划 003', type: '日常计划', platform: '拼多多', store: 'sensen 的店1' },
  { key: 'plan-4', name: '日常计划-淘宝-计划 004', type: '日常计划', platform: '抖音', store: 'sensen 的店1' },
  { key: 'plan-5', name: '日常计划-淘宝-计划 005', type: '日常计划', platform: '阿里妈妈', store: 'sensen 的店1' },
  { key: 'plan-6', name: '日常计划-淘宝-计划 006', type: '日常计划', platform: '阿里妈妈', store: 'sensen 的店1' },
  { key: 'plan-7', name: '日常计划-淘宝-计划 007', type: '日常计划', platform: '阿里妈妈', store: 'sensen 的店1' },
];

export const relatedStores: RelatedStore[] = [
  { key: 'store-1', name: '森森淘宝旗舰店', platform: '淘宝', account: 'sensen 的店1' },
  { key: 'store-2', name: '杭州女装一店', platform: '京东', account: 'sensen 的店1' },
  { key: 'store-3', name: '上海家清专营店', platform: '拼多多', account: 'sensen 的店1' },
  { key: 'store-4', name: '广州食品旗舰店', platform: '抖音', account: 'sensen 的店1' },
  { key: 'store-5', name: '成都美妆专营店', platform: '阿里妈妈', account: 'sensen 的店1' },
];

const allStrategyTriggers = [
  ...triggerOptions.账号异常,
  ...triggerOptions.平台异常,
  ...triggerOptions.数据入库异常,
];

const strategyNamePrefixes = [
  '日常采集失败自动重试',
  '账号校验失败自动重试',
  '页面改版异常自动重试',
  '下载报表超时自动重试',
  '跨店铺采集异常自动重试',
  '平台访问异常自动重试',
  '流程异常自动重试',
  '入库失败自动重试',
];

const retryTimeRanges: [string, string][] = [
  ['00:00', '08:00'],
  ['08:00', '12:00'],
  ['12:00', '18:00'],
  ['18:00', '23:59'],
];

const cloudResourceIds = [
  'wuying-robot-hz-01',
  'wuying-robot-sh-02',
  'wuying-robot-sz-03',
  'wuying-robot-bj-04',
];

const pickCycledItems = <T,>(items: T[], start: number, count: number) => (
  Array.from({ length: count }, (_, offset) => items[(start + offset) % items.length])
);

const buildStrategyTriggers = (index: number) => Array.from(new Set([
  allStrategyTriggers[index % allStrategyTriggers.length],
  allStrategyTriggers[(index * 7 + 11) % allStrategyTriggers.length],
]));

const buildMockRetryStrategies = (): RetryStrategy[] => Array.from({ length: 100 }, (_, index) => {
  const associationType: RetryStrategy['associationType'] = index % 2 === 0 ? 'PLAN' : 'STORE';
  const planScope: RetryStrategy['planScope'] = index % 5 === 0 ? 'ALL' : 'CUSTOM';
  const storeScope: RetryStrategy['storeScope'] = index % 6 === 0 ? 'ALL' : 'CUSTOM';
  const selectedPlans = pickCycledItems(relatedPlans, index, (index % 4) + 1).map((item) => ({ ...item }));
  const selectedStores = pickCycledItems(relatedStores, index, (index % 3) + 1).map((item) => ({ ...item }));
  const executeMode: RetryStrategy['executeMode'] = index % 3 === 0 ? 'SPECIFIED' : 'DYNAMIC';
  const triggers = buildStrategyTriggers(index);

  return {
    key: `strategy-${String(index + 1).padStart(3, '0')}`,
    name: `${strategyNamePrefixes[index % strategyNamePrefixes.length]} ${String(index + 1).padStart(3, '0')}`,
    associationType,
    planScope: associationType === 'PLAN' ? planScope : 'CUSTOM',
    planCount: associationType === 'PLAN' ? (planScope === 'ALL' ? 200 : selectedPlans.length) : 0,
    relatedPlans: associationType === 'PLAN' && planScope === 'CUSTOM' ? selectedPlans : [],
    storeScope: associationType === 'STORE' ? storeScope : 'CUSTOM',
    storeCount: associationType === 'STORE' ? (storeScope === 'ALL' ? 68 : selectedStores.length) : 0,
    relatedStores: associationType === 'STORE' && storeScope === 'CUSTOM' ? selectedStores : [],
    triggers,
    triggerCodes: getTriggerCodes(triggers),
    retryCount: (index % 3) + 1,
    retryInterval: [10, 20, 30, 60][index % 4],
    specifiedTime: index % 4 !== 1,
    timeRange: retryTimeRanges[index % retryTimeRanges.length],
    executeMode,
    cloudResourceId: executeMode === 'SPECIFIED' ? cloudResourceIds[index % cloudResourceIds.length] : undefined,
    enabled: index % 4 !== 0,
  };
});

retryStrategies = buildMockRetryStrategies();

export async function getRunRecords(): Promise<MockResponse<RunRecord[]>> {
  await wait();
  return { code: '10000', bizData: runRecords.map((item) => ({ ...item })) };
}

export async function getRetryStrategies(): Promise<MockResponse<RetryStrategy[]>> {
  await wait();
  return {
    code: '10000',
    bizData: retryStrategies.map((item) => ({
      ...item,
      relatedPlans: item.relatedPlans.map((plan) => ({ ...plan })),
      relatedStores: item.relatedStores.map((store) => ({ ...store })),
      triggers: [...item.triggers],
      triggerCodes: [...item.triggerCodes],
      timeRange: [...item.timeRange],
    })),
  };
}

export async function saveRetryStrategy(
  draft: RetryStrategyDraft,
): Promise<MockResponse<RetryStrategy>> {
  await wait(260);
  const triggers = Object.values(draft.triggerValues).flat();
  const triggerCodes = getTriggerCodes(triggers);
  const current = retryStrategies.find((item) => item.key === draft.key);
  const next: RetryStrategy = {
    key: draft.key || `strategy-${Date.now()}`,
    name: draft.name,
    associationType: draft.associationType,
    planScope: draft.associationType === 'PLAN' ? draft.planScope : 'CUSTOM',
    planCount: draft.associationType === 'PLAN'
      ? (draft.planScope === 'ALL' ? 200 : draft.relatedPlans.length)
      : 0,
    relatedPlans: draft.associationType === 'PLAN' && draft.planScope === 'CUSTOM'
      ? draft.relatedPlans.map((item) => ({ ...item }))
      : [],
    storeScope: draft.associationType === 'STORE' ? draft.storeScope : 'CUSTOM',
    storeCount: draft.associationType === 'STORE'
      ? (draft.storeScope === 'ALL' ? 68 : draft.relatedStores.length)
      : 0,
    relatedStores: draft.associationType === 'STORE' && draft.storeScope === 'CUSTOM'
      ? draft.relatedStores.map((item) => ({ ...item }))
      : [],
    triggers,
    triggerCodes,
    retryCount: draft.retryCount,
    retryInterval: draft.retryInterval,
    specifiedTime: draft.specifiedTime,
    timeRange: [...draft.timeRange],
    executeMode: draft.executeMode,
    cloudResourceId: draft.executeMode === 'SPECIFIED' ? draft.cloudResourceId : undefined,
    enabled: current?.enabled ?? true,
  };
  const currentIndex = retryStrategies.findIndex((item) => item.key === next.key);
  if (currentIndex >= 0) {
    retryStrategies = retryStrategies.map((item) => item.key === next.key ? next : item);
  } else {
    retryStrategies = [next, ...retryStrategies];
  }
  return {
    code: '10000',
    bizData: {
      ...next,
      relatedPlans: next.relatedPlans.map((item) => ({ ...item })),
      relatedStores: next.relatedStores.map((item) => ({ ...item })),
      triggers: [...next.triggers],
      triggerCodes: [...next.triggerCodes],
      timeRange: [...next.timeRange],
    },
  };
}

export async function updateStrategyStatus(
  key: string,
  enabled: boolean,
): Promise<MockResponse<boolean>> {
  await wait(120);
  retryStrategies = retryStrategies.map((item) => item.key === key ? { ...item, enabled } : item);
  return { code: '10000', bizData: enabled };
}

export async function copyRetryStrategy(key: string): Promise<MockResponse<RetryStrategy>> {
  await wait(120);
  const source = retryStrategies.find((item) => item.key === key);
  if (!source) throw new Error('策略不存在或已删除');
  const copy: RetryStrategy = {
    ...source,
    key: `strategy-${Date.now()}`,
    name: `${source.name}-副本`,
    relatedPlans: source.relatedPlans.map((item) => ({ ...item })),
    relatedStores: source.relatedStores.map((item) => ({ ...item })),
    triggers: [...source.triggers],
    triggerCodes: [...source.triggerCodes],
    timeRange: [...source.timeRange],
    enabled: false,
  };
  retryStrategies = [copy, ...retryStrategies];
  return {
    code: '10000',
    bizData: {
      ...copy,
      relatedPlans: copy.relatedPlans.map((item) => ({ ...item })),
      relatedStores: copy.relatedStores.map((item) => ({ ...item })),
      triggers: [...copy.triggers],
      triggerCodes: [...copy.triggerCodes],
      timeRange: [...copy.timeRange],
    },
  };
}

export async function deleteRetryStrategy(key: string): Promise<MockResponse<boolean>> {
  await wait(120);
  if (!retryStrategies.some((item) => item.key === key)) {
    throw new Error('策略不存在或已删除');
  }
  retryStrategies = retryStrategies.filter((item) => item.key !== key);
  return { code: '10000', bizData: true };
}
