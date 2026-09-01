export type OperationLogSource = 'portal' | 'api' | 'mcp';
export type OperationResult = 'success' | 'failed';
export const OPERATION_TYPES = [
  '新增',
  '修改',
  '删除',
  '启用',
  '停用',
  '执行',
  '重试',
  '导入',
  '导出',
  '授权',
  '其他',
] as const;
export type OperationType = typeof OPERATION_TYPES[number];

export interface OperationLogChange {
  field: string;
  before: string;
  after: string;
}

interface OperationLogRecordBase {
  id: string;
  tenantId: string;
  operatedAt: string;
  operatorId: string;
  operatorName: string;
  module: string;
  operationType: OperationType;
  content: string;
  result: OperationResult;
  ip: string;
  failureReason?: string;
  changes?: OperationLogChange[];
  requestSummary?: string;
}

export interface PortalOperationLogRecord extends OperationLogRecordBase {
  source: 'portal';
  credentialId?: never;
  credentialName?: never;
}

export interface CredentialOperationLogRecord extends OperationLogRecordBase {
  source: 'api' | 'mcp';
  /** 操作发生时的凭证标识快照，与成员标识分开保存。 */
  credentialId: string;
  /** 操作发生时的凭证名称快照。 */
  credentialName: string;
}

export type OperationLogRecord = PortalOperationLogRecord | CredentialOperationLogRecord;

export interface OperationLogFilters {
  tenantId: string;
  source: OperationLogSource;
  asOf: string;
  startDate?: string;
  endDate?: string;
  operatorId?: string;
  module?: string;
  operationType?: OperationType;
  credentialName?: string;
}

const RETENTION_DAYS = 180;
const MAX_QUERY_RANGE_DAYS = 90;

export type QueryMockStatus = 'ready' | 'loading' | 'failed';
export type ExportMockStatus = 'idle' | 'loading' | 'success' | 'failed';
export type ExportMockOutcome = 'success' | 'failed';

export interface PortalOperationLogMockState {
  queryStatus: QueryMockStatus;
  exportStatus: ExportMockStatus;
  nextExportOutcome: ExportMockOutcome;
}

export type PortalOperationLogMockAction =
  | { type: 'query/fail' }
  | { type: 'query/reload' }
  | { type: 'query/succeed' }
  | { type: 'export/set-next-outcome'; outcome: ExportMockOutcome }
  | { type: 'export/start' }
  | { type: 'export/complete'; outcome: ExportMockOutcome };

export const initialPortalOperationLogMockState: PortalOperationLogMockState = {
  queryStatus: 'ready',
  exportStatus: 'idle',
  nextExportOutcome: 'success',
};

export function reducePortalOperationLogMockState(
  state: PortalOperationLogMockState,
  action: PortalOperationLogMockAction,
): PortalOperationLogMockState {
  switch (action.type) {
    case 'query/fail':
      return { ...state, queryStatus: 'failed' };
    case 'query/reload':
      return state.queryStatus === 'failed' ? { ...state, queryStatus: 'loading' } : state;
    case 'query/succeed':
      return { ...state, queryStatus: 'ready' };
    case 'export/set-next-outcome':
      return state.exportStatus === 'loading'
        ? state
        : { ...state, nextExportOutcome: action.outcome };
    case 'export/start':
      return state.exportStatus === 'loading' ? state : { ...state, exportStatus: 'loading' };
    case 'export/complete':
      return {
        ...state,
        exportStatus: action.outcome,
        nextExportOutcome: action.outcome === 'failed' ? 'success' : state.nextExportOutcome,
      };
    default:
      return state;
  }
}

function parseDate(date: string): number {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function dateBefore(date: string, asOf: string, days: number): boolean {
  return parseDate(date) < parseDate(asOf) - days * 24 * 60 * 60 * 1000;
}

export function filterOperationLogs(
  records: OperationLogRecord[],
  filters: OperationLogFilters,
): OperationLogRecord[] {
  return records
    .filter(record =>
      record.tenantId === filters.tenantId &&
      record.source === filters.source &&
      !dateBefore(record.operatedAt, filters.asOf, RETENTION_DAYS) &&
      (!filters.startDate || record.operatedAt.slice(0, 10) >= filters.startDate) &&
      (!filters.endDate || record.operatedAt.slice(0, 10) <= filters.endDate) &&
      (!filters.operatorId || record.operatorId === filters.operatorId) &&
      (!filters.module || record.module === filters.module) &&
      (!filters.operationType || record.operationType === filters.operationType) &&
      (!filters.credentialName || record.credentialName === filters.credentialName),
    )
    .sort((left, right) => right.operatedAt.localeCompare(left.operatedAt));
}

export function getDateRangeError(start: string, end: string): string | null {
  return parseDate(end) - parseDate(start) > MAX_QUERY_RANGE_DAYS * 24 * 60 * 60 * 1000
    ? '单次查询时间范围不能超过 90 天'
    : null;
}

export interface SafeOperationLogCsvRow {
  operatedAt: string;
  operatorName: string;
  module: string;
  operationType: string;
  content: string;
  operationResult: string;
  ip: string;
  credentialName: string;
}

const CSV_COLUMNS: ReadonlyArray<{
  header: string;
  key: keyof SafeOperationLogCsvRow;
}> = [
  { header: '操作时间', key: 'operatedAt' },
  { header: '操作者', key: 'operatorName' },
  { header: '功能模块', key: 'module' },
  { header: '操作类型', key: 'operationType' },
  { header: '操作内容', key: 'content' },
  { header: '操作结果', key: 'operationResult' },
  { header: 'IP 地址', key: 'ip' },
  { header: '凭证名称', key: 'credentialName' },
];

const COOKIE_HEADER_PATTERN = /\b(?:set-cookie|cookie)\s*[:=]\s*[^\r\n]*/giu;
const SENSITIVE_ASSIGNMENT_PATTERN = /(?:\b(?:access[_-]?token|refresh[_-]?token|token|api[_-]?key|apikey|password|passwd|secret|client[_-]?secret)\b|密码|密钥)\s*[:=]\s*[^\r\n]*/giu;
const BEARER_PATTERN = /\bbearer\s+[^\r\n]*/giu;
const RAW_SECRET_PATTERN = /\b(?:qsb_sk_|sk_live_|sk_test_)[a-z0-9._-]+\b/giu;

function sanitizeSensitiveCsvValue(value: string): string {
  return value
    .replace(COOKIE_HEADER_PATTERN, '[已脱敏]')
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, '[已脱敏]')
    .replace(BEARER_PATTERN, '[已脱敏]')
    .replace(RAW_SECRET_PATTERN, '[已脱敏]');
}

function neutralizeSpreadsheetFormula(value: string): string {
  return /^\s*[=+@-]/.test(value) ? `'${value}` : value;
}

function sanitizeCsvValue(value: string): string {
  return neutralizeSpreadsheetFormula(sanitizeSensitiveCsvValue(value));
}

function escapeCsv(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * CSV 仅接收页面已允许展示的八个字段，并在文件边界再逐字段脱敏与中和公式。
 * 凭证标识、请求摘要、失败堆栈和变更详情不进入导出 DTO。
 */
export function toSafeOperationLogCsvRow(record: OperationLogRecord): SafeOperationLogCsvRow {
  return {
    operatedAt: sanitizeCsvValue(record.operatedAt),
    operatorName: sanitizeCsvValue(record.operatorName),
    module: sanitizeCsvValue(record.module),
    operationType: sanitizeCsvValue(record.operationType),
    content: sanitizeCsvValue(record.content),
    operationResult: sanitizeCsvValue(record.result === 'success' ? '成功' : '失败'),
    ip: sanitizeCsvValue(record.ip),
    credentialName: sanitizeCsvValue(record.credentialName ?? ''),
  };
}

export function buildOperationLogCsv(records: OperationLogRecord[]): string {
  const rows = records.map((record) => {
    const safeRow = toSafeOperationLogCsvRow(record);
    return CSV_COLUMNS.map(({ key }) => escapeCsv(safeRow[key])).join(',');
  });

  return [CSV_COLUMNS.map(({ header }) => header).join(','), ...rows].join('\n');
}

export function prependOperationLogRecordOnce(
  records: OperationLogRecord[],
  record: OperationLogRecord,
): OperationLogRecord[] {
  return records.some((item) => item.id === record.id) ? records : [record, ...records];
}

export const mockActiveCredentials = [
  { credentialId: 'credential-data-export', credentialName: '数据导出 Agent' },
  { credentialId: 'credential-business-analysis', credentialName: '经营分析 Agent' },
  { credentialId: 'credential-business-analysis-backup', credentialName: '经营分析 Agent' },
] as const;

export const mockOperationLogs: OperationLogRecord[] = [
  {
    id: 'portal-update-plan',
    tenantId: 'tenant-aa',
    source: 'portal',
    operatedAt: '2026-09-01 10:24:16',
    operatorId: 'user-sensen',
    operatorName: 'Sensen',
    module: '任务计划',
    operationType: '修改',
    content: '修改任务计划“天猫经营日报”执行时间',
    result: 'success',
    ip: '10.18.2.16',
    changes: [{ field: '执行时间', before: '08:00', after: '09:00' }],
  },
  {
    id: 'portal-delete-connector',
    tenantId: 'tenant-aa',
    source: 'portal',
    operatedAt: '2026-08-31 16:43:08',
    operatorId: 'user-sensen',
    operatorName: 'Sensen',
    module: '连接器管理',
    operationType: '删除',
    content: '删除连接器“京东商智”',
    result: 'failed',
    ip: '10.18.2.16',
    failureReason: '连接器仍有关联任务计划，无法删除',
  },
  {
    id: 'portal-export-operation-log',
    tenantId: 'tenant-aa',
    source: 'portal',
    operatedAt: '2026-08-30 14:12:33',
    operatorId: 'user-sensen',
    operatorName: 'Sensen',
    module: '操作日志',
    operationType: '导出',
    content: '导出当前筛选条件下的操作日志',
    result: 'success',
    ip: '10.18.2.16',
  },
  {
    id: 'portal-create-connector',
    tenantId: 'tenant-aa',
    source: 'portal',
    operatedAt: '2026-09-01 09:40:12',
    operatorId: 'user-lily',
    operatorName: 'Lily',
    module: '连接器管理',
    operationType: '新增',
    content: '新增连接器“抖音罗盘”',
    result: 'success',
    ip: '10.18.2.21',
  },
  {
    id: 'portal-enable-plan',
    tenantId: 'tenant-aa',
    source: 'portal',
    operatedAt: '2026-09-01 09:22:05',
    operatorId: 'user-lily',
    operatorName: 'Lily',
    module: '任务计划',
    operationType: '启用',
    content: '启用任务计划“抖音经营周报”',
    result: 'success',
    ip: '10.18.2.21',
  },
  {
    id: 'portal-disable-plan',
    tenantId: 'tenant-aa',
    source: 'portal',
    operatedAt: '2026-08-31 14:08:31',
    operatorId: 'user-sensen',
    operatorName: 'Sensen',
    module: '任务计划',
    operationType: '停用',
    content: '停用任务计划“店铺库存快照”',
    result: 'success',
    ip: '10.18.2.16',
  },
  {
    id: 'portal-execute-task',
    tenantId: 'tenant-aa',
    source: 'portal',
    operatedAt: '2026-08-30 18:15:44',
    operatorId: 'user-lily',
    operatorName: 'Lily',
    module: '运行记录',
    operationType: '执行',
    content: '手动执行“抖音经营周报”',
    result: 'success',
    ip: '10.18.2.21',
  },
  {
    id: 'portal-retry-task',
    tenantId: 'tenant-aa',
    source: 'portal',
    operatedAt: '2026-08-29 17:40:02',
    operatorId: 'user-sensen',
    operatorName: 'Sensen',
    module: '数据监控',
    operationType: '重试',
    content: '重试数据表“商品日报”采集任务',
    result: 'success',
    ip: '10.18.2.16',
  },
  {
    id: 'portal-import-config',
    tenantId: 'tenant-aa',
    source: 'portal',
    operatedAt: '2026-08-28 11:35:27',
    operatorId: 'user-lily',
    operatorName: 'Lily',
    module: '参数管理',
    operationType: '导入',
    content: '导入本店商品配置',
    result: 'failed',
    ip: '10.18.2.21',
    failureReason: '导入文件缺少商品编码',
  },
  {
    id: 'portal-authorize-store',
    tenantId: 'tenant-aa',
    source: 'portal',
    operatedAt: '2026-08-27 10:19:13',
    operatorId: 'user-sensen',
    operatorName: 'Sensen',
    module: '店铺管理',
    operationType: '授权',
    content: '授权店铺“天猫旗舰店”给数据分析组',
    result: 'success',
    ip: '10.18.2.16',
  },
  {
    id: 'portal-confirm-risk',
    tenantId: 'tenant-aa',
    source: 'portal',
    operatedAt: '2026-08-26 16:06:58',
    operatorId: 'user-lily',
    operatorName: 'Lily',
    module: '数据源市场',
    operationType: '其他',
    content: '确认并提交数据源权限变更',
    result: 'success',
    ip: '10.18.2.21',
  },
  {
    id: 'api-run-business-analysis',
    tenantId: 'tenant-aa',
    source: 'api',
    operatedAt: '2026-08-31 11:20:06',
    operatorId: 'user-sensen',
    operatorName: 'Sensen',
    module: '开放平台',
    operationType: '执行',
    content: '发起经营分析任务',
    result: 'success',
    ip: '10.18.3.8',
    credentialId: 'credential-data-export',
    credentialName: '数据导出 Agent',
    requestSummary: '经营分析任务，店铺范围：已授权店铺',
  },
  {
    id: 'api-run-business-analysis-failed',
    tenantId: 'tenant-aa',
    source: 'api',
    operatedAt: '2026-08-30 09:41:54',
    operatorId: 'user-sensen',
    operatorName: 'Sensen',
    module: '开放平台',
    operationType: '执行',
    content: '发起经营分析任务',
    result: 'failed',
    ip: '10.18.3.8',
    credentialId: 'credential-business-analysis',
    credentialName: '经营分析 Agent',
    failureReason: '当前凭证缺少数据导出授权',
    requestSummary: '经营分析任务，店铺范围：已授权店铺',
  },
  {
    id: 'api-duplicate-name-credential-snapshot',
    tenantId: 'tenant-aa',
    source: 'api',
    operatedAt: '2026-08-27 08:38:16',
    operatorId: 'user-lily',
    operatorName: 'Lily',
    module: '开放平台',
    operationType: '执行',
    content: '获取经营分析任务状态',
    result: 'success',
    ip: '10.18.3.8',
    credentialId: 'credential-business-analysis-backup',
    credentialName: '经营分析 Agent',
    requestSummary: '经营分析任务，请求参数：已脱敏',
  },
  {
    id: 'api-revoked-credential-snapshot',
    tenantId: 'tenant-aa',
    source: 'api',
    operatedAt: '2026-08-26 09:12:44',
    operatorId: 'user-lily',
    operatorName: 'Lily',
    module: '开放平台',
    operationType: '导出',
    content: '导出店铺日报',
    result: 'success',
    ip: '10.18.3.19',
    credentialId: 'credential-retired-report',
    credentialName: '旧版报表助手',
    requestSummary: '店铺日报，店铺范围：已授权店铺',
  },
  {
    id: 'mcp-retry-data-task',
    tenantId: 'tenant-aa',
    source: 'mcp',
    operatedAt: '2026-08-29 15:08:21',
    operatorId: 'user-lily',
    operatorName: 'Lily',
    module: '数据监控',
    operationType: '重试',
    content: '重试数据表“商品日报”采集任务',
    result: 'success',
    ip: '10.18.4.12',
    credentialId: 'credential-business-analysis',
    credentialName: '经营分析 Agent',
    requestSummary: '数据表：商品日报；操作：重试采集',
  },
  {
    id: 'mcp-import-data-task-failed',
    tenantId: 'tenant-aa',
    source: 'mcp',
    operatedAt: '2026-08-28 13:05:47',
    operatorId: 'user-lily',
    operatorName: 'Lily',
    module: '数据监控',
    operationType: '导入',
    content: '导入数据表“商品日报”校验结果',
    result: 'failed',
    ip: '10.18.4.12',
    credentialId: 'credential-business-analysis',
    credentialName: '经营分析 Agent',
    failureReason: '导入文件字段与目标表不匹配',
    requestSummary: '数据表：商品日报；操作：导入校验结果',
  },
];
