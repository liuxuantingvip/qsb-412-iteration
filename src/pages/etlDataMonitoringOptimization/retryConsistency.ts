import type { TaskStageFacts } from './statusModel';

export type RetryKind = 'collect' | 'import';
export type RetryLifecycle = 'waiting' | 'completed';
export type RetryOutcome = 'success' | 'failure';
export type RetryPhase = 'submitting' | 'waiting' | 'completed' | 'submitFailed';

export interface EffectiveRetryAttempt extends TaskStageFacts {
  version: number;
  lifecycle: RetryLifecycle;
  retryKind: RetryKind;
  collectNoData?: boolean;
  issueStage?: '取数执行' | '数据入库' | '数据校验';
  errorCode?: string;
  reason?: string;
  durationSeconds: number | string;
  actualImportTime: string;
}

export type EffectiveAttemptMap = Record<string, EffectiveRetryAttempt>;

export interface RetrySimulationState {
  attempts: EffectiveAttemptMap;
  phases: Record<string, RetryPhase>;
}

export interface BeginRetrySimulationResult {
  state: RetrySimulationState;
  result: 'accepted' | 'rejected';
  attempt?: EffectiveRetryAttempt;
}

export interface BusinessDetailKeyParts {
  date: string;
  storeName: string;
  tableName: string;
  taskName: string;
}

const clearRetryFacts = () => ({
  collectErrorCode: undefined,
  importErrorCode: undefined,
  planElapsedMinutes: undefined,
  planTimeoutMinutes: undefined,
  collectNoData: undefined,
  issueStage: undefined,
  errorCode: undefined,
  reason: undefined,
});

export function canStartRetry(phase?: 'submitting' | 'waiting' | 'completed' | 'submitFailed'): boolean {
  return phase !== 'submitting' && phase !== 'waiting';
}

export const createBusinessDetailKey = ({
  date,
  storeName,
  tableName,
  taskName,
}: BusinessDetailKeyParts): string => (
  [date, storeName, tableName, taskName]
    .map((value) => encodeURIComponent(value.trim().replace(/\s+/g, ' ').toLowerCase()))
    .join('|')
);

export function availableRetryKinds(record: {
  collectStatus: string;
  importStatus: string;
}): RetryKind[] {
  if (record.collectStatus === '失败' || record.collectStatus === '平台未更新') return ['collect'];
  if (record.collectStatus === '成功' && record.importStatus === '失败') return ['import'];
  return [];
}

export function acceptRetryAttempt(
  current: TaskStageFacts & { version?: number },
  retryKind: RetryKind,
): EffectiveRetryAttempt {
  if (!availableRetryKinds(current).includes(retryKind)) {
    throw new Error(`不允许重试：${retryKind}`);
  }

  return {
    ...clearRetryFacts(),
    version: (current.version ?? 1) + 1,
    lifecycle: 'waiting',
    retryKind,
    collectStatus: retryKind === 'collect' ? '等待' : '成功',
    importStatus: retryKind === 'collect' ? '无任务' : '等待',
    validationStatus: '无任务',
    durationSeconds: '--',
    actualImportTime: '--',
  };
}

export function prepareRetryAttempt(
  record: TaskStageFacts & { version?: number },
  activeAttempt: EffectiveRetryAttempt | undefined,
  retryKind: RetryKind,
): EffectiveRetryAttempt {
  return acceptRetryAttempt(activeAttempt ?? record, retryKind);
}

export function startRetrySimulation(
  state: RetrySimulationState,
  record: TaskStageFacts & { key: string; version?: number },
  retryKind: RetryKind,
): BeginRetrySimulationResult {
  const current = state.attempts[record.key] ?? record;
  if (!canStartRetry(state.phases[record.key]) || !availableRetryKinds(current).includes(retryKind)) {
    return { state, result: 'rejected' };
  }

  return {
    state: {
      attempts: state.attempts,
      phases: { ...state.phases, [record.key]: 'submitting' },
    },
    result: 'accepted',
  };
}

export function acceptRetrySimulation(
  state: RetrySimulationState,
  record: TaskStageFacts & { key: string; version?: number },
  retryKind: RetryKind,
): BeginRetrySimulationResult {
  if (state.phases[record.key] !== 'submitting') return { state, result: 'rejected' };

  try {
    const attempt = prepareRetryAttempt(record, state.attempts[record.key], retryKind);
    return {
      state: {
        attempts: { ...state.attempts, [record.key]: attempt },
        phases: { ...state.phases, [record.key]: 'waiting' },
      },
      result: 'accepted',
      attempt,
    };
  } catch {
    return { state, result: 'rejected' };
  }
}

export function beginRetrySimulation(
  state: RetrySimulationState,
  record: TaskStageFacts & { key: string; version?: number },
  retryKind: RetryKind,
): BeginRetrySimulationResult {
  const started = startRetrySimulation(state, record, retryKind);
  return started.result === 'accepted'
    ? acceptRetrySimulation(started.state, record, retryKind)
    : started;
}

export function settleRetryAttempt(
  current: EffectiveRetryAttempt,
  expectedVersion: number,
  outcome: RetryOutcome,
): EffectiveRetryAttempt {
  if (current.version !== expectedVersion || current.lifecycle !== 'waiting') return current;
  return resolveRetryAttempt(current, outcome);
}

export function completeRetrySimulation(
  state: RetrySimulationState,
  key: string,
  expectedVersion: number,
  outcome: RetryOutcome,
): RetrySimulationState {
  const current = state.attempts[key];
  if (!current) return state;

  const attempt = settleRetryAttempt(current, expectedVersion, outcome);
  if (attempt === current) return state;

  return {
    attempts: { ...state.attempts, [key]: attempt },
    phases: { ...state.phases, [key]: 'completed' },
  };
}

function resolveRetryAttempt(
  attempt: EffectiveRetryAttempt,
  outcome: RetryOutcome,
): EffectiveRetryAttempt {
  const cleanAttempt = { ...attempt, ...clearRetryFacts() };

  if (outcome === 'success') {
    return {
      ...cleanAttempt,
      lifecycle: 'completed',
      collectStatus: '成功',
      importStatus: '成功',
      validationStatus: '正常',
    };
  }

  const failedStage: '取数执行' | '数据入库' = attempt.retryKind === 'collect' ? '取数执行' : '数据入库';
  return {
    ...cleanAttempt,
    lifecycle: 'completed',
    collectStatus: attempt.retryKind === 'collect' ? '失败' : '成功',
    importStatus: attempt.retryKind === 'import' ? '失败' : '无任务',
    validationStatus: '无任务',
    issueStage: failedStage,
    reason: '本次重试失败',
  };
}

export function applyEffectiveAttempts<T extends { key: string; version?: number; lifecycle?: RetryLifecycle }>(
  records: readonly T[],
  attempts: EffectiveAttemptMap,
): Array<T & EffectiveRetryAttempt> {
  return records.map((record) => {
    const candidate = attempts[record.key];
    if (!candidate) return record as T & EffectiveRetryAttempt;
    if (record.version !== undefined && candidate.version < record.version) return record as T & EffectiveRetryAttempt;
    if (record.version !== undefined && candidate.version === record.version
      && record.lifecycle === 'completed' && candidate.lifecycle === 'waiting') {
      return record as T & EffectiveRetryAttempt;
    }
    return { ...record, ...candidate } as T & EffectiveRetryAttempt;
  });
}
