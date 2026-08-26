export type RunStatus = '待运行' | '运行中' | '成功' | '部分成功' | '失败';
export type RunIssueStage = 'login' | 'collection' | 'ingestion' | 'validation';

export interface RunRecord {
  key: string;
  planName: string;
  storeName: string;
  startTime: string;
  endTime: string;
  collectionStatus: RunStatus;
  validationStatus: RunStatus;
  storageStatus: RunStatus;
  storageNote?: string;
  issueStage?: RunIssueStage;
  issueReason?: string;
}

export type TriggerGroup =
  | '账号异常'
  | '平台异常'
  | '数据入库异常';
export type ExecuteMode = 'DYNAMIC' | 'SPECIFIED';
export type AssociationType = 'PLAN' | 'STORE';

export interface RetryStrategy {
  key: string;
  name: string;
  associationType: AssociationType;
  planScope: 'ALL' | 'CUSTOM';
  planCount: number;
  relatedPlans: RelatedPlan[];
  storeScope: 'ALL' | 'CUSTOM';
  storeCount: number;
  relatedStores: RelatedStore[];
  triggers: string[];
  triggerCodes: string[];
  retryCount: number;
  retryInterval: number;
  specifiedTime: boolean;
  timeRange: [string, string];
  executeMode: ExecuteMode;
  cloudResourceId?: string;
  enabled: boolean;
}

export interface RelatedPlan {
  key: string;
  name: string;
  type: string;
  platform: string;
  store: string;
}

export interface RelatedStore {
  key: string;
  name: string;
  platform: string;
  account: string;
}

export interface RetryStrategyDraft {
  key?: string;
  name: string;
  associationType: AssociationType;
  planScope: 'ALL' | 'CUSTOM';
  relatedPlans: RelatedPlan[];
  storeScope: 'ALL' | 'CUSTOM';
  relatedStores: RelatedStore[];
  triggerValues: Record<TriggerGroup, string[]>;
  retryCount: number;
  retryInterval: number;
  specifiedTime: boolean;
  timeRange: [string, string];
  executeMode: ExecuteMode;
  cloudResourceId?: string;
}

export interface MockResponse<T> {
  code: '10000';
  bizData: T;
}
