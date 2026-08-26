import { FrameWorkPortalSuccessCode, PaginationInitData } from '@/constants';
import type { ApiResponseBackType, ListBackType } from '@/interface';
import {
  cloudProviderPolicies,
  getCloudOperationsForResources,
  getCloudResource,
  queryCloudUnsubscribeOperation,
  registerCloudResources,
  submitCloudUnsubscribe,
} from '@/mocks/cloudLifecycle';
import type {
  CloudOperationResourceInput,
  CloudOperationTrigger,
  CloudUnsubscribeOperation,
  CloudProviderPolicy,
  CloudType,
} from '@/mocks/cloudLifecycle';
import { setIdxForPaginationData } from '@/utils/utils';
import type {
  AuthorizationFormValues,
  AuthorizationListParams,
  AuthorizationRecord,
  AuthorizedProduct,
  CloudDesktopResource,
  ConnectorInfo,
  ConnectorListParams,
  TenantOption,
  TenantScopeType,
} from './interface';
import { ProductTypeEnum } from './interface';

export const tenantScopeItems = [
  { key: 'qsb', label: '取数宝' },
  { key: 'ding', label: '钉钉' },
  { key: 'feishu', label: '飞书' },
];

export const productTypeOptions = [
  { label: '电商数据源', value: ProductTypeEnum.MALL_CONNECTOR },
  { label: '网银数据源', value: ProductTypeEnum.BANK_CONNECTOR },
  { label: '云桌面机器人', value: ProductTypeEnum.CLOUD_DESK },
  { label: '机器人令牌', value: ProductTypeEnum.ROBOT_TOKEN },
  { label: '联通虚拟云号', value: ProductTypeEnum.CLOUD_PHONE },
  { label: '跨境电商数据源', value: ProductTypeEnum.CROSS_BORDER_CONNECTOR },
  { label: '餐饮数据源', value: ProductTypeEnum.CATERING_CONNECTOR },
  { label: '手机数据源', value: ProductTypeEnum.PHONE_CONNECTOR },
];

export { cloudProviderPolicies };
export type { CloudProviderPolicy };

type CloudCatalogOption = {
  compatibleSpecs: string[];
  label: string;
  value: string;
};

const cloudSpecOptions: Record<Exclude<CloudType, 'wuying'>, Array<{ label: string; value: string }>> = {
  huoshan: [
    { label: '计算型 c3al · 4核8G', value: 'ecs.c3al.xlarge' },
    { label: '通用型 g3i · 4核16G', value: 'ecs.g3i.xlarge' },
    { label: '内存型 r3i · 4核32G', value: 'ecs.r3i.xlarge' },
  ],
  tianyi: [
    { label: '通用型 4核8G', value: '通用型 4核8G' },
    { label: '通用型 8核16G', value: '通用型 8核16G' },
    { label: '性能型 4核8G', value: '性能型 4核8G' },
  ],
};

const cloudImageCatalog: Record<Exclude<CloudType, 'wuying'>, CloudCatalogOption[]> = {
  huoshan: [
    {
      compatibleSpecs: ['ecs.c3al.xlarge', 'ecs.g3i.xlarge', 'ecs.r3i.xlarge'],
      label: '取数宝自动化运行环境镜像 · 2026.07',
      value: 'img-qsb-runner-202607',
    },
    {
      compatibleSpecs: ['ecs.c3al.xlarge', 'ecs.g3i.xlarge'],
      label: '取数宝 Windows Server 2022 基础镜像',
      value: 'img-qsb-win2022-base',
    },
    {
      compatibleSpecs: ['ecs.c3al.xlarge'],
      label: '取数宝浏览器增强镜像',
      value: 'img-qsb-browser-plus',
    },
  ],
  tianyi: [
    {
      compatibleSpecs: ['通用型 4核8G', '通用型 8核16G', '性能型 4核8G'],
      label: '取数宝天翼云自定义镜像 · 2026.07',
      value: 'ct-img-qsb-custom-202607',
    },
    {
      compatibleSpecs: ['通用型 4核8G', '通用型 8核16G'],
      label: '取数宝浏览器自动化镜像',
      value: 'ct-img-qsb-browser',
    },
  ],
};

const lastUsedCloudImage: Record<Exclude<CloudType, 'wuying'>, string> = {
  huoshan: 'img-qsb-runner-202607',
  tianyi: 'ct-img-qsb-custom-202607',
};

type CloudOperationResult = {
  api: string;
  operation: string;
  orderId?: string;
  providerStatus?: string;
  requestCount: number;
  requestId: string;
};

type CloudUnsubscribeStatus =
  | 'unsubscribing'
  | 'auto_unsubscribing'
  | 'unsubscribed'
  | 'unsubscribe_failed';

const completedCloudOperations = new Map<string, CloudOperationResult>();
const scheduledOperationQueries = new Set<string>();

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

const drawerProductInfo: Record<ProductTypeEnum, { couplerName: string; tableName: string }> = {
  [ProductTypeEnum.MALL_CONNECTOR]: { couplerName: '电商数据源', tableName: '电商数据源' },
  [ProductTypeEnum.BANK_CONNECTOR]: { couplerName: '网银数据源', tableName: '网银数据源' },
  [ProductTypeEnum.CLOUD_DESK]: { couplerName: '云桌面机器人', tableName: '云桌面机器人' },
  [ProductTypeEnum.ROBOT_TOKEN]: { couplerName: '机器人令牌', tableName: '机器人令牌' },
  [ProductTypeEnum.CLOUD_PHONE]: { couplerName: '联通虚拟云号', tableName: '联通虚拟云号' },
  [ProductTypeEnum.CROSS_BORDER_CONNECTOR]: {
    couplerName: '跨境数据源',
    tableName: '跨境电商数据源',
  },
  [ProductTypeEnum.CATERING_CONNECTOR]: { couplerName: '餐饮数据源', tableName: '餐饮数据源' },
  [ProductTypeEnum.PHONE_CONNECTOR]: { couplerName: '手机数据源', tableName: '手机数据源' },
};

const productOrder = [
  ProductTypeEnum.MALL_CONNECTOR,
  ProductTypeEnum.CROSS_BORDER_CONNECTOR,
  ProductTypeEnum.BANK_CONNECTOR,
  ProductTypeEnum.CATERING_CONNECTOR,
  ProductTypeEnum.PHONE_CONNECTOR,
  ProductTypeEnum.ROBOT_TOKEN,
  ProductTypeEnum.CLOUD_PHONE,
  ProductTypeEnum.CLOUD_DESK,
];

const tenantOptionsByScope: Record<TenantScopeType, TenantOption[]> = {
  qsb: [
    { id: '2072493736014692354', name: '林华', adminName: '林华' },
    { id: '1713811908194594821', name: 'qiushui2', adminName: '凌波' },
    { id: '1713811908194594820', name: '取数宝授权三', adminName: '长乐2' },
    { id: '1713811908194594818', name: '实在智能科技有限公司', adminName: '城之内' },
    { id: '1713811908194594819', name: '实在智能科技有限公司-上海', adminName: '城之内' },
    { id: '1713811908194594822', name: '中海油数字化智能门户', adminName: '马丁' },
    { id: '1713811908194594823', name: '中海油数字化智能门户-深圳分部', adminName: '马丁' },
    { id: '1713811908194594824', name: '实在智能科技有限公司-华东运营中心', adminName: '景天测试' },
  ],
  ding: [
    { id: '2074785034964877313', name: 'DingDing_ddd13', adminName: 'DingDing_ddd13' },
    { id: '2074785034964877314', name: 'DingDing_demo', adminName: 'DingDing_demo' },
    { id: '2074785034964877315', name: 'DingDing_default', adminName: 'DingDing_default' },
  ],
  feishu: [
    { id: '2074785034964877413', name: '飞书演示租户', adminName: '飞书管理员' },
    { id: '2074785034964877414', name: '飞书生态测试租户', adminName: '飞书生态测试' },
  ],
};

const tenantOptions = Object.values(tenantOptionsByScope).flat();

const operatorNames = ['林炎2', '凌波', '景天测试', '长乐2', '城之内', '马丁'];
const connectorNames = [
  '全部',
  'shenlilinghua',
  'linhua',
  'MIHAYOUhuahuo-1',
  '标准',
  '试用',
  '老客户',
  '钉钉生态',
  '应用包612_3',
  '淘宝前台登录',
  '钉钉Agent登录',
];

function success<T>(bizData?: T): ApiResponseBackType<T> {
  return { code: FrameWorkPortalSuccessCode, bizData };
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDay(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function parseDateTime(value?: string) {
  if (!value) return null;
  const timestamp = new Date(value.replace(' ', 'T')).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function buildReleaseWindow(authEndTime?: string) {
  const authEndTimestamp = parseDateTime(authEndTime);
  if (authEndTimestamp === null) return {};
  const releaseStart = new Date(authEndTimestamp + 1000);
  const releaseExpire = new Date(releaseStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);
  return {
    releaseExpireTime: formatDate(releaseExpire),
    releaseStartTime: formatDate(releaseStart),
  };
}

function applyCloudUnsubscribeState(
  item: AuthorizedProduct,
  status: CloudUnsubscribeStatus,
  options: {
    clientToken?: string;
    operationId?: string;
    trigger?: CloudOperationTrigger;
    vendorErrorMessage?: string;
    vendorStatus?: string;
  } = {},
): AuthorizedProduct {
  const pending = status === 'unsubscribing' || status === 'auto_unsubscribing';
  const completed = status === 'unsubscribed';
  const failed = status === 'unsubscribe_failed';
  const bindStatus = completed ? '已解绑' : pending ? '解绑中' : failed ? '解绑失败' : undefined;
  return {
    ...item,
    cloudDesktopResources: item.cloudDesktopResources?.map((resource) => ({
      ...resource,
      bindStatus: bindStatus || resource.bindStatus,
      errorMessage: failed ? options.vendorErrorMessage : undefined,
      status,
    })),
    cloudResourceStatus: status,
    failCount: completed ? 0 : failed ? item.totalQty || 1 : item.failCount,
    releaseExpireTime: completed ? undefined : item.releaseExpireTime,
    releaseStartTime: completed ? undefined : item.releaseStartTime,
    successCount: completed || failed ? 0 : item.successCount,
    vendorClientToken: options.clientToken || item.vendorClientToken,
    vendorErrorMessage: failed ? options.vendorErrorMessage || '云厂商释放失败' : undefined,
    vendorOperationId: options.operationId || item.vendorOperationId,
    vendorOperationStatus: options.vendorStatus || item.vendorOperationStatus,
    vendorOperationTime: options.operationId ? formatDate(new Date()) : item.vendorOperationTime,
    vendorOperationTrigger: options.trigger || item.vendorOperationTrigger,
  };
}

function operationToLog(operation: CloudUnsubscribeOperation) {
  const unboundRobotTokenCount = operation.successCount;
  return {
    api: operation.api,
    clientToken: operation.clientToken,
    completedAt: operation.completedAt,
    failCount: operation.failCount,
    operationId: operation.operationId,
    providerStatus: operation.providerStatus,
    requestCount: operation.requestCount,
    unboundRobotTokenCount,
    status: operation.status,
    submittedAt: operation.submittedAt,
    successCount: operation.successCount,
    trigger: operation.trigger,
  };
}

function applyCloudUnsubscribeOperation(
  item: AuthorizedProduct,
  operation: CloudUnsubscribeOperation,
): AuthorizedProduct {
  const resultMap = new Map(operation.resourceResults.map((resource) => [resource.resourceId, resource]));
  const pendingStatus: AuthorizedProduct['cloudResourceStatus'] =
    operation.trigger === 'automatic' ? 'auto_unsubscribing' : 'unsubscribing';
  const nextResources: CloudDesktopResource[] = (item.cloudDesktopResources || []).map((resource) => {
    const result = resultMap.get(resource.desktopId);
    if (!result) return resource;
    const status: CloudDesktopResource['status'] =
      result.status === 'pending'
        ? pendingStatus
        : result.status === 'succeeded'
          ? 'unsubscribed'
          : 'unsubscribe_failed';
    return {
      ...resource,
      bindStatus:
        item.cloudType === 'tianyi'
          ? result.status === 'pending'
            ? '解绑中'
            : result.status === 'succeeded'
              ? '已解绑'
              : '解绑失败'
          : resource.bindStatus,
      errorMessage: result.errorMessage,
      expireTime: result.status === 'succeeded' ? undefined : resource.expireTime,
      status,
    };
  });
  const hasPending = nextResources.some((resource) =>
    ['unsubscribing', 'auto_unsubscribing'].includes(resource.status || ''),
  );
  const failCount = nextResources.filter((resource) => resource.status === 'unsubscribe_failed').length;
  const unsubscribedCount = nextResources.filter((resource) => resource.status === 'unsubscribed').length;
  const allUnsubscribed = nextResources.length > 0 && unsubscribedCount === nextResources.length;
  const nextStatus: AuthorizedProduct['cloudResourceStatus'] = hasPending
    ? pendingStatus
    : failCount > 0
      ? 'unsubscribe_failed'
      : allUnsubscribed
        ? 'unsubscribed'
        : item.cloudResourceStatus;
  const nextLog = operationToLog(operation);
  const cloudOperationLogs = [
    ...(item.cloudOperationLogs || []).filter((log) => log.operationId !== operation.operationId),
    nextLog,
  ];
  return {
    ...item,
    cloudDesktopResources: nextResources,
    cloudOperationLogs,
    cloudResourceStatus: nextStatus,
    failCount,
    releaseExpireTime: allUnsubscribed ? undefined : item.releaseExpireTime,
    releaseStartTime: allUnsubscribed ? undefined : item.releaseStartTime,
    successCount: nextResources.filter((resource) =>
      ['opened', 'release_period'].includes(resource.status || ''),
    ).length,
    vendorClientToken: operation.clientToken,
    vendorErrorMessage:
      failCount > 0
        ? operation.status === 'partial_failed'
          ? `${failCount} 台释放失败，${operation.successCount} 台已释放`
          : operation.resourceResults.find((resource) => resource.errorMessage)?.errorMessage || '云厂商释放失败'
        : undefined,
    vendorOperationId: operation.operationId,
    vendorOperationStatus: operation.providerStatus,
    vendorOperationTime: operation.completedAt || operation.submittedAt,
    vendorOperationTrigger: operation.trigger,
    vendorRequestCount: operation.requestCount,
  };
}

function buildOperationResources(item: AuthorizedProduct): CloudOperationResourceInput[] {
  return (item.cloudDesktopResources || []).map((resource) => ({
    chargeType: resource.chargeType || 'subscription',
    expireTime: resource.expireTime || item.resourceExpireTime || item.authEndTime,
    resourceId: resource.desktopId,
    resourceName: resource.desktopName,
    simulateFailure: resource.errorMessage === '模拟云厂商释放失败',
  }));
}

function registerAuthorizationCloudResources(overwrite = false) {
  const resources = Object.values(authorizationRows).flatMap((records) =>
    records.flatMap((record) =>
      record.productList.flatMap((item) =>
        item.productType === ProductTypeEnum.CLOUD_DESK
          ? (item.cloudDesktopResources || [])
              .filter((resource) => resource.desktopId)
              .map((resource) => ({
                bindStatus: resource.bindStatus,
                chargeType: resource.chargeType || ('subscription' as const),
                cloudType: item.cloudType || ('wuying' as const),
                errorMessage: resource.errorMessage,
                expireTime: resource.expireTime || item.resourceExpireTime || item.authEndTime,
                resourceId: resource.desktopId,
                resourceName: resource.desktopName,
                source: 'tenant_authorization' as const,
                status: resource.status || item.cloudResourceStatus || ('opened' as const),
                tenantName: record.tenantName,
                vendorOperationId: item.vendorOperationId,
                vendorStatus: item.vendorOperationStatus,
              }))
          : [],
      ),
    ),
  );
  registerCloudResources(resources, overwrite);
}

function syncAuthorizationRowsFromSharedResources() {
  authorizationRows = Object.fromEntries(
    Object.entries(authorizationRows).map(([scopeType, records]) => [
      scopeType,
      records.map((record) => ({
        ...record,
        productList: record.productList.map((item) => {
          if (item.productType !== ProductTypeEnum.CLOUD_DESK || !item.cloudDesktopResources?.length) return item;
          const nextResources = item.cloudDesktopResources.map((resource) => {
            const shared = getCloudResource(resource.desktopId);
            return shared
              ? {
                  ...resource,
                  bindStatus: shared.bindStatus,
                  errorMessage: shared.errorMessage,
                  expireTime: shared.expireTime,
                  status: shared.status,
                }
              : resource;
          });
          const operations = getCloudOperationsForResources(nextResources.map((resource) => resource.desktopId));
          const nextItem = { ...item, cloudDesktopResources: nextResources };
          return operations.length ? applyCloudUnsubscribeOperation(nextItem, operations[operations.length - 1]) : nextItem;
        }),
      })),
    ]),
  ) as Record<TenantScopeType, AuthorizationRecord[]>;
}

function applyOperationToAuthorizationRows(operation: CloudUnsubscribeOperation) {
  authorizationRows = Object.fromEntries(
    Object.entries(authorizationRows).map(([scopeType, records]) => [
      scopeType,
      records.map((record) => ({
        ...record,
        productList: record.productList.map((item) =>
          item.productType === ProductTypeEnum.CLOUD_DESK &&
          item.cloudDesktopResources?.some((resource) =>
            operation.resourceResults.some((result) => result.resourceId === resource.desktopId),
          )
            ? applyCloudUnsubscribeOperation(item, operation)
            : item,
        ),
      })),
    ]),
  ) as Record<TenantScopeType, AuthorizationRecord[]>;
  registerAuthorizationCloudResources(true);
}

function scheduleUnsubscribeResult(operation: CloudUnsubscribeOperation) {
  if (scheduledOperationQueries.has(operation.operationId)) return;
  scheduledOperationQueries.add(operation.operationId);
  void queryCloudUnsubscribeOperation(operation.operationId)
    .then(applyOperationToAuthorizationRows)
    .finally(() => scheduledOperationQueries.delete(operation.operationId));
}

let lifecycleReconcilePromise: Promise<void> | null = null;

function reconcileCloudResourceLifecycle() {
  if (lifecycleReconcilePromise) return lifecycleReconcilePromise;
  lifecycleReconcilePromise = (async () => {
    syncAuthorizationRowsFromSharedResources();
    const now = Date.now();
    const nextRows = { ...authorizationRows };
    for (const key of Object.keys(nextRows)) {
      const scopeType = key as TenantScopeType;
      const nextRecords: AuthorizationRecord[] = [];
      for (const record of nextRows[scopeType]) {
        let automaticOperationSubmitted = false;
        const nextProducts: AuthorizedProduct[] = [];
        for (const item of record.productList) {
          if (item.productType !== ProductTypeEnum.CLOUD_DESK || item.status !== 1) {
            nextProducts.push(item);
            continue;
          }
          let nextItem = item;
          if (nextItem.cloudResourceStatus === 'opened') {
            const authEndTimestamp = parseDateTime(nextItem.authEndTime);
            if (authEndTimestamp !== null && authEndTimestamp < now) {
              nextItem = {
                ...nextItem,
                ...buildReleaseWindow(nextItem.authEndTime),
                cloudDesktopResources: nextItem.cloudDesktopResources?.map((resource) => ({
                  ...resource,
                  status: 'release_period',
                })),
                cloudResourceStatus: 'release_period',
              };
            }
          }
          if (nextItem.cloudResourceStatus === 'release_period') {
            const releaseExpireTimestamp = parseDateTime(nextItem.releaseExpireTime);
            if (releaseExpireTimestamp !== null && releaseExpireTimestamp < now) {
              const clientToken = `auto-release-${record.id}-${nextItem.releaseExpireTime}`;
              try {
                const operation = await submitCloudUnsubscribe({
                  clientToken,
                  cloudType: nextItem.cloudType || 'wuying',
                  resources: buildOperationResources(nextItem),
                  trigger: 'automatic',
                });
                nextItem = applyCloudUnsubscribeOperation(nextItem, operation);
                automaticOperationSubmitted = true;
                scheduleUnsubscribeResult(operation);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '自动释放提交失败';
                nextItem = applyCloudUnsubscribeState(nextItem, 'unsubscribe_failed', {
                  clientToken,
                  trigger: 'automatic',
                  vendorErrorMessage: errorMessage,
                  vendorStatus: '释放失败',
                });
              }
            }
          }
          nextProducts.push(nextItem);
        }
        nextRecords.push({
          ...record,
          modifyByName: automaticOperationSubmitted ? '系统自动任务' : record.modifyByName,
          modifyTime: automaticOperationSubmitted ? formatDate(new Date()) : record.modifyTime,
          productList: nextProducts,
        });
      }
      nextRows[scopeType] = nextRecords;
    }
    authorizationRows = nextRows;
    registerAuthorizationCloudResources(true);
  })().finally(() => {
    lifecycleReconcilePromise = null;
  });
  return lifecycleReconcilePromise;
}

function tenantShortName(name: string) {
  return (name.replace(/有限公司|有限责任公司|科技|智能|数字化|门户|[-_\s]/g, '') || name).slice(0, 6);
}

function tenantAccountName(name: string, tenantId: string) {
  const asciiName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (asciiName) return asciiName;
  if (name === '林华') return 'linhua';
  if (name === '取数宝授权三') return 'qsb-shouquan-3';
  return `ty-${tenantId.slice(-6)}`;
}

function buildTianyiDesktopNames(tenantName: string, totalQty: number) {
  const prefix = tenantShortName(tenantName);
  return Array.from({ length: Math.max(1, totalQty) }).map(
    (_, index) => `${prefix}${String(index + 1).padStart(3, '0')}`,
  );
}

function buildCloudDesktopNames(tenantName: string, totalQty: number, digits = 2) {
  const prefix = tenantShortName(tenantName);
  return Array.from({ length: Math.max(1, totalQty) }).map(
    (_, index) => `${prefix}${String(index + 1).padStart(digits, '0')}`,
  );
}

function normalizeCloudDesktopNames(
  tenantName: string,
  totalQty: number,
  names: string[] = [],
  digits = 2,
) {
  const defaultNames = buildCloudDesktopNames(tenantName, totalQty, digits);
  return defaultNames.map((defaultName, index) => names[index] || defaultName);
}

function buildTianyiResources(
  tenantName: string,
  tenantId: string,
  totalQty: number,
  endTime: string,
  status: AuthorizedProduct['cloudResourceStatus'] = 'opened',
  failedIndex?: number,
): Pick<
  AuthorizedProduct,
  | 'cloudAccountId'
  | 'cloudAccountName'
  | 'cloudDesktopNames'
  | 'cloudDesktopResources'
> {
  const desktopNames = buildTianyiDesktopNames(tenantName, totalQty);
  const resources: CloudDesktopResource[] = desktopNames.map((desktopName, index) => {
    const failed = failedIndex === index;
    return {
      bindStatus: failed ? '用户绑定失败' : '用户已绑定',
      desktopId: `cty-ecd-${tenantId.slice(-4)}-${String(index + 1).padStart(3, '0')}`,
      desktopName,
      errorMessage: failed ? '云电脑绑定用户失败，等待重试' : undefined,
      expireTime: endTime,
      status: failed ? 'open_failed' : status,
    };
  });

  return {
    cloudAccountId: `ct-user-${tenantId.slice(-8)}`,
    cloudAccountName: tenantAccountName(tenantName, tenantId),
    cloudDesktopNames: desktopNames,
    cloudDesktopResources: resources,
  };
}

function product(
  productType: ProductTypeEnum,
  totalQty: number,
  startDate: Date,
  endDate: Date,
  configType: 1 | 2 = 1,
  connectors: string[] = [],
): AuthorizedProduct {
  const info = drawerProductInfo[productType];
  return {
    authEndTime: `${formatDay(endDate)} 23:59:59`,
    authStartTime: `${formatDay(startDate)} 00:00:00`,
    authStatus: 2,
    cloudOpenType: productType === ProductTypeEnum.CLOUD_DESK ? 'contract' : undefined,
    cloudResourceStatus: productType === ProductTypeEnum.CLOUD_DESK ? 'opened' : undefined,
    cloudType: productType === ProductTypeEnum.CLOUD_DESK ? 'wuying' : undefined,
    configType,
    connectorList:
      configType === 2
        ? connectors.map((connectorName, index) => ({
            canDelete: 1,
            connectorId: `${productType}-${index}-${connectorName}`,
            connectorName,
          }))
        : [],
    couplerName: info.couplerName,
    failCount: productType === ProductTypeEnum.CLOUD_DESK ? 0 : undefined,
    productType,
    productTypeName: info.tableName,
    resourceExpireTime:
      productType === ProductTypeEnum.CLOUD_DESK ? `${formatDay(endDate)} 23:59:59` : undefined,
    status: 1,
    successCount: productType === ProductTypeEnum.CLOUD_DESK ? 0 : undefined,
    totalQty,
  };
}

export function createDefaultProductList(): AuthorizedProduct[] {
  return productOrder.map((productType) => ({
    authEndTime: '',
    authStartTime: '',
    authStatus: 2,
    cloudOpenType: productType === ProductTypeEnum.CLOUD_DESK ? 'trial' : undefined,
    cloudResourceStatus: productType === ProductTypeEnum.CLOUD_DESK ? 'opening' : undefined,
    cloudType: productType === ProductTypeEnum.CLOUD_DESK ? 'wuying' : undefined,
    configType:
      productType === ProductTypeEnum.MALL_CONNECTOR ||
      productType === ProductTypeEnum.BANK_CONNECTOR ||
      productType === ProductTypeEnum.CROSS_BORDER_CONNECTOR ||
      productType === ProductTypeEnum.CATERING_CONNECTOR ||
      productType === ProductTypeEnum.PHONE_CONNECTOR
        ? 1
        : undefined,
    connectorList: [],
    couplerName: drawerProductInfo[productType].couplerName,
    productType,
    productTypeName: drawerProductInfo[productType].tableName,
    resourceExpireTime: '',
    status: 0,
    totalQty: undefined,
  }));
}

function cloneProductList(productList: AuthorizedProduct[]) {
  return productList.map((item) => ({
    ...item,
    cloudDesktopNames: item.cloudDesktopNames ? [...item.cloudDesktopNames] : [],
    cloudDesktopResources: item.cloudDesktopResources?.map((resource) => ({ ...resource })) || [],
    cloudOperationLogs: item.cloudOperationLogs?.map((log) => ({ ...log })) || [],
    connectorList: item.connectorList?.map((connector) => ({ ...connector })) || [],
  }));
}

function finalizeCreatedCloudProducts(productList: AuthorizedProduct[]) {
  return productList.map((item) => {
    if (item.productType !== ProductTypeEnum.CLOUD_DESK || item.status !== 1) return item;
    const totalQty = Math.max(1, item.totalQty || 1);
    const resourceExpireTime = item.resourceExpireTime || item.authEndTime;
    const cloudType = item.cloudType || 'wuying';
    const idPrefix = cloudType === 'huoshan' ? 'volc' : cloudType === 'tianyi' ? 'cty-ecd' : 'ecd';
    const idSeed = `${Date.now()}`.slice(-6);
    const cloudDesktopNames = normalizeCloudDesktopNames(
      '云桌面',
      totalQty,
      item.cloudDesktopNames,
      cloudType === 'tianyi' ? 3 : 2,
    );
    return {
      ...item,
      cloudDesktopNames,
      cloudResourceStatus: 'opened' as const,
      failCount: 0,
      resourceExpireTime,
      successCount: totalQty,
      vendorErrorMessage: undefined,
      vendorOperationStatus: '开通成功',
      vendorOperationTime: formatDate(new Date()),
      cloudDesktopResources: cloudDesktopNames.map((desktopName, index) => {
        const resource = item.cloudDesktopResources?.[index];
        return {
          ...resource,
          bindStatus: cloudType === 'tianyi' ? '用户已绑定' : resource?.bindStatus,
          desktopId: resource?.desktopId || `${idPrefix}-${idSeed}-${String(index + 1).padStart(3, '0')}`,
          desktopName: resource?.desktopName || desktopName,
          errorMessage: undefined,
          expireTime: resourceExpireTime,
          status: 'opened' as const,
        };
      }),
      cloudOperationLogs: item.cloudOperationLogs?.length
        ? item.cloudOperationLogs.map((log, index) => index === item.cloudOperationLogs!.length - 1
          ? {
              ...log,
              completedAt: formatDate(new Date()),
              failCount: 0,
              providerStatus: '开通成功',
              status: 'succeeded' as const,
              successCount: totalQty,
            }
          : log)
        : [],
    };
  });
}

function prepareOpeningCloudProducts(
  productList: AuthorizedProduct[],
  tenant: TenantOption,
  recordId: string,
) {
  return productList.map((item) => {
    if (item.productType !== ProductTypeEnum.CLOUD_DESK || item.status !== 1) return item;
    const totalQty = Math.max(1, item.totalQty || 1);
    const cloudType = item.cloudType || 'wuying';
    const resourceExpireTime = item.resourceExpireTime || item.authEndTime;
    const cloudDesktopNames = normalizeCloudDesktopNames(
      tenant.name,
      totalQty,
      item.cloudDesktopNames,
      cloudType === 'tianyi' ? 3 : 2,
    );
    const clientToken = `open-${recordId}-${cloudType}-${totalQty}`;
    const operationId = `pending-open-${recordId}`;
    const requestCount = cloudType === 'huoshan' ? totalQty : cloudType === 'tianyi' ? Math.ceil(totalQty / 10) : 1;
    const submittedAt = formatDate(new Date());
    const openingResources: CloudDesktopResource[] = cloudDesktopNames.map((desktopName) => ({
      bindStatus: cloudType === 'tianyi' ? '绑定中' : undefined,
      desktopId: '',
      desktopName,
      expireTime: resourceExpireTime,
      status: 'opening',
    }));

    return {
      ...item,
      cloudDesktopNames,
      cloudDesktopResources: openingResources,
      cloudOperationLogs: [
        ...(item.cloudOperationLogs || []),
        {
          api: cloudType === 'huoshan' ? 'ECS RunInstances' : cloudType === 'tianyi' ? '创建云电脑 v3' : 'CreateDesktops',
          clientToken,
          failCount: 0,
          operationId,
          providerStatus: '开通中',
          requestCount,
          status: 'pending' as const,
          submittedAt,
          successCount: 0,
          trigger: 'manual' as const,
        },
      ],
      cloudResourceStatus: 'opening' as const,
      failCount: 0,
      resourceExpireTime,
      successCount: 0,
      totalQty,
      vendorClientToken: clientToken,
      vendorErrorMessage: undefined,
      vendorOperationId: operationId,
      vendorOperationStatus: '开通中',
      vendorOperationTime: submittedAt,
      vendorOperationTrigger: 'manual' as const,
      vendorRequestCount: requestCount,
    };
  });
}

function completeCreatedCloudProvisioning(scopeType: TenantScopeType, recordId: string) {
  const nextRows = { ...authorizationRows };
  nextRows[scopeType] = nextRows[scopeType].map((record) => {
    if (record.id !== recordId) return record;
    return {
      ...record,
      modifyByName: '系统自动',
      modifyTime: formatDate(new Date()),
      productList: finalizeCreatedCloudProducts(record.productList),
    };
  });
  authorizationRows = nextRows;
  registerAuthorizationCloudResources(true);
}

function makeRecord(
  index: number,
  scopeType: TenantScopeType,
  productList: AuthorizedProduct[],
  overrides: Partial<AuthorizationRecord> = {},
): AuthorizationRecord {
  const baseDate = new Date('2026-07-08T16:08:57');
  const modifyDate = addDays(baseDate, -index);
  const createDate = addDays(baseDate, -index - 30);
  const scopedTenantOptions = tenantOptionsByScope[scopeType];
  const tenant = scopedTenantOptions[index % scopedTenantOptions.length];
  const creator = operatorNames[(index + 1) % operatorNames.length];
  const updater = operatorNames[index % operatorNames.length];

  return {
    createByName: creator,
    createTime: formatDate(createDate),
    id: `${scopeType}-${(2072493736014692354n + BigInt(index)).toString()}`,
    modifyByName: updater,
    modifyTime: formatDate(modifyDate),
    productList: cloneProductList(productList),
    relationNo:
      index % 4 === 0
        ? scopeType === 'ding'
          ? `DingDing-${(2074789716888190977n + BigInt(index)).toString()}`
          : `QSB-${(2074789716888190977n + BigInt(index)).toString()}`
        : index % 5 === 0
          ? '99999'
          : '-',
    scopeType,
    tenantAdministrator: tenant.adminName,
    tenantId: tenant.id,
    tenantName: tenant.name,
    ...overrides,
  };
}

function buildQsbRows() {
  const startDate = new Date('2026-07-08T00:00:00');
  const sampleRows: AuthorizationRecord[] = [
    makeRecord(
      0,
      'qsb',
      [
        product(ProductTypeEnum.MALL_CONNECTOR, 20, startDate, new Date('2027-07-01T00:00:00')),
        product(ProductTypeEnum.ROBOT_TOKEN, 1, startDate, new Date('2027-07-01T00:00:00')),
        {
          ...product(ProductTypeEnum.CLOUD_DESK, 3, startDate, new Date('2027-07-08T00:00:00')),
          cloudResourceStatus: 'opened',
          cloudType: 'tianyi',
          failCount: 0,
          imageId: 'ct-img-qsb-custom',
          imageName: '取数宝天翼云自定义镜像',
          instanceSpec: '通用型 4核8G',
          successCount: 3,
          ...buildTianyiResources('林华', '2072493736014692354', 3, '2027-07-08 23:59:59'),
        },
      ],
      {
        createByName: '林炎2',
        createTime: '2026-07-08 16:07:29',
        modifyByName: '林炎2',
        modifyTime: '2026-07-08 16:08:57',
        relationNo: '-',
        tenantAdministrator: '林华',
        tenantId: '2072493736014692354',
        tenantName: '林华',
      },
    ),
    makeRecord(
      1,
      'qsb',
      [
        product(
          ProductTypeEnum.MALL_CONNECTOR,
          1,
          new Date('2026-07-08T00:00:00'),
          new Date('2026-07-09T00:00:00'),
          2,
          ['shenlilinghua', 'linhua', 'MIHAYOUhuahuo-1', '标准', '试用', '老客户'],
        ),
        {
          ...product(ProductTypeEnum.CLOUD_DESK, 1, new Date('2026-07-08T00:00:00'), new Date('2026-10-08T00:00:00')),
          cloudOpenType: 'trial',
          cloudResourceStatus: 'open_failed',
          cloudType: 'tianyi',
          failCount: 1,
          imageId: 'ct-img-qsb-custom',
          imageName: '取数宝天翼云自定义镜像',
          instanceSpec: '通用型 4核8G',
          successCount: 0,
          vendorErrorMessage: '网络包容量不足，云电脑开通失败',
        },
      ],
      {
        createByName: '凌波',
        createTime: '2026-07-08 09:48:22',
        modifyByName: '凌波',
        modifyTime: '2026-07-08 09:48:22',
        relationNo: '123123131311',
        tenantName: 'qiushui2',
      },
    ),
    makeRecord(
      2,
      'qsb',
      [
        product(
          ProductTypeEnum.MALL_CONNECTOR,
          1,
          new Date('2026-06-18T00:00:00'),
          new Date('2029-06-10T00:00:00'),
        ),
        {
          ...product(ProductTypeEnum.CLOUD_DESK, 2, new Date('2026-06-08T00:00:00'), new Date('2026-07-08T00:00:00')),
          cloudResourceStatus: 'release_period',
          cloudType: 'tianyi',
          failCount: 0,
          imageId: 'ct-img-qsb-custom',
          imageName: '取数宝天翼云自定义镜像',
          instanceSpec: '通用型 4核8G',
          releaseStartTime: '2026-07-09 00:00:00',
          releaseExpireTime: '2026-07-15 23:59:59',
          successCount: 2,
          ...buildTianyiResources('取数宝授权三', '1713811908194594820', 2, '2026-07-08 23:59:59', 'release_period'),
        },
      ],
      {
        createByName: '长乐2',
        createTime: '2026-06-18 04:02:04',
        modifyByName: '景天测试',
        modifyTime: '2026-06-24 17:39:28',
        tenantName: '取数宝授权三',
      },
    ),
    makeRecord(
      3,
      'qsb',
      [
        {
          ...product(ProductTypeEnum.CLOUD_DESK, 1, new Date('2026-06-08T00:00:00'), new Date('2026-07-08T00:00:00')),
          cloudDesktopNames: ['实在智能01'],
          cloudDesktopResources: [
            {
              desktopId: 'ecd-qsb-release-001',
              desktopName: '实在智能01',
              expireTime: '2026-07-08 23:59:59',
              status: 'release_period',
            },
          ],
          cloudResourceStatus: 'release_period',
          cloudType: 'wuying',
          failCount: 0,
          releaseStartTime: '2026-07-09 00:00:00',
          releaseExpireTime: '2026-07-15 23:59:59',
          successCount: 1,
        },
      ],
      {
        tenantId: '1713811908194594818',
        tenantName: '实在智能科技有限公司',
      },
    ),
    makeRecord(
      4,
      'qsb',
      [
        {
          ...product(ProductTypeEnum.CLOUD_DESK, 1, new Date('2026-06-08T00:00:00'), new Date('2026-07-08T00:00:00')),
          cloudDesktopNames: ['实在智能上海01'],
          cloudDesktopResources: [
            {
              desktopId: 'volc-qsb-release-001',
              desktopName: '实在智能上海01',
              expireTime: '2026-07-08 23:59:59',
              status: 'release_period',
            },
          ],
          cloudOpenType: 'contract',
          cloudResourceStatus: 'release_period',
          cloudType: 'huoshan',
          failCount: 0,
          imageId: 'img-qsb-runner-202607',
          imageName: '取数宝自动化运行环境镜像 · 2026.07',
          instanceSpec: 'ecs.c3al.xlarge',
          releaseStartTime: '2026-07-09 00:00:00',
          releaseExpireTime: '2026-07-15 23:59:59',
          successCount: 1,
        },
      ],
      {
        tenantId: '1713811908194594819',
        tenantName: '实在智能科技有限公司-上海',
      },
    ),
    makeRecord(
      5,
      'qsb',
      [
        {
          ...product(ProductTypeEnum.CLOUD_DESK, 1, new Date('2026-05-30T00:00:00'), new Date('2026-06-30T00:00:00')),
          cloudDesktopNames: ['中海油云电脑01'],
          cloudDesktopResources: [
            {
              desktopId: 'volc-qsb-auto-001',
              desktopName: '中海油云电脑01',
              expireTime: '2026-06-30 23:59:59',
              status: 'release_period',
            },
          ],
          cloudOpenType: 'contract',
          cloudResourceStatus: 'release_period',
          cloudType: 'huoshan',
          failCount: 0,
          imageId: 'img-qsb-runner-202607',
          imageName: '取数宝自动化运行环境镜像 · 2026.07',
          instanceSpec: 'ecs.c3al.xlarge',
          releaseStartTime: '2026-07-01 00:00:00',
          releaseExpireTime: '2026-07-07 23:59:59',
          successCount: 1,
        },
      ],
      {
        tenantId: '1713811908194594822',
        tenantName: '中海油数字化智能门户',
      },
    ),
    makeRecord(
      6,
      'qsb',
      [
        {
          ...product(ProductTypeEnum.CLOUD_DESK, 1, new Date('2026-05-01T00:00:00'), new Date('2026-06-01T00:00:00')),
          cloudDesktopNames: ['已释放云电脑01'],
          cloudDesktopResources: [
            {
              desktopId: 'ecd-qsb-released-001',
              desktopName: '已释放云电脑01',
              status: 'unsubscribed',
            },
          ],
          cloudOperationLogs: [
            {
              api: 'DeleteDesktops',
              clientToken: 'manual-release-qsb-2072493736014700-ecd-qsb-released-001',
              completedAt: '2026-06-09 10:12:33',
              failCount: 0,
              operationId: 'req-wuying-released-001',
              providerStatus: '已释放',
              requestCount: 1,
              unboundRobotTokenCount: 1,
              status: 'succeeded',
              submittedAt: '2026-06-09 10:12:00',
              successCount: 1,
              trigger: 'manual',
            },
          ],
          cloudResourceStatus: 'unsubscribed',
          cloudType: 'wuying',
          failCount: 0,
          releaseExpireTime: undefined,
          releaseStartTime: undefined,
          successCount: 0,
          vendorOperationId: 'req-wuying-released-001',
          vendorOperationStatus: '已释放',
          vendorOperationTime: '2026-06-09 10:12:33',
          vendorOperationTrigger: 'manual',
        },
      ],
      {
        tenantId: '1713811908194594823',
        tenantName: '已释放资源示例租户',
      },
    ),
  ];

  const generated = Array.from({ length: 1640 }).map((_, rawIndex) => {
    const index = rawIndex + sampleRows.length;
    const start = addDays(startDate, -index);
    const end = addDays(start, 360 + (index % 24) * 15);
    const products =
      index % 7 === 0
        ? []
        : index % 5 === 0
          ? [
              product(ProductTypeEnum.MALL_CONNECTOR, 1, start, end),
              product(
                ProductTypeEnum.CROSS_BORDER_CONNECTOR,
                1,
                start,
                end,
                2,
                ['视客', '标准', '九数云'],
              ),
              product(ProductTypeEnum.BANK_CONNECTOR, 1, start, end, 2, ['应用包612_3']),
            ]
          : index % 3 === 0
            ? [product(ProductTypeEnum.BANK_CONNECTOR, 2, start, end, 2, ['钉钉生态'])]
            : [product(ProductTypeEnum.MALL_CONNECTOR, 1, start, end, index % 2 === 0 ? 1 : 2, connectorNames.slice(1, 4))];

    return makeRecord(index, 'qsb', products);
  });

  return [...sampleRows, ...generated];
}

function buildDingRows() {
  const startDate = new Date('2026-07-08T00:00:00');
  return Array.from({ length: 92 }).map((_, index) => {
    const start = addDays(startDate, -index);
    const products =
      index === 0
        ? [
            product(
              ProductTypeEnum.MALL_CONNECTOR,
              2,
              start,
              new Date('2026-08-24T00:00:00'),
              2,
              ['钉钉Agent登录', '淘宝前台登录', '钉钉生态'],
            ),
            product(ProductTypeEnum.CLOUD_DESK, 1, start, new Date('2026-09-09T00:00:00')),
          ]
        : [
            product(
              index % 2 === 0 ? ProductTypeEnum.MALL_CONNECTOR : ProductTypeEnum.BANK_CONNECTOR,
              1 + (index % 3),
              start,
              addDays(start, 60 + index),
              index % 2 === 0 ? 2 : 1,
              ['钉钉生态', '标准'],
            ),
          ];

    const dingTenantId = (2074785034964877313n + BigInt(index)).toString();
    const dingRelationNo = (2074789716888190977n + BigInt(index)).toString();

    return makeRecord(index, 'ding', products, {
      createByName: index === 0 ? 'DingDing_ddd13' : operatorNames[index % operatorNames.length],
      createTime: index === 0 ? '2026-07-08 17:36:43' : undefined,
      id: `ding-${dingTenantId}`,
      modifyByName: index === 0 ? 'DingDing_ddd13' : operatorNames[(index + 2) % operatorNames.length],
      modifyTime: index === 0 ? '2026-07-08 17:36:43' : undefined,
      relationNo: index === 0 ? 'DingDing-2074789716888190977' : `DingDing-${dingRelationNo}`,
      tenantAdministrator:
        index === 0
          ? 'DingDing_ddd13'
          : tenantOptionsByScope.ding[index % tenantOptionsByScope.ding.length].adminName,
      tenantId: dingTenantId,
      tenantName: index === 0 ? 'DingDing_ddd13' : `DingDing_${String(index).padStart(3, '0')}`,
    });
  });
}

let authorizationRows: Record<TenantScopeType, AuthorizationRecord[]> = {
  qsb: buildQsbRows(),
  ding: buildDingRows(),
  feishu: [],
};

registerAuthorizationCloudResources();
window.setInterval(() => {
  void reconcileCloudResourceLifecycle();
}, 1000);

function inDateRange(value: string, start?: string, end?: string) {
  if (!start && !end) return true;
  const valueTime = new Date(value).getTime();
  if (start && valueTime < new Date(start).getTime()) return false;
  if (end && valueTime > new Date(end).getTime()) return false;
  return true;
}

export async function getAuthorizationList(
  params: AuthorizationListParams = {},
): Promise<ApiResponseBackType<ListBackType<AuthorizationRecord>>> {
  await reconcileCloudResourceLifecycle();
  const scopeType = params.scopeType || 'qsb';
  const pageNo = Number(params.pageNo || PaginationInitData.pageNo);
  const pageSize = Number(params.pageSize || PaginationInitData.pageSize);

  const filtered = authorizationRows[scopeType].filter((item) => {
    if (params.tenantName && !item.tenantName.includes(params.tenantName)) return false;
    if (params.modifyByName && !item.modifyByName.includes(params.modifyByName)) return false;
    if (params.createByName && !item.createByName.includes(params.createByName)) return false;
    if (params.productType && !item.productList.some((productItem) => productItem.productType === params.productType)) {
      return false;
    }
    if (!inDateRange(item.modifyTime, params.modifyTimeStart, params.modifyTimeEnd)) return false;
    if (!inDateRange(item.createTime, params.createTimeStart, params.createTimeEnd)) return false;
    return true;
  });

  const start = (pageNo - 1) * pageSize;
  const records = filtered.slice(start, start + pageSize).map((item) => ({
    ...item,
    productList: cloneProductList(item.productList),
  }));
  setIdxForPaginationData(records, pageNo, pageSize);

  return success({
    current: pageNo,
    pages: Math.ceil(filtered.length / pageSize),
    records,
    size: pageSize,
    total: filtered.length,
  });
}

export async function getAuthorizationDetail(id: string) {
  await reconcileCloudResourceLifecycle();
  const record = Object.values(authorizationRows)
    .flat()
    .find((item) => item.id === id);
  return success(
    record
      ? {
          ...record,
          productList: cloneProductList(record.productList),
        }
      : undefined,
  );
}

export async function getTenantOptions(keyword = '', scopeType?: TenantScopeType) {
  const sourceOptions = scopeType ? tenantOptionsByScope[scopeType] : tenantOptions;
  return success(
    sourceOptions.filter((item) => !keyword || item.name.includes(keyword) || item.id.includes(keyword)),
  );
}

export async function getCloudInstanceSpecOptions(cloudType: CloudType) {
  await wait(120);
  if (cloudType === 'wuying') return success([]);
  return success(cloudSpecOptions[cloudType].map((item) => ({ ...item })));
}

export async function getCloudImageOptions(cloudType: CloudType, instanceSpec?: string) {
  await wait(160);
  if (cloudType === 'wuying') return success({ lastUsedImageId: undefined, records: [] });
  const records = cloudImageCatalog[cloudType]
    .filter((item) => !instanceSpec || item.compatibleSpecs.includes(instanceSpec))
    .map(({ label, value }) => ({ label, value }));
  return success({
    lastUsedImageId: lastUsedCloudImage[cloudType],
    records,
  });
}

export async function saveLastUsedCloudImage(cloudType: CloudType, imageId?: string) {
  if (cloudType !== 'wuying' && imageId) lastUsedCloudImage[cloudType] = imageId;
  return success(true);
}

export async function simulateCloudOperation(params: {
  clientToken: string;
  cloudType?: CloudType;
  operation: 'unsubscribe';
  resources: CloudOperationResourceInput[];
  trigger?: CloudOperationTrigger;
}): Promise<ApiResponseBackType<CloudUnsubscribeOperation>>;
export async function simulateCloudOperation(params: {
  clientToken: string;
  cloudType?: CloudType;
  operation: 'open' | 'renew' | 'retry';
  resourceCount?: number;
}): Promise<ApiResponseBackType<CloudOperationResult>>;
export async function simulateCloudOperation(params: {
  clientToken: string;
  cloudType?: CloudType;
  operation: 'open' | 'renew' | 'retry' | 'unsubscribe';
  resourceCount?: number;
  resources?: CloudOperationResourceInput[];
  trigger?: CloudOperationTrigger;
}) {
  if (params.operation === 'unsubscribe') {
    const operation = await submitCloudUnsubscribe({
      clientToken: params.clientToken,
      cloudType: params.cloudType || 'wuying',
      resources: params.resources || [],
      trigger: params.trigger || 'manual',
    });
    scheduleUnsubscribeResult(operation);
    return success(operation);
  }
  const cached = completedCloudOperations.get(params.clientToken);
  if (cached) return success(cached);
  await wait(360);
  const policy = cloudProviderPolicies[params.cloudType || 'wuying'];
  const resourceCount = Math.max(1, params.resourceCount || 1);
  const batchSize =
    params.operation === 'renew'
      ? policy.renewBatchSize
      : undefined;
  const requestCount = batchSize ? Math.ceil(resourceCount / batchSize) : 1;
  const requestId = `mock-${params.operation}-${Date.now()}`;
  const result: CloudOperationResult = {
    api: params.operation,
    operation: params.operation,
    requestId,
    requestCount,
  };
  completedCloudOperations.set(params.clientToken, result);
  return success(result);
}

export async function queryCloudUnsubscribeResult(params: {
  cloudType?: CloudType;
  operationId: string;
}) {
  return success(await queryCloudUnsubscribeOperation(params.operationId));
}

export async function persistCloudUnsubscribeStatus(
  authorizationId: string,
  params: {
    clientToken?: string;
    operation?: CloudUnsubscribeOperation;
    operationId?: string;
    status: CloudUnsubscribeStatus;
    trigger?: CloudOperationTrigger;
    vendorErrorMessage?: string;
    vendorStatus?: string;
  },
) {
  const nextRows = { ...authorizationRows };
  Object.keys(nextRows).forEach((key) => {
    const scopeType = key as TenantScopeType;
    nextRows[scopeType] = nextRows[scopeType].map((record) => {
      if (record.id !== authorizationId) return record;
      return {
        ...record,
        modifyByName: '森林',
        modifyTime: formatDate(new Date()),
        productList: record.productList.map((item) =>
          item.productType === ProductTypeEnum.CLOUD_DESK
            ? params.operation
              ? applyCloudUnsubscribeOperation(item, params.operation)
              : applyCloudUnsubscribeState(item, params.status, {
                  clientToken: params.clientToken,
                  operationId: params.operationId,
                  trigger: params.trigger,
                  vendorErrorMessage: params.vendorErrorMessage,
                  vendorStatus: params.vendorStatus,
                })
            : item,
        ),
      };
    });
  });
  authorizationRows = nextRows;
  registerAuthorizationCloudResources(true);
  return success(true);
}

export async function persistCloudProductOperation(
  authorizationId: string,
  params: {
    authEndTime?: string;
    authStartTime?: string;
    cloudDesktopResources?: CloudDesktopResource[];
    operation: 'renew' | 'retry';
  },
) {
  const nextRows = { ...authorizationRows };
  Object.keys(nextRows).forEach((key) => {
    const scopeType = key as TenantScopeType;
    nextRows[scopeType] = nextRows[scopeType].map((record) => {
      if (record.id !== authorizationId) return record;
      return {
        ...record,
        modifyByName: '森林',
        modifyTime: formatDate(new Date()),
        productList: record.productList.map((item) => {
          if (item.productType !== ProductTypeEnum.CLOUD_DESK) return item;
          const targetStatus = 'opened';
          const nextEndTime = params.authEndTime || item.resourceExpireTime || item.authEndTime;
          const operationResources = params.cloudDesktopResources || item.cloudDesktopResources || [];
          return {
            ...item,
            authEndTime: params.authEndTime || item.authEndTime,
            authStartTime: params.authStartTime || item.authStartTime,
            cloudDesktopResources: operationResources.map((resource) => ({
              ...resource,
              bindStatus: '用户已绑定',
              desktopId: resource.desktopId,
              errorMessage: undefined,
              expireTime: nextEndTime,
              status: targetStatus,
            })),
            cloudResourceStatus: targetStatus,
            failCount: 0,
            releaseExpireTime: undefined,
            releaseStartTime: undefined,
            resourceExpireTime: params.authEndTime || item.resourceExpireTime,
            successCount: item.totalQty || 1,
            vendorClientToken: undefined,
            vendorErrorMessage: undefined,
            vendorOperationId: undefined,
            vendorOperationStatus: undefined,
            vendorOperationTime: undefined,
            vendorOperationTrigger: undefined,
            vendorRequestCount: undefined,
          };
        }),
      };
    });
  });
  authorizationRows = nextRows;
  registerAuthorizationCloudResources(true);
  return success(true);
}

export async function createAuthorization(
  values: AuthorizationFormValues,
  tenant: TenantOption | null,
  scopeType: TenantScopeType,
) {
  await wait(260);
  const selectedTenant =
    tenant ||
    tenantOptionsByScope[scopeType].find((item) => item.id === values.tenantId) ||
    tenantOptionsByScope[scopeType][0];
  const now = new Date();
  const recordId = `${scopeType}-${Date.now()}`;
  const productList = prepareOpeningCloudProducts(
    (values.productList || []).filter((item) => item.status === 1),
    selectedTenant,
    recordId,
  );
  const nextRecord: AuthorizationRecord = {
    createByName: '森林',
    createTime: formatDate(now),
    id: recordId,
    modifyByName: '森林',
    modifyTime: formatDate(now),
    productList: cloneProductList(productList),
    relationNo: values.relationNo || '-',
    scopeType,
    tenantAdministrator: selectedTenant.adminName,
    tenantId: selectedTenant.id,
    tenantName: selectedTenant.name,
  };
  authorizationRows = {
    ...authorizationRows,
    [scopeType]: [nextRecord, ...authorizationRows[scopeType]],
  };
  registerAuthorizationCloudResources(true);

  const cloudProduct = nextRecord.productList.find((item) => item.productType === ProductTypeEnum.CLOUD_DESK);
  if (cloudProduct) {
    await wait(1200);
    await simulateCloudOperation({
      clientToken: cloudProduct.vendorClientToken || `open-${recordId}`,
      cloudType: cloudProduct.cloudType || 'wuying',
      operation: 'open',
      resourceCount: cloudProduct.totalQty || 1,
    });
    completeCreatedCloudProvisioning(scopeType, recordId);
  }

  return success(true);
}

export async function updateAuthorization(
  id: string,
  values: AuthorizationFormValues,
  tenant: TenantOption | null,
) {
  const now = formatDate(new Date());
  const nextRows = { ...authorizationRows };
  Object.keys(nextRows).forEach((key) => {
    const scopeType = key as TenantScopeType;
    nextRows[scopeType] = nextRows[scopeType].map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        productList: cloneProductList((values.productList || []).filter((productItem) => productItem.status === 1)),
        relationNo: values.relationNo || '-',
        tenantAdministrator: tenant?.adminName || item.tenantAdministrator,
        tenantId: tenant?.id || item.tenantId,
        tenantName: tenant?.name || item.tenantName,
        modifyByName: '森林',
        modifyTime: now,
      };
    });
  });
  authorizationRows = nextRows;
  registerAuthorizationCloudResources(true);
  return success(true);
}

export async function getConnectorPageList(params: ConnectorListParams = {}) {
  const productType = params.productType || ProductTypeEnum.MALL_CONNECTOR;
  const pageNo = Number(params.pageNo || 1);
  const pageSize = Number(params.pageSize || 20);
  const allRows: ConnectorInfo[] = connectorNames.slice(1).map((connectorName, index) => ({
    canDelete: 1,
    connectorId: `${productType}-${index}`,
    connectorName,
  }));
  const filtered = allRows.filter((item) => !params.connectorName || item.connectorName.includes(params.connectorName));
  const start = (pageNo - 1) * pageSize;
  return success({
    current: pageNo,
    records: filtered.slice(start, start + pageSize),
    size: pageSize,
    total: filtered.length,
  });
}
