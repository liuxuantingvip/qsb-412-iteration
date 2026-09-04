import type { PushStrategy, StrategyDraft, PushSchedule, RelatedObjectOption, PushChannel } from './interface.ts';
import { buildChannelMessages, type MessageModel } from './messagePayload.ts';

export function validateSchedule(schedule: PushSchedule): string {
  if (!schedule.timeRanges.length) return '请至少配置一个推送时间';
  if (schedule.cycle === 'WEEK' && !schedule.weekDays.length) return '请选择每周推送日期';
  if (schedule.cycle === 'MONTH' && !schedule.monthDays.length) return '请选择每月推送日期';
  const times = schedule.timeRanges.map(({ time }) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : NaN).sort((a, b) => a - b);
  if (times.some(Number.isNaN)) return '请选择有效的推送时间';
  if (times.length > 1 && times.some((time, i) => (i === 0 ? time + 1440 - times[times.length - 1] : time - times[i - 1]) < 30)) return '推送时间点间隔不能小于 30 分钟';
  return '';
}

export function candidates(strategy: StrategyDraft, objects: RelatedObjectOption[]) {
  return objects.filter(o => o.type === strategy.relatedObjectType && (strategy.systemStrategy || o.productCategory === strategy.productCategory));
}
export function scopedObjects(strategy: StrategyDraft, objects: RelatedObjectOption[]) {
  const scoped = candidates(strategy, objects).filter(o => !o.invalid && !o.disabled && (strategy.relatedMode === 'ALL' || strategy.relatedObjectIds.includes(o.id)));
  if (strategy.relatedObjectType !== 'MONITOR_VIEW') return scoped;
  const perspectiveOrder = ['店铺视角', '数据表视角', '业务参数视角'];
  return [...scoped].sort((a, b) => {
    const perspective = perspectiveOrder.indexOf(a.monitorPerspective || '业务参数视角') - perspectiveOrder.indexOf(b.monitorPerspective || '业务参数视角');
    return perspective || (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}
export function reconcileStrategy(strategy: PushStrategy, products: string[], objects: RelatedObjectOption[], channels: PushChannel[]): PushStrategy {
  const reasons: NonNullable<PushStrategy['autoStopReasons']> = [];
  const productInvalid = !strategy.systemStrategy && !products.includes(strategy.productCategory);
  if (productInvalid) reasons.push('PRODUCT');
  if (strategy.relatedMode === 'CUSTOM' && !scopedObjects(strategy, objects).length) reasons.push('OBJECTS');
  const manualDisabled = strategy.manualDisabled ?? (strategy.status === 'DISABLED' && !strategy.productInvalid && !strategy.autoStopReasons?.length);
  const requiresManualEnable = Boolean(strategy.requiresManualEnable || strategy.autoStopReasons?.includes('OBJECTS') || reasons.includes('OBJECTS'));
  const noChannels = !strategy.channelIds.length;
  const unavailableReason = productInvalid ? '产品授权已失效' : reasons.includes('OBJECTS') ? '关联对象均已失效'
    : requiresManualEnable ? '关联对象已恢复，请手动启用'
    : noChannels ? '未关联推送渠道' : !channels.some(c => strategy.channelIds.includes(c.id) && c.status === 'ENABLED') ? '无可用推送渠道'
      : !scopedObjects(strategy, objects).length ? '暂无有效关联对象' : undefined;
  return { ...strategy, productInvalid, manualDisabled: manualDisabled || noChannels, requiresManualEnable, autoStopReasons: reasons,
    status: manualDisabled || requiresManualEnable || noChannels || reasons.length ? 'DISABLED' : 'ENABLED', unavailableReason };
}

export type DeliveryStage = 'success' | 'failed' | 'waiting' | 'running';
export function deliveryStatus(r: { fetch: DeliveryStage; storage: DeliveryStage; check?: DeliveryStage }) {
  const stages = [r.fetch, r.storage, ...(r.check ? [r.check] : [])];
  return stages.includes('failed') ? 'failed' : stages.every(s => s === 'success') ? 'success' : 'running';
}
export function aggregateDelivery(states: string[]) {
  return states.includes('failed') ? 'failed' : states.length && states.every(s => s === 'success') ? 'success' : 'running';
}
export function latestDailyStatus(runs: Array<{ order: number; fetch: DeliveryStage; storage: DeliveryStage; check?: DeliveryStage }>) {
  const latest = [...runs].sort((a, b) => b.order - a.order)[0];
  return latest ? deliveryStatus(latest) : 'running';
}

// 记录尝试而非成功回执；失败不会释放本次提醒资格。每条策略、每个渠道独立。
export function claimNotification(attempts: Set<string>, input: { strategyId: string; objectId: string; channelId: string; kind: 'exception' | 'success'; period: string; eligible: boolean }) {
  if (!input.eligible) return false;
  const key = JSON.stringify([input.strategyId, input.objectId, input.channelId, input.kind, input.period]);
  if (attempts.has(key)) return false;
  attempts.add(key);
  return true;
}
export function newException(previous: string, current: string, activating = false) {
  void activating;
  return current === 'failed' && previous !== 'failed';
}

export const objectLabels = { TASK: '计划', SHOP: '店铺', DATA_TABLE: '数据表', MONITOR_VIEW: '数据监控视图' };
export interface MessageSnapshot {
  omitted?: boolean;
  model: MessageModel;
  channel: PushChannel['type'];
  images: Record<string, string>;
  target: { type: RelatedObjectOption['type']; ids: string[]; names: string[]; businessDate: string; exceptionsOnly: boolean; single: boolean };
}
export function buildStrategySnapshot(strategy: StrategyDraft, objects: RelatedObjectOption[], channel: PushChannel['type'], at = new Date()): MessageSnapshot {
  const date = new Date(at); date.setDate(date.getDate() - 1);
  const pad = (v: number) => String(v).padStart(2, '0');
  const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${day(at)} ${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;
  const businessDate = strategy.relatedObjectType === 'MONITOR_VIEW' ? day(date) : day(at);
  const scope = scopedObjects(strategy, objects);
  const exception = strategy.messageType === 'EXCEPTION_SUMMARY' || strategy.messageType === 'EXCEPTION_ALERT' || strategy.messageType === 'LOGIN_EXCEPTION';
  const realtime = strategy.pushMode === 'REALTIME';
  const displayed = realtime ? scope.filter(o => strategy.messageType === 'SUCCESS_ALERT' ? o.delivery === 'success' : o.delivery === 'failed').slice(0, 1) : scope;
  const issues = displayed.filter(o => o.delivery === 'failed');
  const monitor = strategy.relatedObjectType === 'MONITOR_VIEW';
  const views = monitor ? displayed.filter(o => !exception || o.delivery === 'failed' || o.imageFailure) : [];
  const metrics = (items: RelatedObjectOption[], total: string) => [
    { label: total, value: items.length }, { label: strategy.relatedObjectType === 'TASK' ? '成功' : '全部完成', value: items.filter(o => o.delivery === 'success').length },
    { label: strategy.relatedObjectType === 'TASK' ? '失败' : '存在异常', value: items.filter(o => o.delivery === 'failed').length },
    { label: '运行中', value: items.filter(o => !o.delivery || o.delivery === 'running').length },
  ];
  const kinds = { PROGRESS: '进度汇总', EXCEPTION_SUMMARY: '异常汇总', EXCEPTION_ALERT: '异常提醒', SUCCESS_ALERT: '成功提醒', LOGIN_EXCEPTION: '账号登录异常' };
  const associations = (o: RelatedObjectOption): string[][] => [
    ...(o.planNames?.length ? [['关联计划', o.planNames.join('、')]] : []),
    ...(o.shopNames?.length ? [['店铺', o.shopNames.join('、')]] : []),
  ];
  const groups = monitor ? (exception ? [{ title: '', metrics: [{ label: '异常视图', value: views.length }] }] : []) : realtime ? [] : strategy.relatedObjectType === 'TASK'
    ? exception ? [{ title: '', metrics: (['日常', '实时', '回溯'] as const).map(type => ({ label: `${type}异常计划`, value: issues.filter(o => (o.planType || '日常') === type).length })) }]
      : (['日常', '实时', '回溯'] as const).map(type => ({ title: `${type}计划`, metrics: metrics(scope.filter(o => (o.planType || '日常') === type), type === '日常' ? '应执行' : type === '实时' ? '总次数' : '实际次数') }))
    : [{ title: '', metrics: exception ? [{ label: `异常${objectLabels[strategy.relatedObjectType]}`, value: issues.length }] : metrics(scope, strategy.relatedObjectType === 'SHOP' ? '应关注店铺' : '应交付数据表') }];
  const snapshot: MessageSnapshot = {
    channel, images: Object.fromEntries(views.map(o => [o.id, `/push-message-preview/${o.imagePrefix || 'monitor'}-${exception ? 'exception' : 'progress'}.png`])),
    target: { type: strategy.relatedObjectType, ids: displayed.map(o => o.id), names: displayed.map(o => o.name), businessDate, exceptionsOnly: exception, single: realtime || (monitor && displayed.length === 1) },
    model: { title: strategy.messageType === 'LOGIN_EXCEPTION' ? '账号登录异常提醒' : `${objectLabels[strategy.relatedObjectType]}${kinds[strategy.messageType]}`, time: `${realtime ? exception ? '发生时间' : '完成时间' : '截止时间'} ${time}`, strategy: strategy.name.trim() || '未命名策略',
      tone: exception ? 'danger' : strategy.messageType === 'SUCCESS_ALERT' ? 'success' : 'warning', groups, monitor,
      emptyText: monitor && exception && !views.length ? '暂无异常' : undefined,
      facts: realtime ? displayed.flatMap(o => strategy.messageType === 'LOGIN_EXCEPTION'
        ? [['店铺', o.loginShopNames?.join('、') || o.name], ['关联计划', o.loginPlanNames?.join('、') || o.name], ['失败阶段', '账号登录'], ['具体原因', o.loginFailureDetail || '账号登录失败'], ['错误码', o.errorCode || 'AUTH_EXPIRED']]
        : [[objectLabels[o.type], o.name], ...(o.type === 'TASK' ? [['计划类型', o.planType || '日常']] : []), ...associations(o),
        ...(strategy.messageType === 'SUCCESS_ALERT' && o.type === 'TASK' && o.completedExecutions !== undefined ? [['应执行次数', String(o.completedExecutions)], ['成功次数', String(o.completedExecutions)]] : [])]) : [],
      failure: realtime && exception && strategy.messageType !== 'LOGIN_EXCEPTION' ? displayed[0]?.detail : undefined,
      issues: monitor || realtime ? [] : issues.map(o => [o.name, [o.type === 'TASK' ? o.planType || '日常' : '', ...associations(o).map(([label, value]) => label + '：' + value), o.detail || '取数执行失败'].filter(Boolean).join(' · ')]),
      monitorViews: monitor ? views.map(o => ({ id: o.id, name: o.name, startTime: `${businessDate} 00:00:00`, failure: o.imageFailure })) : undefined,
    },
  };
  // 使用同一渠道裁切结果展示并留存；这里只构建原型消息，不发送请求。
  buildChannelMessages(channel, snapshot.model, {
    portalUrl: 'https://portal.example.invalid/push',
    monitorImages: Object.fromEntries(views.map(view => [view.id, { feishuImageKey: view.id, imageUrl: 'https://images.example.invalid/' + view.id + '.png' }])),
  }, (sent, omitted) => { snapshot.model = sent; snapshot.omitted = omitted; });
  return snapshot;
}
