import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  Message,
  Select,
  Space,
  Table,
  Tag,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import { IconEdit, IconPlus } from '@arco-design/web-react/icon';
import type { AnnouncementMessageItem } from '@/components/messageCenter';
import { MessageCenterAnnotationMarker } from '@/components/messageCenterAnnotations';
import styles from './index.module.less';

type AnnouncementRecord = AnnouncementMessageItem;
type AnnouncementStatus = AnnouncementRecord['status'];

const statusMeta: Record<AnnouncementStatus, { color: string; label: string }> = {
  published: { color: 'green', label: '已发布' },
  draft: { color: 'gray', label: '未发布' },
};

const nowText = '2026-07-21 14:00';

export default function AnnouncementManagement({
  records,
  onRecordsChange,
}: {
  records: AnnouncementRecord[];
  onRecordsChange: (records: AnnouncementRecord[]) => void;
}) {
  const [form] = Form.useForm();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AnnouncementRecord | null>(null);

  const filteredRecords = useMemo(() => records.filter((record) => (
    (!keyword || record.title.includes(keyword))
    && (statusFilter === 'all' || record.status === statusFilter)
  )), [keyword, records, statusFilter]);

  useEffect(() => {
    const openCreateDrawer = () => openDrawer();
    window.addEventListener('announcement:open-drawer', openCreateDrawer);
    return () => window.removeEventListener('announcement:open-drawer', openCreateDrawer);
  });

  const openDrawer = (record?: AnnouncementRecord) => {
    setEditingRecord(record || null);
    form.setFieldsValue(record || {
      title: '',
      type: '平台公告',
      range: '全部租户',
      summary: '',
      linkLabel: '查看详情',
      linkUrl: '',
    });
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const saveAnnouncement = async () => {
    const values = await form.validate();
    const nextStatus = editingRecord?.status || 'draft';
    const wasPublished = editingRecord?.status === 'published';
    const nextRecord: AnnouncementRecord = {
      id: editingRecord?.id || `ann-${Date.now()}`,
      unread: nextStatus === 'published' ? (wasPublished ? editingRecord?.unread ?? true : true) : false,
      title: values.title,
      type: values.type,
      range: values.range,
      status: nextStatus,
      publishedAt: nextStatus === 'published'
        ? (editingRecord?.publishedAt !== '-' ? editingRecord?.publishedAt : nowText) || nowText
        : '-',
      summary: values.summary,
      linkLabel: values.linkLabel?.trim() || undefined,
      linkUrl: values.linkUrl?.trim() || undefined,
      readCount: nextStatus === 'published' && !wasPublished ? 0 : editingRecord?.readCount || 0,
      totalCount: editingRecord?.totalCount || 326,
    };

    onRecordsChange(editingRecord
      ? records.map((record) => (record.id === editingRecord.id ? nextRecord : record))
      : [nextRecord, ...records]);
    Message.success('公告已保存');
    closeDrawer();
  };

  const setRecordStatus = (recordId: string, status: AnnouncementStatus) => {
    onRecordsChange(records.map((record) => (
      record.id === recordId
        ? {
          ...record,
          status,
          unread: status === 'published',
          publishedAt: status === 'published'
            ? (record.publishedAt === '-' ? nowText : record.publishedAt)
            : '-',
          readCount: status === 'published' && record.status !== 'published' ? 0 : record.readCount,
        }
        : record
    )));
    Message.success(status === 'published' ? '公告已发布' : '公告已下线');
  };

  const columns: ColumnProps<AnnouncementRecord>[] = [
    {
      title: '公告标题',
      dataIndex: 'title',
      width: 260,
      render: (_, record) => (
        <div>
          <div>{record.title}</div>
          <div className={styles.muted}>{record.summary}</div>
        </div>
      ),
    },
    {
      title: '公告类型',
      dataIndex: 'type',
      width: 110,
      render: (type) => <Tag className={styles.typeTag} color={type === '运营公告' ? 'purple' : 'arcoblue'}>{type}</Tag>,
    },
    {
      title: '发送范围',
      dataIndex: 'range',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: AnnouncementStatus) => (
        <Tag className={styles.typeTag} color={statusMeta[status].color}>{statusMeta[status].label}</Tag>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      width: 150,
    },
    {
      title: '跳转配置',
      width: 160,
      render: (_, record) => record.linkUrl ? (
        <span className={styles.linkCell}>{record.linkLabel || '查看详情'}</span>
      ) : <span className={styles.muted}>未配置</span>,
    },
    {
      title: '阅读情况',
      width: 120,
      render: (_, record) => (
        <div className={styles.readStats}>
          <span>{record.readCount}/{record.totalCount}</span>
          <span className={styles.muted}>已读/应读</span>
        </div>
      ),
    },
    {
      title: '操作',
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button className={styles.actionButton} type="text" icon={<IconEdit />} onClick={() => openDrawer(record)}>
            编辑
          </Button>
          {record.status === 'published' ? (
            <Button className={styles.actionButton} type="text" status="danger" onClick={() => setRecordStatus(record.id, 'draft')}>
              下线
            </Button>
          ) : (
            <Button className={styles.actionButton} type="text" onClick={() => setRecordStatus(record.id, 'published')}>
              发布
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <h2 className={styles.title}>公告管理</h2>
        <Button type="primary" icon={<IconPlus />} onClick={() => openDrawer()}>
          新建公告
        </Button>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Input.Search
            allowClear
            placeholder="搜索公告标题"
            style={{ width: 240 }}
            value={keyword}
            onChange={setKeyword}
          />
          <Select
            value={statusFilter}
            style={{ width: 140 }}
            onChange={setStatusFilter}
          >
            <Select.Option value="all">全部状态</Select.Option>
            <Select.Option value="published">已发布</Select.Option>
            <Select.Option value="draft">未发布</Select.Option>
          </Select>
        </div>
      </div>
      <MessageCenterAnnotationMarker noteId="BUL-1" layout="block">
        <div className={styles.tableWrap}>
          <Table
            rowKey="id"
            columns={columns}
            data={filteredRecords}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1180 }}
          />
        </div>
      </MessageCenterAnnotationMarker>

      <Drawer
        width={520}
        title={editingRecord ? '编辑公告' : '新建公告'}
        visible={drawerVisible}
        footer={(
          <div className={styles.drawerFooter}>
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" onClick={saveAnnouncement}>保存</Button>
          </div>
        )}
        onCancel={closeDrawer}
      >
        <MessageCenterAnnotationMarker noteId="BUL-2" layout="block">
          <Form form={form} layout="vertical">
            <Form.Item field="title" label="公告标题" rules={[{ required: true, message: '请输入公告标题' }]}>
              <Input placeholder="请输入公告标题" />
            </Form.Item>
            <Form.Item field="type" label="公告类型" rules={[{ required: true, message: '请选择公告类型' }]}>
              <Select>
                <Select.Option value="平台公告">平台公告</Select.Option>
                <Select.Option value="运营公告">运营公告</Select.Option>
                <Select.Option value="维护通知">维护通知</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item field="range" label="发送范围" rules={[{ required: true, message: '请选择发送范围' }]}>
              <Select>
                <Select.Option value="全部租户">全部租户</Select.Option>
                <Select.Option value="电商取数宝">电商取数宝</Select.Option>
                <Select.Option value="跨境取数宝">跨境取数宝</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item field="summary" label="公告内容" rules={[{ required: true, message: '请输入公告内容' }]}>
              <Input.TextArea placeholder="请输入公告内容" autoSize={{ minRows: 4, maxRows: 8 }} />
            </Form.Item>
            <Form.Item field="linkLabel" label="跳转按钮文案">
              <Input placeholder="查看详情" />
            </Form.Item>
            <Form.Item field="linkUrl" label="跳转链接">
              <Input placeholder="请输入公告跳转地址，留空则不展示按钮" />
            </Form.Item>
          </Form>
        </MessageCenterAnnotationMarker>
      </Drawer>
    </div>
  );
}
