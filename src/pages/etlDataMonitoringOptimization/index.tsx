import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Cascader,
  Checkbox,
  DatePicker,
  Dropdown,
  Empty,
  Input,
  Message,
  Modal,
  Pagination,
  Radio,
  Select,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import {
  IconCheckCircleFill,
  IconClose,
  IconCloseCircleFill,
  IconExclamationCircleFill,
  IconInfoCircle,
  IconLeft,
  IconPauseCircleFill,
  IconPlus,
  IconRefresh,
  IconSettings,
} from '@arco-design/web-react/icon';
import {
  aggregateTaskFinalStatus,
  classifyTaskFinalStatus,
} from './statusModel';
import type {
  DateStatus,
  StageStatus,
  TaskStageFacts,
} from './statusModel';
import styles from './index.module.less';

const { TabPane } = Tabs;

type ViewDimension = 'store' | 'table';
type DimensionScope = 'all' | 'custom';
type StatusFilter = DateStatus;
type IssueStage = '取数执行' | '数据入库' | '数据校验';
type DetailSearchField = 'taskName' | 'storeName' | 'connectorName' | 'tableName';
type DetailStatusFilterField = 'collectStatus' | 'importStatus' | 'validationStatus';
type DetailStatusFilterValue = StageStatus;
type StoreColumnKey =
  | 'channel'
  | 'platform'
  | 'storeName'
  | 'fetchTimeRange'
  | 'relatedTasks'
  | `date:${string}`;
type DetailColumnKey =
  | 'channel'
  | 'platform'
  | 'bizDate'
  | 'dataCycle'
  | 'tableName'
  | 'tableNameEn'
  | 'connectorName'
  | 'storeName'
  | 'taskName'
  | 'storageLocation'
  | 'storageTableName'
  | 'collectStatus'
  | 'importStatus'
  | 'validationStatus'
  | 'durationSeconds'
  | 'expectedImportTime'
  | 'actualImportTime'
  | 'operation';

interface MonitorView {
  id: string;
  name: string;
  description?: string;
  dimension: ViewDimension;
  scope: DimensionScope;
  selectedValues: string[];
  system?: boolean;
}

interface CustomViewDraft {
  name: string;
  description: string;
  dimension: ViewDimension;
  scope: DimensionScope;
  selectedValues: string[];
}

interface MonitorTaskResult extends TaskStageFacts {
  reason?: string;
  issueStage?: IssueStage;
  validationRule?: string;
  durationSeconds: number | string;
  actualImportTime: string;
}

interface StoreMonitorRecord {
  key: string;
  storeName: string;
  channel: string;
  platform: string;
  taskResults: Record<string, MonitorTaskResult[]>;
}

interface TableMonitorRecord {
  key: string;
  tableName: string;
  tableNameEn: string;
  connectorName: string;
  taskResults: Record<string, MonitorTaskResult[]>;
}

interface StoreDrilldownState {
  storeName: string;
  date: string;
}

interface TableDrilldownState {
  tableKey: string;
  date: string;
}

interface StoreDrilldownRecord {
  key: string;
  channel: string;
  platform: string;
  bizDate: string;
  dataCycle: string;
  tableName: string;
  tableNameEn: string;
  connectorName: string;
  storeName: string;
  taskName: string;
  storageLocation: string;
  storageTableName: string;
  collectStatus: StageStatus;
  importStatus: StageStatus;
  validationStatus: StageStatus;
  issueStage?: IssueStage;
  errorCode?: string;
  durationSeconds: number | string;
  expectedImportTime: string;
  actualImportTime: string;
  reason?: string;
}

const storeOptions = [
  '内亲拼多多旗舰店',
  '永博京东旗舰店',
  '好麦多抖音旗舰店',
  '蓝漂天猫旗舰店',
  '派蒙小红书店',
  '森森淘宝旗舰店',
  '逐本唯品会专营店',
];

const tableOptions = [
  '订单履约费用明细',
  '商品货款结算明细',
  '直播间成交报表',
  '会员复购分析',
  '搜索词效果明细',
  '商品流量来源明细',
  '售后服务费明细',
];

const successTask = (
  reason = '数据已入库，表校验全部通过',
  validationStatus: StageStatus = '正常',
): MonitorTaskResult => ({
  collectStatus: '成功',
  importStatus: '成功',
  validationStatus,
  reason,
  durationSeconds: 168,
  actualImportTime: '2026-07-15 08:36:18',
});

const collectErrorTask = (errorCode: string, reason: string): MonitorTaskResult => ({
  collectStatus: '失败',
  importStatus: '无任务',
  validationStatus: '无任务',
  collectErrorCode: errorCode,
  issueStage: '取数执行',
  reason,
  durationSeconds: errorCode.startsWith('1') ? 96 : 312,
  actualImportTime: '--',
});

const importErrorTask = (errorCode: string, reason: string): MonitorTaskResult => ({
  collectStatus: '成功',
  importStatus: '失败',
  validationStatus: '无任务',
  importErrorCode: errorCode,
  issueStage: '数据入库',
  reason,
  durationSeconds: 312,
  actualImportTime: '--',
});

const validationAbnormalTask = (
  validationRule: string,
  reason: string,
): MonitorTaskResult => ({
  collectStatus: '成功',
  importStatus: '成功',
  validationStatus: '异常',
  validationRule,
  issueStage: '数据校验',
  reason,
  durationSeconds: 214,
  actualImportTime: '2026-07-15 08:42:09',
});

const waitingTask = (reason: string): MonitorTaskResult => ({
  collectStatus: '运行中',
  importStatus: '等待',
  validationStatus: '无任务',
  reason,
  durationSeconds: '--',
  actualImportTime: '--',
});

const noTask = (reason: string): MonitorTaskResult => ({
  collectStatus: '无任务',
  importStatus: '无任务',
  validationStatus: '无任务',
  reason,
  durationSeconds: '--',
  actualImportTime: '--',
});

const taskScenario = (primary: MonitorTaskResult): MonitorTaskResult[] => [
  primary,
  successTask(),
  successTask('数据已入库，未开启表校验', '无任务'),
];

const noTaskScenario = (reason: string): MonitorTaskResult[] => [
  noTask(reason),
  noTask(reason),
  noTask(reason),
];

const initialViews: MonitorView[] = [
  {
    id: 'all-store',
    name: '全量店铺',
    description: '全量店铺的汇总状态监控',
    dimension: 'store',
    scope: 'all',
    selectedValues: [],
    system: true,
  },
  {
    id: 'all-table',
    name: '全量数据表',
    description: '全量数据表的汇总状态监控',
    dimension: 'table',
    scope: 'all',
    selectedValues: [],
    system: true,
  },
  {
    id: 'custom-store-1',
    name: '重点店铺',
    description: '关注核心店铺采集与入库状态',
    dimension: 'store',
    scope: 'custom',
    selectedValues: ['内亲拼多多旗舰店', '森森淘宝旗舰店'],
  },
  {
    id: 'custom-table-1',
    name: 'dasdsad',
    description: '关注核心数据表近 7 日状态',
    dimension: 'table',
    scope: 'custom',
    selectedValues: ['订单履约费用明细', '商品货款结算明细'],
  },
];

const storeRecords: StoreMonitorRecord[] = [
  {
    key: 'store-1',
    storeName: '内亲拼多多旗舰店',
    channel: '电商平台',
    platform: '拼多多',
    taskResults: {
      '2026-07-14': taskScenario(importErrorTask('2003', '存在映射关系不存在的字段')),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(waitingTask('任务运行中，等待平台文件生成')),
      '2026-07-11': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
      '2026-07-10': taskScenario(validationAbnormalTask('字段求和', '履约费用字段求和超出配置范围')),
      '2026-07-09': noTaskScenario('对应业务日期所选店铺无任务'),
      '2026-07-08': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
    },
  },
  {
    key: 'store-2',
    storeName: '永博京东旗舰店',
    channel: '电商平台',
    platform: '京东',
    taskResults: {
      '2026-07-14': taskScenario(validationAbnormalTask('字段非空', '结算金额字段存在空值')),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(successTask()),
      '2026-07-11': taskScenario(collectErrorTask('3001', 'Chrome 类型元素查找失败')),
      '2026-07-10': noTaskScenario('对应业务日期所选店铺无任务'),
      '2026-07-09': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
      '2026-07-08': taskScenario(successTask()),
    },
  },
  {
    key: 'store-3',
    storeName: '好麦多抖音旗舰店',
    channel: '内容电商',
    platform: '抖音',
    taskResults: {
      '2026-07-14': taskScenario(validationAbnormalTask('字段求和', '成交金额较前 7 日均值下降 92%')),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(successTask()),
      '2026-07-11': taskScenario(successTask()),
      '2026-07-10': taskScenario(waitingTask('任务运行中，包含等待重试')),
      '2026-07-09': taskScenario(successTask()),
      '2026-07-08': taskScenario(successTask()),
    },
  },
  {
    key: 'store-4',
    storeName: '蓝漂天猫旗舰店',
    channel: '电商平台',
    platform: '天猫',
    taskResults: {
      '2026-07-14': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(validationAbnormalTask('字段求和', '会员复购率低于配置阈值')),
      '2026-07-11': taskScenario(successTask()),
      '2026-07-10': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
      '2026-07-09': taskScenario(collectErrorTask('2201', '平台页面可能改版')),
      '2026-07-08': taskScenario(successTask()),
    },
  },
  {
    key: 'store-5',
    storeName: '派蒙小红书店',
    channel: '内容电商',
    platform: '小红书',
    taskResults: {
      '2026-07-14': taskScenario(waitingTask('任务运行中，平台报表仍在生成中')),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(successTask()),
      '2026-07-11': noTaskScenario('对应业务日期所选数据源无任务'),
      '2026-07-10': taskScenario(collectErrorTask('1103', '当前账号密码不匹配')),
      '2026-07-09': taskScenario(successTask()),
      '2026-07-08': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
    },
  },
  {
    key: 'store-6',
    storeName: '森森淘宝旗舰店',
    channel: '电商平台',
    platform: '淘宝',
    taskResults: {
      '2026-07-14': taskScenario(waitingTask('任务运行中，等待入库完成')),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(collectErrorTask('2101', '平台报表生成等待超时')),
      '2026-07-11': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
      '2026-07-10': taskScenario(successTask()),
      '2026-07-09': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
      '2026-07-08': noTaskScenario('对应业务日期所选店铺无任务'),
    },
  },
  {
    key: 'store-7',
    storeName: '逐本唯品会专营店',
    channel: '电商平台',
    platform: '唯品会',
    taskResults: {
      '2026-07-14': taskScenario(successTask()),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
      '2026-07-11': taskScenario(successTask()),
      '2026-07-10': taskScenario(validationAbnormalTask('记录值范围', '售后服务费超出配置范围')),
      '2026-07-09': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
      '2026-07-08': taskScenario(successTask()),
    },
  },
];

const tableDateColumns = [
  '2026-07-14',
  '2026-07-13',
  '2026-07-12',
  '2026-07-11',
  '2026-07-10',
  '2026-07-09',
  '2026-07-08',
];

const dynamicFetchTimeRange = `${tableDateColumns[tableDateColumns.length - 1]} 至 ${tableDateColumns[0]}`;

const storeColumnOptions: Array<{ key: StoreColumnKey; label: string; disabled?: boolean }> = [
  { key: 'channel', label: '平台类型' },
  { key: 'platform', label: '子平台' },
  { key: 'storeName', label: '店铺名称', disabled: true },
  { key: 'fetchTimeRange', label: '动态取数时间范围' },
  { key: 'relatedTasks', label: '关联任务', disabled: true },
  ...tableDateColumns.map((date) => ({ key: `date:${date}` as StoreColumnKey, label: date })),
];

const fixedStoreColumnKeys = storeColumnOptions
  .filter((option) => option.disabled)
  .map((option) => option.key);

const tableRecords: TableMonitorRecord[] = [
  {
    key: 'table-1',
    tableName: '订单履约费用明细',
    tableNameEn: 'order_fulfillment_fee_detail',
    connectorName: '拼多多-店铺经营数据',
    taskResults: {
      '2026-07-14': taskScenario(importErrorTask('2003', '存在映射关系不存在的字段')),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(waitingTask('任务运行中，等待平台文件生成')),
      '2026-07-11': taskScenario(successTask()),
      '2026-07-10': taskScenario(successTask()),
      '2026-07-09': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
      '2026-07-08': taskScenario(successTask()),
    },
  },
  {
    key: 'table-2',
    tableName: '商品货款结算明细',
    tableNameEn: 'jd_goods_settlement_detail',
    connectorName: '京东-结算中心',
    taskResults: {
      '2026-07-14': taskScenario(validationAbnormalTask('字段非空', '结算金额字段存在空值')),
      '2026-07-13': taskScenario(validationAbnormalTask('记录值范围', '记录值超出配置范围')),
      '2026-07-12': taskScenario(waitingTask('任务运行中，等待入库任务')),
      '2026-07-11': taskScenario(successTask()),
      '2026-07-10': taskScenario(successTask()),
      '2026-07-09': taskScenario(collectErrorTask('3201', '跨域执行 JS 出现异常')),
      '2026-07-08': taskScenario(successTask()),
    },
  },
  {
    key: 'table-3',
    tableName: '直播间成交报表',
    tableNameEn: 'douyin_live_trade_report',
    connectorName: '抖音-罗盘数据',
    taskResults: {
      '2026-07-14': taskScenario(successTask()),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(successTask()),
      '2026-07-11': taskScenario(validationAbnormalTask('字段求和', '成交金额波动超出配置阈值')),
      '2026-07-10': taskScenario(successTask()),
      '2026-07-09': taskScenario(successTask()),
      '2026-07-08': noTaskScenario('对应业务日期所选数据表无任务'),
    },
  },
  {
    key: 'table-4',
    tableName: '搜索词效果明细',
    tableNameEn: 'red_search_keyword_detail',
    connectorName: '小红书-聚光投放',
    taskResults: {
      '2026-07-14': taskScenario(waitingTask('任务运行中，平台报表仍在生成中')),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(successTask()),
      '2026-07-11': taskScenario(successTask()),
      '2026-07-10': taskScenario(successTask()),
      '2026-07-09': taskScenario(successTask()),
      '2026-07-08': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
    },
  },
];

const statusFilterOptions: { label: string; value: StatusFilter }[] = [
  { label: '失败', value: 'failed' },
  { label: '异常', value: 'abnormal' },
  { label: '等待', value: 'waiting' },
  { label: '成功', value: 'success' },
  { label: '无任务', value: 'noTask' },
];

const stageStatusFilterOptions: { label: StageStatus; value: StageStatus }[] = [
  { label: '成功', value: '成功' },
  { label: '失败', value: '失败' },
  { label: '运行中', value: '运行中' },
  { label: '等待', value: '等待' },
  { label: '正常', value: '正常' },
  { label: '异常', value: '异常' },
  { label: '无数据', value: '无数据' },
  { label: '无任务', value: '无任务' },
];

const detailSearchFieldOptions: { label: string; value: DetailSearchField }[] = [
  { label: '任务名', value: 'taskName' },
  { label: '店铺名', value: 'storeName' },
  { label: '数据源名', value: 'connectorName' },
  { label: '表名', value: 'tableName' },
];

const detailStatusFilterFieldOptions: { label: string; value: DetailStatusFilterField }[] = [
  { label: '取数执行', value: 'collectStatus' },
  { label: '数据入库', value: 'importStatus' },
  { label: '数据校验', value: 'validationStatus' },
];

const dateStatusMeta: Record<DateStatus, { label: string; color: string; fallbackReason: string }> = {
  success: {
    label: '成功',
    color: 'green',
    fallbackReason: '数据已成功入库，表校验关闭或全部通过',
  },
  abnormal: {
    label: '异常',
    color: 'orange',
    fallbackReason: '客户侧取数异常或入库后表校验不通过',
  },
  failed: {
    label: '失败',
    color: 'red',
    fallbackReason: '平台侧/RPA 流程侧取数失败或数据入库失败',
  },
  waiting: {
    label: '等待',
    color: 'arcoblue',
    fallbackReason: '取数、重试、入库或校验尚未结束',
  },
  noTask: {
    label: '无任务',
    color: 'gray',
    fallbackReason: '对应业务日期所选数据源或店铺无任务',
  },
};

const getDateStatusIcon = (status: DateStatus) => {
  switch (status) {
    case 'success':
      return <IconCheckCircleFill />;
    case 'abnormal':
      return <IconExclamationCircleFill />;
    case 'failed':
      return <IconCloseCircleFill />;
    case 'waiting':
      return <IconPauseCircleFill />;
    case 'noTask':
    default:
      return null;
  }
};

const stageStatusColorMap: Record<StageStatus, string> = {
  成功: 'green',
  失败: 'red',
  运行中: 'arcoblue',
  等待: 'arcoblue',
  正常: 'green',
  异常: 'orange',
  无数据: 'gray',
  无任务: 'gray',
};

const getStageStatusIcon = (status: StageStatus) => {
  switch (status) {
    case '成功':
    case '正常':
    case '无数据':
      return <IconCheckCircleFill />;
    case '失败':
      return <IconCloseCircleFill />;
    case '异常':
      return <IconExclamationCircleFill />;
    case '运行中':
    case '等待':
      return <IconPauseCircleFill />;
    case '无任务':
    default:
      return null;
  }
};

const compactSameDateRange = (dateText: string) => {
  const sameDateRange = dateText.match(/^(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})$/);
  if (sameDateRange && sameDateRange[1] === sameDateRange[2]) return sameDateRange[1];
  return dateText;
};

const splitReasonText = (text: string) => {
  const normalized = text.trim();
  if (!normalized) return [];

  const numberedItems = Array.from(
    normalized.matchAll(/(?:^|\s)(?:\d+[.．、]\s*)(.*?)(?=(?:\s\d+[.．、]\s*)|$)/g),
  )
    .map((match) => match[1].trim())
    .filter(Boolean);

  if (numberedItems.length) return numberedItems;
  return [normalized];
};

const normalizeReasonList = (reasons?: string[]) => (
  (reasons || [])
    .flatMap(splitReasonText)
    .filter(Boolean)
);

const formatIssueSummary = ({
  issueStage,
  errorCode,
  reason,
}: Pick<StoreDrilldownRecord, 'issueStage' | 'errorCode' | 'reason'>) => {
  const locator = [issueStage, errorCode].filter(Boolean).join(' / ');
  if (locator && reason) return `${locator}：${reason}`;
  return locator || reason || '-';
};

const formatStageIssueDetail = ({
  errorCode,
  reason,
}: Pick<StoreDrilldownRecord, 'errorCode' | 'reason'>) => {
  if (errorCode && reason) return `错误码：${errorCode}；原因：${reason}`;
  if (errorCode) return `错误码：${errorCode}`;
  if (reason) return `原因：${reason}`;
  return undefined;
};

const statusHelpItems: Array<{ status: DateStatus; description: string }> = [
  { status: 'failed', description: '取数错误码为 2xxx/3xxx，或数据入库失败' },
  { status: 'abnormal', description: '取数错误码为 1xxx，或入库后表校验不通过' },
  { status: 'waiting', description: '取数、重试、入库或校验尚未结束' },
  { status: 'success', description: '成功入库，且表校验关闭或全部通过' },
  { status: 'noTask', description: '全部明细均无实际任务' },
];

const detailColumnOptions: Array<{ key: DetailColumnKey; label: string; disabled?: boolean }> = [
  { key: 'channel', label: '平台类型', disabled: true },
  { key: 'platform', label: '子平台', disabled: true },
  { key: 'bizDate', label: '数据日期', disabled: true },
  { key: 'dataCycle', label: '数据周期' },
  { key: 'tableName', label: '报表表名(中文)' },
  { key: 'tableNameEn', label: '报表表名(英文)' },
  { key: 'connectorName', label: '数据源' },
  { key: 'storeName', label: '店铺' },
  { key: 'taskName', label: '关联任务名' },
  { key: 'storageLocation', label: '存储位置' },
  { key: 'storageTableName', label: '存储表名称' },
  { key: 'collectStatus', label: '取数执行' },
  { key: 'importStatus', label: '数据入库' },
  { key: 'validationStatus', label: '数据校验' },
  { key: 'durationSeconds', label: '执行耗时（秒）' },
  { key: 'expectedImportTime', label: '预计入库时间' },
  { key: 'actualImportTime', label: '实际入库时间' },
  { key: 'operation', label: '操作', disabled: true },
];

const fixedDetailColumnKeys = detailColumnOptions
  .filter((option) => option.disabled)
  .map((option) => option.key);

const drilldownTableSamples = [
  { tableName: '订单履约费用明细', tableNameEn: 'order_fulfillment_fee_detail' },
  { tableName: '商品货款结算明细', tableNameEn: 'goods_settlement_detail' },
  { tableName: '直播间成交报表', tableNameEn: 'live_trade_report' },
  { tableName: '会员复购分析', tableNameEn: 'member_repurchase' },
  { tableName: '搜索词效果明细', tableNameEn: 'search_keyword_detail' },
  { tableName: '商品流量来源明细', tableNameEn: 'item_traffic_source' },
  { tableName: '售后服务费明细', tableNameEn: 'after_sale_fee_detail' },
];

const platformCodeMap: Record<string, string> = {
  拼多多: 'pdd',
  京东: 'jd',
  抖音: 'douyin',
  天猫: 'tmall',
  小红书: 'red',
  淘宝: 'tb',
  唯品会: 'vip',
};

const getTaskName = (platform: string, tableName: string) => `${platform}${tableName}采集`;

const getStoreTaskSamples = (storeRecord: StoreMonitorRecord) => {
  const storeIndex = Math.max(0, storeRecords.findIndex((record) => record.key === storeRecord.key));
  const sampleStart = storeIndex % drilldownTableSamples.length;
  return [
    drilldownTableSamples[sampleStart],
    drilldownTableSamples[(sampleStart + 1) % drilldownTableSamples.length],
    drilldownTableSamples[(sampleStart + 2) % drilldownTableSamples.length],
  ];
};

const getStoreRelatedTasks = (storeRecord: StoreMonitorRecord) => (
  getStoreTaskSamples(storeRecord).map((sample) => getTaskName(storeRecord.platform, sample.tableName))
);

const getPlatformInfoByConnector = (connectorName: string) => {
  const platform = Object.keys(platformCodeMap).find((item) => connectorName.includes(item)) || '拼多多';
  const store = storeRecords.find((record) => record.platform === platform);

  return {
    platform,
    channel: store?.channel || '电商平台',
  };
};

const getTableRelatedStores = (tableRecord: TableMonitorRecord) => {
  const { platform } = getPlatformInfoByConnector(tableRecord.connectorName);
  const matchedStores = storeRecords.filter((store) => store.platform === platform);
  const fallbackStores = storeRecords.filter((store) => !matchedStores.some((matched) => matched.key === store.key));
  return [...matchedStores, ...fallbackStores].slice(0, 3);
};

const getTableRelatedTasks = (tableRecord: TableMonitorRecord) => (
  getTableRelatedStores(tableRecord).map((store) => getTaskName(store.platform, tableRecord.tableName))
);

const getTaskReason = (taskResult: MonitorTaskResult) => (
  taskResult.validationRule
    ? `${taskResult.validationRule}：${taskResult.reason}`
    : taskResult.reason
);

const getTaskErrorCode = (taskResult: MonitorTaskResult) => (
  taskResult.collectErrorCode || taskResult.importErrorCode
);

const getDrilldownFinalStatus = (record: StoreDrilldownRecord) => (
  classifyTaskFinalStatus({
    collectStatus: record.collectStatus,
    importStatus: record.importStatus,
    validationStatus: record.validationStatus,
    collectErrorCode: record.issueStage === '取数执行' ? record.errorCode : undefined,
    importErrorCode: record.issueStage === '数据入库' ? record.errorCode : undefined,
  })
);

const createStoreDrilldownRecords = (
  storeRecord: StoreMonitorRecord,
  date: string,
): StoreDrilldownRecord[] => {
  const taskResults = storeRecord.taskResults[date] || [];
  if (aggregateTaskFinalStatus(taskResults) === 'noTask') return [];

  const compactDate = compactSameDateRange(date);
  const sampleTables = getStoreTaskSamples(storeRecord);

  return sampleTables.map((sample, index) => {
    const taskResult = taskResults[index] || successTask();
    const platformCode = platformCodeMap[storeRecord.platform] || 'platform';
    const tableNameEn = `${platformCode}_${sample.tableNameEn}`;

    return {
      key: `${storeRecord.key}-${date}-${index}`,
      channel: storeRecord.channel,
      platform: storeRecord.platform,
      bizDate: compactDate,
      dataCycle: '日',
      tableName: sample.tableName,
      tableNameEn,
      connectorName: `${storeRecord.platform}-经营数据`,
      storeName: storeRecord.storeName,
      taskName: getTaskName(storeRecord.platform, sample.tableName),
      storageLocation: '取数宝数据仓库 / ods',
      storageTableName: `ods_${tableNameEn}`,
      collectStatus: taskResult.collectStatus,
      importStatus: taskResult.importStatus,
      validationStatus: taskResult.validationStatus,
      issueStage: taskResult.issueStage,
      errorCode: getTaskErrorCode(taskResult),
      durationSeconds: taskResult.durationSeconds,
      expectedImportTime: '2026-07-15 08:30:00',
      actualImportTime: taskResult.actualImportTime,
      reason: getTaskReason(taskResult),
    };
  });
};

const createTableDrilldownRecords = (
  tableRecord: TableMonitorRecord,
  date: string,
): StoreDrilldownRecord[] => {
  const taskResults = tableRecord.taskResults[date] || [];
  if (aggregateTaskFinalStatus(taskResults) === 'noTask') return [];

  const compactDate = compactSameDateRange(date);
  const relatedStores = getTableRelatedStores(tableRecord);

  return relatedStores.map((storeRecord, index) => {
    const taskResult = taskResults[index] || successTask();
    const platformCode = platformCodeMap[storeRecord.platform] || 'platform';
    const tableNameEn = tableRecord.tableNameEn.startsWith(`${platformCode}_`)
      ? tableRecord.tableNameEn
      : `${platformCode}_${tableRecord.tableNameEn}`;

    return {
      key: `${tableRecord.key}-${date}-${storeRecord.key}-${index}`,
      channel: storeRecord.channel,
      platform: storeRecord.platform,
      bizDate: compactDate,
      dataCycle: '日',
      tableName: tableRecord.tableName,
      tableNameEn,
      connectorName: tableRecord.connectorName,
      storeName: storeRecord.storeName,
      taskName: getTaskName(storeRecord.platform, tableRecord.tableName),
      storageLocation: '取数宝数据仓库 / ods',
      storageTableName: `ods_${tableNameEn}`,
      collectStatus: taskResult.collectStatus,
      importStatus: taskResult.importStatus,
      validationStatus: taskResult.validationStatus,
      issueStage: taskResult.issueStage,
      errorCode: getTaskErrorCode(taskResult),
      durationSeconds: taskResult.durationSeconds,
      expectedImportTime: '2026-07-15 08:30:00',
      actualImportTime: taskResult.actualImportTime,
      reason: getTaskReason(taskResult),
    };
  });
};

const getStoreAggregatedStatus = (record: StoreMonitorRecord, date: string) => (
  aggregateTaskFinalStatus(record.taskResults[date] || [])
);

const getTableAggregatedStatus = (record: TableMonitorRecord, date: string) => (
  aggregateTaskFinalStatus(record.taskResults[date] || [])
);

const getAggregatedReason = (taskResults: MonitorTaskResult[], status: DateStatus) => (
  taskResults.find((taskResult) => classifyTaskFinalStatus(taskResult) === status)?.reason
);

const getAggregatedStatusValue = (taskResults: MonitorTaskResult[]) => {
  const status = aggregateTaskFinalStatus(taskResults);
  return {
    status,
    reason: getAggregatedReason(taskResults, status),
  };
};

const emptyDraft: CustomViewDraft = {
  name: '',
  description: '',
  dimension: 'store',
  scope: 'all',
  selectedValues: [],
};

const getViewScopeLabel = (view: MonitorView) => {
  if (view.scope === 'all') return '全部';
  return view.selectedValues.length ? view.selectedValues.join('，') : '自定义';
};

function DateStatusCell({
  value,
  onClick,
  reasons,
}: {
  value?: { status: DateStatus; reason?: string };
  onClick?: () => void;
  reasons?: string[];
}) {
  if (!value) return <span className={styles.dateStatusEmpty}>--</span>;

  const meta = dateStatusMeta[value.status];
  const icon = getDateStatusIcon(value.status);
  const tooltipReasons = normalizeReasonList(reasons);
  const tooltipContent = tooltipReasons.length ? (
    <ol className={styles.reasonList}>
      {tooltipReasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </ol>
  ) : value.reason || meta.fallbackReason;
  const titleText = tooltipReasons.length
    ? tooltipReasons.map((reason, index) => `${index + 1}. ${reason}`).join('\n')
    : value.reason || meta.fallbackReason;
  const canDrillDown = Boolean(onClick && value.status !== 'noTask');
  const tag = (
    <Tag className={`${styles.statusTag} ${styles.dateStatusTag}`} color={meta.color}>
      {icon ? (
        <span className={styles.statusTagContent}>
          {icon}
          <span>{meta.label}</span>
        </span>
      ) : meta.label}
    </Tag>
  );
  const node = canDrillDown ? (
    <span className={styles.dateStatusCell}>
      <button
        className={styles.dateStatusButton}
        type="button"
        aria-label={`查看${meta.label}明细`}
        onClick={onClick}
      >
        {tag}
      </button>
      <button
        className={styles.drilldownButton}
        type="button"
        aria-label={`下钻查看${meta.label}明细`}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.();
        }}
      >
        <span>下钻</span>
      </button>
    </span>
  ) : tag;

  return (
    <Tooltip content={tooltipContent}>
      <span className={styles.statusTooltipTarget} title={titleText}>
        {node}
      </span>
    </Tooltip>
  );
}

function StageStatusTag({
  status,
  reason,
}: {
  status: StageStatus;
  reason?: string;
}) {
  const icon = getStageStatusIcon(status);
  const tag = (
    <Tag className={styles.statusTag} color={stageStatusColorMap[status]}>
      {icon ? (
        <span className={styles.statusTagContent}>
          {icon}
          <span>{status}</span>
        </span>
      ) : status}
    </Tag>
  );

  if (!reason) return tag;

  return (
    <Tooltip content={reason}>
      <span className={styles.statusTooltipTarget} title={reason}>
        {tag}
      </span>
    </Tooltip>
  );
}

function StatusHelpContent() {
  return (
    <div className={styles.statusHelp}>
      {statusHelpItems.map((item) => {
        const meta = dateStatusMeta[item.status];
        const icon = getDateStatusIcon(item.status);

        return (
          <div key={item.status} className={styles.statusHelpItem}>
            <Tag className={`${styles.statusTag} ${styles.statusHelpTag}`} color={meta.color}>
              {icon ? (
                <span className={styles.statusTagContent}>
                  {icon}
                  <span>{meta.label}</span>
                </span>
              ) : meta.label}
            </Tag>
            <span className={styles.statusHelpDescription}>{item.description}</span>
          </div>
        );
      })}
    </div>
  );
}

function RelatedTasksCell({ tasks }: { tasks: string[] }) {
  if (!tasks.length) return <span className={styles.dateStatusEmpty}>--</span>;
  const taskText = tasks.join('、');
  const titleText = tasks.map((task, index) => `${index + 1}. ${task}`).join('\n');
  const tooltipContent = (
    <ol className={styles.taskList}>
      {tasks.map((task, index) => (
        <li key={`${task}-${index}`}>{task}</li>
      ))}
    </ol>
  );

  return (
    <Tooltip content={tooltipContent}>
      <div className={styles.relatedTasks}>
        <button
          className={`${styles.taskLink} ${styles.relatedTaskButton}`}
          type="button"
          aria-label={titleText}
          onClick={() => Message.info('跳转到对应运行记录')}
        >
          {taskText}
        </button>
      </div>
    </Tooltip>
  );
}

function DrilldownDetailView({
  title,
  date,
  records,
  emptyDescription,
  onBack,
}: {
  title: string;
  date: string;
  records: StoreDrilldownRecord[];
  emptyDescription: string;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const [statusFilterField, setStatusFilterField] = useState<DetailStatusFilterField>('collectStatus');
  const [statusFilterValue, setStatusFilterValue] = useState<DetailStatusFilterValue>();
  const [searchField, setSearchField] = useState<DetailSearchField>('taskName');
  const [keyword, setKeyword] = useState('');
  const [visibleDetailColumnKeys, setVisibleDetailColumnKeys] = useState<DetailColumnKey[]>(
    detailColumnOptions.map((option) => option.key),
  );
  const pageSize = 20;

  const toggleDetailColumn = (columnKey: DetailColumnKey, checked: boolean) => {
    if (fixedDetailColumnKeys.includes(columnKey)) return;

    setVisibleDetailColumnKeys((current) => {
      if (checked) return Array.from(new Set([...current, columnKey]));
      return current.filter((key) => key !== columnKey);
    });
  };

  const filteredRecords = useMemo(() => {
    const normalizedKeyword = keyword.trim();

    return records.filter((record) => {
      const matchKeyword = !normalizedKeyword || (() => {
        switch (searchField) {
          case 'storeName':
            return record.storeName.includes(normalizedKeyword);
          case 'connectorName':
            return record.connectorName.includes(normalizedKeyword);
          case 'tableName':
            return record.tableName.includes(normalizedKeyword) || record.tableNameEn.includes(normalizedKeyword);
          case 'taskName':
          default:
            return record.taskName.includes(normalizedKeyword);
        }
      })();
      const matchStatus = !statusFilterValue || (() => {
        switch (statusFilterField) {
          case 'collectStatus':
            return record.collectStatus === statusFilterValue;
          case 'importStatus':
            return record.importStatus === statusFilterValue;
          case 'validationStatus':
            return record.validationStatus === statusFilterValue;
          default:
            return false;
        }
      })();

      return (
        matchKeyword
        && matchStatus
      );
    });
  }, [keyword, records, searchField, statusFilterField, statusFilterValue]);

  const pagedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);
  const compactDate = compactSameDateRange(date);
  const detailStatusValueOptions = stageStatusFilterOptions;

  const detailColumnDropdown = (
    <div className={styles.columnSettingsPanel} onClick={(event) => event.stopPropagation()}>
      <span className={styles.columnSettingsTitle}>列展示设置</span>
      {detailColumnOptions.map((option) => (
        <Checkbox
          key={option.key}
          checked={visibleDetailColumnKeys.includes(option.key)}
          disabled={option.disabled}
          onChange={(checked) => toggleDetailColumn(option.key, checked)}
        >
          {option.label}
        </Checkbox>
      ))}
    </div>
  );

  const allColumns: Array<ColumnProps<StoreDrilldownRecord> & { key: DetailColumnKey }> = [
    {
      key: 'channel',
      title: '平台类型',
      dataIndex: 'channel',
      width: 120,
    },
    { key: 'platform', title: '子平台', dataIndex: 'platform', width: 120 },
    { key: 'bizDate', title: '数据日期', dataIndex: 'bizDate', width: 120 },
    { key: 'dataCycle', title: '数据周期', dataIndex: 'dataCycle', width: 92 },
    { key: 'tableName', title: '报表表名(中文)', dataIndex: 'tableName', width: 180, ellipsis: true },
    { key: 'tableNameEn', title: '报表表名(英文)', dataIndex: 'tableNameEn', width: 200, ellipsis: true },
    { key: 'connectorName', title: '数据源', dataIndex: 'connectorName', width: 180, ellipsis: true },
    { key: 'storeName', title: '店铺', dataIndex: 'storeName', width: 180, ellipsis: true },
    {
      key: 'taskName',
      title: '关联任务名',
      dataIndex: 'taskName',
      width: 210,
      ellipsis: true,
      render: (taskName: string) => (
        <button
          className={styles.taskLink}
          type="button"
          title={taskName}
          onClick={() => Message.info('跳转到对应运行记录')}
        >
          {taskName}
        </button>
      ),
    },
    { key: 'storageLocation', title: '存储位置', dataIndex: 'storageLocation', width: 190, ellipsis: true },
    { key: 'storageTableName', title: '存储表名称', dataIndex: 'storageTableName', width: 190, ellipsis: true },
    {
      key: 'collectStatus',
      title: '取数执行',
      dataIndex: 'collectStatus',
      width: 132,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-4.2' }),
      render: (status: StageStatus, record) => (
        <div className={styles.annotationStatusCell} data-note-id="ETL-4.2">
          <StageStatusTag
            status={status}
            reason={status === '失败' && record.issueStage === '取数执行'
              ? formatStageIssueDetail(record)
              : undefined}
          />
        </div>
      ),
    },
    {
      key: 'importStatus',
      title: '数据入库',
      dataIndex: 'importStatus',
      width: 132,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-4.2' }),
      render: (status: StageStatus, record) => (
        <div className={styles.annotationStatusCell} data-note-id="ETL-4.2">
          <StageStatusTag
            status={status}
            reason={status === '失败' && record.issueStage === '数据入库'
              ? formatStageIssueDetail(record)
              : undefined}
          />
        </div>
      ),
    },
    {
      key: 'validationStatus',
      title: '数据校验',
      dataIndex: 'validationStatus',
      width: 132,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-4.2' }),
      render: (status: StageStatus, record) => (
        <div className={styles.annotationStatusCell} data-note-id="ETL-4.2">
          <StageStatusTag
            status={status}
            reason={status === '异常' && record.issueStage === '数据校验'
              ? formatStageIssueDetail(record)
              : undefined}
          />
        </div>
      ),
    },
    { key: 'durationSeconds', title: '执行耗时（秒）', dataIndex: 'durationSeconds', width: 136 },
    { key: 'expectedImportTime', title: '预计入库时间', dataIndex: 'expectedImportTime', width: 172 },
    { key: 'actualImportTime', title: '实际入库时间', dataIndex: 'actualImportTime', width: 172 },
    {
      key: 'operation',
      title: '操作',
      dataIndex: 'operation',
      width: 96,
      fixed: 'right',
      align: 'center',
      render: () => (
        <Button
          className={styles.logButton}
          type="text"
          size="mini"
          onClick={() => Message.info('打开任务日志')}
        >
          日志
        </Button>
      ),
    },
  ];

  const columns = allColumns.filter((column) => visibleDetailColumnKeys.includes(column.key));

  return (
    <div className={styles.monitorView}>
      <div className={styles.detailToolbar}>
        <div className={styles.detailTitle}>
          <Button
            className={styles.backButton}
            type="text"
            icon={<IconLeft />}
            onClick={onBack}
          >
            返回
          </Button>
          <span>{title}</span>
          <Tag className={styles.statusTag} color="arcoblue">{compactDate}</Tag>
        </div>
        <div className={styles.detailFilters}>
          <Input.Group compact className={`${styles.detailSearchGroup} qsb-arco-composite-search`}>
            <Select
              className={styles.keywordFieldSelect}
              value={searchField}
              options={detailSearchFieldOptions}
              onChange={(value) => {
                setSearchField(value as DetailSearchField);
                setPage(1);
              }}
            />
            <Input.Search
              className={styles.keywordSearch}
              allowClear
              searchButton={false}
              placeholder="请输入搜索内容"
              value={keyword}
              onChange={(value) => { setKeyword(value); setPage(1); }}
              onSearch={(value) => { setKeyword(value); setPage(1); }}
            />
          </Input.Group>
          <Input.Group compact className={styles.detailStatusFilterGroup}>
            <Select
              className={styles.detailStatusFieldSelect}
              value={statusFilterField}
              options={detailStatusFilterFieldOptions}
              onChange={(value) => {
                setStatusFilterField(value as DetailStatusFilterField);
                setStatusFilterValue(undefined);
                setPage(1);
              }}
            />
            <Select
              allowClear
              className={styles.detailStatusValueSelect}
              placeholder="请选择状态"
              value={statusFilterValue}
              options={detailStatusValueOptions}
              onChange={(value) => { setStatusFilterValue(value); setPage(1); }}
            />
          </Input.Group>
        </div>
        <div className={styles.toolbarActions}>
          <Dropdown droplist={detailColumnDropdown} position="bl" trigger="click">
            <Button
              className={styles.iconButton}
              aria-label="列设置"
              icon={<IconSettings />}
            />
          </Dropdown>
          <Tooltip content="刷新">
            <Button
              className={styles.iconButton}
              aria-label="刷新"
              icon={<IconRefresh />}
              onClick={() => Message.success('明细数据已刷新')}
            />
          </Tooltip>
        </div>
      </div>

      <Table
        className={styles.table}
        rowKey="key"
        columns={columns}
        data={pagedRecords}
        pagination={false}
        borderCell
        scroll={{ x: 2664, y: 'calc(100vh - 372px)' }}
        noDataElement={<Empty description={emptyDescription} />}
      />

      <div className={styles.pageFooter}>
        <span>共{filteredRecords.length}条</span>
        <Pagination
          total={filteredRecords.length}
          current={page}
          pageSize={pageSize}
          sizeCanChange={false}
          onChange={setPage}
        />
      </div>
    </div>
  );
}

function ViewTabs({
  views,
  activeViewId,
  onChange,
  onClose,
}: {
  views: MonitorView[];
  activeViewId: string;
  onChange: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const renderClosableTitle = (view: MonitorView) => (
    <span className={styles.tabTitle}>
      <span>{view.name}</span>
      <IconClose
        className={styles.viewTabClose}
        onClick={(event) => {
          event.stopPropagation();
          onClose(view.id);
        }}
      />
    </span>
  );

  return (
    <Tabs
      activeTab={activeViewId}
      className={styles.viewTabs}
      headerPadding={false}
      type="rounded"
      onChange={onChange}
    >
      <TabPane
        key="list"
        title={(
          <span className={styles.tabTitle}>
            <span>监控视图列表</span>
          </span>
        )}
      />
      {views.map((view) => (
        <TabPane
          key={view.id}
          title={renderClosableTitle(view)}
        />
      ))}
    </Tabs>
  );
}

function ViewList({
  views,
  onCreate,
  onOpen,
}: {
  views: MonitorView[];
  onCreate: () => void;
  onOpen: (id: string) => void;
}) {
  const [keyword, setKeyword] = useState('');

  const filteredViews = views.filter((view) => (
    !keyword.trim()
    || view.name.includes(keyword.trim())
    || view.description?.includes(keyword.trim())
  ));

  return (
    <div className={styles.viewList}>
      <div className={styles.viewListToolbar}>
        <Input.Search
          className={styles.viewSearch}
          allowClear
          searchButton={false}
          placeholder="请输入视图名称"
          value={keyword}
          onChange={setKeyword}
        />
        <Button type="primary" icon={<IconPlus />} onClick={onCreate}>
          新增自定义视图
        </Button>
      </div>
      <div className={styles.viewGrid}>
        {filteredViews.map((view, index) => (
          <button
            className={styles.viewCard}
            data-note-id={index === 0 ? 'ETL-1.1' : undefined}
            key={view.id}
            type="button"
            onClick={() => onOpen(view.id)}
          >
            <strong>{view.name}</strong>
            <span>{view.description || '--'}</span>
            <div>
              <small>{view.dimension === 'store' ? '店铺范围' : '数据表范围'}</small>
              <b>{getViewScopeLabel(view)}</b>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomViewModal({
  visible,
  draft,
  onCancel,
  onChange,
  onConfirm,
}: {
  visible: boolean;
  draft: CustomViewDraft;
  onCancel: () => void;
  onChange: (draft: CustomViewDraft) => void;
  onConfirm: () => void;
}) {
  const currentOptions = draft.dimension === 'store' ? storeOptions : tableOptions;
  const dimensionLabel = draft.dimension === 'store' ? '店铺维度' : '数据表维度';

  return (
    <Modal
      className={styles.customViewModal}
      title="自定义视图"
      visible={visible}
      okText="确定"
      cancelText="取消"
      onCancel={onCancel}
      onOk={onConfirm}
      okButtonProps={{
        disabled: !draft.name.trim() || (draft.scope === 'custom' && draft.selectedValues.length === 0),
      }}
    >
      <div className={styles.modalForm}>
        <label className={styles.formItem}>
          <span><b>*</b>视图名称</span>
          <Input
            maxLength={20}
            placeholder="请输入视图名称限 20 个字符"
            showWordLimit
            value={draft.name}
            onChange={(name) => onChange({ ...draft, name })}
          />
        </label>
        <label className={styles.formItem}>
          <span>视图描述</span>
          <Input.TextArea
            maxLength={50}
            placeholder="请输入简单的视图描述限 50 个字符"
            showWordLimit
            value={draft.description}
            onChange={(description) => onChange({ ...draft, description })}
          />
        </label>
        <div className={styles.formItem}>
          <span>视图维度</span>
          <Radio.Group
            value={draft.dimension}
            onChange={(dimension) => onChange({
              ...draft,
              dimension,
              scope: 'all',
              selectedValues: [],
            })}
          >
            <Radio value="store">店铺</Radio>
            <Radio value="table">数据表</Radio>
          </Radio.Group>
        </div>
        <div className={styles.formItem}>
          <span>{dimensionLabel}</span>
          <Radio.Group
            value={draft.scope}
            onChange={(scope) => onChange({
              ...draft,
              scope,
              selectedValues: scope === 'all' ? [] : draft.selectedValues,
            })}
          >
            <Radio value="all">全部</Radio>
            <Radio value="custom">自定义</Radio>
          </Radio.Group>
        </div>
        {draft.scope === 'custom' ? (
          <div className={styles.formItem}>
            <span>{draft.dimension === 'store' ? '选择店铺' : '选择数据表'}</span>
            <Select
              mode="multiple"
              maxTagCount="responsive"
              placeholder={draft.dimension === 'store' ? '请选择店铺' : '请选择数据表'}
              value={draft.selectedValues}
              options={currentOptions.map((item) => ({ label: item, value: item }))}
              onChange={(selectedValues) => onChange({ ...draft, selectedValues })}
            />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function StoreMonitoringView({
  view,
  detailRequest,
}: {
  view: MonitorView;
  detailRequest?: StoreDrilldownState;
}) {
  const [storeKeyword, setStoreKeyword] = useState('');
  const [platformPath, setPlatformPath] = useState<string[]>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>();
  const [visibleStoreColumnKeys, setVisibleStoreColumnKeys] = useState<StoreColumnKey[]>(
    storeColumnOptions.map((option) => option.key),
  );
  const [drilldown, setDrilldown] = useState<StoreDrilldownState>();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (detailRequest) setDrilldown(detailRequest);
  }, [detailRequest]);

  const platformOptions = useMemo(() => (
    Array.from(new Set(storeRecords.map((record) => record.channel))).map((channel) => ({
      label: channel,
      value: channel,
      children: Array.from(new Set(
        storeRecords.filter((record) => record.channel === channel).map((record) => record.platform),
      )).map((platform) => ({
        label: platform,
        value: platform,
      })),
    }))
  ), []);

  const filteredRecords = useMemo(() => storeRecords.filter((record) => {
    const normalizedKeyword = storeKeyword.trim();
    const [channel, platform] = platformPath || [];

    const matchScope = view.scope === 'all' || view.selectedValues.includes(record.storeName);
    const matchStore = !normalizedKeyword || record.storeName.includes(normalizedKeyword);
    const matchPlatform = (!channel || record.channel === channel) && (!platform || record.platform === platform);
    const matchStatus = !statusFilter
      || tableDateColumns.some((date) => getStoreAggregatedStatus(record, date) === statusFilter);

    return matchScope && matchStore && matchPlatform && matchStatus;
  }), [platformPath, statusFilter, storeKeyword, view]);

  const pagedRecords = useMemo(
    () => filteredRecords.slice((page - 1) * pageSize, page * pageSize),
    [filteredRecords, page],
  );

  const getDateIssueReasons = (record: StoreMonitorRecord, date: string) => {
    const taskResults = record.taskResults[date] || [];
    const aggregatedStatus = aggregateTaskFinalStatus(taskResults);
    if (aggregatedStatus === 'success' || aggregatedStatus === 'waiting' || aggregatedStatus === 'noTask') {
      return undefined;
    }

    const reasons = createStoreDrilldownRecords(record, date)
      .filter((detail) => ['failed', 'abnormal'].includes(getDrilldownFinalStatus(detail)))
      .map((detail) => `${detail.tableName}｜${formatIssueSummary({
        issueStage: detail.issueStage,
        errorCode: detail.errorCode,
        reason: detail.reason || getAggregatedReason(taskResults, aggregatedStatus) || dateStatusMeta[aggregatedStatus].fallbackReason,
      })}`);

    return Array.from(new Set(reasons));
  };

  const drilldownStore = drilldown
    ? storeRecords.find((record) => record.storeName === drilldown.storeName)
    : undefined;
  const drilldownRecords = drilldownStore && drilldown
    ? createStoreDrilldownRecords(drilldownStore, drilldown.date)
    : [];

  const toggleStoreColumn = (columnKey: StoreColumnKey, checked: boolean) => {
    if (fixedStoreColumnKeys.includes(columnKey)) return;

    setVisibleStoreColumnKeys((current) => {
      if (checked) return Array.from(new Set([...current, columnKey]));
      return current.filter((key) => key !== columnKey);
    });
  };

  const storeColumnDropdown = (
    <div className={styles.columnSettingsPanel} onClick={(event) => event.stopPropagation()}>
      <span className={styles.columnSettingsTitle}>列展示设置</span>
      {storeColumnOptions.map((option) => (
        <Checkbox
          key={option.key}
          checked={visibleStoreColumnKeys.includes(option.key)}
          disabled={option.disabled}
          onChange={(checked) => toggleStoreColumn(option.key, checked)}
        >
          {option.label}
        </Checkbox>
      ))}
    </div>
  );

  const allColumns: Array<ColumnProps<StoreMonitorRecord> & { key: StoreColumnKey }> = [
    {
      key: 'channel',
      title: '平台类型',
      dataIndex: 'channel',
      width: 128,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-2.1' }),
    },
    {
      key: 'platform',
      title: '子平台',
      dataIndex: 'platform',
      width: 120,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-2.1' }),
    },
    {
      key: 'storeName',
      title: '店铺名称',
      dataIndex: 'storeName',
      width: 180,
      ellipsis: true,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-2.1' }),
    },
    {
      key: 'fetchTimeRange',
      title: '动态取数时间范围',
      dataIndex: 'fetchTimeRange',
      width: 220,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-2.1' }),
      render: () => dynamicFetchTimeRange,
    },
    {
      key: 'relatedTasks',
      title: '关联任务',
      dataIndex: 'relatedTasks',
      width: 260,
      ellipsis: true,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-2.1' }),
      render: (_: unknown, record) => <RelatedTasksCell tasks={getStoreRelatedTasks(record)} />,
    },
    ...tableDateColumns.map((date) => ({
      key: `date:${date}` as StoreColumnKey,
      title: date,
      dataIndex: date,
      width: 132,
      align: 'center' as const,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-2.3' }),
      render: (_: unknown, record: StoreMonitorRecord) => (
        <div className={styles.annotationStatusCell} data-note-id="ETL-2.3">
          <DateStatusCell
            value={getAggregatedStatusValue(record.taskResults[date] || [])}
            reasons={getDateIssueReasons(record, date)}
            onClick={() => {
              setDrilldown({ storeName: record.storeName, date });
            }}
          />
        </div>
      ),
    })),
  ];
  const columns = allColumns.filter((column) => visibleStoreColumnKeys.includes(column.key));

  if (drilldown) {
    return (
      <DrilldownDetailView
        title={drilldown.storeName}
        date={drilldown.date}
        records={drilldownRecords}
        emptyDescription="该店铺在所选业务日期暂无任务"
        onBack={() => setDrilldown(undefined)}
      />
    );
  }

  return (
    <div className={styles.monitorView}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Cascader
            allowClear
            className={styles.platformCascader}
            placeholder="平台 / 子平台"
            options={platformOptions}
            value={platformPath}
            expandTrigger="hover"
            onChange={(value) => {
              setPlatformPath(Array.isArray(value) ? value as string[] : undefined);
              setPage(1);
            }}
          />
          <Input.Group compact className={`${styles.keywordSearchGroup} qsb-arco-composite-search`}>
            <Select
              className={styles.keywordFieldSelect}
              value="storeName"
              options={[{ label: '店铺名称', value: 'storeName' }]}
            />
            <Input.Search
              className={styles.keywordSearch}
              allowClear
              searchButton={false}
              placeholder="请输入店铺名称"
              value={storeKeyword}
              onChange={(value) => { setStoreKeyword(value); setPage(1); }}
              onSearch={(value) => { setStoreKeyword(value); setPage(1); }}
            />
          </Input.Group>
          <Tooltip content="刷新">
            <Button
              className={styles.iconButton}
              data-note-id="ETL-2.2"
              aria-label="刷新"
              icon={<IconRefresh />}
              onClick={() => Message.success('数据监控已刷新')}
            />
          </Tooltip>
          <Select
            allowClear
            className={styles.statusSelect}
            placeholder="状态筛选"
            value={statusFilter}
            options={statusFilterOptions}
            onChange={(value) => { setStatusFilter(value); setPage(1); }}
          />
        </div>
        <div className={styles.toolbarActions}>
          <Dropdown droplist={storeColumnDropdown} position="bl" trigger="click">
            <Button
              className={styles.iconButton}
              aria-label="自定义列"
              icon={<IconSettings />}
            />
          </Dropdown>
          <Tooltip content={<StatusHelpContent />} position="br">
            <Button
              className={styles.iconButton}
              data-note-id="ETL-3.1"
              aria-label="状态说明"
              icon={<IconInfoCircle />}
            />
          </Tooltip>
        </div>
      </div>

      <Table
        className={styles.table}
        rowKey="key"
        columns={columns}
        data={pagedRecords}
        pagination={false}
        borderCell
        scroll={{ x: 1832, y: 'calc(100vh - 372px)' }}
        noDataElement={<Empty description="暂无符合条件的店铺监控记录" />}
      />

      <div className={styles.pageFooter}>
        <span>共{filteredRecords.length}条</span>
        <Pagination
          total={filteredRecords.length}
          current={page}
          pageSize={pageSize}
          sizeCanChange={false}
          onChange={setPage}
        />
      </div>
    </div>
  );
}

function TableMonitoringView({
  view,
  detailRequest,
}: {
  view: MonitorView;
  detailRequest?: TableDrilldownState;
}) {
  const [tableKeyword, setTableKeyword] = useState('');
  const [connectorKeyword, setConnectorKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>();
  const [drilldown, setDrilldown] = useState<TableDrilldownState>();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (detailRequest) setDrilldown(detailRequest);
  }, [detailRequest]);

  const filteredRecords = useMemo(() => tableRecords.filter((record) => {
    const matchScope = view.scope === 'all' || view.selectedValues.includes(record.tableName);
    const matchTable = !tableKeyword.trim()
      || record.tableName.includes(tableKeyword.trim())
      || record.tableNameEn.includes(tableKeyword.trim());
    const matchConnector = !connectorKeyword.trim() || record.connectorName.includes(connectorKeyword.trim());
    const matchStatus = !statusFilter
      || tableDateColumns.some((date) => getTableAggregatedStatus(record, date) === statusFilter);

    return matchScope && matchTable && matchConnector && matchStatus;
  }), [connectorKeyword, statusFilter, tableKeyword, view]);

  const pagedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const getDateIssueReasons = (record: TableMonitorRecord, date: string) => {
    const taskResults = record.taskResults[date] || [];
    const aggregatedStatus = aggregateTaskFinalStatus(taskResults);
    if (aggregatedStatus === 'success' || aggregatedStatus === 'waiting' || aggregatedStatus === 'noTask') {
      return undefined;
    }

    const reasons = createTableDrilldownRecords(record, date)
      .filter((detail) => ['failed', 'abnormal'].includes(getDrilldownFinalStatus(detail)))
      .map((detail) => `${detail.storeName}｜${formatIssueSummary({
        issueStage: detail.issueStage,
        errorCode: detail.errorCode,
        reason: detail.reason || getAggregatedReason(taskResults, aggregatedStatus) || dateStatusMeta[aggregatedStatus].fallbackReason,
      })}`);

    return Array.from(new Set(reasons));
  };

  const drilldownTable = drilldown
    ? tableRecords.find((record) => record.key === drilldown.tableKey)
    : undefined;
  const drilldownRecords = drilldownTable && drilldown
    ? createTableDrilldownRecords(drilldownTable, drilldown.date)
    : [];

  const columns: ColumnProps<TableMonitorRecord>[] = [
    {
      title: '表中文名称',
      dataIndex: 'tableName',
      width: 230,
      ellipsis: true,
      fixed: 'left',
    },
    { title: '表英文名称', dataIndex: 'tableNameEn', width: 220, ellipsis: true, fixed: 'left' },
    { title: '数据源', dataIndex: 'connectorName', width: 250, ellipsis: true, fixed: 'left' },
    {
      title: '关联任务',
      dataIndex: 'relatedTasks',
      width: 260,
      ellipsis: true,
      render: (_: unknown, record) => <RelatedTasksCell tasks={getTableRelatedTasks(record)} />,
    },
    ...tableDateColumns.map((date) => ({
      title: date,
      dataIndex: date,
      width: 132,
      align: 'center' as const,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-3.3' }),
      render: (_: unknown, record: TableMonitorRecord) => (
        <div className={styles.annotationStatusCell} data-note-id="ETL-3.3">
          <DateStatusCell
            value={getAggregatedStatusValue(record.taskResults[date] || [])}
            reasons={getDateIssueReasons(record, date)}
            onClick={() => setDrilldown({ tableKey: record.key, date })}
          />
        </div>
      ),
    })),
  ];

  if (drilldown && drilldownTable) {
    return (
      <DrilldownDetailView
        title={drilldownTable.tableName}
        date={drilldown.date}
        records={drilldownRecords}
        emptyDescription="该数据表在所选业务日期暂无任务"
        onBack={() => setDrilldown(undefined)}
      />
    );
  }

  return (
    <div className={styles.monitorView}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <DatePicker.RangePicker
            allowClear
            className={styles.dateRangeWide}
            format="YYYY-MM-DD"
            placeholder={['开始日期', '结束日期']}
          />
          <Input.Group compact className={`${styles.keywordSearchGroup} qsb-arco-composite-search`}>
            <Select
              className={styles.keywordFieldSelect}
              value="tableName"
              options={[{ label: '表名称', value: 'tableName' }]}
            />
            <Input.Search
              className={styles.keywordSearch}
              allowClear
              searchButton={false}
              placeholder="请输入表中文/表英文"
              value={tableKeyword}
              onChange={(value) => { setTableKeyword(value); setPage(1); }}
              onSearch={(value) => { setTableKeyword(value); setPage(1); }}
            />
          </Input.Group>
          <Input.Search
            className={styles.connectorSearch}
            allowClear
            searchButton={false}
            placeholder="请输入数据源名称"
            value={connectorKeyword}
            onChange={(value) => { setConnectorKeyword(value); setPage(1); }}
            onSearch={(value) => { setConnectorKeyword(value); setPage(1); }}
          />
          <Select
            allowClear
            className={styles.statusSelect}
            placeholder="状态筛选"
            value={statusFilter}
            options={statusFilterOptions}
            onChange={(value) => { setStatusFilter(value); setPage(1); }}
          />
        </div>
        <div className={styles.toolbarActions}>
          <Tooltip content="刷新">
            <Button
              className={styles.iconButton}
              aria-label="刷新"
              icon={<IconRefresh />}
              onClick={() => Message.success('数据监控已刷新')}
            />
          </Tooltip>
          <Tooltip content={<StatusHelpContent />} position="br">
            <Button
              className={styles.iconButton}
              data-note-id="ETL-3.1"
              aria-label="状态说明"
              icon={<IconInfoCircle />}
            />
          </Tooltip>
        </div>
      </div>

      <Table
        className={styles.table}
        rowKey="key"
        columns={columns}
        data={pagedRecords}
        pagination={false}
        borderCell
        scroll={{ x: 1884, y: 'calc(100vh - 372px)' }}
        noDataElement={<Empty description="暂无符合条件的数据表监控记录" />}
      />

      <div className={styles.pageFooter}>
        <span>共{filteredRecords.length}条</span>
        <Pagination
          total={filteredRecords.length}
          current={page}
          pageSize={pageSize}
          sizeCanChange={false}
          onChange={setPage}
        />
      </div>
    </div>
  );
}

export default function EtlDataMonitoringOptimization() {
  const [views, setViews] = useState<MonitorView[]>(initialViews);
  const [openViewIds, setOpenViewIds] = useState<string[]>(initialViews.map((view) => view.id));
  const [activeViewId, setActiveViewId] = useState('list');
  const [storeDetailRequest, setStoreDetailRequest] = useState<StoreDrilldownState>();
  const [tableDetailRequest, setTableDetailRequest] = useState<TableDrilldownState>();
  const [draft, setDraft] = useState<CustomViewDraft>(emptyDraft);
  const [modalVisible, setModalVisible] = useState(false);

  const activeView = views.find((view) => view.id === activeViewId);
  const openViews = openViewIds
    .map((id) => views.find((view) => view.id === id))
    .filter((view): view is MonitorView => Boolean(view));

  const createCustomView = () => {
    setDraft(emptyDraft);
    setModalVisible(true);
  };

  useEffect(() => {
    const openViewById = (id: string) => {
      setOpenViewIds((current) => (current.includes(id) ? current : [...current, id]));
      setActiveViewId(id);
    };
    const openViewList = () => setActiveViewId('list');
    const openStoreView = () => openViewById('all-store');
    const openTableView = () => openViewById('all-table');
    const openCustomViewModal = () => {
      setDraft(emptyDraft);
      setModalVisible(true);
    };
    const openStoreDetail = () => {
      openViewById('all-store');
      setStoreDetailRequest({ storeName: '内亲拼多多旗舰店', date: '2026-07-14' });
    };
    const openTableDetail = () => {
      openViewById('all-table');
      setTableDetailRequest({ tableKey: 'table-1', date: '2026-07-14' });
    };

    window.addEventListener('etl-monitor:open-view-list', openViewList);
    window.addEventListener('etl-monitor:open-store-view', openStoreView);
    window.addEventListener('etl-monitor:open-table-view', openTableView);
    window.addEventListener('etl-monitor:open-custom-view-modal', openCustomViewModal);
    window.addEventListener('etl-monitor:open-store-detail', openStoreDetail);
    window.addEventListener('etl-monitor:open-table-detail', openTableDetail);

    return () => {
      window.removeEventListener('etl-monitor:open-view-list', openViewList);
      window.removeEventListener('etl-monitor:open-store-view', openStoreView);
      window.removeEventListener('etl-monitor:open-table-view', openTableView);
      window.removeEventListener('etl-monitor:open-custom-view-modal', openCustomViewModal);
      window.removeEventListener('etl-monitor:open-store-detail', openStoreDetail);
      window.removeEventListener('etl-monitor:open-table-detail', openTableDetail);
    };
  }, []);

  const confirmCustomView = () => {
    const nextView: MonitorView = {
      id: `custom-${Date.now()}`,
      name: draft.name.trim(),
      description: draft.description.trim(),
      dimension: draft.dimension,
      scope: draft.scope,
      selectedValues: draft.scope === 'all' ? [] : draft.selectedValues,
    };

    setViews((current) => [...current, nextView]);
    setOpenViewIds((current) => [...current, nextView.id]);
    setActiveViewId(nextView.id);
    setModalVisible(false);
    Message.success('自定义视图已创建');
  };

  const openView = (id: string) => {
    setOpenViewIds((current) => (current.includes(id) ? current : [...current, id]));
    setActiveViewId(id);
  };

  const closeViewTab = (id: string) => {
    setOpenViewIds((current) => current.filter((viewId) => viewId !== id));
    setActiveViewId((current) => (current === id ? 'list' : current));
  };

  return (
    <div className={styles.page}>
      <div className={styles.tablePanel}>
        <ViewTabs
          views={openViews}
          activeViewId={activeViewId}
          onChange={setActiveViewId}
          onClose={closeViewTab}
        />
        <div className={styles.viewContent}>
          {activeViewId === 'list' ? (
            <ViewList views={views} onCreate={createCustomView} onOpen={openView} />
          ) : null}
          {activeView && activeView.dimension === 'store' ? (
            <StoreMonitoringView key={activeView.id} view={activeView} detailRequest={storeDetailRequest} />
          ) : null}
          {activeView && activeView.dimension === 'table' ? (
            <TableMonitoringView key={activeView.id} view={activeView} detailRequest={tableDetailRequest} />
          ) : null}
        </div>
      </div>

      <CustomViewModal
        visible={modalVisible}
        draft={draft}
        onCancel={() => setModalVisible(false)}
        onChange={setDraft}
        onConfirm={confirmCustomView}
      />
    </div>
  );
}
