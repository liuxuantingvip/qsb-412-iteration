import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Message,
  Modal,
  Pagination,
  Space,
  Table,
  Typography,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import { IconMinus, IconPlus, IconSettings } from '@arco-design/web-react/icon';
import type { RunRecord } from '../interface';
import { buildRunDetailData } from './mock';
import type { DetailStatus, RunExecuteRecord } from './model';
import { DetailStatusTag } from './StatusTag';
import { RunRecordDetailDrawer } from './RunRecordDetailDrawer';
import styles from './index.module.less';

interface RunDetailModalProps {
  record: RunRecord | null;
  onClose: () => void;
}

interface RunExecuteTableRow extends RunExecuteRecord {
  kind: 'summary' | 'detail';
  children?: RunExecuteTableRow[];
}

const EXPAND_COLUMN_WIDTH = 48;
const ACTION_COLUMN_WIDTH = 152;

const businessColumns: ColumnProps<RunExecuteTableRow>[] = [
  { title: '计划名称', dataIndex: 'planName', width: 180, ellipsis: true },
  { title: '运行记录ID', dataIndex: 'recordId', width: 180, render: (value) => <Typography.Text copyable>{value}</Typography.Text> },
  { title: '平台类型', dataIndex: 'platformType', width: 80 },
  { title: '平台名称', dataIndex: 'platformName', width: 100 },
  { title: '店铺名称', dataIndex: 'storeName', width: 170, ellipsis: true },
  { title: '业务日期', dataIndex: 'businessDate', width: 170 },
  { title: '最近运行开始时间', dataIndex: 'startTime', width: 160 },
  { title: '最近运行结束时间', dataIndex: 'endTime', width: 160 },
  { title: '耗时(秒)', dataIndex: 'durationSeconds', width: 84 },
  { title: '取数执行', dataIndex: 'collectionStatus', width: 100, render: (value: DetailStatus) => <DetailStatusTag status={value} /> },
  { title: '采集文件校验', dataIndex: 'validationStatus', width: 120, render: (value: DetailStatus) => <DetailStatusTag status={value} /> },
  { title: '数据入库', dataIndex: 'storageStatus', width: 110, render: (value: DetailStatus) => <DetailStatusTag status={value} /> },
];

const RUN_DETAIL_SCROLL_X = EXPAND_COLUMN_WIDTH
  + businessColumns.reduce((total, column) => total + Number(column.width ?? 0), 0)
  + ACTION_COLUMN_WIDTH;

export function RunDetailModal({ record, onClose }: RunDetailModalProps) {
  const detail = useMemo(() => record ? buildRunDetailData(record) : null, [record]);
  const tableRows = useMemo<RunExecuteTableRow[]>(() => detail?.executeRecords.map((row) => ({
    ...row,
    kind: 'summary',
    children: [{ ...row, id: `${row.id}-detail`, kind: 'detail' }],
  })) ?? [], [detail]);
  const [selectedRecord, setSelectedRecord] = useState<RunExecuteRecord | null>(null);

  useEffect(() => {
    const openRecord = (event: Event) => {
      const target = detail?.executeRecords[0];
      if (!target) return;
      setSelectedRecord(target);
      if ((event as CustomEvent<{ openStorage?: boolean }>).detail?.openStorage) {
        window.setTimeout(() => window.dispatchEvent(new CustomEvent('run-detail-storage-log:open-drawer')), 180);
      }
    };
    window.addEventListener('run-detail-storage-log:open-record', openRecord);
    return () => window.removeEventListener('run-detail-storage-log:open-record', openRecord);
  }, [detail]);

  const handleClose = () => {
    setSelectedRecord(null);
    onClose();
  };

  const columns: ColumnProps<RunExecuteTableRow>[] = [
    { title: '', width: EXPAND_COLUMN_WIDTH, render: () => null },
    ...businessColumns,
    {
      title: <div className={styles.operationHeader}><span>操作</span><IconSettings /></div>,
      width: ACTION_COLUMN_WIDTH,
      fixed: 'right',
      render: (_, row) => row.kind === 'detail' ? (
        <Button type="text" onClick={() => setSelectedRecord(row)}>详情</Button>
      ) : (
        <Space size={8}>
          {row.collectionStatus === '运行失败' ? <Button type="text" onClick={() => Message.success('已提交取数重试')}>取数重试</Button> : null}
          {row.storageStatus === '失败' ? <Button type="text" onClick={() => Message.success('已提交入库重试')}>入库重试</Button> : null}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        visible={Boolean(record)}
        title={detail ? `运行详情(${detail.summary.planName})` : '运行详情'}
        footer={null}
        unmountOnExit
        className={styles.runDetailModal}
        style={{ width: 'calc(100vw - 24px)' }}
        onCancel={handleClose}
      >
        <Table
          rowKey="id"
          columns={columns}
          data={tableRows}
          pagination={false}
          defaultExpandedRowKeys={tableRows.map((item) => item.id)}
          expandProps={{
            width: EXPAND_COLUMN_WIDTH,
            icon: ({ expanded }) => (
              <Button
                type="text"
                size="mini"
                aria-label={expanded ? '收起运行记录' : '展开运行记录'}
                icon={expanded ? <IconMinus /> : <IconPlus />}
              />
            ),
          }}
          scroll={{ x: RUN_DETAIL_SCROLL_X, y: 'calc(100vh - 270px)' }}
        />
        <div className={styles.modalFooter}>
          <span>共 {detail?.executeRecords.length ?? 0} 条记录</span>
          <Pagination total={detail?.executeRecords.length ?? 0} current={1} pageSize={20} />
        </div>
      </Modal>
      <RunRecordDetailDrawer
        record={selectedRecord}
        visible={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
      />
    </>
  );
}
