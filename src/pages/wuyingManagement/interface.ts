import type { PaginationParamsType } from '@/interface';

/** 请求参数 */
export interface ListParamsType extends PaginationParamsType {
  desktopName?: string;
  desktopId?: string;
  authTenantName?: string;
  sourceFrom?: string;
  desktopStatus?: string;
  robotStatus?: string;
  cloudType?: string;
  ticket?: string;
  todeskCode?: string;
  creationStartTime?: string;
  creationEndTime?: string;
}

/** 列表信息 */
export interface ListOneBackType {
  id?: string;
  desktopName?: string;
  desktopId?: string;
  ticket?: string;
  todeskCode?: string;
  cloudType?: string;
  cloudAccountName?: string;
  bindStatus?: string;
  chargeType?: string;
  creationTime?: string;
  expiredTime?: string;
  desktopStatus?: string;
  sessionUser?: string;
  authTenantName?: string;
  // /** 1:本地 2:云端 */
  // sourceFrom?: 1 | 2;
  // /**  1:在线 3:离线 */
  // onlineState?: 1 | 3;
  robotStatus?: string;
  vendorErrorMessage?: string;
  vendorOperationId?: string;
  vendorStatus?: string;
}

export interface AddParams {
  id?: string;
  storeName?: string;
  username?: string;
  password?: string;
  verificationPhone?: string;
  channel?: string;
  platform?: string;
  // relationType?: UserRelationTypeEnum;
  // userId?: string;
}

export interface DesktopInfo {
  desktopName?: string;
  desktopId?: string;
  todeskCode?: string;
  robotStatus?: string;
  configuration?: string;
  systemDiskSize: string;
  dataDiskSize: string;
  chargeType: string;
  ticket: string;
  expiredTime: string;
  cloudAccountName?: string;
  bindStatus?: string;
}

export interface StatisticInfo {
  totalNum?: number;
  runningNum?: number;
  runningPer?: number;
  connectedNum?: number;
  connectedPer?: number;
  stoppedNum: number;
  stoppedPer?: number;
  dataDiskSize: number;
  dataDiskPer?: number;
  expiredNum: number;
  expiredPer?: number;
  releasePeriodNum?: number;
  releasePeriodPer?: number;
  unsubscribingNum?: number;
  unsubscribingPer?: number;
  unsubscribeFailedNum?: number;
  unsubscribeFailedPer?: number;
}
