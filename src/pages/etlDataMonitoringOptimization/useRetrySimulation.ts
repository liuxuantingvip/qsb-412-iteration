import { useEffect, useRef, useState } from 'react';
import type { TaskStageFacts } from './statusModel';
import {
  acceptRetrySimulation,
  completeRetrySimulation,
  startRetrySimulation,
} from './retryConsistency';
import type {
  EffectiveAttemptMap,
  RetryKind,
  RetryPhase,
  RetrySimulationState,
} from './retryConsistency';

export type { RetryPhase } from './retryConsistency';

export interface RetryableDetailRecord extends TaskStageFacts {
  key: string;
  issueStage?: '取数执行' | '数据入库' | '数据校验';
  errorCode?: string;
  reason?: string;
  durationSeconds: number | string;
  actualImportTime: string;
}

export function useRetrySimulation(): {
  attempts: EffectiveAttemptMap;
  phases: Record<string, RetryPhase>;
  submitRetry: (
    record: RetryableDetailRecord,
    retryKind: RetryKind,
  ) => Promise<'accepted' | 'rejected'>;
} {
  const [attempts, setAttempts] = useState<EffectiveAttemptMap>({});
  const [phases, setPhases] = useState<Record<string, RetryPhase>>({});
  const simulationRef = useRef<RetrySimulationState>({ attempts: {}, phases: {} });
  const timerIds = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const acceptanceCancels = useRef<Array<() => void>>([]);

  useEffect(() => () => {
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];
    acceptanceCancels.current.forEach((cancel) => cancel());
    acceptanceCancels.current = [];
  }, []);

  const commitSimulation = (state: RetrySimulationState) => {
    simulationRef.current = state;
    setAttempts(state.attempts);
    setPhases(state.phases);
  };

  const waitForAcceptance = () => new Promise<boolean>((resolve) => {
    let cancel: () => void;
    const timerId = setTimeout(() => {
      timerIds.current = timerIds.current.filter((id) => id !== timerId);
      acceptanceCancels.current = acceptanceCancels.current.filter((item) => item !== cancel);
      resolve(true);
    }, 300);
    cancel = () => {
      clearTimeout(timerId);
      timerIds.current = timerIds.current.filter((id) => id !== timerId);
      acceptanceCancels.current = acceptanceCancels.current.filter((item) => item !== cancel);
      resolve(false);
    };
    timerIds.current.push(timerId);
    acceptanceCancels.current.push(cancel);
  });

  const submitRetry = async (
    record: RetryableDetailRecord,
    retryKind: RetryKind,
  ): Promise<'accepted' | 'rejected'> => {
    const started = startRetrySimulation(simulationRef.current, record, retryKind);
    if (started.result === 'rejected') return 'rejected';

    commitSimulation(started.state);
    if (!await waitForAcceptance()) return 'rejected';

    const accepted = acceptRetrySimulation(simulationRef.current, record, retryKind);
    if (accepted.result === 'rejected' || !accepted.attempt) return 'rejected';
    commitSimulation(accepted.state);
    const { version } = accepted.attempt;
    const timerId = setTimeout(() => {
      const completed = completeRetrySimulation(
        simulationRef.current,
        record.key,
        version,
        'success',
      );
      if (completed === simulationRef.current) return;

      commitSimulation(completed);
      timerIds.current = timerIds.current.filter((id) => id !== timerId);
    }, 1600);
    timerIds.current.push(timerId);

    return 'accepted';
  };

  return { attempts, phases, submitRetry };
}
