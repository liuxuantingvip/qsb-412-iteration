import { useEffect, useState } from 'react';
import { Button, Drawer, Empty, Image, Radio, Space, Spin, Table, Tag } from '@arco-design/web-react';
import type { PushChannel, RelatedObjectOption, StrategyDraft } from './interface';
import { buildStrategySnapshot, objectLabels, type MessageSnapshot } from './strategyRules';
import { listChannels, listRelatedObjects } from './services';
import { FieldFeedback } from './FieldFeedback';
import styles from './index.module.less';

function SnapshotImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? <span className={styles.snapshotError}>图片已不可用</span> : <Image width="100%" src={src} alt={name} onError={() => setFailed(true)} />;
}

export function PortalDestination({ target, onClose }: { target: MessageSnapshot['target']; onClose: () => void }) {
  const [rows, setRows] = useState<RelatedObjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<RelatedObjectOption>();
  useEffect(() => { void listRelatedObjects().then(objects => {
    const matched = target.ids.map(id => objects.find(o => o.id === id));
    setRows(matched.filter((o): o is RelatedObjectOption => Boolean(o && !o.invalid)));
    if (target.single && matched[0] && !matched[0].invalid) setDetail(matched[0]);
    if (matched.some(o => !o || o.invalid)) setError('部分关联对象已删除或失效');
  }).catch(() => setError('对象查询失败')).finally(() => setLoading(false)); }, [target]);
  const visible = rows.filter(o => !target.exceptionsOnly || o.delivery === 'failed');
  const noAccess = detail?.noAccess || (target.single && rows[0]?.noAccess);
  return <Drawer title={detail ? detail.name : `${objectLabels[target.type]}列表`} width={880} visible footer={null} onCancel={onClose}>
    <Spin loading={loading} style={{ width: '100%' }}>
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Space wrap><Tag>业务日期：{target.businessDate}</Tag><Tag>关联范围：{target.names.join('、') || '无关联对象'}</Tag>{target.exceptionsOnly && <Tag color="red">异常</Tag>}</Space>
        {error && <FieldFeedback message={error} />}
        {noAccess ? <Empty description="无权查看该对象" /> : detail ? <>
          <Space><Tag color={detail.delivery === 'failed' ? 'red' : detail.delivery === 'success' ? 'green' : 'orange'}>{detail.delivery === 'failed' ? '存在异常' : detail.delivery === 'success' ? '全部完成' : '运行中'}</Tag></Space>
          {detail.type === 'MONITOR_VIEW' ? <SnapshotImage name={detail.name} src={`/push-message-preview/${detail.imagePrefix || 'monitor'}-${target.exceptionsOnly ? 'exception' : 'progress'}.png`} /> : <p>{detail.detail || '已完成最终交付'}</p>}
          {!target.single && <Button onClick={() => setDetail(undefined)}>返回列表</Button>}
        </> : <Table rowKey="id" pagination={false} data={visible} noDataElement={<Empty description={rows.length ? '当前无异常对象' : '暂无可查看对象'} />} columns={[
          { title: `${objectLabels[target.type]}名称`, dataIndex: 'name' },
          { title: '当前状态', render: (_, o) => o.noAccess ? '无访问权限' : o.delivery === 'failed' ? '存在异常' : o.delivery === 'success' ? '全部完成' : '运行中' },
          { title: '操作', render: (_, o) => <Button type="text" onClick={() => setDetail(o)}>查看</Button> },
        ]} />}
      </Space>
    </Spin>
  </Drawer>;
}

export function SnapshotMessage({ snapshot }: { snapshot: MessageSnapshot }) {
  const [portal, setPortal] = useState(false);
  const { model, channel } = snapshot;
  const feishu = channel === 'FEISHU';
  return <>
    <div className={styles.nativeCard} data-channel={channel} data-tone={model.tone}>
      <div className={feishu ? styles.feishuHeader : styles.messagePlainHeader}><div><strong>{model.title}</strong><span>{model.time}</span></div></div>
      <div className={styles.nativeCardBody}><div className={styles.unifiedMessageBody} data-channel={channel}>
        {model.groups.map((group, i) => <section key={i} className={styles.summaryStatistics}>
          {group.title && <strong className={styles.summaryGroupTitle}>{group.title}</strong>}
          {feishu ? <div className={`${styles.previewMetrics} ${group.metrics.length === 3 ? styles.planExceptionMetrics : ''}`}>{group.metrics.map(m => <div key={m.label} data-tone={m.label.includes('异常') || m.label === '失败' ? 'danger' : m.label === '成功' || m.label === '全部完成' ? 'success' : m.label === '运行中' ? 'warning' : undefined}><span>{m.label}</span><strong>{m.value}</strong></div>)}</div> : <p>{group.metrics.map((m, i) => <span key={m.label}>{i > 0 && ' · '}{channel === 'DINGTALK' ? <strong>{m.label} {m.value}</strong> : `${m.label} ${m.value}`}</span>)}</p>}
        </section>)}
        {model.facts.map(([label, value]) => <p key={label}>{label}：{value}</p>)}
        {model.failure && <p>失败原因：{model.failure}</p>}
        {model.emptyText && <p>{model.emptyText}</p>}
        {!!model.issues.length && <section className={feishu ? styles.previewIssueSection : styles.plainIssueSection}><div className={styles.previewIssueTitle}><strong>异常列表</strong></div>{model.issues.map(([name, detail], i) => <div key={i} className={styles.previewIssueItem}><span className={styles.issueIndex}>{i + 1}</span><div><strong>{name}</strong><span>{detail}</span></div></div>)}</section>}
        {model.monitorViews?.map(view => <section key={view.id} className={styles.monitorViewSection} data-monitor-view={view.id}><div className={styles.monitorContext}><strong>{view.name}</strong><span>业务日期：{view.startTime.slice(0, 10)}</span></div>{view.failure ? <FieldFeedback message={`图片不可用：${view.failure}`} /> : <SnapshotImage src={snapshot.images[view.id]} name={view.name} />}</section>)}
        {snapshot.omitted && <span>…</span>}
        <div className={styles.messageStrategy}><span>策略名称</span><span>{model.strategy}</span></div>
      </div></div>
      <button type="button" className={feishu ? styles.feishuAction : channel === 'WECOM' ? styles.wecomAction : styles.dingTalkAction} onClick={() => setPortal(true)}>前往门户{channel !== 'DINGTALK' && <span>→</span>}</button>
    </div>
    {portal && <PortalDestination target={snapshot.target} onClose={() => setPortal(false)} />}
  </>;
}

export function StrategyMessagePreview({ strategy }: { strategy: StrategyDraft }) {
  const [objects, setObjects] = useState<RelatedObjectOption[]>([]);
  const [channels, setChannels] = useState<PushChannel[]>([]);
  const [channelId, setChannelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { void Promise.all([listRelatedObjects(), listChannels()]).then(([o, c]) => { setObjects(o); const selected = c.filter(item => strategy.channelIds.includes(item.id)); setChannels(selected); setChannelId(selected[0]?.id || ''); }).catch(() => setError('预览加载失败，请关闭后重试')).finally(() => setLoading(false)); }, [strategy]);
  const channel = channels.find(c => c.id === channelId);
  const snapshot = buildStrategySnapshot(strategy, objects, channel?.type || 'FEISHU');
  const empty = !snapshot.target.ids.length;
  return <Spin loading={loading} style={{ width: '100%' }}>
    {error ? <FieldFeedback message={error} /> : !channel ? <Empty description="请先选择推送渠道" /> : <>
      <Radio.Group type="button" value={channelId} onChange={setChannelId}>{channels.map(c => <Radio key={c.id} value={c.id}>{c.name}{c.status === 'DISABLED' ? '（已停用）' : ''}</Radio>)}</Radio.Group>
      {channel.status === 'DISABLED' && <FieldFeedback message="该渠道已停用，不参与实际发送" />}
      <div style={{ background: 'var(--color-fill-2)', padding: 24, marginTop: 16, maxHeight: '65vh', overflow: 'auto' }}>
        {empty ? <Empty description="当前无符合条件的关联对象" /> : <SnapshotMessage snapshot={snapshot} />}
      </div>
    </>}
  </Spin>;
}
