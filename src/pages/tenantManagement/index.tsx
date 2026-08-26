import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Grid,
  Input,
  InputNumber,
  Layout,
  Link,
  Message as message,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import { AnnotationMarker } from '@/components/cloudAnnotations';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { IconPlus } from '@arco-design/web-react/icon';
import { FrameWorkPortalSuccessCode, PaginationInitData } from '@/constants';
import type { ListBackType } from '@/interface';
import type {
  CloudOperationResourceInput,
  CloudUnsubscribeOperation,
} from '@/mocks/cloudLifecycle';
import * as ServiceApi from './services';
import {
  createDefaultProductList,
  productTypeOptions,
  tenantScopeItems,
} from './services';
import type {
  AuthorizationFormValues,
  AuthorizationListParams,
  AuthorizationRecord,
  AuthorizedProduct,
  CloudDesktopResource,
  CloudResourceStatus,
  ConnectorInfo,
  DrawerMode,
  TenantOption,
  TenantScopeType,
} from './interface';
import { ProductTypeEnum } from './interface';
import styles from './index.module.less';

const { TabPane } = Tabs;
const { Row, Col } = Grid;
const { Header: PageHeader, Content: PageContent } = Layout;

type SearchValues = {
  createDate?: [Dayjs, Dayjs];
  keyword?: string;
  keywordField?: KeywordSearchField;
  modifyDate?: [Dayjs, Dayjs];
  productType?: ProductTypeEnum;
};

type KeywordSearchField = 'tenantName' | 'modifyByName' | 'createByName';

type ColumnKey =
  | 'tenantName'
  | 'productList'
  | 'connectorScope'
  | 'expireTime'
  | 'relationNo'
  | 'modifyByName'
  | 'modifyTime'
  | 'createByName'
  | 'createTime'
  | 'action';

const DEFAULT_MIN_COLUMN_WIDTH = 80;
const ACTION_COLUMN_WIDTH = 112;

const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  action: ACTION_COLUMN_WIDTH,
  connectorScope: 220,
  createByName: 80,
  createTime: 115,
  expireTime: 180,
  modifyByName: 80,
  modifyTime: 115,
  productList: 180,
  relationNo: 110,
  tenantName: 170,
};

const MIN_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  action: ACTION_COLUMN_WIDTH,
  connectorScope: 160,
  createByName: 80,
  createTime: 110,
  expireTime: 140,
  modifyByName: 80,
  modifyTime: 110,
  productList: 130,
  relationNo: 110,
  tenantName: 130,
};

const connectorProductTypes = [
  ProductTypeEnum.MALL_CONNECTOR,
  ProductTypeEnum.BANK_CONNECTOR,
  ProductTypeEnum.CROSS_BORDER_CONNECTOR,
  ProductTypeEnum.CATERING_CONNECTOR,
  ProductTypeEnum.PHONE_CONNECTOR,
];

const keywordSearchOptions: { label: string; value: KeywordSearchField }[] = [
  { label: '租户名', value: 'tenantName' },
  { label: '更新人', value: 'modifyByName' },
  { label: '创建人', value: 'createByName' },
];

const cloudTypeOptions = [
  { label: '无影云', value: 'wuying' },
  { label: '火山云', value: 'huoshan' },
  { label: '天翼云', value: 'tianyi' },
];

const cloudOpenTypeOptions = [
  { label: '试用', value: 'trial' },
  { label: '合同', value: 'contract' },
];

type CloudType = NonNullable<AuthorizedProduct['cloudType']>;
type CloudSelectOption = { label: string; value: string };

function createDurationOptions(months: number[]) {
  return months.map((month) => ({
    label: month % 12 === 0 ? `${month / 12}年` : `${month}个月`,
    value: month,
  }));
}

const huoshanPurchaseDurationOptions = createDurationOptions(
  ServiceApi.cloudProviderPolicies.huoshan.purchasePeriods,
);
const tianyiPurchaseDurationOptions = createDurationOptions(
  ServiceApi.cloudProviderPolicies.tianyi.purchasePeriods,
);
const huoshanMaxCreateCount = ServiceApi.cloudProviderPolicies.huoshan.maxCreateCount!;
const tianyiMaxCreateCount = ServiceApi.cloudProviderPolicies.tianyi.maxCreateCount!;

const cloudResourceStatusInfo: Record<CloudResourceStatus, { color: string; label: string }> = {
  opening: { color: 'arcoblue', label: '开通中' },
  opened: { color: 'green', label: '已开通' },
  open_failed: { color: 'red', label: '云电脑开通失败' },
  renewing: { color: 'arcoblue', label: '续期中' },
  renew_failed: { color: 'red', label: '续期失败' },
  release_period: { color: 'orange', label: '释放期' },
  unsubscribing: { color: 'arcoblue', label: '释放中' },
  auto_unsubscribing: { color: 'arcoblue', label: '自动释放中' },
  unsubscribed: { color: 'gray', label: '已释放' },
  unsubscribe_failed: { color: 'red', label: '释放失败' },
};

const cloudFailureStatuses: CloudResourceStatus[] = ['open_failed', 'renew_failed', 'unsubscribe_failed'];
const cloudRenewableStatuses: CloudResourceStatus[] = ['opened', 'release_period'];
const cloudUnsubscribableStatuses: CloudResourceStatus[] = ['opened', 'release_period'];
const cloudSubmitBlockingStatuses: CloudResourceStatus[] = [
  'opening',
  'renewing',
  'unsubscribing',
  'auto_unsubscribing',
];

function getCloudQuantityLimit(cloudType?: AuthorizedProduct['cloudType']) {
  return ServiceApi.cloudProviderPolicies[cloudType || 'wuying'].maxCreateCount;
}

function normalizeCloudQuantity(cloudType: CloudType, value: number | null | undefined) {
  const quantity = Math.max(1, Number(value || 1));
  const limit = getCloudQuantityLimit(cloudType);
  return limit ? Math.min(limit, quantity) : quantity;
}

function getCloudDurationMonths(item: AuthorizedProduct) {
  if (!item.authStartTime || !item.authEndTime) return 1;
  return Math.max(1, dayjs(item.authEndTime).diff(dayjs(item.authStartTime), 'month'));
}

function getRenewPeriodOptions(item: AuthorizedProduct) {
  const periods = ServiceApi.cloudProviderPolicies[item.cloudType || 'wuying'].renewPeriods;
  return createDurationOptions(periods);
}

function getCloudResourceExpireTime(item: AuthorizedProduct) {
  return item.resourceExpireTime || item.authEndTime;
}

function isCloudConfigDisabled(drawerReadonly: boolean, drawerMode: DrawerMode, item: AuthorizedProduct) {
  if (drawerReadonly) return true;
  return isExpired(item) || drawerMode === 'edit';
}

function createClientToken(
  operation: string,
  options: {
    attemptContext?: string;
    authorizationId?: string;
    resourceId?: string;
  } = {},
) {
  const authorizationId = options.authorizationId || 'draft';
  const resourceId = options.resourceId || 'all';
  const attemptContext = options.attemptContext || dayjs().format('YYYYMMDDHHmmss');
  return [operation, authorizationId, resourceId, attemptContext].join('-');
}

function buildCloudUnsubscribeResources(item: AuthorizedProduct): CloudOperationResourceInput[] {
  return (item.cloudDesktopResources || []).map((resource) => ({
    chargeType: resource.chargeType || 'subscription',
    expireTime: resource.expireTime || item.resourceExpireTime || item.authEndTime,
    resourceId: resource.desktopId,
    resourceName: resource.desktopName,
    simulateFailure: resource.errorMessage === '模拟云厂商释放失败',
  }));
}

function getFailedCloudDesktopResources(item: AuthorizedProduct) {
  const currentFailureStatus = item.cloudResourceStatus;
  const resources = item.cloudDesktopResources || [];
  return resources.filter(
    (resource) =>
      (currentFailureStatus && resource.status === currentFailureStatus) ||
      Boolean(resource.errorMessage) ||
      cloudFailureStatuses.includes(resource.status as CloudResourceStatus),
  );
}

function applyCloudUnsubscribeOperation(
  item: AuthorizedProduct,
  operation: CloudUnsubscribeOperation,
): AuthorizedProduct {
  const resultMap = new Map(operation.resourceResults.map((resource) => [resource.resourceId, resource]));
  const pendingStatus = operation.trigger === 'automatic' ? 'auto_unsubscribing' : 'unsubscribing';
  const resources = (item.cloudDesktopResources || []).map((resource) => {
    const result = resultMap.get(resource.desktopId);
    if (!result) return resource;
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
      status:
        result.status === 'pending'
          ? pendingStatus
          : result.status === 'succeeded'
            ? 'unsubscribed'
            : 'unsubscribe_failed',
    } as CloudDesktopResource;
  });
  const failCount = resources.filter((resource) => resource.status === 'unsubscribe_failed').length;
  const allUnsubscribed = resources.length > 0 && resources.every((resource) => resource.status === 'unsubscribed');
  const hasPending = resources.some((resource) =>
    ['unsubscribing', 'auto_unsubscribing'].includes(resource.status || ''),
  );
  const cloudResourceStatus: CloudResourceStatus = hasPending
    ? pendingStatus
    : failCount > 0
      ? 'unsubscribe_failed'
      : allUnsubscribed
        ? 'unsubscribed'
        : item.cloudResourceStatus || 'release_period';
  const log = {
    api: operation.api,
    clientToken: operation.clientToken,
    completedAt: operation.completedAt,
    failCount: operation.failCount,
    operationId: operation.operationId,
    providerStatus: operation.providerStatus,
    requestCount: operation.requestCount,
    unboundRobotTokenCount: operation.successCount,
    status: operation.status,
    submittedAt: operation.submittedAt,
    successCount: operation.successCount,
    trigger: operation.trigger,
  };
  return {
    ...item,
    cloudDesktopResources: resources,
    cloudOperationLogs: [
      ...(item.cloudOperationLogs || []).filter((entry) => entry.operationId !== operation.operationId),
      log,
    ],
    cloudResourceStatus,
    failCount,
    releaseExpireTime: allUnsubscribed ? undefined : item.releaseExpireTime,
    releaseStartTime: allUnsubscribed ? undefined : item.releaseStartTime,
    successCount: resources.filter((resource) => ['opened', 'release_period'].includes(resource.status || '')).length,
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

function getReleasePeriodDescription(item: AuthorizedProduct) {
  if (!item.releaseStartTime || !item.releaseExpireTime) {
    return '按北京时间计算：授权到期后进入 7 天释放期；期间可续期或手动释放，释放期结束后由服务端定时任务自动提交释放。';
  }
  const autoUnsubscribeTime = dayjs(item.releaseExpireTime).add(1, 'second');
  return `北京时间 7 天释放期：${dayjs(item.releaseStartTime).format('YYYY-MM-DD HH:mm:ss')} 至 ${dayjs(
    item.releaseExpireTime,
  ).format('YYYY-MM-DD HH:mm:ss')}；期间可续期或手动释放，将在 ${autoUnsubscribeTime.format(
    'YYYY-MM-DD HH:mm:ss',
  )} 后由服务端定时任务自动提交释放。`;
}

function getCloudTypeLabel(cloudType?: AuthorizedProduct['cloudType']) {
  return cloudType === 'huoshan' ? '火山云' : cloudType === 'tianyi' ? '天翼云' : '无影云';
}

function renderCloudResourceStatusTag(item: AuthorizedProduct) {
  const tag = (
    <Tag color={cloudResourceStatusInfo[item.cloudResourceStatus || 'opened'].color} style={{ marginLeft: 8 }}>
      {cloudResourceStatusInfo[item.cloudResourceStatus || 'opened'].label}
    </Tag>
  );
  return item.cloudResourceStatus === 'unsubscribed' ? (
    <AnnotationMarker noteId="CRA-1.8">{tag}</AnnotationMarker>
  ) : (
    tag
  );
}

function getUnsubscribeConsequence(cloudType: NonNullable<AuthorizedProduct['cloudType']>) {
  if (cloudType === 'huoshan') {
    return '释放成功后将进入退款停机或保留期，期间能否恢复以火山云实际规则为准，保留期结束后资源释放。';
  }
  return '厂商确认删除后，云电脑及其数据不可恢复。';
}

function getTianyiFailureMessage(item: AuthorizedProduct) {
  const reason = item.vendorErrorMessage?.replace(/，?云电脑开通失败$/, '') || '云电脑操作失败';
  if (item.cloudResourceStatus === 'open_failed' && reason.includes('网络包')) {
    return `${reason}，请前往天翼云后台扩容，完成后点击“失败重试”。`;
  }
  return `${reason}，请完成处理后点击“失败重试”。`;
}

function getRetryTransition(status: CloudResourceStatus | undefined) {
  if (status === 'unsubscribe_failed') {
    return { pendingStatus: 'unsubscribing' as const, targetStatus: 'unsubscribed' as const };
  }
  if (status === 'renew_failed') {
    return { pendingStatus: 'renewing' as const, targetStatus: 'opened' as const };
  }
  return { pendingStatus: 'opening' as const, targetStatus: 'opened' as const };
}

function getDefaultPageData(): ListBackType<AuthorizationRecord> {
  return {
    current: PaginationInitData.pageNo,
    records: [],
    size: PaginationInitData.pageSize,
    total: 0,
  };
}

type AuthorizationTableRow = AuthorizationRecord & {
  childCount?: number;
  children?: AuthorizationTableRow[];
  isTenant?: boolean;
  key: string;
};

type AuthorizationLogRow = {
  authorizationId: string;
  changeContent: string;
  createByName: string;
  createTime: string;
  key: string;
  modifyByName: string;
  modifyTime: string;
  productName: string;
};

function formatSearchParams(values: SearchValues): AuthorizationListParams {
  const keyword = values.keyword?.trim();
  const keywordField = values.keywordField || 'tenantName';
  const params: AuthorizationListParams = {
    createByName: undefined,
    createTimeEnd: values.createDate?.[1]?.format('YYYY-MM-DD 23:59:59'),
    createTimeStart: values.createDate?.[0]?.format('YYYY-MM-DD 00:00:00'),
    modifyByName: undefined,
    modifyTimeEnd: values.modifyDate?.[1]?.format('YYYY-MM-DD 23:59:59'),
    modifyTimeStart: values.modifyDate?.[0]?.format('YYYY-MM-DD 00:00:00'),
    productType: values.productType,
    tenantName: undefined,
  };
  if (keyword) params[keywordField] = keyword;
  return params;
}

function isConnectorProduct(productType: ProductTypeEnum) {
  return connectorProductTypes.includes(productType);
}

function isExpired(item: AuthorizedProduct) {
  if (!item.authEndTime) return false;
  return dayjs(item.authEndTime).isBefore(dayjs(), 'day');
}

function firstDateValue(item: AuthorizedProduct): [Dayjs, Dayjs] | null {
  if (!item.authStartTime || !item.authEndTime) return null;
  return [dayjs(item.authStartTime), dayjs(item.authEndTime)];
}

function getTenantShortName(name?: string) {
  if (!name) return '云电脑';
  const normalizedName = name.replace(/有限公司|有限责任公司|科技|智能|数字化|门户|[-_\s]/g, '');
  return (normalizedName || name).slice(0, 6);
}

function buildCloudDesktopNames(tenantName: string | undefined, totalQty = 1) {
  const prefix = getTenantShortName(tenantName);
  return Array.from({ length: Math.max(1, totalQty) }).map(
    (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`,
  );
}

function buildTianyiDesktopNames(tenantName: string | undefined, totalQty = 1) {
  const prefix = getTenantShortName(tenantName);
  return Array.from({ length: Math.max(1, totalQty) }).map(
    (_, index) => `${prefix}${String(index + 1).padStart(3, '0')}`,
  );
}

function normalizeCloudDesktopNames(
  tenantName: string | undefined,
  totalQty = 1,
  names: string[] = [],
  digits = 2,
) {
  const defaultNames =
    digits === 3 ? buildTianyiDesktopNames(tenantName, totalQty) : buildCloudDesktopNames(tenantName, totalQty);
  return defaultNames.map((defaultName, index) => names[index] ?? defaultName);
}

function getCloudDesktopNames(item: AuthorizedProduct, tenantName: string | undefined) {
  return normalizeCloudDesktopNames(tenantName, item.totalQty || 1, item.cloudDesktopNames, item.cloudType === 'tianyi' ? 3 : 2);
}

function getTianyiAccountName(tenant: TenantOption | null) {
  if (!tenant) return 'ty-tenant';
  const asciiName = tenant.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (asciiName) return asciiName;
  if (tenant.name === '林华') return 'linhua';
  if (tenant.name === '取数宝授权三') return 'qsb-shouquan-3';
  return `ty-${tenant.id.slice(-6)}`;
}

function buildTianyiResources(item: AuthorizedProduct, tenant: TenantOption | null): AuthorizedProduct {
  const totalQty = normalizeCloudQuantity('tianyi', item.totalQty);
  const desktopNames = normalizeCloudDesktopNames(tenant?.name, totalQty, item.cloudDesktopNames, 3);
  const resourceExpireTime =
    item.resourceExpireTime || item.authEndTime || dayjs().add(1, 'year').format('YYYY-MM-DD 23:59:59');
  const tenantKey = tenant?.id.slice(-6) || 'tenant';
  const resourceStatus = item.cloudResourceStatus || 'opening';
  const unsubscribePending = ['unsubscribing', 'auto_unsubscribing'].includes(resourceStatus);
  const unsubscribeFailed = resourceStatus === 'unsubscribe_failed';
  const isUnsubscribed = resourceStatus === 'unsubscribed';

  return {
    ...item,
    cloudAccountId: item.cloudAccountId || `ct-user-${tenantKey}`,
    cloudAccountName: item.cloudAccountName || getTianyiAccountName(tenant),
    cloudDesktopNames: desktopNames,
    cloudDesktopResources: desktopNames.map((desktopName, index) => {
      const existingResource = item.cloudDesktopResources?.[index];
      const resourceNotCreated = resourceStatus === 'open_failed' && !existingResource?.desktopId;
      return {
        bindStatus: isUnsubscribed
          ? '已解绑'
          : unsubscribePending
            ? '解绑中'
            : unsubscribeFailed
              ? '解绑失败'
              : resourceNotCreated
                ? '—'
                : existingResource?.bindStatus || '用户已绑定',
        desktopId:
          existingResource?.desktopId ||
          (resourceNotCreated ? '' : `cty-ecd-${tenantKey}-${String(index + 1).padStart(3, '0')}`),
        desktopName,
        errorMessage: existingResource?.errorMessage,
        expireTime: resourceExpireTime,
        status: resourceStatus,
      };
    }),
    resourceExpireTime,
    totalQty,
  };
}

function renderNoData() {
  return <Typography.Text type="secondary">—</Typography.Text>;
}

function renderTextWithTooltip(
  value: string | number | undefined,
  options: { className?: string; bold?: boolean } = {},
) {
  const text = value === undefined || value === null ? '' : String(value);
  if (!text) return renderNoData();
  return (
    <Tooltip content={text} position="tl">
      <Typography.Text className={`${styles.ellipsisText} ${options.className || ''}`} bold={options.bold}>
        {text}
      </Typography.Text>
    </Tooltip>
  );
}

function CloudDesktopNameTable({
  disabled,
  names,
  onChange,
}: {
  disabled: boolean;
  names: string[];
  onChange: (index: number, value: string) => void;
}) {
  const rows = names.map((name, index) => ({ index, key: `${index}-${name}`, name }));
  return (
    <Table
      columns={[
        { title: '序号', dataIndex: 'index', width: 64, render: (index: number) => index + 1 },
        {
          title: '云电脑名称',
          dataIndex: 'name',
          render: (value: string, row: { index: number }) => (
            <Input disabled={disabled} value={value} onChange={(nextValue) => onChange(row.index, nextValue)} />
          ),
        },
      ]}
      data={rows}
      pagination={
        rows.length > 10
          ? { pageSize: 10, sizeCanChange: false, showTotal: (total) => `共 ${total} 台` }
          : false
      }
      rowKey="key"
      size="small"
    />
  );
}

function getProductListText(productList: AuthorizedProduct[]) {
  const activeProducts = productList.filter((item) => item.status === 1);
  return activeProducts
    .map((item) =>
      item.productType === ProductTypeEnum.CLOUD_DESK
        ? `${item.productTypeName}（${item.totalQty || 0}，${getCloudTypeLabel(item.cloudType)}）`
        : `${item.productTypeName}（${item.totalQty || 0}）`,
    )
    .join(' | ');
}

function getConnectorScopeText(productList: AuthorizedProduct[]) {
  const activeProducts = productList.filter((item) => item.status === 1);
  return activeProducts
    .map((item) => {
        const connectorText =
          item.configType === 2
            ? item.connectorList?.map((connector) => connector.connectorName).join('、') || '--'
            : '全部';
        return `(${item.productTypeName}) ${connectorText}`;
      })
    .join(' | ');
}

function getExpireTimeText(productList: AuthorizedProduct[]) {
  const activeProducts = productList.filter((item) => item.status === 1);
  return activeProducts
    .map((item) => `${item.productTypeName}（${item.authEndTime ? dayjs(item.authEndTime).format('YYYY-MM-DD') : '--'}）`)
    .join(' | ');
}

function getCloudProduct(productList: AuthorizedProduct[]) {
  return productList.find((item) => item.status === 1 && item.productType === ProductTypeEnum.CLOUD_DESK);
}

function isAuthorizationOpening(record: AuthorizationRecord) {
  return getCloudProduct(record.productList)?.cloudResourceStatus === 'opening';
}

function getAuthorizationResultTag(productList: AuthorizedProduct[]) {
  const activeProducts = productList.filter((item) => item.status === 1);
  const cloudProduct = getCloudProduct(productList);
  if (!cloudProduct) return null;

  const status = cloudProduct.cloudResourceStatus || 'opened';
  if (status === 'opening') return { color: 'arcoblue', label: '开通中' };
  if (status !== 'open_failed') return null;

  const hasOtherSuccessfulProduct = activeProducts.some((item) => item.productType !== ProductTypeEnum.CLOUD_DESK);
  const hasSuccessfulCloudResource = Number(cloudProduct.successCount || 0) > 0;
  return hasOtherSuccessfulProduct || hasSuccessfulCloudResource
    ? { color: 'orange', label: '部分成功' }
    : { color: 'red', label: '失败' };
}

function renderProductList(productList: AuthorizedProduct[]) {
  const authorizationResultTag = getAuthorizationResultTag(productList);
  return (
    <div className={styles.productListCell}>
      {renderTextWithTooltip(getProductListText(productList), { className: styles.productListText })}
      {authorizationResultTag ? (
        <AnnotationMarker noteId="CRA-1.4">
          <Tag className={styles.productFailureTag} color={authorizationResultTag.color}>
            {authorizationResultTag.label}
          </Tag>
        </AnnotationMarker>
      ) : null}
    </div>
  );
}

function renderConnectorScope(productList: AuthorizedProduct[]) {
  return renderTextWithTooltip(getConnectorScopeText(productList));
}

function renderExpireTime(productList: AuthorizedProduct[]) {
  return renderTextWithTooltip(getExpireTimeText(productList));
}

function getProductScopeText(item: AuthorizedProduct) {
  if (!isConnectorProduct(item.productType)) return '--';
  if (item.configType !== 2) return '全部';
  return item.connectorList?.map((connector) => connector.connectorName).join('、') || '--';
}

function getProductDateRangeText(item: AuthorizedProduct) {
  const startTime = item.authStartTime ? dayjs(item.authStartTime).format('YYYY-MM-DD') : '--';
  const endTime = item.authEndTime ? dayjs(item.authEndTime).format('YYYY-MM-DD') : '--';
  return `${startTime} 至 ${endTime}`;
}

function getProductChangeContent(record: AuthorizationRecord, item: AuthorizedProduct) {
  const changes = [
    `授权数量调整为 ${item.totalQty || 0}`,
    `有效期调整为 ${getProductDateRangeText(item)}`,
    `关联合同/订单更新为 ${record.relationNo || '-'}`,
  ];
  if (isConnectorProduct(item.productType)) {
    changes.splice(1, 0, `数据源资源范围更新为 ${getProductScopeText(item)}`);
  }
  if (item.productType === ProductTypeEnum.CLOUD_DESK) {
    changes.splice(1, 0, `云电脑类型更新为 ${item.cloudType || 'wuying'}`);
    if (item.cloudType === 'tianyi') {
      changes.splice(
        2,
        0,
        `天翼云资源更新为 用户 ${item.cloudAccountName || '-'}，云电脑 ${item.totalQty || 0} 台`,
      );
      if (item.vendorErrorMessage) changes.push(`厂商错误信息：${item.vendorErrorMessage}`);
    }
  }
  return changes.join('；');
}

function buildAuthorizationLogRows(record: AuthorizationTableRow): AuthorizationLogRow[] {
  return (record.children || []).flatMap((child) =>
    (child.productList || [])
      .filter((item) => item.status === 1)
      .map((item) => ({
        authorizationId: child.id,
        changeContent: getProductChangeContent(child, item),
        createByName: child.createByName,
        createTime: child.createTime,
        key: `${child.id}-${item.productType}`,
        modifyByName: child.modifyByName,
        modifyTime: child.modifyTime,
        productName: item.productTypeName,
      })),
  );
}

function buildTenantRows(records: AuthorizationRecord[]): AuthorizationTableRow[] {
  const grouped = records.reduce<Record<string, AuthorizationRecord[]>>((acc, item) => {
    acc[item.tenantName] = acc[item.tenantName] || [];
    acc[item.tenantName].push(item);
    return acc;
  }, {});

  return Object.entries(grouped).map(([tenantName, items]) => {
    const firstItem = items[0];
    return {
      ...firstItem,
      childCount: items.length,
      children: items.map((item) => ({
        ...item,
        key: item.id,
        tenantName: '',
      })),
      createByName: '',
      createTime: '',
      id: `tenant-${tenantName}`,
      isTenant: true,
      key: `tenant-${tenantName}`,
      modifyByName: '',
      modifyTime: '',
      productList: [],
      relationNo: '',
      tenantName,
    };
  });
}

export default function TenantManagement() {
  const [searchForm] = Form.useForm<SearchValues>();
  const [drawerForm] = Form.useForm<AuthorizationFormValues>();
  const keywordField = Form.useWatch('keywordField', searchForm) || 'tenantName';
  const tableContentRef = useRef<HTMLDivElement>(null);
  const [activeScope, setActiveScope] = useState<TenantScopeType>('qsb');
  const listRequestRef = useRef(0);
  const [queryParams, setQueryParams] = useState<AuthorizationListParams>({});
  const [dataList, setDataList] = useState<ListBackType<AuthorizationRecord>>(getDefaultPageData());
  const [loading, setLoading] = useState(false);
  const [tableScrollY, setTableScrollY] = useState(480);
  const [tableContentWidth, setTableContentWidth] = useState(0);
  const columnWidths = DEFAULT_COLUMN_WIDTHS;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [currentRecord, setCurrentRecord] = useState<AuthorizationRecord | null>(null);
  const [drawerProducts, setDrawerProducts] = useState<AuthorizedProduct[]>(createDefaultProductList());
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantOption | null>(null);
  const [connectorModalOpen, setConnectorModalOpen] = useState(false);
  const [connectorModalProduct, setConnectorModalProduct] = useState<AuthorizedProduct | null>(null);
  const [connectorRows, setConnectorRows] = useState<ConnectorInfo[]>([]);
  const [connectorSelectedKeys, setConnectorSelectedKeys] = useState<Array<string | number>>([]);
  const [connectorSelectedRows, setConnectorSelectedRows] = useState<ConnectorInfo[]>([]);
  const [connectorSearchValue, setConnectorSearchValue] = useState('');
  const [connectorLoading, setConnectorLoading] = useState(false);
  const [durationProduct, setDurationProduct] = useState<AuthorizedProduct | null>(null);
  const [durationValue, setDurationValue] = useState(1);
  const [durationSubmitting, setDurationSubmitting] = useState(false);
  const [drawerSubmitting, setDrawerSubmitting] = useState(false);
  const [cloudActionLoading, setCloudActionLoading] = useState<string | null>(null);
  const [cloudSpecOptions, setCloudSpecOptions] = useState<Partial<Record<CloudType, CloudSelectOption[]>>>({});
  const [cloudImageOptions, setCloudImageOptions] = useState<Partial<Record<CloudType, CloudSelectOption[]>>>({});
  const [cloudOptionsLoading, setCloudOptionsLoading] = useState(false);
  const [cloudOptionsError, setCloudOptionsError] = useState('');
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [logTenantName, setLogTenantName] = useState('');
  const [logRows, setLogRows] = useState<AuthorizationLogRow[]>([]);
  const tableRows = useMemo(() => buildTenantRows(dataList.records), [dataList.records]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Array<string | number>>([]);

  const queryList = async (params?: AuthorizationListParams, nextScope = activeScope) => {
    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;
    setLoading(true);
    const pageNo = params?.pageNo || Number(dataList.current || PaginationInitData.pageNo);
    const pageSize = params?.pageSize || Number(dataList.size || PaginationInitData.pageSize);

    await ServiceApi.getAuthorizationList({
      ...queryParams,
      scopeType: nextScope,
      pageNo,
      pageSize,
      ...params,
    })
      .then(({ bizData }) => {
        if (requestId === listRequestRef.current) {
          setDataList(bizData || getDefaultPageData());
        }
      })
      .finally(() => {
        if (requestId === listRequestRef.current) setLoading(false);
      });
  };

  const queryTenantOptions = async (keyword = '', scopeType = activeScope) => {
    await ServiceApi.getTenantOptions(keyword, scopeType).then(({ bizData }) => {
      setTenantOptions(bizData || []);
    });
  };

  useEffect(() => {
    queryTenantOptions('', activeScope);
    queryList({ pageNo: PaginationInitData.pageNo, pageSize: PaginationInitData.pageSize });
  }, []);

  useEffect(() => {
    setExpandedRowKeys(tableRows.map((item) => item.key));
  }, [tableRows]);

  useEffect(() => {
    const hasPendingUnsubscribe = dataList.records.some((record) =>
      record.productList.some((item) =>
        ['unsubscribing', 'auto_unsubscribing'].includes(item.cloudResourceStatus || ''),
      ),
    );
    if (!hasPendingUnsubscribe) return undefined;
    const timer = window.setTimeout(() => {
      void queryList();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [dataList.records]);

  useEffect(() => {
    const root = tableContentRef.current;
    if (!root) return;

    const heightWithMargins = (element: Element | null, fallback = 0) => {
      if (!element) return fallback;
      const style = window.getComputedStyle(element);
      return (
        element.getBoundingClientRect().height +
        (Number.parseFloat(style.marginTop) || 0) +
        (Number.parseFloat(style.marginBottom) || 0)
      );
    };

    const updateTableLayout = () => {
      const toolbar = root.getElementsByClassName(styles.toolbar)[0] || null;
      const tableHeader = root.querySelector('.arco-table-header');
      const pagination = root.querySelector('.arco-pagination');
      const nextHeight =
        root.clientHeight -
        heightWithMargins(toolbar, 52) -
        heightWithMargins(tableHeader, 55) -
          heightWithMargins(pagination, 48) -
          2;
      setTableScrollY(Math.max(180, Math.floor(nextHeight)));
      setTableContentWidth(root.clientWidth);
    };

    updateTableLayout();
    const resizeObserver = new ResizeObserver(updateTableLayout);
    resizeObserver.observe(root);
    window.addEventListener('resize', updateTableLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateTableLayout);
    };
  }, [dataList.current, dataList.records, dataList.size]);

  const getResizableColumnProps = (columnKey: ColumnKey, minWidth = MIN_COLUMN_WIDTHS[columnKey]) => ({
    minWidth,
    width: columnWidths[columnKey],
  });

  const handleSearch = () => {
    const nextParams = formatSearchParams(searchForm.getFieldsValue());
    setQueryParams(nextParams);
    queryList({ ...nextParams, pageNo: PaginationInitData.pageNo });
  };

  const handleReset = () => {
    searchForm.resetFields();
    const nextParams = formatSearchParams(searchForm.getFieldsValue());
    setQueryParams(nextParams);
    queryList({ ...nextParams, pageNo: PaginationInitData.pageNo, pageSize: PaginationInitData.pageSize });
  };

  const handleScopeChange = (nextScope: string) => {
    const typedScope = nextScope as TenantScopeType;
    setActiveScope(typedScope);
    searchForm.resetFields();
    setQueryParams({});
    setDataList(getDefaultPageData());
    queryTenantOptions('', typedScope);
    queryList({ pageNo: PaginationInitData.pageNo, pageSize: PaginationInitData.pageSize }, typedScope);
  };

  const openDrawer = async (mode: DrawerMode, record?: AuthorizationRecord) => {
    if (mode === 'edit' && record && isAuthorizationOpening(record)) {
      message.warning('云资源开通中，不允许再次编辑');
      return;
    }

    setDrawerMode(mode);
    setCurrentRecord(record || null);
    setDrawerOpen(true);

    if (!record) {
      const products = createDefaultProductList();
      setDrawerProducts(products);
      setSelectedTenant(null);
      drawerForm.setFieldsValue({ productList: products, relationNo: undefined, tenantId: undefined });
      return;
    }

    setLoading(true);
    await ServiceApi.getAuthorizationDetail(record.id)
      .then(({ bizData }) => {
        if (!bizData) return;
        const tenant = {
          adminName: bizData.tenantAdministrator,
          id: bizData.tenantId,
          name: bizData.tenantName,
        };
        const products = createDefaultProductList().map((item) => {
          const activeProduct = bizData.productList.find(
            (productItem) => productItem.productType === item.productType,
          );
          return activeProduct || item;
        });
        setTenantOptions((prev) => {
          const exists = prev.some((item) => item.id === tenant.id);
          return exists ? prev : [tenant, ...prev];
        });
        setSelectedTenant(tenant);
        setDrawerProducts(products);
        drawerForm.setFieldsValue({
          productList: products,
          relationNo: bizData.relationNo === '-' ? undefined : bizData.relationNo,
          tenantId: bizData.tenantId,
        });
      })
      .finally(() => setLoading(false));
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setCurrentRecord(null);
    setSelectedTenant(null);
    setDrawerProducts(createDefaultProductList());
    setCloudActionLoading(null);
    setCloudOptionsError('');
    setDurationProduct(null);
    setDrawerSubmitting(false);
    drawerForm.resetFields();
  };

  const openCloudAnnotationEditDrawer = async (
    matcher: (item: AuthorizedProduct) => boolean,
  ) => {
    searchForm.resetFields();
    setActiveScope('qsb');
    setQueryParams({});
    void queryTenantOptions('', 'qsb');
    const { bizData } = await ServiceApi.getAuthorizationList({
      pageNo: PaginationInitData.pageNo,
      pageSize: 50,
      scopeType: 'qsb',
    });
    if (bizData) setDataList(bizData);
    const targetRecord = bizData?.records.find((record) =>
      record.productList.some(
        (item) => item.productType === ProductTypeEnum.CLOUD_DESK && item.status === 1 && matcher(item),
      ),
    );
    if (targetRecord) {
      await openDrawer('edit', targetRecord);
      return;
    }
    message.warning('未找到可定位的云资源示例数据');
  };

  useEffect(() => {
    const prepareCreateAuthorization = (products = createDefaultProductList()) => {
      searchForm.resetFields();
      setActiveScope('qsb');
      setQueryParams({});
      setDrawerMode('create');
      setCurrentRecord(null);
      setSelectedTenant(null);
      setDrawerProducts(products);
      setDrawerOpen(true);
      drawerForm.setFieldsValue({ productList: products, relationNo: undefined, tenantId: undefined });
      void queryTenantOptions('', 'qsb');
    };
    const openCreateAuthorization = () => {
      prepareCreateAuthorization();
    };
    const openCreateCloudDeskAuthorization = () => {
      prepareCreateAuthorization(createCloudDeskAllocatedProducts());
    };
    const openFailedAuthorization = () => {
      void openCloudAnnotationEditDrawer((item) =>
        cloudFailureStatuses.includes(item.cloudResourceStatus || 'opened'),
      );
    };
    const locateAuthorizationResultStatus = () => {
      closeDrawer();
      searchForm.resetFields();
      setActiveScope('qsb');
      setQueryParams({});
      void queryTenantOptions('', 'qsb');
      void queryList({
        pageNo: PaginationInitData.pageNo,
        pageSize: 50,
        tenantName: undefined,
        productType: undefined,
        modifyByName: undefined,
        modifyTimeStart: undefined,
        modifyTimeEnd: undefined,
        createByName: undefined,
        createTimeStart: undefined,
        createTimeEnd: undefined,
      }, 'qsb');
    };
    const openReleaseAuthorization = () => {
      void openCloudAnnotationEditDrawer((item) => item.cloudResourceStatus === 'release_period');
    };
    const openOpenedAuthorization = () => {
      void openCloudAnnotationEditDrawer((item) => (item.cloudResourceStatus || 'opened') === 'opened');
    };
    const openUnsubscribedAuthorization = () => {
      void openCloudAnnotationEditDrawer((item) => item.cloudResourceStatus === 'unsubscribed');
    };

    window.addEventListener('cloud-resource:open-create-authorization', openCreateAuthorization);
    window.addEventListener('cloud-resource:open-create-cloud-desk-authorization', openCreateCloudDeskAuthorization);
    window.addEventListener('cloud-resource:open-edit-open-failed', openFailedAuthorization);
    window.addEventListener('cloud-resource:locate-authorization-result-status', locateAuthorizationResultStatus);
    window.addEventListener('cloud-resource:open-edit-release-period', openReleaseAuthorization);
    window.addEventListener('cloud-resource:open-edit-opened', openOpenedAuthorization);
    window.addEventListener('cloud-resource:open-edit-unsubscribed', openUnsubscribedAuthorization);
    return () => {
      window.removeEventListener('cloud-resource:open-create-authorization', openCreateAuthorization);
      window.removeEventListener('cloud-resource:open-create-cloud-desk-authorization', openCreateCloudDeskAuthorization);
      window.removeEventListener('cloud-resource:open-edit-open-failed', openFailedAuthorization);
      window.removeEventListener('cloud-resource:locate-authorization-result-status', locateAuthorizationResultStatus);
      window.removeEventListener('cloud-resource:open-edit-release-period', openReleaseAuthorization);
      window.removeEventListener('cloud-resource:open-edit-opened', openOpenedAuthorization);
      window.removeEventListener('cloud-resource:open-edit-unsubscribed', openUnsubscribedAuthorization);
    };
  });

  const openLogDrawer = (record: AuthorizationTableRow) => {
    setLogTenantName(record.tenantName);
    setLogRows(buildAuthorizationLogRows(record));
    setLogDrawerOpen(true);
  };

  const updateDrawerProducts = (nextProducts: AuthorizedProduct[]) => {
    setDrawerProducts(nextProducts);
    drawerForm.setFieldsValue({ productList: nextProducts });
  };

  const updateProduct = (
    productType: ProductTypeEnum,
    updater: (item: AuthorizedProduct) => AuthorizedProduct,
  ) => {
    setDrawerProducts((currentProducts) => {
      return currentProducts.map((item) =>
        item.productType === productType ? updater(item) : item,
      );
    });
  };

  useEffect(() => {
    if (drawerOpen) drawerForm.setFieldsValue({ productList: drawerProducts });
  }, [drawerForm, drawerOpen, drawerProducts]);

  const updateHuoshanQuantity = (item: AuthorizedProduct, value: number | null) => {
    const nextTotalQty = normalizeCloudQuantity('huoshan', value);
    updateProduct(item.productType, (current) => ({
      ...current,
      cloudDesktopNames: normalizeCloudDesktopNames(
        selectedTenant?.name,
        nextTotalQty,
        current.cloudDesktopNames,
      ),
      totalQty: nextTotalQty,
    }));
  };

  const loadCloudImages = async (
    productType: ProductTypeEnum,
    cloudType: CloudType,
    instanceSpec: string,
  ) => {
    setCloudOptionsLoading(true);
    setCloudOptionsError('');
    try {
      const { bizData } = await ServiceApi.getCloudImageOptions(cloudType, instanceSpec);
      const records = bizData?.records || [];
      setCloudImageOptions((prev) => ({ ...prev, [cloudType]: records }));
      updateProduct(productType, (current) => {
        if (current.cloudType !== cloudType) return current;
        const selectedImage =
          records.find((option) => option.value === current.imageId) ||
          records.find((option) => option.value === bizData?.lastUsedImageId) ||
          records[0];
        return {
          ...current,
          imageId: selectedImage?.value,
          imageName: selectedImage?.label,
          instanceSpec,
        };
      });
    } catch {
      setCloudOptionsError('镜像列表加载失败，请重试');
      setCloudImageOptions((prev) => ({ ...prev, [cloudType]: [] }));
    } finally {
      setCloudOptionsLoading(false);
    }
  };

  const loadCloudConfiguration = async (item: AuthorizedProduct) => {
    const cloudType = item.cloudType || 'wuying';
    if (cloudType === 'wuying') {
      setCloudOptionsError('');
      return;
    }
    setCloudOptionsLoading(true);
    setCloudOptionsError('');
    try {
      const { bizData } = await ServiceApi.getCloudInstanceSpecOptions(cloudType);
      const options = bizData || [];
      setCloudSpecOptions((prev) => ({ ...prev, [cloudType]: options }));
      const instanceSpec =
        options.find((option) => option.value === item.instanceSpec)?.value || options[0]?.value;
      if (!instanceSpec) throw new Error('no instance specs');
      await loadCloudImages(item.productType, cloudType, instanceSpec);
    } catch {
      setCloudOptionsError('云资源配置加载失败，请重试');
    } finally {
      setCloudOptionsLoading(false);
    }
  };

  const activeCloudProduct = drawerProducts.find(
    (item) => item.productType === ProductTypeEnum.CLOUD_DESK && item.status === 1,
  );
  const activeCloudType = activeCloudProduct?.cloudType;
  const cloudSubmitBlockedByResourceStatus = Boolean(
    drawerMode === 'edit' &&
      activeCloudProduct?.cloudResourceStatus &&
      cloudSubmitBlockingStatuses.includes(activeCloudProduct.cloudResourceStatus),
  );
  const drawerActionSubmitting = drawerSubmitting || Boolean(cloudActionLoading) || durationSubmitting;
  const submitButtonLoading = drawerActionSubmitting || cloudSubmitBlockedByResourceStatus;
  const submitButtonDisabled = submitButtonLoading;

  useEffect(() => {
    if (
      !drawerOpen ||
      !activeCloudProduct ||
      !activeCloudType ||
      activeCloudType === 'wuying'
    ) {
      return;
    }
    void loadCloudConfiguration(activeCloudProduct);
  }, [drawerOpen, activeCloudType]);

  const handleToggleProduct = (item: AuthorizedProduct) => {
    const nextStatus = item.status === 1 ? 0 : 1;
    const nextItem = {
      ...item,
      authEndTime: nextStatus === 1 ? dayjs().add(1, 'year').format('YYYY-MM-DD 23:59:59') : '',
      authStartTime: nextStatus === 1 ? dayjs().format('YYYY-MM-DD 00:00:00') : '',
      cloudOpenType:
        nextStatus === 1 && item.productType === ProductTypeEnum.CLOUD_DESK
          ? item.cloudOpenType || 'trial'
          : item.cloudOpenType,
      cloudResourceStatus:
        nextStatus === 1 && item.productType === ProductTypeEnum.CLOUD_DESK
          ? item.cloudType === 'huoshan' || item.cloudType === 'tianyi'
            ? item.cloudResourceStatus || 'opening'
            : 'opened'
          : item.cloudResourceStatus,
      configType: nextStatus === 1 && isConnectorProduct(item.productType) ? item.configType || 1 : item.configType,
      connectorList: nextStatus === 1 ? item.connectorList || [] : [],
      cloudDesktopNames:
        nextStatus === 1 && item.productType === ProductTypeEnum.CLOUD_DESK
          ? normalizeCloudDesktopNames(selectedTenant?.name, item.totalQty || 1, item.cloudDesktopNames)
          : item.cloudDesktopNames,
      resourceExpireTime:
        nextStatus === 1 && item.productType === ProductTypeEnum.CLOUD_DESK
          ? dayjs().add(1, 'year').format('YYYY-MM-DD 23:59:59')
          : item.resourceExpireTime,
      status: nextStatus as 0 | 1,
      totalQty: nextStatus === 1 ? item.totalQty || 1 : undefined,
    };
    updateProduct(item.productType, () => nextItem);
    if (nextStatus === 1 && item.productType === ProductTypeEnum.CLOUD_DESK) {
      void loadCloudConfiguration(nextItem);
    }
  };

  const createCloudDeskAllocatedProducts = () =>
    createDefaultProductList().map((item) => {
      if (item.productType !== ProductTypeEnum.CLOUD_DESK) return item;
      const totalQty = item.totalQty || 1;
      const authStartTime = dayjs().format('YYYY-MM-DD 00:00:00');
      const authEndTime = dayjs().add(1, 'year').format('YYYY-MM-DD 23:59:59');
      const cloudResourceStatus: CloudResourceStatus =
        item.cloudType === 'huoshan' || item.cloudType === 'tianyi' ? 'opening' : 'opened';
      return {
        ...item,
        authEndTime,
        authStartTime,
        cloudDesktopNames: normalizeCloudDesktopNames(undefined, totalQty, item.cloudDesktopNames),
        cloudOpenType: item.cloudOpenType || 'trial',
        cloudResourceStatus,
        resourceExpireTime: authEndTime,
        status: 1 as const,
        totalQty,
      };
    });

  const handleTenantChange = (tenantId?: string) => {
    const tenant = tenantOptions.find((item) => item.id === tenantId) || null;
    setSelectedTenant(tenant);
    updateDrawerProducts(
      drawerProducts.map((item) =>
        item.productType === ProductTypeEnum.CLOUD_DESK && item.cloudType === 'tianyi'
          ? buildTianyiResources(
              {
                ...item,
                cloudAccountName:
                  !item.cloudAccountName || item.cloudAccountName === 'ty-tenant'
                    ? getTianyiAccountName(tenant)
                    : item.cloudAccountName,
                cloudDesktopNames: normalizeCloudDesktopNames(tenant?.name, item.totalQty || 1, item.cloudDesktopNames, 3),
              },
              tenant,
            )
          : item,
      ),
    );
  };

  const handleSubmitDrawer = async () => {
    if (cloudActionLoading || durationSubmitting || cloudSubmitBlockedByResourceStatus) {
      return;
    }
    const values = await drawerForm.validate();
    const activeProducts = drawerProducts.filter((item) => item.status === 1);
    const cloudProduct = activeProducts.find((item) => item.productType === ProductTypeEnum.CLOUD_DESK);
    if (!activeProducts.length) {
      message.error('请至少选择一个已授权的数据源');
      return;
    }
    if (activeProducts.some((item) => !item.authStartTime || !item.authEndTime)) {
      message.error('请为已授权的数据源设置授权有效期');
      return;
    }
    if (activeProducts.some((item) => item.configType === 2 && !item.connectorList?.length)) {
      message.error('请添加数据源');
      return;
    }
    if (cloudProduct) {
      const quantityLimit = getCloudQuantityLimit(cloudProduct.cloudType);
      const quantity = Number(cloudProduct.totalQty || 0);
      if (quantity < 1) {
        message.error('云电脑开通数量至少为 1 台');
        return;
      }
      if (quantityLimit && quantity > quantityLimit) {
        message.error(`${cloudTypeOptions.find((item) => item.value === cloudProduct.cloudType)?.label || '云电脑'}单次最多开通 ${quantityLimit} 台`);
        return;
      }
      if (cloudProduct.cloudType !== 'wuying' && (!cloudProduct.instanceSpec || !cloudProduct.imageId)) {
        message.error('请选择云电脑规格和兼容镜像');
        return;
      }
      if (cloudProduct.cloudType !== 'wuying' && cloudOptionsLoading) {
        message.warning('云资源配置仍在加载，请稍后提交');
        return;
      }
      if (cloudProduct.cloudType !== 'wuying' && cloudOptionsError) {
        message.error(cloudOptionsError);
        return;
      }
      if (
        drawerMode === 'edit' &&
        cloudProduct.cloudResourceStatus &&
        cloudSubmitBlockingStatuses.includes(cloudProduct.cloudResourceStatus)
      ) {
        return;
      }
      await ServiceApi.saveLastUsedCloudImage(cloudProduct.cloudType || 'wuying', cloudProduct.imageId);
    }

    const service =
      drawerMode === 'edit' && currentRecord
        ? ServiceApi.updateAuthorization(currentRecord.id, { ...values, productList: drawerProducts }, selectedTenant)
        : ServiceApi.createAuthorization({ ...values, productList: drawerProducts }, selectedTenant, activeScope);

    setDrawerSubmitting(true);
    try {
      const { code } = await service;
      if (code === FrameWorkPortalSuccessCode) {
        message.success(drawerMode === 'edit' ? '更新成功' : cloudProduct ? '创建成功，云资源已开通' : '创建成功');
        closeDrawer();
        queryList({ pageNo: PaginationInitData.pageNo });
      }
    } finally {
      setDrawerSubmitting(false);
    }
  };

  const queryConnectorRows = async (productType: ProductTypeEnum, connectorName = '') => {
    setConnectorLoading(true);
    await ServiceApi.getConnectorPageList({ connectorName, productType })
      .then(({ bizData }) => setConnectorRows(bizData?.records || []))
      .finally(() => setConnectorLoading(false));
  };

  const openConnectorModal = async (item: AuthorizedProduct) => {
    setConnectorModalProduct(item);
    const selectedRows = item.connectorList || [];
    setConnectorSelectedRows(selectedRows);
    setConnectorSelectedKeys(selectedRows.map((connector) => connector.connectorId));
    setConnectorSearchValue('');
    setConnectorModalOpen(true);
    await queryConnectorRows(item.productType);
  };

  const handleConfirmConnectors = () => {
    if (!connectorModalProduct) return;
    updateProduct(connectorModalProduct.productType, (item) => ({
      ...item,
      connectorList: connectorSelectedRows.map((connector) => ({ ...connector, canDelete: 1 })),
    }));
    setConnectorModalOpen(false);
  };

  const updateCloudUnsubscribeStatus = (
    productType: ProductTypeEnum,
    status: Extract<
      CloudResourceStatus,
      'unsubscribing' | 'auto_unsubscribing' | 'unsubscribed' | 'unsubscribe_failed'
    >,
    options: {
      clientToken?: string;
      operation?: CloudUnsubscribeOperation;
      operationId?: string;
      trigger?: 'manual' | 'automatic' | 'retry';
      vendorErrorMessage?: string;
      vendorStatus?: string;
    } = {},
  ) => {
    updateProduct(productType, (current) => {
      if (options.operation) return applyCloudUnsubscribeOperation(current, options.operation);
      const pending = status === 'unsubscribing' || status === 'auto_unsubscribing';
      const completed = status === 'unsubscribed';
      const failed = status === 'unsubscribe_failed';
      const bindStatus = completed ? '已解绑' : pending ? '解绑中' : failed ? '解绑失败' : undefined;
      return {
        ...current,
        cloudDesktopResources: current.cloudDesktopResources?.map((resource) => ({
          ...resource,
          bindStatus: bindStatus || resource.bindStatus,
          errorMessage: failed ? options.vendorErrorMessage : undefined,
          status,
        })),
        cloudResourceStatus: status,
        failCount: completed ? 0 : failed ? current.totalQty || 1 : current.failCount,
        releaseExpireTime: completed ? undefined : current.releaseExpireTime,
        releaseStartTime: completed ? undefined : current.releaseStartTime,
        successCount: completed || failed ? 0 : current.successCount,
        vendorClientToken: options.clientToken || current.vendorClientToken,
        vendorErrorMessage: failed ? options.vendorErrorMessage || '云厂商释放失败' : undefined,
        vendorOperationId: options.operationId || current.vendorOperationId,
        vendorOperationStatus: options.vendorStatus || current.vendorOperationStatus,
        vendorOperationTime: options.operationId ? dayjs().format('YYYY-MM-DD HH:mm:ss') : current.vendorOperationTime,
        vendorOperationTrigger: options.trigger || current.vendorOperationTrigger,
      };
    });
  };

  const persistCloudOperation = async (
    productType: ProductTypeEnum,
    operation: CloudUnsubscribeOperation,
  ) => {
    const status =
      operation.status === 'pending'
        ? operation.trigger === 'automatic'
          ? 'auto_unsubscribing'
          : 'unsubscribing'
        : operation.status === 'succeeded'
          ? 'unsubscribed'
          : 'unsubscribe_failed';
    updateCloudUnsubscribeStatus(productType, status, { operation });
    if (currentRecord) {
      await ServiceApi.persistCloudUnsubscribeStatus(currentRecord.id, {
        operation,
        status,
      });
    }
  };

  const retryCloudResource = async (item: AuthorizedProduct) => {
    if (!cloudFailureStatuses.includes(item.cloudResourceStatus || 'opened')) return;
    const transition = getRetryTransition(item.cloudResourceStatus);
    const unsubscribeRetry = item.cloudResourceStatus === 'unsubscribe_failed';
    const cloudType = item.cloudType || 'wuying';
    const actionKey = `retry-${item.productType}`;
    if (unsubscribeRetry) {
      const failedResources = buildCloudUnsubscribeResources(item).filter((resource) =>
        item.cloudDesktopResources?.some(
          (desktop) => desktop.desktopId === resource.resourceId && desktop.status === 'unsubscribe_failed',
        ),
      );
      if (!failedResources.length) {
        message.warning('暂无可重试的释放失败资源');
        return;
      }
      const confirmed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: '确认重试释放失败资源？',
          content: `将重试 ${failedResources.length} 台释放失败的云电脑；已释放成功的资源不会再次提交。`,
          okText: '失败重试',
          onCancel: () => resolve(false),
          onOk: () => resolve(true),
        });
      });
      if (!confirmed) return;
    }
    setCloudActionLoading(actionKey);
    try {
      if (unsubscribeRetry) {
        const failedResources = buildCloudUnsubscribeResources(item).filter((resource) =>
          item.cloudDesktopResources?.some(
            (desktop) => desktop.desktopId === resource.resourceId && desktop.status === 'unsubscribe_failed',
          ),
        );
        const retryToken = createClientToken('retry-release', {
          attemptContext: item.vendorOperationId || 'unsubscribe_failed',
          authorizationId: currentRecord?.id,
          resourceId: failedResources.map((resource) => resource.resourceId).join('_'),
        });
        const { bizData: operation } = await ServiceApi.simulateCloudOperation({
          clientToken: retryToken,
          cloudType,
          operation: 'unsubscribe',
          resources: failedResources,
          trigger: 'retry',
        });
        if (!operation) throw new Error('释放重试未返回受理结果');
        await persistCloudOperation(item.productType, operation);
        const { bizData: result } = await ServiceApi.queryCloudUnsubscribeResult({
          cloudType,
          operationId: operation.operationId,
        });
        if (!result) throw new Error('释放重试结果未返回');
        await persistCloudOperation(item.productType, result);
        if (currentRecord) await queryList();
        if (result.status === 'succeeded') message.success('释放重试成功');
        else message.error(result.status === 'partial_failed' ? '部分云电脑释放失败，请继续重试' : '释放重试失败');
        return;
      }

      const failedResources = getFailedCloudDesktopResources(item);
      const failedResourceIds = new Set(failedResources.map((resource) => resource.desktopId).filter(Boolean));
      const fallbackFailureCount = Math.max(1, item.failCount || item.totalQty || 1);
      const retryResourceCount = failedResources.length || fallbackFailureCount;
      const shouldRetryResource = (resource: CloudDesktopResource, index: number) =>
        failedResourceIds.size > 0 ? failedResourceIds.has(resource.desktopId) : index < fallbackFailureCount;

      updateProduct(item.productType, (current) => ({
        ...current,
        cloudResourceStatus: transition.pendingStatus,
        cloudDesktopResources: current.cloudDesktopResources?.map((resource, index) =>
          shouldRetryResource(resource, index)
            ? {
                ...resource,
                status: transition.pendingStatus,
              }
            : resource,
        ),
      }));
      await ServiceApi.simulateCloudOperation({
        clientToken: createClientToken(actionKey, {
          attemptContext: item.vendorOperationId || item.cloudResourceStatus || 'retry',
          authorizationId: currentRecord?.id,
          resourceId: Array.from(failedResourceIds).join('_') || 'failed',
        }),
        cloudType,
        operation: item.cloudResourceStatus === 'renew_failed' ? 'renew' : 'retry',
        resourceCount: retryResourceCount,
      });
      if (drawerMode === 'edit' && currentRecord) {
        const nextResources = item.cloudDesktopResources?.map((resource, index) =>
          shouldRetryResource(resource, index)
            ? {
                ...resource,
                bindStatus: item.cloudType === 'tianyi' ? '用户已绑定' : resource.bindStatus,
                errorMessage: undefined,
                status: transition.targetStatus,
              }
            : resource,
        );
        await ServiceApi.persistCloudProductOperation(currentRecord.id, {
          cloudDesktopResources: nextResources,
          operation: 'retry',
        });
      }
      updateProduct(item.productType, (current) => ({
        ...current,
        cloudDesktopResources: current.cloudDesktopResources?.map((resource, index) =>
          shouldRetryResource(resource, index)
            ? {
                ...resource,
                bindStatus: item.cloudType === 'tianyi' ? '用户已绑定' : resource.bindStatus,
                errorMessage: undefined,
                status: transition.targetStatus,
              }
            : resource,
        ),
        cloudResourceStatus: transition.targetStatus,
        failCount: 0,
        status: 1,
        successCount:
          current.cloudDesktopResources?.filter((resource, index) =>
            shouldRetryResource(resource, index) || resource.status === transition.targetStatus,
          ).length ||
          current.totalQty ||
          1,
        vendorClientToken: undefined,
        vendorErrorMessage: undefined,
        vendorOperationId: undefined,
        vendorOperationStatus: undefined,
        vendorOperationTime: undefined,
        vendorOperationTrigger: undefined,
        vendorRequestCount: undefined,
      }));
      if (currentRecord) await queryList();
      message.success('云资源重试成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '云资源重试失败';
      if (!unsubscribeRetry) {
        updateProduct(item.productType, (current) => ({
          ...current,
          cloudResourceStatus: item.cloudResourceStatus,
          vendorErrorMessage: errorMessage,
        }));
      }
      message.error(errorMessage);
    } finally {
      setCloudActionLoading(null);
    }
  };

  const unsubscribeCloudResource = (item: AuthorizedProduct) => {
    const cloudType = item.cloudType || 'wuying';
    const providerLabel = getCloudTypeLabel(cloudType);
    Modal.confirm({
      title: '确认释放云资源？',
      content: `将向${providerLabel}提交 ${item.totalQty || 1} 台云电脑的释放申请。释放成功的云电脑会同步解绑 1:1 附带的机器人令牌；单独的机器人令牌授权额度不受影响。提交后先进入“释放中”，厂商确认完成后才会变为“已释放”。${getUnsubscribeConsequence(cloudType)}是否继续？`,
      okText: '释放',
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        const actionKey = `unsubscribe-${item.productType}`;
        const clientToken = `manual-release-${currentRecord?.id || 'new'}-${item.releaseExpireTime || item.authEndTime || item.productType}`;
        setCloudActionLoading(actionKey);
        try {
          const { bizData } = await ServiceApi.simulateCloudOperation({
            clientToken,
            cloudType,
            operation: 'unsubscribe',
            resources: buildCloudUnsubscribeResources(item).filter((resource) =>
              item.cloudDesktopResources?.some(
                (desktop) => desktop.desktopId === resource.resourceId && desktop.status !== 'unsubscribed',
              ),
            ),
            trigger: 'manual',
          });
          if (!bizData) throw new Error('释放请求未返回受理结果');
          await persistCloudOperation(item.productType, bizData);
          message.info(`释放申请已提交，正在等待${providerLabel}确认`);
          void ServiceApi.queryCloudUnsubscribeResult({ cloudType, operationId: bizData.operationId })
            .then(async ({ bizData: result }) => {
              if (!result) throw new Error('云厂商释放结果未返回');
              await persistCloudOperation(item.productType, result);
              if (currentRecord) await queryList();
              if (result.status === 'succeeded') message.success(`${providerLabel}释放成功`);
              else if (result.status === 'partial_failed') message.error(`${providerLabel}部分云电脑释放失败，请重试失败资源`);
              else message.error(`${providerLabel}释放失败，请重试`);
            })
            .catch(() => {
              message.warning('厂商结果查询暂时失败，系统将继续使用原操作单查询，不会重复提交释放');
              window.setTimeout(() => {
                if (currentRecord) void queryList();
              }, 1200);
            });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '云厂商释放失败';
          updateCloudUnsubscribeStatus(item.productType, 'unsubscribe_failed', {
            clientToken,
            trigger: 'manual',
            vendorErrorMessage: errorMessage,
            vendorStatus: '释放失败',
          });
          if (currentRecord) {
            await ServiceApi.persistCloudUnsubscribeStatus(currentRecord.id, {
              clientToken,
              status: 'unsubscribe_failed',
              trigger: 'manual',
              vendorErrorMessage: errorMessage,
              vendorStatus: '释放失败',
            });
            await queryList();
          }
          message.error(`${providerLabel}释放申请提交失败，请重试`);
        } finally {
          setCloudActionLoading(null);
        }
      },
    });
  };

  const openDurationModal = (item: AuthorizedProduct) => {
    if (drawerMode === 'edit' && !cloudRenewableStatuses.includes(item.cloudResourceStatus || 'opened')) return;
    setDurationValue(ServiceApi.cloudProviderPolicies[item.cloudType || 'wuying'].renewPeriods[0] || 1);
    setDurationProduct(item);
  };

  const handleDurationConfirm = async () => {
    if (!durationProduct) return;
    const isRenew = drawerMode === 'edit';
    if (isRenew && !cloudRenewableStatuses.includes(durationProduct.cloudResourceStatus || 'opened')) {
      message.error('当前状态不支持续期，请先处理失败任务');
      setDurationProduct(null);
      return;
    }
    const renewPeriods = ServiceApi.cloudProviderPolicies[durationProduct.cloudType || 'wuying'].renewPeriods;
    if (renewPeriods.length && !renewPeriods.includes(durationValue)) {
      message.error('所选续期时长不在当前云厂商支持范围内');
      return;
    }
    const durationMonths = durationValue;
    const currentResourceExpireTime = getCloudResourceExpireTime(durationProduct);
    const currentEndTime = currentResourceExpireTime ? dayjs(currentResourceExpireTime) : dayjs();
    const baseTime = isRenew && currentEndTime.isAfter(dayjs()) ? currentEndTime : dayjs();
    const nextStartTime = isRenew
      ? durationProduct.authStartTime || dayjs().format('YYYY-MM-DD 00:00:00')
      : dayjs().format('YYYY-MM-DD 00:00:00');
    const nextEndTime = baseTime.add(durationMonths, 'month').format('YYYY-MM-DD 23:59:59');
    setDurationSubmitting(true);
    if (isRenew) {
      updateProduct(durationProduct.productType, (item) => ({
        ...item,
        cloudResourceStatus: 'renewing',
        cloudDesktopResources: item.cloudDesktopResources?.map((resource) => ({ ...resource, status: 'renewing' })),
      }));
    }
    try {
      await ServiceApi.simulateCloudOperation({
        clientToken: createClientToken(isRenew ? 'renew' : 'open-duration', {
          attemptContext: String(durationValue),
          authorizationId: currentRecord?.id,
          resourceId: durationProduct.cloudDesktopResources?.map((resource) => resource.desktopId).join('_') || 'all',
        }),
        cloudType: durationProduct.cloudType,
        operation: isRenew ? 'renew' : 'open',
        resourceCount: durationProduct.totalQty,
      });
      if (isRenew && currentRecord) {
        await ServiceApi.persistCloudProductOperation(currentRecord.id, {
          authEndTime: nextEndTime,
          authStartTime: nextStartTime,
          operation: 'renew',
        });
      }
      updateProduct(durationProduct.productType, (item) => {
        const baseItem: AuthorizedProduct = {
          ...item,
          authEndTime: nextEndTime,
          authStartTime: nextStartTime,
          cloudType: item.cloudType || 'wuying',
          cloudResourceStatus: 'opened',
          failCount: 0,
          releaseExpireTime: undefined,
          releaseStartTime: undefined,
          resourceExpireTime: nextEndTime,
          status: 1,
          successCount: item.totalQty || 1,
          totalQty: item.totalQty || 1,
          vendorClientToken: undefined,
          vendorErrorMessage: undefined,
          vendorOperationId: undefined,
          vendorOperationStatus: undefined,
          vendorOperationTime: undefined,
          vendorOperationTrigger: undefined,
          vendorRequestCount: undefined,
        };
        return {
          ...baseItem,
          cloudDesktopResources: baseItem.cloudDesktopResources?.map((resource) => ({
            ...resource,
            errorMessage: undefined,
            expireTime: nextEndTime,
            status: 'opened',
          })),
        };
      });
      if (currentRecord) await queryList();
      setDurationProduct(null);
      message.success(isRenew ? '续期成功' : '授权时长已更新');
    } finally {
      setDurationSubmitting(false);
    }
  };

  const renderCloudResourceActions = (item: AuthorizedProduct) => {
    if (drawerMode === 'create' || drawerReadonly) return null;
    const status = item.cloudResourceStatus || 'opened';
    const hasAction =
      cloudRenewableStatuses.includes(status) ||
      cloudFailureStatuses.includes(status) ||
      cloudUnsubscribableStatuses.includes(status);
    if (!hasAction) return null;
    return (
      <AnnotationMarker noteId="CRA-1.9">
        <Space size={4}>
          {cloudRenewableStatuses.includes(status) ? (
            <Button
              type="text"
              loading={cloudActionLoading === `renew-${item.productType}`}
              onClick={() => openDurationModal(item)}
            >
              续期
            </Button>
          ) : null}
          {cloudFailureStatuses.includes(status) ? (
            <AnnotationMarker noteId="CRA-1.5">
              <Button
                type="text"
                loading={cloudActionLoading === `retry-${item.productType}`}
                onClick={() => void retryCloudResource(item)}
              >
                失败重试
              </Button>
            </AnnotationMarker>
          ) : null}
          {cloudUnsubscribableStatuses.includes(status) ? (
            <AnnotationMarker noteId="CRA-1.7">
              <Button
                type="text"
                status="danger"
                loading={cloudActionLoading === `unsubscribe-${item.productType}`}
                onClick={() => unsubscribeCloudResource(item)}
              >
                释放
              </Button>
            </AnnotationMarker>
          ) : null}
        </Space>
      </AnnotationMarker>
    );
  };

  const columns: ColumnProps<AuthorizationTableRow>[] = [
    {
      title: '租户名',
      dataIndex: 'tenantName',
      ellipsis: true,
      fixed: 'left',
      ...getResizableColumnProps('tenantName'),
      render: (value: string, record) =>
        record.isTenant ? (
          <div className={styles.tenantNameCell}>
            {renderTextWithTooltip(value, { className: styles.tenantNameText, bold: true })}
            <Tag className={styles.childCountTag}>{record.childCount} 条</Tag>
          </div>
        ) : null,
    },
    {
      title: '授权产品',
      key: 'productList',
      dataIndex: 'productList',
      render: (value, record) => (record.isTenant ? null : renderProductList(value)),
      ...getResizableColumnProps('productList'),
    },
    {
      title: '数据源资源范围',
      key: 'connectorScope',
      dataIndex: 'productList',
      render: (value, record) => (record.isTenant ? null : renderConnectorScope(value)),
      ...getResizableColumnProps('connectorScope'),
    },
    {
      title: '有效期至',
      key: 'expireTime',
      dataIndex: 'productList',
      render: (value, record) => (record.isTenant ? null : renderExpireTime(value)),
      ...getResizableColumnProps('expireTime'),
    },
    {
      title: '关联合同/订单',
      dataIndex: 'relationNo',
      ellipsis: true,
      render: (value, record) => (record.isTenant ? null : renderTextWithTooltip(value)),
      ...getResizableColumnProps('relationNo'),
    },
    {
      title: '更新人',
      dataIndex: 'modifyByName',
      render: (value, record) => (record.isTenant ? null : renderTextWithTooltip(value)),
      ...getResizableColumnProps('modifyByName'),
    },
    {
      title: '更新时间',
      dataIndex: 'modifyTime',
      render: (value, record) => (record.isTenant ? null : renderTextWithTooltip(value)),
      ...getResizableColumnProps('modifyTime'),
    },
    {
      title: '创建人',
      dataIndex: 'createByName',
      render: (value, record) => (record.isTenant ? null : renderTextWithTooltip(value)),
      ...getResizableColumnProps('createByName'),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      render: (value, record) => (record.isTenant ? null : renderTextWithTooltip(value)),
      ...getResizableColumnProps('createTime'),
    },
    {
      title: '操作',
      dataIndex: 'action',
      fixed: 'right',
      className: styles.actionColumn,
      ...getResizableColumnProps('action'),
      render: (_, record) =>
        record.isTenant ? (
          <Link onClick={() => openLogDrawer(record)}>日志</Link>
        ) : (
          <Space size={8} className={styles.actionButtons}>
            {isAuthorizationOpening(record) ? (
              <Tooltip content="云资源开通中，不允许再次编辑">
                <Typography.Text type="secondary" style={{ cursor: 'not-allowed' }}>
                  编辑
                </Typography.Text>
              </Tooltip>
            ) : (
              <Link onClick={() => openDrawer('edit', record)}>编辑</Link>
            )}
            <Link onClick={() => openDrawer('detail', record)}>详情</Link>
          </Space>
        ),
    },
  ];

  const tableColumnsWidth = Object.values(columnWidths).reduce((total, width) => total + width, 0);
  const tableScrollX = Math.max(tableColumnsWidth, tableContentWidth + ACTION_COLUMN_WIDTH);
  const drawerReadonly = drawerMode === 'detail';
  const scopeTabs = tenantScopeItems;
  const keywordLabel = keywordSearchOptions.find((item) => item.value === keywordField)?.label || '租户名';

  return (
    <Layout className={styles.tenantPage}>
      <PageHeader className={styles.pageHeader}>
        <Row>
          <Col span={24}>
            <Tabs
              activeTab={activeScope}
              className={styles.scopeTabs}
              headerPadding={false}
              onChange={handleScopeChange}
              type="rounded"
            >
              {scopeTabs.map((item) => (
                <TabPane key={item.key} title={item.label} />
              ))}
            </Tabs>
          </Col>
        </Row>
      </PageHeader>

      <PageContent className={styles.pageContent}>
        <Card bordered={false} className={styles.tableCard}>
          <div ref={tableContentRef} className={styles.tableContent}>
            <Row align="center" className={styles.toolbar} gutter={16} justify="space-between">
              <Col className={styles.toolbarFilters} flex="auto">
                <Form
                  form={searchForm}
                  initialValues={{ keywordField: 'tenantName' }}
                  layout="inline"
                  onSubmit={handleSearch}
                >
              <div className={styles.keywordSearchItem}>
                <Input.Group compact className={`${styles.keywordSearchGroup} qsb-arco-composite-search`}>
                  <Form.Item field="keywordField" noStyle>
                    <Select className={styles.keywordFieldSelect} options={keywordSearchOptions} />
                  </Form.Item>
                  <Form.Item field="keyword" noStyle>
                    <Input.Search
                      allowClear
                      className={styles.keywordSearchInput}
                      placeholder={`请输入${keywordLabel}`}
                      onSearch={handleSearch}
                    />
                  </Form.Item>
                </Input.Group>
              </div>
              <Form.Item field="modifyDate">
                <DatePicker.RangePicker
                  allowClear
                  placeholder={['更新日期起', '更新日期止']}
                  style={{ width: 190 }}
                  onChange={handleSearch}
                />
              </Form.Item>
              <Form.Item field="productType">
                <Select
                  allowClear
                  placeholder="授权产品"
                  options={productTypeOptions}
                  style={{ width: 120 }}
                  onChange={handleSearch}
                />
              </Form.Item>
              <Form.Item field="createDate">
                <DatePicker.RangePicker
                  allowClear
                  placeholder={['创建日期起', '创建日期止']}
                  style={{ width: 190 }}
                  onChange={handleSearch}
                />
              </Form.Item>
              <Form.Item>
                <Button type="text" onClick={handleReset}>
                  重置
                </Button>
              </Form.Item>
                </Form>
              </Col>
              <Col className={styles.toolbarAction} flex="none">
                <Button type="primary" icon={<IconPlus />} onClick={() => openDrawer('create')}>
                  新增授权
                </Button>
              </Col>
            </Row>

          <Table<AuthorizationTableRow>
            rowKey="key"
            loading={loading}
            columns={columns}
            data={tableRows}
            expandedRowKeys={expandedRowKeys as (string | number)[]}
            onExpandedRowsChange={(keys) => setExpandedRowKeys([...keys])}
            scroll={{ x: tableScrollX, y: tableScrollY }}
            pagination={{
              current: Number(dataList.current || 1),
              pageSize: Number(dataList.size || 20),
              total: Number(dataList.total || 0),
              showJumper: true,
              sizeCanChange: true,
              sizeOptions: [20, 50],
              showTotal: (total) => `共 ${total} 条`,
              onChange: (pageNo, pageSize) => queryList({ pageNo, pageSize }),
            }}
            />
          </div>
        </Card>
      </PageContent>

      <Drawer
        title={drawerMode === 'create' ? '新增授权' : drawerMode === 'edit' ? '编辑授权' : '授权详情'}
        visible={drawerOpen}
        onCancel={() => {
          if (!drawerActionSubmitting) closeDrawer();
        }}
	        width={720}
	        unmountOnExit
        footer={
          <Space>
            <Button disabled={drawerActionSubmitting} onClick={closeDrawer}>取消</Button>
            {!drawerReadonly && drawerMode === 'create' ? (
              <AnnotationMarker noteId="CRA-1.2">
                <Button
                  type="primary"
                  disabled={submitButtonDisabled}
                  loading={submitButtonLoading}
                  onClick={handleSubmitDrawer}
                >
                  确定
                </Button>
              </AnnotationMarker>
            ) : !drawerReadonly ? (
              <Button
                type="primary"
                disabled={submitButtonDisabled}
                loading={submitButtonLoading}
                onClick={handleSubmitDrawer}
              >
                确定
              </Button>
            ) : null}
          </Space>
        }
      >
        <Spin loading={loading} block>
          <Form
            form={drawerForm}
            layout="vertical"
            disabled={drawerReadonly}
            initialValues={{ productList: createDefaultProductList() }}
          >
            <Form.Item
              label="授权租户"
              field="tenantId"
              rules={[{ required: true, message: '请输入授权租户' }]}
            >
              <Select
                showSearch
                allowClear
                disabled={drawerMode !== 'create'}
                filterOption={false}
                placeholder="请输入授权租户"
                options={tenantOptions.map((item) => ({ label: item.name, value: item.id }))}
                onChange={handleTenantChange}
                onSearch={(value) => queryTenantOptions(value, activeScope)}
              />
            </Form.Item>

            {selectedTenant ? (
              <div className={styles.tenantContent}>
                <div className={styles.tenantOption}>
                  <div className={styles.tenantTitle}>租户ID</div>
                  <div className={styles.tenantText}>{selectedTenant.id}</div>
                </div>
                <div className={styles.tenantOption}>
                  <div className={styles.tenantTitle}>租户名</div>
                  <div className={styles.tenantText}>{selectedTenant.name}</div>
                </div>
                <div className={styles.tenantOption}>
                  <div className={styles.tenantTitle}>租户管理员</div>
                  <div className={styles.tenantText}>{selectedTenant.adminName}</div>
                </div>
              </div>
            ) : null}

            <Form.Item label="关联合同/订单" field="relationNo">
              <Input placeholder="请输入订单号或合同号" />
            </Form.Item>
            <Form.Item label="可授权权益" field="productList">
              <div className={styles.interestList}>
                {drawerProducts.map((item) => (
                  <div
                    className={styles.interestItem}
                    data-note-id={
                      drawerMode === 'create' && item.productType === ProductTypeEnum.CLOUD_DESK
                        ? 'CRA-1.1'
                        : undefined
                    }
                    key={item.productType}
                  >
	                    <div className={styles.interestTop}>
	                      <div className={styles.interestTitle}>
	                        {item.couplerName}
		                        {drawerMode !== 'create' &&
		                        (item.status === 1 || (drawerMode === 'edit' && item.productType === ProductTypeEnum.CLOUD_DESK)) &&
		                        item.productType === ProductTypeEnum.CLOUD_DESK
		                          ? renderCloudResourceStatusTag(item)
		                          : null}
	                      </div>
                      {!drawerReadonly && drawerMode === 'create' ? (
                        <Button
                          type="text"
                          status={item.status === 1 ? 'danger' : 'default'}
                          icon={<IconPlus />}
                          onClick={() => handleToggleProduct(item)}
                        >
                          {item.status === 1 ? '取消授权' : '分配授权'}
                        </Button>
                      ) : !drawerReadonly &&
                        drawerMode === 'edit' &&
                        item.status === 1 &&
                        item.productType === ProductTypeEnum.CLOUD_DESK ? (
                        renderCloudResourceActions(item)
                      ) : null}
                    </div>

                    {item.status === 1 || (drawerMode === 'edit' && item.productType === ProductTypeEnum.CLOUD_DESK) ? (
                      <div className={styles.interestBody}>
	                        {item.productType === ProductTypeEnum.CLOUD_DESK ? (
	                          <div style={{ marginBottom: 16 }}>
	                            {drawerMode === 'create' ? (
	                              <Typography.Text type="secondary">
	                                授权云桌面会自动附带对应数量的机器人令牌
	                              </Typography.Text>
	                            ) : null}
		                            <div data-note-id={drawerMode === 'edit' ? 'CRA-1.3' : undefined} style={{ marginTop: 8 }}>
		                              <Radio.Group
	                                disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
		                                value={item.cloudType || 'wuying'}
	                                onChange={(value) => {
	                                  const nextCloudType = value as CloudType;
	                                  const providerChanged = nextCloudType !== item.cloudType;
	                                  const nextTotalQty = normalizeCloudQuantity(nextCloudType, item.totalQty);
	                                  const nextStartTime = providerChanged
	                                    ? dayjs().format('YYYY-MM-DD 00:00:00')
	                                    : item.authStartTime || dayjs().format('YYYY-MM-DD 00:00:00');
	                                  const nextEndTime = providerChanged
	                                    ? dayjs()
	                                        .add(nextCloudType === 'huoshan' ? 1 : 12, 'month')
	                                        .format('YYYY-MM-DD 23:59:59')
	                                    : item.authEndTime || dayjs().add(1, 'year').format('YYYY-MM-DD 23:59:59');
	                                  const nextItem: AuthorizedProduct = {
	                                      ...item,
	                                      authEndTime: nextEndTime,
	                                      authStartTime: nextStartTime,
	                                      cloudOpenType: providerChanged && nextCloudType === 'huoshan' ? 'trial' : item.cloudOpenType || 'trial',
	                                      cloudResourceStatus:
	                                        drawerMode === 'edit'
	                                          ? 'unsubscribed'
	                                          : nextCloudType === 'huoshan' || nextCloudType === 'tianyi'
	                                            ? 'opening'
	                                            : 'opened',
		                                      cloudType: nextCloudType,
		                                      cloudAccountId: nextCloudType === item.cloudType ? item.cloudAccountId : undefined,
		                                      cloudAccountName:
		                                        nextCloudType === 'tianyi' ? getTianyiAccountName(selectedTenant) : undefined,
		                                      cloudDesktopResources: nextCloudType === item.cloudType ? item.cloudDesktopResources : [],
		                                      cloudDesktopNames: normalizeCloudDesktopNames(
		                                        selectedTenant?.name,
		                                        nextTotalQty,
		                                        nextCloudType === item.cloudType ? item.cloudDesktopNames : [],
		                                        nextCloudType === 'tianyi' ? 3 : 2,
		                                      ),
		                                      failCount: nextCloudType === item.cloudType ? item.failCount : 0,
	                                      imageId: nextCloudType === item.cloudType ? item.imageId : undefined,
	                                      imageName: nextCloudType === item.cloudType ? item.imageName : undefined,
	                                      instanceSpec: nextCloudType === item.cloudType ? item.instanceSpec : undefined,
		                                      releaseExpireTime: undefined,
		                                      releaseStartTime: undefined,
	                                      resourceExpireTime: providerChanged ? nextEndTime : item.resourceExpireTime || nextEndTime,
		                                      status: 1,
		                                      successCount: nextCloudType === item.cloudType ? item.successCount : 0,
		                                      totalQty: nextTotalQty,
		                                      vendorErrorMessage:
		                                        nextCloudType === item.cloudType ? item.vendorErrorMessage : undefined,
		                                    };
		                                  const normalizedNextItem =
		                                    nextCloudType === 'tianyi' ? buildTianyiResources(nextItem, selectedTenant) : nextItem;
		                                  updateProduct(item.productType, () => normalizedNextItem);
		                                  void loadCloudConfiguration(normalizedNextItem);
		                                }}
	                              >
	                                {cloudTypeOptions.map((option) => (
	                                  <Radio key={option.value} value={option.value}>
	                                    {option.label}
	                                  </Radio>
	                                ))}
		                              </Radio.Group>
	                            </div>
	                            {item.cloudResourceStatus === 'release_period' ? (
	                              <AnnotationMarker noteId="CRA-1.6">
	                                <Alert
	                                  className={styles.releasePeriodAlert}
	                                  showIcon
	                                  type="warning"
	                                  title="授权已到期，处于 7 天释放期"
	                                  content={getReleasePeriodDescription(item)}
	                                  style={{ marginTop: 12 }}
	                                />
	                              </AnnotationMarker>
		                            ) : null}
		                            {item.vendorOperationStatus ? (
		                              <Typography.Text
		                                type={item.cloudResourceStatus === 'unsubscribe_failed' ? 'error' : 'secondary'}
		                                style={{ display: 'block', marginTop: 8 }}
		                              >
		                                {getCloudTypeLabel(item.cloudType)}状态：{item.vendorOperationStatus}
		                                {item.vendorOperationId ? ` · 操作单 ${item.vendorOperationId}` : ''}
		                                {item.vendorOperationTrigger
		                                  ? ` · ${item.vendorOperationTrigger === 'automatic' ? '系统自动' : item.vendorOperationTrigger === 'retry' ? '失败重试' : '手动提交'}`
		                                  : ''}
		                                {item.vendorRequestCount ? ` · ${item.vendorRequestCount} 批请求` : ''}
		                              </Typography.Text>
                            ) : null}
		                            {item.cloudOperationLogs?.length ? (
		                              <div style={{ marginTop: 8 }}>
                                <AnnotationMarker noteId="CRA-3.3">
                                  <Typography.Text bold>云资源操作记录</Typography.Text>
                                </AnnotationMarker>
		                                {[...item.cloudOperationLogs].reverse().slice(0, 3).map((log) => (
		                                  <Typography.Text
		                                    key={log.operationId}
		                                    type={log.failCount ? 'error' : 'secondary'}
		                                    style={{ display: 'block', marginTop: 4 }}
		                                  >
		                                    {dayjs(log.completedAt || log.submittedAt).format('YYYY-MM-DD HH:mm:ss')} ·
		                                    {log.trigger === 'automatic' ? '系统自动' : log.trigger === 'retry' ? '失败重试' : '手动提交'} ·
		                                    {log.requestCount} 批 · 成功 {log.successCount} / 失败 {log.failCount}
                                        {log.unboundRobotTokenCount ? ` · 解绑附带机器人令牌 ${log.unboundRobotTokenCount}` : ''}
		                                  </Typography.Text>
		                                ))}
		                              </div>
		                            ) : null}
	                            {item.cloudType === 'huoshan' ? (
	                              <div className={styles.cloudDeskConfig}>
	                                <div className={styles.cloudFieldRow}>
	                                  <span className={styles.cloudFieldLabel}>开通类型</span>
	                                  <Radio.Group
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
	                                    options={cloudOpenTypeOptions}
	                                    type="button"
	                                    value={item.cloudOpenType || 'trial'}
	                                    onChange={(value) =>
	                                      updateProduct(item.productType, (current) => ({
	                                        ...current,
	                                        cloudOpenType: value,
	                                      }))
	                                    }
	                                  />
	                                </div>
	                                <div className={styles.cloudFieldRow}>
	                                  <span className={styles.cloudFieldLabel}>共享带宽包</span>
	                                  <Typography.Text>
	                                    {(item.cloudOpenType || 'trial') === 'contract' ? 'hetong' : 'shiyong'}
	                                  </Typography.Text>
	                                </div>
	                                <Descriptions
	                                  border
	                                  column={2}
	                                  size="small"
	                                  title="开通配置"
	                                  data={[
	                                    { key: 'chargeType', label: '计费方式', value: '包年包月' },
	                                    { key: 'region', label: '地域 / 可用区', value: '华东2（上海） / 可用区C' },
	                                    { key: 'network', label: '网络配置', value: '固定配置' },
	                                    { key: 'credential', label: '登录凭证', value: '系统预置' },
	                                  ]}
	                                />
	                                <div className={styles.cloudFieldRow}>
	                                  <span className={styles.cloudFieldLabel}>授权时长</span>
	                                  <Select
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
	                                    options={huoshanPurchaseDurationOptions}
	                                    style={{ width: 160 }}
	                                    value={
	                                      item.authStartTime && item.authEndTime
	                                        ? Math.max(
	                                            1,
	                                            dayjs(item.authEndTime).diff(dayjs(item.authStartTime), 'month'),
	                                          )
		                                        : 1
	                                    }
	                                    onChange={(month) =>
	                                      updateProduct(item.productType, (current) => {
	                                        const startTime = current.authStartTime
	                                          ? dayjs(current.authStartTime)
	                                          : dayjs();
	                                        return {
		                                          ...current,
		                                          authEndTime: startTime.add(month, 'month').format('YYYY-MM-DD 23:59:59'),
		                                          authStartTime: startTime.format('YYYY-MM-DD 00:00:00'),
		                                          resourceExpireTime: startTime.add(month, 'month').format('YYYY-MM-DD 23:59:59'),
	                                        };
	                                      })
	                                    }
	                                  />
	                                </div>
	                                <div className={styles.cloudFieldRow}>
	                                  <span className={styles.cloudFieldLabel}>实例规格</span>
		                                  <Select
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
		                                    loading={cloudOptionsLoading}
		                                    options={cloudSpecOptions.huoshan || []}
		                                    value={item.instanceSpec}
		                                    onChange={(value) => {
		                                      updateProduct(item.productType, (current) => ({ ...current, instanceSpec: value }));
		                                      void loadCloudImages(item.productType, 'huoshan', value);
		                                    }}
		                                  />
	                                </div>
	                                <div className={styles.cloudFieldRow}>
	                                  <span className={styles.cloudFieldLabel}>镜像</span>
	                                  <Select
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
		                                    loading={cloudOptionsLoading}
		                                    notFoundContent={cloudOptionsError || '暂无兼容镜像'}
	                                    showSearch
		                                    options={cloudImageOptions.huoshan || []}
		                                    value={item.imageId}
	                                    onChange={(value) =>
	                                      updateProduct(item.productType, (current) => ({
	                                        ...current,
	                                        imageId: value,
	                                        imageName: (cloudImageOptions.huoshan || []).find((option) => option.value === value)?.label,
	                                      }))
	                                    }
	                                  />
	                                </div>
	                                <div className={styles.cloudFieldRow}>
	                                  <span className={styles.cloudFieldLabel}>开通数量</span>
	                                  <InputNumber
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
	                                    formatter={(value) =>
	                                      Number(value || 0) > huoshanMaxCreateCount
	                                        ? String(huoshanMaxCreateCount)
	                                        : String(value ?? '')
	                                    }
	                                    min={1}
	                                    max={huoshanMaxCreateCount}
	                                    parser={(value) =>
	                                      Math.min(
	                                        huoshanMaxCreateCount,
	                                        Math.max(1, Number(value || 1)),
	                                      )
	                                    }
	                                    precision={0}
	                                    style={{ width: 120 }}
	                                    value={item.totalQty || 1}
	                                    onBlur={(event) => updateHuoshanQuantity(item, Number(event.currentTarget.value || 1))}
	                                    onChange={(value) => updateHuoshanQuantity(item, value)}
	                                  />
	                                </div>
	                                <div className={styles.cloudNamePreview}>
	                                  <span className={styles.cloudFieldLabel}>云电脑名称</span>
		                                  <CloudDesktopNameTable
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
		                                    names={getCloudDesktopNames(item, selectedTenant?.name)}
		                                    onChange={(index, value) => {
		                                      const nextNames = getCloudDesktopNames(item, selectedTenant?.name);
		                                      nextNames[index] = value;
		                                      updateProduct(item.productType, (current) => ({ ...current, cloudDesktopNames: nextNames }));
		                                    }}
		                                  />
		                                </div>
			                              </div>
	                            ) : null}
	                            {item.cloudType === 'tianyi' ? (
	                              <div className={styles.cloudDeskConfig}>
	                                {cloudFailureStatuses.includes(item.cloudResourceStatus || 'opened') &&
	                                item.vendorErrorMessage ? (
	                                  <Alert
	                                    showIcon
	                                    type="error"
	                                    content={getTianyiFailureMessage(item)}
	                                  />
	                                ) : null}
	                                <div className={styles.cloudFieldRow}>
	                                  <span className={styles.cloudFieldLabel}>授权数量</span>
	                                  <InputNumber
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
	                                    min={1}
	                                    max={tianyiMaxCreateCount}
	                                    precision={0}
	                                    style={{ width: 120 }}
	                                    value={item.totalQty || 1}
	                                    onChange={(value) =>
	                                      updateProduct(item.productType, (current) =>
	                                        buildTianyiResources(
	                                          {
	                                            ...current,
	                                            totalQty: normalizeCloudQuantity('tianyi', value),
	                                            cloudDesktopNames: normalizeCloudDesktopNames(
	                                              selectedTenant?.name,
	                                              normalizeCloudQuantity('tianyi', value),
	                                              current.cloudDesktopNames,
	                                              3,
	                                            ),
	                                          },
	                                          selectedTenant,
	                                        ),
	                                      )
	                                    }
	                                  />
	                                </div>
	                                <div className={styles.cloudFieldRow}>
	                                  <span className={styles.cloudFieldLabel}>授权时长</span>
	                                  <Select
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
	                                    options={tianyiPurchaseDurationOptions}
	                                    style={{ width: 160 }}
	                                    value={
	                                      item.authStartTime && item.authEndTime
	                                        ? Math.max(1, dayjs(item.authEndTime).diff(dayjs(item.authStartTime), 'month'))
	                                        : 12
	                                    }
	                                    onChange={(month) =>
	                                      updateProduct(item.productType, (current) => {
	                                        const startTime = current.authStartTime ? dayjs(current.authStartTime) : dayjs();
	                                        return buildTianyiResources(
	                                          {
	                                            ...current,
	                                            authEndTime: startTime.add(month, 'month').format('YYYY-MM-DD 23:59:59'),
	                                            authStartTime: startTime.format('YYYY-MM-DD 00:00:00'),
	                                            resourceExpireTime: startTime.add(month, 'month').format('YYYY-MM-DD 23:59:59'),
	                                          },
	                                          selectedTenant,
	                                        );
	                                      })
	                                    }
	                                  />
	                                </div>
	                                <div className={styles.cloudFieldRow}>
	                                  <span className={styles.cloudFieldLabel}>规格</span>
	                                  <Select
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
	                                    loading={cloudOptionsLoading}
	                                    options={cloudSpecOptions.tianyi || []}
	                                    value={item.instanceSpec}
	                                    onChange={(value) => {
	                                      updateProduct(item.productType, (current) => ({
	                                        ...current,
	                                        instanceSpec: value,
	                                      }));
	                                      void loadCloudImages(item.productType, 'tianyi', value);
	                                    }}
	                                  />
	                                </div>
	                                <div className={styles.cloudFieldRow}>
	                                  <span className={styles.cloudFieldLabel}>镜像</span>
	                                  <Select
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
	                                    loading={cloudOptionsLoading}
	                                    notFoundContent={cloudOptionsError || '暂无兼容镜像'}
	                                    showSearch
	                                    options={cloudImageOptions.tianyi || []}
	                                    value={item.imageId}
	                                    onChange={(value) =>
	                                      updateProduct(item.productType, (current) => ({
	                                        ...current,
	                                        imageId: value,
	                                        imageName: (cloudImageOptions.tianyi || []).find((option) => option.value === value)?.label,
	                                      }))
	                                    }
	                                  />
	                                </div>
	                                <div className={styles.cloudFieldRow}>
	                                  <span className={styles.cloudFieldLabel}>用户账号</span>
	                                  <Input
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
	                                    value={item.cloudAccountName || getTianyiAccountName(selectedTenant)}
	                                    onChange={(nextValue) =>
	                                      updateProduct(item.productType, (current) => ({
	                                        ...current,
	                                        cloudAccountName: nextValue,
	                                      }))
	                                    }
	                                  />
	                                </div>
	                                <div className={styles.cloudNamePreview}>
	                                  <span className={styles.cloudFieldLabel}>云电脑名称</span>
	                                  <CloudDesktopNameTable
	                                    disabled={isCloudConfigDisabled(drawerReadonly, drawerMode, item)}
	                                    names={getCloudDesktopNames(item, selectedTenant?.name)}
	                                    onChange={(index, value) => {
	                                      const nextNames = getCloudDesktopNames(item, selectedTenant?.name);
	                                      nextNames[index] = value;
	                                      updateProduct(item.productType, (current) =>
	                                        buildTianyiResources(
	                                          {
	                                            ...current,
	                                            cloudDesktopNames: nextNames,
	                                          },
	                                          selectedTenant,
	                                        ),
	                                      );
	                                    }}
	                                  />
	                                </div>
	                                <Table
	                                  columns={[
	                                    { title: '云电脑名称', dataIndex: 'desktopName', width: 150 },
	                                    {
	                                      title: '实例ID',
	                                      dataIndex: 'desktopId',
	                                      width: 180,
	                                      render: (value) => value || '—',
	                                    },
	                                  ]}
	                                  data={buildTianyiResources(item, selectedTenant).cloudDesktopResources || []}
	                                  pagination={{ pageSize: 10, sizeCanChange: false }}
	                                  rowKey={(resource) => resource.desktopId || resource.desktopName}
	                                  scroll={{ x: 330 }}
	                                  size="small"
	                                />
			                              </div>
	                            ) : null}
	                          </div>
	                        ) : null}

                        {item.productType === ProductTypeEnum.CLOUD_DESK &&
                        (item.cloudType === 'huoshan' || item.cloudType === 'tianyi') ? null : (
	                        <div className={styles.quantityControl}>
                          <InputNumber
	                            disabled={
	                              item.productType === ProductTypeEnum.CLOUD_DESK
	                                ? isCloudConfigDisabled(drawerReadonly, drawerMode, item)
	                                : drawerReadonly || isExpired(item)
	                            }
                            min={1}
                            max={99999}
                            precision={0}
                            style={{ width: 80 }}
                            value={item.totalQty || (drawerMode === 'edit' && item.productType === ProductTypeEnum.CLOUD_DESK ? 1 : undefined)}
                            onChange={(value) =>
                              updateProduct(item.productType, (current) => ({
                                ...current,
                                cloudDesktopNames:
                                  current.productType === ProductTypeEnum.CLOUD_DESK
                                    ? normalizeCloudDesktopNames(
                                        selectedTenant?.name,
                                        Number(value || 1),
                                        current.cloudDesktopNames,
                                      )
                                    : current.cloudDesktopNames,
                                totalQty: Number(value || 1),
                              }))
                            }
                          />
                          <DatePicker.RangePicker
                            disabled={drawerReadonly || isExpired(item) || item.productType === ProductTypeEnum.CLOUD_DESK}
                            disabledDate={(current) => current.isBefore(dayjs().startOf('day'))}
                            style={{ flex: 1 }}
                            value={
                              firstDateValue(item) ||
                              (drawerMode === 'edit' && item.productType === ProductTypeEnum.CLOUD_DESK
                                ? [dayjs(), dayjs().add(1, 'year')]
                                : null)
                            }
                            onChange={(dates) =>
                              updateProduct(item.productType, (current) => ({
                                ...current,
	                                authEndTime: dates?.[1] ? dayjs(dates[1]).format('YYYY-MM-DD 23:59:59') : '',
	                                authStartTime: dates?.[0] ? dayjs(dates[0]).format('YYYY-MM-DD 00:00:00') : '',
                              }))
                            }
                          />
			                          {item.productType === ProductTypeEnum.CLOUD_DESK && drawerMode === 'create' ? (
		                            <Button type="text" onClick={() => openDurationModal(item)}>
			                              选择授权时长
			                            </Button>
			                          ) : null}
	                        </div>
                        )}

                        {isConnectorProduct(item.productType) ? (
                          <>
                            <div style={{ marginBottom: 8 }}>
                              <span style={{ marginRight: 8 }}>{item.couplerName}授权范围</span>
                              <Radio.Group
                                disabled={drawerReadonly || isExpired(item)}
                                value={String(item.configType || 1)}
                                onChange={(value) =>
                                  updateProduct(item.productType, (current) => ({
                                    ...current,
                                    configType: Number(value) as 1 | 2,
                                  }))
                                }
                              >
                                <Radio value="1">全部</Radio>
                                <Radio value="2">自定义</Radio>
                              </Radio.Group>
                              {item.configType === 2 ? (
                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                  已选{item.connectorList?.length || 0}条
                                </Typography.Text>
                              ) : null}
                            </div>
                            {item.configType === 2 ? (
                              <>
                                <div className={styles.connectorTools}>
                                  <span>数据源</span>
                                  <Button
                                    disabled={drawerReadonly || isExpired(item)}
                                    icon={<IconPlus />}
                                    size="small"
                                    type="text"
                                    onClick={() => openConnectorModal(item)}
                                  >
                                    添加数据源
                                  </Button>
                                </div>
                                <Table<ConnectorInfo>
                                  columns={[
                                    {
                                      dataIndex: 'connectorName',
                                      ellipsis: true,
                                      render: (text) => (
                                        <Tooltip content={text} position="tl">
                                          {text}
                                        </Tooltip>
                                      ),
                                      title: '数据源名称',
                                      width: 280,
                                    },
                                    {
                                      dataIndex: 'action',
                                      render: (_, connector) => (
                                        <Space size={8} className={styles.actionButtons}>
                                          <Link
                                            disabled={drawerReadonly || connector.canDelete !== 1 || isExpired(item)}
                                            onClick={() =>
                                              updateProduct(item.productType, (current) => ({
                                                ...current,
                                                connectorList:
                                                  current.connectorList?.filter(
                                                    (value) => value.connectorId !== connector.connectorId,
                                                  ) || [],
                                              }))
                                            }
                                          >
                                            删除
                                          </Link>
                                        </Space>
                                      ),
                                      className: styles.actionColumn,
                                      title: '操作',
                                      width: 80,
                                    },
                                  ]}
                                  data={item.connectorList || []}
                                  noDataElement="请添加数据源"
                                  pagination={false}
                                  rowKey="connectorId"
                                  size="small"
                                />
                              </>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Form.Item>
          </Form>
        </Spin>
      </Drawer>

      <Modal
        title="添加数据源"
	        visible={connectorModalOpen}
	        style={{ width: 1100 }}
	        unmountOnExit
        onCancel={() => setConnectorModalOpen(false)}
        onOk={handleConfirmConnectors}
        okButtonProps={{ disabled: !connectorSelectedKeys.length }}
      >
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search
            allowClear
            placeholder="请输入数据源名称"
            style={{ width: 220 }}
            value={connectorSearchValue}
            onChange={setConnectorSearchValue}
            onSearch={(value) => {
              if (connectorModalProduct) queryConnectorRows(connectorModalProduct.productType, value);
            }}
          />
          <Select placeholder="平台类型" style={{ width: 150 }} options={[{ label: '电商平台', value: 'mall' }]} />
          <Select placeholder="平台名称" style={{ width: 180 }} options={[{ label: '淘宝', value: 'taobao' }]} />
        </Space>
        <Table<ConnectorInfo>
          rowKey="connectorId"
          loading={connectorLoading}
          data={connectorRows}
          columns={[
            { title: '数据源名称', dataIndex: 'connectorName', ellipsis: true, width: 240 },
            { title: '平台类型', dataIndex: 'channel', render: () => '电商平台', width: 120 },
            { title: '平台名称', dataIndex: 'platform', render: () => '淘宝', width: 140 },
            { title: '路径', dataIndex: 'path', render: (_, record) => `/connector/${record.connectorId}` },
            { title: '页面截图', dataIndex: 'diagramUrlList', render: () => renderNoData(), width: 160 },
          ]}
          rowSelection={{
            preserveSelectedRowKeys: true,
            selectedRowKeys: connectorSelectedKeys,
            onChange: (selectedRowKeys, selectedRows) => {
              setConnectorSelectedKeys(selectedRowKeys);
              setConnectorSelectedRows(selectedRows);
            },
          }}
          pagination={{
            current: 1,
            pageSize: 20,
            showJumper: true,
            sizeCanChange: true,
            showTotal: (total) => `共 ${total} 条记录`,
            total: connectorRows.length,
          }}
          scroll={{ x: 890, y: 360 }}
          size="small"
        />
      </Modal>

      <Modal
	        title={drawerMode === 'edit' ? '续期时长' : '授权时长'}
	        visible={Boolean(durationProduct)}
	        confirmLoading={durationSubmitting}
	        okButtonProps={{ disabled: durationSubmitting }}
	        onCancel={() => {
	          if (!durationSubmitting) setDurationProduct(null);
	        }}
	        onOk={handleDurationConfirm}
      >
        <Alert
	        content={
            <Typography.Text type="warning">
	              云桌面{drawerMode === 'edit' ? '续期' : '开通'}将产生费用，请谨慎操作！
            </Typography.Text>
          }
          showIcon
          style={{ marginBottom: 20 }}
          type="warning"
        />
        <Form layout="vertical">
          <Form.Item label={drawerMode === 'edit' ? '当前到期时间' : '开始时间（默认为当天）'}>
            <DatePicker
              disabled
              style={{ width: '100%' }}
              value={
                drawerMode === 'edit' && durationProduct && getCloudResourceExpireTime(durationProduct)
                  ? dayjs(getCloudResourceExpireTime(durationProduct))
                  : dayjs()
              }
            />
          </Form.Item>
	          <Form.Item label={drawerMode === 'edit' ? '续期时长' : '开通时长'}>
	            {durationProduct && getRenewPeriodOptions(durationProduct).length ? (
	              <Select
	                value={durationValue}
	                onChange={setDurationValue}
	                options={getRenewPeriodOptions(durationProduct)}
	                style={{ width: '100%' }}
	              />
	            ) : (
	              <InputNumber
	                min={1}
	                precision={0}
	                value={durationValue}
	                onChange={(value) => setDurationValue(Number(value || 1))}
	                suffix="个月"
	                style={{ width: '100%' }}
	              />
	            )}
	          </Form.Item>
	          {durationProduct ? (
	            <Descriptions
	              border
	              column={1}
	              size="small"
	              data={[
	                {
	                  key: 'scope',
	                  label: drawerMode === 'edit' ? '续期范围' : '授权范围',
	                  value: `全部 ${durationProduct.totalQty || 1} 台云电脑`,
	                },
	                {
	                  key: 'nextExpireTime',
	                  label: drawerMode === 'edit' ? '续期后到期时间' : '开通后到期时间',
	                  value: (() => {
	                    const resourceExpireTime = getCloudResourceExpireTime(durationProduct);
	                    const currentEndTime = resourceExpireTime ? dayjs(resourceExpireTime) : dayjs();
	                    const baseTime = drawerMode === 'edit' && currentEndTime.isAfter(dayjs()) ? currentEndTime : dayjs();
	                    return baseTime.add(durationValue, 'month').format('YYYY-MM-DD 23:59:59');
	                  })(),
	                },
	              ]}
	            />
	          ) : null}
        </Form>
      </Modal>

      <Drawer
        title={`${logTenantName || '租户'}授权日志`}
	        visible={logDrawerOpen}
	        onCancel={() => setLogDrawerOpen(false)}
	        width={920}
	        unmountOnExit
      >
        <Table<AuthorizationLogRow>
          rowKey="key"
          data={logRows}
          columns={[
            {
              title: '授权产品',
              dataIndex: 'productName',
              width: 140,
              render: (value) => renderTextWithTooltip(value),
            },
            {
              title: '创建人',
              dataIndex: 'createByName',
              width: 100,
              render: (value) => renderTextWithTooltip(value),
            },
            {
              title: '创建时间',
              dataIndex: 'createTime',
              width: 160,
              render: (value) => renderTextWithTooltip(value),
            },
            {
              title: '更新人',
              dataIndex: 'modifyByName',
              width: 100,
              render: (value) => renderTextWithTooltip(value),
            },
            {
              title: '更新时间',
              dataIndex: 'modifyTime',
              width: 160,
              render: (value) => renderTextWithTooltip(value),
            },
            {
              title: '更改内容',
              dataIndex: 'changeContent',
              width: 360,
              render: (value) => renderTextWithTooltip(value),
            },
          ]}
          pagination={false}
          scroll={{ x: 1020, y: 520 }}
        />
      </Drawer>
    </Layout>
  );
}
