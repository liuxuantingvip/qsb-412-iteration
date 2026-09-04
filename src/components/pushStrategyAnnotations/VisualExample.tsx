import { useEffect, useState } from 'react';
import { Button, Empty, Input, Modal, Radio, Select, Space, Switch, Tag, TimePicker } from '@arco-design/web-react';
import { PushMessageAnnotationExample } from '@/pages/pushStrategyCenter';
import { SnapshotMessage } from '@/pages/pushStrategyCenter/strategyPreview';
import { FieldFeedback } from '@/pages/pushStrategyCenter/FieldFeedback';
import { ScheduleEditor } from '@/pages/pushStrategyCenter';
import type { PushSchedule, PushStrategy, PushChannel } from '@/pages/pushStrategyCenter/interface';
import { validateSchedule, reconcileStrategy, buildStrategySnapshot } from '@/pages/pushStrategyCenter/strategyRules';
import type { MessageSnapshot } from '@/pages/pushStrategyCenter/strategyRules';
import { getStrategyDetail, listRelatedObjects } from '@/pages/pushStrategyCenter/services';
import styles from './visualExample.module.less';

export const visualExampleKeys = ['status', 'product', 'mode', 'scope', 'schedule', 'channels', 'save', 'combinations', 'header', 'statistics', 'issues', 'monitor', 'portal', 'history'] as const;
type ExampleKey = typeof visualExampleKeys[number];

function StatusExample() {
  const [productValid, setProductValid] = useState(true);
  const [objectValid, setObjectValid] = useState(true);
  const [strategy, setStrategy] = useState<PushStrategy>({ id: 'example', name: '数据表更新失败提醒', productCategory: '电商取数宝', pushMode: 'SCHEDULED', messageType: 'EXCEPTION_SUMMARY', relatedMode: 'CUSTOM', relatedObjectType: 'DATA_TABLE', relatedObjectIds: ['table'], channelIds: ['channel'], status: 'ENABLED', updatedAt: '', schedule: { cycle: 'DAY', weekDays: [], monthDays: [], timeRanges: [{ id: '1', time: '09:00' }] } });
  const reconcile = (validProduct: boolean, validObject: boolean, value = strategy) => reconcileStrategy(value, validProduct ? ['电商取数宝'] : [], [{ id: 'table', name: '经营日报', type: 'DATA_TABLE', productCategory: '电商取数宝', group: '数据表', invalid: !validObject }], [{ id: 'channel', status: 'ENABLED' } as PushChannel]);
  return <>
    <div className={styles.line}><strong>{strategy.name}</strong><Switch size="small" checked={strategy.status === 'ENABLED'} disabled={Boolean(strategy.autoStopReasons?.length)} onChange={enabled => Modal.confirm({ title: enabled ? '确认启用策略？' : '确认停用策略？', onOk: () => setStrategy(reconcile(productValid, objectValid, { ...strategy, manualDisabled: !enabled })) })} /></div>
    <Space wrap><Button size="mini" onClick={() => { setStrategy(reconcile(!productValid, objectValid)); setProductValid(!productValid); }}>{productValid ? '模拟授权失效' : '模拟续期'}</Button>
      <Button size="mini" onClick={() => { setStrategy(reconcile(productValid, !objectValid)); setObjectValid(!objectValid); }}>{objectValid ? '模拟对象全部失效' : '恢复原对象'}</Button></Space>
    <Tag color={strategy.status === 'ENABLED' ? 'green' : 'orange'}>{strategy.unavailableReason || (strategy.manualDisabled ? '手动停用' : '已启用')}</Tag>
  </>;
}

function ProductExample() {
  const [state, setState] = useState('可用');
  return <><Radio.Group type="button" size="mini" options={['可用', '无授权', '查询失败']} value={state} onChange={setState} />
    {state === '可用' ? <Select size="small" defaultValue="电商取数宝" options={['电商取数宝', '跨境取数宝']} /> : state === '无授权' ? <><Select size="small" disabled placeholder="暂无可用产品" /><Button size="mini" disabled>保存</Button></> : <>
      <Select size="small" disabled placeholder="请选择产品类别" />
      <FieldFeedback message="产品查询失败" onRetry={() => setState('可用')} />
    </>}
  </>;
}

function ModeExample() {
  const [mode, setMode] = useState('定时推送');
  const [kind, setKind] = useState('进度汇总');
  const [object, setObject] = useState('计划');
  const [time, setTime] = useState('09:00');
  const scheduled = mode === '定时推送';
  return <><Radio.Group size="mini" type="button" options={['定时推送', '实时推送']} value={mode} onChange={(value) => { setMode(value); setKind(value === '定时推送' ? '进度汇总' : '异常提醒'); if (value === '实时推送' && object === '数据监控视图') setObject('计划'); }} />
    <label>消息类型<Select size="small" value={kind} onChange={setKind} options={scheduled ? ['进度汇总', '异常汇总'] : ['异常提醒', '成功提醒']} /></label>
    <label>内容类型<Select size="small" value={object} onChange={setObject} options={scheduled ? ['计划', '店铺', '数据表', '数据监控视图'] : ['计划', '店铺', '数据表']} /></label>
    {scheduled && <label>推送时间<TimePicker size="small" format="HH:mm" value={time} onChange={setTime} /></label>}
  </>;
}

function ScopeExample() {
  const [scope, setScope] = useState('全部');
  const [selected, setSelected] = useState<string[]>([]);
  return <><Radio.Group size="mini" value={scope} options={['全部', '自定义']} onChange={(value) => { setScope(value); setSelected([]); }} />
    {scope === '自定义' ? <><Select size="small" mode="multiple" placeholder="请选择计划" value={selected} onChange={setSelected} options={['商品日报', '实时订单']} />{!selected.length && <span className={styles.error}>至少选择一个关联对象</span>}</> : <Tag color="arcoblue">触发时计算当前有效范围</Tag>}
  </>;
}

function ScheduleExample() {
  const [schedule, setSchedule] = useState<PushSchedule>({ cycle: 'DAY', weekDays: [], monthDays: [], timeRanges: [{ id: 'example', time: '09:00' }] });
  const error = validateSchedule(schedule);
  return <><ScheduleEditor value={schedule} onChange={setSchedule} />
    {error && <FieldFeedback message={error} />}
  </>;
}

function ChannelsExample() {
  const [value, setValue] = useState(['运营告警群', '旧渠道（已停用）']);
  return <Select size="small" mode="multiple" value={value} onChange={setValue} options={[
    { value: '运营告警群', label: '运营告警群 · 飞书' }, { value: '日报群', label: '日报群 · 企业微信' },
    { value: '旧渠道（已停用）', label: '旧渠道（已停用）', disabled: !value.includes('旧渠道（已停用）') },
  ]} />;
}

function SaveExample() {
  const [name, setName] = useState('计划异常提醒');
  const [failed, setFailed] = useState(false);
  return <><Input size="small" value={name} onChange={setName} placeholder="策略名称" />
    <Button size="mini" type="primary" onClick={() => setFailed(true)}>演示保存失败</Button>
    {failed && <FieldFeedback message="保存失败，请稍后重试" onRetry={() => setFailed(false)} retryLabel="重试" />}
  </>;
}

function MessageExample({ section }: { section: string }) {
  const [channel, setChannel] = useState<'FEISHU' | 'WECOM' | 'DINGTALK'>('FEISHU');
  const [kind, setKind] = useState<'PROGRESS' | 'EXCEPTION_SUMMARY'>('PROGRESS');
  return <><Select size="small" value={channel} onChange={setChannel} options={[{ value: 'FEISHU', label: '飞书' }, { value: 'WECOM', label: '企业微信' }, { value: 'DINGTALK', label: '钉钉' }]} />
    {['statistics', 'combinations'].includes(section) && <Radio.Group size="mini" type="button" value={kind} onChange={setKind} options={[{ value: 'PROGRESS', label: '进度汇总' }, { value: 'EXCEPTION_SUMMARY', label: '异常汇总' }]} />}
    <div className={styles.message} data-fragment={section}><PushMessageAnnotationExample section={section === 'combinations' ? 'statistics' : section} channel={channel} kind={kind} /></div>
  </>;
}

function MonitorExample() {
  const [failed, setFailed] = useState(false);
  const [channel, setChannel] = useState<'FEISHU' | 'WECOM' | 'DINGTALK'>('FEISHU');
  const snapshot = buildStrategySnapshot({ name: '数据监控巡检', productCategory: '电商取数宝', pushMode: 'SCHEDULED', messageType: 'PROGRESS', relatedObjectType: 'MONITOR_VIEW', relatedMode: 'ALL', relatedObjectIds: [], channelIds: [], status: 'ENABLED', schedule: { cycle: 'DAY', weekDays: [], monthDays: [], timeRanges: [] } }, [
    { id: 'view-1', name: '全量店铺数据交付监控', type: 'MONITOR_VIEW', productCategory: '电商取数宝', group: '监控', delivery: 'failed', imagePrefix: 'monitor', imageFailure: failed ? '图片生成失败' : undefined },
    { id: 'view-2', name: '商品货款交付监控', type: 'MONITOR_VIEW', productCategory: '电商取数宝', group: '监控', delivery: 'success', imagePrefix: 'monitor-settlement' },
  ], channel, new Date(2026, 8, 3, 15, 0));
  return <><Select size="small" value={channel} onChange={setChannel} options={[{ value: 'FEISHU', label: '飞书' }, { value: 'WECOM', label: '企业微信' }, { value: 'DINGTALK', label: '钉钉' }]} />
    <Radio.Group size="mini" type="button" value={failed ? '单图失败' : '正常'} options={['正常', '单图失败']} onChange={value => setFailed(value === '单图失败')} />
    <SnapshotMessage snapshot={snapshot} />
  </>;
}

function PortalExample() {
  const [snapshot, setSnapshot] = useState<MessageSnapshot>();
  useEffect(() => { void Promise.all([getStrategyDetail('strategy-1'), listRelatedObjects()]).then(([strategy, objects]) => {
    if (strategy) setSnapshot(buildStrategySnapshot(strategy, objects, 'FEISHU'));
  }).catch(() => setSnapshot(undefined)); }, []);
  return snapshot ? <SnapshotMessage snapshot={snapshot} /> : <Empty description="暂无可预览策略" />;
}

export function PushAnnotationVisualExample({ name }: { name: ExampleKey }) {
  let content;
  switch (name) {
    case 'status': content = <StatusExample />; break;
    case 'product': content = <ProductExample />; break;
    case 'mode': content = <ModeExample />; break;
    case 'scope': content = <ScopeExample />; break;
    case 'schedule': content = <ScheduleExample />; break;
    case 'channels': content = <ChannelsExample />; break;
    case 'save': content = <SaveExample />; break;
    case 'monitor': content = <MonitorExample />; break;
    case 'portal': content = <PortalExample />; break;
    case 'history': content = <><div className={styles.line}><strong>历史策略名称</strong><Tag color="green">发送成功</Tag></div><div className={styles.line}><span>计划执行结果</span><Tag color="red">失败</Tag></div><span>策略删除后，本条历史消息仍保留</span></>; break;
    default: content = <MessageExample section={name} />;
  }
  return <div className={styles.example} data-push-example={name}><span className={styles.caption}>交互示例 · 不修改策略</span>{content}</div>;
}
