export type PushChannelType = 'DINGTALK' | 'FEISHU' | 'WECOM';
export type EnabledStatus = 'ENABLED' | 'DISABLED';
export type RelatedObjectType = 'TASK' | 'SHOP' | 'DATA_TABLE' | 'MONITOR_VIEW';
export type ScheduleCycle = 'DAY' | 'WEEK' | 'MONTH';
export type PushResult = 'SUCCESS' | 'FAILED';

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
  start: string;
  end: string;
}

export interface PushSchedule {
  cycle: ScheduleCycle;
  weekDays: number[];
  monthDays: number[];
  timeRanges: PushTimeRange[];
}

export interface RelatedObjectOption {
  id: string;
  type: RelatedObjectType;
  name: string;
  group: string;
  disabled?: boolean;
  invalid?: boolean;
}

export interface PushStrategy {
  id: string;
  name: string;
  status: EnabledStatus;
  productCategory: string;
  messageType: 'PROGRESS' | 'EXCEPTION' | 'LOGIN_EXCEPTION';
  relatedObjectType: RelatedObjectType;
  relatedMode: 'ALL' | 'CUSTOM';
  relatedObjectIds: string[];
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
