import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Button,
  DatePicker,
  Drawer,
  Empty,
  Message,
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import { IconDownload } from '@arco-design/web-react/icon';
import { PortalOperationLogAnnotationMarker } from '@/components/portalOperationLogAnnotations';
import {
  buildOperationLogCsv,
  filterOperationLogs,
  getDateRangeError,
  initialPortalOperationLogMockState,
  mockOperationLogs,
  OPERATION_TYPES,
  prependOperationLogRecordOnce,
  reducePortalOperationLogMockState,
} from './model';
import type {
  ExportMockOutcome,
  OperationLogRecord,
  OperationLogSource,
  OperationType,
} from './model';
import styles from './index.module.less';

const { Title } = Typography;
const { TabPane } = Tabs;
const operationResultLabel = '操作结果';

const sourceTabs = [
  { key: 'portal', label: '门户操作' },
  { key: 'api', label: 'API' },
  { key: 'mcp', label: 'MCP' },
] as const;

const defaultDateRange: [string, string] = ['2026-08-26', '2026-09-01'];
const EXPORT_MOCK_DELAY_MS = 600;
const QUERY_RELOAD_DELAY_MS = 500;
const sourceEmptyText: Record<OperationLogSource, string> = {
  portal: '暂无门户操作日志',
  api: '暂无 API 操作日志',
  mcp: '暂无 MCP 操作日志',
};

interface PageFilters {
  operatorId?: string;
  module?: string;
  operationType?: OperationType;
  credentialName?: string;
}

function uniqueOptions(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .map((value) => ({ label: value, value }));
}

function ResultTag({ result }: Pick<OperationLogRecord, 'result'>) {
  return (
    <Tag color={result === 'success' ? 'green' : 'red'}>
      {result === 'success' ? '成功' : '失败'}
    </Tag>
  );
}

export default function PortalOperationLog() {
  const [records, setRecords] = useState<OperationLogRecord[]>(mockOperationLogs);
  const [source, setSource] = useState<OperationLogSource>('portal');
  const [dateRange, setDateRange] = useState<[string, string]>(defaultDateRange);
  const [filters, setFilters] = useState<PageFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [activeRecord, setActiveRecord] = useState<OperationLogRecord | null>(null);
  const [mockState, dispatchMock] = useReducer(
    reducePortalOperationLogMockState,
    initialPortalOperationLogMockState,
    (initialState) => {
      const scenario = new URLSearchParams(window.location.search).get('operationLogScenario');
      if (scenario === 'query-failed') {
        return reducePortalOperationLogMockState(initialState, { type: 'query/fail' });
      }
      if (scenario === 'export-failed') {
        return reducePortalOperationLogMockState(initialState, {
          type: 'export/set-next-outcome',
          outcome: 'failed',
        });
      }
      return initialState;
    },
  );
  const exportLockRef = useRef(false);
  const exportTimerRef = useRef<number>();
  const queryTimerRef = useRef<number>();

  const sourceRecords = useMemo(
    () => records.filter((record) => record.tenantId === 'tenant-aa' && record.source === source),
    [records, source],
  );
  const operatorOptions = useMemo(
    () => [...new Map(sourceRecords.map((record) => [
      record.operatorId,
      { label: record.operatorName, value: record.operatorId },
    ])).values()],
    [sourceRecords],
  );
  const moduleOptions = useMemo(
    () => uniqueOptions(sourceRecords.map((record) => record.module)),
    [sourceRecords],
  );
  const operationTypeOptions = useMemo(
    () => OPERATION_TYPES.map((operationType) => ({
      label: operationType,
      value: operationType,
    })),
    [],
  );
  const credentialOptions = useMemo(
    () => uniqueOptions(sourceRecords.map((record) => record.credentialName)),
    [sourceRecords],
  );

  const filteredRecords = useMemo(() => filterOperationLogs(records, {
    tenantId: 'tenant-aa',
    source,
    asOf: '2026-09-01',
    startDate: dateRange[0],
    endDate: dateRange[1],
    operatorId: filters.operatorId,
    module: filters.module,
    operationType: filters.operationType,
    credentialName: source === 'portal' ? undefined : filters.credentialName,
  }), [dateRange, filters, records, source]);

  const columns = useMemo<ColumnProps<OperationLogRecord>[]>(() => {
    const commonColumns: ColumnProps<OperationLogRecord>[] = [
      { title: '操作时间', dataIndex: 'operatedAt', width: 168 },
      { title: '操作者', dataIndex: 'operatorName', width: 120, ellipsis: true },
      { title: '功能模块', dataIndex: 'module', width: 120, ellipsis: true },
      { title: '操作类型', dataIndex: 'operationType', width: 100 },
      { title: '操作内容', dataIndex: 'content', width: 280, ellipsis: true },
      {
        title: operationResultLabel,
        dataIndex: 'result',
        width: 100,
        render: (_, record) => <ResultTag result={record.result} />,
      },
      { title: 'IP 地址', dataIndex: 'ip', width: 130 },
    ];

    if (source === 'portal') return commonColumns;
    return [
      ...commonColumns.slice(0, 4),
      { title: '凭证名称', dataIndex: 'credentialName', width: 156, ellipsis: true },
      ...commonColumns.slice(4),
    ];
  }, [source]);

  const changeSource = (nextSource: string) => {
    setSource(nextSource as OperationLogSource);
    setFilters((current) => ({ ...current, credentialName: undefined }));
    setCurrentPage(1);
    setActiveRecord(null);
  };

  const updateFilter = <Key extends keyof PageFilters>(key: Key, value: PageFilters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
  };

  const changeDateRange = (nextRange: string[] | null | undefined) => {
    if (!nextRange || nextRange.length !== 2) return;
    const error = getDateRangeError(nextRange[0], nextRange[1]);
    if (error) {
      Message.warning('单次查询时间范围不能超过 90 天');
      return;
    }
    setDateRange([nextRange[0], nextRange[1]]);
    setCurrentPage(1);
  };

  const reloadQuery = () => {
    if (mockState.queryStatus !== 'failed') return;
    dispatchMock({ type: 'query/reload' });
    queryTimerRef.current = window.setTimeout(() => {
      dispatchMock({ type: 'query/succeed' });
      queryTimerRef.current = undefined;
      Message.success('操作日志已重新加载');
    }, QUERY_RELOAD_DELAY_MS);
  };

  const exportCurrentRecords = () => {
    if (exportLockRef.current) return;
    exportLockRef.current = true;

    const attemptId = `portal-export-${Date.now()}`;
    const expectedOutcome = mockState.nextExportOutcome;
    const exportRecords = [...filteredRecords];
    const tabLabel = sourceTabs.find((tab) => tab.key === source)?.label || source;
    dispatchMock({ type: 'export/start' });

    exportTimerRef.current = window.setTimeout(() => {
      let actualOutcome: ExportMockOutcome = 'success';
      let failureReason: string | undefined;

      try {
        if (expectedOutcome === 'failed') {
          throw new Error('导出服务暂不可用');
        }
        const csv = buildOperationLogCsv(exportRecords);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        try {
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `操作日志-${tabLabel}-20260901.csv`;
          anchor.click();
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        actualOutcome = 'failed';
        failureReason = error instanceof Error ? error.message : '导出服务暂不可用';
      }

      const auditRecord: OperationLogRecord = {
        id: attemptId,
        tenantId: 'tenant-aa',
        source: 'portal',
        operatedAt: '2026-09-01 14:30:00',
        operatorId: 'user-sensen',
        operatorName: 'Sensen',
        module: '操作日志',
        operationType: '导出',
        content: `导出${tabLabel} Tab 当前筛选结果（${exportRecords.length}条）`,
        result: actualOutcome,
        ip: '10.18.2.16',
        ...(failureReason ? { failureReason } : {}),
      };

      setRecords((current) => prependOperationLogRecordOnce(current, auditRecord));
      dispatchMock({ type: 'export/complete', outcome: actualOutcome });
      exportLockRef.current = false;
      exportTimerRef.current = undefined;

      if (actualOutcome === 'success') {
        Message.success('操作日志已导出');
      } else {
        Message.error('导出失败，可保留当前条件重试');
      }
    }, EXPORT_MOCK_DELAY_MS);
  };

  const detailAvailable = Boolean(
    activeRecord?.failureReason
    || activeRecord?.requestSummary
    || activeRecord?.changes?.length,
  );

  useEffect(() => () => {
    if (exportTimerRef.current) window.clearTimeout(exportTimerRef.current);
    if (queryTimerRef.current) window.clearTimeout(queryTimerRef.current);
    exportLockRef.current = false;
  }, []);

  useEffect(() => {
    const openDetail = () => {
      setActiveRecord(records.find((record) => (
        record.failureReason || record.requestSummary || record.changes?.length
      )) || records[0] || null);
    };
    window.addEventListener('portal-operation-log:open-detail', openDetail);
    return () => window.removeEventListener('portal-operation-log:open-detail', openDetail);
  }, [records]);

  return (
    <div className={styles.page}>
      <PortalOperationLogAnnotationMarker noteId="POL-1" layout="block">
        <div className={styles.pageHeader}>
          <Title className={styles.title} heading={5}>操作日志</Title>
          <PortalOperationLogAnnotationMarker noteId="POL-6">
            <Button
              type="primary"
              icon={<IconDownload />}
              loading={mockState.exportStatus === 'loading'}
              disabled={mockState.exportStatus === 'loading'}
              onClick={exportCurrentRecords}
            >
              {mockState.exportStatus === 'loading' ? '导出中' : '导出'}
            </Button>
          </PortalOperationLogAnnotationMarker>
        </div>
      </PortalOperationLogAnnotationMarker>

      {mockState.exportStatus === 'success' || mockState.exportStatus === 'failed' ? (
        <div
          className={mockState.exportStatus === 'success'
            ? styles.exportStatusSuccess
            : styles.exportStatusFailed}
          role="status"
        >
          <span>
            {mockState.exportStatus === 'success'
              ? '导出成功：已按当前 Tab 和筛选条件生成文件并记录成功留痕。'
              : '导出失败：已记录失败留痕，当前 Tab 和筛选条件已保留。'}
          </span>
          {mockState.exportStatus === 'failed' ? (
            <Button size="mini" status="danger" onClick={exportCurrentRecords}>重试导出</Button>
          ) : null}
        </div>
      ) : null}

      <PortalOperationLogAnnotationMarker noteId="POL-2" layout="block">
        <div className={styles.sourceTabs}>
          <Tabs activeTab={source} onChange={changeSource}>
            {sourceTabs.map((tab) => <TabPane key={tab.key} title={tab.label} />)}
          </Tabs>
        </div>
      </PortalOperationLogAnnotationMarker>

      <PortalOperationLogAnnotationMarker noteId="POL-3" layout="block">
        <div className={styles.filterBar}>
          <div className={styles.filterItem}>
            <DatePicker.RangePicker
              aria-label="时间范围"
              allowClear={false}
              format="YYYY-MM-DD"
              value={dateRange}
              onChange={changeDateRange}
            />
          </div>
          <div className={styles.filterItem}>
            <Select
              aria-label="操作者"
              allowClear
              options={operatorOptions}
              placeholder="全部操作者"
              value={filters.operatorId}
              onChange={(operatorId) => updateFilter('operatorId', operatorId)}
            />
          </div>
          <div className={styles.filterItem}>
            <Select
              aria-label="功能模块"
              allowClear
              options={moduleOptions}
              placeholder="全部模块"
              value={filters.module}
              onChange={(module) => updateFilter('module', module)}
            />
          </div>
          <div className={styles.filterItem}>
            <Select
              aria-label="操作类型"
              allowClear
              options={operationTypeOptions}
              placeholder="全部类型"
              value={filters.operationType}
              onChange={(operationType) => updateFilter(
                'operationType',
                operationType as OperationType | undefined,
              )}
            />
          </div>
          {source !== 'portal' ? (
            <div className={styles.filterItem}>
              <Select
                aria-label="凭证名称"
                allowClear
                options={credentialOptions}
                placeholder="全部凭证"
                value={filters.credentialName}
                onChange={(credentialName) => updateFilter('credentialName', credentialName)}
              />
            </div>
          ) : null}
        </div>
      </PortalOperationLogAnnotationMarker>

      <PortalOperationLogAnnotationMarker noteId="POL-4" layout="block">
        <div className={styles.tableWrap}>
          <Table
            rowKey="id"
            columns={columns}
            data={mockState.queryStatus === 'ready' ? filteredRecords : []}
            loading={mockState.queryStatus === 'loading'}
            pagination={{
              current: currentPage,
              pageSize: 10,
              sizeCanChange: false,
              onChange: (pageNumber) => setCurrentPage(pageNumber),
            }}
            scroll={{ x: columns.reduce((sum, column) => sum + Number(column.width || 0), 0) }}
            noDataElement={mockState.queryStatus === 'failed' ? (
              <div className={styles.queryFailedState}>
                <Empty description="操作日志加载失败" />
                <Button
                  type="primary"
                  onClick={reloadQuery}
                >
                  重新加载
                </Button>
              </div>
            ) : <Empty description={sourceEmptyText[source]} />}
            onRow={(record) => ({
              className: styles.clickableRow,
              onClick: () => setActiveRecord(record),
            })}
          />
        </div>
      </PortalOperationLogAnnotationMarker>

      <Drawer
        width={720}
        title="操作详情"
        visible={Boolean(activeRecord)}
        footer={null}
        onCancel={() => setActiveRecord(null)}
      >
        <PortalOperationLogAnnotationMarker noteId="POL-5" layout="block">
          <div className={styles.drawerContent}>
            {activeRecord ? (
              <>
                <div className={styles.operationSummary}>
                  <div className={styles.operationSummaryMeta}>
                    <strong>{activeRecord.operatorName}</strong>
                    <span>在{activeRecord.module}中</span>
                  </div>
                  <p>{activeRecord.content}</p>
                </div>

                <div className={styles.basicInfoSection}>
                  <h3>基础信息</h3>
                  <div className={styles.basicInfoGrid}>
                    <div className={styles.basicInfoItem}>
                      <span className={styles.basicInfoLabel}>操作时间</span>
                      <span className={styles.basicInfoValue}>{activeRecord.operatedAt}</span>
                    </div>
                    <div className={styles.basicInfoItem}>
                      <span className={styles.basicInfoLabel}>操作者</span>
                      <span className={styles.basicInfoValue}>{activeRecord.operatorName}</span>
                    </div>
                    <div className={styles.basicInfoItem}>
                      <span className={styles.basicInfoLabel}>功能模块</span>
                      <span className={styles.basicInfoValue}>{activeRecord.module}</span>
                    </div>
                    <div className={styles.basicInfoItem}>
                      <span className={styles.basicInfoLabel}>操作类型</span>
                      <span className={styles.basicInfoValue}>{activeRecord.operationType}</span>
                    </div>
                    <div className={styles.basicInfoItem}>
                      <span className={styles.basicInfoLabel}>{operationResultLabel}</span>
                      <span className={styles.basicInfoValue}>
                        <ResultTag result={activeRecord.result} />
                      </span>
                    </div>
                    <div className={styles.basicInfoItem}>
                      <span className={styles.basicInfoLabel}>IP 地址</span>
                      <span className={styles.basicInfoValue}>{activeRecord.ip}</span>
                    </div>
                    {activeRecord.source !== 'portal' ? (
                      <div className={styles.basicInfoItem}>
                        <span className={styles.basicInfoLabel}>凭证名称</span>
                        <span className={styles.basicInfoValue}>
                          {activeRecord.credentialName || '-'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {detailAvailable ? (
                  <div className={styles.detailSection}>
                    <h3>操作详情</h3>
                    <div className={styles.detailList}>
                      {activeRecord.failureReason ? (
                        <div className={styles.detailItem}>
                          <span>失败原因</span>
                          <strong>{activeRecord.failureReason}</strong>
                        </div>
                      ) : null}
                      {activeRecord.requestSummary ? (
                        <div className={styles.detailItem}>
                          <span>脱敏请求摘要</span>
                          <strong>{activeRecord.requestSummary}</strong>
                        </div>
                      ) : null}
                      {activeRecord.changes?.length ? (
                        <div className={styles.changeTable}>
                          <div className={styles.changeHeader}>
                            <span>变更字段</span>
                            <span>变更前</span>
                            <span>变更后</span>
                          </div>
                          {activeRecord.changes.map((change) => (
                            <div className={styles.changeRow} key={change.field}>
                              <span>{change.field}</span>
                              <strong>{change.before}</strong>
                              <strong>{change.after}</strong>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </PortalOperationLogAnnotationMarker>
      </Drawer>
    </div>
  );
}
