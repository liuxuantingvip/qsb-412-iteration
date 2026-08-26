export type CloudType = 'wuying' | 'huoshan' | 'tianyi';

export type SharedCloudResourceStatus =
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

export type CloudOperationTrigger = 'manual' | 'automatic' | 'retry';

export type CloudProviderPolicy = {
  maxCreateCount?: number;
  purchasePeriods: number[];
  renewBatchSize?: number;
  renewPeriods: number[];
  unsubscribeApi: string;
  unsubscribeBatchSize: number;
  unsubscribePendingStatus: string;
  unsubscribeSuccessStatus: string;
};

export const cloudProviderPolicies: Record<CloudType, CloudProviderPolicy> = {
  wuying: {
    purchasePeriods: [1, 2, 3, 6, 12, 24, 36, 48, 60],
    renewPeriods: [1, 2, 3, 6, 12, 24, 36, 48, 60],
    unsubscribeApi: 'DeleteDesktops',
    unsubscribeBatchSize: 100,
    unsubscribePendingStatus: '释放中',
    unsubscribeSuccessStatus: '已释放',
  },
  huoshan: {
    maxCreateCount: 100,
    purchasePeriods: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 24, 36, 48, 60],
    renewBatchSize: 1,
    renewPeriods: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 24, 36],
    unsubscribeApi: 'UnsubscribeInstance',
    unsubscribeBatchSize: 1,
    unsubscribePendingStatus: '释放处理中',
    unsubscribeSuccessStatus: '已释放',
  },
  tianyi: {
    maxCreateCount: 50,
    purchasePeriods: Array.from({ length: 36 }, (_, index) => index + 1),
    renewBatchSize: 10,
    renewPeriods: Array.from({ length: 36 }, (_, index) => index + 1),
    unsubscribeApi: 'POST /v3/desktop/batch/delete',
    unsubscribeBatchSize: 10,
    unsubscribePendingStatus: '释放中',
    unsubscribeSuccessStatus: '已释放',
  },
};

export type SharedCloudResource = {
  bindStatus?: string;
  chargeType?: 'subscription' | 'pay_as_you_go';
  cloudType: CloudType;
  errorMessage?: string;
  expireTime?: string;
  resourceId: string;
  resourceName: string;
  source: 'tenant_authorization' | 'cloud_management';
  status: SharedCloudResourceStatus;
  tenantName?: string;
  vendorOperationId?: string;
  vendorStatus?: string;
};

export type CloudOperationResourceInput = Pick<
  SharedCloudResource,
  'chargeType' | 'expireTime' | 'resourceId' | 'resourceName'
> & {
  simulateFailure?: boolean;
};

export type CloudOperationResourceResult = {
  errorMessage?: string;
  providerStatus: string;
  resourceId: string;
  resourceName: string;
  simulateFailure?: boolean;
  status: 'pending' | 'succeeded' | 'failed';
};

export type CloudUnsubscribeOperation = {
  api: string;
  clientToken: string;
  completedAt?: string;
  failCount: number;
  operationId: string;
  orderIds: string[];
  providerStatus: string;
  requestCount: number;
  requestId: string;
  resourceResults: CloudOperationResourceResult[];
  status: 'pending' | 'succeeded' | 'partial_failed' | 'failed';
  submittedAt: string;
  successCount: number;
  trigger: CloudOperationTrigger;
};

const resourceStore = new Map<string, SharedCloudResource>();
const operationsByClientToken = new Map<string, CloudUnsubscribeOperation>();
const operationsById = new Map<string, CloudUnsubscribeOperation>();

function cloneResource(resource: SharedCloudResource): SharedCloudResource {
  return { ...resource };
}

function cloneOperation(operation: CloudUnsubscribeOperation): CloudUnsubscribeOperation {
  return {
    ...operation,
    orderIds: [...operation.orderIds],
    resourceResults: operation.resourceResults.map((resource) => ({ ...resource })),
  };
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function parseDateTime(value?: string) {
  if (!value) return null;
  const timestamp = new Date(value.replace(' ', 'T')).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function operationTimestamp() {
  return new Date().toISOString();
}

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function updateOperation(operation: CloudUnsubscribeOperation) {
  operationsByClientToken.set(operation.clientToken, operation);
  operationsById.set(operation.operationId, operation);
}

export function registerCloudResources(resources: SharedCloudResource[], overwrite = false) {
  resources.forEach((resource) => {
    if (!overwrite && resourceStore.has(resource.resourceId)) return;
    resourceStore.set(resource.resourceId, cloneResource(resource));
  });
}

export function updateCloudResources(
  resourceIds: string[],
  updater: (resource: SharedCloudResource) => SharedCloudResource,
) {
  resourceIds.forEach((resourceId) => {
    const resource = resourceStore.get(resourceId);
    if (!resource) return;
    resourceStore.set(resourceId, cloneResource(updater(cloneResource(resource))));
  });
}

export function getCloudResource(resourceId: string) {
  const resource = resourceStore.get(resourceId);
  return resource ? cloneResource(resource) : undefined;
}

export function getCloudResources(source?: SharedCloudResource['source']) {
  return Array.from(resourceStore.values())
    .filter((resource) => !source || resource.source === source)
    .map(cloneResource);
}

export function getCloudOperationsForResources(resourceIds: string[]) {
  const resourceIdSet = new Set(resourceIds);
  return Array.from(operationsById.values())
    .filter((operation) => operation.resourceResults.some((resource) => resourceIdSet.has(resource.resourceId)))
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt))
    .map(cloneOperation);
}

export function validateCloudUnsubscribeEligibility(
  cloudType: CloudType,
  resources: CloudOperationResourceInput[],
) {
  if (!resources.length) throw new Error('没有可释放的云电脑资源');
  if (cloudType !== 'wuying') return;

  const now = Date.now();
  const ineligible = resources.filter((resource) => {
    if (resource.chargeType === 'pay_as_you_go') return false;
    const expireTimestamp = parseDateTime(resource.expireTime);
    return expireTimestamp === null || expireTimestamp > now;
  });
  if (ineligible.length) {
    throw new Error(`无影云仅支持释放按量资源或已到期的包年包月资源，当前有 ${ineligible.length} 台不符合条件`);
  }
}

export async function submitCloudUnsubscribe(params: {
  clientToken: string;
  cloudType: CloudType;
  resources: CloudOperationResourceInput[];
  trigger: CloudOperationTrigger;
}) {
  const cached = operationsByClientToken.get(params.clientToken);
  if (cached) return cloneOperation(cached);

  validateCloudUnsubscribeEligibility(params.cloudType, params.resources);
  await wait(260);

  const policy = cloudProviderPolicies[params.cloudType];
  const batches = chunk(params.resources, policy.unsubscribeBatchSize);
  const requestId = `req-${params.cloudType}-${Date.now()}`;
  const orderIds =
    params.cloudType === 'wuying'
      ? []
      : batches.map((_, index) => `order-${params.cloudType}-${Date.now()}-${index + 1}`);
  const operationId = orderIds[0] || requestId;
  const pendingStatus = params.trigger === 'automatic' ? 'auto_unsubscribing' : 'unsubscribing';
  const operation: CloudUnsubscribeOperation = {
    api: policy.unsubscribeApi,
    clientToken: params.clientToken,
    failCount: 0,
    operationId,
    orderIds,
    providerStatus: policy.unsubscribePendingStatus,
    requestCount: batches.length,
    requestId,
    resourceResults: params.resources.map((resource) => ({
      providerStatus: policy.unsubscribePendingStatus,
      resourceId: resource.resourceId,
      resourceName: resource.resourceName,
      simulateFailure: resource.simulateFailure,
      status: 'pending',
    })),
    status: 'pending',
    submittedAt: operationTimestamp(),
    successCount: 0,
    trigger: params.trigger,
  };

  updateOperation(operation);
  updateCloudResources(
    params.resources.map((resource) => resource.resourceId),
    (resource) => ({
      ...resource,
      bindStatus: resource.cloudType === 'tianyi' ? '解绑中' : resource.bindStatus,
      errorMessage: undefined,
      status: pendingStatus,
      vendorOperationId: operationId,
      vendorStatus: policy.unsubscribePendingStatus,
    }),
  );
  return cloneOperation(operation);
}

export async function queryCloudUnsubscribeOperation(operationId: string) {
  const current = operationsById.get(operationId);
  if (!current) throw new Error('未找到云厂商释放操作单');
  if (current.status !== 'pending') return cloneOperation(current);

  const elapsed = Date.now() - new Date(current.submittedAt).getTime();
  if (elapsed < 800) await wait(800 - elapsed);

  const policy = cloudProviderPolicies[
    (getCloudResource(current.resourceResults[0]?.resourceId)?.cloudType || 'wuying') as CloudType
  ];
  const nextResults = current.resourceResults.map((resource) => {
    const sharedResource = getCloudResource(resource.resourceId);
    const seededFailure =
      current.trigger !== 'retry' &&
      (resource.resourceId.includes('release-failed') ||
        sharedResource?.errorMessage === '模拟云厂商释放失败' ||
        resource.simulateFailure);
    return seededFailure
      ? {
          ...resource,
          errorMessage: '云厂商返回释放失败，请处理后重试',
          providerStatus: '释放失败',
          status: 'failed' as const,
        }
      : {
          ...resource,
          errorMessage: undefined,
          providerStatus: policy.unsubscribeSuccessStatus,
          status: 'succeeded' as const,
        };
  });
  const successCount = nextResults.filter((resource) => resource.status === 'succeeded').length;
  const failCount = nextResults.filter((resource) => resource.status === 'failed').length;
  const status = failCount === 0 ? 'succeeded' : successCount === 0 ? 'failed' : 'partial_failed';
  const nextOperation: CloudUnsubscribeOperation = {
    ...current,
    completedAt: operationTimestamp(),
    failCount,
    providerStatus:
      status === 'succeeded' ? policy.unsubscribeSuccessStatus : status === 'failed' ? '释放失败' : '部分释放失败',
    resourceResults: nextResults,
    status,
    successCount,
  };
  updateOperation(nextOperation);
  nextResults.forEach((result) => {
    updateCloudResources([result.resourceId], (resource) => ({
      ...resource,
      bindStatus:
        resource.cloudType === 'tianyi'
          ? result.status === 'succeeded'
            ? '已解绑'
            : '解绑失败'
          : resource.bindStatus,
      errorMessage: result.errorMessage,
      expireTime: result.status === 'succeeded' ? undefined : resource.expireTime,
      status: result.status === 'succeeded' ? 'unsubscribed' : 'unsubscribe_failed',
      vendorOperationId: operationId,
      vendorStatus: result.providerStatus,
    }));
  });
  return cloneOperation(nextOperation);
}
