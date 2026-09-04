export type PushChannelType = 'DINGTALK' | 'FEISHU' | 'WECOM';
export type EnabledStatus = 'ENABLED' | 'DISABLED';
export type RelatedObjectType = 'TASK' | 'SHOP' | 'DATA_TABLE' | 'MONITOR_VIEW';
export type ScheduleCycle = 'DAY' | 'WEEK' | 'MONTH';
export type PushResult = 'SUCCESS' | 'FAILED';
export type PushMode = 'SCHEDULED' | 'REALTIME';
export type StrategyMessageType = 'PROGRESS' | 'EXCEPTION_SUMMARY' | 'EXCEPTION_ALERT' | 'SUCCESS_ALERT' | 'LOGIN_EXCEPTION';

export interface PushChannel {
  id: string;
  name: string;
  type: PushChannelType;
  status: EnabledStatus;
  webhook: string;
  secret: string;
  referenceCount: number;
  referencedStrategies: string[];
  testedAt?: string;
  updatedAt: string;
}

export interface PushTimeRange {
  id: string;
  time: string;
}

export interface PushSchedule {
  cycle: ScheduleCycle;
  weekDays: number[];
  monthDays: Array<number | 'LAST_DAY'>;
  timeRanges: PushTimeRange[];
}

export interface RelatedObjectOption {
  id: string;
  type: RelatedObjectType;
  name: string;
  group: string;
  productCategory: string;
  planType?: '日常' | '实时' | '回溯';
  planNames?: string[];
  shopNames?: string[];
  completedExecutions?: number;
  delivery?: 'success' | 'failed' | 'running';
  detail?: string;
  errorCode?: string;
  loginFailureDetail?: string;
  loginPlanNames?: string[];
  loginShopNames?: string[];
  imagePrefix?: string;
  imageFailure?: string;
  monitorPerspective?: '店铺视角' | '数据表视角' | '业务参数视角';
  createdAt?: string;
  noAccess?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}

export interface PushStrategy {
  id: string;
  name: string;
  status: EnabledStatus;
  productCategory: string;
  productInvalid?: boolean;
  manualDisabled?: boolean;
  autoStopReasons?: Array<'PRODUCT' | 'OBJECTS'>;
  requiresManualEnable?: boolean;
  unavailableReason?: string;
  pushMode: PushMode;
  messageType: StrategyMessageType;
  relatedObjectType: RelatedObjectType;
  relatedMode: 'ALL' | 'CUSTOM';
  relatedObjectIds: string[];
  relatedObjectNames?: Record<string, string>;
  schedule: PushSchedule;
  channelIds: string[];
  systemStrategy?: boolean;
  updatedAt: string;
}

export interface PushHistory {
  id: string;
  pushedAt: string;
  productCategory: string;
  strategyName: string;
  relatedObjectName: string;
  messageContent: string;
  channelId: string;
  channelName?: string;
  channelType?: PushChannelType;
  snapshot?: import('./strategyRules').MessageSnapshot;
  result: PushResult;
  failureReason?: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
}

export interface PageQuery {
  page: number;
  pageSize: number;
}

export interface ChannelQuery extends PageQuery {
  name?: string;
  type?: PushChannelType;
  status?: EnabledStatus;
}

export interface StrategyQuery extends PageQuery {
  name?: string;
  status?: EnabledStatus;
}

export interface HistoryQuery extends PageQuery {
  dateRange?: string[];
  channelId?: string;
}

export interface ChannelDraft {
  id?: string;
  name: string;
  type: PushChannelType;
  status: EnabledStatus;
  webhook: string;
  secret: string;
}

export type StrategyDraft = Omit<PushStrategy, 'id' | 'updatedAt'> & { id?: string };
