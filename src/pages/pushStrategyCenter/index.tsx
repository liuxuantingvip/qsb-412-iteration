import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MessageModel } from './messagePayload';
import type {
  HTMLAttributes,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  ThHTMLAttributes,
} from 'react';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  Message,
  Modal,
  Pagination,
  Radio,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  TimePicker,
  Tooltip,
  TreeSelect,
  Typography,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import {
  IconDelete,
  IconEdit,
  IconEye,
  IconLarkColor,
  IconPlus,
  IconRefresh,
  IconSend,
  IconWechat,
} from '@arco-design/web-react/icon';
import type {
  ChannelDraft,
  EnabledStatus,
  PushChannel,
  PushChannelType,
  PushHistory,
  PushSchedule,
  PushStrategy,
  RelatedObjectOption,
  RelatedObjectType,
  StrategyDraft,
} from './interface';
import {
  deleteChannel,
  deleteStrategy,
  getHistoryDetail,
  listHistoryChannels,
  getStrategyDetail,
  listChannels,
  listAuthorizedProductCategories,
  listRelatedObjects,
  mergeRealtimeExecutionCounts,
  queryChannels,
  queryHistory,
  queryStrategies,
  saveChannel,
  saveStrategy,
  testChannel,
  updateChannelStatus,
  updateStrategyStatus,
} from './services';
import styles from './index.module.less';
import { clearQueryFailure } from './services';
import { candidates, validateSchedule } from './strategyRules';
import { StrategyMessagePreview, SnapshotMessage, PortalDestination } from './strategyPreview';
import type { MessageSnapshot } from './strategyRules';
import { FieldFeedback } from './FieldFeedback';

const { TabPane } = Tabs;
const { Text } = Typography;
const DEFAULT_MIN_COLUMN_WIDTH = 80;
const invalidProductTooltip = '该产品类别已失效，无法启用推送策略';

const StrategyTableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement> & { record?: unknown; index?: number }>(
  function StrategyTableRow({ record: _record, index: _index, ...props }, ref) {
    const row = (_record as PushStrategy | undefined)?.id === 'strategy-3'
      ? <tr {...props} ref={ref} data-note-id="PS-1" />
      : <tr {...props} ref={ref} />;
    return props.className?.includes(styles.invalidStrategyRow)
      ? <Tooltip content={invalidProductTooltip}>{row}</Tooltip>
      : row;
  },
);

type ResizableHeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
  minWidth?: number;
  onResize?: (width: number) => void;
  width?: number;
};

type ResizableColumn<T> = ColumnProps<T> & {
  resizeKey: string;
  width: number;
  minWidth?: number;
};

function ResizableHeaderCell({
  children,
  className = '',
  minWidth = DEFAULT_MIN_COLUMN_WIDTH,
  onResize,
  style,
  width,
  ...restProps
}: ResizableHeaderCellProps) {
  const startResize = (
    startX: number,
    moveEventName: 'mousemove' | 'pointermove',
    upEventName: 'mouseup' | 'pointerup',
  ) => {
    if (!width || !onResize) return;
    const startWidth = width;
    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (event: MouseEvent | PointerEvent) => {
      onResize(Math.max(minWidth, startWidth + event.clientX - startX));
    };
    const handleUp = () => {
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
      document.removeEventListener(moveEventName, handleMove);
      document.removeEventListener(upEventName, handleUp);
    };

    document.addEventListener(moveEventName, handleMove);
    document.addEventListener(upEventName, handleUp);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    startResize(event.clientX, 'pointermove', 'pointerup');
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLSpanElement>) => {
    if (window.PointerEvent) return;
    event.preventDefault();
    event.stopPropagation();
    startResize(event.clientX, 'mousemove', 'mouseup');
  };

  return (
    <th
      {...restProps}
      className={`${className} ${styles.resizableHeaderCell}`}
      style={{ ...style, minWidth, width }}
    >
      {children}
      {onResize ? (
        <span
          aria-hidden="true"
          className={styles.resizeHandle}
          onMouseDown={handleMouseDown}
          onPointerDown={handlePointerDown}
        />
      ) : null}
    </th>
  );
}

function useResizableTable<T>(baseColumns: ResizableColumn<T>[]) {
  const tableAreaRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => (
    Object.fromEntries(baseColumns.map((column) => [column.resizeKey, column.width]))
  ));

  useEffect(() => {
    const tableArea = tableAreaRef.current;
    if (!tableArea) return undefined;

    const updateWidth = () => setContainerWidth(tableArea.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(tableArea);
    return () => observer.disconnect();
  }, []);

  const columns = baseColumns.map(({
    resizeKey,
    minWidth = DEFAULT_MIN_COLUMN_WIDTH,
    ...column
  }) => {
    const width = columnWidths[resizeKey] ?? column.width;
    return {
      ...column,
      width,
      onHeaderCell: () => ({
        minWidth,
        width,
        onResize: (nextWidth: number) => setColumnWidths((current) => ({
          ...current,
          [resizeKey]: Math.max(minWidth, Math.round(nextWidth)),
        })),
      }) as ResizableHeaderCellProps,
    };
  });
  const totalWidth = baseColumns.reduce(
    (sum, column) => sum + (columnWidths[column.resizeKey] ?? column.width),
    0,
  );

  return {
    columns,
    scroll: { x: Math.max(totalWidth, containerWidth || totalWidth) },
    tableAreaRef,
  };
}

const channelTypeMeta: Record<PushChannelType, { label: string; color: string }> = {
  DINGTALK: { label: '钉钉', color: 'blue' },
  FEISHU: { label: '飞书', color: 'purple' },
  WECOM: { label: '企业微信', color: 'green' },
};

function DingTalkLogo() {
  return (
    <svg className={styles.channelLogo} viewBox="0 0 1024 1024" aria-hidden="true">
      <path
        fill="currentColor"
        d="M573.7 252.5C422.5 197.4 201.3 96.7 201.3 96.7c-15.7-4.1-17.9 11.1-17.9 11.1-5 61.1 33.6 160.5 53.6 182.8 19.9 22.3 319.1 113.7 319.1 113.7S326 357.9 270.5 341.9c-55.6-16-37.9 17.8-37.9 17.8 11.4 61.7 64.9 131.8 107.2 138.4 42.2 6.6 220.1 4 220.1 4s-35.5 4.1-93.2 11.9c-42.7 5.8-97 12.5-111.1 17.8-33.1 12.5 24 62.6 24 62.6 84.7 76.8 129.7 50.5 129.7 50.5 33.3-10.7 61.4-18.5 85.2-24.2L565 743.1h84.6L603 928l205.3-271.9H700.8l22.3-38.7c.3.5.4.8.4.8S799.8 496.1 829 433.8l.6-1h-.1c5-10.8 8.6-19.7 10-25.8 17-71.3-114.5-99.4-265.8-154.5z"
      />
    </svg>
  );
}

function ChannelTypeTag({ type }: { type: PushChannelType }) {
  const meta = channelTypeMeta[type];
  const icon = type === 'DINGTALK'
    ? <DingTalkLogo />
    : type === 'FEISHU'
      ? <IconLarkColor className={styles.channelLogo} />
      : <IconWechat className={styles.channelLogo} />;

  return (
    <Tag className={styles.channelTypeTag} color={meta.color}>
      {icon}
      <span>{meta.label}</span>
    </Tag>
  );
}

const statusMeta: Record<EnabledStatus, { label: string; color: string }> = {
  ENABLED: { label: '已启用', color: 'green' },
  DISABLED: { label: '已停用', color: 'gray' },
};

const relatedTypeMeta: Record<RelatedObjectType, string> = {
  TASK: '计划',
  SHOP: '店铺',
  DATA_TABLE: '数据表',
  MONITOR_VIEW: '数据监控视图',
};

const messageTypeMeta = {
  PROGRESS: '进度汇总',
  EXCEPTION_SUMMARY: '异常汇总',
  EXCEPTION_ALERT: '异常提醒',
  SUCCESS_ALERT: '成功提醒',
  LOGIN_EXCEPTION: '账号登录异常',
};

const pushModeMeta = { SCHEDULED: '定时推送', REALTIME: '实时推送' };

const cycleMeta = { DAY: '每日', WEEK: '每周', MONTH: '每月' };
const weekOptions = ['一', '二', '三', '四', '五', '六', '日'].map((label, index) => ({
  label: `周${label}`,
  value: index + 1,
}));
const monthOptions = Array.from({ length: 31 }, (_, index) => ({
  label: `${index + 1} 日`,
  value: String(index + 1),
})).concat([{ label: '最后一天', value: 'LAST_DAY' }]);

const formatMonthDays = (days: PushSchedule['monthDays']) => days.map((day) => day === 'LAST_DAY' ? '最后一天' : `${day} 日`).join('、');

const defaultSchedule = (): PushSchedule => ({
  cycle: 'DAY',
  weekDays: [],
  monthDays: [],
  timeRanges: [{ id: `time-${Date.now()}`, time: '09:00' }],
});

const defaultChannelDraft = (): ChannelDraft => ({
  name: '',
  type: 'DINGTALK',
  status: 'ENABLED',
  webhook: '',
  secret: '',
});

const defaultStrategyDraft = (): StrategyDraft => ({
  name: '',
  status: 'ENABLED',
  productCategory: '电商取数宝',
  pushMode: 'SCHEDULED',
  messageType: 'PROGRESS',
  relatedObjectType: 'TASK',
  relatedMode: 'ALL',
  relatedObjectIds: [],
  schedule: defaultSchedule(),
  channelIds: [],
});

const maskSecret = (value: string) => {
  if (!value) return '-';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}******${value.slice(-4)}`;
};

const maskWebhook = (value: string) => {
  if (!value) return '-';
  const visible = value.slice(0, Math.min(value.length, 34));
  return `${visible}${value.length > visible.length ? '••••••' : ''}`;
};

const validateTimeRanges = validateSchedule;

function PageFooter({
  total,
  page,
  pageSize,
  onChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
}) {
  return (
    <div className={styles.pageFooter}>
      <span>共 {total} 条</span>
      <Pagination
        current={page}
        pageSize={pageSize}
        total={total}
        showTotal={false}
        showJumper
        sizeCanChange
        sizeOptions={[10, 20, 50]}
        onChange={onChange}
      />
    </div>
  );
}

export function ScheduleEditor({
  value,
  onChange,
  disabled,
}: {
  value: PushSchedule;
  onChange: (value: PushSchedule) => void;
  disabled?: boolean;
}) {
  const updateRange = (id: string, time: string) => {
    onChange({
      ...value,
      timeRanges: value.timeRanges.map((item) => (
        item.id === id ? { ...item, time } : item
      )),
    });
  };

  return (
    <div className={styles.scheduleEditor}>
      <Radio.Group
        type="button"
        value={value.cycle}
        disabled={disabled}
        onChange={(cycle) => onChange({
          ...value,
          cycle,
          weekDays: cycle === 'WEEK' ? (value.weekDays.length ? value.weekDays : [1, 2, 3, 4, 5]) : [],
          monthDays: cycle === 'MONTH' ? (value.monthDays.length ? value.monthDays : [1]) : [],
        })}
      >
        <Radio value="DAY">每日</Radio>
        <Radio value="WEEK">每周</Radio>
        <Radio value="MONTH">每月</Radio>
      </Radio.Group>
      {value.cycle === 'WEEK' ? (
        <Checkbox.Group
          value={value.weekDays}
          options={weekOptions}
          disabled={disabled}
          onChange={(weekDays) => onChange({ ...value, weekDays: weekDays as number[] })}
        />
      ) : null}
      {value.cycle === 'MONTH' ? (
        <Select
          mode="multiple"
          value={value.monthDays.map(String)}
          options={monthOptions}
          disabled={disabled}
          placeholder="请选择日期"
          onChange={(monthDays) => onChange({ ...value, monthDays: (monthDays as string[]).map((day) => day === 'LAST_DAY' ? day : Number(day)) })}
        />
      ) : null}
      <div className={styles.timeRangeList}>
        {value.timeRanges.map((range, index) => (
          <div className={styles.timeRangeRow} key={range.id}>
            <span className={styles.timeRangeLabel}>时间 {index + 1}</span>
            <TimePicker
              value={range.time}
              format="HH:mm"
              disabled={disabled}
              onChange={(nextValue) => updateRange(range.id, nextValue)}
            />
            {!disabled && value.timeRanges.length > 1 ? (
              <Button
                type="text"
                status="danger"
                icon={<IconDelete />}
                onClick={() => onChange({
                  ...value,
                  timeRanges: value.timeRanges.filter((item) => item.id !== range.id),
                })}
              />
            ) : null}
          </div>
        ))}
        {!disabled && value.timeRanges.length < 5 ? (
          <Button
            type="outline"
            size="small"
            icon={<IconPlus />}
            onClick={() => onChange({
              ...value,
              timeRanges: [
                ...value.timeRanges,
                { id: `time-${Date.now()}`, time: '' },
              ],
            })}
          >
            添加时间
          </Button>
        ) : null}
      </div>
      <Text type="secondary">时间均为北京时间；同一日的推送时间点至少间隔 30 分钟。</Text>
    </div>
  );
}

function ChannelConfig() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<PushChannel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<{ name: string; type?: PushChannelType; status?: EnabledStatus }>({ name: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [draft, setDraft] = useState<ChannelDraft>(defaultChannelDraft());
  const [testedFingerprint, setTestedFingerprint] = useState('');
  const [testing, setTesting] = useState(false);

  const fingerprint = JSON.stringify({
    type: draft.type,
    webhook: draft.webhook.trim(),
    secret: draft.secret.trim(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    const result = await queryChannels({ ...appliedFilters, page, pageSize });
    setRecords(result.list);
    setTotal(result.total);
    setLoading(false);
  }, [appliedFilters, page, pageSize]);

  useEffect(() => { void load(); }, [load]);

  const openDrawer = (record?: PushChannel) => {
    setDraft(record ? {
      id: record.id,
      name: record.name,
      type: record.type,
      status: record.status,
      webhook: record.webhook,
      secret: record.secret,
    } : defaultChannelDraft());
    setTestedFingerprint('');
    setDrawerVisible(true);
  };

  const doTest = async () => {
    if (!draft.webhook.trim()) {
      Message.warning('请填写 Webhook 地址');
      return;
    }
    if (draft.type !== 'WECOM' && !draft.secret.trim()) {
      Message.warning('请填写加签密钥');
      return;
    }
    setTesting(true);
    const success = await testChannel(draft);
    setTesting(false);
    if (success) {
      setTestedFingerprint(fingerprint);
      Message.success('测试消息发送成功');
    } else {
      setTestedFingerprint('');
      Message.error('发送失败，请检查 Webhook 地址和加签密钥');
    }
  };

  const saveDraft = async () => {
    await saveChannel({ ...draft, name: draft.name.trim(), webhook: draft.webhook.trim(), secret: draft.secret.trim() });
    Message.success(draft.id ? '渠道已更新' : '渠道已新增');
    setDrawerVisible(false);
    await load();
  };

  const doSave = async () => {
    if (!draft.name.trim() || !draft.webhook.trim()) {
      Message.warning('请完整填写渠道名称和 Webhook 地址');
      return;
    }
    if (fingerprint !== testedFingerprint) {
      Message.warning('请先完成 Webhook 测试');
      return;
    }
    const previous = records.find((item) => item.id === draft.id);
    if (previous?.status === 'ENABLED' && draft.status === 'DISABLED' && previous.referenceCount > 0) {
      Modal.confirm({
        title: '停用渠道',
        content: `该渠道正被 ${previous.referenceCount} 个策略引用，停用后相关消息将无法通过此渠道推送。确定保存吗？`,
        okButtonProps: { status: 'danger' },
        onOk: saveDraft,
      });
      return;
    }
    await saveDraft();
  };

  const confirmStatus = (record: PushChannel, checked: boolean) => {
    const nextStatus = checked ? 'ENABLED' : 'DISABLED';
    const apply = async () => {
      await updateChannelStatus(record.id, nextStatus);
      Message.success(checked ? '渠道已启用' : '渠道已停用');
      await load();
    };
    if (!checked && record.referenceCount > 0) {
      Modal.confirm({
        title: '停用渠道',
        content: `该渠道正被 ${record.referenceCount} 个策略引用，停用后相关消息将无法通过此渠道推送。确定停用吗？`,
        okButtonProps: { status: 'danger' },
        onOk: apply,
      });
      return;
    }
    void apply();
  };

  const confirmDelete = (record: PushChannel) => {
    Modal.confirm({
      title: '删除渠道',
      content: record.referenceCount
        ? `该渠道正被 ${record.referenceCount} 个策略引用（${record.referencedStrategies.join('、')}），删除后这些策略将缺少推送渠道。是否继续？`
        : '删除后不可恢复，是否继续？',
      okText: '继续删除',
      okButtonProps: { status: 'danger' },
      onOk: () => new Promise<void>((resolve) => {
        Modal.confirm({
          title: '再次确认删除',
          content: `确定删除渠道“${record.name}”吗？`,
          okText: '确认删除',
          okButtonProps: { status: 'danger' },
          onOk: async () => {
            await deleteChannel(record.id);
            Message.success('渠道已删除');
            await load();
            resolve();
          },
          onCancel: resolve,
        });
      }),
    });
  };

  const baseColumns: ResizableColumn<PushChannel>[] = [
    {
      title: '渠道名称',
      dataIndex: 'name',
      resizeKey: 'name',
      width: 150,
      minWidth: 120,
      fixed: 'left',
    },
    {
      title: '渠道类型',
      dataIndex: 'type',
      resizeKey: 'type',
      width: 100,
      render: (type: PushChannelType) => <ChannelTypeTag type={type} />,
    },
    {
      title: '引用策略',
      dataIndex: 'referenceCount',
      resizeKey: 'referenceCount',
      width: 90,
      render: (count: number, record) => (
        <span title={record.referencedStrategies.join('、')}>{count ? `${count} 个` : '0'}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      resizeKey: 'status',
      width: 80,
      render: (status: EnabledStatus, record) => (
        <Switch checked={status === 'ENABLED'} onChange={(checked) => confirmStatus(record, checked)} />
      ),
    },
    {
      title: 'Webhook',
      dataIndex: 'webhook',
      resizeKey: 'webhook',
      width: 300,
      minWidth: 180,
      ellipsis: true,
      render: (value: string) => maskWebhook(value),
    },
    {
      title: '密钥',
      dataIndex: 'secret',
      resizeKey: 'secret',
      width: 140,
      minWidth: 110,
      render: (value: string) => maskSecret(value),
    },
    {
      title: '操作',
      resizeKey: 'action',
      width: 190,
      minWidth: 180,
      fixed: 'right',
      align: 'left',
      render: (_value, record) => (
        <Space>
          <Button className={styles.actionButton} type="text" size="small" icon={<IconEdit />} onClick={() => openDrawer(record)}>编辑</Button>
          <Button className={styles.actionButton} type="text" size="small" status="danger" icon={<IconDelete />} onClick={() => confirmDelete(record)}>删除</Button>
        </Space>
      ),
    },
  ];
  const { columns, scroll, tableAreaRef } = useResizableTable(baseColumns);

  return (
    <div className={styles.tabPage}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Input
            className={styles.keywordInput}
            allowClear
            value={filters.name}
            placeholder="请输入渠道名称"
            onChange={(name) => {
              const next = { ...filters, name };
              setFilters(next);
              setAppliedFilters(next);
              setPage(1);
            }}
          />
          <Select
            className={styles.filterSelect}
            allowClear
            value={filters.type}
            placeholder="渠道类型"
            options={Object.entries(channelTypeMeta).map(([value, meta]) => ({ value, label: meta.label }))}
            onChange={(type) => {
              const next = { ...filters, type };
              setFilters(next);
              setAppliedFilters(next);
              setPage(1);
            }}
          />
          <Select
            className={styles.filterSelect}
            allowClear
            value={filters.status}
            placeholder="启用状态"
            options={Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))}
            onChange={(status) => {
              const next = { ...filters, status };
              setFilters(next);
              setAppliedFilters(next);
              setPage(1);
            }}
          />
        </div>
        <Button type="primary" icon={<IconPlus />} onClick={() => openDrawer()}>新增渠道</Button>
      </div>
      <div className={styles.tableArea} ref={tableAreaRef}>
        <Spin loading={loading}>
          <Table
            rowKey="id"
            columns={columns}
            components={{ header: { th: ResizableHeaderCell } }}
            data={records}
            pagination={false}
            scroll={scroll}
            noDataElement={<Empty description="暂无渠道配置" />}
          />
        </Spin>
      </div>
      <PageFooter total={total} page={page} pageSize={pageSize} onChange={(nextPage, nextSize) => {
        setPage(nextPage);
        setPageSize(nextSize);
      }} />
      <Drawer
        className={styles.pushDrawer}
        width={520}
        visible={drawerVisible}
        title={draft.id ? '编辑推送渠道' : '新增推送渠道'}
        onCancel={() => setDrawerVisible(false)}
        footer={(
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            <Button type="primary" disabled={fingerprint !== testedFingerprint} onClick={() => void doSave()}>保存</Button>
          </Space>
        )}
      >
        <Form layout="vertical">
          {draft.id && records.find((item) => item.id === draft.id)?.referenceCount ? (
            <Alert
              className={styles.channelReferenceAlert}
              type="warning"
              content={`当前渠道被 ${records.find((item) => item.id === draft.id)?.referenceCount} 个推送策略引用。`}
            />
          ) : null}
          <Form.Item label="渠道名称" required>
            <Input maxLength={30} showWordLimit value={draft.name} placeholder="请输入渠道名称" onChange={(name) => setDraft({ ...draft, name })} />
          </Form.Item>
          <Form.Item label="渠道类型" required>
            <Select
              value={draft.type}
              options={Object.entries(channelTypeMeta).map(([value, meta]) => ({ value, label: meta.label }))}
              onChange={(type) => setDraft({ ...draft, type, secret: type === 'WECOM' ? '' : draft.secret })}
            />
          </Form.Item>
          {draft.id ? (
            <Form.Item label="启用状态">
              <Switch checked={draft.status === 'ENABLED'} onChange={(checked) => setDraft({ ...draft, status: checked ? 'ENABLED' : 'DISABLED' })} />
            </Form.Item>
          ) : null}
          <Form.Item label="Webhook 地址" required>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              value={draft.webhook}
              placeholder="请输入 https:// 开头的机器人 Webhook 地址"
              onChange={(webhook) => setDraft({ ...draft, webhook })}
            />
          </Form.Item>
          {draft.type !== 'WECOM' ? (
            <Form.Item label="加签密钥" required>
              <Input.Password value={draft.secret} placeholder="请输入机器人加签密钥" onChange={(secret) => setDraft({ ...draft, secret })} />
            </Form.Item>
          ) : null}
          <div className={styles.testRow}>
            <Button type="outline" loading={testing} icon={<IconSend />} onClick={() => void doTest()}>发送测试消息</Button>
            {fingerprint === testedFingerprint
              ? <Tag color="green">测试成功，可保存</Tag>
              : null}
          </div>
        </Form>
      </Drawer>
    </div>
  );
}

const previewMessage = {
  plan: 'p0 海雅阿里妈妈报表实时数据',
  store: '海雅天猫旗舰店',
  table: '阿里妈妈账户报表',
  stage: '入库校验失败',
  reason: '近 1 天数据缺失，校验未通过',
  time: '2026-09-02 15:08:26',
};

type PlanFailure = {
  name: string;
  planType: '日常' | '实时' | '回溯';
  detail: string;
} & ({ stage: '取数执行失败'; errorCode: string } | { stage: '入库失败' | '入库校验失败' });

const planFailureExamples: PlanFailure[] = [
  { name: previewMessage.plan, planType: '实时', stage: '取数执行失败', errorCode: '1201', detail: '当前账号该模板权限未开通-请您添加权限后重试' },
  { name: '海雅生意参谋商品日报', planType: '日常', stage: '入库失败', detail: '目标表写入失败：字段 amount 的值无法转换为目标字段的数值类型' },
  { name: '海雅历史订单回溯', planType: '回溯', stage: '入库校验失败', detail: '近 1 天数据缺失，校验未通过' },
];

function formatPlanFailureReason(failure: PlanFailure) {
  return failure.stage === '取数执行失败' ? `错误码 ${failure.errorCode} · ${failure.detail}` : failure.detail;
}

function getPreviewFailureReason(objectType: Exclude<PreviewObjectType, 'MONITOR_VIEW'>) {
  return objectType === 'PLAN' ? formatPlanFailureReason(planFailureExamples[0]) : previewMessage.reason;
}

type PreviewPushMode = 'SCHEDULED' | 'REALTIME';
type PreviewObjectType = 'PLAN' | 'STORE' | 'DATA_TABLE' | 'MONITOR_VIEW';
type PreviewMessageKind = 'PROGRESS' | 'EXCEPTION_SUMMARY' | 'EXCEPTION_ALERT' | 'SUCCESS_ALERT';
type PreviewTone = 'danger' | 'warning' | 'success';

const previewObjectMeta: Record<PreviewObjectType, { label: string }> = {
  PLAN: { label: '计划' },
  STORE: { label: '店铺' },
  DATA_TABLE: { label: '数据表' },
  MONITOR_VIEW: { label: '数据监控视图' },
};

const previewTone: Record<PreviewMessageKind, PreviewTone> = {
  PROGRESS: 'warning',
  EXCEPTION_SUMMARY: 'danger',
  EXCEPTION_ALERT: 'danger',
  SUCCESS_ALERT: 'success',
};

const previewMetrics: Record<'STORE' | 'DATA_TABLE', Array<{ label: string; value: number; tone?: PreviewTone }>> = {
  STORE: [
    { label: '应关注店铺', value: 38 },
    { label: '全部完成', value: 31, tone: 'success' },
    { label: '存在异常', value: 5, tone: 'danger' },
    { label: '运行中', value: 2, tone: 'warning' },
  ],
  DATA_TABLE: [
    { label: '应交付数据表', value: 12 },
    { label: '全部完成', value: 9, tone: 'success' },
    { label: '存在异常', value: 2, tone: 'danger' },
    { label: '运行中', value: 1, tone: 'warning' },
  ],
};

const realtimeProgress = mergeRealtimeExecutionCounts(
  { total: 48, success: 32, failed: 1, running: 15 },
  { total: 6, success: 5, failed: 0, running: 1 },
);
const planProgressSections = [
  { title: '日常计划', metrics: [['应执行', 42], ['成功', 30], ['失败', 1], ['运行中', 11]] },
  { title: '实时计划', metrics: [['总次数', realtimeProgress.total], ['成功', realtimeProgress.success], ['失败', realtimeProgress.failed], ['运行中', realtimeProgress.running]] },
  { title: '回溯计划', metrics: [['实际次数', 3], ['成功', 2], ['失败', 1], ['运行中', 0]] },
] as const;


function getPreviewTitle(kind: PreviewMessageKind, objectType: PreviewObjectType) {
  const objectLabel = previewObjectMeta[objectType].label;
  if (kind === 'PROGRESS') return `${objectLabel}进度汇总`;
  if (kind === 'EXCEPTION_SUMMARY') return `${objectLabel}异常汇总`;
  if (kind === 'EXCEPTION_ALERT') return `${objectLabel}异常提醒`;
  return `${objectLabel}成功提醒`;
}

function getPreviewStrategy(kind: PreviewMessageKind, objectType: PreviewObjectType) {
  const objectLabel = previewObjectMeta[objectType].label;
  if (kind === 'PROGRESS') return `${objectLabel}定时巡检`;
  if (kind === 'EXCEPTION_SUMMARY') return `${objectLabel}异常定时汇总`;
  if (kind === 'EXCEPTION_ALERT') return `${objectLabel}异常实时提醒`;
  return `${objectLabel}成功实时提醒`;
}

function getPreviewFacts(objectType: Exclude<PreviewObjectType, 'MONITOR_VIEW'>, includeFailureStage: boolean, successAlert = false) {
  const facts: Array<[string, string]> = [];
  if (objectType === 'PLAN') {
    if (successAlert) facts.push(['计划', previewMessage.plan], ['计划类型', '实时计划'], ['执行结果', '今日应执行 48 次，成功 48 次']);
    else facts.push(['计划', planFailureExamples[0].name], ['计划类型', `${planFailureExamples[0].planType}计划`]);
  }
  if (objectType === 'STORE') facts.push(['店铺', previewMessage.store], ['关联计划', previewMessage.plan]);
  if (objectType === 'DATA_TABLE') facts.push(['数据表', previewMessage.table], ['店铺', previewMessage.store], ['关联计划', previewMessage.plan]);
  if (includeFailureStage) facts.push(['失败阶段', objectType === 'PLAN' ? planFailureExamples[0].stage : previewMessage.stage]);
  return facts;
}

function PreviewFacts({ objectType, includeFailureStage = true, successAlert = false, channel }: { objectType: Exclude<PreviewObjectType, 'MONITOR_VIEW'>; includeFailureStage?: boolean; successAlert?: boolean; channel: PushChannelType }) {
  if (channel !== 'FEISHU') return <div className={styles.plainFacts}>{getPreviewFacts(objectType, includeFailureStage, successAlert).map(([label, value]) => (
    <p key={label}>{channel === 'DINGTALK' ? <strong>{label}：</strong> : <span>{label}：</span>}{value}</p>
  ))}</div>;
  return (
    <dl className={styles.previewFacts}>
      {getPreviewFacts(objectType, includeFailureStage, successAlert).map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}


function getIssueExamples(objectType: Exclude<PreviewObjectType, 'MONITOR_VIEW'>) {
  if (objectType === 'STORE') {
    return [
      [previewMessage.store, `${previewMessage.plan} · ${previewMessage.stage} · ${previewMessage.reason}`],
      ['海雅京东自营店', `京东销售日报 · ${planFailureExamples[1].stage} · ${formatPlanFailureReason(planFailureExamples[1])}`],
      ['海雅天猫专营店', `${planFailureExamples[0].name} · ${planFailureExamples[0].stage} · ${formatPlanFailureReason(planFailureExamples[0])}`],
      ['海雅拼多多旗舰店', '拼多多商品日报 · 入库失败：目标数据库连接失败'],
      ['海雅唯品会旗舰店', '唯品会销售日报 · 入库校验失败：近 1 天数据缺失'],
    ];
  }
  if (objectType === 'DATA_TABLE') {
    return [
      [previewMessage.table, `${previewMessage.store} · ${previewMessage.plan} · ${previewMessage.stage} · ${previewMessage.reason}`],
      ['生意参谋商品日报', '海雅天猫旗舰店 · 海雅生意参谋商品日报 · 入库失败：目标表写入失败，字段 amount 的值无法转换为目标字段的数值类型'],
    ];
  }
  return planFailureExamples.map((failure) => [failure.name, `${failure.planType}计划 · ${failure.stage} · ${formatPlanFailureReason(failure)}`]);
}

type BusinessObjectType = Exclude<PreviewObjectType, 'MONITOR_VIEW'>;
type MessagePreviewProps = { kind: PreviewMessageKind; objectType: BusinessObjectType; annotated?: boolean };

function getPreviewTimeLabel(kind: PreviewMessageKind) {
  return kind === 'SUCCESS_ALERT' ? '完成时间' : kind === 'EXCEPTION_ALERT' ? '发生时间' : '截止时间';
}

function getSummaryGroups(kind: PreviewMessageKind, objectType: BusinessObjectType) {
  if (kind === 'PROGRESS') {
    return objectType === 'PLAN'
      ? planProgressSections.map(({ title, metrics }) => ({ title, metrics: metrics.map(([label, value]) => ({ label, value })) }))
      : [{ title: '', metrics: previewMetrics[objectType] }];
  }
  return [{
    title: '',
    metrics: objectType === 'PLAN'
      ? (['日常', '实时', '回溯'] as const).map((type) => ({ label: `${type}异常计划`, value: planFailureExamples.filter((failure) => failure.planType === type).length }))
      : [{ label: `异常${previewObjectMeta[objectType].label}`, value: getIssueExamples(objectType).length }],
  }];
}

const previewMonitorViews = [
  { id: 'view-1', name: '全量店铺数据交付监控', startTime: '2026-09-02 00:00:00', imagePrefix: 'monitor' },
  { id: 'view-2', name: '商品货款交付监控', startTime: '2026-09-02 00:00:00', imagePrefix: 'monitor-settlement' },
];

function getPreviewMessageModel(kind: PreviewMessageKind, objectType: PreviewObjectType): MessageModel {
  const monitor = objectType === 'MONITOR_VIEW';
  const summary = kind === 'PROGRESS' || kind === 'EXCEPTION_SUMMARY';
  return {
    title: getPreviewTitle(kind, objectType),
    time: `${getPreviewTimeLabel(kind)} ${monitor ? '2026-09-03 15:00:00' : previewMessage.time}`,
    strategy: getPreviewStrategy(kind, objectType),
    tone: previewTone[kind],
    groups: !monitor && summary ? getSummaryGroups(kind, objectType) : [],
    facts: monitor ? []
      : summary ? [] : getPreviewFacts(objectType, kind === 'EXCEPTION_ALERT', kind === 'SUCCESS_ALERT'),
    issues: !monitor && summary ? getIssueExamples(objectType) : [],
    failure: !monitor && kind === 'EXCEPTION_ALERT' ? getPreviewFailureReason(objectType) : undefined,
    monitor,
    monitorViews: monitor ? previewMonitorViews : undefined,
  };
}

function SummaryStatistics({ channel, kind, objectType, annotated = true }: MessagePreviewProps & { channel: PushChannelType; annotated?: boolean }) {
  return (
    <div className={styles.summaryStatistics} data-section="statistics" data-note-id={annotated ? 'PS-2.2' : undefined}>
      {getSummaryGroups(kind, objectType).map((group, index) => (
        <section key={group.title || index}>
          {group.title && <strong className={styles.summaryGroupTitle}>{group.title}</strong>}
          {channel === 'FEISHU' ? (
            <div className={[styles.previewMetrics, kind === 'EXCEPTION_SUMMARY' && objectType === 'PLAN' ? styles.planExceptionMetrics : ''].join(' ')} data-feishu-component="column_set">
              {group.metrics.map(({ label, value }) => (
                <div key={label} data-tone={kind === 'EXCEPTION_SUMMARY' || label === '失败' || label === '存在异常' ? 'danger' : label === '成功' || label === '全部完成' ? 'success' : label === '运行中' ? 'warning' : undefined}>
                  <span>{label}</span><strong>{value}</strong>
                </div>
              ))}
            </div>
          ) : <p className={channel === 'WECOM' && kind === 'EXCEPTION_SUMMARY' ? styles.plainExceptionMetrics : undefined}>{group.metrics.map(({ label, value }, metricIndex) => (
            <span key={label}>{metricIndex > 0 && !(channel === 'WECOM' && kind === 'EXCEPTION_SUMMARY') && ' · '}{channel === 'DINGTALK' && (label === '失败' || label === '成功' || kind === 'EXCEPTION_SUMMARY') ? <strong>{label} {value}</strong> : `${label} ${value}`}</span>
          ))}</p>}
        </section>
      ))}
    </div>
  );
}

function PreviewIssueList({ objectType, channel = 'FEISHU', annotated = true }: { objectType: BusinessObjectType; channel?: PushChannelType; annotated?: boolean }) {
  const examples = getIssueExamples(objectType);
  return (
    <section className={channel === 'FEISHU' ? styles.previewIssueSection : styles.plainIssueSection} data-section="issues" data-note-id={annotated ? 'PS-2.3' : undefined}>
      <div className={styles.previewIssueTitle}><strong>异常列表</strong></div>
      {examples.map(([title, description], index) => (
        <div className={styles.previewIssueItem} key={title}>
          <span className={styles.issueIndex}>{index + 1}{channel !== 'FEISHU' && '.'}</span>
          <div><strong>{title}</strong><span>{description}</span></div>
        </div>
      ))}
    </section>
  );
}

// Content order and business fields are shared; only the channel treatment changes.
function SharedMessageBody({ kind, objectType, channel, annotated = true }: MessagePreviewProps & { channel: PushChannelType }) {
  const summary = kind === 'PROGRESS' || kind === 'EXCEPTION_SUMMARY';
  const body = summary ? (
    <>
      <SummaryStatistics kind={kind} objectType={objectType} channel={channel} annotated={annotated} />
      <PreviewIssueList objectType={objectType} channel={channel} annotated={annotated} />
    </>
  ) : (
    <>
      <PreviewFacts objectType={objectType} includeFailureStage={kind === 'EXCEPTION_ALERT'} successAlert={kind === 'SUCCESS_ALERT'} channel={channel} />
      {kind === 'EXCEPTION_ALERT' && <div className={styles.errorPanel}><span>失败原因</span><strong>{getPreviewFailureReason(objectType)}</strong></div>}
    </>
  );
  return (
    <div className={styles.unifiedMessageBody} data-channel={channel}>
      <div data-wecom-field={channel === 'WECOM' ? 'sub_title_text' : undefined}>{body}</div>
      <div className={styles.messageStrategy} data-section="strategy" data-wecom-field={channel === 'WECOM' ? 'horizontal_content_list' : undefined}>
        <span>策略名称</span><span>{getPreviewStrategy(kind, objectType)}</span>
      </div>
    </div>
  );
}

function MessageCard({ kind, objectType, channel, children, annotated = true, portalTarget }: { kind: PreviewMessageKind; objectType: PreviewObjectType; channel: PushChannelType; children: ReactNode; annotated?: boolean; portalTarget?: MessageSnapshot['target'] }) {
  const [portal, setPortal] = useState(false);
  const model = getPreviewMessageModel(kind, objectType);
  const wecomMarkdown = channel === 'WECOM' && objectType === 'MONITOR_VIEW';
  const header = channel === 'FEISHU' ? styles.feishuHeader : styles.messagePlainHeader;
  const action = channel === 'FEISHU' ? styles.feishuAction : channel === 'WECOM' ? styles.wecomAction : styles.dingTalkAction;
  return (
    <><div className={styles.nativeCard} data-channel={channel} data-tone={previewTone[kind]} data-template={channel === 'FEISHU' ? 'interactive' : channel === 'WECOM' ? wecomMarkdown ? 'markdown_v2' : 'text_notice' : 'actionCard'}>
      <div className={header} data-note-id={annotated ? 'PS-2.1' : undefined} data-section="header" data-wecom-field={channel === 'WECOM' && !wecomMarkdown ? 'main_title' : undefined}>
        <div><strong>{model.title}</strong><span>{model.time}</span></div>
      </div>
      {children !== null && <div className={styles.nativeCardBody}>{children}</div>}
      <button className={action} data-note-id={annotated ? 'PS-2.5' : undefined} type="button" data-section="action" onClick={() => portalTarget ? setPortal(true) : Message.info('模板示例未关联策略，请在策略消息预览中查看对应对象')}>
        前往门户{channel !== 'DINGTALK' && !wecomMarkdown && <span>→</span>}
      </button>
    </div>{portal && portalTarget && <PortalDestination target={portalTarget} onClose={() => setPortal(false)} />}</>
  );
}

// Annotation examples reuse the preview renderers, but must never become locate targets.
export function PushMessageAnnotationExample({ section, channel, kind }: { section: string; channel: PushChannelType; kind: 'PROGRESS' | 'EXCEPTION_SUMMARY' }) {
  if (section === 'issues' || section === 'statistics') return <div className={styles.unifiedMessageBody} data-channel={channel}>
    {section === 'issues' ? <PreviewIssueList objectType="PLAN" channel={channel} annotated={false} /> : <SummaryStatistics objectType="PLAN" channel={channel} kind={kind} annotated={false} />}
  </div>;
  return <MessageCard objectType="PLAN" channel={channel} kind={kind} annotated={false}>{null}</MessageCard>;
}

function FeishuMessageBody(props: MessagePreviewProps) { return <SharedMessageBody {...props} channel="FEISHU" />; }
function WeComContent(props: MessagePreviewProps) { return <SharedMessageBody {...props} channel="WECOM" />; }
function DingTalkMarkdown(props: MessagePreviewProps) { return <SharedMessageBody {...props} channel="DINGTALK" />; }
function FeishuMessagePreview(props: MessagePreviewProps) { return <MessageCard {...props} channel="FEISHU"><FeishuMessageBody {...props} /></MessageCard>; }
function WeComMessagePreview(props: MessagePreviewProps) { return <MessageCard {...props} channel="WECOM"><WeComContent {...props} /></MessageCard>; }
function DingTalkMessagePreview(props: MessagePreviewProps) { return <MessageCard {...props} channel="DINGTALK"><DingTalkMarkdown {...props} /></MessageCard>; }

function MonitorSnapshot({ kind, imagePrefix = 'monitor', name }: { kind: 'PROGRESS' | 'EXCEPTION_SUMMARY'; imagePrefix?: string; name?: string }) {
  const [failed, setFailed] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const src = `/push-message-preview/${imagePrefix}-${kind === 'EXCEPTION_SUMMARY' ? 'exception' : 'progress'}.png`;
  const alt = `${name ?? '数据监控'}${kind === 'EXCEPTION_SUMMARY' ? '异常视图' : '完整视图'}`;
  useEffect(() => { setFailed(false); setPreviewVisible(false); }, [kind, imagePrefix]);
  return (
    <div className={styles.monitorSnapshot}>
      {failed ? <span className={styles.snapshotError}>看板图片加载失败</span> : <>
        <button className={styles.snapshotButton} type="button" aria-label={`放大查看${alt}`} onClick={() => setPreviewVisible(true)}>
          <img src={src} alt={alt} onError={() => { setFailed(true); setPreviewVisible(false); }} />
        </button>
        <Image.Preview src={src} visible={previewVisible} onVisibleChange={setPreviewVisible} imgAttributes={{ alt }} actionsLayout={['zoomIn', 'zoomOut', 'originalSize']} />
      </>}
    </div>
  );
}

function MonitorViewPreview({ channel, kind, annotated = true, views = previewMonitorViews }: { channel: PushChannelType; kind: 'PROGRESS' | 'EXCEPTION_SUMMARY'; annotated?: boolean; views?: typeof previewMonitorViews }) {
  const model = getPreviewMessageModel(kind, 'MONITOR_VIEW');
  if (!views.length) return <Empty description="请选择关联数据监控视图" />;
  return (
    <div className={styles.monitorMessages} data-note-id={annotated ? 'PS-2.4' : undefined}>
    <MessageCard kind={kind} objectType="MONITOR_VIEW" channel={channel} annotated={annotated} portalTarget={{ type: 'MONITOR_VIEW', ids: views.map(v => v.id), names: views.map(v => v.name), businessDate: '2026-09-02', exceptionsOnly: kind === 'EXCEPTION_SUMMARY', single: views.length === 1 }}>
      <div className={styles.unifiedMessageBody} data-channel={channel}>
        {views.map((view) => <section key={view.id} className={styles.monitorViewSection} data-monitor-view={view.id}>
          <div className={styles.monitorContext}><strong>{view.name}</strong><span>业务日期：{view.startTime.slice(0, 10)}</span></div>
          <MonitorSnapshot kind={kind} imagePrefix={view.imagePrefix} name={view.name} />
        </section>)}
        <div className={styles.messageStrategy} data-section="strategy"><span>策略名称</span><span>{model.strategy}</span></div>
      </div>
    </MessageCard>
    </div>
  );
}

type AnnotationRequest = { event: string } | null;

export function PushMessagePreview({ visible = true, annotationRequest, annotated = true }: { visible?: boolean; annotationRequest?: AnnotationRequest; annotated?: boolean }) {
  const [pushMode, setPushMode] = useState<PreviewPushMode>('SCHEDULED');
  const [objectType, setObjectType] = useState<PreviewObjectType>('PLAN');
  const [kind, setKind] = useState<PreviewMessageKind>('PROGRESS');
  const [channel, setChannel] = useState<PushChannelType>('FEISHU');
  const [monitorScope, setMonitorScope] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [monitorViewIds, setMonitorViewIds] = useState<string[]>(previewMonitorViews.map(view => view.id));
  useEffect(() => {
    if (!annotationRequest || !['push-strategy:show-preview', 'push-strategy:show-monitor'].includes(annotationRequest.event)) return;
    const monitor = annotationRequest.event === 'push-strategy:show-monitor';
    setPushMode('SCHEDULED');
    setObjectType(monitor ? 'MONITOR_VIEW' : 'PLAN');
    setKind('PROGRESS');
    setChannel(monitor ? 'WECOM' : 'FEISHU');
  }, [annotationRequest]);
  const channelLabel = channelTypeMeta[channel].label;
  const sceneRef = useRef<HTMLDivElement>(null);
  useEffect(() => { sceneRef.current?.scrollTo({ top: 0 }); }, [visible, kind, objectType, channel, monitorScope, monitorViewIds]);

  const changePushMode = (nextMode: PreviewPushMode) => {
    setPushMode(nextMode);
    if (nextMode === 'REALTIME' && objectType === 'MONITOR_VIEW') setObjectType('PLAN');
    setKind(nextMode === 'SCHEDULED' ? 'PROGRESS' : 'EXCEPTION_ALERT');
  };

  const changeObjectType = (nextObjectType: PreviewObjectType) => {
    setObjectType(nextObjectType);
    if (nextObjectType === 'MONITOR_VIEW') setKind('PROGRESS');
  };

  const monitorKind = kind === 'EXCEPTION_SUMMARY' ? 'EXCEPTION_SUMMARY' : 'PROGRESS';
  const businessObjectType = objectType === 'MONITOR_VIEW' ? 'PLAN' : objectType;

  return (
    <>
      <div className={styles.previewToolbar}>
        <div className={styles.previewControlRow}>
          <span>推送方式</span>
          <Radio.Group type="button" value={pushMode} onChange={changePushMode}>
            <Radio value="SCHEDULED">定时推送</Radio>
            <Radio value="REALTIME">实时推送</Radio>
          </Radio.Group>
        </div>
        <div className={styles.previewControlRow}>
          <span data-note-id={annotated ? 'PS-2' : undefined}>内容类型</span>
          <Radio.Group type="button" value={objectType} onChange={changeObjectType}>
            <Radio value="PLAN">计划</Radio>
            <Radio value="STORE">店铺</Radio>
            <Radio value="DATA_TABLE">数据表</Radio>
            {pushMode === 'SCHEDULED' ? <Radio value="MONITOR_VIEW">数据监控视图</Radio> : null}
          </Radio.Group>
        </div>
        <div className={styles.previewControlRow}>
          <span>消息类型</span>
          <Radio.Group type="button" value={kind} onChange={setKind}>
            {pushMode === 'SCHEDULED' ? (
              <>
                <Radio value="PROGRESS">进度汇总</Radio>
                <Radio value="EXCEPTION_SUMMARY">异常汇总</Radio>
              </>
            ) : (
              <>
                <Radio value="EXCEPTION_ALERT">异常提醒</Radio>
                <Radio value="SUCCESS_ALERT">成功提醒</Radio>
              </>
            )}
          </Radio.Group>
        </div>
        <div className={styles.previewControlRow}>
          <span>推送渠道</span>
          <Radio.Group type="button" value={channel} onChange={setChannel}>
            <Radio value="FEISHU"><ChannelTypeTag type="FEISHU" /></Radio>
            <Radio value="WECOM"><ChannelTypeTag type="WECOM" /></Radio>
            <Radio value="DINGTALK"><ChannelTypeTag type="DINGTALK" /></Radio>
          </Radio.Group>
        </div>
        {objectType === 'MONITOR_VIEW' && <>
          <div className={styles.previewControlRow}>
            <span>关联范围</span>
            <Radio.Group type="button" value={monitorScope} onChange={setMonitorScope}>
              <Radio value="ALL">全部</Radio><Radio value="CUSTOM">自定义</Radio>
            </Radio.Group>
          </div>
          {monitorScope === 'CUSTOM' && <div className={styles.previewControlRow}>
            <span>关联视图</span>
            <Select mode="multiple" aria-label="关联视图" placeholder="请选择关联数据监控视图" value={monitorViewIds} onChange={setMonitorViewIds}
              options={previewMonitorViews.map(view => ({ label: view.name, value: view.id }))} />
          </div>}
        </>}
      </div>
      <div className={styles.messageScene} data-channel={channelLabel} ref={sceneRef}>
        <div className={styles.botRow}>
          <div className={`${styles.botAvatar} ${styles[`botAvatar${channel}`]}`}>
            {channel === 'DINGTALK' ? <DingTalkLogo /> : channel === 'FEISHU' ? <IconLarkColor /> : <IconWechat />}
          </div>
          <div className={styles.messageColumn}>
            <div className={styles.botMeta}>取数宝消息机器人 <span>{previewMessage.time.slice(11, 16)}</span></div>
            {objectType === 'MONITOR_VIEW' ? (
              <MonitorViewPreview channel={channel} kind={monitorKind} annotated={annotated} views={previewMonitorViews.filter(view => monitorScope === 'ALL' || monitorViewIds.includes(view.id))} />
            ) : channel === 'FEISHU' ? (
              <FeishuMessagePreview kind={kind} objectType={businessObjectType} annotated={annotated} />
            ) : channel === 'WECOM' ? (
              <WeComMessagePreview kind={kind} objectType={businessObjectType} annotated={annotated} />
            ) : (
              <DingTalkMessagePreview kind={kind} objectType={businessObjectType} annotated={annotated} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function MessagePreviewModal({ visible, onClose, annotationRequest }: { visible: boolean; onClose: () => void; annotationRequest?: AnnotationRequest }) {
  return (
    <Modal
      className={styles.messagePreviewModal}
      alignCenter={false}
      style={{ top: 48 }}
      visible={visible}
      title="消息效果预览"
      footer={<Button type="primary" onClick={onClose}>关闭</Button>}
      onCancel={onClose}
    >
      <PushMessagePreview visible={visible} annotationRequest={annotationRequest} />
    </Modal>
  );
}

function StrategyConfig({ annotationRequest }: { annotationRequest: AnnotationRequest }) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<PushStrategy[]>([]);
  const [channels, setChannels] = useState<PushChannel[]>([]);
  const [objects, setObjects] = useState<RelatedObjectOption[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [strategyCount, setStrategyCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<{ name: string; status?: EnabledStatus }>({ name: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [draft, setDraft] = useState<StrategyDraft>(defaultStrategyDraft());
  const [previewDraft, setPreviewDraft] = useState<StrategyDraft>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [productError, setProductError] = useState('');
  const [objectError, setObjectError] = useState('');
  const [objectsLoading, setObjectsLoading] = useState(false);
  const objectRequest = useRef(0);
  const reloadProducts = useCallback(async () => {
    try { const values = await listAuthorizedProductCategories(); setProductCategories(values); setProductError(''); }
    catch { setProductError('产品查询失败'); }
  }, []);
  const reloadObjects = useCallback(async (product: string) => {
    const request = ++objectRequest.current;
    setObjectsLoading(true); setObjects([]);
    try { const values = await listRelatedObjects(product === '全部产品' ? undefined : product); if (request === objectRequest.current) { setObjects(values); setObjectError(''); } }
    catch { if (request === objectRequest.current) setObjectError('关联对象查询失败'); }
    finally { if (request === objectRequest.current) setObjectsLoading(false); }
  }, []);
  useEffect(() => { if (drawerVisible) void reloadObjects(draft.productCategory); }, [drawerVisible, draft.productCategory, reloadObjects]);

  useEffect(() => {
    if (!annotationRequest) return;
    setDrawerVisible(annotationRequest.event === 'push-strategy:show-editor');
    setPreviewVisible(['push-strategy:show-preview', 'push-strategy:show-monitor'].includes(annotationRequest.event));
    if (annotationRequest.event === 'push-strategy:show-invalid-strategy') {
      setFilters({ name: '' });
      setAppliedFilters({ name: '' });
      setPage(1);
    }
    // Annotation navigation must not replace an unsaved strategy draft.
  }, [annotationRequest]);

  const load = useCallback(async () => {
    setLoading(true);
    const [result, allResult, channelList] = await Promise.all([
      queryStrategies({ ...appliedFilters, page, pageSize }),
      queryStrategies({ page: 1, pageSize: 100 }),
      listChannels(),
      reloadProducts(),
    ]);
    setRecords(result.list);
    setTotal(result.total);
    setStrategyCount(allResult.list.filter((item) => !item.systemStrategy).length);
    setChannels(channelList);
    setLoading(false);
  }, [appliedFilters, page, pageSize, reloadProducts]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener('push-strategy:channels-changed', refresh);
    return () => window.removeEventListener('push-strategy:channels-changed', refresh);
  }, [load]);

  const openDrawer = async (record?: PushStrategy) => {
    if (record?.productInvalid) {
      Message.warning(invalidProductTooltip);
      return;
    }
    if (!record && strategyCount >= 30) {
      Message.warning('最多可创建 30 条策略，请删除不需要的策略后重试');
      return;
    }
    const detail = record ? await getStrategyDetail(record.id) : undefined;
    setSaveError('');
    setDraft(detail || defaultStrategyDraft());
    setDrawerVisible(true);
  };

  const currentObjects = candidates(draft, objects);
  const invalidSelected = currentObjects.filter((item) => item.invalid && draft.relatedObjectIds.includes(item.id));
  const enabledChannels = channels.filter((item) => item.status === 'ENABLED' || draft.channelIds.includes(item.id));

  const treeData = useMemo(() => {
    const groups = new Map<string, RelatedObjectOption[]>();
    currentObjects.forEach((item) => groups.set(item.group, [...(groups.get(item.group) || []), item]));
    const missing = draft.relatedObjectIds.filter(id => !currentObjects.some(item => item.id === id));
    const retained = missing.map(id => ({ key: id, value: id, title: draft.relatedObjectNames?.[id] || '已失效对象', disabled: true }));
    return [...retained, ...Array.from(groups.entries()).map(([group, children]) => ({
      key: `group-${group}`,
      value: `group-${group}`,
      title: group,
      selectable: false,
      children: children.map((item) => ({
        key: item.id,
        value: item.id,
        title: item.name,
        disabled: item.disabled,
      })),
    }))];
  }, [currentObjects, draft.relatedObjectIds, draft.relatedObjectNames]);

  const doSave = async () => {
    if (saving || productError || objectError || objectsLoading) return;
    if (!draft.name.trim()) {
      Message.warning('请输入策略名称');
      return;
    }
    if (!draft.systemStrategy && (!productCategories.length || draft.productInvalid)) {
      Message.warning(draft.productInvalid ? '该产品类别已失效，策略仅支持删除' : '暂无可用产品，无法保存策略');
      return;
    }
    if (draft.relatedMode === 'CUSTOM' && !draft.relatedObjectIds.length) {
      Message.warning('请选择关联对象');
      return;
    }
    if (!draft.channelIds.length) {
      Message.warning('请选择至少一个推送渠道');
      return;
    }
    if (draft.pushMode === 'SCHEDULED') {
      const scheduleError = validateTimeRanges(draft.schedule);
      if (scheduleError) {
        Message.error(scheduleError);
        return;
      }
    }
    setSaving(true); setSaveError('');
    try {
      await saveStrategy({ ...draft, name: draft.name.trim() });
      Message.success(draft.id ? '策略已更新' : '策略已新增');
      setDrawerVisible(false);
      await load();
    } catch (error) { setSaveError(error instanceof Error ? error.message : '保存失败，请稍后重试'); }
    finally { setSaving(false); }
  };

  const confirmStatus = async (record: PushStrategy, checked: boolean) => {
    if (checked && record.productInvalid) {
      Message.warning(invalidProductTooltip);
      return;
    }
    const apply = async () => {
      try { await updateStrategyStatus(record.id, checked ? 'ENABLED' : 'DISABLED'); Message.success(checked ? '策略已启用' : '策略已停用'); await load(); }
      catch (error) { Message.error(error instanceof Error ? error.message : '操作失败'); }
    };
    if (checked) {
      await apply();
      return;
    }
    Modal.confirm({
      title: '停用策略',
      content: '停用后将不再产生新的推送，是否停用？',
      onOk: async () => {
        await apply();
      },
    });
  };

  const baseColumns: ResizableColumn<PushStrategy>[] = [
    {
      title: '策略名称',
      dataIndex: 'name',
      resizeKey: 'name',
      width: 170,
      minWidth: 140,
      fixed: 'left',
      render: (name: string, record) => (
        <Space size={6}>
          <span>{name}</span>
          {record.systemStrategy ? <Tag color="arcoblue">系统</Tag> : null}
        </Space>
      ),
    },
    {
      title: '产品类别', dataIndex: 'productCategory', resizeKey: 'productCategory', width: 140,
    },
    {
      title: '推送方式', dataIndex: 'pushMode', resizeKey: 'pushMode', width: 100,
      render: (value) => pushModeMeta[value],
    },
    {
      title: '消息类型',
      dataIndex: 'messageType',
      resizeKey: 'messageType',
      width: 110,
      render: (value) => messageTypeMeta[value],
    },
    {
      title: '关联对象',
      resizeKey: 'relatedObject',
      width: 150,
      minWidth: 120,
      render: (_value, record) => (
        <span>{relatedTypeMeta[record.relatedObjectType]} · {record.relatedMode === 'ALL' ? '全部' : `${record.relatedObjectIds.length} 个`}</span>
      ),
    },
    {
      title: '推送时间',
      resizeKey: 'schedule',
      width: 200,
      minWidth: 160,
      render: (_value, record) => (
        record.pushMode === 'REALTIME' ? <span>触发即推送</span> : <span>
          {cycleMeta[record.schedule.cycle]}
          {record.schedule.cycle === 'WEEK' ? `（${record.schedule.weekDays.map((day) => `周${weekOptions[day - 1].label.slice(1)}`).join('、')}）` : ''}
          {record.schedule.cycle === 'MONTH' ? `（${formatMonthDays(record.schedule.monthDays)}）` : ''}
          {' '}{record.schedule.timeRanges.map((item) => item.time).join('，')}
        </span>
      ),
    },
    {
      title: '推送渠道',
      resizeKey: 'channel',
      width: 150,
      minWidth: 120,
      render: (_value, record) => record.channelIds.map((id) => channels.find((item) => item.id === id)?.name || '已删除渠道').join('、'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      resizeKey: 'status',
      width: 80,
      render: (status: EnabledStatus, record) => (
        <Space direction="vertical" size={4}><Switch checked={status === 'ENABLED'} disabled={record.productInvalid || Boolean(record.autoStopReasons?.length)} onChange={(checked) => void confirmStatus(record, checked)} />
          {!record.productInvalid && record.unavailableReason && <Text type="secondary" style={{ fontSize: 12 }}>{record.unavailableReason}</Text>}</Space>
      ),
    },
    {
      title: '操作',
      resizeKey: 'action',
      width: 190,
      minWidth: 180,
      fixed: 'right',
      align: 'left',
      render: (_value, record) => (
        <Space>
          <Button className={styles.actionButton} type="text" size="small" disabled={record.productInvalid} onClick={() => setPreviewDraft(record)}>预览</Button>
          <Button className={styles.actionButton} type="text" size="small" icon={<IconEdit />} disabled={record.productInvalid} onClick={() => void openDrawer(record)}>编辑</Button>
          <Button
            className={styles.actionButton}
            type="text"
            size="small"
            status="danger"
            icon={<IconDelete />}
            disabled={record.systemStrategy}
            onClick={() => Modal.confirm({
              title: '删除策略',
              content: '删除后该策略将停止推送且无法恢复，历史记录仍保留。是否删除？',
              okButtonProps: { status: 'danger' },
              onOk: async () => {
                await deleteStrategy(record.id);
                Message.success('策略已删除');
                await load();
              },
            })}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];
  const { columns, scroll, tableAreaRef } = useResizableTable(baseColumns);

  return (
    <div className={styles.tabPage}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Input
            className={styles.keywordInput}
            allowClear
            value={filters.name}
            placeholder="请输入策略名称"
            onChange={(name) => {
              const next = { ...filters, name };
              setFilters(next);
              setAppliedFilters(next);
              setPage(1);
            }}
          />
          <Select
            className={styles.filterSelect}
            allowClear
            value={filters.status}
            placeholder="启用状态"
            options={Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))}
            onChange={(status) => {
              const next = { ...filters, status };
              setFilters(next);
              setAppliedFilters(next);
              setPage(1);
            }}
          />
        </div>
        <Space>
          <Button type="outline" icon={<IconEye />} onClick={() => setPreviewVisible(true)}>消息效果预览</Button>
          <Button type="primary" icon={<IconPlus />} disabled={strategyCount >= 30} onClick={() => void openDrawer()}>新增策略</Button>
        </Space>
      </div>
      <div className={styles.tableArea} ref={tableAreaRef}>
        <Spin loading={loading}>
          <Table
            rowKey="id"
            columns={columns}
            data={records}
            pagination={false}
            scroll={scroll}
            noDataElement={<Empty description="暂无推送策略" />}
            rowClassName={(record) => record.productInvalid ? styles.invalidStrategyRow : ''}
            components={{ header: { th: ResizableHeaderCell }, body: { row: StrategyTableRow } }}
          />
        </Spin>
      </div>
      <PageFooter total={total} page={page} pageSize={pageSize} onChange={(nextPage, nextSize) => {
        setPage(nextPage);
        setPageSize(nextSize);
      }} />
      <Drawer
        className={styles.pushDrawer}
        width={620}
        visible={drawerVisible}
        title={draft.id ? '编辑推送策略' : '新增推送策略'}
        onCancel={() => setDrawerVisible(false)}
        footer={(
          <Space>
            <Button disabled={saving} onClick={() => setDrawerVisible(false)}>取消</Button>
            {!draft.systemStrategy && <Button disabled={Boolean(productError || objectError) || objectsLoading} onClick={() => setPreviewDraft({ ...draft })}>消息预览</Button>}
            <Button data-note-id="PS-1.6" type="primary" loading={saving} disabled={Boolean(productError || objectError) || objectsLoading || (!draft.systemStrategy && !productCategories.length)} onClick={() => void doSave()}>保存</Button>
          </Space>
        )}
      >
        {draft.systemStrategy ? (
          <Alert type="info" content="“账号登录异常”为系统策略，推送方式、消息类型和关联范围不可修改，也不可删除。" />
        ) : null}
        {invalidSelected.length ? (
          <Alert
            type="warning"
            content={`历史策略中包含已失效对象：${invalidSelected.map((item) => item.name).join('、')}。保存时可保留，重新选择时不可新增。`}
          />
        ) : null}
        {saveError && !saveError.includes('策略名称') && <FieldFeedback message={saveError} retryLabel="重试" onRetry={saving ? undefined : () => void doSave()} />}
        <Form layout="vertical" className={styles.strategyForm}>
          <Form.Item label="策略名称" required>
            <Input
              value={draft.name}
              maxLength={30}
              showWordLimit
              disabled={draft.systemStrategy}
              placeholder="请输入策略名称"
              onChange={(name) => { setDraft({ ...draft, name }); if (saveError.includes('策略名称')) setSaveError(''); }}
            />
            {saveError.includes('策略名称') && <FieldFeedback message={saveError} />}
          </Form.Item>
          <Form.Item label={<span data-note-id="PS-1.1">产品类别</span>} required>
            <Select
              value={draft.productCategory}
              disabled={draft.systemStrategy || Boolean(productError)}
              placeholder={productError || productCategories.length ? '请选择产品类别' : '暂无可用产品'}
              options={[
                ...productCategories.map((value) => ({ label: value, value })),
              ]}
              onChange={(productCategory) => setDraft({ ...draft, productCategory, productInvalid: false, relatedObjectIds: [], autoStopReasons: [] })}
            />
            {productError && <FieldFeedback message={productError} onRetry={() => { clearQueryFailure('products'); void reloadProducts(); }} />}
          </Form.Item>
          <Form.Item label={<span data-note-id={draft.pushMode === 'REALTIME' ? 'PS-1.4' : undefined}><span data-note-id="PS-1.2">推送方式</span></span>} required>
            <Radio.Group
              value={draft.pushMode}
              disabled={draft.systemStrategy}
              onChange={(pushMode) => setDraft({
                ...draft,
                pushMode,
                messageType: pushMode === 'SCHEDULED' ? 'PROGRESS' : 'EXCEPTION_ALERT',
                relatedObjectType: pushMode === 'REALTIME' && draft.relatedObjectType === 'MONITOR_VIEW' ? 'TASK' : draft.relatedObjectType,
                relatedObjectIds: pushMode === 'REALTIME' && draft.relatedObjectType === 'MONITOR_VIEW' ? [] : draft.relatedObjectIds,
              })}
            >
              <Radio value="SCHEDULED">定时推送</Radio>
              <Radio value="REALTIME">实时推送</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="内容类型" required>
            <Radio.Group
              value={draft.relatedObjectType}
              disabled={draft.systemStrategy}
              onChange={(relatedObjectType) => setDraft({ ...draft, relatedObjectType, relatedObjectIds: [] })}
            >
              {Object.entries(relatedTypeMeta)
                .filter(([value]) => draft.pushMode === 'SCHEDULED' || value !== 'MONITOR_VIEW')
                .map(([value, label]) => <Radio key={value} value={value}>{label}</Radio>)}
            </Radio.Group>
          </Form.Item>
          <Form.Item label="消息类型" required>
            <Radio.Group
              value={draft.messageType}
              disabled={draft.systemStrategy}
              onChange={(messageType) => setDraft({ ...draft, messageType })}
            >
              {draft.systemStrategy ? <Radio value="LOGIN_EXCEPTION">账号登录异常</Radio> : draft.pushMode === 'SCHEDULED' ? (
                <><Radio value="PROGRESS">进度汇总</Radio><Radio value="EXCEPTION_SUMMARY">异常汇总</Radio></>
              ) : (
                <><Radio value="EXCEPTION_ALERT">异常提醒</Radio><Radio value="SUCCESS_ALERT">成功提醒</Radio></>
              )}
            </Radio.Group>
          </Form.Item>
          <Form.Item label={<span data-note-id="PS-1.3">关联范围</span>} required>
            <Radio.Group
              value={draft.relatedMode}
              disabled={draft.systemStrategy}
              onChange={(relatedMode) => setDraft({ ...draft, relatedMode, relatedObjectIds: relatedMode === 'ALL' ? [] : draft.relatedObjectIds })}
            >
              <Radio value="ALL">全部</Radio>
              <Radio value="CUSTOM">自定义</Radio>
            </Radio.Group>
          </Form.Item>
          {draft.relatedMode === 'CUSTOM' ? (
            <Form.Item label={draft.relatedObjectType === 'MONITOR_VIEW' ? '关联数据监控视图' : '选择关联对象'} required>
              <TreeSelect
                multiple
                treeCheckable
                treeCheckStrictly
                allowClear
                value={draft.relatedObjectIds}
                treeData={treeData}
                disabled={draft.systemStrategy || objectsLoading || Boolean(objectError)}
                placeholder={draft.relatedObjectType === 'MONITOR_VIEW' ? '请选择关联数据监控视图' : `请选择${relatedTypeMeta[draft.relatedObjectType]}`}
                onChange={(relatedObjectIds) => setDraft({ ...draft, relatedObjectIds: relatedObjectIds as string[] })}
              />
              {objectError && <FieldFeedback message={objectError} onRetry={() => { clearQueryFailure('objects'); void reloadObjects(draft.productCategory); }} />}
            </Form.Item>
          ) : null}
          {draft.relatedMode === 'ALL' && objectError && <FieldFeedback message={objectError} onRetry={() => { clearQueryFailure('objects'); void reloadObjects(draft.productCategory); }} />}
          {draft.pushMode === 'SCHEDULED' ? (
            <Form.Item label={<span data-note-id="PS-1.4">推送时间</span>} required>
              <ScheduleEditor value={draft.schedule} onChange={(schedule) => setDraft({ ...draft, schedule })} />
            </Form.Item>
          ) : null}
          <Form.Item label={<span data-note-id="PS-1.5">推送渠道</span>} required>
            <Select
              mode="multiple"
              value={draft.channelIds}
              placeholder="请选择推送渠道"
              options={enabledChannels.map((channel) => ({
                value: channel.id,
                label: `${channel.name}（${channelTypeMeta[channel.type].label}${channel.status === 'DISABLED' ? '，已停用' : ''}）`,
                disabled: channel.status === 'DISABLED' && !draft.channelIds.includes(channel.id),
              }))}
              onChange={(channelIds) => setDraft({ ...draft, channelIds })}
            />
          </Form.Item>
        </Form>
      </Drawer>
      <MessagePreviewModal visible={previewVisible} onClose={() => setPreviewVisible(false)} annotationRequest={annotationRequest} />
      <Modal title="策略消息预览" visible={Boolean(previewDraft)} style={{ width: 760, top: 40 }} alignCenter={false} footer={<Button onClick={() => setPreviewDraft(undefined)}>关闭</Button>} onCancel={() => setPreviewDraft(undefined)} unmountOnExit>
        {previewDraft && <StrategyMessagePreview strategy={previewDraft} />}
      </Modal>
    </div>
  );
}

function PushHistoryTab({ annotationRequest }: { annotationRequest: AnnotationRequest }) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<PushHistory[]>([]);
  const [channels, setChannels] = useState<Array<Pick<PushChannel, 'id' | 'name'>>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState<string[]>([]);
  const [channelId, setChannelId] = useState<string>();
  const [applied, setApplied] = useState<{ dateRange: string[]; channelId?: string }>({ dateRange: [] });
  const [detail, setDetail] = useState<PushHistory>();
  useEffect(() => {
    if (annotationRequest?.event === 'push-strategy:show-history') setDetail(undefined);
  }, [annotationRequest]);


  const load = useCallback(async () => {
    setLoading(true);
    const [result, channelList] = await Promise.all([
      queryHistory({ ...applied, page, pageSize }),
      listHistoryChannels(),
    ]);
    setRecords(result.list);
    setTotal(result.total);
    setChannels(channelList);
    setLoading(false);
  }, [applied, page, pageSize]);

  useEffect(() => { void load(); }, [load]);

  const baseColumns: ResizableColumn<PushHistory>[] = [
    {
      title: '推送时间',
      dataIndex: 'pushedAt',
      resizeKey: 'pushedAt',
      width: 160,
      minWidth: 140,
      fixed: 'left',
    },
    { title: '产品类别', dataIndex: 'productCategory', resizeKey: 'productCategory', width: 110 },
    { title: <span data-note-id="PS-3">策略名称</span>, dataIndex: 'strategyName', resizeKey: 'strategyName', width: 160, minWidth: 120 },
    {
      title: '关联对象',
      dataIndex: 'relatedObjectName',
      resizeKey: 'relatedObjectName',
      width: 190,
      minWidth: 140,
      ellipsis: true,
    },
    {
      title: '消息内容',
      dataIndex: 'messageContent',
      resizeKey: 'messageContent',
      width: 280,
      minWidth: 180,
      ellipsis: true,
    },
    {
      title: '推送渠道',
      dataIndex: 'channelId',
      resizeKey: 'channelId',
      width: 140,
      minWidth: 110,
      render: (_id: string, record) => record.channelName || '历史渠道',
    },
    {
      title: '推送结果',
      dataIndex: 'result',
      resizeKey: 'result',
      width: 90,
      render: (result) => <Tag color={result === 'SUCCESS' ? 'green' : 'red'}>{result === 'SUCCESS' ? '成功' : '失败'}</Tag>,
    },
    {
      title: '操作',
      resizeKey: 'action',
      width: 100,
      minWidth: 90,
      fixed: 'right',
      align: 'left',
      render: (_value, record) => (
        <Button
          className={styles.actionButton}
          type="text"
          size="small"
          icon={<IconEye />}
          onClick={async () => setDetail(await getHistoryDetail(record.id))}
        >
          详情
        </Button>
      ),
    },
  ];
  const { columns, scroll, tableAreaRef } = useResizableTable(baseColumns);

  return (
    <div className={styles.tabPage}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <DatePicker.RangePicker
            className={styles.dateRange}
            allowClear
            value={dateRange}
            format="YYYY-MM-DD"
            placeholder={['开始日期', '结束日期']}
            onChange={(value) => {
              const next = value || [];
              setDateRange(next);
              setApplied({ dateRange: next, channelId });
              setPage(1);
            }}
          />
          <Select
            className={styles.channelSelect}
            allowClear
            value={channelId}
            placeholder="推送渠道"
            options={channels.map((channel) => ({ value: channel.id, label: channel.name }))}
            onChange={(nextChannelId) => {
              setChannelId(nextChannelId);
              setApplied({ dateRange, channelId: nextChannelId });
              setPage(1);
            }}
          />
        </div>
        <Tooltip content="刷新">
          <Button aria-label="刷新" icon={<IconRefresh />} onClick={() => void load()} />
        </Tooltip>
      </div>
      <div className={styles.tableArea} ref={tableAreaRef}>
        <Spin loading={loading}>
          <Table
            rowKey="id"
            columns={columns}
            components={{ header: { th: ResizableHeaderCell } }}
            data={records}
            pagination={false}
            scroll={scroll}
            noDataElement={<Empty description="暂无推送记录" />}
          />
        </Spin>
      </div>
      <PageFooter total={total} page={page} pageSize={pageSize} onChange={(nextPage, nextSize) => {
        setPage(nextPage);
        setPageSize(nextSize);
      }} />
      <Drawer className={styles.pushDrawer} width={560} visible={Boolean(detail)} title="推送详情" footer={null} onCancel={() => setDetail(undefined)}>
        {detail ? (
          <dl className={styles.detailList}>
            <div className={styles.detailItem}><dt>推送时间</dt><dd>{detail.pushedAt}</dd></div>
            <div className={styles.detailItem}><dt>产品类别</dt><dd>{detail.productCategory}</dd></div>
            <div className={styles.detailItem}><dt>策略名称</dt><dd>{detail.strategyName}</dd></div>
            <div className={styles.detailItem}><dt>关联对象</dt><dd>{detail.relatedObjectName}</dd></div>
            <div className={styles.detailItem}>
              <dt>推送渠道</dt>
              <dd>{detail.channelName || '历史渠道'}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>推送结果</dt>
              <dd><Tag color={detail.result === 'SUCCESS' ? 'green' : 'red'}>{detail.result === 'SUCCESS' ? '成功' : '失败'}</Tag></dd>
            </div>
            {detail.result === 'FAILED' ? (
              <div className={styles.detailItem}><dt>失败原因</dt><dd><Text type="error">{detail.failureReason}</Text></dd></div>
            ) : null}
            <div className={styles.detailItem}>
              <dt>消息内容</dt>
              <dd>{detail.snapshot ? <SnapshotMessage snapshot={detail.snapshot} /> : <div className={styles.safeMessage}>{detail.messageContent}</div>}</dd>
            </div>
          </dl>
        ) : null}
      </Drawer>
    </div>
  );
}

export default function PushStrategyCenter() {
  const [activeTab, setActiveTab] = useState('channel');
  const [annotationRequest, setAnnotationRequest] = useState<AnnotationRequest>(null);
  useEffect(() => {
    const events = ['push-strategy:show-list', 'push-strategy:show-invalid-strategy', 'push-strategy:show-editor', 'push-strategy:show-preview', 'push-strategy:show-monitor', 'push-strategy:show-history'];
    const locate = (event: Event) => {
      setActiveTab(event.type === 'push-strategy:show-history' ? 'history' : 'strategy');
      setAnnotationRequest({ event: event.type });
    };
    events.forEach((event) => window.addEventListener(event, locate));
    return () => events.forEach((event) => window.removeEventListener(event, locate));
  }, []);
  return (
    <div className={styles.page}>
      <Tabs
        className={styles.tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        destroyOnHide={false}
        headerPadding={false}
        type="rounded"
      >
        <TabPane key="channel" title="渠道配置">
          <ChannelConfig />
        </TabPane>
        <TabPane key="strategy" title="策略配置">
          <StrategyConfig annotationRequest={annotationRequest} />
        </TabPane>
        <TabPane key="history" title="推送历史">
          <PushHistoryTab annotationRequest={annotationRequest} />
        </TabPane>
      </Tabs>
    </div>
  );
}
