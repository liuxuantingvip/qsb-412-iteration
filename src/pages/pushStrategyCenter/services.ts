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

const wait = (delay = 120) => new Promise((resolve) => window.setTimeout(resolve, delay));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const now = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');

let channels: PushChannel[] = [
  {
    id: 'channel-1',
    name: '运营告警群',
    type: 'DINGTALK',
    status: 'ENABLED',
    webhook: 'https://oapi.dingtalk.com/robot/send?access_token=demo-001',
    secret: 'SEC-demo-dingtalk-001',
    referenceCount: 3,
    referencedStrategies: ['任务执行异常提醒', '店铺授权失效提醒', '账号登录异常'],
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
    referencedStrategies: ['跨境任务完成提醒'],
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

const scheduleDay = (start: string, end: string) => ({
  cycle: 'DAY' as const,
  weekDays: [],
  monthDays: [],
  timeRanges: [{ id: `range-${start}`, start, end }],
});

let strategies: PushStrategy[] = [
  {
    id: 'strategy-system',
    name: '账号登录异常',
    status: 'ENABLED',
    productCategory: '全部产品',
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
    name: '任务执行异常提醒',
    status: 'ENABLED',
    productCategory: '电商取数宝',
    messageType: 'EXCEPTION',
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
    messageType: 'EXCEPTION',
    relatedObjectType: 'MONITOR_VIEW',
    relatedMode: 'CUSTOM',
    relatedObjectIds: ['view-1', 'view-2'],
    schedule: {
      cycle: 'WEEK',
      weekDays: [1, 2, 3, 4, 5],
      monthDays: [],
      timeRanges: [
        { id: 'range-week-1', start: '09:00', end: '12:00' },
        { id: 'range-week-2', start: '14:00', end: '18:00' },
      ],
    },
    channelIds: ['channel-2'],
    updatedAt: '2026-07-22 19:00:00',
  },
  {
    id: 'strategy-3',
    name: '数据表更新失败提醒',
    status: 'DISABLED',
    productCategory: '跨境取数宝',
    messageType: 'EXCEPTION',
    relatedObjectType: 'DATA_TABLE',
    relatedMode: 'CUSTOM',
    relatedObjectIds: ['table-2', 'table-closed'],
    schedule: {
      cycle: 'MONTH',
      weekDays: [],
      monthDays: [1, 15, 28],
      timeRanges: [{ id: 'range-month-1', start: '10:00', end: '22:00' }],
    },
    channelIds: ['channel-2'],
    updatedAt: '2026-07-21 13:40:00',
  },
  {
    id: 'strategy-4',
    name: '店铺授权失效提醒',
    status: 'ENABLED',
    productCategory: '电商取数宝',
    messageType: 'EXCEPTION',
    relatedObjectType: 'SHOP',
    relatedMode: 'ALL',
    relatedObjectIds: [],
    schedule: scheduleDay('00:00', '23:59'),
    channelIds: ['channel-1'],
    updatedAt: '2026-07-20 10:30:00',
  },
  {
    id: 'strategy-5',
    name: '跨境任务完成提醒',
    status: 'ENABLED',
    productCategory: '跨境取数宝',
    messageType: 'PROGRESS',
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
    result: failed ? 'FAILED' : 'SUCCESS',
    failureReason: failed ? ['Webhook 地址响应超时', '机器人签名校验失败', '群机器人已被停用'][index % 3] : undefined,
  };
});

const relatedObjects: RelatedObjectOption[] = [
  { id: 'task-1', type: 'TASK', name: '天猫旗舰店商品监控', group: '商品任务' },
  { id: 'task-2', type: 'TASK', name: '京东订单日报', group: '订单任务' },
  { id: 'task-3', type: 'TASK', name: '抖音竞品价格监控', group: '商品任务' },
  { id: 'shop-1', type: 'SHOP', name: '天猫官方旗舰店', group: '天猫' },
  { id: 'shop-2', type: 'SHOP', name: '京东自营店', group: '京东' },
  { id: 'shop-3', type: 'SHOP', name: 'Shopee 新加坡店', group: 'Shopee' },
  { id: 'table-1', type: 'DATA_TABLE', name: '经营日报汇总表', group: '业务数据表' },
  { id: 'table-2', type: 'DATA_TABLE', name: '跨境订单明细表', group: '业务数据表' },
  { id: 'table-closed', type: 'DATA_TABLE', name: '历史商品归档表（已停用）', group: '业务数据表', disabled: true, invalid: true },
  { id: 'view-1', type: 'MONITOR_VIEW', name: '销售趋势监控', group: '经营监控' },
  { id: 'view-2', type: 'MONITOR_VIEW', name: '商品价格异常监控', group: '商品监控' },
];

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
  return clone(saved);
}

// PUT /opt/qymall/1.0.0/message/push/config/updateStatus
export async function updateChannelStatus(id: string, status: PushChannel['status']) {
  await wait();
  channels = channels.map((item) => item.id === id ? { ...item, status, updatedAt: now() } : item);
}

// DELETE /opt/qymall/1.0.0/message/push/config/delete
export async function deleteChannel(id: string) {
  await wait();
  channels = channels.filter((item) => item.id !== id);
}

// GET /opt/qymall/1.0.0/message/push/config/list
export async function listChannels() {
  await wait(40);
  return clone(channels);
}

// GET /opt/qymall/1.0.0/message/push/strategy/page
export async function queryStrategies(query: StrategyQuery) {
  await wait();
  const filtered = strategies.filter((item) => (
    (!query.name || item.name.includes(query.name))
    && (!query.status || item.status === query.status)
  ));
  return page(filtered, query.page, query.pageSize);
}

// GET /opt/qymall/1.0.0/message/push/strategy/info
export async function getStrategyDetail(id: string) {
  await wait();
  return clone(strategies.find((item) => item.id === id));
}

// POST /opt/qymall/1.0.0/message/push/strategy/add
// POST /opt/qymall/1.0.0/message/push/strategy/update
export async function saveStrategy(draft: StrategyDraft) {
  await wait();
  const saved: PushStrategy = {
    ...draft,
    id: draft.id || `strategy-${Date.now()}`,
    updatedAt: now(),
  };
  strategies = draft.id
    ? strategies.map((item) => item.id === draft.id ? saved : item)
    : [saved, ...strategies];
  channels = channels.map((channel) => {
    const referencedStrategies = strategies.filter((strategy) => strategy.channelIds.includes(channel.id)).map((strategy) => strategy.name);
    return { ...channel, referenceCount: referencedStrategies.length, referencedStrategies };
  });
  return clone(saved);
}

// PUT /opt/qymall/1.0.0/message/push/strategy/updateStatus
export async function updateStrategyStatus(id: string, status: PushStrategy['status']) {
  await wait();
  strategies = strategies.map((item) => item.id === id ? { ...item, status, updatedAt: now() } : item);
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
export async function listRelatedObjects() {
  await wait(40);
  return clone(relatedObjects);
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

