import type { PaginationParamsType } from '@/interface';

export type TenantScopeType = 'qsb' | 'ding' | 'feishu';
export type DrawerMode = 'create' | 'edit' | 'detail';

export enum ProductTypeEnum {
  MALL_CONNECTOR = 1,
  BANK_CONNECTOR = 2,
  CLOUD_DESK = 3,
  ROBOT_TOKEN = 4,
  CLOUD_PHONE = 5,
  CROSS_BORDER_CONNECTOR = 7,
  CATERING_CONNECTOR = 8,
  PHONE_CONNECTOR = 9,
}

export type CloudOpenType = 'trial' | 'contract';
export type CloudResourceStatus =
  | 'opening'
  | 'opened'
  | 'open_failed'
  | 'renewing'
  | 'renew_failed'
  | 'release_period'
  | 'unsubscribing'
  | 'auto_unsubscribing'
  | 'unsubscribed'
  | 'unsubscribe_failed';

export interface CloudDesktopResource {
  bindStatus?: string;
  chargeType?: 'subscription' | 'pay_as_you_go';
  desktopId: string;
  desktopName: string;
  errorMessage?: string;
  expireTime?: string;
  status?: CloudResourceStatus;
}

export interface CloudOperationLog {
  api: string;
  clientToken: string;
  completedAt?: string;
  failCount: number;
  operationId: string;
  providerStatus: string;
  requestCount: number;
  unboundRobotTokenCount?: number;
  status: 'pending' | 'succeeded' | 'partial_failed' | 'failed';
  submittedAt: string;
  successCount: number;
  trigger: 'manual' | 'automatic' | 'retry';
}

export interface ConnectorInfo {
  connectorId: string;
  connectorName: string;
  canDelete?: number;
}

export interface AuthorizedProduct {
  authEndTime?: string;
  authStartTime?: string;
  authStatus?: 1 | 2;
  cloudType?: 'wuying' | 'huoshan' | 'tianyi';
  cloudOpenType?: CloudOpenType;
  cloudOperationLogs?: CloudOperationLog[];
  cloudResourceStatus?: CloudResourceStatus;
  cloudDesktopNames?: string[];
  cloudAccountId?: string;
  cloudAccountName?: string;
  releaseStartTime?: string;
  vendorClientToken?: string;
  vendorErrorMessage?: string;
  cloudDesktopResources?: CloudDesktopResource[];
  configType?: 1 | 2;
  connectorList?: ConnectorInfo[];
  couplerName: string;
  failCount?: number;
  imageId?: string;
  imageName?: string;
  instanceSpec?: string;
  releaseExpireTime?: string;
  resourceExpireTime?: string;
  vendorOperationId?: string;
  vendorOperationStatus?: string;
  vendorOperationTime?: string;
  vendorOperationTrigger?: 'manual' | 'automatic' | 'retry';
  vendorRequestCount?: number;
  productType: ProductTypeEnum;
  productTypeName: string;
  status: 0 | 1;
  successCount?: number;
  totalQty?: number;
}

export interface AuthorizationRecord {
  createByName: string;
  createTime: string;
  id: string;
  idx?: number;
  modifyByName: string;
  modifyTime: string;
  productList: AuthorizedProduct[];
  relationNo: string;
  scopeType: TenantScopeType;
  tenantAdministrator: string;
  tenantId: string;
  tenantName: string;
}

export interface AuthorizationListParams extends PaginationParamsType {
  createByName?: string;
  createTimeEnd?: string;
  createTimeStart?: string;
  modifyByName?: string;
  modifyTimeEnd?: string;
  modifyTimeStart?: string;
  productType?: ProductTypeEnum;
  scopeType?: TenantScopeType;
  tenantName?: string;
}

export interface TenantOption {
  adminName: string;
  id: string;
  name: string;
}

export interface AuthorizationFormValues {
  productList?: AuthorizedProduct[];
  relationNo?: string;
  tenantId?: string;
}

export interface ConnectorListParams extends PaginationParamsType {
  connectorName?: string;
  productType?: ProductTypeEnum;
}
