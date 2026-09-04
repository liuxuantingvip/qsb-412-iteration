import { useState } from 'react';
import { Button, Space } from '@arco-design/web-react';
import { AnomalyText, WorkRetryButton, WorkRetryFeedback, WorkViewButton, useWorkRetry } from '@/pages/qsbOverview/AnomalyElements';
import { overviewAnomalyGroups, type OverviewAnomalyRow } from '@/pages/qsbOverview/overviewContent';
import { buildOverviewWorkRecord, type WorkRetryResult } from '@/pages/qsbOverview/workRetry';
import { RunRecordDetailDrawer } from '@/pages/autoRetryOptimization';
import type { RunRecord } from '@/pages/autoRetryOptimization/interface';
import styles from './AccountExamples.module.less';

const group = overviewAnomalyGroups[0];
const original = group.rows[0];

function successRecord(row: OverviewAnomalyRow): RunRecord {
  return {
    key: `${row.runRecordKey}-success`, workId: row.workId, planName: row.planName, storeName: row.storeName,
    startTime: '2026-08-25 10:05:00', endTime: '2026-08-25 10:06:00',
    collectionStatus: '成功', storageStatus: '成功', validationStatus: '成功',
  };
}

function WorkRetryDemo() {
  const retry = useWorkRetry([original]);
  const [detail, setDetail] = useState<RunRecord | null>(null);
  const row = retry.rows[0];
  const state = retry.states[original.workId] ?? 'idle';
  const pending = state === 'submitting' || state === 'submitted' || state === 'succeeded';
  const resultRecord = row ? retry.records[row.workId] ?? buildOverviewWorkRecord(group, row) : null;
  const simulateExecution = (result: WorkRetryResult) => {
    if (!row || state === 'submitting' || state === 'succeeded') return;
    if (state === 'submitted') retry.finish(row.workId, result);
    else void retry.retry(row, result);
  };
  return <div className={styles.example} aria-label="Work 重试数据更新示例">
    {row ? <>
      <dl className={styles.retryFields}>
        <dt>Work</dt><dd>{row.workId}</dd>
        <dt>店铺</dt><dd>{row.storeName}</dd>
        <dt>计划名称</dt><dd>{row.planName}</dd>
        <dt>异常类型</dt><dd>{row.issueType}（{row.errorCode}）</dd>
        <dt>原因</dt><dd>{row.reason}</dd>
        <dt>发生时间</dt><dd>{row.occurredAt}</dd>
        <dt>运行记录</dt><dd>{resultRecord?.key || '--'}</dd>
      </dl>
      <Space><WorkRetryButton state={state} workId={row.workId} onRetry={() => void retry.retry(row)} /><WorkViewButton recordKey={resultRecord?.key} onView={() => setDetail(resultRecord)} /></Space>
      <div className={styles.demoActions}>
        <Button size="mini" disabled={pending} onClick={() => void retry.retry(row, { kind: 'submission-failed' })}>模拟提交失败</Button>
        <Button size="mini" disabled={state === 'submitting' || state === 'succeeded'} onClick={() => simulateExecution({ kind: 'failed', latest: {
          runRecordKey: `${row.runRecordKey}-retry`, occurredAt: '2026-08-25T10:05:00+08:00',
          issueType: row.issueType, errorCode: row.errorCode,
          reason: '平台校验仍未通过，请检查该店铺最新账号密码。',
        } })}>模拟执行后仍失败</Button>
        <Button size="mini" disabled={state === 'submitting' || state === 'succeeded'} onClick={() => simulateExecution({ kind: 'succeeded', record: successRecord(row) })}>模拟执行成功</Button>
      </div>
    </> : <p>该 Work 已无异常，不再显示异常行。</p>}
    {row ? <WorkRetryFeedback state={state} planName={row.planName} recordKey={resultRecord?.key} remainingSeconds={retry.remainingSeconds[row.workId]} onView={() => setDetail(resultRecord)} /> : null}
    <RunRecordDetailDrawer record={detail} onClose={() => setDetail(null)} />
  </div>;
}

function RetryFeedbackExamples() {
  const [detail, setDetail] = useState<RunRecord | null>(null);
  const failedRecord = buildOverviewWorkRecord(group, { ...original, runRecordKey: `${original.runRecordKey}-retry`, occurredAt: '2026-08-25T10:05:00+08:00', reason: '平台校验仍未通过，请检查该店铺最新账号密码。' });
  const succeededRecord = successRecord(original);
  return <div className={styles.example}>
    <WorkRetryFeedback state="submitted" planName={original.planName} />
    <WorkRetryFeedback state="submission-failed" planName={original.planName} />
    <WorkRetryFeedback state="execution-failed" planName={original.planName} recordKey={failedRecord.key} onView={() => setDetail(failedRecord)} />
    <WorkRetryFeedback state="succeeded" planName={original.planName} recordKey={succeededRecord.key} onView={() => setDetail(succeededRecord)} />
    <span className={styles.caption}>以上为反馈样式，倒计时固定展示 6s；下方交互演示会实际倒计时并移除该行。</span>
    <RunRecordDetailDrawer record={detail} onClose={() => setDetail(null)} />
  </div>;
}

function RetryExample() {
  const [version, setVersion] = useState(0);
  return <><WorkRetryDemo key={version} /><Button size="mini" onClick={() => setVersion((value) => value + 1)}>重置演示</Button></>;
}

export function renderAnomalyExample(key: string) {
  if (key === 'anomaly-ellipsis') return <div className={styles.example}>
    <span className={styles.caption}>异常类型 · 176px（悬浮或键盘聚焦可查看全文及错误码）</span>
    <div style={{ width: 176, maxWidth: '100%' }}><AnomalyText text={overviewAnomalyGroups[2].rows[0].issueType} extra={`错误码：${overviewAnomalyGroups[2].rows[0].errorCode}`} /></div>
    <span className={styles.caption}>原因 · 示例可用宽度 180px</span>
    <div style={{ width: 180, maxWidth: '100%' }}><AnomalyText text={original.reason} /></div>
  </div>;
  if (key === 'anomaly-view-disabled') return <div className={styles.example}><WorkViewButton /><span className={styles.caption}>缺少运行记录 ID：灰色、不可点击。</span></div>;
  if (key === 'anomaly-retry-loading') return <div className={styles.example}><Space><span>当前行</span><WorkRetryButton state="submitting" workId={original.workId} /><span>其他行</span><WorkRetryButton workId="other-work" /></Space></div>;
  if (key === 'anomaly-retry-feedback') return <RetryFeedbackExamples />;
  if (key === 'anomaly-retry-data') return <RetryExample />;
  return null;
}
