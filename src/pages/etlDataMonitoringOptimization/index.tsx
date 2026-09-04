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
  IconInfoCircleFill,
  IconPauseCircleFill,
  IconPlus,
  IconRefresh,
  IconSettings,
} from '@arco-design/web-react/icon';
import {
  aggregateTaskFinalStatus,
  classifyTaskFinalStatus,
  isPlanTimedOut,
} from './statusModel';
import type {
  DateStatus,
  StageStatus,
  TaskStageFacts,
} from './statusModel';
import { mockExecutionDateRange, monitoringPlatformExamples } from './detailModel';
import { DetailRowActions } from './DetailRowActions';
import { DetailColumnSettings } from './DetailColumnSettings';
import { DetailFilters, DetailHeading, defaultDetailFilter } from './DetailToolbar';
import { normalizeDetailStatus } from './detailPresentation';
import { detailRowSpans, filterMonitorDates, matchesPlanKeyword, showNoDataLabel } from './monitoringPresentation';
import type { DetailStageField } from './detailPresentation';
import { applyEffectiveAttempts, createBusinessDetailKey } from './retryConsistency';
import type { EffectiveAttemptMap, RetryKind } from './retryConsistency';
import { useRetrySimulation } from './useRetrySimulation';
import type { RetryPhase, RetryableDetailRecord } from './useRetrySimulation';
import styles from './index.module.less';

const { TabPane } = Tabs;

type ViewDimension = 'store' | 'table';
type DimensionScope = 'all' | 'custom';
type StatusFilter = DateStatus;
type IssueStage = '取数执行' | '数据入库' | '数据校验';
type StoreColumnKey =
  | 'channel'
  | 'platform'
  | 'storeName'
  | 'relatedTasks'
  | `date:${string}`;
type DetailColumnKey =
  | 'channel'
  | 'platform'
  | 'bizDateRange'
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
  collectNoData?: boolean;
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
  planElapsedMinutes?: number;
  planTimeoutMinutes?: number;
  collectNoData?: boolean;
  key: string;
  channel: string;
  platform: string;
  bizDateRange: string;
  dataCycle: string;
  tableName: string;
  tableNameEn: string;
  connectorName: string;
  storeName: string;
  taskName: string;
  storageLocation: string;
  storageTableName: string;
  collectStatus: StageStatus;
  collectErrorCode?: string;
  importStatus: StageStatus;
  importErrorCode?: string;
  validationStatus: StageStatus;
  issueStage?: IssueStage;
  errorCode?: string;
  durationSeconds: number | string;
  expectedImportTime: string;
  actualImportTime: string;
  reason?: string;
}

type RetrySubmitter = (
  record: RetryableDetailRecord,
  retryKind: RetryKind,
) => Promise<'accepted' | 'rejected'>;

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

const planTimeoutTask = (planTimeoutMinutes: number, planElapsedMinutes: number): MonitorTaskResult => ({
  collectStatus: '失败',
  importStatus: '无任务',
  validationStatus: '无任务',
  planTimeoutMinutes,
  planElapsedMinutes,
  issueStage: '取数执行',
  reason: `计划运行超时：本次阈值 ${planTimeoutMinutes} 分钟，已运行 ${planElapsedMinutes} 分钟`,
  durationSeconds: planElapsedMinutes * 60,
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
  { ...successTask('本次取数成功，未生成数据文件', '无数据'), collectNoData: true },
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
    ...monitoringPlatformExamples.拼多多,
    taskResults: {
      '2026-07-14': taskScenario(importErrorTask('2003', '存在映射关系不存在的字段')),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(planTimeoutTask(300, 301)),
      '2026-07-11': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
      '2026-07-10': taskScenario(validationAbnormalTask('字段求和', '履约费用字段求和超出配置范围')),
      '2026-07-09': noTaskScenario('对应业务日期所选店铺无任务'),
      '2026-07-08': taskScenario(successTask('数据已入库，未开启表校验', '无任务')),
    },
  },
  {
    key: 'store-2',
    storeName: '永博京东旗舰店',
    ...monitoringPlatformExamples.京东,
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
    ...monitoringPlatformExamples.抖音,
    taskResults: {
      '2026-07-14': taskScenario(validationAbnormalTask('字段求和', '成交金额较前 7 日均值下降 92%')),
      '2026-07-13': taskScenario(successTask()),
      '2026-07-12': taskScenario(successTask()),
      '2026-07-11': taskScenario(successTask()),
      '2026-07-10': taskScenario(planTimeoutTask(60, 61)),
      '2026-07-09': taskScenario(successTask()),
      '2026-07-08': taskScenario(successTask()),
    },
  },
  {
    key: 'store-4',
    storeName: '蓝漂天猫旗舰店',
    ...monitoringPlatformExamples.天猫,
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
    ...monitoringPlatformExamples.小红书,
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
    ...monitoringPlatformExamples.淘宝,
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
    ...monitoringPlatformExamples.唯品会,
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

const storeColumnOptions: Array<{ key: StoreColumnKey; label: string; disabled?: boolean }> = [
  { key: 'channel', label: '平台类型' },
  { key: 'platform', label: '子平台' },
  { key: 'storeName', label: '店铺名称', disabled: true },
  { key: 'relatedTasks', label: '关联计划', disabled: true },
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
      '2026-07-12': taskScenario(planTimeoutTask(300, 301)),
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

export const statusFilterOptions: { label: string; value: StatusFilter }[] = [
  { label: '失败', value: 'failed' },
  { label: '异常', value: 'abnormal' },
  { label: '等待', value: 'waiting' },
  { label: '成功', value: 'success' },
  { label: '无任务', value: 'noTask' },
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
    fallbackReason: '取数执行失败、数据入库失败或计划运行超时',
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
  { status: 'failed', description: '数据入库失败、取数执行失败或计划运行超时' },
  { status: 'abnormal', description: '入库后表校验不通过' },
  { status: 'waiting', description: '取数、重试、入库或校验尚未结束' },
  { status: 'success', description: '数据成功入库，表校验通过/无需校验/无数据' },
  { status: 'noTask', description: '该日未执行任何取数并入库计划' },
];

export const detailColumnOptions: Array<{ key: DetailColumnKey; label: string; disabled?: boolean }> = [
  { key: 'channel', label: '平台类型', disabled: true },
  { key: 'platform', label: '子平台', disabled: true },
  { key: 'bizDateRange', label: '数据日期', disabled: true },
  { key: 'dataCycle', label: '数据周期' },
  { key: 'tableName', label: '报表表名(中文)' },
  { key: 'tableNameEn', label: '报表表名(英文)' },
  { key: 'connectorName', label: '数据源' },
  { key: 'storeName', label: '店铺' },
  { key: 'taskName', label: '关联计划' },
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
  拼多多商家后台: 'pdd',
  京东商家后台: 'jd',
  抖店: 'douyin',
  阿里妈妈: 'tmall',
  聚光: 'red',
  生意参谋: 'tb',
  唯品会商家后台: 'vip',
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
  const source = Object.keys(monitoringPlatformExamples).find((item) => connectorName.startsWith(`${item}-`));
  return source ? monitoringPlatformExamples[source] : { channel: '—', platform: '—' };
};

const getTableRelatedStores = (tableRecord: TableMonitorRecord) => {
  const { platform } = getPlatformInfoByConnector(tableRecord.connectorName);
  const matchedStores = storeRecords.filter((store) => store.platform === platform);
  const fallbackStores = storeRecords.filter((store) => !matchedStores.some((matched) => matched.key === store.key));
  return [...matchedStores, ...fallbackStores].slice(0, 3);
};

const getTableRelatedTasks = (tableRecord: TableMonitorRecord) => (
  [getTaskName(getPlatformInfoByConnector(tableRecord.connectorName).platform, tableRecord.tableName)]
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
    planElapsedMinutes: record.planElapsedMinutes,
    planTimeoutMinutes: record.planTimeoutMinutes,
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

  const sampleTables = getStoreTaskSamples(storeRecord);

  return sampleTables.map((sample, index) => {
    const taskResult = taskResults[index] || successTask();
    const platformCode = platformCodeMap[storeRecord.platform] || 'platform';
    const tableNameEn = `${platformCode}_${sample.tableNameEn}`;
    const taskName = getTaskName(storeRecord.platform, sample.tableName);

    return {
      key: createBusinessDetailKey({ date, storeName: storeRecord.storeName, tableName: sample.tableName, taskName }),
      channel: storeRecord.channel,
      platform: storeRecord.platform,
      bizDateRange: mockExecutionDateRange(date, index),
      dataCycle: '日',
      tableName: sample.tableName,
      tableNameEn,
      connectorName: `${storeRecord.platform}-经营数据`,
      storeName: storeRecord.storeName,
      taskName,
      storageLocation: '取数宝数据仓库 / ods',
      storageTableName: `ods_${tableNameEn}`,
      collectStatus: taskResult.collectStatus,
      collectErrorCode: taskResult.collectErrorCode,
      collectNoData: taskResult.collectNoData,
      planElapsedMinutes: taskResult.planElapsedMinutes,
      planTimeoutMinutes: taskResult.planTimeoutMinutes,
      importStatus: taskResult.importStatus,
      importErrorCode: taskResult.importErrorCode,
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

  const relatedStores = getTableRelatedStores(tableRecord);
  const sourcePlatform = getPlatformInfoByConnector(tableRecord.connectorName);

  return relatedStores.map((storeRecord, index) => {
    const taskResult = taskResults[index] || successTask();
    const tableNameEn = tableRecord.tableNameEn;
    const storeName = index === 0 ? storeRecord.storeName : `${sourcePlatform.channel}示例店铺 ${index + 1}`;
    const taskName = getTaskName(sourcePlatform.platform, tableRecord.tableName);

    return {
      key: createBusinessDetailKey({ date, storeName, tableName: tableRecord.tableName, taskName }),
      channel: sourcePlatform.channel,
      platform: sourcePlatform.platform,
      bizDateRange: mockExecutionDateRange(date, index < 2 ? 0 : 1),
      dataCycle: '日',
      tableName: tableRecord.tableName,
      tableNameEn,
      connectorName: tableRecord.connectorName,
      storeName,
      taskName,
      storageLocation: '取数宝数据仓库 / ods',
      storageTableName: `ods_${tableNameEn}`,
      collectStatus: taskResult.collectStatus,
      collectErrorCode: taskResult.collectErrorCode,
      collectNoData: taskResult.collectNoData,
      planElapsedMinutes: taskResult.planElapsedMinutes,
      planTimeoutMinutes: taskResult.planTimeoutMinutes,
      importStatus: taskResult.importStatus,
      importErrorCode: taskResult.importErrorCode,
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

const getAggregatedReason = (taskResults: Array<TaskStageFacts & { reason?: string }>, status: DateStatus) => (
  taskResults.find((taskResult) => classifyTaskFinalStatus(taskResult) === status)?.reason
);

const getAggregatedStatusValue = (taskResults: Array<TaskStageFacts & { reason?: string }>) => {
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

export function DateStatusCell({
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

export function StageStatusTag({
  status,
  reason,
  stage,
  noData,
}: {
  status: StageStatus;
  noData?: boolean;
  reason?: string;
  stage?: DetailStageField;
}) {
  const displayStatus = stage ? normalizeDetailStatus(stage, status) : status;
  const icon = getStageStatusIcon(displayStatus as StageStatus);
  const tag = (
    <Tag className={styles.statusTag} color={stageStatusColorMap[displayStatus as StageStatus] || 'gray'}>
      {icon ? (
        <span className={styles.statusTagContent}>
          {icon}
          <span>{displayStatus}</span>
        </span>
      ) : displayStatus}
    </Tag>
  );

  return (
    <span className={styles.stageStatusWithDetail}>
      {tag}
      {showNoDataLabel(displayStatus, noData) ? <span className={styles.statusNoData}>无数据</span> : null}
      {reason ? <Tooltip content={reason} trigger={['hover', 'focus']}>
        <button type="button" className={styles.statusInfo} aria-label="查看错误码和原因"><IconInfoCircleFill /></button>
      </Tooltip> : null}
    </span>
  );
}

export function StatusHelpContent() {
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

export const storeMonitorColumnLabels = {
  channel: '平台类型',
  platform: '子平台',
  storeName: '店铺名称',
  relatedTasks: '关联计划',
};

function DrilldownDetailView({
  dimension,
  title,
  date,
  records,
  phases,
  onRetry,
  emptyDescription,
  onBack,
}: {
  dimension: ViewDimension;
  title: string;
  date: string;
  records: StoreDrilldownRecord[];
  phases: Record<string, RetryPhase>;
  onRetry: (record: StoreDrilldownRecord, kind: 'collect' | 'import') => Promise<'accepted' | 'rejected'>;
  emptyDescription: string;
  onBack: () => void;
}) {
  const detailNoteId = dimension === 'store' ? 'ETL-4.2' : 'ETL-4.3';
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(defaultDetailFilter);
  const { searchField, keyword, stage: statusFilterField, status: statusFilterValue } = filters;
  const [detailColumnOrder, setDetailColumnOrder] = useState<string[]>(detailColumnOptions.map(option => option.key));
  const [visibleDetailColumnKeys, setVisibleDetailColumnKeys] = useState<DetailColumnKey[]>(
    detailColumnOptions.map((option) => option.key),
  );
  const pageSize = 20;
  const [detailChannel, setDetailChannel] = useState<string>();
  const [detailPlatform, setDetailPlatform] = useState<string>();

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
      const matchStatus = !statusFilterValue || normalizeDetailStatus(statusFilterField, record[statusFilterField]) === statusFilterValue;

      return (
        matchKeyword
        && (!detailChannel || record.channel === detailChannel)
        && (!detailPlatform || record.platform === detailPlatform)
        && matchStatus
      );
    });
  }, [keyword, records, searchField, statusFilterField, statusFilterValue, detailChannel, detailPlatform]);

  const pagedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);
  const compactDate = compactSameDateRange(date);
  const allColumns: Array<ColumnProps<StoreDrilldownRecord> & { key: DetailColumnKey }> = [
    {
      key: 'channel',
      title: '平台类型',
      dataIndex: 'channel',
      width: 120,
    },
    { key: 'platform', title: '子平台', dataIndex: 'platform', width: 120, onHeaderCell: () => ({ 'data-note-id': 'ETL-4.8' }) },
    { key: 'bizDateRange', title: '数据日期', dataIndex: 'bizDateRange', width: 220 },
    { key: 'dataCycle', title: '数据周期', dataIndex: 'dataCycle', width: 92 },
    { key: 'tableName', title: '报表表名(中文)', dataIndex: 'tableName', width: 180, ellipsis: true },
    { key: 'tableNameEn', title: '报表表名(英文)', dataIndex: 'tableNameEn', width: 200, ellipsis: true },
    { key: 'connectorName', title: '数据源', dataIndex: 'connectorName', width: 180, ellipsis: true, onHeaderCell: () => ({ 'data-note-id': 'ETL-4.8' }) },
    { key: 'storeName', title: '店铺', dataIndex: 'storeName', width: 180, ellipsis: true, onHeaderCell: () => ({ 'data-note-id': 'ETL-4.8' }) },
    {
      key: 'taskName',
      title: '关联计划',
      dataIndex: 'taskName',
      onHeaderCell: () => ({ 'data-note-id': 'ETL-4.8' }),
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
      width: 160,
      render: (status: StageStatus, record) => (
        <div className={styles.detailStatusCell}>
          <StageStatusTag
            status={status} stage="collectStatus" noData={record.collectNoData}
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
      render: (status: StageStatus, record) => (
        <div className={styles.detailStatusCell}>
          <StageStatusTag
            status={status} stage="importStatus"
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
      render: (status: StageStatus, record) => (
        <div className={styles.detailStatusCell}>
          <StageStatusTag
            status={status} stage="validationStatus"
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
      width: 156,
      fixed: 'right',
      align: 'left',
      onHeaderCell: () => ({ 'data-note-id': 'ETL-4.7' }),
      render: (_: unknown, record) => <DetailRowActions key={record.key} record={record} phase={phases[record.key]} onRetry={(detail, kind) => onRetry(detail as StoreDrilldownRecord, kind)} />,
    },
  ];

  const columns = detailColumnOrder
    .map(key => allColumns.find(column => column.key === key)!)
    .filter(column => visibleDetailColumnKeys.includes(column.key))
    .map(column => {
      const spans = dimension === 'table' ? detailRowSpans(pagedRecords, column.key) : [];
      const platformField = column.key === 'channel' || column.key === 'platform' ? column.key : undefined;
      return { ...column, align: 'left' as const,
        ...(dimension === 'table' ? { onCell: (_: StoreDrilldownRecord, index: number) => ({ rowSpan: spans[index] }) } : {}),
        ...(platformField ? {
          filters: Array.from(new Set(records.filter(row => platformField === 'channel' || !detailChannel || row.channel === detailChannel).map(row => row[platformField]))).map(value => ({ text: value, value })),
          filterMultiple: false,
          filteredValue: (platformField === 'channel' ? detailChannel : detailPlatform) ? [platformField === 'channel' ? detailChannel! : detailPlatform!] : [],
        } : {}),
      };
    });

  return (
    <div className={styles.monitorView}>
      <div className={styles.detailToolbar}>
        <DetailHeading title={title} date={compactDate} onBack={onBack} noteId="ETL-4.5" />
        <DetailFilters value={filters} noteId="ETL-4.4" onChange={value => { setFilters(value); setPage(1); }} />
        <div className={styles.toolbarActions}>
          <DetailColumnSettings
            noteId="ETL-4.6" options={detailColumnOptions} order={detailColumnOrder} visible={visibleDetailColumnKeys}
            onOrderChange={setDetailColumnOrder} onVisibleChange={keys => setVisibleDetailColumnKeys(keys as DetailColumnKey[])}
          />
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

      <div data-note-id={detailNoteId}>
        <Table
          className={styles.table}
          rowKey="key"
          columns={columns}
          data={pagedRecords}
          onChange={(_, __, filters) => {
            const channel = filters.channel?.[0];
            setDetailChannel(channel);
            setDetailPlatform(channel !== detailChannel ? undefined : filters.platform?.[0]);
            setPage(1);
          }}
          pagination={false}
          borderCell
          scroll={{ x: columns.reduce((total, column) => total + Number(column.width || 0), 0), y: 'calc(100vh - 372px)' }}
          noDataElement={<Empty description={emptyDescription} />}
        />
      </div>

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

export function ViewTabs({
  views,
  activeViewId,
  onChange,
  onClose,
  noteId,
}: {
  views: MonitorView[];
  activeViewId: string;
  onChange: (id: string) => void;
  onClose: (id: string) => void;
  noteId?: string;
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
    <div data-note-id={noteId}>
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
    </div>
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
        {filteredViews.map((view) => (
          <button
            className={styles.viewCard}
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
  attempts,
  phases,
  submitRetry,
}: {
  view: MonitorView;
  detailRequest?: StoreDrilldownState;
  attempts: EffectiveAttemptMap;
  phases: Record<string, RetryPhase>;
  submitRetry: RetrySubmitter;
}) {
  const [searchField, setSearchField] = useState<'storeName' | 'planName'>('storeName');
  const [dateRange, setDateRange] = useState<string[]>([]);
  const visibleDates = filterMonitorDates(tableDateColumns, dateRange);
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

  const currentStoreDetails = (record: StoreMonitorRecord, date: string) => (
    applyEffectiveAttempts(createStoreDrilldownRecords(record, date), attempts).map((detail) => (
      detail.lifecycle === 'completed' && getDrilldownFinalStatus(detail) === 'success'
        ? { ...detail, collectErrorCode: undefined, importErrorCode: undefined, issueStage: undefined, errorCode: undefined, reason: undefined }
        : detail
    ))
  );

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
    const matchStore = searchField === 'planName' ? matchesPlanKeyword(getStoreRelatedTasks(record), normalizedKeyword) : !normalizedKeyword || record.storeName.includes(normalizedKeyword);
    const matchPlatform = (!channel || record.channel === channel) && (!platform || record.platform === platform);
    const matchStatus = !statusFilter
      || visibleDates.some((date) => aggregateTaskFinalStatus(currentStoreDetails(record, date)) === statusFilter);

    return visibleDates.length > 0 && matchScope && matchStore && matchPlatform && matchStatus;
  }), [attempts, platformPath, statusFilter, storeKeyword, view, searchField, dateRange]);

  const pagedRecords = useMemo(
    () => filteredRecords.slice((page - 1) * pageSize, page * pageSize),
    [filteredRecords, page],
  );

  const getDateIssueReasons = (record: StoreMonitorRecord, date: string) => {
    const currentDetails = currentStoreDetails(record, date);
    const aggregatedStatus = aggregateTaskFinalStatus(currentDetails);
    if (aggregatedStatus === 'success' || aggregatedStatus === 'waiting' || aggregatedStatus === 'noTask') {
      return undefined;
    }

    const reasons = currentDetails
      .filter((detail) => ['failed', 'abnormal'].includes(getDrilldownFinalStatus(detail)))
      .map((detail) => `${detail.tableName}｜${isPlanTimedOut(detail) ? `${detail.taskName}｜` : ''}${formatIssueSummary({
        issueStage: detail.issueStage,
        errorCode: detail.errorCode,
        reason: detail.reason || getAggregatedReason(currentDetails, aggregatedStatus) || dateStatusMeta[aggregatedStatus].fallbackReason,
      })}`);

    return Array.from(new Set(reasons));
  };

  const drilldownStore = drilldown
    ? storeRecords.find((record) => record.storeName === drilldown.storeName)
    : undefined;
  const drilldownRecords = drilldownStore && drilldown
    ? currentStoreDetails(drilldownStore, drilldown.date)
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
      title: storeMonitorColumnLabels.channel,
      dataIndex: 'channel',
      width: 128,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-2.1' }),
    },
    {
      key: 'platform',
      title: storeMonitorColumnLabels.platform,
      dataIndex: 'platform',
      width: 120,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-2.1' }),
    },
    {
      key: 'storeName',
      title: storeMonitorColumnLabels.storeName,
      dataIndex: 'storeName',
      width: 180,
      ellipsis: true,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-2.1' }),
    },
    {
      key: 'relatedTasks',
      title: storeMonitorColumnLabels.relatedTasks,
      dataIndex: 'relatedTasks',
      width: 260,
      ellipsis: true,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-2.1' }),
      render: (_: unknown, record) => <RelatedTasksCell tasks={getStoreRelatedTasks(record)} />,
    },
    ...visibleDates.map((date) => ({
      key: `date:${date}` as StoreColumnKey,
      title: date,
      dataIndex: date,
      width: 164,
      align: 'left' as const,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-2.3' }),
      render: (_: unknown, record: StoreMonitorRecord) => (
        <div className={styles.annotationStatusCell} data-note-id="ETL-2.3">
          <DateStatusCell
            value={getAggregatedStatusValue(currentStoreDetails(record, date))}
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
        dimension="store"
        title={drilldown.storeName}
        date={drilldown.date}
        records={drilldownRecords}
        phases={phases}
        onRetry={submitRetry}
        emptyDescription="该店铺在所选业务日期暂无任务"
        onBack={() => setDrilldown(undefined)}
      />
    );
  }

  return (
    <div className={styles.monitorView}>
      <div className={styles.toolbar}>
        <div className={styles.filters} data-note-id="ETL-2.4">
          <DatePicker.RangePicker allowClear className={styles.dateRangeWide} format="YYYY-MM-DD" placeholder={['开始日期', '结束日期']} value={dateRange}
            onChange={value => { setDateRange(value); setPage(1); }} />
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
              value={searchField}
              onChange={value => { setSearchField(value); setPage(1); }}
              options={[{ label: '店铺名称', value: 'storeName' }, { label: '计划名称', value: 'planName' }]}
            />
            <Input.Search
              className={styles.keywordSearch}
              allowClear
              searchButton={false}
              placeholder={searchField === 'planName' ? '请输入计划名称' : '请输入店铺名称'}
              value={storeKeyword}
              onChange={(value) => { setStoreKeyword(value); setPage(1); }}
              onSearch={(value) => { setStoreKeyword(value); setPage(1); }}
            />
          </Input.Group>
          <div className={styles.statusRefreshGroup}>
            <Select
              allowClear
              className={styles.statusSelect}
              placeholder="状态筛选"
              value={statusFilter}
              options={statusFilterOptions}
              onChange={(value) => { setStatusFilter(value); setPage(1); }}
            />
            <Tooltip content="刷新">
              <Button
                className={styles.iconButton}
                data-note-id="ETL-2.2"
                aria-label="刷新"
                icon={<IconRefresh />}
                onClick={() => Message.success('数据监控已刷新')}
              />
            </Tooltip>
          </div>
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
        scroll={{ x: 688 + visibleDates.length * 164, y: 'calc(100vh - 372px)' }}
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
  attempts,
  phases,
  submitRetry,
}: {
  view: MonitorView;
  detailRequest?: TableDrilldownState;
  attempts: EffectiveAttemptMap;
  phases: Record<string, RetryPhase>;
  submitRetry: RetrySubmitter;
}) {
  const [searchField, setSearchField] = useState<'tableName' | 'planName'>('tableName');
  const [dateRange, setDateRange] = useState<string[]>([]);
  const visibleDates = filterMonitorDates(tableDateColumns, dateRange);
  const [tableKeyword, setTableKeyword] = useState('');
  const [connectorKeyword, setConnectorKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>();
  const [drilldown, setDrilldown] = useState<TableDrilldownState>();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (detailRequest) setDrilldown(detailRequest);
  }, [detailRequest]);

  const currentTableDetails = (record: TableMonitorRecord, date: string) => (
    applyEffectiveAttempts(createTableDrilldownRecords(record, date), attempts).map((detail) => (
      detail.lifecycle === 'completed' && getDrilldownFinalStatus(detail) === 'success'
        ? { ...detail, collectErrorCode: undefined, importErrorCode: undefined, issueStage: undefined, errorCode: undefined, reason: undefined }
        : detail
    ))
  );

  const filteredRecords = useMemo(() => tableRecords.filter((record) => {
    const matchScope = view.scope === 'all' || view.selectedValues.includes(record.tableName);
    const matchTable = searchField === 'planName' ? matchesPlanKeyword(getTableRelatedTasks(record), tableKeyword) : !tableKeyword.trim() || record.tableName.includes(tableKeyword.trim()) || record.tableNameEn.includes(tableKeyword.trim());
    const matchConnector = !connectorKeyword.trim() || record.connectorName.includes(connectorKeyword.trim());
    const matchStatus = !statusFilter
      || visibleDates.some((date) => aggregateTaskFinalStatus(currentTableDetails(record, date)) === statusFilter);

    return visibleDates.length > 0 && matchScope && matchTable && matchConnector && matchStatus;
  }), [attempts, connectorKeyword, statusFilter, tableKeyword, view, searchField, dateRange]);

  const pagedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const getDateIssueReasons = (record: TableMonitorRecord, date: string) => {
    const currentDetails = currentTableDetails(record, date);
    const aggregatedStatus = aggregateTaskFinalStatus(currentDetails);
    if (aggregatedStatus === 'success' || aggregatedStatus === 'waiting' || aggregatedStatus === 'noTask') {
      return undefined;
    }

    const reasons = currentDetails
      .filter((detail) => ['failed', 'abnormal'].includes(getDrilldownFinalStatus(detail)))
      .map((detail) => `${detail.storeName}｜${isPlanTimedOut(detail) ? `${detail.taskName}｜` : ''}${formatIssueSummary({
        issueStage: detail.issueStage,
        errorCode: detail.errorCode,
        reason: detail.reason || getAggregatedReason(currentDetails, aggregatedStatus) || dateStatusMeta[aggregatedStatus].fallbackReason,
      })}`);

    return Array.from(new Set(reasons));
  };

  const drilldownTable = drilldown
    ? tableRecords.find((record) => record.key === drilldown.tableKey)
    : undefined;
  const drilldownRecords = drilldownTable && drilldown
    ? currentTableDetails(drilldownTable, drilldown.date)
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
      title: '关联计划',
      dataIndex: 'relatedTasks',
      width: 260,
      ellipsis: true,
      render: (_: unknown, record) => <RelatedTasksCell tasks={getTableRelatedTasks(record)} />,
    },
    ...visibleDates.map((date) => ({
      title: date,
      dataIndex: date,
      width: 164,
      align: 'left' as const,
      onHeaderCell: () => ({ 'data-note-id': 'ETL-3.3' }),
      render: (_: unknown, record: TableMonitorRecord) => (
        <div className={styles.annotationStatusCell} data-note-id="ETL-3.3">
          <DateStatusCell
            value={getAggregatedStatusValue(currentTableDetails(record, date))}
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
        dimension="table"
        title={drilldownTable.tableName}
        date={drilldown.date}
        records={drilldownRecords}
        phases={phases}
        onRetry={submitRetry}
        emptyDescription="该数据表在所选业务日期暂无任务"
        onBack={() => setDrilldown(undefined)}
      />
    );
  }

  return (
    <div className={styles.monitorView}>
      <div className={styles.toolbar}>
        <div className={styles.filters} data-note-id="ETL-3.4">
          <DatePicker.RangePicker
            allowClear
            className={styles.dateRangeWide}
            format="YYYY-MM-DD"
            placeholder={['开始日期', '结束日期']}
            value={dateRange} onChange={value => { setDateRange(value); setPage(1); }}
          />
          <Input.Group compact className={`${styles.keywordSearchGroup} qsb-arco-composite-search`}>
            <Select
              className={styles.keywordFieldSelect}
              value={searchField}
              onChange={value => { setSearchField(value); setPage(1); }}
              options={[{ label: '表名称', value: 'tableName' }, { label: '计划名称', value: 'planName' }]}
            />
            <Input.Search
              className={styles.keywordSearch}
              allowClear
              searchButton={false}
              placeholder={searchField === 'planName' ? '请输入计划名称' : '请输入表中文/表英文'}
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
          <div className={styles.statusRefreshGroup}>
            <Select
              allowClear
              className={styles.statusSelect}
              placeholder="状态筛选"
              value={statusFilter}
              options={statusFilterOptions}
              onChange={(value) => { setStatusFilter(value); setPage(1); }}
            />
            <Tooltip content="刷新">
              <Button
                className={styles.iconButton}
                aria-label="刷新"
                icon={<IconRefresh />}
                onClick={() => Message.success('数据监控已刷新')}
              />
            </Tooltip>
          </div>
        </div>
        <div className={styles.toolbarActions}>
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
        scroll={{ x: 960 + visibleDates.length * 164, y: 'calc(100vh - 372px)' }}
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
  const [annotationNavigationId, setAnnotationNavigationId] = useState(0);
  const [storeDetailRequest, setStoreDetailRequest] = useState<StoreDrilldownState>();
  const [tableDetailRequest, setTableDetailRequest] = useState<TableDrilldownState>();
  const [draft, setDraft] = useState<CustomViewDraft>(emptyDraft);
  const [modalVisible, setModalVisible] = useState(false);
  const { attempts, phases, submitRetry } = useRetrySimulation();

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
      setStoreDetailRequest(undefined);
      setTableDetailRequest(undefined);
      setAnnotationNavigationId((current) => current + 1);
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
          noteId="ETL-1.2"
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
            <StoreMonitoringView key={`${activeView.id}:${annotationNavigationId}`} view={activeView} detailRequest={storeDetailRequest} attempts={attempts} phases={phases} submitRetry={submitRetry} />
          ) : null}
          {activeView && activeView.dimension === 'table' ? (
            <TableMonitoringView key={`${activeView.id}:${annotationNavigationId}`} view={activeView} detailRequest={tableDetailRequest} attempts={attempts} phases={phases} submitRetry={submitRetry} />
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
