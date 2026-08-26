import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Key,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  ThHTMLAttributes,
} from 'react';
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Dropdown,
  Form,
  Grid,
  Image,
  Input,
  Message as message,
  Menu,
  Modal,
  Progress,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import { IconDown, IconExport, IconSync } from '@arco-design/web-react/icon';
import wuyingCloudImg from '@/assets/images/wuyingCloud.png';
import { AnnotationMarker } from '@/components/cloudAnnotations';
import { FrameWorkPortalSuccessCode, PaginationInitData } from '@/constants';
import type { ListBackType } from '@/interface';
import * as ServiceApi from './services';
import type { ListOneBackType, ListParamsType, StatisticInfo } from './interface';
import {
  OnlineStateArr,
  OnlineStateEnum,
  OnlineStateInfo,
  WuYingStatusArr,
  WuYingStatusInfo,
  WuyingStatusEnum,
} from './types';
import Detail from './components/Detail';
import styles from './index.module.less';

const { Row, Col } = Grid;
const { TabPane } = Tabs;

const cloudTypeItems = [
  { key: 'wuying', label: '无影云' },
  { key: 'huoshan', label: '火山云' },
  { key: 'tianyi', label: '天翼云' },
];

type SearchField = 'desktopName' | 'desktopId' | 'authTenantName' | 'ticket' | 'todeskCode';

const searchFieldOptions: { value: SearchField; label: string }[] = [
  { value: 'authTenantName', label: '租户名' },
  { value: 'desktopName', label: '云桌面名称' },
  { value: 'desktopId', label: '云桌面ID' },
  { value: 'ticket', label: '机器人令牌' },
  { value: 'todeskCode', label: 'ToDesk' },
];

const DEFAULT_MIN_COLUMN_WIDTH = 100;

const DEFAULT_COLUMN_WIDTHS = {
  desktopName: 220,
  desktopId: 120,
  ticket: 190,
  todeskCode: 110,
  creationTime: 145,
  expiredTime: 145,
  sessionUser: 110,
  cloudAccountName: 120,
  bindStatus: 100,
  robotStatus: 110,
  desktopStatus: 170,
  action: 160,
};

type ColumnKey = keyof typeof DEFAULT_COLUMN_WIDTHS;

const MIN_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  action: 150,
  bindStatus: 90,
  cloudAccountName: 110,
  creationTime: 130,
  desktopId: 110,
  desktopName: 180,
  desktopStatus: 140,
  expiredTime: 130,
  robotStatus: 100,
  sessionUser: 100,
  ticket: 150,
  todeskCode: 100,
};

type ResizableHeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
  minWidth?: number;
  onResize?: (width: number) => void;
  width?: number;
};

type SearchValues = {
  searchField?: SearchField;
  keyword?: string;
  robotStatus?: string;
  desktopStatus?: string;
  creationTimeRange?: string[];
};

type TableRow = ListOneBackType & {
  key: string;
  isTenant?: boolean;
  childCount?: number;
  children?: TableRow[];
};

const robotStatusTagColor: Partial<Record<OnlineStateEnum, string>> = {
  [OnlineStateEnum.BUSY]: 'arcoblue',
  [OnlineStateEnum.NOTONLINE]: 'red',
  [OnlineStateEnum.CONNECTING]: 'orange',
  [OnlineStateEnum.FREE]: 'green',
  [OnlineStateEnum.ALONE]: 'gray',
};

const desktopStatusTagColor: Partial<Record<WuyingStatusEnum, string>> = {
  [WuyingStatusEnum.RUNNING]: 'arcoblue',
  [WuyingStatusEnum.CONNECTED]: 'green',
  [WuyingStatusEnum.STOPPED]: 'red',
  [WuyingStatusEnum.EXPIRED]: 'gray',
  [WuyingStatusEnum.STARTING]: 'arcoblue',
  [WuyingStatusEnum.REBUILDING]: 'arcoblue',
  [WuyingStatusEnum.STOPPING]: 'orange',
  [WuyingStatusEnum.DELETED]: 'gray',
  [WuyingStatusEnum.PENDING]: 'arcoblue',
  [WuyingStatusEnum.OPEN_FAILED]: 'red',
  [WuyingStatusEnum.RENEW_FAILED]: 'red',
  [WuyingStatusEnum.RELEASE_PERIOD]: 'orange',
  [WuyingStatusEnum.UNSUBSCRIBING]: 'arcoblue',
  [WuyingStatusEnum.AUTO_UNSUBSCRIBING]: 'arcoblue',
  [WuyingStatusEnum.UNSUBSCRIBED]: 'gray',
  [WuyingStatusEnum.UNSUBSCRIBE_FAILED]: 'red',
};

function getDefaultPageData(): ListBackType<ListOneBackType> {
  return {
    records: [],
    size: PaginationInitData.pageSize,
    total: 0,
    current: PaginationInitData.pageNo,
  };
}

function buildSearchParams(values: SearchValues): ListParamsType {
  const params: ListParamsType = {};
  const keyword = values.keyword?.trim();
  const searchField = values.searchField || 'authTenantName';
  if (keyword) {
    params[searchField] = keyword;
  }
  if (values.robotStatus) params.robotStatus = values.robotStatus;
  if (values.desktopStatus) params.desktopStatus = values.desktopStatus;
  if (values.creationTimeRange?.length === 2) {
    params.creationStartTime = `${values.creationTimeRange[0]} 00:00:00`;
    params.creationEndTime = `${values.creationTimeRange[1]} 23:59:59`;
  }
  return params;
}

function escapeCsvCell(value: unknown) {
  const text = value === undefined || value === null || value === '' ? '--' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function getAuthorizationResultLabel(status?: string) {
  if (status === WuyingStatusEnum.PENDING) return '开通中';
  if (
    status === WuyingStatusEnum.OPEN_FAILED ||
    status === WuyingStatusEnum.RENEW_FAILED ||
    status === WuyingStatusEnum.UNSUBSCRIBE_FAILED
  ) {
    return '部分成功';
  }
  return '成功';
}

function formatExportTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function buildTenantRows(records: ListOneBackType[]): TableRow[] {
  const grouped = records.reduce<Record<string, ListOneBackType[]>>((acc, item) => {
    const tenantName = item.authTenantName || '未分配租户';
    acc[tenantName] = acc[tenantName] || [];
    acc[tenantName].push(item);
    return acc;
  }, {});

  return Object.entries(grouped).map(([tenantName, items]) => ({
    key: `tenant-${tenantName}`,
    id: `tenant-${tenantName}`,
    isTenant: true,
    childCount: items.length,
    desktopName: tenantName,
    authTenantName: tenantName,
    children: items.map((item) => ({
      ...item,
      key: item.id || item.desktopId || `${tenantName}-${item.desktopName}`,
    })),
  }));
}

function statusTag(
  statusMapInfo: Record<string, { label: string; color: string }>,
  status?: string | number | null,
  tagColorMap?: Partial<Record<string, string>>,
) {
  const statusKey = status == null ? undefined : String(status);
  const info = statusKey == null ? undefined : statusMapInfo[statusKey];
  if (!info) return <Typography.Text type="secondary">--</Typography.Text>;
  return <Tag color={statusKey ? tagColorMap?.[statusKey] || info.color : info.color}>{info.label}</Tag>;
}

function ResizableHeaderCell({
  children,
  className = '',
  minWidth = DEFAULT_MIN_COLUMN_WIDTH,
  onResize,
  style,
  width,
  ...restProps
}: ResizableHeaderCellProps) {
  const startResize = (startX: number, moveEventName: 'mousemove' | 'pointermove', upEventName: 'mouseup' | 'pointerup') => {
    if (!width || !onResize) return;

    const startWidth = width;
    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (moveEvent: MouseEvent | PointerEvent) => {
      onResize(Math.max(minWidth, startWidth + moveEvent.clientX - startX));
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

export default function WuyingManagement() {
  const [form] = Form.useForm<SearchValues>();
  const searchField = Form.useWatch('searchField', form) || 'authTenantName';
  const tableContentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cloudType, setCloudType] = useState('wuying');
  const [queryParams, setQueryParams] = useState<ListParamsType>({});
  const [dataList, setDataList] = useState<ListBackType<ListOneBackType>>(getDefaultPageData());
  const [statisticInfo, setStatisticInfo] = useState<StatisticInfo>();
  const [currentId, setCurrentId] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [tableScrollY, setTableScrollY] = useState(420);
  const [tableContentWidth, setTableContentWidth] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);

  const queryList = async (params?: ListParamsType, nextCloudType = cloudType) => {
    setLoading(true);
    const pageNo = params?.pageNo || Number(dataList.current || PaginationInitData.pageNo);
    const pageSize = params?.pageSize || Number(dataList.size || PaginationInitData.pageSize);
    await ServiceApi.getPageList({
      ...queryParams,
      cloudType: nextCloudType,
      pageNo,
      pageSize,
      ...params,
    })
      .then(({ bizData }) => {
        setDataList(bizData || getDefaultPageData());
      })
      .finally(() => setLoading(false));
  };

  const queryStatistic = async (nextCloudType = cloudType) => {
    await ServiceApi.getStatistic({ cloudType: nextCloudType }).then(({ bizData }) => {
      const data = { ...bizData };
      data.runningPer = data.totalNum ? (data.runningNum / data.totalNum) * 100 : 0;
      data.connectedPer = data.totalNum ? (data.connectedNum / data.totalNum) * 100 : 0;
      data.stoppedPer = data.totalNum ? (data.stoppedNum / data.totalNum) * 100 : 0;
      data.expiredPer = data.totalNum ? (data.expiredNum / data.totalNum) * 100 : 0;
      data.releasePeriodPer = data.totalNum ? ((data.releasePeriodNum || 0) / data.totalNum) * 100 : 0;
      data.unsubscribingPer = data.totalNum ? ((data.unsubscribingNum || 0) / data.totalNum) * 100 : 0;
      data.unsubscribeFailedPer = data.totalNum ? ((data.unsubscribeFailedNum || 0) / data.totalNum) * 100 : 0;
      setStatisticInfo(data);
    });
  };

  const reloadPage = async (params?: ListParamsType, nextCloudType = cloudType) => {
    await Promise.all([
      queryList(params, nextCloudType),
      queryStatistic(nextCloudType),
    ]);
  };

  const handleRefresh = async () => {
    try {
      await reloadPage();
      message.success('云厂商状态同步完成');
    } catch {
      message.warning('云厂商状态同步失败，已保留本地旧状态');
    }
  };

  useEffect(() => {
    reloadPage({ pageNo: 1, pageSize: PaginationInitData.pageSize });
  }, []);

  const tableData = useMemo(() => buildTenantRows(dataList.records || []), [dataList.records]);

  useEffect(() => {
    setExpandedRowKeys(tableData.map((item) => item.key));
  }, [tableData]);

  useEffect(() => {
    const hasPendingUnsubscribe = dataList.records.some((item) =>
      [WuyingStatusEnum.UNSUBSCRIBING, WuyingStatusEnum.AUTO_UNSUBSCRIBING].includes(
        item.desktopStatus as WuyingStatusEnum,
      ),
    );
    if (!hasPendingUnsubscribe) return undefined;
    const timer = window.setTimeout(() => {
      void reloadPage();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [dataList.records]);

  useEffect(() => {
    const root = tableContentRef.current;
    if (!root) return;

    const heightWithMargins = (element: Element | null, fallback = 0) => {
      if (!element) return fallback;
      const style = window.getComputedStyle(element);
      const marginTop = Number.parseFloat(style.marginTop) || 0;
      const marginBottom = Number.parseFloat(style.marginBottom) || 0;
      return element.getBoundingClientRect().height + marginTop + marginBottom;
    };

    const updateTableHeight = () => {
      const toolbar = root.getElementsByClassName(styles.toolbar)[0] || null;
      const tableHeader = root.querySelector('.arco-table-header');
      const pagination = root.querySelector('.arco-pagination');
      const nextHeight =
        root.clientHeight -
        heightWithMargins(toolbar, 42) -
        heightWithMargins(tableHeader, 55) -
        heightWithMargins(pagination, 48) -
        2;

      setTableScrollY(Math.max(180, Math.floor(nextHeight)));
      setTableContentWidth(root.clientWidth);
    };

    updateTableHeight();

    const resizeObserver = new ResizeObserver(updateTableHeight);
    resizeObserver.observe(root);
    window.addEventListener('resize', updateTableHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateTableHeight);
    };
  }, [dataList.current, dataList.records, dataList.size, expandedRowKeys.length]);

  const handleSearch = () => {
    const nextParams = buildSearchParams(form.getFieldsValue());
    setQueryParams(nextParams);
    queryList({ ...nextParams, pageNo: 1 });
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const exportParams = buildSearchParams(form.getFieldsValue());
      const { bizData } = await ServiceApi.getPageList({
        ...exportParams,
        cloudType,
        pageNo: 1,
        pageSize: 100000,
      });
      const records = bizData.records || [];
      if (!records.length) {
        message.warning('暂无可导出数据');
        return;
      }

      const headers = [
        '租户名称',
        '授权提交结果',
        '云桌面名称',
        '云桌面ID',
        '机器人口令',
        'ToDesk',
        '创建时间',
        '到期时间',
        '当前登录用户',
        '机器人状态',
        '云桌面状态',
        '厂商操作单',
        '失败原因',
      ];
      const csvRows = records.map((record) => [
        record.authTenantName,
        getAuthorizationResultLabel(record.desktopStatus),
        record.desktopName,
        record.desktopId,
        record.ticket,
        record.todeskCode,
        record.creationTime,
        record.expiredTime,
        record.sessionUser,
        record.robotStatus
          ? OnlineStateInfo[record.robotStatus as OnlineStateEnum]?.label || record.robotStatus
          : '',
        record.desktopStatus
          ? WuYingStatusInfo[record.desktopStatus as WuyingStatusEnum]?.label || record.desktopStatus
          : '',
        record.vendorOperationId || '',
        record.vendorErrorMessage || '',
      ]);
      const csv = [headers, ...csvRows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
      const blobUrl = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
      const downloadLink = document.createElement('a');
      const cloudLabel = cloudTypeItems.find((item) => item.key === cloudType)?.label || '云资源';
      downloadLink.href = blobUrl;
      downloadLink.download = `${cloudLabel}云桌面-${formatExportTimestamp()}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
      message.success(`已导出 ${records.length} 条数据`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleCloudTypeChange = (nextCloudType: string) => {
    setCloudType(nextCloudType);
    form.resetFields();
    const nextParams: ListParamsType = {};
    setQueryParams(nextParams);
    reloadPage({ ...nextParams, pageNo: 1, pageSize: PaginationInitData.pageSize }, nextCloudType);
  };

  const runDesktopAction = async (
    record: ListOneBackType,
    actionName: '开机' | '关机' | '重启',
    service: (params: { id?: string }) => Promise<{ code: string }>,
  ) => {
    Modal.confirm({
      title: '提示',
      content: `确认要${actionName}云桌面${record.desktopName}？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setActionLoading(true);
        await service({ id: record.desktopId })
          .then(({ code }) => {
            if (code === FrameWorkPortalSuccessCode) {
              message.success(`${actionName}成功`);
              queryList();
            }
          })
          .finally(() => setActionLoading(false));
      },
    });
  };

  const beforeStopOrReboot = async (
    record: ListOneBackType,
    actionName: '关机' | '重启',
    service: (params: { id?: string }) => Promise<{ code: string }>,
  ) => {
    const res = await ServiceApi.getDesktopInfo({ id: record.desktopId });
    if (
      res.bizData.robotStatus + '' !== OnlineStateEnum.FREE &&
      res.bizData.robotStatus !== null &&
      res.bizData.robotStatus + '' !== OnlineStateEnum.NOTONLINE
    ) {
      Modal.info({
        title: '提示',
        content: `无法${actionName}，存在正在执行的任务！`,
      });
      return;
    }
    runDesktopAction(record, actionName, service);
  };

  const runLifecycleAction = async (
    record: ListOneBackType,
    successMessage: string,
    service: (params: { id?: string }) => Promise<{ code: string }>,
  ) => {
    setActionLoading(true);
    try {
      const { code } = await service({ id: record.desktopId });
      if (code === FrameWorkPortalSuccessCode) {
        message.success(successMessage);
        await reloadPage();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleColumnResize = (columnKey: ColumnKey, width: number) => {
    const minWidth = MIN_COLUMN_WIDTHS[columnKey];
    setColumnWidths((prev) => ({
      ...prev,
      [columnKey]: Math.max(minWidth, Math.round(width)),
    }));
  };

  const getResizableColumnProps = (columnKey: ColumnKey) => ({
    minWidth: MIN_COLUMN_WIDTHS[columnKey],
    width: columnWidths[columnKey],
    onHeaderCell: () => ({
      minWidth: MIN_COLUMN_WIDTHS[columnKey],
      onResize: (width: number) => handleColumnResize(columnKey, width),
      width: columnWidths[columnKey],
    }) as ResizableHeaderCellProps,
  });

  const columns: ColumnProps<TableRow>[] = [
    {
      title: '租户名称 / 云桌面名称',
      dataIndex: 'desktopName',
      ellipsis: true,
      fixed: 'left',
      ...getResizableColumnProps('desktopName'),
      render: (value: string, record) =>
        record.isTenant ? (
          <Space>
            <Typography.Text bold>{value}</Typography.Text>
            <Tag>{record.childCount} 台</Tag>
          </Space>
        ) : (
          value
        ),
    },
    {
      title: '云桌面ID',
      dataIndex: 'desktopId',
      ellipsis: true,
      ...getResizableColumnProps('desktopId'),
    },
    {
      title: '机器人口令',
      dataIndex: 'ticket',
      ellipsis: true,
      ...getResizableColumnProps('ticket'),
    },
    {
      title: <AnnotationMarker noteId="CRA-2.2">ToDesk</AnnotationMarker>,
      dataIndex: 'todeskCode',
      ellipsis: true,
      ...getResizableColumnProps('todeskCode'),
    },
    {
      title: '创建时间',
      dataIndex: 'creationTime',
      ellipsis: true,
      ...getResizableColumnProps('creationTime'),
    },
    {
      title: '到期时间',
      dataIndex: 'expiredTime',
      ellipsis: true,
      ...getResizableColumnProps('expiredTime'),
    },
    {
      title: '当前登录用户',
      dataIndex: 'sessionUser',
      ellipsis: true,
      ...getResizableColumnProps('sessionUser'),
    },
    ...(cloudType === 'tianyi'
      ? [
          {
            title: '天翼云账号',
            dataIndex: 'cloudAccountName',
            ellipsis: true,
            ...getResizableColumnProps('cloudAccountName'),
          },
          {
            title: '用户绑定状态',
            dataIndex: 'bindStatus',
            ellipsis: true,
            ...getResizableColumnProps('bindStatus'),
            render: (value, record) => (record.isTenant ? null : value || '--'),
          },
        ] as ColumnProps<TableRow>[]
      : []),
    {
      title: '机器人状态',
      dataIndex: 'robotStatus',
      ellipsis: true,
      ...getResizableColumnProps('robotStatus'),
      render: (value, record) => (record.isTenant ? null : statusTag(OnlineStateInfo, value, robotStatusTagColor)),
    },
    {
      title: <AnnotationMarker noteId="CRA-3.1">云桌面状态</AnnotationMarker>,
      dataIndex: 'desktopStatus',
      ellipsis: true,
      ...getResizableColumnProps('desktopStatus'),
      render: (value, record) =>
        record.isTenant ? null : (
          <Space size={4}>
            {statusTag(WuYingStatusInfo, value, desktopStatusTagColor)}
            {record.vendorStatus ? <Typography.Text type="secondary">{record.vendorStatus}</Typography.Text> : null}
          </Space>
        ),
    },
    {
      title: <AnnotationMarker noteId="CRA-3.2">操作</AnnotationMarker>,
      dataIndex: 'action',
      fixed: 'right',
      className: styles.actionColumn,
      ...getResizableColumnProps('action'),
      render: (_, record) => {
        if (record.isTenant) return null;
        const deleted = record.desktopStatus === WuyingStatusEnum.DELETED;
        const retryableFailed =
          record.desktopStatus === WuyingStatusEnum.OPEN_FAILED ||
          record.desktopStatus === WuyingStatusEnum.RENEW_FAILED ||
          record.desktopStatus === WuyingStatusEnum.UNSUBSCRIBE_FAILED;
        const running = record.desktopStatus === WuyingStatusEnum.RUNNING;
        const stopped = record.desktopStatus === WuyingStatusEnum.STOPPED;
        const unsubscribed = record.desktopStatus === WuyingStatusEnum.UNSUBSCRIBED;
        const moreItems = [
          ...(running
            ? [
                { key: 'stop', label: '关机' },
                { key: 'reboot', label: '重启' },
              ]
            : []),
          ...(retryableFailed ? [{ key: 'retry', label: '失败重试' }] : []),
          { key: 'detail', label: '详情', disabled: deleted && !unsubscribed },
        ];

        const handleMoreClick = (key: string) => {
          if (key === 'stop') {
            beforeStopOrReboot(record, '关机', ServiceApi.stopDesktop);
            return;
          }
          if (key === 'reboot') {
            beforeStopOrReboot(record, '重启', ServiceApi.rebootDesktop);
            return;
          }
          if (key === 'retry') {
            if (record.desktopStatus === WuyingStatusEnum.UNSUBSCRIBE_FAILED) {
              Modal.confirm({
                title: '确认重试释放失败资源？',
                content: `将重试 1 台释放失败的云电脑；已释放成功的资源不会再次提交。`,
                okText: '失败重试',
                onOk: () => runLifecycleAction(record, '释放重试成功', ServiceApi.retryDesktopOperation),
              });
              return;
            }
            void runLifecycleAction(record, '重试成功', ServiceApi.retryDesktopOperation);
            return;
          }
          if (key === 'detail') {
            setCurrentId(record.desktopId || '');
            setShowDetailModal(true);
          }
        };

        return (
          <Space size={8} className={styles.actionButtons}>
            {running ? (
              <Button
                type="text"
                size="small"
                onClick={async () => {
                  await ServiceApi.connectDesktop({ id: record.desktopId }).then(({ code }) => {
                    if (code === FrameWorkPortalSuccessCode) message.success('连接成功');
                  });
                }}
              >
                连接
              </Button>
            ) : null}
            {stopped ? (
              <Button
                type="text"
                size="small"
                onClick={() => runDesktopAction(record, '开机', ServiceApi.startDesktop)}
              >
                开机
              </Button>
            ) : null}
            <Dropdown
              trigger="click"
              droplist={
                <Menu onClickMenuItem={handleMoreClick}>
                  {moreItems.map((item) => (
                    <Menu.Item key={item.key} disabled={item.disabled}>
                      {item.label}
                    </Menu.Item>
                  ))}
                </Menu>
              }
            >
              <Button type="text" size="small">
                更多 <IconDown />
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const tableColumnsWidth = Object.values(columnWidths).reduce((total, width) => total + width, 0);
  const tableScrollX = Math.max(tableColumnsWidth, tableContentWidth + columnWidths.action);
  const searchFieldLabel = searchFieldOptions.find((item) => item.value === searchField)?.label || '租户名';

  return (
    <Spin loading={actionLoading} className={styles.spinWrapper} block>
      <div className={styles.page}>
      <div className={styles.annotatedTabs} data-note-id="CRA-2.1">
        <Tabs
          activeTab={cloudType}
          className={styles.cloudScopeTabs}
          headerPadding={false}
          onChange={handleCloudTypeChange}
          type="rounded"
        >
          {cloudTypeItems.map((item) => (
            <TabPane key={item.key} title={item.label} />
          ))}
        </Tabs>
      </div>

      <Card className={styles.statCard}>
        <Row align="center" gutter={48}>
          <Col flex="310px">
            <Space size={24}>
              <Image src={wuyingCloudImg} alt="云桌面" width={90} height={90} preview={false} />
              <Statistic title="云桌面总数" value={statisticInfo?.totalNum || 0} />
            </Space>
          </Col>
          <Col flex="none">
            <Divider type="vertical" className={styles.statDivider} />
          </Col>
          <Col flex="auto">
            <Row justify="space-around">
              <Col flex="none">
                <Space size={16}>
                  <Progress
                    type="circle"
                    percent={statisticInfo?.runningPer || 0}
                    width={60}
                    strokeWidth={12}
                    showText={false}
                    color={WuYingStatusInfo[WuyingStatusEnum.RUNNING].color}
                    trailColor="var(--color-primary-light-1)"
                  />
                  <Statistic title="运行中" value={statisticInfo?.runningNum || 0} />
                </Space>
              </Col>
              <Col flex="none">
                <Space size={16}>
                  <Progress
                    type="circle"
                    percent={statisticInfo?.connectedPer || 0}
                    width={60}
                    strokeWidth={12}
                    showText={false}
                    color={WuYingStatusInfo[WuyingStatusEnum.CONNECTED].color}
                    trailColor="var(--color-warning-light-1)"
                  />
                  <Statistic title="已连接" value={statisticInfo?.connectedNum || 0} />
                </Space>
              </Col>
              <Col flex="none">
                <Space size={16}>
                  <Progress
                    type="circle"
                    percent={statisticInfo?.stoppedPer || 0}
                    width={60}
                    strokeWidth={12}
                    showText={false}
                    color={WuYingStatusInfo[WuyingStatusEnum.STOPPED].color}
                    trailColor="var(--color-danger-light-1)"
                  />
                  <Statistic title="已关机" value={statisticInfo?.stoppedNum || 0} />
                </Space>
              </Col>
              <Col flex="none">
                <Space size={16}>
                  <Progress
                    type="circle"
                    percent={statisticInfo?.expiredPer || 0}
                    width={60}
                    strokeWidth={12}
                    showText={false}
                    color={WuYingStatusInfo[WuyingStatusEnum.EXPIRED].color}
                    trailColor="var(--color-fill-2)"
                  />
                  <Statistic title="已到期" value={statisticInfo?.expiredNum || 0} />
                </Space>
              </Col>
              <Col flex="none">
                <Space size={16}>
                  <Progress
                    type="circle"
                    percent={statisticInfo?.releasePeriodPer || 0}
                    width={60}
                    strokeWidth={12}
                    showText={false}
                    color={WuYingStatusInfo[WuyingStatusEnum.RELEASE_PERIOD].color}
                    trailColor="var(--color-warning-light-1)"
                  />
                  <Statistic title="释放期" value={statisticInfo?.releasePeriodNum || 0} />
                </Space>
              </Col>
              <Col flex="none">
                <Space size={16}>
                  <Progress
                    type="circle"
                    percent={statisticInfo?.unsubscribingPer || 0}
                    width={60}
                    strokeWidth={12}
                    showText={false}
                    color={WuYingStatusInfo[WuyingStatusEnum.UNSUBSCRIBING].color}
                    trailColor="var(--color-primary-light-1)"
                  />
                  <Statistic title="释放中" value={statisticInfo?.unsubscribingNum || 0} />
                </Space>
              </Col>
              <Col flex="none">
                <Space size={16}>
                  <Progress
                    type="circle"
                    percent={statisticInfo?.unsubscribeFailedPer || 0}
                    width={60}
                    strokeWidth={12}
                    showText={false}
                    color={WuYingStatusInfo[WuyingStatusEnum.UNSUBSCRIBE_FAILED].color}
                    trailColor="var(--color-danger-light-1)"
                  />
                  <Statistic title="释放失败" value={statisticInfo?.unsubscribeFailedNum || 0} />
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} className={styles.tableCard}>
        <div ref={tableContentRef} className={styles.tableContent}>
          <div className={styles.toolbar}>
            <Space align="start" className={styles.toolbarFilters}>
              <Form
                form={form}
                className={styles.toolbarForm}
                layout="inline"
                initialValues={{ searchField: 'authTenantName' }}
                onSubmit={handleSearch}
              >
                <div className={styles.keywordSearchItem}>
                  <Input.Group compact className={`${styles.keywordSearchGroup} qsb-arco-composite-search`}>
                    <Form.Item field="searchField" noStyle>
                      <Select className={styles.keywordFieldSelect} options={searchFieldOptions} />
                    </Form.Item>
                    <Form.Item field="keyword" noStyle>
                      <Input.Search
                        allowClear
                        className={styles.keywordSearchInput}
                        placeholder={`请输入${searchFieldLabel}`}
                        onSearch={handleSearch}
                      />
                    </Form.Item>
                  </Input.Group>
                </div>
                <Form.Item field="robotStatus">
                  <Select
                    allowClear
                    className={styles.statusFilter}
                    placeholder="机器人状态"
                    options={OnlineStateArr.map((item) => ({
                      value: item.key,
                      label: item.value,
                    }))}
                    onChange={handleSearch}
                  />
                </Form.Item>
                <Form.Item field="desktopStatus">
                  <Select
                    allowClear
                    className={styles.statusFilter}
                    placeholder="云桌面状态"
                    options={WuYingStatusArr.map((item) => ({
                      value: item.key,
                      label: item.value,
                    }))}
                    onChange={handleSearch}
                  />
                </Form.Item>
                <Form.Item field="creationTimeRange">
                  <AnnotationMarker noteId="CRA-2.3">
                    <DatePicker.RangePicker
                      allowClear
                      className={styles.creationTimeFilter}
                      format="YYYY-MM-DD"
                      placeholder={['创建时间起', '创建时间止']}
                      onChange={handleSearch}
                    />
                  </AnnotationMarker>
                </Form.Item>
                <Form.Item>
                  <Button
                    aria-label="刷新"
                    htmlType="button"
                    icon={<IconSync />}
                    title="刷新"
                    onClick={handleRefresh}
                  />
                </Form.Item>
              </Form>
            </Space>
            <Space size={8}>
              <AnnotationMarker noteId="CRA-2.4">
                <Button icon={<IconExport />} loading={exportLoading} onClick={handleExport}>
                  导出
                </Button>
              </AnnotationMarker>
            </Space>
          </div>
          <Table<TableRow>
            rowKey="key"
            loading={loading}
            columns={columns}
            components={{ header: { th: ResizableHeaderCell } }}
            data={tableData}
            expandedRowKeys={expandedRowKeys as (string | number)[]}
            onExpandedRowsChange={(keys) => setExpandedRowKeys([...keys])}
            scroll={{
              x: tableScrollX,
              y: tableScrollY,
            }}
            pagination={{
              current: Number(dataList.current || 1),
              pageSize: Number(dataList.size || 20),
              total: Number(dataList.total || 0),
              sizeCanChange: true,
              showJumper: true,
              sizeOptions: [20, 50],
              showTotal: (total) => `共 ${total} 条`,
              onChange: (pageNo, pageSize) => queryList({ pageNo, pageSize }),
            }}
          />
        </div>
      </Card>

      <Detail
        id={currentId}
        visible={showDetailModal}
        ok={() => setShowDetailModal(false)}
        onClose={() => setShowDetailModal(false)}
      />
      </div>
    </Spin>
  );
}
