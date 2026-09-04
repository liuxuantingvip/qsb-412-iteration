import type {
  ChannelDraft,
  ChannelQuery,
  HistoryQuery,
  PageResult,
  PushChannel,
  PushHistory,
  PushStrategy,
  RelatedObjectOption,
  StrategyDraft,
  StrategyQuery,
} from './interface';
import { candidates, reconcileStrategy, validateSchedule, buildStrategySnapshot } from './strategyRules.ts';

const wait = (delay = 120) => new Promise((resolve) => globalThis.setTimeout(resolve, delay));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const now = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');

type ExecutionCounts = { total: number; success: number; failed: number; running: number };

// 两组输入分别为定时应执行次数和手动实际次数，定时执行记录不再作为手动次数重复计入。
export function mergeRealtimeExecutionCounts(scheduled: ExecutionCounts, manual: ExecutionCounts): ExecutionCounts {
  return {
    total: scheduled.total + manual.total,
    success: scheduled.success + manual.success,
    failed: scheduled.failed + manual.failed,
    running: scheduled.running + manual.running,
  };
}

let channels: PushChannel[] = [
  {
    id: 'channel-1',
    name: '运营告警群',
    type: 'DINGTALK',
    status: 'ENABLED',
    webhook: 'https://oapi.dingtalk.com/robot/send?access_token=demo-001',
    secret: 'SEC-demo-dingtalk-001',
    referenceCount: 3,
    referencedStrategies: ['计划执行异常提醒', '店铺授权失效提醒', '账号登录异常'],
    testedAt: '2026-07-23 16:40:00',
    updatedAt: '2026-07-23 16:40:00',
  },
  {
    id: 'channel-2',
    name: '数据监控通知',
    type: 'FEISHU',
    status: 'ENABLED',
    webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/demo-002',
    secret: 'demo-feishu-sign-002',
    referenceCount: 2,
    referencedStrategies: ['销售数据波动提醒', '数据表更新失败提醒'],
    testedAt: '2026-07-22 11:10:00',
    updatedAt: '2026-07-22 11:10:00',
  },
  {
    id: 'channel-3',
    name: '跨境业务群',
    type: 'WECOM',
    status: 'ENABLED',
    webhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=demo-003',
    secret: '',
    referenceCount: 1,
    referencedStrategies: ['跨境计划成功提醒'],
    testedAt: '2026-07-21 09:20:00',
    updatedAt: '2026-07-21 09:20:00',
  },
  {
    id: 'channel-4',
    name: '研发联调群',
    type: 'DINGTALK',
    status: 'DISABLED',
    webhook: 'https://oapi.dingtalk.com/robot/send?access_token=demo-004',
    secret: 'SEC-demo-dingtalk-004',
    referenceCount: 0,
    referencedStrategies: [],
    testedAt: '2026-07-18 14:25:00',
    updatedAt: '2026-07-20 10:00:00',
  },
  {
    id: 'channel-5',
    name: '管理层日报',
    type: 'FEISHU',
    status: 'ENABLED',
    webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/demo-005',
    secret: 'demo-feishu-sign-005',
    referenceCount: 1,
    referencedStrategies: ['经营日报提醒'],
    testedAt: '2026-07-20 18:00:00',
    updatedAt: '2026-07-20 18:00:00',
  },
];

const scheduleDay = (time: string, _legacyEnd: string) => ({
  cycle: 'DAY' as const,
  weekDays: [],
  monthDays: [],
  timeRanges: [{ id: `time-${time}`, time }],
});

let strategies: PushStrategy[] = [
  {
    id: 'strategy-system',
    name: '账号登录异常',
    status: 'ENABLED',
    productCategory: '全部产品',
    pushMode: 'REALTIME',
    messageType: 'LOGIN_EXCEPTION',
    relatedObjectType: 'TASK',
    relatedMode: 'ALL',
    relatedObjectIds: [],
    schedule: scheduleDay('00:00', '23:59'),
    channelIds: ['channel-1'],
    systemStrategy: true,
    updatedAt: '2026-07-23 17:10:00',
  },
  {
    id: 'strategy-1',
    name: '计划执行异常提醒',
    status: 'ENABLED',
    productCategory: '电商取数宝',
    pushMode: 'REALTIME',
    messageType: 'EXCEPTION_ALERT',
    relatedObjectType: 'TASK',
    relatedMode: 'CUSTOM',
    relatedObjectIds: ['task-1', 'task-2'],
    schedule: scheduleDay('08:30', '23:30'),
    channelIds: ['channel-1'],
    updatedAt: '2026-07-23 15:20:00',
  },
  {
    id: 'strategy-2',
    name: '销售数据波动提醒',
    status: 'ENABLED',
    productCategory: '电商取数宝',
    pushMode: 'SCHEDULED',
    messageType: 'EXCEPTION_SUMMARY',
    relatedObjectType: 'MONITOR_VIEW',
    relatedMode: 'CUSTOM',
    relatedObjectIds: ['view-1', 'view-2'],
    schedule: {
      cycle: 'WEEK',
      weekDays: [1, 2, 3, 4, 5],
      monthDays: [],
      timeRanges: [
        { id: 'time-week-1', time: '09:00' },
        { id: 'time-week-2', time: '18:00' },
      ],
    },
    channelIds: ['channel-2'],
    updatedAt: '2026-07-22 19:00:00',
  },
  {
    id: 'strategy-3',
    name: '数据表更新失败提醒',
    status: 'DISABLED',
    productCategory: '跨境取数宝（旧）',
    productInvalid: true,
    pushMode: 'SCHEDULED',
    messageType: 'EXCEPTION_SUMMARY',
    relatedObjectType: 'DATA_TABLE',
    relatedMode: 'CUSTOM',
    relatedObjectIds: ['table-2', 'table-closed'],
    schedule: {
      cycle: 'MONTH',
      weekDays: [],
      monthDays: [1, 15, 28],
      timeRanges: [{ id: 'time-month-1', time: '10:00' }],
    },
    channelIds: ['channel-2'],
    updatedAt: '2026-07-21 13:40:00',
  },
  {
    id: 'strategy-4',
    name: '店铺授权失效提醒',
    status: 'ENABLED',
    productCategory: '电商取数宝',
    pushMode: 'REALTIME',
    messageType: 'EXCEPTION_ALERT',
    relatedObjectType: 'SHOP',
    relatedMode: 'ALL',
    relatedObjectIds: [],
    schedule: scheduleDay('00:00', '23:59'),
    channelIds: ['channel-1'],
    updatedAt: '2026-07-20 10:30:00',
  },
  {
    id: 'strategy-5',
    name: '跨境计划成功提醒',
    status: 'ENABLED',
    productCategory: '跨境取数宝',
    pushMode: 'REALTIME',
    messageType: 'SUCCESS_ALERT',
    relatedObjectType: 'TASK',
    relatedMode: 'ALL',
    relatedObjectIds: [],
    schedule: scheduleDay('07:00', '23:00'),
    channelIds: ['channel-3'],
    updatedAt: '2026-07-19 16:00:00',
  },
  {
    id: 'strategy-6',
    name: '经营日报提醒',
    status: 'ENABLED',
    productCategory: '电商取数宝',
    pushMode: 'SCHEDULED',
    messageType: 'PROGRESS',
    relatedObjectType: 'DATA_TABLE',
    relatedMode: 'CUSTOM',
    relatedObjectIds: ['table-1'],
    schedule: scheduleDay('17:30', '18:30'),
    channelIds: ['channel-5'],
    updatedAt: '2026-07-18 17:30:00',
  },
];

const historyContents = [
  '商品明细表已更新完成。\n本次新增 1,286 行，更新 312 行。',
  '任务“天猫旗舰店商品监控”执行失败。\n请检查店铺授权状态后重新运行。',
  'GMV 日环比下降 18.6%，超过预警阈值 15%。\n当前值：¥126,320.00',
  '账号登录状态异常。\n影响对象：京东自营店铺。',
  '跨境任务已完成。\n成功 12 个，失败 0 个。',
];

let histories: PushHistory[] = Array.from({ length: 34 }, (_, index) => {
  const channel = channels[index % channels.length];
  const failed = index % 5 === 1 || index % 9 === 0;
  return {
    id: `history-${index + 1}`,
    pushedAt: `2026-07-${String(24 - (index % 8)).padStart(2, '0')} ${String(8 + (index % 12)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}:00`,
    productCategory: index % 3 === 0 ? '跨境取数宝' : '电商取数宝',
    strategyName: strategies[(index % (strategies.length - 1)) + 1].name,
    relatedObjectName: ['任务：天猫旗舰店商品监控', '店铺：京东自营店', '数据表：商品明细表', '监控视图：销售趋势'][index % 4],
    messageContent: historyContents[index % historyContents.length],
    channelId: channel.id,
    channelName: channel.name,
    channelType: channel.type,
    result: failed ? 'FAILED' : 'SUCCESS',
    failureReason: failed ? ['Webhook 地址响应超时', '机器人签名校验失败', '群机器人已被停用'][index % 3] : undefined,
  };
});

const objectSeeds = [
  { id: 'task-1', type: 'TASK', name: '天猫旗舰店商品监控', group: '商品计划' },
  { id: 'task-2', type: 'TASK', name: '京东订单日报', group: '订单计划' },
  { id: 'task-3', type: 'TASK', name: '抖音竞品价格监控', group: '商品计划' },
  { id: 'shop-1', type: 'SHOP', name: '天猫官方旗舰店', group: '天猫' },
  { id: 'shop-2', type: 'SHOP', name: '京东自营店', group: '京东' },
  { id: 'shop-3', type: 'SHOP', name: 'Shopee 新加坡店', group: 'Shopee' },
  { id: 'table-1', type: 'DATA_TABLE', name: '经营日报汇总表', group: '业务数据表' },
  { id: 'table-2', type: 'DATA_TABLE', name: '跨境订单明细表', group: '业务数据表' },
  { id: 'table-closed', type: 'DATA_TABLE', name: '历史商品归档表（已停用）', group: '业务数据表', disabled: true, invalid: true },
  { id: 'view-1', type: 'MONITOR_VIEW', name: '全量店铺数据交付监控', group: '店铺视角', monitorPerspective: '店铺视角' as const, createdAt: '2026-08-20 10:00:00' },
  { id: 'view-2', type: 'MONITOR_VIEW', name: '商品货款交付监控', group: '数据表视角', monitorPerspective: '数据表视角' as const, createdAt: '2026-08-22 10:00:00' },
];

let relatedObjects: RelatedObjectOption[] = objectSeeds.map((o, index) => ({ ...o, type: o.type as RelatedObjectOption['type'],
  productCategory: ['shop-3', 'table-2', 'table-closed'].includes(o.id) ? '跨境取数宝' : '电商取数宝',
  delivery: index % 3 === 0 ? 'failed' : index % 3 === 1 ? 'success' : 'running',
  planType: o.type === 'TASK' ? (['日常', '实时', '回溯'] as const)[index % 3] : undefined,
  planNames: o.type === 'SHOP' || o.type === 'DATA_TABLE' ? [o.id === 'shop-3' || o.id === 'table-2' ? 'Shopee 订单日报' : o.id === 'shop-2' ? '京东订单日报' : '天猫旗舰店商品监控'] : undefined,
  shopNames: o.type === 'DATA_TABLE' ? [o.id === 'table-2' ? 'Shopee 新加坡店' : '天猫官方旗舰店'] : undefined,
  completedExecutions: o.type === 'TASK' && index % 3 === 1 ? 1 : undefined,
  detail: index % 3 === 0 ? '入库校验失败 · 近 1 天数据缺失，校验未通过' : index % 3 === 1 ? '已完成最终交付' : '正在入库',
  errorCode: o.id === 'task-1' ? 'AUTH_TOKEN_EXPIRED' : undefined,
  loginFailureDetail: o.id === 'task-1' ? '账号登录凭证已失效' : undefined,
  loginPlanNames: o.id === 'task-1' ? ['天猫旗舰店商品监控', '商品价格监控'] : undefined,
  loginShopNames: o.id === 'task-1' ? ['天猫官方旗舰店'] : undefined,
  imagePrefix: o.id === 'view-2' ? 'monitor-settlement' : 'monitor',
}));
relatedObjects.push({ id: 'task-cross', type: 'TASK', productCategory: '跨境取数宝', name: 'Shopee 订单日报', group: '订单计划', planType: '日常', delivery: 'success', completedExecutions: 1 });
strategies = strategies.map(strategy => ({ ...strategy, relatedObjectNames: Object.fromEntries(strategy.relatedObjectIds.map(id => [id, relatedObjects.find(o => o.id === id)?.name || '已失效对象'])) }));
let authorizedProducts = ['电商取数宝', '跨境取数宝'];

// 独立模拟服务状态；只由测试/标注调用，不向生产服务发送请求。
export function setProductAvailability(product: string, valid: boolean) {
  reconcile();
  authorizedProducts = valid ? [...new Set([...authorizedProducts, product])] : authorizedProducts.filter(p => p !== product);
  reconcile();
}
export function setObjectAvailability(id: string, valid: boolean) {
  reconcile();
  relatedObjects = relatedObjects.map(o => o.id === id ? { ...o, invalid: !valid, disabled: !valid } : o);
  reconcile();
}
function reconcile() { strategies = strategies.map(s => reconcileStrategy(s, authorizedProducts, relatedObjects, channels)); }
function channelChanged() {
  reconcile();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('push-strategy:channels-changed'));
}

const faults = new Set<string>();
export function clearQueryFailure(key: 'products' | 'objects') { faults.add(key); }
function failOnce(key: string) {
  if (typeof window === 'undefined') return;
  const requested = new URLSearchParams(window.location.search).get('pushFault');
  if (requested === key && !faults.has(key)) { if (key === 'save') faults.add(key); throw new Error(key === 'save' ? '保存失败，请稍后重试' : key === 'products' ? '产品查询失败' : '关联对象查询失败'); }
}

// 保存发送时快照；历史不再依赖当前渠道或策略名称。
const sampleSnapshot = buildStrategySnapshot({ ...strategies[2], messageType: 'PROGRESS' }, relatedObjects, 'FEISHU', new Date(2026, 8, 3, 15, 0));
histories.unshift({ id: 'history-monitor', pushedAt: '2026-09-03 15:00:00', productCategory: '电商取数宝', strategyName: strategies[2].name,
  relatedObjectName: sampleSnapshot.target.names.join('、'), messageContent: `${sampleSnapshot.model.title} · ${sampleSnapshot.target.names.join('、')}`, channelId: 'channel-2', channelName: '数据监控通知', channelType: 'FEISHU', result: 'SUCCESS', snapshot: clone(sampleSnapshot) });

const page = <T,>(list: T[], current: number, pageSize: number): PageResult<T> => ({
  list: clone(list.slice((current - 1) * pageSize, current * pageSize)),
  total: list.length,
});

// GET /opt/qymall/1.0.0/message/push/config/page
export async function queryChannels(query: ChannelQuery) {
  await wait();
  const filtered = channels.filter((item) => (
    (!query.name || item.name.includes(query.name))
    && (!query.type || item.type === query.type)
    && (!query.status || item.status === query.status)
  ));
  return page(filtered, query.page, query.pageSize);
}

// POST /opt/qymall/1.0.0/message/push/config/test
export async function testChannel(draft: ChannelDraft) {
  await wait(450);
  return /^https:\/\//.test(draft.webhook.trim()) && (draft.type === 'WECOM' || Boolean(draft.secret.trim()));
}

// POST /opt/qymall/1.0.0/message/push/config/add
// POST /opt/qymall/1.0.0/message/push/config/update
export async function saveChannel(draft: ChannelDraft) {
  await wait();
  const previous = channels.find((item) => item.id === draft.id);
  const saved: PushChannel = {
    ...draft,
    id: draft.id || `channel-${Date.now()}`,
    referenceCount: previous?.referenceCount || 0,
    referencedStrategies: previous?.referencedStrategies || [],
    testedAt: now(),
    updatedAt: now(),
  };
  channels = previous
    ? channels.map((item) => item.id === saved.id ? saved : item)
    : [saved, ...channels];
  channelChanged();
  return clone(saved);
}

// PUT /opt/qymall/1.0.0/message/push/config/updateStatus
export async function updateChannelStatus(id: string, status: PushChannel['status']) {
  await wait();
  channels = channels.map((item) => item.id === id ? { ...item, status, updatedAt: now() } : item);
  channelChanged();
}

// DELETE /opt/qymall/1.0.0/message/push/config/delete
export async function deleteChannel(id: string) {
  await wait();
  channels = channels.filter((item) => item.id !== id);
  strategies = strategies.map(s => {
    const channelIds = s.channelIds.filter(channelId => channelId !== id);
    return { ...s, channelIds, ...(channelIds.length ? {} : { manualDisabled: true, status: 'DISABLED' as const }) };
  });
  channelChanged();
}

// GET /opt/qymall/1.0.0/message/push/config/list
export async function listChannels() {
  await wait(40);
  return clone(channels);
}

// GET /opt/qymall/1.0.0/message/push/product/list
// 原型仅返回已授权、有效、未过期、未隐藏、开通完成且支持推送的产品。
export async function listAuthorizedProductCategories() {
  await wait(40);
  failOnce('products');
  return [...authorizedProducts];
}

// GET /opt/qymall/1.0.0/message/push/strategy/page
export async function queryStrategies(query: StrategyQuery) {
  await wait();
  reconcile();
  const filtered = strategies.filter((item) => (
    (!query.name || item.name.includes(query.name))
    && (!query.status || item.status === query.status)
  ));
  return page(filtered, query.page, query.pageSize);
}

// GET /opt/qymall/1.0.0/message/push/strategy/info
export async function getStrategyDetail(id: string) {
  await wait();
  reconcile();
  return clone(strategies.find((item) => item.id === id));
}

// POST /opt/qymall/1.0.0/message/push/strategy/add
// POST /opt/qymall/1.0.0/message/push/strategy/update
export async function saveStrategy(draft: StrategyDraft) {
  await wait();
  failOnce('save');
  reconcile();
  if (draft.productInvalid || strategies.find((item) => item.id === draft.id)?.productInvalid) {
    throw new Error('该产品类别已失效，策略仅支持删除');
  }
  if (!draft.name.trim()) throw new Error('请输入策略名称');
  const normalizedName = draft.name.trim().toLocaleLowerCase('zh-CN');
  if (!draft.systemStrategy && normalizedName === '账号登录异常') throw new Error('“账号登录异常”为系统保留名称');
  if (strategies.some((item) => item.id !== draft.id && item.name.trim().toLocaleLowerCase('zh-CN') === normalizedName)) throw new Error('策略名称已存在');
  if (!draft.id && !draft.systemStrategy && strategies.filter((item) => !item.systemStrategy).length >= 30) throw new Error('最多可创建 30 条策略，请删除不需要的策略后重试');
  if (!draft.systemStrategy && !authorizedProducts.includes(draft.productCategory)) throw new Error('该产品类别已失效');
  if (!draft.channelIds.length) throw new Error('请选择至少一个推送渠道');
  if (draft.pushMode === 'SCHEDULED' && validateSchedule(draft.schedule)) throw new Error(validateSchedule(draft.schedule));
  const eligible = candidates(draft, relatedObjects);
  const previous = strategies.find(s => s.id === draft.id);
  if (draft.relatedMode === 'CUSTOM' && (!draft.relatedObjectIds.length || draft.relatedObjectIds.some(id => !eligible.some(o => o.id === id && ((!o.invalid && !o.disabled) || previous?.relatedObjectIds.includes(id)))))) throw new Error('请重新选择当前产品的关联对象');
  const saved: PushStrategy = {
    ...draft,
    relatedObjectNames: Object.fromEntries(draft.relatedObjectIds.map(id => [id, eligible.find(o => o.id === id)?.name || draft.relatedObjectNames?.[id] || '已失效对象'])),
    id: draft.id || `strategy-${Date.now()}`,
    updatedAt: now(),
  };
  strategies = draft.id
    ? strategies.map((item) => item.id === draft.id ? saved : item)
    : [saved, ...strategies];
  reconcile();
  channels = channels.map((channel) => {
    const referencedStrategies = strategies.filter((strategy) => strategy.channelIds.includes(channel.id)).map((strategy) => strategy.name);
    return { ...channel, referenceCount: referencedStrategies.length, referencedStrategies };
  });
  return clone(saved);
}

// PUT /opt/qymall/1.0.0/message/push/strategy/updateStatus
export async function updateStrategyStatus(id: string, status: PushStrategy['status']) {
  reconcile();
  const target = strategies.find((item) => item.id === id);
  if (status === 'ENABLED' && target?.productInvalid) {
    throw new Error('该产品类别已失效，无法启用推送策略');
  }
  if (status === 'ENABLED' && (target?.autoStopReasons?.includes('OBJECTS') || !target?.channelIds.length)) throw new Error(target?.unavailableReason || '无法启用策略');
  await wait();
  strategies = strategies.map((item) => item.id === id ? { ...item, status, manualDisabled: status === 'DISABLED', requiresManualEnable: status === 'DISABLED' ? item.requiresManualEnable : false, updatedAt: now() } : item);
  reconcile();
}

// DELETE /opt/qymall/1.0.0/message/push/strategy/delete
export async function deleteStrategy(id: string) {
  await wait();
  strategies = strategies.filter((item) => item.id !== id);
  channels = channels.map((channel) => {
    const referencedStrategies = strategies.filter((strategy) => strategy.channelIds.includes(channel.id)).map((strategy) => strategy.name);
    return { ...channel, referenceCount: referencedStrategies.length, referencedStrategies };
  });
}

// GET /opt/qymall/1.0.0/message/push/strategy/rel/plan
// GET /opt/qymall/1.0.0/message/push/strategy/rel/store
// GET /opt/qymall/1.0.0/message/push/strategy/rel/data-table
// GET /opt/qymall/1.0.0/message/push/strategy/rel/data-monitor-view
export async function listRelatedObjects(product?: string) {
  await wait(40);
  failOnce('objects');
  return clone(relatedObjects.filter(o => !product || o.productCategory === product));
}

// GET /opt/qymall/1.0.0/message/push/history
export async function queryHistory(query: HistoryQuery) {
  await wait();
  const start = query.dateRange?.[0];
  const end = query.dateRange?.[1];
  const filtered = histories.filter((item) => (
    (!query.channelId || item.channelId === query.channelId)
    && (!start || item.pushedAt.slice(0, 10) >= start)
    && (!end || item.pushedAt.slice(0, 10) <= end)
  ));
  return page(filtered, query.page, query.pageSize);
}

// GET /opt/qymall/1.0.0/message/push/history/detail
export async function getHistoryDetail(id: string) {
  await wait();
  return clone(histories.find((item) => item.id === id));
}

export async function listHistoryChannels() {
  return [...new Map(histories.map(h => [h.channelId, { id: h.channelId, name: h.channelName || '历史渠道' }])).values()];
}
