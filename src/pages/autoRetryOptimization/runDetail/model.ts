export type DetailStatus =
  | '待运行'
  | '运行中'
  | '成功'
  | '成功(部分无数据)'
  | '运行失败'
  | '异常(1)'
  | '失败';

export type LogLevel = '输出日志' | '警告日志' | '错误日志';

export interface RunResultFilters {
  collectionStatus?: DetailStatus;
  validationStatus?: DetailStatus;
  storageStatus?: DetailStatus;
}

export interface StorageLogFilters {
  keyword?: string;
  storeName?: string;
  connectorName?: string;
  status?: DetailStatus;
  level?: LogLevel;
}

export interface RuntimeLog {
  id: string;
  time: string;
  content: string;
  level: LogLevel;
}

export interface StorageLog extends RuntimeLog {
  storeName: string;
  connectorName: string;
  databaseType: string;
  tableChineseName: string;
  tableEnglishName: string;
  businessDate: string;
  attemptNo: number;
  durationSeconds: number;
  writtenRows: number;
  status: DetailStatus;
  failureStage?: string;
}

export interface StorageTableResult {
  id: string;
  databaseType: string;
  tableChineseName: string;
  tableEnglishName: string;
  businessDate: string;
  latestAttempt: StorageLog;
  attempts: StorageLog[];
}

export interface StorageTableResultFilters {
  keyword?: string;
  status?: DetailStatus;
  onlyFailed?: boolean;
}

export interface ConnectorExecution {
  id: string;
  storeName: string;
  connectorName: string;
  businessStartDate: string;
  businessEndDate: string;
  collectionStatus: DetailStatus;
  validationStatus: DetailStatus;
  storageStatus: DetailStatus;
  issueReason?: string;
  noDataNote?: string;
}

export interface StoreExecution {
  id: string;
  storeName: string;
  collectionStatus: DetailStatus;
  validationStatus: DetailStatus;
  storageStatus: DetailStatus;
  connectors: ConnectorExecution[];
}

export interface RunExecuteRecord {
  id: string;
  recordId: string;
  planName: string;
  planType: string;
  dataCycle: string;
  platformType: string;
  platformName: string;
  storeName: string;
  robotToken: string;
  businessDate: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  collectionStatus: DetailStatus;
  validationStatus: DetailStatus;
  storageStatus: DetailStatus;
  stores: StoreExecution[];
  runtimeLogs: RuntimeLog[];
  storageLogs: StorageLog[];
}

export interface RunDetailData {
  summary: Pick<RunExecuteRecord, 'planName' | 'planType' | 'dataCycle' | 'platformType' | 'platformName'>;
  executeRecords: RunExecuteRecord[];
  runtimeLogs: RuntimeLog[];
  storageLogs: StorageLog[];
}

export function isConnectorSelectable(row: ConnectorExecution) {
  return !row.connectorName.trim().endsWith('-登录');
}

export function filterConnectorExecutions(
  rows: ConnectorExecution[],
  filters: RunResultFilters,
) {
  return rows.filter((row) => (
    (!filters.collectionStatus || row.collectionStatus === filters.collectionStatus)
    && (!filters.validationStatus || row.validationStatus === filters.validationStatus)
    && (!filters.storageStatus || row.storageStatus === filters.storageStatus)
  ));
}

export function filterRuntimeLogs(
  rows: RuntimeLog[],
  keyword = '',
  level?: LogLevel,
) {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  return rows.filter((row) => (
    (!normalizedKeyword || row.content.toLocaleLowerCase().includes(normalizedKeyword))
    && (!level || row.level === level)
  ));
}

export function filterStorageLogs(rows: StorageLog[], filters: StorageLogFilters) {
  const normalizedKeyword = filters.keyword?.trim().toLocaleLowerCase() || '';
  return rows.filter((row) => (
    (!normalizedKeyword || row.content.toLocaleLowerCase().includes(normalizedKeyword))
    && (!filters.storeName || row.storeName === filters.storeName)
    && (!filters.connectorName || row.connectorName === filters.connectorName)
    && (!filters.status || row.status === filters.status)
    && (!filters.level || row.level === filters.level)
  ));
}

const storageStatusPriority: Partial<Record<DetailStatus, number>> = {
  失败: 0,
  运行失败: 0,
  '成功(部分无数据)': 1,
  运行中: 2,
  待运行: 3,
  成功: 4,
};

export function buildStorageTableResults(rows: StorageLog[]): StorageTableResult[] {
  const groups = new Map<string, StorageLog[]>();
  rows.forEach((row) => {
    const key = `${row.databaseType}::${row.tableEnglishName}::${row.businessDate}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });

  return Array.from(groups.entries()).map(([id, attempts]) => {
    const orderedAttempts = [...attempts].sort((a, b) => (
      b.attemptNo - a.attemptNo || b.time.localeCompare(a.time)
    ));
    return {
      id,
      databaseType: orderedAttempts[0].databaseType,
      tableChineseName: orderedAttempts[0].tableChineseName,
      tableEnglishName: orderedAttempts[0].tableEnglishName,
      businessDate: orderedAttempts[0].businessDate,
      latestAttempt: orderedAttempts[0],
      attempts: orderedAttempts,
    };
  }).sort((a, b) => (
    (storageStatusPriority[a.latestAttempt.status] ?? 9)
      - (storageStatusPriority[b.latestAttempt.status] ?? 9)
    || b.latestAttempt.time.localeCompare(a.latestAttempt.time)
  ));
}

export function filterStorageTableResults(
  rows: StorageTableResult[],
  filters: StorageTableResultFilters,
) {
  const keyword = filters.keyword?.trim().toLocaleLowerCase() ?? '';
  return rows.filter((row) => {
    const latest = row.latestAttempt;
    const searchable = [
      row.tableChineseName,
      row.tableEnglishName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
    return (!keyword || searchable.includes(keyword))
      && (!filters.status || latest.status === filters.status)
      && (!filters.onlyFailed || latest.status === '失败' || latest.status === '运行失败');
  });
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const start = Math.max(0, page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
