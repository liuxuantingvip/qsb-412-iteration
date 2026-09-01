export type OperationLogSource = 'portal' | 'api' | 'mcp';
export type OperationResult = 'success' | 'failed';
export type OperationType = '新增' | '修改' | '删除' | '启用' | '停用' | '执行' | '重试' | '导入' | '导出' | '授权' | '其他';

export interface OperationLogChange {
  field: string;
  before: string;
  after: string;
}

export interface OperationLogRecord {
  id: string;
  tenantId: string;
  source: OperationLogSource;
  operatedAt: string;
  operatorId: string;
  operatorName: string;
  module: string;
  operationType: OperationType;
  content: string;
  result: OperationResult;
  ip: string;
  credentialName?: string;
  failureReason?: string;
  changes?: OperationLogChange[];
  requestSummary?: string;
}

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

function escapeCsv(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildOperationLogCsv(records: OperationLogRecord[]): string {
  const header = ['操作时间', '操作者', '功能模块', '操作类型', '操作内容', '操作结果', 'IP 地址', '凭证名称'];
  const rows = records.map(record => [
    record.operatedAt,
    record.operatorName,
    record.module,
    record.operationType,
    record.content,
    record.result === 'success' ? '成功' : '失败',
    record.ip,
    record.credentialName ?? '',
  ].map(escapeCsv).join(','));

  return [header.join(','), ...rows].join('\n');
}

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
    credentialName: '经营分析 Agent',
    failureReason: '当前凭证缺少数据导出授权',
    requestSummary: '经营分析任务，店铺范围：已授权店铺',
  },
  {
    id: 'mcp-retry-data-task',
    tenantId: 'tenant-aa',
    source: 'mcp',
    operatedAt: '2026-08-29 15:08:21',
    operatorId: 'mcp-agent-analysis',
    operatorName: '经营分析 Agent',
    module: '数据监控',
    operationType: '重试',
    content: '重试数据表“商品日报”采集任务',
    result: 'success',
    ip: '10.18.4.12',
    credentialName: '经营分析 Agent',
    requestSummary: '数据表：商品日报；操作：重试采集',
  },
  {
    id: 'mcp-import-data-task-failed',
    tenantId: 'tenant-aa',
    source: 'mcp',
    operatedAt: '2026-08-28 13:05:47',
    operatorId: 'mcp-agent-analysis',
    operatorName: '经营分析 Agent',
    module: '数据监控',
    operationType: '导入',
    content: '导入数据表“商品日报”校验结果',
    result: 'failed',
    ip: '10.18.4.12',
    credentialName: '经营分析 Agent',
    failureReason: '导入文件字段与目标表不匹配',
    requestSummary: '数据表：商品日报；操作：导入校验结果',
  },
];
