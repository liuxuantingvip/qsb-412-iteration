import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Drawer,
  Empty,
  Input,
  Message,
  Pagination,
  Select,
  Spin,
  Table,
  Tooltip,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import { IconRefresh } from '@arco-design/web-react/icon';
import {
  buildStorageTableResults,
  filterStorageTableResults,
  filterRuntimeLogs,
  paginateRows,
} from './model';
import type {
  DetailStatus,
  LogLevel,
  RunExecuteRecord,
  RuntimeLog,
  StorageTableResult,
  StorageTableResultFilters,
} from './model';
import { DetailStatusTag } from './StatusTag';
import { RunDetailStorageLogAnnotationMarker } from '@/components/runDetailStorageLogAnnotations';
import styles from './index.module.less';

interface LogDrawerProps {
  mode: 'runtime' | 'storage';
  visible: boolean;
  record: RunExecuteRecord | null;
  onClose: () => void;
}

const levelOptions: { label: LogLevel; value: LogLevel }[] = [
  { label: '输出日志', value: '输出日志' },
  { label: '警告日志', value: '警告日志' },
  { label: '错误日志', value: '错误日志' },
];

const statusOptions: { label: string; value: DetailStatus }[] = [
  { label: '待运行', value: '待运行' },
  { label: '运行中', value: '运行中' },
  { label: '成功', value: '成功' },
  { label: '成功（部分无数据）', value: '成功(部分无数据)' },
  { label: '失败', value: '失败' },
];

const STORAGE_SCROLL_X = 1160;

const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value);

const formatDuration = (seconds: number) => seconds < 60
  ? `${seconds} 秒`
  : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;

const renderStorageStatus = (status: DetailStatus) => status === '成功(部分无数据)'
  ? (
    <div className={styles.storagePartialStatus}>
      <DetailStatusTag status="成功" />
      <span>部分无数据</span>
    </div>
  )
  : <DetailStatusTag status={status} />;

export function LogDrawer({ mode, visible, record, onClose }: LogDrawerProps) {
  const [keyword, setKeyword] = useState('');
  const [level, setLevel] = useState<LogLevel>();
  const [storageFilters, setStorageFilters] = useState<StorageTableResultFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const runtimeRows = useMemo(() => filterRuntimeLogs(
    record?.runtimeLogs ?? [],
    keyword,
    level,
  ), [record, keyword, level]);
  const storageResults = useMemo(() => buildStorageTableResults(
    record?.storageLogs ?? [],
  ), [record]);
  const storageRows = useMemo(() => filterStorageTableResults(
    storageResults,
    { ...storageFilters, keyword },
  ), [storageResults, storageFilters, keyword]);
  const runtimePageRows = paginateRows(runtimeRows, page, pageSize);
  const storagePageRows = paginateRows(storageRows, page, pageSize);
  const rowCount = mode === 'runtime' ? runtimeRows.length : storageRows.length;

  useEffect(() => {
    setPage(1);
  }, [keyword, level, storageFilters, mode]);

  const reset = () => {
    setKeyword('');
    setLevel(undefined);
    setStorageFilters({});
    setPage(1);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const reload = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      Message.success('日志已重新加载');
    }, 360);
  };

  const runtimeColumns: ColumnProps<RuntimeLog>[] = [
    { title: '时间', dataIndex: 'time', width: 168 },
    {
      title: '日志内容',
      dataIndex: 'content',
      width: 500,
      render: (value) => <Tooltip content={value}><span className={styles.logContent}>{value}</span></Tooltip>,
    },
    { title: '日志级别', dataIndex: 'level', width: 110, fixed: 'right' },
  ];

  const storageColumns: ColumnProps<StorageTableResult>[] = [
    {
      title: <RunDetailStorageLogAnnotationMarker noteId="RSL-3">数据表</RunDetailStorageLogAnnotationMarker>,
      width: 300,
      render: (_value, row) => (
        <div className={styles.storageTableCell}>
          <Tooltip content={row.tableChineseName}><strong>{row.tableChineseName}</strong></Tooltip>
          <Tooltip content={row.tableEnglishName}>
            <span className={styles.storageEnglishName}>{row.tableEnglishName}</span>
          </Tooltip>
        </div>
      ),
    },
    {
      title: '数据库类型',
      dataIndex: 'databaseType',
      width: 110,
    },
    {
      title: <RunDetailStorageLogAnnotationMarker noteId="RSL-4">最新入库结果</RunDetailStorageLogAnnotationMarker>,
      width: 140,
      render: (_value, row) => renderStorageStatus(row.latestAttempt.status),
    },
    {
      title: '写入条数',
      width: 90,
      render: (_value, row) => formatNumber(row.latestAttempt.writtenRows),
    },
    {
      title: '业务日期',
      dataIndex: 'businessDate',
      width: 120,
    },
    {
      title: '完成时间',
      width: 160,
      render: (_value, row) => (
        <div className={styles.storageTimeCell}>
          <span>{row.latestAttempt.time}</span>
          <span>耗时 {formatDuration(row.latestAttempt.durationSeconds)}</span>
        </div>
      ),
    },
    {
      title: '失败原因',
      width: 210,
      render: (_value, row) => {
        const latest = row.latestAttempt;
        const isFailure = latest.status === '失败' || latest.status === '运行失败';
        const text = isFailure
          ? `${latest.failureStage ? `${latest.failureStage}：` : ''}${latest.content}`
          : latest.status === '成功(部分无数据)' ? latest.content : '—';
        return <Tooltip content={text}><span className={styles.storageFailureReason}>{text}</span></Tooltip>;
      },
    },
  ];

  return (
    <Drawer
      title={mode === 'runtime' ? '取数日志' : '入库日志'}
      visible={visible}
      width={mode === 'storage' ? 'min(1200px, calc(100vw - 48px))' : 830}
      footer={null}
      unmountOnExit
      className={styles.logDrawer}
      onCancel={handleClose}
    >
      {mode === 'storage' ? (
        <RunDetailStorageLogAnnotationMarker noteId="RSL-2" layout="block">
          <div className={styles.logToolbar}>
            <Input.Search
              value={keyword}
              allowClear
              placeholder="搜索数据表中英文名"
              className={styles.logSearch}
              onChange={setKeyword}
              onSearch={setKeyword}
            />
            <Select
              value={storageFilters.status}
              placeholder="最新入库结果"
              allowClear
              options={statusOptions}
              onChange={(value) => setStorageFilters((current) => ({ ...current, status: value }))}
            />
            <Select
              value={storageFilters.onlyFailed ? 'failed' : undefined}
              placeholder="失败筛选"
              allowClear
              options={[{ label: '仅看失败', value: 'failed' }]}
              onChange={(value) => setStorageFilters((current) => ({
                ...current,
                onlyFailed: value === 'failed',
              }))}
            />
            <Button type="text" onClick={reset}>重置</Button>
          </div>
        </RunDetailStorageLogAnnotationMarker>
      ) : (
        <div className={styles.logToolbar}>
        <Input.Search
          value={keyword}
          allowClear
          placeholder="请输入日志关键字"
          className={styles.logSearch}
          onChange={setKeyword}
          onSearch={setKeyword}
        />
        <Select
          value={level}
          placeholder="日志级别"
          allowClear
          options={levelOptions}
          onChange={setLevel}
        />
          <Tooltip content="重新加载">
            <Button aria-label="重新加载" icon={<IconRefresh />} onClick={reload} />
          </Tooltip>
        </div>
      )}
      {mode === 'storage' ? (
        <RunDetailStorageLogAnnotationMarker noteId="RSL-6" layout="block">
          <Spin loading={loading} className={styles.logSpin}>
          <Table
            rowKey="id"
            columns={storageColumns}
            data={storagePageRows}
            pagination={false}
            scroll={{ x: STORAGE_SCROLL_X, y: 'calc(100vh - 340px)' }}
            noDataElement={<Empty description="暂无符合条件的数据表" />}
          />
          </Spin>
        </RunDetailStorageLogAnnotationMarker>
      ) : (
        <Spin loading={loading} className={styles.logSpin}>
          <Table
            rowKey="id"
            columns={runtimeColumns}
            data={runtimePageRows}
            pagination={false}
            scroll={{ x: 778, y: 'calc(100vh - 250px)' }}
            noDataElement={<Empty description="暂无日志" />}
          />
        </Spin>
      )}
      {mode === 'storage' ? (
        <RunDetailStorageLogAnnotationMarker noteId="RSL-5" layout="block">
          <div className={styles.logFooter}>
            <span>{`共 ${rowCount} 张数据表`}</span>
            <Pagination total={rowCount} current={page} pageSize={pageSize} sizeCanChange sizeOptions={[10, 20, 50]} onChange={(nextPage, nextPageSize) => {
              setPage(nextPageSize === pageSize ? nextPage : 1);
              setPageSize(nextPageSize);
            }} />
          </div>
        </RunDetailStorageLogAnnotationMarker>
      ) : (
        <div className={styles.logFooter}>
          <span>{`共 ${rowCount} 条`}</span>
          <Pagination total={rowCount} current={page} pageSize={pageSize} sizeCanChange sizeOptions={[10, 20, 50]} onChange={(nextPage, nextPageSize) => {
            setPage(nextPageSize === pageSize ? nextPage : 1);
            setPageSize(nextPageSize);
          }} />
        </div>
      )}
    </Drawer>
  );
}
