import { useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  Descriptions,
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
import {
  buildOperationLogCsv,
  filterOperationLogs,
  getDateRangeError,
  mockOperationLogs,
} from './model';
import type {
  OperationLogRecord,
  OperationLogSource,
  OperationType,
} from './model';
import styles from './index.module.less';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const operationResultLabel = '操作' + '结果';

const sourceTabs = [
  { key: 'portal', label: '门户操作' },
  { key: 'api', label: 'API' },
  { key: 'mcp', label: 'MCP' },
] as const;

const defaultDateRange: [string, string] = ['2026-08-26', '2026-09-01'];
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
  const [activeRecord, setActiveRecord] = useState<OperationLogRecord | null>(null);

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
    () => uniqueOptions(sourceRecords.map((record) => record.operationType)),
    [sourceRecords],
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
    setActiveRecord(null);
  };

  const changeDateRange = (nextRange: string[] | null | undefined) => {
    if (!nextRange || nextRange.length !== 2) return;
    const error = getDateRangeError(nextRange[0], nextRange[1]);
    if (error) {
      Message.warning('单次查询时间范围不能超过 90 天');
      return;
    }
    setDateRange([nextRange[0], nextRange[1]]);
  };

  const exportCurrentRecords = () => {
    const csv = buildOperationLogCsv(filteredRecords);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const tabLabel = sourceTabs.find((tab) => tab.key === source)?.label || source;
    anchor.href = url;
    anchor.download = `操作日志-${tabLabel}-20260901.csv`;
    anchor.click();
    URL.revokeObjectURL(url);

    setRecords((current) => [{
      id: `portal-export-${Date.now()}`,
      tenantId: 'tenant-aa',
      source: 'portal',
      operatedAt: '2026-09-01 14:30:00',
      operatorId: 'user-sensen',
      operatorName: 'Sensen',
      module: '操作日志',
      operationType: '导出',
      content: `导出${tabLabel} Tab 当前筛选结果`,
      result: 'success',
      ip: '10.18.2.16',
    }, ...current]);
    Message.success('操作日志已导出');
  };

  const detailAvailable = Boolean(
    activeRecord?.failureReason
    || activeRecord?.requestSummary
    || activeRecord?.changes?.length,
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader} data-note-id="POL-1">
        <div>
          <Title className={styles.title} heading={5}>操作日志</Title>
          <Text className={styles.subtitle}>
            原型仅固定展示 tenant-aa 的 mock 数据，未接入真实鉴权与日志接口，不跨租户展示或导出。
          </Text>
        </div>
        <div data-note-id="POL-5">
          <Button type="primary" icon={<IconDownload />} onClick={exportCurrentRecords}>
            导出
          </Button>
        </div>
      </div>

      <div className={styles.sourceTabs} data-note-id="POL-2">
        <Tabs activeTab={source} onChange={changeSource}>
          {sourceTabs.map((tab) => <TabPane key={tab.key} title={tab.label} />)}
        </Tabs>
      </div>

      <div className={styles.filterBar} data-note-id="POL-3">
        <div className={styles.filterItem}>
          <span>时间范围</span>
          <DatePicker.RangePicker
            allowClear={false}
            format="YYYY-MM-DD"
            value={dateRange}
            onChange={changeDateRange}
          />
        </div>
        <div className={styles.filterItem}>
          <span>操作者</span>
          <Select
            allowClear
            options={operatorOptions}
            placeholder="全部操作者"
            value={filters.operatorId}
            onChange={(operatorId) => setFilters((current) => ({ ...current, operatorId }))}
          />
        </div>
        <div className={styles.filterItem}>
          <span>功能模块</span>
          <Select
            allowClear
            options={moduleOptions}
            placeholder="全部模块"
            value={filters.module}
            onChange={(module) => setFilters((current) => ({ ...current, module }))}
          />
        </div>
        <div className={styles.filterItem}>
          <span>操作类型</span>
          <Select
            allowClear
            options={operationTypeOptions}
            placeholder="全部类型"
            value={filters.operationType}
            onChange={(operationType) => setFilters((current) => ({
              ...current,
              operationType: operationType as OperationType | undefined,
            }))}
          />
        </div>
        {source !== 'portal' ? (
          <div className={styles.filterItem}>
            <span>凭证名称</span>
            <Select
              allowClear
              options={credentialOptions}
              placeholder="全部凭证"
              value={filters.credentialName}
              onChange={(credentialName) => setFilters((current) => ({ ...current, credentialName }))}
            />
          </div>
        ) : null}
      </div>

      <div className={styles.tableWrap} data-note-id="POL-4">
        <Table
          rowKey="id"
          columns={columns}
          data={filteredRecords}
          pagination={{ pageSize: 10, sizeCanChange: false }}
          scroll={{ x: columns.reduce((sum, column) => sum + Number(column.width || 0), 0) }}
          noDataElement={<Empty description={sourceEmptyText[source]} />}
          onRow={(record) => ({
            className: styles.clickableRow,
            onClick: () => setActiveRecord(record),
          })}
        />
      </div>

      <Drawer
        width={640}
        title="操作详情"
        visible={Boolean(activeRecord)}
        footer={null}
        onCancel={() => setActiveRecord(null)}
      >
        <div className={styles.drawerContent} data-note-id="POL-6">
          {activeRecord ? (
            <>
              <Descriptions
                border
                column={2}
                size="small"
                title="基础信息"
                data={[
                  { label: '操作时间', value: activeRecord.operatedAt },
                  { label: '操作者', value: activeRecord.operatorName },
                  { label: '功能模块', value: activeRecord.module },
                  { label: '操作类型', value: activeRecord.operationType },
                  { label: operationResultLabel, value: <ResultTag result={activeRecord.result} /> },
                  { label: 'IP 地址', value: activeRecord.ip },
                  ...(activeRecord.source === 'portal' ? [] : [{
                    label: '凭证名称',
                    value: activeRecord.credentialName || '-',
                  }]),
                  { label: '操作内容', value: activeRecord.content, span: 2 },
                ]}
              />

              <div className={styles.detailSection}>
                <h3>操作详情</h3>
                {detailAvailable ? (
                  <div className={styles.detailList}>
                    {activeRecord.failureReason ? (
                      <div><span>失败原因</span><strong>{activeRecord.failureReason}</strong></div>
                    ) : null}
                    {activeRecord.requestSummary ? (
                      <div><span>脱敏请求摘要</span><strong>{activeRecord.requestSummary}</strong></div>
                    ) : null}
                    {activeRecord.changes?.map((change) => (
                      <div className={styles.changeRow} key={change.field}>
                        <span>{change.field}</span>
                        <strong>{change.before}</strong>
                        <i>→</i>
                        <strong>{change.after}</strong>
                      </div>
                    ))}
                  </div>
                ) : <Empty description="详情暂不可用" />}
              </div>
            </>
          ) : null}
        </div>
      </Drawer>
    </div>
  );
}
