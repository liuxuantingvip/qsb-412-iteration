import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import {
  Button,
  Checkbox,
  Drawer,
  Empty,
  Message,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import {
  IconFile,
  IconDragDotVertical,
  IconMinus,
  IconPlus,
  IconStorage,
  IconVideoCamera,
} from '@arco-design/web-react/icon';
import {
  clampRunRecordDrawerWidth,
  RUN_RECORD_DRAWER_LEFT_GAP,
  RUN_RECORD_DRAWER_MIN_WIDTH,
  RUN_RECORD_DRAWER_STORAGE_KEY,
} from './drawerWidth';
import { filterConnectorExecutions, isConnectorSelectable } from './model';
import type {
  ConnectorExecution,
  DetailStatus,
  RunExecuteRecord,
  RunResultFilters,
  StoreExecution,
} from './model';
import { DetailStatusTag } from './StatusTag';
import { LogDrawer } from './LogDrawer';
import { RunDetailStorageLogAnnotationMarker } from '@/components/runDetailStorageLogAnnotations';
import styles from './index.module.less';

interface RunRecordDetailDrawerProps {
  record: RunExecuteRecord | null;
  visible: boolean;
  onClose: () => void;
}

const statusOptions: { label: DetailStatus; value: DetailStatus }[] = [
  { label: '待运行', value: '待运行' },
  { label: '运行中', value: '运行中' },
  { label: '成功', value: '成功' },
  { label: '成功(部分无数据)', value: '成功(部分无数据)' },
  { label: '运行失败', value: '运行失败' },
  { label: '异常(1)', value: '异常(1)' },
  { label: '失败', value: '失败' },
];

const RESULT_EXPAND_COLUMN_WIDTH = 40;
const RESULT_SELECTION_COLUMN_WIDTH = 40;
const RESULT_ACTION_COLUMN_WIDTH = 180;
const RESULT_SCROLL_X = 1140;

const getViewportWidth = () => (
  typeof window === 'undefined'
    ? RUN_RECORD_DRAWER_MIN_WIDTH + RUN_RECORD_DRAWER_LEFT_GAP
    : document.documentElement.clientWidth || window.innerWidth
);

const getStoredDrawerWidth = () => {
  const viewportWidth = getViewportWidth();
  if (typeof window === 'undefined') {
    return clampRunRecordDrawerWidth(RUN_RECORD_DRAWER_MIN_WIDTH, viewportWidth);
  }
  const storedWidth = Number(window.localStorage.getItem(RUN_RECORD_DRAWER_STORAGE_KEY));
  return clampRunRecordDrawerWidth(
    Number.isFinite(storedWidth) && storedWidth > 0 ? storedWidth : RUN_RECORD_DRAWER_MIN_WIDTH,
    viewportWidth,
  );
};

export function RunRecordDetailDrawer({ record, visible, onClose }: RunRecordDetailDrawerProps) {
  const [filters, setFilters] = useState<RunResultFilters>({});
  const [selectedStoreKeys, setSelectedStoreKeys] = useState<(string | number)[]>([]);
  const [selectedConnectorKeys, setSelectedConnectorKeys] = useState<(string | number)[]>([]);
  const [expandedStoreKeys, setExpandedStoreKeys] = useState<(string | number)[]>([]);
  const [logMode, setLogMode] = useState<'runtime' | 'storage' | null>(null);
  const [drawerWidth, setDrawerWidth] = useState(getStoredDrawerWidth);
  const [drawerResizing, setDrawerResizing] = useState(false);
  const drawerWidthRef = useRef(drawerWidth);
  const pendingDrawerWidthRef = useRef(drawerWidth);
  const resizeFrameRef = useRef<number | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const stores = record?.stores ?? [];
  const visibleStoreIds = useMemo(() => stores.filter((store) => (
    filterConnectorExecutions(store.connectors, filters).length > 0
  )).map((store) => store.id), [stores, filters]);
  const selectedCount = selectedStoreKeys.length + selectedConnectorKeys.length;

  const saveDrawerWidth = useCallback((width: number) => {
    const nextWidth = clampRunRecordDrawerWidth(width, getViewportWidth());
    drawerWidthRef.current = nextWidth;
    pendingDrawerWidthRef.current = nextWidth;
    setDrawerWidth(nextWidth);
    window.localStorage.setItem(RUN_RECORD_DRAWER_STORAGE_KEY, String(nextWidth));
  }, []);

  useEffect(() => {
    if (!visible) return;
    const nextWidth = getStoredDrawerWidth();
    drawerWidthRef.current = nextWidth;
    pendingDrawerWidthRef.current = nextWidth;
    setDrawerWidth(nextWidth);
  }, [visible]);

  useEffect(() => {
    if (!visible || !record) return;
    setExpandedStoreKeys(record.stores.map((store) => store.id));
  }, [visible, record]);

  useEffect(() => {
    const openStorageDrawer = () => {
      if (record) setLogMode('storage');
    };
    window.addEventListener('run-detail-storage-log:open-drawer', openStorageDrawer);
    return () => window.removeEventListener('run-detail-storage-log:open-drawer', openStorageDrawer);
  }, [record]);

  useEffect(() => () => {
    resizeCleanupRef.current?.();
    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }
  }, []);

  const handleDrawerResizeStart = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const viewportWidth = getViewportWidth();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      pendingDrawerWidthRef.current = clampRunRecordDrawerWidth(
        viewportWidth - moveEvent.clientX,
        viewportWidth,
      );
      if (resizeFrameRef.current !== null) return;
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        setDrawerWidth(pendingDrawerWidthRef.current);
      });
    };

    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      resizeCleanupRef.current = null;
      setDrawerResizing(false);
    };

    const handleMouseUp = () => {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      saveDrawerWidth(pendingDrawerWidthRef.current);
      cleanup();
    };

    setDrawerResizing(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    resizeCleanupRef.current = cleanup;
  }, [saveDrawerWidth]);

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = event.key === 'ArrowLeft' ? 1 : event.key === 'ArrowRight' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    saveDrawerWidth(drawerWidthRef.current + direction * 24);
  };

  const handleClose = () => {
    resizeCleanupRef.current?.();
    setLogMode(null);
    setFilters({});
    setSelectedStoreKeys([]);
    setSelectedConnectorKeys([]);
    setExpandedStoreKeys([]);
    onClose();
  };

  const connectorColumns: ColumnProps<ConnectorExecution>[] = [
    { title: '', width: RESULT_EXPAND_COLUMN_WIDTH, render: () => null },
    {
      title: '',
      width: RESULT_SELECTION_COLUMN_WIDTH,
      render: (_value, row) => isConnectorSelectable(row) ? (
        <Checkbox
          aria-label={`选择连接器 ${row.connectorName}`}
          checked={selectedConnectorKeys.includes(row.id)}
          onChange={(checked) => setSelectedConnectorKeys((current) => (
            checked
              ? [...current, row.id]
              : current.filter((key) => key !== row.id)
          ))}
        />
      ) : null,
    },
    { title: '店铺', dataIndex: 'storeName', width: 150, ellipsis: true },
    { title: '连接器名称', dataIndex: 'connectorName', width: 190, ellipsis: true },
    { title: '业务开始日期', dataIndex: 'businessStartDate', width: 120 },
    { title: '业务结束日期', dataIndex: 'businessEndDate', width: 120 },
    {
      title: '取数执行',
      dataIndex: 'collectionStatus',
      width: 150,
      render: (value: DetailStatus, row) => (
        <div className={styles.resultStatusCell}>
          <DetailStatusTag status={value} />
          {row.issueReason ? <Tooltip content={row.issueReason}><span>{row.issueReason}</span></Tooltip> : null}
        </div>
      ),
    },
    {
      title: '数据入库',
      dataIndex: 'storageStatus',
      width: 150,
      render: (value: DetailStatus, row) => (
        <div className={styles.resultStatusCell}>
          <DetailStatusTag status={value} />
          {row.noDataNote ? <span>{row.noDataNote}</span> : null}
        </div>
      ),
    },
    {
      title: '操作',
      width: RESULT_ACTION_COLUMN_WIDTH,
      fixed: 'right',
      render: () => (
        <Space size={4}>
          <Button type="text" onClick={() => Message.info('已打开结果详情原型')}>结果详情</Button>
          <Button type="text" onClick={() => Message.success('已提交重试')}>重试</Button>
        </Space>
      ),
    },
  ];

  const storeColumns: ColumnProps<StoreExecution>[] = [
    { title: '店铺', dataIndex: 'storeName', width: 150, ellipsis: true },
    { title: '连接器名称', width: 190, render: () => '-' },
    { title: '业务开始日期', width: 120, render: () => '' },
    { title: '业务结束日期', width: 120, render: () => '' },
    { title: '取数执行', dataIndex: 'collectionStatus', width: 150, render: (value: DetailStatus) => <DetailStatusTag status={value} /> },
    { title: '数据入库', dataIndex: 'storageStatus', width: 150, render: (value: DetailStatus) => <DetailStatusTag status={value} /> },
    { title: '操作', width: RESULT_ACTION_COLUMN_WIDTH, fixed: 'right', render: () => <Button type="text" onClick={() => Message.success('已提交重试')}>重试</Button> },
  ];

  return (
    <>
      <Drawer
        title="运行记录详情"
        visible={visible}
        width={drawerWidth}
        footer={null}
        unmountOnExit
        className={`${styles.recordDrawer} ${drawerResizing ? styles.recordDrawerResizing : ''}`}
        onCancel={handleClose}
      >
        <div
          className={styles.recordDrawerResizeHandle}
          role="separator"
          aria-label="调整运行记录详情宽度"
          aria-orientation="vertical"
          aria-valuemin={RUN_RECORD_DRAWER_MIN_WIDTH}
          aria-valuemax={Math.max(RUN_RECORD_DRAWER_MIN_WIDTH, getViewportWidth() - RUN_RECORD_DRAWER_LEFT_GAP)}
          aria-valuenow={drawerWidth}
          tabIndex={0}
          onMouseDown={handleDrawerResizeStart}
          onKeyDown={handleResizeKeyDown}
        >
          <IconDragDotVertical />
        </div>
        {record ? (
          <div className={styles.recordDrawerBody}>
            <section className={styles.basicSection}>
              <div className={styles.sectionHeader}>
                <h3>基础信息</h3>
                <Space size={4} wrap className={styles.recordActions}>
                  <Button type="text" icon={<IconVideoCamera />} onClick={() => Message.info('已打开录屏原型')}>查看录屏</Button>
                      <Button type="text" icon={<IconFile />} onClick={() => setLogMode('runtime')}>取数日志</Button>
                  <RunDetailStorageLogAnnotationMarker noteId="RSL-1">
                    <Button type="text" icon={<IconStorage />} onClick={() => setLogMode('storage')}>入库日志</Button>
                  </RunDetailStorageLogAnnotationMarker>
                </Space>
              </div>
              <div className={styles.basicGrid}>
                <div className={styles.basicItemFull}><span>计划名称：</span><Tooltip content={record.planName}><strong>{record.planName}</strong></Tooltip></div>
                <div><span>计划类型：</span><strong>{record.planType}</strong></div>
                <div><span>数据周期：</span><strong>{record.dataCycle}</strong></div>
                <div><span>平台类型：</span><strong>{record.platformType}</strong></div>
                <div><span>平台名称：</span><strong>{record.platformName}</strong></div>
                <div className={styles.basicItemFull}><span>机器人口令：</span><Tooltip content={record.robotToken}><strong>{record.robotToken}</strong></Tooltip></div>
                <div className={styles.basicItemFull}><span>运行记录 ID：</span><Typography.Text copyable ellipsis={{ showTooltip: true }}>{record.recordId}</Typography.Text></div>
              </div>
            </section>
            <section className={styles.resultSection}>
              <h3>运行结果</h3>
              <div className={styles.resultToolbar}>
                <Select value={filters.collectionStatus} placeholder="取数执行" allowClear options={statusOptions} onChange={(value) => setFilters((current) => ({ ...current, collectionStatus: value }))} />
                <Select value={filters.validationStatus} placeholder="采集文件校验" allowClear options={statusOptions} onChange={(value) => setFilters((current) => ({ ...current, validationStatus: value }))} />
                <Select value={filters.storageStatus} placeholder="数据入库" allowClear options={statusOptions} onChange={(value) => setFilters((current) => ({ ...current, storageStatus: value }))} />
                <Button type="primary" disabled={!selectedCount} onClick={() => Message.success(`已提交 ${selectedCount} 条重新运行`)}>重新运行</Button>
              </div>
              <Table
                rowKey="id"
                columns={storeColumns}
                data={stores.filter((store) => visibleStoreIds.includes(store.id))}
                pagination={false}
                expandedRowKeys={expandedStoreKeys}
                onExpandedRowsChange={setExpandedStoreKeys}
                expandedRowRender={(store) => {
                  const rows = filterConnectorExecutions(store.connectors, filters);
                  return rows.length ? (
                    <Table
                      rowKey="id"
                      columns={connectorColumns}
                      data={rows}
                      showHeader={false}
                      pagination={false}
                          scroll={{ x: RESULT_SCROLL_X }}
                    />
                  ) : <Empty description="暂无符合条件的连接器" />;
                }}
                rowSelection={{
                  type: 'checkbox',
                  columnWidth: RESULT_SELECTION_COLUMN_WIDTH,
                  selectedRowKeys: selectedStoreKeys,
                  onChange: setSelectedStoreKeys,
                }}
                expandProps={{
                  width: RESULT_EXPAND_COLUMN_WIDTH,
                  icon: ({ expanded }) => (
                    <Button
                      type="text"
                      size="mini"
                      aria-label={expanded ? '收起店铺连接器' : '展开店铺连接器'}
                      icon={expanded ? <IconMinus /> : <IconPlus />}
                    />
                  ),
                }}
                scroll={{ x: RESULT_SCROLL_X, y: 'calc(100vh - 430px)' }}
                noDataElement={<Empty description="暂无运行结果" />}
              />
            </section>
          </div>
        ) : null}
      </Drawer>
      <LogDrawer
        mode={logMode ?? 'runtime'}
        visible={Boolean(logMode)}
        record={record}
        onClose={() => setLogMode(null)}
      />
    </>
  );
}
