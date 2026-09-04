import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Button, Tooltip } from '@arco-design/web-react';
import type { OverviewAnomalyRow } from './overviewContent';
import { applyWorkRetryResult, getRetryRemovalSeconds, removeExpiredWorkRetries, retryRemovalDelayMs, type WorkRetryResult, type WorkRetryState } from './workRetry';
import type { RunRecord } from '../autoRetryOptimization/interface';
import styles from './index.module.less';

export function AnomalyText({ text, extra }: { text: string; extra?: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setOverflow(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);
  const content = <span ref={ref} className={styles.anomalyText} tabIndex={overflow || extra ? 0 : undefined}>{text}</span>;
  return overflow || extra ? <Tooltip trigger={['hover', 'focus']} content={<>{extra ? <div>{extra}</div> : null}{text}</>}>{content}</Tooltip> : content;
}

export function WorkViewButton({ recordKey, onView }: { recordKey?: string; onView?: () => void }) {
  return <Button type="text" size="mini" className={styles.workAction} disabled={!recordKey} onClick={recordKey ? onView : undefined}>查看</Button>;
}

export function WorkRetryButton({ state = 'idle', onRetry, workId }: { state?: WorkRetryState; onRetry?: () => void; workId?: string }) {
  return <Button type="text" size="mini" className={styles.workAction} loading={state === 'submitting'} disabled={!workId || state === 'submitting' || state === 'submitted' || state === 'succeeded'} onClick={onRetry}>{state === 'succeeded' ? '已成功' : state === 'submitted' ? '已提交' : '重试'}</Button>;
}

export function WorkRetryFeedback({ state, planName, recordKey, remainingSeconds = 6, onView }: {
  state: WorkRetryState; planName: string; recordKey?: string; remainingSeconds?: number; onView?: () => void;
}) {
  const feedback = {
    submitted: ['success', '已提交重试，等待 Work 运行结果。'],
    'submission-failed': ['error', '重试提交失败，请稍后再试。原异常数据未改变。'],
    'execution-failed': ['warning', `${planName} 计划重试失败，已更新该异常数据`],
    succeeded: ['success', `${planName} 计划重试成功，该异常即将从列表移除（${remainingSeconds}s）`],
  } as const;
  if (state === 'idle' || state === 'submitting') return null;
  const [type, content] = feedback[state];
  return <Alert className={styles.workRetryFeedback} type={type} content={<>{content}{state === 'succeeded' || state === 'execution-failed' ? <Button type="text" size="mini" disabled={!recordKey || !onView} onClick={onView}>查看运行记录</Button> : null}</>} showIcon />;
}

export function useWorkRetry(initialRows: readonly OverviewAnomalyRow[]) {
  const [rows, setRows] = useState<OverviewAnomalyRow[]>([...initialRows]);
  const [states, setStates] = useState<Record<string, WorkRetryState>>({});
  const busy = useRef(new Set<string>());
  const mounted = useRef(true);
  const completed = useRef(new Set<string>());
  const [records, setRecords] = useState<Record<string, RunRecord>>({});
  const [deadlines, setDeadlines] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!Object.keys(deadlines).length) return;
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (Object.values(deadlines).some((deadline) => deadline <= time)) {
        setRows((current) => removeExpiredWorkRetries(current, deadlines, time));
        setDeadlines((current) => Object.fromEntries(Object.entries(current).filter(([, deadline]) => deadline > time)));
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [deadlines]);
  const setState = (workId: string, state: WorkRetryState) => setStates((current) => ({ ...current, [workId]: state }));
  const finish = (workId: string, result: WorkRetryResult) => {
    if (!mounted.current || completed.current.has(workId)) return;
    setRows((current) => applyWorkRetryResult(current, workId, result));
    setState(workId, result.kind === 'accepted' ? 'submitted' : result.kind === 'failed' ? 'execution-failed' : result.kind);
    if (result.kind === 'succeeded') {
      completed.current.add(workId);
      const time = Date.now();
      setNow(time);
      setRecords((current) => ({ ...current, [workId]: result.record }));
      setDeadlines((current) => ({ ...current, [workId]: time + retryRemovalDelayMs }));
    } else if (result.kind !== 'accepted') busy.current.delete(workId);
  };
  const retry = async (row: OverviewAnomalyRow, result: WorkRetryResult = { kind: 'accepted' }) => {
    if (!row.workId || busy.current.has(row.workId) || completed.current.has(row.workId)) return;
    busy.current.add(row.workId);
    setState(row.workId, 'submitting');
    // 原型仅模拟提交反馈；不调用生产接口、不把提交成功当作执行成功。
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    finish(row.workId, result);
  };
  const remainingSeconds = Object.fromEntries(Object.entries(deadlines).map(([workId, deadline]) => [workId, getRetryRemovalSeconds(deadline, now)]));
  return { rows, states, records, remainingSeconds, retry, finish };
}

export function OverviewAnomalyRecord({ row, state = 'idle', recordKey = row.runRecordKey, remainingSeconds, onRetry, onView }: {
  row: OverviewAnomalyRow; state?: WorkRetryState; recordKey?: string; remainingSeconds?: number; onRetry: () => void; onView: () => void;
}) {
  return <div>
    <div className={styles.anomalyRow}>
      <AnomalyText text={row.storeName} extra={<>发生时间：{row.occurredAt}</>} />
      <AnomalyText text={row.planName} />
      <AnomalyText text={row.issueType} extra={row.errorCode ? `错误码：${row.errorCode}` : undefined} />
      <AnomalyText text={row.reason} />
      <WorkRetryButton state={state} workId={row.workId} onRetry={onRetry} />
      <WorkViewButton recordKey={recordKey} onView={onView} />
    </div>
    <WorkRetryFeedback state={state} planName={row.planName} recordKey={recordKey} remainingSeconds={remainingSeconds} onView={onView} />
  </div>;
}
