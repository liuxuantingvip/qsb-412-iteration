import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
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
  getStrategyDetail,
  listChannels,
  listRelatedObjects,
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

const { TabPane } = Tabs;
const { RangePicker: TimeRangePicker } = TimePicker;
const { Text } = Typography;
const DEFAULT_MIN_COLUMN_WIDTH = 80;

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
  TASK: '任务',
  SHOP: '店铺',
  DATA_TABLE: '数据表',
  MONITOR_VIEW: '数据监控视图',
};

const messageTypeMeta = {
  PROGRESS: '执行进度',
  EXCEPTION: '执行异常',
  LOGIN_EXCEPTION: '账号登录异常',
};

const cycleMeta = { DAY: '每日', WEEK: '每周', MONTH: '每月' };
const weekOptions = ['一', '二', '三', '四', '五', '六', '日'].map((label, index) => ({
  label: `周${label}`,
  value: index + 1,
}));
const monthOptions = Array.from({ length: 31 }, (_, index) => ({
  label: `${index + 1} 日`,
  value: index + 1,
}));

const defaultSchedule = (): PushSchedule => ({
  cycle: 'DAY',
  weekDays: [],
  monthDays: [],
  timeRanges: [{ id: `range-${Date.now()}`, start: '08:00', end: '18:00' }],
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
  messageType: 'EXCEPTION',
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

const toMinute = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const validateTimeRanges = (schedule: PushSchedule) => {
  if (!schedule.timeRanges.length) return '请至少配置一个推送时段';
  if (schedule.cycle === 'WEEK' && !schedule.weekDays.length) return '请选择每周推送日期';
  if (schedule.cycle === 'MONTH' && !schedule.monthDays.length) return '请选择每月推送日期';
  const segments = schedule.timeRanges.flatMap(({ start, end }) => {
    const startMinute = toMinute(start);
    const endMinute = toMinute(end);
    if (startMinute === endMinute) return [[0, 1440]];
    if (endMinute > startMinute) return [[startMinute, endMinute]];
    return [[startMinute, 1440], [0, endMinute]];
  }).sort((left, right) => left[0] - right[0]);
  for (let index = 1; index < segments.length; index += 1) {
    if (segments[index][0] < segments[index - 1][1]) return '推送时段不能重叠';
  }
  const merged = segments.reduce<number[][]>((result, segment) => {
    const last = result[result.length - 1];
    if (last && segment[0] <= last[1]) last[1] = Math.max(last[1], segment[1]);
    else result.push([...segment]);
    return result;
  }, []);
  if (merged.length === 1 && merged[0][0] === 0 && merged[0][1] === 1440) return '';
  for (let index = 0; index < merged.length; index += 1) {
    const current = merged[index];
    const next = merged[(index + 1) % merged.length];
    const gap = index === merged.length - 1
      ? next[0] + 1440 - current[1]
      : next[0] - current[1];
    if (gap > 0 && gap < 30) return '同一推送日期的时段间隔不能小于 30 分钟';
  }
  return '';
};

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

function ScheduleEditor({
  value,
  onChange,
  disabled,
}: {
  value: PushSchedule;
  onChange: (value: PushSchedule) => void;
  disabled?: boolean;
}) {
  const updateRange = (id: string, range?: string[]) => {
    if (!range?.length) return;
    onChange({
      ...value,
      timeRanges: value.timeRanges.map((item) => (
        item.id === id ? { ...item, start: range[0], end: range[1] } : item
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
          value={value.monthDays}
          options={monthOptions}
          disabled={disabled}
          placeholder="请选择日期"
          onChange={(monthDays) => onChange({ ...value, monthDays })}
        />
      ) : null}
      <div className={styles.timeRangeList}>
        {value.timeRanges.map((range, index) => (
          <div className={styles.timeRangeRow} key={range.id}>
            <span className={styles.timeRangeLabel}>时段 {index + 1}</span>
            <TimeRangePicker
              value={[range.start, range.end]}
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
                { id: `range-${Date.now()}`, start: '19:00', end: '22:00' },
              ],
            })}
          >
            添加时段
          </Button>
        ) : null}
      </div>
      <Text type="secondary">建议：相邻时段至少间隔 30 分钟。</Text>
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

function StrategyConfig() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<PushStrategy[]>([]);
  const [channels, setChannels] = useState<PushChannel[]>([]);
  const [objects, setObjects] = useState<RelatedObjectOption[]>([]);
  const [total, setTotal] = useState(0);
  const [strategyCount, setStrategyCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<{ name: string; status?: EnabledStatus }>({ name: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [draft, setDraft] = useState<StrategyDraft>(defaultStrategyDraft());

  const load = useCallback(async () => {
    setLoading(true);
    const [result, allResult, channelList, objectList] = await Promise.all([
      queryStrategies({ ...appliedFilters, page, pageSize }),
      queryStrategies({ page: 1, pageSize: 100 }),
      listChannels(),
      listRelatedObjects(),
    ]);
    setRecords(result.list);
    setTotal(result.total);
    setStrategyCount(allResult.total);
    setChannels(channelList);
    setObjects(objectList);
    setLoading(false);
  }, [appliedFilters, page, pageSize]);

  useEffect(() => { void load(); }, [load]);

  const openDrawer = async (record?: PushStrategy) => {
    if (!record && strategyCount >= 30) {
      Message.warning('最多可创建 30 个推送策略');
      return;
    }
    const detail = record ? await getStrategyDetail(record.id) : undefined;
    setDraft(detail || defaultStrategyDraft());
    setDrawerVisible(true);
  };

  const currentObjects = objects.filter((item) => item.type === draft.relatedObjectType);
  const invalidSelected = currentObjects.filter((item) => item.invalid && draft.relatedObjectIds.includes(item.id));
  const enabledChannels = channels.filter((item) => item.status === 'ENABLED' || draft.channelIds.includes(item.id));

  const treeData = useMemo(() => {
    const groups = new Map<string, RelatedObjectOption[]>();
    currentObjects.forEach((item) => groups.set(item.group, [...(groups.get(item.group) || []), item]));
    return Array.from(groups.entries()).map(([group, children]) => ({
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
    }));
  }, [currentObjects, draft.relatedObjectIds]);

  const doSave = async () => {
    if (!draft.name.trim()) {
      Message.warning('请输入策略名称');
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
    const scheduleError = validateTimeRanges(draft.schedule);
    if (scheduleError) {
      Message.error(scheduleError);
      return;
    }
    await saveStrategy({ ...draft, name: draft.name.trim() });
    Message.success(draft.id ? '策略已更新' : '策略已新增');
    setDrawerVisible(false);
    await load();
  };

  const confirmStatus = (record: PushStrategy, checked: boolean) => {
    Modal.confirm({
      title: checked ? '启用策略' : '停用策略',
      content: checked
        ? `启用后，“${record.name}”将按配置时段发送消息。`
        : `停用后，“${record.name}”将不再发送消息。`,
      onOk: async () => {
        await updateStrategyStatus(record.id, checked ? 'ENABLED' : 'DISABLED');
        Message.success(checked ? '策略已启用' : '策略已停用');
        await load();
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
    { title: '产品类别', dataIndex: 'productCategory', resizeKey: 'productCategory', width: 110 },
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
        <span>
          {cycleMeta[record.schedule.cycle]}
          {record.schedule.cycle === 'WEEK' ? `（${record.schedule.weekDays.map((day) => `周${weekOptions[day - 1].label.slice(1)}`).join('、')}）` : ''}
          {record.schedule.cycle === 'MONTH' ? `（${record.schedule.monthDays.join('、')} 日）` : ''}
          {' '}{record.schedule.timeRanges.map((item) => `${item.start}-${item.end}`).join('，')}
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
        <Switch checked={status === 'ENABLED'} onChange={(checked) => confirmStatus(record, checked)} />
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
          <Button className={styles.actionButton} type="text" size="small" icon={<IconEdit />} onClick={() => void openDrawer(record)}>编辑</Button>
          <Button
            className={styles.actionButton}
            type="text"
            size="small"
            status="danger"
            icon={<IconDelete />}
            disabled={record.systemStrategy}
            onClick={() => Modal.confirm({
              title: '删除策略',
              content: `删除后不可恢复，确定删除“${record.name}”吗？`,
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
        <Button type="primary" icon={<IconPlus />} disabled={strategyCount >= 30} onClick={() => void openDrawer()}>新增策略</Button>
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
            noDataElement={<Empty description="暂无推送策略" />}
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
            <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={() => void doSave()}>保存</Button>
          </Space>
        )}
      >
        {draft.systemStrategy ? (
          <Alert type="info" content="“账号登录异常”为系统策略，消息类型、关联范围和推送时段不可修改，也不可删除。" />
        ) : null}
        {invalidSelected.length ? (
          <Alert
            type="warning"
            content={`历史策略中包含已失效对象：${invalidSelected.map((item) => item.name).join('、')}。保存时可保留，重新选择时不可新增。`}
          />
        ) : null}
        <Form layout="vertical" className={styles.strategyForm}>
          <Form.Item label="策略名称" required>
            <Input
              value={draft.name}
              maxLength={30}
              showWordLimit
              disabled={draft.systemStrategy}
              placeholder="请输入策略名称"
              onChange={(name) => setDraft({ ...draft, name })}
            />
          </Form.Item>
          <Form.Item label="产品类别" required>
            <Select
              value={draft.productCategory}
              disabled={draft.systemStrategy}
              options={['电商取数宝', '跨境取数宝', '全部产品'].map((value) => ({ label: value, value }))}
              onChange={(productCategory) => setDraft({ ...draft, productCategory })}
            />
          </Form.Item>
          <Form.Item label="消息类型" required>
            <div className={styles.messageTypeRow}>
              <Select
                className={styles.messageObjectTypeSelect}
                value={draft.relatedObjectType}
                disabled={draft.systemStrategy}
                options={Object.entries(relatedTypeMeta).map(([value, label]) => ({ value, label }))}
                onChange={(relatedObjectType) => setDraft({
                  ...draft,
                  relatedObjectType,
                  relatedObjectIds: [],
                })}
              />
              <Radio.Group
                value={draft.messageType}
                disabled={draft.systemStrategy}
                onChange={(messageType) => setDraft({ ...draft, messageType })}
              >
                <Radio value="PROGRESS">执行进度</Radio>
                <Radio value="EXCEPTION">执行异常</Radio>
                {draft.systemStrategy ? <Radio value="LOGIN_EXCEPTION">账号登录异常</Radio> : null}
              </Radio.Group>
            </div>
          </Form.Item>
          <Form.Item label="关联范围" required>
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
            <Form.Item label="选择关联对象" required>
              <TreeSelect
                multiple
                treeCheckable
                treeCheckStrictly
                allowClear
                value={draft.relatedObjectIds}
                treeData={treeData}
                disabled={draft.systemStrategy}
                placeholder={`请选择${relatedTypeMeta[draft.relatedObjectType]}`}
                onChange={(relatedObjectIds) => setDraft({ ...draft, relatedObjectIds: relatedObjectIds as string[] })}
              />
            </Form.Item>
          ) : null}
          <Form.Item label="推送时间" required>
            <ScheduleEditor
              value={draft.systemStrategy ? {
                cycle: 'DAY',
                weekDays: [],
                monthDays: [],
                timeRanges: [{ id: 'system-all-day', start: '00:00', end: '23:59' }],
              } : draft.schedule}
              disabled={draft.systemStrategy}
              onChange={(schedule) => setDraft({ ...draft, schedule })}
            />
          </Form.Item>
          <Form.Item label="推送渠道" required>
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
    </div>
  );
}

function PushHistoryTab() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<PushHistory[]>([]);
  const [channels, setChannels] = useState<PushChannel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState<string[]>([]);
  const [channelId, setChannelId] = useState<string>();
  const [applied, setApplied] = useState<{ dateRange: string[]; channelId?: string }>({ dateRange: [] });
  const [detail, setDetail] = useState<PushHistory>();

  const load = useCallback(async () => {
    setLoading(true);
    const [result, channelList] = await Promise.all([
      queryHistory({ ...applied, page, pageSize }),
      listChannels(),
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
    { title: '策略名称', dataIndex: 'strategyName', resizeKey: 'strategyName', width: 160, minWidth: 120 },
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
      render: (id: string) => channels.find((item) => item.id === id)?.name || '已删除渠道',
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
              <dd>{channels.find((item) => item.id === detail.channelId)?.name || '已删除渠道'}</dd>
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
              <dd><div className={styles.safeMessage}>{detail.messageContent}</div></dd>
            </div>
          </dl>
        ) : null}
      </Drawer>
    </div>
  );
}

export default function PushStrategyCenter() {
  return (
    <div className={styles.page}>
      <Tabs
        className={styles.tabs}
        defaultActiveTab="channel"
        destroyOnHide={false}
        headerPadding={false}
        type="rounded"
      >
        <TabPane key="channel" title="渠道配置">
          <ChannelConfig />
        </TabPane>
        <TabPane key="strategy" title="策略配置">
          <StrategyConfig />
        </TabPane>
        <TabPane key="history" title="推送历史">
          <PushHistoryTab />
        </TabPane>
      </Tabs>
    </div>
  );
}
