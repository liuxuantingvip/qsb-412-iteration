import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export type RequirementKey =
  | 'basePortal'
  | 'cloudResourceAutomation'
  | 'autoRetryOptimization'
  | 'businessCustomParameterExperience'
  | 'qsbOverview'
  | 'openApiOptimization'
  | 'etlDataMonitoringOptimization'
  | 'runDetailStorageLog'
  | 'portalOperationLog'
  | 'messageCenter'
  | 'pushStrategyOptimization';

const RequirementContext = createContext<RequirementKey>('cloudResourceAutomation');

export function RequirementProvider({
  value,
  children,
}: {
  value: RequirementKey;
  children: ReactNode;
}) {
  return <RequirementContext.Provider value={value}>{children}</RequirementContext.Provider>;
}

export function useActiveRequirement() {
  return useContext(RequirementContext);
}
