import type { OverviewAnomalyGroup, OverviewAnomalyRow } from './overviewContent.ts';
import type { RunRecord } from '../autoRetryOptimization/interface.ts';

export type WorkRetryState = 'idle' | 'submitting' | 'submitted' | 'submission-failed' | 'execution-failed' | 'succeeded';
export type WorkRetryResult =
  | { kind: 'submission-failed' | 'accepted' }
  | { kind: 'succeeded'; record: RunRecord }
  | { kind: 'failed'; latest: Pick<OverviewAnomalyRow, 'runRecordKey' | 'occurredAt' | 'issueType' | 'errorCode' | 'reason'> };

export function applyWorkRetryResult(rows: readonly OverviewAnomalyRow[], workId: string, result: WorkRetryResult): OverviewAnomalyRow[] {
  if (result.kind === 'failed') return rows.map((row) => row.workId === workId ? { ...row, ...result.latest } : row);
  // 提交反馈不覆盖异常；执行成功也先保留行，由六秒截止时间统一移除。
  return [...rows];
}

export const retryRemovalDelayMs = 6000;

export function getRetryRemovalSeconds(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function removeExpiredWorkRetries(rows: readonly OverviewAnomalyRow[], deadlines: Record<string, number>, now: number): OverviewAnomalyRow[] {
  return rows.filter((row) => deadlines[row.workId] === undefined || deadlines[row.workId] > now);
}

export function buildOverviewWorkRecord(group: OverviewAnomalyGroup, row: OverviewAnomalyRow): RunRecord {
  return {
    key: row.runRecordKey, workId: row.workId, errorCode: row.errorCode,
    planName: row.planName, storeName: row.storeName,
    occurredAt: row.occurredAt, startTime: '--', endTime: '--',
    collectionStatus: group.key === 'login' || group.key === 'collection' ? '失败' : '成功',
    storageStatus: group.key === 'ingestion' ? '失败' : group.key === 'validation' ? '成功' : '待运行',
    validationStatus: group.key === 'validation' ? '失败' : '待运行',
    issueStage: group.key, issueReason: row.reason,
  };
}
