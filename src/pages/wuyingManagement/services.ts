import { FrameWorkPortalSuccessCode, PaginationInitData } from '@/constants';
import type { ListBackType } from '@/interface';
import {
  cloudProviderPolicies,
  getCloudResources,
  queryCloudUnsubscribeOperation,
  registerCloudResources,
  submitCloudUnsubscribe,
  updateCloudResources,
} from '@/mocks/cloudLifecycle';
import type {
  CloudOperationTrigger,
  CloudUnsubscribeOperation,
  SharedCloudResourceStatus,
} from '@/mocks/cloudLifecycle';
import type {
  DesktopInfo,
  ListOneBackType,
  ListParamsType,
  StatisticInfo,
} from './interface';
import { OnlineStateEnum, WuyingStatusEnum } from './types';

type DesktopRow = ListOneBackType & {
  configuration?: string;
  systemDiskSize?: string;
  dataDiskSize?: string;
  releaseExpireTime?: string;
  ticket?: string;
  todeskCode?: string;
  cloudType?: string;
  vendorErrorMessage?: string;
  vendorOperationId?: string;
  vendorStatus?: string;
};

const statusCoverageTenantName = '状态覆盖_demo';

function statusCoverageRow(params: {
  key: string;
  label: string;
  desktopStatus: WuyingStatusEnum;
  robotStatus?: OnlineStateEnum;
  expiredTime?: string;
  releaseExpireTime?: string;
  vendorErrorMessage?: string;
  vendorStatus?: string;
}): DesktopRow {
  return {
    desktopName: `云桌面状态覆盖-${params.label}`,
    desktopId: `ecd-status-${params.key}`,
    ticket: `status-${params.key}-wuying-demo`,
    todeskCode: `TD-800 ${params.key.slice(0, 3).toUpperCase()} 001`,
    cloudType: 'wuying',
    creationTime: '2026-07-10 10:00:00',
    expiredTime: params.expiredTime || '2026-10-10 00:00:00',
    authTenantName: statusCoverageTenantName,
    sessionUser: 'auto-operate',
    robotStatus: params.robotStatus,
    desktopStatus: params.desktopStatus,
    releaseExpireTime: params.releaseExpireTime,
    vendorErrorMessage: params.vendorErrorMessage,
    vendorStatus: params.vendorStatus,
  };
}

const statusCoverageRows: DesktopRow[] = [
  statusCoverageRow({
    key: 'running-free',
    label: '运行中',
    desktopStatus: WuyingStatusEnum.RUNNING,
    robotStatus: OnlineStateEnum.FREE,
  }),
  statusCoverageRow({
    key: 'connected-busy',
    label: '已连接',
    desktopStatus: WuyingStatusEnum.CONNECTED,
    robotStatus: OnlineStateEnum.BUSY,
  }),
  statusCoverageRow({
    key: 'stopped-offline',
    label: '已关机',
    desktopStatus: WuyingStatusEnum.STOPPED,
    robotStatus: OnlineStateEnum.NOTONLINE,
  }),
  statusCoverageRow({
    key: 'expired-offline',
    label: '已到期',
    desktopStatus: WuyingStatusEnum.EXPIRED,
    robotStatus: OnlineStateEnum.NOTONLINE,
    expiredTime: '2026-06-30 00:00:00',
  }),
  statusCoverageRow({
    key: 'starting-connecting',
    label: '启动中',
    desktopStatus: WuyingStatusEnum.STARTING,
    robotStatus: OnlineStateEnum.CONNECTING,
  }),
  statusCoverageRow({
    key: 'rebuilding-alone',
    label: '重建中',
    desktopStatus: WuyingStatusEnum.REBUILDING,
    robotStatus: OnlineStateEnum.ALONE,
  }),
  statusCoverageRow({
    key: 'stopping',
    label: '停止中',
    desktopStatus: WuyingStatusEnum.STOPPING,
    robotStatus: OnlineStateEnum.CONNECTING,
  }),
  statusCoverageRow({
    key: 'deleted',
    label: '已删除',
    desktopStatus: WuyingStatusEnum.DELETED,
    expiredTime: '--',
  }),
  statusCoverageRow({
    key: 'pending',
    label: '等待中',
    desktopStatus: WuyingStatusEnum.PENDING,
    robotStatus: OnlineStateEnum.CONNECTING,
  }),
  statusCoverageRow({
    key: 'open-failed',
    label: '开通失败',
    desktopStatus: WuyingStatusEnum.OPEN_FAILED,
    vendorErrorMessage: '网络包容量不足，云电脑开通失败',
  }),
  statusCoverageRow({
    key: 'renew-failed',
    label: '续期失败',
    desktopStatus: WuyingStatusEnum.RENEW_FAILED,
    vendorErrorMessage: '厂商续期接口返回失败',
  }),
  statusCoverageRow({
    key: 'release-period',
    label: '释放期',
    desktopStatus: WuyingStatusEnum.RELEASE_PERIOD,
    expiredTime: '2026-07-08 23:59:59',
    releaseExpireTime: '2026-07-15 23:59:59',
  }),
  statusCoverageRow({
    key: 'unsubscribing',
    label: '释放中',
    desktopStatus: WuyingStatusEnum.UNSUBSCRIBING,
    expiredTime: '2026-07-08 23:59:59',
    vendorStatus: '释放中',
  }),
  statusCoverageRow({
    key: 'auto-unsubscribing',
    label: '自动释放中',
    desktopStatus: WuyingStatusEnum.AUTO_UNSUBSCRIBING,
    expiredTime: '2026-07-08 23:59:59',
    releaseExpireTime: '2026-07-07 23:59:59',
    vendorStatus: '自动释放中',
  }),
  statusCoverageRow({
    key: 'unsubscribed',
    label: '已释放',
    desktopStatus: WuyingStatusEnum.UNSUBSCRIBED,
    expiredTime: '--',
    vendorStatus: '已释放',
  }),
  statusCoverageRow({
    key: 'unsubscribe-failed',
    label: '释放失败',
    desktopStatus: WuyingStatusEnum.UNSUBSCRIBE_FAILED,
    expiredTime: '2026-07-08 23:59:59',
    vendorErrorMessage: '模拟云厂商释放失败',
    vendorStatus: '释放失败',
  }),
];

const baseRows: DesktopRow[] = [
  ...statusCoverageRows,
  {
    desktopName: '云桌面API开通-75b2',
    desktopId: 'ecd-7h5v8dw3mqq5n6f2',
    ticket: '663287b52a9fecffc5765dfd37674f92',
    todeskCode: 'TD-824 517 903',
    cloudType: 'wuying',
    creationTime: '2026-07-08 14:09:00',
    expiredTime: '2026-09-09 00:00:00',
    authTenantName: 'DingDing_demo',
    sessionUser: 'auto-operate',
    robotStatus: OnlineStateEnum.FREE,
    desktopStatus: WuyingStatusEnum.RUNNING,
  },
  {
    desktopName: '云桌面API开通-release',
    desktopId: 'ecd-qsb-release-001',
    ticket: 'release-period-wuying-demo',
    todeskCode: 'TD-700 001 001',
    cloudType: 'wuying',
    creationTime: '2026-06-08 10:00:00',
    expiredTime: '2026-07-08 23:59:59',
    authTenantName: '实在智能科技有限公司',
    sessionUser: 'auto-operate',
    robotStatus: undefined,
    desktopStatus: WuyingStatusEnum.RELEASE_PERIOD,
    releaseExpireTime: '2026-07-15 23:59:59',
  },
  {
    desktopName: '云桌面API开通-release-failed',
    desktopId: 'ecd-qsb-release-failed-001',
    ticket: 'release-failed-wuying-demo',
    todeskCode: 'TD-700 001 002',
    cloudType: 'wuying',
    creationTime: '2026-06-01 10:00:00',
    expiredTime: '2026-06-30 23:59:59',
    authTenantName: '中海油数字化智能门户',
    sessionUser: 'auto-operate',
    robotStatus: undefined,
    desktopStatus: WuyingStatusEnum.UNSUBSCRIBE_FAILED,
    vendorErrorMessage: '模拟云厂商释放失败',
    vendorStatus: '释放失败',
  },
  {
    desktopName: '云桌面API开通-43fc',
    desktopId: 'ecd-crc8xw4xptqf6d1',
    ticket: '3f2ae57b54a3b8abf675cdb935a94a01',
    todeskCode: 'TD-631 842 115',
    cloudType: 'wuying',
    creationTime: '2026-07-03 14:27:13',
    expiredTime: '--',
    authTenantName: 'DingDing_default',
    sessionUser: 'auto-operate',
    robotStatus: undefined,
    desktopStatus: WuyingStatusEnum.DELETED,
  },
  {
    desktopName: '云桌面API开通-e91d',
    desktopId: 'ecd-93srisiagzxf9v3',
    ticket: 'eccc130cd318339d00b5b0863e36a183',
    todeskCode: 'TD-937 214 608',
    cloudType: 'wuying',
    creationTime: '2026-07-03 14:15:00',
    expiredTime: '2026-09-04 00:00:00',
    authTenantName: 'DingDing_demo',
    sessionUser: 'auto-operate',
    robotStatus: OnlineStateEnum.FREE,
    desktopStatus: WuyingStatusEnum.RUNNING,
  },
  {
    desktopName: '云桌面API开通-e742',
    desktopId: 'ecd-b1jlfpeqnq6d14a',
    ticket: '0ce3d4758395fe0d52c91bc9c9123df2',
    todeskCode: 'TD-520 774 912',
    cloudType: 'wuying',
    creationTime: '2026-07-01 11:23:00',
    expiredTime: '2026-10-02 00:00:00',
    authTenantName: 'DingDing_demo',
    sessionUser: 'auto-operate',
    robotStatus: undefined,
    desktopStatus: WuyingStatusEnum.RUNNING,
  },
  {
    desktopName: '云桌面API开通-0e17',
    desktopId: 'ecd-bmo2t20lajeo7k1',
    ticket: '7494e48bfb2e029b8048ced3e8f5d1ab',
    todeskCode: 'TD-308 665 421',
    cloudType: 'wuying',
    creationTime: '2026-07-01 10:56:00',
    expiredTime: '2026-08-02 00:00:00',
    authTenantName: 'DingDing_demo',
    sessionUser: 'auto-operate',
    robotStatus: OnlineStateEnum.FREE,
    desktopStatus: WuyingStatusEnum.RUNNING,
  },
  {
    desktopName: '云桌面API开通-8e03',
    desktopId: 'ecd-42gqyl1c0whzk0a',
    ticket: 'b1a7aeac8067612dc43eaca02166b3b4',
    todeskCode: 'TD-716 453 290',
    cloudType: 'wuying',
    creationTime: '2026-07-01 09:58:00',
    expiredTime: '2026-10-02 00:00:00',
    authTenantName: 'DingDing_ddd',
    sessionUser: 'auto-operate',
    robotStatus: undefined,
    desktopStatus: WuyingStatusEnum.RUNNING,
  },
  {
    desktopName: '云桌面API开通-d6fb',
    desktopId: 'ecd-cta86bnlohfeso2',
    ticket: '583c20a91b0baf0661984a2584071bfc',
    todeskCode: 'TD-455 190 277',
    cloudType: 'wuying',
    creationTime: '2026-06-23 15:49:07',
    expiredTime: '--',
    authTenantName: 'DingDing_Mall',
    sessionUser: 'auto-operate',
    robotStatus: OnlineStateEnum.FREE,
    desktopStatus: WuyingStatusEnum.STOPPED,
  },
];

const alphabet = 'abcdefghjkmnpqrstuvwxyz123456789';
const scheduledOperationQueries = new Set<string>();

function hashPart(index: number, length: number) {
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += alphabet[(index * 7 + i * 5) % alphabet.length];
  }
  return value;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function wait(milliseconds = 280) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function getMockExpiredTime(status: WuyingStatusEnum, created: Date) {
  if (status === WuyingStatusEnum.EXPIRED) return '2026-06-30 00:00:00';
  if ([WuyingStatusEnum.DELETED, WuyingStatusEnum.UNSUBSCRIBED].includes(status)) return '--';
  return formatDate(addDays(created, 90)).replace(/\d\d:\d\d:\d\d$/, '00:00:00');
}

function getMockRobotStatus(status: WuyingStatusEnum, index: number) {
  if (status === WuyingStatusEnum.RUNNING) return index % 2 === 0 ? OnlineStateEnum.FREE : OnlineStateEnum.ALONE;
  if (status === WuyingStatusEnum.CONNECTED) return OnlineStateEnum.BUSY;
  if ([WuyingStatusEnum.STARTING, WuyingStatusEnum.REBUILDING, WuyingStatusEnum.STOPPING, WuyingStatusEnum.PENDING].includes(status)) {
    return OnlineStateEnum.CONNECTING;
  }
  if ([WuyingStatusEnum.STOPPED, WuyingStatusEnum.EXPIRED].includes(status)) return OnlineStateEnum.NOTONLINE;
  return undefined;
}

function parseDateTime(value?: string) {
  if (!value) return null;
  const timestamp = new Date(value.replace(' ', 'T')).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function buildRows(): DesktopRow[] {
  const rows: DesktopRow[] = baseRows.map((row, index) => ({
    id: `seed-${index + 1}`,
    configuration: '4核8G / Windows Server',
    systemDiskSize: '80GB',
    dataDiskSize: '100GB',
    chargeType: '包年包月',
    ...row,
  }));

  const baseDate = new Date('2026-06-29T18:55:30');
  for (let i = rows.length; i < 176; i += 1) {
    const created = new Date(baseDate.getTime() - (i - rows.length) * 7 * 3600 * 1000);
    const runningIndex = i < 13;
    const stoppedIndex = i === 13;
    const desktopStatus = runningIndex
      ? WuyingStatusEnum.RUNNING
      : stoppedIndex
        ? WuyingStatusEnum.STOPPED
        : WuyingStatusEnum.DELETED;
    rows.push({
      id: `mock-${i + 1}`,
      desktopName: `云桌面API开通-${hashPart(i, 4)}`,
      desktopId: `ecd-${hashPart(i + 3, 15)}`,
      ticket: hashPart(i + 5, 32),
      todeskCode: `TD-${100 + i} ${hashPart(i, 3).toUpperCase()} ${300 + i}`,
      cloudType: 'wuying',
      creationTime: formatDate(created),
      expiredTime:
        desktopStatus === WuyingStatusEnum.RUNNING
          ? formatDate(addDays(created, 92)).replace(/\d\d:\d\d:\d\d$/, '00:00:00')
          : '--',
      authTenantName:
        i % 4 === 0
          ? 'DingDing_demo'
          : i % 4 === 1
            ? 'DingDing_Mall'
            : i % 4 === 2
              ? 'DingDing_ddd'
              : 'DingDing_default',
      sessionUser: 'auto-operate',
      robotStatus:
        desktopStatus === WuyingStatusEnum.RUNNING && i % 3 !== 0
          ? OnlineStateEnum.FREE
          : undefined,
      desktopStatus,
      configuration: '4核8G / Windows Server',
      systemDiskSize: '80GB',
      dataDiskSize: '100GB',
      chargeType: '包年包月',
    });
  }

  rows.push(...buildCloudRows('huoshan', '火山云桌面', 48, 6, 1));
  rows.push(...buildCloudRows('tianyi', '天翼云桌面', 32, 4, 1));
  return rows;
}

function buildCloudRows(
  cloudType: string,
  namePrefix: string,
  total: number,
  runningTotal: number,
  stoppedTotal: number,
): DesktopRow[] {
  const cloudRows: DesktopRow[] = [];
  const baseDate = new Date('2026-07-06T10:30:00');
  const lifecycleStatusCoverage = [
    WuyingStatusEnum.OPEN_FAILED,
    WuyingStatusEnum.RELEASE_PERIOD,
    WuyingStatusEnum.RENEW_FAILED,
    WuyingStatusEnum.UNSUBSCRIBING,
    WuyingStatusEnum.AUTO_UNSUBSCRIBING,
    WuyingStatusEnum.UNSUBSCRIBE_FAILED,
    WuyingStatusEnum.UNSUBSCRIBED,
    WuyingStatusEnum.PENDING,
    WuyingStatusEnum.CONNECTED,
    WuyingStatusEnum.EXPIRED,
    WuyingStatusEnum.STARTING,
    WuyingStatusEnum.REBUILDING,
    WuyingStatusEnum.STOPPING,
  ];
  for (let i = 0; i < total; i += 1) {
    const created = new Date(baseDate.getTime() - i * 6 * 3600 * 1000);
    const lifecycleCloud = cloudType === 'huoshan' || cloudType === 'tianyi';
    const coverageStatus = lifecycleCloud ? lifecycleStatusCoverage[i] : undefined;
    const fallbackIndex = lifecycleCloud ? i - lifecycleStatusCoverage.length : i;
    const desktopStatus =
      coverageStatus ||
      (fallbackIndex < runningTotal
        ? WuyingStatusEnum.RUNNING
        : fallbackIndex < runningTotal + stoppedTotal
          ? WuyingStatusEnum.STOPPED
          : WuyingStatusEnum.DELETED);
    const tenantName = i % 2 === 0 ? '林华' : '取数宝授权三';
    const tianyiSequence = String(i + 1).padStart(3, '0');
    cloudRows.push({
      id: `${cloudType}-${i + 1}`,
      desktopName: cloudType === 'tianyi' ? `${tenantName.replace(/授权三/, '')}${tianyiSequence}` : `${namePrefix}-${hashPart(i + 17, 4)}`,
      desktopId: `${cloudType === 'huoshan' ? 'volc' : 'cty'}-${hashPart(i + 21, 15)}`,
      ticket: hashPart(i + 29, 32),
      todeskCode: `TD-${cloudType === 'huoshan' ? 700 + i : 900 + i} ${hashPart(i + 9, 3).toUpperCase()} ${500 + i}`,
      cloudType,
      creationTime: formatDate(created),
      expiredTime: getMockExpiredTime(desktopStatus, created),
      releaseExpireTime:
        desktopStatus === WuyingStatusEnum.RELEASE_PERIOD
          ? '2026-07-15 23:59:59'
          : [WuyingStatusEnum.UNSUBSCRIBING, WuyingStatusEnum.AUTO_UNSUBSCRIBING].includes(desktopStatus)
            ? '2026-07-07 23:59:59'
            : undefined,
      authTenantName: cloudType === 'tianyi' ? tenantName : i % 2 === 0 ? 'DingDing_demo' : 'DingDing_Mall',
      sessionUser: 'auto-operate',
      robotStatus: getMockRobotStatus(desktopStatus, i),
      desktopStatus,
      configuration: cloudType === 'huoshan' ? '4核8G / 火山 Windows' : '4核8G / 天翼 Windows',
      systemDiskSize: '80GB',
      dataDiskSize: '100GB',
      chargeType: '包年包月',
      cloudAccountName: cloudType === 'tianyi' ? (i % 2 === 0 ? 'linhua' : 'qsb-shouquan-3') : undefined,
      bindStatus:
        cloudType === 'tianyi'
          ? desktopStatus === WuyingStatusEnum.OPEN_FAILED
            ? '—'
            : desktopStatus === WuyingStatusEnum.UNSUBSCRIBED
              ? '已解绑'
              : [WuyingStatusEnum.UNSUBSCRIBING, WuyingStatusEnum.AUTO_UNSUBSCRIBING].includes(desktopStatus)
                ? '解绑中'
              : desktopStatus === WuyingStatusEnum.UNSUBSCRIBE_FAILED
                  ? '解绑失败'
                  : '用户已绑定'
          : undefined,
      vendorErrorMessage:
        desktopStatus === WuyingStatusEnum.OPEN_FAILED
          ? '网络包容量不足，云电脑开通失败'
          : desktopStatus === WuyingStatusEnum.RENEW_FAILED
            ? '厂商续期接口返回失败'
            : desktopStatus === WuyingStatusEnum.UNSUBSCRIBE_FAILED
              ? '模拟云厂商释放失败'
              : undefined,
      vendorStatus:
        [WuyingStatusEnum.UNSUBSCRIBING, WuyingStatusEnum.AUTO_UNSUBSCRIBING].includes(desktopStatus)
          ? cloudProviderPolicies[cloudType as 'huoshan' | 'tianyi'].unsubscribePendingStatus
          : desktopStatus === WuyingStatusEnum.UNSUBSCRIBED
            ? cloudProviderPolicies[cloudType as 'huoshan' | 'tianyi'].unsubscribeSuccessStatus
            : desktopStatus === WuyingStatusEnum.UNSUBSCRIBE_FAILED
              ? '释放失败'
              : undefined,
    });
  }
  return cloudRows;
}

const rows = buildRows();

function toSharedStatus(status?: string): SharedCloudResourceStatus {
  if (status === WuyingStatusEnum.OPEN_FAILED) return 'open_failed';
  if (status === WuyingStatusEnum.RENEW_FAILED) return 'renew_failed';
  if (status === WuyingStatusEnum.RELEASE_PERIOD) return 'release_period';
  if (status === WuyingStatusEnum.UNSUBSCRIBING) return 'unsubscribing';
  if (status === WuyingStatusEnum.AUTO_UNSUBSCRIBING) return 'auto_unsubscribing';
  if (status === WuyingStatusEnum.UNSUBSCRIBED) return 'unsubscribed';
  if (status === WuyingStatusEnum.UNSUBSCRIBE_FAILED) return 'unsubscribe_failed';
  return 'opened';
}

function toDesktopStatus(status: SharedCloudResourceStatus) {
  if (status === 'opening') return WuyingStatusEnum.PENDING;
  if (status === 'open_failed') return WuyingStatusEnum.OPEN_FAILED;
  if (status === 'renewing') return WuyingStatusEnum.PENDING;
  if (status === 'renew_failed') return WuyingStatusEnum.RENEW_FAILED;
  if (status === 'release_period') return WuyingStatusEnum.RELEASE_PERIOD;
  if (status === 'unsubscribing') return WuyingStatusEnum.UNSUBSCRIBING;
  if (status === 'auto_unsubscribing') return WuyingStatusEnum.AUTO_UNSUBSCRIBING;
  if (status === 'unsubscribed') return WuyingStatusEnum.UNSUBSCRIBED;
  if (status === 'unsubscribe_failed') return WuyingStatusEnum.UNSUBSCRIBE_FAILED;
  return WuyingStatusEnum.RUNNING;
}

function registerDesktopRows(overwrite = false) {
  registerCloudResources(
    rows
      .filter(
        (row) =>
          row.desktopId &&
          !row.id?.startsWith('tenant-resource-') &&
          ['wuying', 'huoshan', 'tianyi'].includes(row.cloudType || ''),
      )
      .map((row) => ({
        bindStatus: row.bindStatus,
        chargeType: row.chargeType?.includes('按量') ? ('pay_as_you_go' as const) : ('subscription' as const),
        cloudType: row.cloudType as 'wuying' | 'huoshan' | 'tianyi',
        errorMessage: row.vendorErrorMessage,
        expireTime: row.expiredTime === '--' ? undefined : row.expiredTime,
        resourceId: row.desktopId!,
        resourceName: row.desktopName || row.desktopId!,
        source: 'cloud_management' as const,
        status: toSharedStatus(row.desktopStatus),
        tenantName: row.authTenantName,
        vendorOperationId: row.vendorOperationId,
        vendorStatus: row.vendorStatus,
      })),
    overwrite,
  );
}

function syncRowsFromSharedResources() {
  getCloudResources().forEach((resource) => {
    let desktop = rows.find((row) => row.desktopId === resource.resourceId);
    if (!desktop && resource.source === 'tenant_authorization') {
      desktop = {
        authTenantName: resource.tenantName || '未分配租户',
        bindStatus: resource.bindStatus,
        chargeType: resource.chargeType === 'pay_as_you_go' ? '按量付费' : '包年包月',
        cloudType: resource.cloudType,
        configuration: '4核8G / Windows Server',
        creationTime: formatDate(new Date()),
        dataDiskSize: '100GB',
        desktopId: resource.resourceId,
        desktopName: resource.resourceName,
        desktopStatus: toDesktopStatus(resource.status),
        expiredTime: resource.expireTime || '--',
        id: `tenant-resource-${resource.resourceId}`,
        robotStatus: resource.status === 'opened' ? OnlineStateEnum.FREE : undefined,
        sessionUser: 'auto-operate',
        systemDiskSize: '80GB',
      };
      rows.push(desktop);
    }
    if (!desktop) return;
    desktop.bindStatus = resource.bindStatus;
    desktop.desktopStatus = toDesktopStatus(resource.status);
    desktop.expiredTime = resource.expireTime || '--';
    desktop.robotStatus = resource.status === 'opened' ? desktop.robotStatus || OnlineStateEnum.FREE : undefined;
    desktop.vendorErrorMessage = resource.errorMessage;
    desktop.vendorOperationId = resource.vendorOperationId;
    desktop.vendorStatus = resource.vendorStatus;
  });
}

function scheduleUnsubscribeResult(operation: CloudUnsubscribeOperation) {
  if (scheduledOperationQueries.has(operation.operationId)) return;
  scheduledOperationQueries.add(operation.operationId);
  void queryCloudUnsubscribeOperation(operation.operationId)
    .then(() => syncRowsFromSharedResources())
    .finally(() => scheduledOperationQueries.delete(operation.operationId));
}

function buildDesktopOperationResource(desktop: DesktopRow) {
  return {
    chargeType: desktop.chargeType?.includes('按量') ? ('pay_as_you_go' as const) : ('subscription' as const),
    expireTime: desktop.expiredTime === '--' ? undefined : desktop.expiredTime,
    resourceId: desktop.desktopId || desktop.id || '',
    resourceName: desktop.desktopName || desktop.desktopId || '',
    simulateFailure: desktop.vendorErrorMessage === '模拟云厂商释放失败',
  };
}

async function submitDesktopUnsubscribe(desktop: DesktopRow, trigger: CloudOperationTrigger) {
  const resource = buildDesktopOperationResource(desktop);
  const clientToken = `${trigger}-release-${desktop.vendorOperationId || resource.resourceId}-${desktop.releaseExpireTime || desktop.expiredTime || ''}`;
  const operation = await submitCloudUnsubscribe({
    clientToken,
    cloudType: (desktop.cloudType || 'wuying') as 'wuying' | 'huoshan' | 'tianyi',
    resources: [resource],
    trigger,
  });
  syncRowsFromSharedResources();
  scheduleUnsubscribeResult(operation);
  return operation;
}

let desktopLifecyclePromise: Promise<void> | null = null;

function reconcileDesktopLifecycle() {
  if (desktopLifecyclePromise) return desktopLifecyclePromise;
  desktopLifecyclePromise = (async () => {
    syncRowsFromSharedResources();
    const now = Date.now();
    for (const desktop of rows) {
      if (
        desktop.desktopStatus === WuyingStatusEnum.RELEASE_PERIOD &&
        parseDateTime(desktop.releaseExpireTime) !== null &&
        parseDateTime(desktop.releaseExpireTime)! < now
      ) {
        try {
          await submitDesktopUnsubscribe(desktop, 'automatic');
        } catch (error) {
          desktop.desktopStatus = WuyingStatusEnum.UNSUBSCRIBE_FAILED;
          desktop.robotStatus = undefined;
          desktop.vendorErrorMessage = error instanceof Error ? error.message : '自动释放提交失败';
          desktop.vendorStatus = '释放失败';
          if (desktop.cloudType === 'tianyi') desktop.bindStatus = '解绑失败';
        }
      }
    }
    registerDesktopRows(true);
  })().finally(() => {
    desktopLifecyclePromise = null;
  });
  return desktopLifecyclePromise;
}

registerDesktopRows();
window.setInterval(() => {
  void reconcileDesktopLifecycle();
}, 1000);

function matches(value: unknown, keyword?: string) {
  if (!keyword) return true;
  return String(value || '').toLowerCase().includes(keyword.toLowerCase());
}

function filterRows(params: ListParamsType) {
  return rows.filter((row) => {
    if (params.desktopName && !matches(row.desktopName, params.desktopName)) return false;
    if (params.desktopId && !matches(row.desktopId, params.desktopId)) return false;
    if (params.authTenantName && !matches(row.authTenantName, params.authTenantName)) return false;
    if (params.ticket && !matches(row.ticket, params.ticket)) return false;
    if (params.todeskCode && !matches(row.todeskCode, params.todeskCode)) return false;
    if (params.cloudType && row.cloudType !== params.cloudType) return false;
    if (params.robotStatus && row.robotStatus !== params.robotStatus) return false;
    if (params.desktopStatus && row.desktopStatus !== params.desktopStatus) return false;
    if (params.creationStartTime && (!row.creationTime || row.creationTime < params.creationStartTime)) return false;
    if (params.creationEndTime && (!row.creationTime || row.creationTime > params.creationEndTime)) return false;
    return true;
  });
}

function response<T>(bizData: T) {
  return Promise.resolve({
    code: FrameWorkPortalSuccessCode,
    bizData,
  });
}

const getPageList = async (params: ListParamsType) => {
  await reconcileDesktopLifecycle();
  const pageNo = Number(params.pageNo || PaginationInitData.pageNo);
  const pageSize = Number(params.pageSize || PaginationInitData.pageSize);
  const filteredRows = filterRows(params);
  const start = (pageNo - 1) * pageSize;
  const data: ListBackType<DesktopRow> = {
    records: filteredRows.slice(start, start + pageSize),
    total: filteredRows.length,
    size: pageSize,
    current: pageNo,
    pages: Math.ceil(filteredRows.length / pageSize),
  };
  return response(data);
};

const getDesktopInfo = async (params: { id?: string }) => {
  await reconcileDesktopLifecycle();
  const detail = rows.find((row) => row.desktopId === params.id || row.id === params.id);
  return response<DesktopInfo>({
    desktopName: detail?.desktopName || '--',
    desktopId: detail?.desktopId || params.id || '--',
    configuration: detail?.configuration || '4核8G / Windows Server',
    systemDiskSize: detail?.systemDiskSize || '80GB',
    dataDiskSize: detail?.dataDiskSize || '100GB',
    chargeType: detail?.chargeType || '包年包月',
    ticket: detail?.ticket || '--',
    todeskCode: detail?.todeskCode || '--',
    expiredTime: detail?.expiredTime || '--',
    robotStatus: detail?.robotStatus,
    cloudAccountName: detail?.cloudAccountName,
    bindStatus: detail?.bindStatus,
  });
};

const getStatistic = async (params?: Pick<ListParamsType, 'cloudType'>) => {
  await reconcileDesktopLifecycle();
  const scopedRows = params?.cloudType
    ? rows.filter((row) => row.cloudType === params.cloudType)
    : rows;
  const data: StatisticInfo = {
    totalNum: scopedRows.length,
    runningNum: scopedRows.filter((row) => row.desktopStatus === WuyingStatusEnum.RUNNING).length,
    runningPer: 0,
    connectedNum: scopedRows.filter((row) => row.desktopStatus === WuyingStatusEnum.CONNECTED).length,
    connectedPer: 0,
    stoppedNum: scopedRows.filter((row) => row.desktopStatus === WuyingStatusEnum.STOPPED).length,
    stoppedPer: 0,
    dataDiskSize: 0,
    dataDiskPer: 0,
    expiredNum: scopedRows.filter((row) => row.desktopStatus === WuyingStatusEnum.EXPIRED).length,
    expiredPer: 0,
    releasePeriodNum: scopedRows.filter((row) => row.desktopStatus === WuyingStatusEnum.RELEASE_PERIOD).length,
    releasePeriodPer: 0,
    unsubscribingNum: scopedRows.filter((row) =>
      [WuyingStatusEnum.UNSUBSCRIBING, WuyingStatusEnum.AUTO_UNSUBSCRIBING].includes(row.desktopStatus as WuyingStatusEnum),
    ).length,
    unsubscribingPer: 0,
    unsubscribeFailedNum: scopedRows.filter((row) => row.desktopStatus === WuyingStatusEnum.UNSUBSCRIBE_FAILED).length,
    unsubscribeFailedPer: 0,
  };
  return response(data);
};

function findDesktop(params?: { id?: string }) {
  syncRowsFromSharedResources();
  return rows.find((row) => row.desktopId === params?.id || row.id === params?.id);
}

function nextExpireTime(currentExpireTime?: string, durationMonths = 1) {
  const now = new Date();
  const current = currentExpireTime && currentExpireTime !== '--' ? new Date(currentExpireTime.replace(' ', 'T')) : now;
  const base = Number.isNaN(current.getTime()) || current < now ? now : current;
  const next = new Date(base);
  next.setMonth(next.getMonth() + durationMonths);
  return formatDate(next).replace(/\d\d:\d\d:\d\d$/, '00:00:00');
}

const startDesktop = async (params?: { id?: string }) => {
  await wait();
  const desktop = findDesktop(params);
  if (desktop) {
    desktop.desktopStatus = WuyingStatusEnum.RUNNING;
    desktop.robotStatus = OnlineStateEnum.FREE;
  }
  return response(true);
};
const connectDesktop = async (_params?: any) => response('about:blank');
const stopDesktop = async (params?: { id?: string }) => {
  await wait();
  const desktop = findDesktop(params);
  if (desktop) {
    desktop.desktopStatus = WuyingStatusEnum.STOPPED;
    desktop.robotStatus = undefined;
  }
  return response(true);
};
const rebootDesktop = async (params?: { id?: string }) => {
  await wait();
  const desktop = findDesktop(params);
  if (desktop) {
    desktop.desktopStatus = WuyingStatusEnum.RUNNING;
    desktop.robotStatus = OnlineStateEnum.FREE;
  }
  return response(true);
};
const releaseDesktop = async (params?: { id?: string }) => {
  await wait();
  const desktop = findDesktop(params);
  if (desktop) {
    desktop.desktopStatus = WuyingStatusEnum.DELETED;
    desktop.robotStatus = undefined;
  }
  return response(true);
};

const renewDesktop = async (params?: { durationMonths?: number; id?: string }) => {
  await wait();
  const desktop = findDesktop(params);
  if (desktop) {
    desktop.desktopStatus = WuyingStatusEnum.RUNNING;
    desktop.expiredTime = nextExpireTime(desktop.expiredTime, params?.durationMonths || 1);
    desktop.robotStatus = OnlineStateEnum.FREE;
    desktop.vendorErrorMessage = undefined;
    desktop.vendorOperationId = undefined;
    desktop.vendorStatus = undefined;
    if (desktop.cloudType === 'tianyi') desktop.bindStatus = '用户已绑定';
    updateCloudResources([desktop.desktopId || ''], (resource) => ({
      ...resource,
      errorMessage: undefined,
      expireTime: desktop.expiredTime,
      status: 'opened',
      vendorOperationId: undefined,
      vendorStatus: undefined,
    }));
  }
  return response(true);
};

const unsubscribeDesktop = async (params?: { id?: string }) => {
  const desktop = findDesktop(params);
  if (desktop) {
    const operation = await submitDesktopUnsubscribe(desktop, 'manual');
    return response(operation);
  }
  return response(undefined);
};

const retryDesktopOperation = async (params?: { id?: string }) => {
  const desktop = findDesktop(params);
  if (desktop) {
    const unsubscribeRetry = desktop.desktopStatus === WuyingStatusEnum.UNSUBSCRIBE_FAILED;
    if (unsubscribeRetry) {
      const operation = await submitDesktopUnsubscribe(desktop, 'retry');
      return response(operation);
    }
    await wait();
    desktop.desktopStatus = WuyingStatusEnum.RUNNING;
    desktop.robotStatus = OnlineStateEnum.FREE;
    desktop.vendorErrorMessage = undefined;
    desktop.vendorOperationId = undefined;
    desktop.vendorStatus = undefined;
    if (desktop.cloudType === 'tianyi') desktop.bindStatus = '用户已绑定';
    updateCloudResources([desktop.desktopId || ''], (resource) => ({
      ...resource,
      errorMessage: undefined,
      status: 'opened',
      vendorOperationId: undefined,
      vendorStatus: undefined,
    }));
  }
  return response(true);
};

export {
  getPageList,
  getDesktopInfo,
  startDesktop,
  connectDesktop,
  stopDesktop,
  rebootDesktop,
  getStatistic,
  releaseDesktop,
  renewDesktop,
  unsubscribeDesktop,
  retryDesktopOperation,
};
