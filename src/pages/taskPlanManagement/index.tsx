import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  List,
  Menu,
  Message,
  Modal,
  Pagination,
  Popover,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  TimePicker,
  Tooltip,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import {
  IconCloseCircleFill,
  IconDelete,
  IconDown,
  IconEdit,
  IconExport,
  IconInfoCircle,
  IconImport,
  IconPlayArrow,
  IconPlus,
  IconSettings,
  IconZoomIn,
} from '@arco-design/web-react/icon';
import sycmReceptionDataPath from '@/assets/images/sycm-reception-data-path.png';
import { AutoRetryAnnotationMarker } from '@/components/autoRetryAnnotations';
import { BusinessCustomParameterAnnotationMarker } from '@/components/businessCustomParameterAnnotations';
import {
  associateBusinessParamSet,
  businessParamTypeList,
  businessParamTypeMeta,
  type BusinessParamSet,
  type BusinessParamType,
  getBusinessParamColumns,
  getBusinessParamSets,
  getDefaultBusinessParamSetForConnector,
  saveBusinessParamSet,
  subscribeBusinessParamStore,
} from '@/mocks/businessParams';
import styles from './index.module.less';

const { TabPane } = Tabs;
const { RangePicker: TimeRangePicker } = TimePicker;

const PLAN_DRAWER_WIDTH = 1142;
const FLOW_FORM_WIDTH = 462;

type JobType = 'daily' | 'realtime' | 'lookback';
type DataCycle = 1 | 2 | 3;
type PlanStatusFilter = 'open' | 'closed';
type ExecuteType = 2 | 9;
type ScheduleType = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type TimingTimeType = 0 | 1;
type DistributionType = 1 | 2;
type RetryStatusFilter = 'enabled' | 'disabled';
type ConnectorParamTarget = 'drawer' | 'manage';

interface PlanRetryConfig {
  enabled: boolean;
  executionTimeRange: [string, string];
  distributionType: DistributionType;
  botIds: string[];
}

interface PlanRecord {
  id: string;
  jobType: JobType;
  jobName: string;
  createTime: string;
  priority: number;
  jobDescription: string;
  channelKey: string;
  channel: string;
  platformKey: string;
  platform: string;
  storeId: string;
  storeName: string;
  dataCycle: DataCycle;
  planStatus: boolean;
  botName: string;
  executeType?: ExecuteType;
  scheduleType?: ScheduleType;
  timingTimeType?: TimingTimeType;
  scheduleStart?: string;
  scheduleEnd?: string;
  bizStartTime?: string;
  bizEndTime?: string;
  storeIdList?: string[];
  connectorList?: ConnectorOption[];
  distributionType?: DistributionType;
  botIds?: string[];
  retryConfig?: PlanRetryConfig;
}

interface ChannelOption {
  key: string;
  value: string;
  subList: Array<{ key: string; value: string }>;
}

interface StoreOption {
  id: string;
  channelKey: string;
  platformKey: string;
  storeName: string;
}

interface ConnectorOption {
  connectorId: string;
  connectorName: string;
  connectorCode: string;
  channelKey: string;
  platformKey: string;
  dataCycle: DataCycle;
  bizParamType?: string;
  bizParamTypeName?: string;
  bizParamId?: string;
  bizParamName?: string;
  pathImageUrl?: string;
  defaultConfig?: string;
  acquiredCount?: number;
  sourcePath?: string;
}

interface OpenPlanDrawerPayload {
  connectorId?: string;
  channelKey?: string;
  platformKey?: string;
  dataCycle?: DataCycle;
}

interface RobotOption {
  botUuid: string;
  botName: string;
}

type BizParamOption = BusinessParamSet;

interface BizParamCreateConfig {
  nameLabel: string;
  infoTitle: string;
  columns: string[];
}

interface BizParamCreateErrors {
  name?: string;
  cells: Record<string, string>;
}

interface StoreDropdownSelectProps {
  value?: string[];
  options: StoreOption[];
  disabled?: boolean;
  placeholder?: string;
  onChange?: (value: string[]) => void;
}

const ONLINE_TOTAL = 284;

const jobTabs: Array<{ key: JobType; title: string }> = [
  { key: 'daily', title: '日常计划' },
  { key: 'realtime', title: '实时计划' },
  { key: 'lookback', title: '回溯计划' },
];

const jobNamePrefixMap: Record<JobType, string> = {
  daily: '日常',
  realtime: '实时',
  lookback: '回溯',
};

const dataCycleOptions: Array<{ key: DataCycle; value: string }> = [
  { key: 1, value: '日' },
  { key: 2, value: '周' },
  { key: 3, value: '月' },
];

const dataCycleLabel: Record<DataCycle, string> = {
  1: '日',
  2: '周',
  3: '月',
};

const bizParamSetPlaceholderMap: Record<string, string> = {
  GOOD: '请选择商品集',
  CATEGORY: '请选择类目集',
  COMPETE_STORE: '请选择竞品店铺集',
  COMPETE_GOOD: '请选择竞品商品集',
  COMPETE_BRAND: '请选择竞品品牌集',
};

const getBizParamCreateConfig = (type: BusinessParamType, connectorId?: string, connectorName?: string): BizParamCreateConfig => {
  const meta = businessParamTypeMeta[type];
  return {
    nameLabel: meta.nameLabel,
    infoTitle: meta.infoTitle,
    columns: getBusinessParamColumns(type, connectorId, connectorName),
  };
};

const resolveInfoText = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const text = value.trim();
    return text || undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = resolveInfoText(item);
      if (text) return text;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['text', 'content', 'description', 'message', 'label']) {
      const text = resolveInfoText(record[key]);
      if (text) return text;
    }
  }
  return undefined;
};

const getConnectorDateRangeInfo = (connector?: ConnectorOption) => {
  if (!connector?.defaultConfig) return undefined;
  try {
    const parsed = JSON.parse(connector.defaultConfig) as unknown;
    const fields = Array.isArray(parsed) ? parsed : [parsed];
    const dateRangeField = fields.find((field) => (
      field
      && typeof field === 'object'
      && ((field as Record<string, unknown>).key === 'dateRange'
        || (field as Record<string, unknown>).type === 'dateRange')
    )) as Record<string, unknown> | undefined;
    return resolveInfoText(dateRangeField?.info);
  } catch {
    return undefined;
  }
};

const executeTypeMap: Record<ExecuteType, string> = {
  2: '手动执行',
  9: '定时执行',
};

const scheduleTypeOptions: Array<{ key: ScheduleType; value: string }> = [
  { key: 4, value: '每天' },
  { key: 5, value: '每周' },
  { key: 6, value: '每月' },
  { key: 0, value: '高级表达式' },
];

const timingTimeTypeMap: Record<TimingTimeType, string> = {
  0: '长期有效',
  1: '指定有效时间',
};

const distributionTypeMap: Record<DistributionType, string> = {
  1: '自动分配',
  2: '指定机器人',
};

const weekOptions = [
  { key: '2', value: '周一' },
  { key: '3', value: '周二' },
  { key: '4', value: '周三' },
  { key: '5', value: '周四' },
  { key: '6', value: '周五' },
  { key: '7', value: '周六' },
  { key: '1', value: '周日' },
];

const minuteOptions = Array.from({ length: 60 }, (_, index) => ({
  key: index,
  value: `${index}`.padStart(2, '0'),
}));

const monthDayOptions = Array.from({ length: 31 }, (_, index) => ({
  key: `${index + 1}`,
  value: `${index + 1}日`,
}));

const intervalMinuteOptions = [5, 10, 20, 30, 60].map((item) => ({
  key: item,
  value: `${item}分钟`,
}));

const channelOptions: ChannelOption[] = [
  {
    key: 'jd',
    value: '京东',
    subList: [{ key: 'jd-business', value: '京东商智(商家版)' }],
  },
  {
    key: 'taoxi',
    value: '淘系',
    subList: [
      { key: 'sycm', value: '生意参谋' },
      { key: 'sycm-new', value: '生意参谋(新版)' },
      { key: 'alimama', value: '阿里妈妈' },
    ],
  },
  {
    key: 'xiaohongshu',
    value: '小红书',
    subList: [
      { key: 'juguang', value: '聚光平台' },
      { key: 'xhs', value: '小红书' },
      { key: 'xhs-shop', value: '小红书商家后台' },
    ],
  },
  {
    key: 'pdd',
    value: '拼多多',
    subList: [{ key: 'pdd-shop', value: '拼多多商家后台' }],
  },
];

const robotOptions: RobotOption[] = [
  { botUuid: 'bot-rmx6688', botName: 'RMX6688' },
  { botUuid: 'bot-huoshan-01', botName: '电商01火山云' },
  { botUuid: 'bot-paimon', botName: '派蒙' },
  { botUuid: 'bot-dynamic', botName: '动态分配' },
  { botUuid: 'bot-ya0', botName: 'yA0' },
  { botUuid: 'bot-xingze', botName: '星泽测试' },
  { botUuid: 'bot-21091116ac', botName: '21091116AC' },
  { botUuid: 'bot-p3oxn2m0e7qldwy', botName: 'p3oxn2m0e7qldwy' },
  { botUuid: 'bot-ding1', botName: '钉1' },
  { botUuid: 'bot-tuling', botName: 'tuling' },
];

const createConnectorPathImage = (label: string, color = '#165DFF') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="176" viewBox="0 0 320 176">
      <rect width="320" height="176" rx="12" fill="#F7FAFF"/>
      <rect x="20" y="22" width="86" height="48" rx="8" fill="#E8F3FF" stroke="${color}" stroke-width="2"/>
      <rect x="214" y="106" width="86" height="48" rx="8" fill="#E8F3FF" stroke="${color}" stroke-width="2"/>
      <path d="M106 46 C152 46 160 130 214 130" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="160" cy="88" r="18" fill="#FFFFFF" stroke="${color}" stroke-width="2"/>
      <path d="M152 88 H168 M160 80 V96" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <text x="63" y="52" text-anchor="middle" font-size="18" fill="#1D2129">登录</text>
      <text x="257" y="136" text-anchor="middle" font-size="18" fill="#1D2129">取数</text>
      <text x="160" y="160" text-anchor="middle" font-size="16" fill="#4E5969">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const connectorDefaultConfig = '[{"key":"dateRange","label":"采集日期","type":"dateRange","required":true}]';

const connectorOptions: ConnectorOption[] = [
  {
    connectorId: 'connector-jd-business-sales',
    connectorCode: 'JD-SZ-001',
    connectorName: '京东商智-交易概览',
    channelKey: 'jd',
    platformKey: 'jd-business',
    dataCycle: 1,
    pathImageUrl: createConnectorPathImage('京东商智交易链路'),
    acquiredCount: 186,
    sourcePath: '京东商智',
  },
  {
    connectorId: 'connector-jd-business-flow',
    connectorCode: 'JD-SZ-002',
    connectorName: '京东商智-流量来源',
    channelKey: 'jd',
    platformKey: 'jd-business',
    dataCycle: 1,
    pathImageUrl: createConnectorPathImage('京东商智流量链路'),
    acquiredCount: 132,
    sourcePath: '京东商智',
  },
  {
    connectorId: 'connector-sycm-shop',
    connectorCode: 'TB-SYCM-001',
    connectorName: '钉钉生意参谋-登录',
    channelKey: 'taoxi',
    platformKey: 'sycm',
    dataCycle: 1,
    pathImageUrl: createConnectorPathImage('生意参谋登录链路'),
    acquiredCount: 286,
    sourcePath: '生意参谋',
  },
  {
    connectorId: 'connector-sycm-product',
    connectorCode: 'TB-SYCM-002',
    connectorName: '淘系生意参谋商品 360',
    channelKey: 'taoxi',
    platformKey: 'sycm',
    dataCycle: 1,
    bizParamType: 'GOOD',
    bizParamTypeName: '本店商品',
    pathImageUrl: sycmReceptionDataPath,
    defaultConfig: connectorDefaultConfig,
    acquiredCount: 429,
    sourcePath: '生意参谋',
  },
  {
    connectorId: 'connector-sycm-new-traffic',
    connectorCode: 'TB-SYCMN-001',
    connectorName: '生意参谋新版-流量看板',
    channelKey: 'taoxi',
    platformKey: 'sycm-new',
    dataCycle: 1,
    acquiredCount: 96,
    sourcePath: '生意参谋新版',
  },
  {
    connectorId: 'connector-alimama-account',
    connectorCode: 'TB-ALMM-001',
    connectorName: '阿里妈妈-账户日报',
    channelKey: 'taoxi',
    platformKey: 'alimama',
    dataCycle: 1,
    bizParamType: 'COMPETE_BRAND',
    bizParamTypeName: '竞品品牌',
    acquiredCount: 214,
    sourcePath: '阿里妈妈',
  },
  {
    connectorId: 'connector-xhs-juguang-account',
    connectorCode: 'XHS-JG-001',
    connectorName: '聚光平台-账户报表',
    channelKey: 'xiaohongshu',
    platformKey: 'juguang',
    dataCycle: 1,
    bizParamType: 'COMPETE_STORE',
    bizParamTypeName: '竞品店铺',
    acquiredCount: 78,
    sourcePath: '聚光平台',
  },
  {
    connectorId: 'connector-xhs-shop-content',
    connectorCode: 'XHS-SHOP-001',
    connectorName: '小红书商家后台-笔记数据',
    channelKey: 'xiaohongshu',
    platformKey: 'xhs-shop',
    dataCycle: 1,
    acquiredCount: 105,
    sourcePath: '小红书商家后台',
  },
  {
    connectorId: 'connector-xhs-overview',
    connectorCode: 'XHS-001',
    connectorName: '小红书-经营概览',
    channelKey: 'xiaohongshu',
    platformKey: 'xhs',
    dataCycle: 1,
    acquiredCount: 168,
    sourcePath: '小红书',
  },
  {
    connectorId: 'connector-pdd-shop-sales',
    connectorCode: 'PDD-SHOP-001',
    connectorName: '拼多多商家后台-交易数据',
    channelKey: 'pdd',
    platformKey: 'pdd-shop',
    dataCycle: 1,
    bizParamType: 'COMPETE_GOOD',
    bizParamTypeName: '竞品商品',
    acquiredCount: 243,
    sourcePath: '拼多多商家后台',
  },
  {
    connectorId: 'connector-pdd-shop-flow',
    connectorCode: 'PDD-SHOP-002',
    connectorName: '拼多多商家后台-流量数据',
    channelKey: 'pdd',
    platformKey: 'pdd-shop',
    dataCycle: 1,
    acquiredCount: 191,
    sourcePath: '拼多多商家后台',
  },
];

const sycmMockConnectorNames = [
  ['connector-sycm-order', 'TB-SYCM-003', '生意参谋-订单明细', '订单采集链路'],
  ['connector-sycm-flow-source', 'TB-SYCM-004', '生意参谋-流量来源', '流量来源链路'],
  ['connector-sycm-search', 'TB-SYCM-005', '生意参谋-搜索词分析', '搜索词链路'],
  ['connector-sycm-shop-overview', 'TB-SYCM-006', '生意参谋-店铺概览', '店铺概览链路'],
  ['connector-sycm-product-rank', 'TB-SYCM-007', '生意参谋-商品排行', '商品排行链路'],
  ['connector-sycm-crowd', 'TB-SYCM-008', '生意参谋-人群画像', '人群画像链路'],
  ['connector-sycm-content', 'TB-SYCM-009', '生意参谋-内容效果', '内容效果链路'],
  ['connector-sycm-live', 'TB-SYCM-010', '生意参谋-直播数据', '直播数据链路'],
  ['connector-sycm-service', 'TB-SYCM-011', '生意参谋-服务体验', '服务体验链路'],
  ['connector-sycm-activity', 'TB-SYCM-012', '生意参谋-活动分析', '活动分析链路'],
  ['connector-sycm-member', 'TB-SYCM-013', '生意参谋-会员数据', '会员数据链路'],
  ['connector-sycm-channel', 'TB-SYCM-014', '生意参谋-渠道分析', '渠道分析链路'],
  ['connector-sycm-price', 'TB-SYCM-015', '生意参谋-价格带分析', '价格带链路'],
  ['connector-sycm-stock', 'TB-SYCM-016', '生意参谋-库存监控', '库存监控链路'],
  ['connector-sycm-after-sale', 'TB-SYCM-017', '生意参谋-售后分析', '售后分析链路'],
  ['connector-sycm-coupon', 'TB-SYCM-018', '生意参谋-优惠券效果', '优惠券链路'],
  ['connector-sycm-new-product', 'TB-SYCM-019', '生意参谋-新品表现', '新品表现链路'],
  ['connector-sycm-keyword', 'TB-SYCM-020', '生意参谋-关键词趋势', '关键词链路'],
  ['connector-sycm-region', 'TB-SYCM-021', '生意参谋-地域分布', '地域分布链路'],
  ['connector-sycm-refund', 'TB-SYCM-022', '生意参谋-退款分析', '退款分析链路'],
  ['connector-sycm-transform', 'TB-SYCM-023', '生意参谋-转化漏斗', '转化漏斗链路'],
  ['connector-sycm-competitor', 'TB-SYCM-024', '生意参谋-竞品监控', '竞品监控链路'],
] as const;

const sycmMockConnectors: ConnectorOption[] = sycmMockConnectorNames.map(([connectorId, connectorCode, connectorName, imageLabel], index) => ({
  connectorId,
  connectorCode,
  connectorName,
  channelKey: 'taoxi',
  platformKey: 'sycm',
  dataCycle: 1,
  bizParamType: index % 3 === 0 ? 'GOOD' : undefined,
  bizParamTypeName: index % 3 === 0 ? '本店商品' : undefined,
  pathImageUrl: createConnectorPathImage(imageLabel),
  defaultConfig: index % 3 === 0 ? connectorDefaultConfig : undefined,
  acquiredCount: 58 + index * 17,
  sourcePath: '生意参谋',
}));

const allConnectorOptions = [...connectorOptions, ...sycmMockConnectors];
const CONNECTOR_MARKET_BATCH_SIZE = 24;

const getBizParamRecordsMap = () => (
  businessParamTypeList.reduce<Record<string, BizParamOption[]>>((acc, item) => {
    acc[item.value] = getBusinessParamSets(item.value);
    return acc;
  }, {})
);

const pddStoreList = '拼多多测试店铺辰南,测试店铺,moodytiger童装童鞋店,拼多多海淘-思麦海外专营店-测试,拼多多海淘-HUYE保健食品海外专营店-测试,拼多多海淘-SEMAL保健食品官方海外旗舰店-测试,拼多多海淘-CUIXO保健食品海外旗舰店-测试,拼多多海淘-CUIXO海外旗舰店-测试,你好我是测试店铺,测试3,zddtest,Bigdata BetterLife,1店,艾尔的测试店铺1,测试拼多多_夏目,辰南的测试店铺3,辰南的测试店铺,演示1,蓝漂日用品官方旗舰店,逐本旗舰店,非默旗舰店财务,芙顺堂御草堂专卖店';
const taoxiLongStoreList = '1233445,测试0412,西岸化妆品旗舰店,蒙奇的店铺,美岸十字绣专营店1,dianpu,凯伦诗旗舰店,123,测试duote,11123345,测试001,美岸十字绣专营店,xsax,11,白菜Test,测试店铺_夏目,111114455,22 wer,111muzi,111ujj,逐本旗舰店,1111wanglei,1111,111,xxxxx,都市丽人子账号,cesaa,1.10测试用户,农夫山泉官方旗舰店,zippo旗舰店,诗凡黎官方旗舰店,伊芙丽旗舰店,怡恩贝旗舰店,实在智能旗舰店,蒙奇测试,测试店铺,淘宝测试店铺,ransheng天猫测试,爱凯医疗器械专营店,华丽美旗舰店,测试旗舰店,小D家的店,熊二测试店铺';
const pddStoreListShort = '测试店铺,moodytiger童装童鞋店,拼多多海淘-思麦海外专营店-测试,拼多多海淘-HUYE保健食品海外专营店-测试,拼多多海淘-SEMAL保健食品官方海外旗舰店-测试,拼多多海淘-CUIXO保健食品海外旗舰店-测试,拼多多海淘-CUIXO海外旗舰店-测试,你好我是测试店铺,测试3,zddtest,Bigdata BetterLife,1店,艾尔的测试店铺1,测试拼多多_夏目,辰南的测试店铺3,辰南的测试店铺,演示1,蓝漂日用品官方旗舰店,逐本旗舰店,非默旗舰店财务,拼多多测试店铺辰南,芙顺堂御草堂专卖店';

const onlineDailyRows: PlanRecord[] = [
  { id: 'plan-001', jobType: 'daily', jobName: '日常计划-京东-20260630-150746', createTime: '2026-06-30 15:08:05', priority: 1, jobDescription: '--', channelKey: 'jd', channel: '京东', platformKey: 'jd-business', platform: '京东商智(商家版)', storeId: 'store-jd-1', storeName: '京东1测试店', dataCycle: 1, planStatus: false, botName: 'RMX6688' },
  { id: 'plan-002', jobType: 'daily', jobName: '日常计划-淘系', createTime: '2026-06-23 16:06:07', priority: 1, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'sycm', platform: '生意参谋', storeId: 'store-taoxi-1', storeName: '测试店铺xxx', dataCycle: 1, planStatus: false, botName: '电商01火山云' },
  { id: 'plan-003', jobType: 'daily', jobName: '日常计划-京东-20260623-111709', createTime: '2026-06-23 11:18:42', priority: 1, jobDescription: '--', channelKey: 'jd', channel: '京东', platformKey: 'jd-business', platform: '京东商智(商家版)', storeId: 'store-jd-1', storeName: '京东1测试店', dataCycle: 1, planStatus: false, botName: '电商01火山云' },
  { id: 'plan-004', jobType: 'daily', jobName: '测试011', createTime: '2026-06-16 18:17:11', priority: 1, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'sycm', platform: '生意参谋', storeId: 'store-taoxi-2', storeName: '淘系测试', dataCycle: 1, planStatus: false, botName: '电商01火山云' },
  { id: 'plan-005', jobType: 'daily', jobName: '派蒙-小红书聚光账户报表-定制', createTime: '2026-06-11 20:23:47', priority: 5, jobDescription: '--', channelKey: 'xiaohongshu', channel: '小红书', platformKey: 'juguang', platform: '聚光平台', storeId: 'store-xhs-1', storeName: '11', dataCycle: 1, planStatus: false, botName: '派蒙' },
  { id: 'plan-006', jobType: 'daily', jobName: '马丁测试', createTime: '2026-06-05 18:48:00', priority: 8, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'sycm', platform: '生意参谋', storeId: 'store-taoxi-3', storeName: '淘系测试,测试', dataCycle: 1, planStatus: false, botName: '派蒙' },
  { id: 'plan-007', jobType: 'daily', jobName: '日常计划-淘系-20260529-161938', createTime: '2026-05-29 16:20:24', priority: 5, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'alimama', platform: '阿里妈妈', storeId: 'store-taoxi-4', storeName: 'moodytiger旗舰店', dataCycle: 1, planStatus: false, botName: '动态分配' },
  { id: 'plan-008', jobType: 'daily', jobName: '日常计划-淘系-20260513-183658', createTime: '2026-05-13 18:37:12', priority: 1, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'sycm', platform: '生意参谋', storeId: 'store-taoxi-3', storeName: '淘系测试,测试', dataCycle: 1, planStatus: false, botName: '电商01火山云' },
  { id: 'plan-009', jobType: 'daily', jobName: '日常计划-拼多多327回归9', createTime: '2026-05-08 18:45:59', priority: 5, jobDescription: '--', channelKey: 'pdd', channel: '拼多多', platformKey: 'pdd-shop', platform: '拼多多商家后台', storeId: 'store-pdd-1', storeName: pddStoreList, dataCycle: 1, planStatus: false, botName: 'yA0' },
  { id: 'plan-010', jobType: 'daily', jobName: '淘系日常数据采集-生意参谋', createTime: '2026-04-22 18:34:04', priority: 1, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'sycm-new', platform: '生意参谋(新版)', storeId: 'store-taoxi-5', storeName: '测试0001生意参谋,moodytiger旗舰店,凯伦诗旗舰店,科迪店铺001,测试', dataCycle: 1, planStatus: false, botName: '星泽测试' },
  { id: 'plan-011', jobType: 'daily', jobName: '大02-淘系-生意参谋', createTime: '2026-04-01 10:57:13', priority: 5, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'sycm', platform: '生意参谋', storeId: 'store-taoxi-6', storeName: '测试', dataCycle: 1, planStatus: false, botName: '21091116AC' },
  { id: 'plan-012', jobType: 'daily', jobName: '日常计划-淘系-20260324-102627', createTime: '2026-03-24 10:26:41', priority: 5, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'alimama', platform: '阿里妈妈', storeId: 'store-taoxi-7', storeName: '111', dataCycle: 1, planStatus: false, botName: '动态分配' },
  { id: 'plan-013', jobType: 'daily', jobName: '日常计划-淘系-20260324-101156', createTime: '2026-03-24 10:12:11', priority: 1, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'sycm', platform: '生意参谋', storeId: 'store-taoxi-8', storeName: taoxiLongStoreList, dataCycle: 1, planStatus: false, botName: '电商01火山云' },
  { id: 'plan-014', jobType: 'daily', jobName: '日常计划-淘系-20260318-215528', createTime: '2026-03-18 21:56:22', priority: 1, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'sycm', platform: '生意参谋', storeId: 'store-taoxi-6', storeName: '测试', dataCycle: 1, planStatus: false, botName: '动态分配' },
  { id: 'plan-015', jobType: 'daily', jobName: '日常计划-小红书-20260312-142853', createTime: '2026-03-12 14:29:14', priority: 5, jobDescription: '--', channelKey: 'xiaohongshu', channel: '小红书', platformKey: 'xhs', platform: '小红书', storeId: 'store-xhs-2', storeName: '测试', dataCycle: 1, planStatus: false, botName: 'p3oxn2m0e7qldwy' },
  { id: 'plan-016', jobType: 'daily', jobName: '日常计划-淘系-20260228-151517', createTime: '2026-02-28 15:15:37', priority: 1, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'sycm', platform: '生意参谋', storeId: 'store-taoxi-6', storeName: '测试', dataCycle: 1, planStatus: false, botName: '电商01火山云' },
  { id: 'plan-017', jobType: 'daily', jobName: '日常计划-拼多多-20260226-094756', createTime: '2026-02-26 09:48:11', priority: 5, jobDescription: '--', channelKey: 'pdd', channel: '拼多多', platformKey: 'pdd-shop', platform: '拼多多商家后台', storeId: 'store-pdd-2', storeName: pddStoreListShort, dataCycle: 1, planStatus: false, botName: '电商01火山云' },
  { id: 'plan-018', jobType: 'daily', jobName: '日常计划-小红书-20260209-194451', createTime: '2026-02-09 19:45:26', priority: 5, jobDescription: '--', channelKey: 'xiaohongshu', channel: '小红书', platformKey: 'xhs', platform: '小红书', storeId: 'store-xhs-2', storeName: '测试', dataCycle: 1, planStatus: false, botName: '钉1' },
  { id: 'plan-019', jobType: 'daily', jobName: '日常计划-淘系-20260109-142446', createTime: '2026-01-09 14:25:42', priority: 1, jobDescription: '--', channelKey: 'taoxi', channel: '淘系', platformKey: 'sycm', platform: '生意参谋', storeId: 'store-taoxi-9', storeName: '1233445', dataCycle: 1, planStatus: false, botName: '电商01火山云' },
  { id: 'plan-020', jobType: 'daily', jobName: '日常计划-小红书-20251226-180630', createTime: '2025-12-26 18:06:44', priority: 5, jobDescription: '--', channelKey: 'xiaohongshu', channel: '小红书', platformKey: 'xhs-shop', platform: '小红书商家后台', storeId: 'store-xhs-3', storeName: '科奈美旗舰店,aisei爱谢旗舰店', dataCycle: 1, planStatus: false, botName: 'tuling' },
];

const createDefaultRetryConfig = (index?: number): PlanRetryConfig => {
  const enabled = typeof index === 'number' && index < 6 && index % 2 === 0;
  const specifiedResource = enabled && index % 4 === 0;
  return {
    enabled,
    executionTimeRange: ['00:00:00', '23:59:59'],
    distributionType: specifiedResource ? 2 : 1,
    botIds: specifiedResource ? ['bot-huoshan-01'] : [],
  };
};

const initialPlanRecords = onlineDailyRows.map((record, index) => ({
  ...record,
  retryConfig: createDefaultRetryConfig(index),
}));

const getPlatformOptions = (channelKey?: string) => (
  channelOptions.find((item) => item.key === channelKey)?.subList || []
);

const getStoreOptions = (
  records: PlanRecord[],
  channelKey?: string,
  platformKey?: string,
): StoreOption[] => {
  const optionMap = new Map<string, StoreOption>();
  records.forEach((record) => {
    if (channelKey && record.channelKey !== channelKey) return;
    if (platformKey && record.platformKey !== platformKey) return;
    optionMap.set(record.storeId, {
      id: record.storeId,
      channelKey: record.channelKey,
      platformKey: record.platformKey,
      storeName: record.storeName,
    });
  });
  return Array.from(optionMap.values());
};

const getConnectorOptions = (channelKey?: string, platformKey?: string, dataCycle?: DataCycle) => (
  allConnectorOptions.filter((item) => (
    (!channelKey || item.channelKey === channelKey)
    && (!platformKey || item.platformKey === platformKey)
    && (!dataCycle || item.dataCycle === dataCycle)
  ))
);

const getDefaultConnectors = (channelKey?: string, platformKey?: string) => (
  getConnectorOptions(channelKey, platformKey).slice(0, 1)
);

const getConnectorRef = (connector: ConnectorOption) => ({
  id: connector.connectorId,
  name: connector.connectorName,
});

const hydrateConnectorWithDefaultParam = (connector: ConnectorOption): ConnectorOption => {
  if (!connector.bizParamType || connector.bizParamId) return connector;
  const defaultParam = getDefaultBusinessParamSetForConnector(connector.connectorId);
  if (!defaultParam) return connector;
  return {
    ...connector,
    bizParamId: defaultParam.id,
    bizParamName: defaultParam.paramName,
  };
};

const isConnectorMissingBizParam = (connector: ConnectorOption) => (
  Boolean(connector.bizParamType && !connector.bizParamId && !getDefaultBusinessParamSetForConnector(connector.connectorId))
);

const toArray = <T,>(value?: T | T[]) => {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
};

const padTime = (value?: number) => `${value || 0}`.padStart(2, '0');

const formatPickerValue = (value: any, format: string) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value?.format === 'function') return value.format(format);
  return String(value);
};

const getRobotByName = (botName?: string) => (
  robotOptions.find((item) => item.botName === botName)
);

const getRobotName = (botUuid?: string) => (
  robotOptions.find((item) => item.botUuid === botUuid)?.botName || '--'
);

const getDefaultPlanName = (jobType: JobType, records: PlanRecord[]) => {
  const prefix = jobNamePrefixMap[jobType];
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  const maxIndex = records.reduce((max, record) => {
    if (record.jobType !== jobType) return max;
    const match = record.jobName.match(pattern);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}${String(maxIndex + 1).padStart(2, '0')}`;
};

const getScheduleDescription = (values: Record<string, any>) => {
  if (values.executeType !== 9) return '--';
  const scheduleType = values.scheduleType as ScheduleType;

  if (scheduleType === 2) return formatPickerValue(values.timingAt, 'YYYY-MM-DD HH:mm:ss') || '--';
  if (scheduleType === 1) return `每 ${values.fixTime || 20} 分钟`;
  if (scheduleType === 3) {
    return `每 ${values.hourInterval || 1} 小时 ${padTime(values.hourMinute)} 分执行`;
  }
  if (scheduleType === 4) {
    return `每天 ${formatPickerValue(values.dayTime, 'HH:mm') || '08:00'}`;
  }
  if (scheduleType === 5) {
    const weekLabels = toArray<string>(values.weekDays)
      .map((key) => weekOptions.find((item) => item.key === key)?.value)
      .filter(Boolean)
      .join('、');
    return `每周${weekLabels || '周一'} ${formatPickerValue(values.weekTime, 'HH:mm') || '08:00'}`;
  }
  if (scheduleType === 6) {
    const dayLabels = toArray<string>(values.monthDays).join('、') || '1';
    return `每月${dayLabels}日 ${formatPickerValue(values.monthTime, 'HH:mm') || '08:00'}`;
  }
  return values.cronExpression || '高级定时';
};

const hasFilters = (filters: {
  jobName: string;
  channelKey?: string;
  platformKey?: string;
  storeId?: string;
  dataCycle?: DataCycle;
  planStatusFilter?: PlanStatusFilter;
  retryStatus?: RetryStatusFilter;
  botName?: string;
}) => (
  Boolean(filters.jobName)
  || Boolean(filters.channelKey)
  || Boolean(filters.platformKey)
  || Boolean(filters.storeId)
  || Boolean(filters.dataCycle)
  || filters.planStatusFilter !== undefined
  || filters.retryStatus !== undefined
  || Boolean(filters.botName)
);

function StoreDropdownSelect({
  value,
  options,
  disabled,
  placeholder = '请选择',
  onChange,
}: StoreDropdownSelectProps) {
  const [keyword, setKeyword] = useState('');
  const selectedKeys = value || [];
  const selectedOptions = options.filter((item) => selectedKeys.includes(item.id));
  const filteredOptions = options.filter((item) => item.storeName.includes(keyword));

  const toggleStore = (storeId: string) => {
    if (disabled) return;
    const next = selectedKeys.includes(storeId)
      ? selectedKeys.filter((key) => key !== storeId)
      : [...selectedKeys, storeId];
    onChange?.(next);
  };

  const dropdownContent = (
    <div className={styles.storeDropdownPanel} onClick={(event) => event.stopPropagation()}>
      <Input.Search
        allowClear
        size="small"
        placeholder="搜索店铺"
        value={keyword}
        onChange={setKeyword}
      />
      {filteredOptions.length ? (
        <Menu className={styles.storeDropdownMenu} onClickMenuItem={toggleStore}>
          {filteredOptions.map((item) => (
            <Menu.Item key={item.id}>
              <div className={styles.storeDropdownMenuItem}>
                <Checkbox checked={selectedKeys.includes(item.id)} />
                <span>{item.storeName}</span>
              </div>
            </Menu.Item>
          ))}
        </Menu>
      ) : (
        <Empty description="暂无店铺" />
      )}
    </div>
  );

  return (
    <Dropdown disabled={disabled} droplist={dropdownContent} position="bl" trigger="click">
      <div
        className={`${styles.storeDropdownTrigger} ${disabled ? styles.storeDropdownTriggerDisabled : ''}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <div className={styles.storeDropdownTags}>
          {selectedOptions.length ? (
            selectedOptions.map((item) => (
              <Tag
                key={item.id}
                size="small"
                color="arcoblue"
                closable={!disabled}
                onClose={(event) => {
                  event.stopPropagation();
                  toggleStore(item.id);
                }}
              >
                {item.storeName}
              </Tag>
            ))
          ) : (
            <span className={styles.storeDropdownPlaceholder}>{placeholder}</span>
          )}
        </div>
        <IconDown />
      </div>
    </Dropdown>
  );
}

const renderBizParamPreviewTable = (param: BizParamOption) => {
  const rows = param.previewRows.map((row, index) => ({ ...row, key: `${param.id}-${index}` }));
  const columns: ColumnProps<Record<string, string>>[] = param.previewColumns.map((column) => ({
    title: column,
    dataIndex: column,
    ellipsis: true,
  }));

  return (
    <Table<Record<string, string>>
      rowKey="key"
      className={styles.paramPreviewTable}
      data={rows}
      columns={columns}
      pagination={false}
      scroll={{ y: 132 }}
    />
  );
};

const createEmptyBizParamRow = (columns: string[]) => columns.reduce<Record<string, string>>((row, column) => {
  row[column] = '';
  return row;
}, {});

export default function TaskPlanManagement() {
  const [form] = Form.useForm();
  const [records, setRecords] = useState<PlanRecord[]>(initialPlanRecords);
  const [activeJobType, setActiveJobType] = useState<JobType>('daily');
  const [filters, setFilters] = useState({
    jobName: '',
    channelKey: undefined as string | undefined,
    platformKey: undefined as string | undefined,
    storeId: undefined as string | undefined,
    dataCycle: undefined as DataCycle | undefined,
    planStatusFilter: undefined as PlanStatusFilter | undefined,
    retryStatus: undefined as RetryStatusFilter | undefined,
    botName: undefined as string | undefined,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<string | number>>([]);
  const [planDrawerVisible, setPlanDrawerVisible] = useState(false);
  const [connectorValidationVisible, setConnectorValidationVisible] = useState(false);
  const [connectorModalVisible, setConnectorModalVisible] = useState(false);
  const [connectorManageRecords, setConnectorManageRecords] = useState<ConnectorOption[]>([]);
  const [connectorMarketVisibleCount, setConnectorMarketVisibleCount] = useState(CONNECTOR_MARKET_BATCH_SIZE);
  const [connectorSearchName, setConnectorSearchName] = useState('');
  const [connectorParamVisible, setConnectorParamVisible] = useState(false);
  const [editingConnectorId, setEditingConnectorId] = useState<string>();
  const [editingConnectorIds, setEditingConnectorIds] = useState<string[]>([]);
  const [connectorParamTarget, setConnectorParamTarget] = useState<ConnectorParamTarget>('drawer');
  const [bizParamRecords, setBizParamRecords] = useState<Record<string, BizParamOption[]>>(getBizParamRecordsMap);
  const [bizParamDraftId, setBizParamDraftId] = useState<string>();
  const [bizParamCreateVisible, setBizParamCreateVisible] = useState(false);
  const [bizParamCreateName, setBizParamCreateName] = useState('');
  const [bizParamCreateRemark, setBizParamCreateRemark] = useState('');
  const [bizParamCreateRows, setBizParamCreateRows] = useState<Array<Record<string, string>>>([]);
  const [bizParamCreateDefault, setBizParamCreateDefault] = useState(false);
  const [bizParamCreateErrors, setBizParamCreateErrors] = useState<BizParamCreateErrors>({ cells: {} });
  const [paramStartOffset, setParamStartOffset] = useState(1);
  const [paramEndOffset, setParamEndOffset] = useState(1);
  const [paramAdvancedOpen, setParamAdvancedOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PlanRecord | null>(null);
  const [modalChannelKey, setModalChannelKey] = useState<string>();
  const [modalPlatformKey, setModalPlatformKey] = useState<string>();
  const [modalDataCycle, setModalDataCycle] = useState<DataCycle>(1);
  const [modalConnectorList, setModalConnectorList] = useState<ConnectorOption[]>([]);
  const [pathPreview, setPathPreview] = useState<{ title: string; imageUrl: string }>();
  const [executeType, setExecuteType] = useState<ExecuteType>(9);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(4);
  const [timingTimeType, setTimingTimeType] = useState<TimingTimeType>(0);
  const [distributionType, setDistributionType] = useState<DistributionType>(1);
  const [retryEnabled, setRetryEnabled] = useState(false);
  const [retryDistributionType, setRetryDistributionType] = useState<DistributionType>(1);
  const [planAdvancedOpen, setPlanAdvancedOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<PlanRecord | null>(null);

  const storeOptions = getStoreOptions(records, filters.channelKey);
  const modalPlatformOptions = getPlatformOptions(modalChannelKey);
  const modalStoreOptions = getStoreOptions(records, modalChannelKey, modalPlatformKey);
  const modalConnectorOptions = getConnectorOptions(modalChannelKey, modalPlatformKey, modalDataCycle);
  const connectorEditSource = connectorParamTarget === 'manage' ? connectorManageRecords : modalConnectorList;
  const editingConnector = connectorEditSource.find((item) => item.connectorId === editingConnectorId);
  const editingBizParamOptions = editingConnector?.bizParamType
    ? bizParamRecords[editingConnector.bizParamType] || []
    : [];
  const editingBizParamCreateConfig = editingConnector?.bizParamType
    ? getBizParamCreateConfig(editingConnector.bizParamType as BusinessParamType, editingConnector.connectorId, editingConnector.connectorName)
    : undefined;
  const editingConnectorPreviewUrl = editingConnector
    ? editingConnector.pathImageUrl || createConnectorPathImage(editingConnector.connectorName)
    : '';
  const editingDateRangeInfo = getConnectorDateRangeInfo(editingConnector);
  const paramSetPlaceholder = editingConnector?.bizParamType
    ? bizParamSetPlaceholderMap[editingConnector.bizParamType] || '请选择参数集'
    : '请选择参数集';
  const hasMissingBizParams = modalConnectorList.some(isConnectorMissingBizParam);
  const showConnectorValidation = connectorValidationVisible && hasMissingBizParams;
  const connectorMarketData = modalConnectorOptions.filter((item) => (
    !connectorSearchName || item.connectorName.includes(connectorSearchName)
  ));
  const displayedConnectorMarketData = connectorMarketData.slice(0, connectorMarketVisibleCount);
  const dailyRecordCount = useMemo(() => records.filter((item) => item.jobType === 'daily').length, [records]);

  useEffect(() => subscribeBusinessParamStore(() => {
    setBizParamRecords(getBizParamRecordsMap());
  }), []);

  useEffect(() => {
    setConnectorMarketVisibleCount(CONNECTOR_MARKET_BATCH_SIZE);
  }, [connectorSearchName, modalChannelKey, modalPlatformKey, modalDataCycle, connectorModalVisible]);

  const filteredRecords = useMemo(() => records.filter((item) => (
    item.jobType === activeJobType
    && (!filters.jobName || item.jobName.includes(filters.jobName))
    && (!filters.channelKey || item.channelKey === filters.channelKey)
    && (!filters.storeId || item.storeId === filters.storeId)
    && (!filters.dataCycle || item.dataCycle === filters.dataCycle)
    && (filters.planStatusFilter === undefined || item.planStatus === (filters.planStatusFilter === 'open'))
    && (filters.retryStatus === undefined || Boolean(item.retryConfig?.enabled) === (filters.retryStatus === 'enabled'))
    && (!filters.botName || item.botName === filters.botName)
  )), [activeJobType, filters, records]);

  const pageData = filteredRecords.slice((page - 1) * pageSize, page * pageSize);
  const displayTotal = activeJobType === 'daily' && !hasFilters(filters)
    ? ONLINE_TOTAL + Math.max(0, dailyRecordCount - onlineDailyRows.length)
    : filteredRecords.length;

  const updateFilters = (patch: Partial<typeof filters>) => {
    setPage(1);
    setSelectedRowKeys([]);
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const resetFilters = () => {
    setPage(1);
    setSelectedRowKeys([]);
    setFilters({
      jobName: '',
      channelKey: undefined,
      platformKey: undefined,
      storeId: undefined,
      dataCycle: undefined,
      planStatusFilter: undefined,
      retryStatus: undefined,
      botName: undefined,
    });
  };

  const togglePlanStatus = (recordId: string, planStatus: boolean) => {
    setRecords((prev) => prev.map((item) => (
      item.id === recordId ? { ...item, planStatus } : item
    )));
    Message.success(planStatus ? '开启成功' : '关闭成功');
  };

  const resetPlanDrawerState = () => {
    form.resetFields();
    setEditingRecord(null);
    setConnectorValidationVisible(false);
    setModalChannelKey(undefined);
    setModalPlatformKey(undefined);
    setModalDataCycle(1);
    setModalConnectorList([]);
    setConnectorManageRecords([]);
    setConnectorSearchName('');
    setConnectorParamVisible(false);
    setEditingConnectorId(undefined);
    setEditingConnectorIds([]);
    setConnectorParamTarget('drawer');
    setBizParamDraftId(undefined);
    setParamAdvancedOpen(false);
    setExecuteType(9);
    setScheduleType(4);
    setTimingTimeType(0);
    setDistributionType(1);
    setRetryEnabled(false);
    setRetryDistributionType(1);
    setPlanAdvancedOpen(false);
  };

  const closePlanDrawer = () => {
    setPlanDrawerVisible(false);
    resetPlanDrawerState();
  };

  const openPlanDrawer = (record?: PlanRecord, payload?: OpenPlanDrawerPayload) => {
    const payloadConnector = payload?.connectorId
      ? connectorOptions.find((item) => item.connectorId === payload.connectorId)
      : undefined;
    const currentExecuteType = record?.executeType || 9;
    const currentScheduleType = record?.scheduleType && scheduleTypeOptions.some((item) => item.key === record.scheduleType)
      ? record.scheduleType
      : 4;
    const currentDistributionType = record?.distributionType
      || (record?.botName && record.botName !== '动态分配' ? 2 : 1);
    const currentRobot = getRobotByName(record?.botName);
    const currentRetryConfig = record?.retryConfig || createDefaultRetryConfig();
    const currentChannelKey = record?.channelKey || payload?.channelKey || payloadConnector?.channelKey || 'taoxi';
    const currentPlatformKey = record?.platformKey || payload?.platformKey || payloadConnector?.platformKey || 'sycm';
    const currentDataCycle = record?.dataCycle || payload?.dataCycle || payloadConnector?.dataCycle || 1;
    const currentConnectors = (record
      ? (record.connectorList?.length ? record.connectorList : getDefaultConnectors(record.channelKey, record.platformKey))
      : payloadConnector
        ? [payloadConnector]
        : getConnectorOptions(currentChannelKey, currentPlatformKey, currentDataCycle).slice(0, 2).reverse())
      .map(hydrateConnectorWithDefaultParam);
    const currentStoreIds = record?.storeIdList?.length
      ? record.storeIdList
      : record
        ? toArray(record.storeId)
        : getStoreOptions(records, currentChannelKey, currentPlatformKey).slice(0, 3).map((item) => item.id);

    setEditingRecord(record || null);
    setModalChannelKey(currentChannelKey);
    setModalPlatformKey(currentPlatformKey);
    setModalDataCycle(currentDataCycle);
    setModalConnectorList(currentConnectors);
    setExecuteType(currentExecuteType);
    setScheduleType(currentScheduleType);
    setTimingTimeType(record?.timingTimeType || 0);
    setDistributionType(currentDistributionType);
    setRetryEnabled(currentRetryConfig.enabled);
    setRetryDistributionType(currentRetryConfig.distributionType);
    setPlanAdvancedOpen(Boolean(record?.retryConfig?.enabled));
    form.setFieldsValue({
      jobName: record?.jobName || getDefaultPlanName(activeJobType, records),
      executeType: currentExecuteType,
      scheduleType: currentScheduleType,
      timingAt: record?.jobDescription && record.jobDescription !== '--' ? record.jobDescription : undefined,
      fixTime: 20,
      hourInterval: 1,
      hourMinute: 0,
      dayTime: '08:00',
      weekDays: ['2'],
      weekTime: '08:00',
      monthDays: ['1'],
      monthTime: '08:00',
      cronExpression: record?.jobDescription && record.scheduleType === 0 ? record.jobDescription : '',
      timingTimeType: record?.timingTimeType || 0,
      timingTimeDate: record?.scheduleStart && record?.scheduleEnd ? [record.scheduleStart, record.scheduleEnd] : undefined,
      channelKey: currentChannelKey,
      platformKey: currentPlatformKey,
      dataCycle: currentDataCycle,
      storeIdList: currentStoreIds,
      connectorList: currentConnectors,
      distributionType: currentDistributionType,
      botId: currentDistributionType === 2 ? currentRobot?.botUuid : undefined,
      retryEnabled: currentRetryConfig.enabled,
      retryExecutionTime: currentRetryConfig.executionTimeRange,
      retryDistributionType: currentRetryConfig.distributionType,
      retryBotId: currentRetryConfig.botIds[0],
    });
    setConnectorValidationVisible(false);
    setPlanDrawerVisible(true);
  };

  useEffect(() => {
    const openCreatePlanDrawer = (event: Event) => {
      openPlanDrawer(undefined, (event as CustomEvent<OpenPlanDrawerPayload>).detail);
    };
    window.addEventListener('task-plan:open-plan-drawer', openCreatePlanDrawer);
    return () => window.removeEventListener('task-plan:open-plan-drawer', openCreatePlanDrawer);
  }, []);

  const handleDrawerChannelChange = (value?: string) => {
    setModalChannelKey(value);
    setModalPlatformKey(undefined);
    setModalConnectorList([]);
    form.setFieldsValue({
      platformKey: undefined,
      storeIdList: [],
      connectorList: [],
    });
  };

  const handleDrawerPlatformChange = (value?: string) => {
    setModalPlatformKey(value);
    setModalConnectorList([]);
    form.setFieldsValue({
      storeIdList: [],
      connectorList: [],
    });
  };

  const handleDrawerDataCycleChange = (value: DataCycle) => {
    setModalDataCycle(value);
    setModalConnectorList([]);
    form.setFieldsValue({
      dataCycle: value,
      connectorList: [],
    });
  };

  const openConnectorSelector = () => {
    if (!modalChannelKey || !modalPlatformKey) {
      Message.warning('请先选择渠道和平台');
      return;
    }
    setConnectorManageRecords(modalConnectorList);
    setConnectorSearchName('');
    setConnectorModalVisible(true);
  };

  const confirmConnectorSelector = () => {
    if (!connectorManageRecords.length) {
      Message.warning('请选择数据源');
      return;
    }
    setModalConnectorList(connectorManageRecords);
    form.setFieldsValue({ connectorList: connectorManageRecords });
    setConnectorModalVisible(false);
  };

  const openConnectorParamEditor = (connector: ConnectorOption, target: ConnectorParamTarget = 'drawer') => {
    if (!connector.bizParamType) return;
    setConnectorParamTarget(target);
    setEditingConnectorId(connector.connectorId);
    setEditingConnectorIds([connector.connectorId]);
    setBizParamDraftId(connector.bizParamId || getDefaultBusinessParamSetForConnector(connector.connectorId)?.id);
    setParamStartOffset(1);
    setParamEndOffset(1);
    setParamAdvancedOpen(false);
    setConnectorParamVisible(true);
  };

  const closeBizParamCreateModal = () => {
    setBizParamCreateVisible(false);
    setBizParamCreateName('');
    setBizParamCreateRemark('');
    setBizParamCreateRows([]);
    setBizParamCreateDefault(false);
    setBizParamCreateErrors({ cells: {} });
  };

  const openBizParamCreateModal = () => {
    if (!editingConnector?.bizParamType || !editingBizParamCreateConfig) return;
    setBizParamCreateName('');
    setBizParamCreateRemark('');
    setBizParamCreateRows([createEmptyBizParamRow(editingBizParamCreateConfig.columns)]);
    setBizParamCreateDefault(false);
    setBizParamCreateErrors({ cells: {} });
    setBizParamCreateVisible(true);
  };

  const getAnnotationConnector = () => {
    const options = getConnectorOptions('taoxi', 'sycm', 1);
    return hydrateConnectorWithDefaultParam(
      options.find((item) => item.connectorId === 'connector-sycm-product') || options[0],
    );
  };

  const openAnnotationParamEditor = (showCreateModal = false) => {
    const connector = getAnnotationConnector();
    openPlanDrawer(undefined, {
      connectorId: connector.connectorId,
      channelKey: 'taoxi',
      platformKey: 'sycm',
      dataCycle: 1,
    });
    setModalConnectorList([connector]);
    form.setFieldsValue({ connectorList: [connector] });
    window.setTimeout(() => {
      openConnectorParamEditor(connector);
      if (!showCreateModal) return;
      const config = getBizParamCreateConfig(
        connector.bizParamType as BusinessParamType,
        connector.connectorId,
        connector.connectorName,
      );
      if (!config) return;
      setBizParamCreateName('');
      setBizParamCreateRemark('');
      setBizParamCreateRows([createEmptyBizParamRow(config.columns)]);
      setBizParamCreateDefault(false);
      setBizParamCreateErrors({ cells: {} });
      window.setTimeout(() => setBizParamCreateVisible(true), 80);
    }, 80);
  };

  useEffect(() => {
    const openPlanParamEditor = () => openAnnotationParamEditor(false);
    const openPlanParamCreate = () => openAnnotationParamEditor(true);

    window.addEventListener('business-custom:open-plan-param-editor', openPlanParamEditor);
    window.addEventListener('business-custom:open-plan-param-create', openPlanParamCreate);
    return () => {
      window.removeEventListener('business-custom:open-plan-param-editor', openPlanParamEditor);
      window.removeEventListener('business-custom:open-plan-param-create', openPlanParamCreate);
    };
  }, []);

  const updateBizParamCreateCell = (rowIndex: number, column: string, value: string) => {
    setBizParamCreateRows((prev) => prev.map((row, index) => (
      index === rowIndex ? { ...row, [column]: value } : row
    )));
    setBizParamCreateErrors((prev) => {
      const key = `${rowIndex}-${column}`;
      if (!prev.cells[key]) return prev;
      const { [key]: _removed, ...nextCells } = prev.cells;
      return { ...prev, cells: nextCells };
    });
  };

  const addBizParamCreateRow = () => {
    if (!editingBizParamCreateConfig) return;
    setBizParamCreateRows((prev) => [...prev, createEmptyBizParamRow(editingBizParamCreateConfig.columns)]);
  };

  const confirmBizParamCreate = () => {
    if (!editingConnector?.bizParamType || !editingBizParamCreateConfig) return;
    const paramName = bizParamCreateName.trim();
    const nextErrors: BizParamCreateErrors = { cells: {} };
    if (!paramName) {
      nextErrors.name = `请输入${editingBizParamCreateConfig.nameLabel}`;
    }
    const normalizedRows = bizParamCreateRows.map((row) => (
      editingBizParamCreateConfig.columns.reduce<Record<string, string>>((nextRow, column) => {
        nextRow[column] = (row[column] || '').trim();
        return nextRow;
      }, {})
    ));

    if (!normalizedRows.length) {
      editingBizParamCreateConfig.columns.forEach((column) => {
        nextErrors.cells[`0-${column}`] = `请填写${column}`;
      });
    }

    normalizedRows.forEach((row, rowIndex) => {
      editingBizParamCreateConfig.columns.forEach((column) => {
        if (!row[column]) {
          nextErrors.cells[`${rowIndex}-${column}`] = `请填写${column}`;
        }
      });
    });

    if (nextErrors.name || Object.keys(nextErrors.cells).length) {
      setBizParamCreateErrors(nextErrors);
      return;
    }

    const persistBizParamCreate = () => {
      const newParam = saveBusinessParamSet({
        bizParamType: editingConnector.bizParamType as BusinessParamType,
        paramName,
        paramRemark: bizParamCreateRemark,
        previewColumns: editingBizParamCreateConfig.columns,
        previewRows: normalizedRows,
        associatedConnectors: [getConnectorRef(editingConnector)],
        setDefaultConnectorId: bizParamCreateDefault ? editingConnector.connectorId : undefined,
      });
      setBizParamRecords(getBizParamRecordsMap());
      setBizParamDraftId(newParam.id);
      closeBizParamCreateModal();
      Message.success(bizParamCreateDefault ? '参数集已保存并设为默认配置' : '参数集已保存并使用');
    };

    if (bizParamCreateDefault) {
      const currentDefault = getDefaultBusinessParamSetForConnector(editingConnector.connectorId);
      if (currentDefault) {
        Modal.confirm({
          title: '更换默认参数配置',
          content: `当前数据源已绑定 ${currentDefault.paramName} 参数集，是否确定更换默认？`,
          okText: '确定更换',
          cancelText: '取消',
          onOk: persistBizParamCreate,
        });
        return;
      }
    }

    persistBizParamCreate();
  };

  const confirmConnectorParam = () => {
    if (!editingConnector) return;
    if (!bizParamDraftId) {
      Message.warning('请选择业务参数');
      return;
    }
    const bizParam = editingBizParamOptions.find((item) => item.id === bizParamDraftId);
    const selectedConnectors = connectorEditSource
      .filter((item) => editingConnectorIds.includes(item.connectorId))
      .map(getConnectorRef);
    associateBusinessParamSet(bizParamDraftId, selectedConnectors);
    setBizParamRecords(getBizParamRecordsMap());
    const updateConnectorParam = (item: ConnectorOption) => (
      editingConnectorIds.includes(item.connectorId)
        ? { ...item, bizParamId: bizParamDraftId, bizParamName: bizParam?.paramName }
        : item);
    if (connectorParamTarget === 'manage') {
      setConnectorManageRecords((prev) => prev.map(updateConnectorParam));
    } else {
      const nextConnectors = modalConnectorList.map(updateConnectorParam);
      setModalConnectorList(nextConnectors);
      form.setFieldsValue({ connectorList: nextConnectors });
    }
    setConnectorParamVisible(false);
    setEditingConnectorId(undefined);
    setEditingConnectorIds([]);
    setBizParamDraftId(undefined);
    Message.success('业务参数已补充');
  };

  const toggleManagedConnector = (connector: ConnectorOption) => {
    setConnectorManageRecords((prev) => {
      const exists = prev.some((item) => item.connectorId === connector.connectorId);
      if (exists) return prev.filter((item) => item.connectorId !== connector.connectorId);
      return [...prev, hydrateConnectorWithDefaultParam(connector)];
    });
  };

  const editMarketConnectorParam = (connector: ConnectorOption) => {
    const hydratedConnector = connectorManageRecords.find((item) => item.connectorId === connector.connectorId)
      || hydrateConnectorWithDefaultParam(connector);
    setConnectorManageRecords((prev) => (
      prev.some((item) => item.connectorId === hydratedConnector.connectorId)
        ? prev
        : [...prev, hydratedConnector]
    ));
    openConnectorParamEditor(hydratedConnector, 'manage');
  };

  const removeConnector = (connectorId: string) => {
    const nextConnectors = modalConnectorList.filter((item) => item.connectorId !== connectorId);
    setModalConnectorList(nextConnectors);
    form.setFieldsValue({ connectorList: nextConnectors });
  };

  const validatePlanFlowConfig = () => {
    const values = form.getFieldsValue();
    if (!values.channelKey) {
      Message.warning('请选择平台类型');
      return false;
    }
    if (!values.platformKey) {
      Message.warning('请选择子平台');
      return false;
    }
    if (!values.dataCycle) {
      Message.warning('请选择数据周期');
      return false;
    }
    if (!toArray<string>(values.storeIdList).length) {
      Message.warning('请选择店铺');
      return false;
    }
    if (!modalConnectorList.length) {
      Message.warning('请选择数据源');
      return false;
    }
    const missingConnector = modalConnectorList.find(isConnectorMissingBizParam);
    if (missingConnector) {
      Message.warning(`${missingConnector.connectorName} 业务参数不能为空`);
      return false;
    }
    return true;
  };

  const savePlan = () => {
    setConnectorValidationVisible(true);
    if (!validatePlanFlowConfig()) return;
    form.validate().then((values) => {
      const channel = channelOptions.find((item) => item.key === values.channelKey);
      const platform = channel?.subList.find((item) => item.key === values.platformKey);
      const selectedStoreIds = toArray<string>(values.storeIdList);
      const selectedStores = getStoreOptions(records, values.channelKey, values.platformKey)
        .filter((item) => selectedStoreIds.includes(item.id));
      const selectedConnectors = modalConnectorList.length
        ? modalConnectorList
        : toArray<ConnectorOption>(values.connectorList);
      const currentDistributionType = values.distributionType as DistributionType;
      const selectedBotId = currentDistributionType === 2 ? values.botId : undefined;
      const selectedBotIds = selectedBotId ? [selectedBotId] : [];
      const botName = currentDistributionType === 2 ? getRobotName(selectedBotId) : '动态分配';
      const scheduleStart = formatPickerValue(values.timingTimeDate?.[0], 'YYYY-MM-DD HH:mm:ss');
      const scheduleEnd = formatPickerValue(values.timingTimeDate?.[1], 'YYYY-MM-DD HH:mm:ss');
      const recordJobType = editingRecord?.jobType || activeJobType;
      const jobName = values.jobName || getDefaultPlanName(recordJobType, records);
      const retryExecutionTime: [string, string] = retryEnabled
        ? [
          formatPickerValue(values.retryExecutionTime?.[0], 'HH:mm:ss') || '00:00:00',
          formatPickerValue(values.retryExecutionTime?.[1], 'HH:mm:ss') || '23:59:59',
        ]
        : ['00:00:00', '23:59:59'];
      const retryBotIds = retryEnabled && retryDistributionType === 2
        ? toArray<string>(values.retryBotId)
        : [];
      const nextRecord: PlanRecord = {
        ...(editingRecord || {}),
        id: editingRecord?.id || `plan-${Date.now()}`,
        jobType: recordJobType,
        jobName,
        createTime: editingRecord?.createTime || '2026-07-13 21:00:00',
        priority: editingRecord?.priority || (activeJobType === 'daily' ? 1 : 5),
        jobDescription: getScheduleDescription(values),
        channelKey: values.channelKey,
        channel: channel?.value || '--',
        platformKey: values.platformKey,
        platform: platform?.value || '--',
        storeId: selectedStoreIds[0] || '',
        storeIdList: selectedStoreIds,
        storeName: selectedStores.map((item) => item.storeName).join(',') || '--',
        dataCycle: values.dataCycle || selectedConnectors[0]?.dataCycle || editingRecord?.dataCycle || 1,
        planStatus: values.executeType === 9,
        botName,
        executeType: values.executeType,
        scheduleType: values.executeType === 9 ? values.scheduleType : undefined,
        timingTimeType: values.executeType === 9 ? values.timingTimeType : undefined,
        scheduleStart: values.executeType === 9 && values.timingTimeType === 1 ? scheduleStart : undefined,
        scheduleEnd: values.executeType === 9 && values.timingTimeType === 1 ? scheduleEnd : undefined,
        bizStartTime: undefined,
        bizEndTime: undefined,
        connectorList: selectedConnectors,
        distributionType: currentDistributionType,
        botIds: selectedBotIds,
        retryConfig: {
          enabled: retryEnabled,
          executionTimeRange: retryExecutionTime,
          distributionType: retryEnabled ? retryDistributionType : 1,
          botIds: retryBotIds,
        },
      };
      setRecords((prev) => {
        if (editingRecord) {
          return prev.map((item) => (item.id === editingRecord.id ? nextRecord : item));
        }
        return [nextRecord, ...prev];
      });
      setPage(1);
      setSelectedRowKeys([]);
      setPlanDrawerVisible(false);
      resetPlanDrawerState();
      Message.success(editingRecord ? '更新成功' : '新增成功');
    });
  };

  const deleteRecords = (ids: Array<string | number>) => {
    if (!ids.length) return;
    Modal.confirm({
      title: ids.length === 1 ? '删除计划' : '批量删除',
      content: ids.length === 1 ? '确定删除该计划吗？' : `确定删除选中的 ${ids.length} 条计划吗？`,
      okText: '删除',
      okButtonProps: { status: 'danger' },
      onOk: () => {
        const idSet = new Set(ids.map(String));
        setRecords((prev) => prev.filter((item) => !idSet.has(item.id)));
        setSelectedRowKeys([]);
        Message.success('删除成功');
      },
    });
  };

  const handleMoreAction = (key: string, record: PlanRecord) => {
    if (key === 'detail') {
      setDetailRecord(record);
      return;
    }
    if (key === 'run') {
      Message.success('执行成功');
      return;
    }
    if (key === 'retro') {
      Message.info(`已从 ${record.jobName} 新建回溯`);
      return;
    }
    if (key === 'copy') {
      const copiedRecord: PlanRecord = {
        ...record,
        id: `plan-${Date.now()}`,
        jobName: `${record.jobName}-复制`,
        createTime: '2026-07-13 21:00:00',
        retryConfig: record.retryConfig ? {
          ...record.retryConfig,
          executionTimeRange: [...record.retryConfig.executionTimeRange] as [string, string],
          botIds: [...record.retryConfig.botIds],
        } : createDefaultRetryConfig(),
      };
      setRecords((prev) => [copiedRecord, ...prev]);
      Message.success('复制成功');
      return;
    }
    if (key === 'delete') {
      deleteRecords([record.id]);
    }
  };

  const renderScheduleConfig = () => {
    if (executeType !== 9) return null;
    return (
      <>
        <Form.Item
          field="scheduleType"
          label="定时类型"
          requiredSymbol={false}
          rules={[{ required: true, message: '请选择定时类型' }]}
        >
          <Radio.Group
            value={scheduleType}
            onChange={(value) => {
              setScheduleType(value);
              form.setFieldValue('scheduleType', value);
            }}
          >
            {scheduleTypeOptions.map((item) => (
              <Radio key={item.key} value={item.key}>{item.value}</Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        {scheduleType === 2 ? (
          <Form.Item field="timingAt" label="执行时间" rules={[{ required: true, message: '请选择执行时间' }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
          </Form.Item>
        ) : null}

        {scheduleType === 1 ? (
          <Form.Item field="fixTime" label="间隔周期" rules={[{ required: true, message: '请选择间隔周期' }]}>
            <Select placeholder="请选择间隔周期">
              {intervalMinuteOptions.map((item) => (
                <Select.Option key={item.key} value={item.key}>{item.value}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        ) : null}

        {scheduleType === 3 ? (
          <Form.Item label="间隔周期" required>
            <Input.Group compact className={styles.scheduleInline}>
              <Form.Item field="hourInterval" noStyle rules={[{ required: true, message: '请选择小时' }]}>
                <Select placeholder="小时">
                  {[1, 2, 3, 4, 6, 8, 12].map((item) => (
                    <Select.Option key={item} value={item}>{item}小时</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item field="hourMinute" noStyle rules={[{ required: true, message: '请选择分钟' }]}>
                <Select placeholder="分钟">
                  {minuteOptions.map((item) => (
                    <Select.Option key={item.key} value={item.key}>{item.value}分</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Input.Group>
          </Form.Item>
        ) : null}

        {scheduleType === 4 ? (
          <Form.Item field="dayTime" label="执行时间" rules={[{ required: true, message: '请选择执行时间' }]}>
            <TimePicker
              format="HH:mm"
              showNowBtn={false}
              style={{ width: '100%' }}
              triggerProps={{
                autoAlignPopupWidth: true,
                containerScrollToClose: true,
                className: styles.scheduleTimePopup,
              }}
            />
          </Form.Item>
        ) : null}

        {scheduleType === 5 ? (
          <>
            <Form.Item field="weekDays" label="执行星期" rules={[{ required: true, message: '请选择执行星期' }]}>
              <Select
                mode="multiple"
                placeholder="请选择执行星期"
                maxTagCount="responsive"
                dropdownMenuClassName={styles.scheduleMultiDropdown}
              >
                {weekOptions.map((item) => (
                  <Select.Option key={item.key} value={item.key}>{item.value}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item field="weekTime" label="执行时间" rules={[{ required: true, message: '请选择执行时间' }]}>
              <TimePicker
                format="HH:mm"
                showNowBtn={false}
                style={{ width: '100%' }}
                triggerProps={{
                  autoAlignPopupWidth: true,
                  containerScrollToClose: true,
                  className: styles.scheduleTimePopup,
                }}
              />
            </Form.Item>
          </>
        ) : null}

        {scheduleType === 6 ? (
          <>
            <Form.Item
              field="monthDays"
              label="执行日期"
              requiredSymbol={false}
              rules={[{ required: true, message: '请选择执行日期' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择执行日期"
                maxTagCount="responsive"
                dropdownMenuClassName={styles.scheduleMultiDropdown}
              >
                {monthDayOptions.map((item) => (
                  <Select.Option key={item.key} value={item.key}>{item.value}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item field="monthTime" label="执行时间" rules={[{ required: true, message: '请选择执行时间' }]}>
              <TimePicker
                format="HH:mm"
                showNowBtn={false}
                style={{ width: '100%' }}
                triggerProps={{
                  autoAlignPopupWidth: true,
                  containerScrollToClose: true,
                  className: styles.scheduleTimePopup,
                }}
              />
            </Form.Item>
          </>
        ) : null}

        {scheduleType === 0 ? (
          <Form.Item field="cronExpression" label="Cron 表达式" rules={[{ required: true, message: '请输入 Cron 表达式' }]}>
            <Input.TextArea
              className={styles.cronEditor}
              autoSize={{ minRows: 4, maxRows: 6 }}
              placeholder="请输入 Cron 表达式，例如：0 0 8 * * ?"
            />
          </Form.Item>
        ) : null}

      </>
    );
  };

  const columns: ColumnProps<PlanRecord>[] = [
    {
      title: '计划名称',
      dataIndex: 'jobName',
      width: 260,
      ellipsis: true,
      render: (value, record) => (
        <Tooltip content={value}>
          <div className={styles.planNameCell}>
            <div className={styles.planTitle}>{value}</div>
            <div className={styles.planMeta}>
              <span>{record.createTime}</span>
              <Tag size="small" color="arcoblue" className={styles.priorityTag}>P{record.priority}</Tag>
            </div>
          </div>
        </Tooltip>
      ),
    },
    { title: '执行时间', dataIndex: 'jobDescription', width: 150, ellipsis: true },
    { title: '平台类型', dataIndex: 'channel', width: 130, ellipsis: true },
    { title: '平台名称', dataIndex: 'platform', width: 180, ellipsis: true },
    { title: '店铺名称', dataIndex: 'storeName', width: 280, ellipsis: true },
    {
      title: '数据周期',
      dataIndex: 'dataCycle',
      width: 100,
      render: (value: DataCycle) => dataCycleLabel[value] || '--',
    },
    {
      title: (
        <AutoRetryAnnotationMarker noteId="AR-1.1">
          重试
        </AutoRetryAnnotationMarker>
      ),
      dataIndex: 'retryConfig',
      width: 180,
      render: (value?: PlanRetryConfig) => {
        if (!value?.enabled) return <Tag>未开启</Tag>;
        return <Tag color="arcoblue">已开启</Tag>;
      },
    },
    {
      title: '定时执行',
      dataIndex: 'planStatus',
      width: 130,
      render: (value: boolean, record) => (
        <Switch
          checked={value}
          checkedText="开启"
          uncheckedText="关闭"
          onChange={(checked) => togglePlanStatus(record.id, checked)}
        />
      ),
    },
    { title: '机器人', dataIndex: 'botName', width: 150, ellipsis: true },
    {
      title: (
        <span className={styles.operationTitle}>
          操作
          <Tooltip content="字段设置">
            <IconSettings />
          </Tooltip>
        </span>
      ),
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} className={styles.operationCell}>
          <Button type="text" onClick={() => openPlanDrawer(record)}>编辑</Button>
          <Dropdown
            trigger="click"
            position="bottom"
            droplist={(
              <Menu onClickMenuItem={(key) => handleMoreAction(key, record)}>
                <Menu.Item key="detail">详情</Menu.Item>
                <Menu.Item key="run">立即运行</Menu.Item>
                <Menu.Item key="retro">新建回溯</Menu.Item>
                <Menu.Item key="copy">复制计划</Menu.Item>
                <Menu.Item key="delete">删除</Menu.Item>
              </Menu>
            )}
          >
            <Button type="text">
              <AutoRetryAnnotationMarker noteId="AR-4.1">
                更多
                <IconDown />
              </AutoRetryAnnotationMarker>
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Tabs
        activeTab={activeJobType}
        className={styles.tabs}
        type="rounded"
        headerPadding={false}
        onChange={(key) => {
          setActiveJobType(key as JobType);
          setPage(1);
          setSelectedRowKeys([]);
        }}
      >
        {jobTabs.map((item) => (
          <TabPane key={item.key} title={item.title} />
        ))}
      </Tabs>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Input.Search
            className={styles.searchInput}
            allowClear
            placeholder="请输入计划名称"
            value={filters.jobName}
            onChange={(value) => updateFilters({ jobName: value })}
            onSearch={(value) => updateFilters({ jobName: value })}
          />
          <Select
            className={styles.filterSelect}
            allowClear
            showSearch
            placeholder="平台类型"
            value={filters.channelKey}
            onChange={(value) => updateFilters({ channelKey: value, platformKey: undefined, storeId: undefined })}
          >
            {channelOptions.map((item) => <Select.Option key={item.key} value={item.key}>{item.value}</Select.Option>)}
          </Select>
          <Select
            className={styles.storeFilterSelect}
            allowClear
            showSearch
            placeholder="店铺"
            value={filters.storeId}
            onChange={(value) => updateFilters({ storeId: value })}
          >
            {storeOptions.map((item) => <Select.Option key={item.id} value={item.id}>{item.storeName}</Select.Option>)}
          </Select>
          <Select
            className={styles.filterSelect}
            allowClear
            placeholder="数据周期"
            value={filters.dataCycle}
            onChange={(value) => updateFilters({ dataCycle: value })}
          >
            {dataCycleOptions.map((item) => <Select.Option key={item.key} value={item.key}>{item.value}</Select.Option>)}
          </Select>
          <Select
            className={styles.filterSelect}
            allowClear
            placeholder="重试"
            value={filters.retryStatus}
            onChange={(value) => updateFilters({ retryStatus: value })}
          >
            <Select.Option value="enabled">已开启</Select.Option>
            <Select.Option value="disabled">未开启</Select.Option>
          </Select>
          <Button type="text" onClick={resetFilters}>重置</Button>
        </div>
        <div className={styles.toolbarActions}>
          <Button
            icon={<IconDelete />}
            disabled={!selectedRowKeys.length}
            onClick={() => deleteRecords(selectedRowKeys)}
          >
            删除
          </Button>
          <Button
            icon={<IconPlayArrow />}
            disabled={!selectedRowKeys.length}
            onClick={() => Message.success(`已运行 ${selectedRowKeys.length} 条计划`)}
          >
            运行
          </Button>
          <Button type="primary" icon={<IconPlus />} onClick={() => openPlanDrawer()}>
            新建计划
          </Button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <Table<PlanRecord>
          rowKey="id"
          data={pageData}
          columns={columns}
          pagination={false}
          scroll={{ x: 1710, y: 'calc(100vh - 332px)' }}
          noDataElement={<Empty description="暂无计划" />}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
        />
      </div>

      <div className={styles.pageFooter}>
        <span className={styles.selectedCount}>已选 {selectedRowKeys.length} 条</span>
        <div className={styles.paginationArea}>
          <span>共 {displayTotal} 条</span>
          <Pagination
            total={displayTotal}
            current={page}
            pageSize={pageSize}
            sizeCanChange
            showJumper
            sizeOptions={[20, 50, 100]}
            onChange={(nextPage, nextPageSize) => {
              setPage(nextPageSize === pageSize ? nextPage : 1);
              setPageSize(nextPageSize);
              setSelectedRowKeys([]);
            }}
          />
        </div>
      </div>

      <Drawer
        title={editingRecord ? '编辑计划' : '新建计划'}
        visible={planDrawerVisible}
        width={PLAN_DRAWER_WIDTH}
        className={styles.planDrawer}
        onCancel={closePlanDrawer}
        maskClosable
        unmountOnExit
        footer={(
          <div className={styles.drawerFooter}>
            <Button type="primary" onClick={savePlan}>确定</Button>
          </div>
        )}
      >
        <div className={styles.drawerBody}>
          <Form form={form} layout="vertical" className={styles.drawerForm}>
            <div className={styles.flowForm} style={{ width: FLOW_FORM_WIDTH }}>
                <Form.Item field="jobName" label="计划名称">
                  <Input placeholder="请输入计划名称" maxLength={100} />
                </Form.Item>
              <div className={styles.formGridTwo}>
                <Form.Item
                  field="channelKey"
                  label="平台类型"
                  className={styles.compactFormItem}
                  rules={[{ required: true, message: '请选择平台类型' }]}
                >
                  <Select
                    allowClear
                    showSearch
                    disabled={Boolean(editingRecord)}
                    placeholder="平台类型"
                    onChange={handleDrawerChannelChange}
                  >
                    {channelOptions.map((item) => <Select.Option key={item.key} value={item.key}>{item.value}</Select.Option>)}
                  </Select>
                </Form.Item>
                <Form.Item
                  field="platformKey"
                  label="子平台"
                  className={styles.compactFormItem}
                  rules={[{ required: true, message: '请选择子平台' }]}
                >
                  <Select
                    allowClear
                    showSearch
                    disabled={Boolean(editingRecord) || !modalChannelKey}
                    placeholder="子平台"
                    onChange={handleDrawerPlatformChange}
                  >
                    {modalPlatformOptions.map((item) => <Select.Option key={item.key} value={item.key}>{item.value}</Select.Option>)}
                  </Select>
                </Form.Item>
              </div>
                <Form.Item
                  field="dataCycle"
                  label="数据周期"
                  requiredSymbol={false}
                  rules={[{ required: true, message: '请选择数据周期' }]}
                >
                  <Radio.Group value={modalDataCycle} onChange={handleDrawerDataCycleChange}>
                    {dataCycleOptions.map((item) => <Radio key={item.key} value={item.key}>{item.value}</Radio>)}
                  </Radio.Group>
                </Form.Item>
                <Form.Item field="storeIdList" label="选择店铺" rules={[{ required: true, message: '请选择店铺' }]}>
                  <StoreDropdownSelect
                    options={modalStoreOptions}
                    disabled={!modalPlatformKey}
                    placeholder="选择店铺"
                  />
                </Form.Item>
                <div className={styles.connectorConfigSection}>
                  <Form.Item
                    label={(
                      <BusinessCustomParameterAnnotationMarker noteId="BCP-3.1">
                        选择数据源
                      </BusinessCustomParameterAnnotationMarker>
                    )}
                    required
                    className={styles.connectorConfigFormItem}
                  >
                    <div className={styles.connectorConfig}>
                  {showConnectorValidation ? (
                    <Alert
                      className={styles.connectorAlert}
                      type="error"
                      showIcon
                      content="部分数据源缺少业务参数，补充后才可创建任务"
                      action={(
                        <Button
                          type="text"
                          size="mini"
                          onClick={() => Message.info('业务参数来自数据源参数配置，选择后会随计划一并保存。')}
                        >
                          使用说明
                        </Button>
                      )}
                    />
                  ) : null}
                  <List<ConnectorOption>
                    className={styles.connectorList}
                    bordered={false}
                    split
                    dataSource={modalConnectorList}
                    noDataElement={<div className={styles.connectorEmpty}>请添加数据源</div>}
                    header={(
                      <div className={styles.connectorListHeader}>
                        <span>数据源名称</span>
                        <span>操作</span>
                      </div>
                    )}
                    render={(item) => {
                      const missingBizParam = isConnectorMissingBizParam(item);
                      const previewImageUrl = item.pathImageUrl || createConnectorPathImage(item.connectorName);

                      return (
                        <List.Item
                          key={item.connectorId}
                          className={showConnectorValidation && missingBizParam ? styles.connectorListItemWarning : undefined}
                          actions={[
                            <div key="actions" className={styles.connectorActions}>
                              {item.bizParamType ? (
                                <Button
                                  type="text"
                                  size="mini"
                                  icon={<IconEdit />}
                                  onClick={() => openConnectorParamEditor(item)}
                                >
                                  编辑
                                </Button>
                              ) : null}
                              <Button
                                type="text"
                                status="danger"
                                size="mini"
                                icon={<IconDelete />}
                                onClick={() => removeConnector(item.connectorId)}
                              >
                                移除
                              </Button>
                            </div>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={(
                              <button
                                type="button"
                                className={styles.connectorThumb}
                                onClick={() => setPathPreview({ title: item.connectorName, imageUrl: previewImageUrl })}
                              >
                                <img src={previewImageUrl} alt={`${item.connectorName}路径图`} />
                                <span className={styles.connectorThumbMask}>
                                  <IconZoomIn />
                                </span>
                              </button>
                            )}
                            title={(
                              <span className={`${styles.connectorTitle} ${showConnectorValidation && missingBizParam ? styles.connectorDangerName : ''}`}>
                                <span>{item.connectorName}</span>
                                {showConnectorValidation && missingBizParam ? <IconCloseCircleFill className={styles.connectorDangerIcon} /> : null}
                              </span>
                            )}
                            description={item.bizParamName ? `业务参数：${item.bizParamName}` : undefined}
                          />
                        </List.Item>
                      );
                    }}
                  />
                    </div>
                  </Form.Item>
                  <Button
                    className={styles.connectorAddButton}
                    size="mini"
                    type="outline"
                    icon={<IconPlus />}
                    onClick={openConnectorSelector}
                  >
                    添加
                  </Button>
                </div>
                <Form.Item field="executeType" label="执行方式">
                  {editingRecord ? (
                    <span>{executeTypeMap[executeType]}</span>
                  ) : (
                    <Radio.Group
                      value={executeType}
                      onChange={(value) => {
                        setExecuteType(value);
                        form.setFieldValue('executeType', value);
                      }}
                    >
                      <Radio value={9}>{executeTypeMap[9]}</Radio>
                      <Radio value={2}>{executeTypeMap[2]}</Radio>
                    </Radio.Group>
                  )}
                </Form.Item>
                {renderScheduleConfig()}
                <section className={styles.advancedSettings}>
                  <Divider className={styles.paramSectionDivider} orientation="center">
                    <button
                      type="button"
                      className={styles.paramSectionToggle}
                      onClick={() => setPlanAdvancedOpen((open) => !open)}
                    >
                      <span>高级设置</span>
                      <IconDown className={`${styles.paramSectionCaret} ${planAdvancedOpen ? styles.paramSectionCaretOpen : ''}`} />
                    </button>
                  </Divider>
                  {planAdvancedOpen ? (
                    <div className={styles.advancedContent}>
                      <Form.Item field="timingTimeType" label="定时时效">
                        <Radio.Group
                          value={timingTimeType}
                          onChange={(value) => {
                            setTimingTimeType(value);
                            form.setFieldValue('timingTimeType', value);
                          }}
                        >
                          <Radio value={0}>{timingTimeTypeMap[0]}</Radio>
                          <Radio value={1}>{timingTimeTypeMap[1]}</Radio>
                        </Radio.Group>
                      </Form.Item>
                      {timingTimeType === 1 ? (
                        <Form.Item field="timingTimeDate" label="有效时间" rules={[{ required: true, message: '请选择任务有效时间' }]}>
                          <DatePicker.RangePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
                        </Form.Item>
                      ) : null}
                      <Form.Item field="distributionType" label="首次执行云资源">
                        <Radio.Group
                          value={distributionType}
                          disabled={Boolean(editingRecord)}
                          onChange={(value) => {
                            setDistributionType(value);
                            form.setFieldValue('distributionType', value);
                            if (value === 1) form.setFieldValue('botId', undefined);
                          }}
                        >
                          <Radio value={1}>{distributionTypeMap[1]}</Radio>
                          <Radio value={2}>{distributionTypeMap[2]}</Radio>
                        </Radio.Group>
                      </Form.Item>
                      {distributionType === 2 ? (
                        <Form.Item field="botId" label="执行机器人" rules={[{ required: true, message: '请选择执行机器人' }]}>
                          <Select allowClear showSearch placeholder="请选择机器人">
                            {robotOptions
                              .filter((item) => item.botName !== '动态分配')
                              .map((item) => (
                                <Select.Option key={item.botUuid} value={item.botUuid}>{item.botName}</Select.Option>
                              ))}
                          </Select>
                        </Form.Item>
                      ) : null}
                      <Divider className={styles.retryDivider} />
                      <section className={styles.retrySettings}>
                        <div className={styles.retrySettingsHeader}>
                          <AutoRetryAnnotationMarker noteId="AR-2.1">
                            <strong>自动重试设置</strong>
                          </AutoRetryAnnotationMarker>
                          <Form.Item field="retryEnabled" noStyle triggerPropName="checked">
                            <Switch
                              checked={retryEnabled}
                              checkedText="开启"
                              uncheckedText="关闭"
                              onChange={(checked) => {
                                setRetryEnabled(checked);
                                form.setFieldValue('retryEnabled', checked);
                              }}
                            />
                          </Form.Item>
                        </div>
                        <Alert
                          className={styles.retryStrategyNotice}
                          type="info"
                          showIcon
                          content="开启后，当系统确认异常已恢复，将在您设置的时段内自动重新执行计划，减少手动操作"
                        />
                        {retryEnabled ? (
                          <div className={styles.retrySettingsBody}>
                            <AutoRetryAnnotationMarker noteId="AR-2.2" layout="block">
                              <div className={styles.retryExecutionFields}>
                                <Form.Item
                                  field="retryExecutionTime"
                                  label="重试执行时段"
                                  rules={[{ required: true, message: '请选择重试执行时段' }]}
                                >
                                  <TimeRangePicker format="HH:mm:ss" style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item field="retryDistributionType" label="重试云资源">
                                  <Radio.Group
                                    value={retryDistributionType}
                                    onChange={(value) => {
                                      setRetryDistributionType(value);
                                      form.setFieldValue('retryDistributionType', value);
                                      if (value === 1) form.setFieldValue('retryBotId', undefined);
                                    }}
                                  >
                                    <Radio value={1}>使用计划执行机器人</Radio>
                                    <Radio value={2}>指定机器人</Radio>
                                  </Radio.Group>
                                </Form.Item>
                                {retryDistributionType === 2 ? (
                                  <Form.Item
                                    field="retryBotId"
                                    label="选择执行机器人"
                                    rules={[{ required: true, message: '请选择执行机器人' }]}
                                  >
                                    <Select allowClear showSearch placeholder="请选择执行机器人">
                                      {robotOptions
                                        .filter((item) => item.botName !== '动态分配')
                                        .map((item) => (
                                          <Select.Option key={item.botUuid} value={item.botUuid}>{item.botName}</Select.Option>
                                        ))}
                                    </Select>
                                  </Form.Item>
                                ) : null}
                              </div>
                            </AutoRetryAnnotationMarker>
                          </div>
                        ) : null}
                      </section>
                    </div>
                  ) : null}
                </section>
            </div>
          </Form>
        </div>
      </Drawer>

      <Drawer
        title="计划详情"
        visible={Boolean(detailRecord)}
        width={720}
        className={styles.planDetailDrawer}
        footer={null}
        onCancel={() => setDetailRecord(null)}
      >
        {detailRecord ? (
          <div className={styles.planDetailBody}>
            <section className={styles.detailSection}>
              <h3>基本信息</h3>
              <div className={styles.detailGrid}>
                <div><span>计划名称</span><strong>{detailRecord.jobName}</strong></div>
                <div><span>计划类型</span><strong>{jobTabs.find((item) => item.key === detailRecord.jobType)?.title}</strong></div>
                <div><span>平台</span><strong>{detailRecord.channel} / {detailRecord.platform}</strong></div>
                <div><span>店铺</span><strong>{detailRecord.storeName}</strong></div>
                <div><span>执行时间</span><strong>{detailRecord.jobDescription}</strong></div>
                <div><span>计划状态</span><strong>{detailRecord.planStatus ? '已开启' : '已关闭'}</strong></div>
              </div>
            </section>
            <AutoRetryAnnotationMarker noteId="AR-3.1" layout="block">
              <section className={styles.detailSection}>
                <h3>重试策略</h3>
                {detailRecord.retryConfig?.enabled ? (
                  <div className={styles.detailGrid}>
                    <div><span>状态</span><strong><Tag color="arcoblue">已开启</Tag></strong></div>
                    <div><span>重试执行时段</span><strong>{detailRecord.retryConfig.executionTimeRange.join(' - ')}</strong></div>
                    <div>
                      <span>重试云资源</span>
                      <strong>
                        {detailRecord.retryConfig.distributionType === 1
                          ? '使用计划执行机器人'
                          : detailRecord.retryConfig.botIds.map(getRobotName).join('、')}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <Empty description="未开启重试" />
                )}
              </section>
            </AutoRetryAnnotationMarker>
          </div>
        ) : null}
      </Drawer>

      <Modal
        title="数据源市场"
        visible={connectorModalVisible}
        className={styles.connectorModal}
        style={{ width: 960 }}
        onOk={confirmConnectorSelector}
        onCancel={() => {
          setConnectorModalVisible(false);
        }}
      >
        <div className={styles.connectorManagerToolbar}>
          <div className={styles.connectorManagerFilters}>
            <Input.Search
              allowClear
              placeholder="请输入数据源名称"
              value={connectorSearchName}
              onChange={setConnectorSearchName}
              onSearch={setConnectorSearchName}
            />
            <Select placeholder="平台类型" value={modalChannelKey} disabled>
              {channelOptions.map((item) => (
                <Select.Option key={item.key} value={item.key}>{item.value}</Select.Option>
              ))}
            </Select>
            <Select placeholder="子平台" value={modalPlatformKey} disabled>
              {modalPlatformOptions.map((item) => (
                <Select.Option key={item.key} value={item.key}>{item.value}</Select.Option>
              ))}
            </Select>
          </div>
          <span className={styles.connectorMarketCount}>已选 {connectorManageRecords.length} 个</span>
        </div>
        {connectorMarketData.length ? (
          <div
            className={styles.connectorMarketGrid}
            onScroll={(event) => {
              const target = event.currentTarget;
              if (target.scrollTop + target.clientHeight >= target.scrollHeight - 24) {
                setConnectorMarketVisibleCount((count) => Math.min(count + CONNECTOR_MARKET_BATCH_SIZE, connectorMarketData.length));
              }
            }}
          >
            {displayedConnectorMarketData.map((item) => {
              const selectedConnector = connectorManageRecords.find((record) => record.connectorId === item.connectorId);
              const selected = Boolean(selectedConnector);
              const displayConnector = selectedConnector || hydrateConnectorWithDefaultParam(item);
              const previewImageUrl = displayConnector.pathImageUrl || createConnectorPathImage(displayConnector.connectorName);

              return (
                <article
                  key={item.connectorId}
                  className={styles.connectorMarketCard}
                  onClick={() => toggleManagedConnector(item)}
                >
                  <Checkbox checked={selected} className={styles.connectorMarketCheck} />
                  <button
                    type="button"
                    className={styles.connectorMarketImage}
                    onClick={(event) => {
                      event.stopPropagation();
                      setPathPreview({ title: displayConnector.connectorName, imageUrl: previewImageUrl });
                    }}
                  >
                    <img src={previewImageUrl} alt={`${displayConnector.connectorName}路径图`} />
                    <span className={styles.connectorMarketImageMask}>
                      <IconZoomIn />
                    </span>
                  </button>
                  <div className={styles.connectorMarketInfo}>
                    <div className={styles.connectorMarketName}>{displayConnector.connectorName}</div>
                    <div className={styles.connectorMarketMeta}>
                      {displayConnector.sourcePath || '--'} · {displayConnector.acquiredCount || 0} 人已获取
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty description="暂无数据源" />
        )}
      </Modal>

      <Modal
        title="编辑参数"
        visible={connectorParamVisible}
        className={styles.connectorParamModal}
        style={{ width: 520 }}
        okText="确定"
        cancelText="取消"
        onOk={confirmConnectorParam}
        onCancel={() => {
          setConnectorParamVisible(false);
          setEditingConnectorId(undefined);
          setEditingConnectorIds([]);
          setConnectorParamTarget('drawer');
          setBizParamDraftId(undefined);
          setParamStartOffset(1);
          setParamEndOffset(1);
          setParamAdvancedOpen(false);
          closeBizParamCreateModal();
        }}
      >
        <div className={styles.paramModalBody}>
          {editingConnectorPreviewUrl ? (
            <button
              type="button"
              className={styles.paramHeroPreview}
              onClick={() => {
                if (editingConnector) {
                  setPathPreview({ title: editingConnector.connectorName, imageUrl: editingConnectorPreviewUrl });
                }
              }}
            >
              <img src={editingConnectorPreviewUrl} alt={`${editingConnector?.connectorName || '数据源'}路径图`} />
              <span className={styles.paramHeroPreviewMask}>
                <IconZoomIn />
              </span>
            </button>
          ) : null}

          <div className={styles.paramConnectorMeta}>
            <div className={styles.paramConnectorNameGroup}>
              <span className={styles.paramMetaLabel}>数据源名称</span>
              <span className={styles.paramMetaName}>{editingConnector?.connectorName || '--'}</span>
            </div>
            <Button
              type="text"
              className={styles.paramHelpButton}
              onClick={() => Message.info('业务参数会随计划保存，并在任务执行时作为数据源入参使用。')}
            >
              使用说明
            </Button>
          </div>

          <div className={styles.paramSection}>
            <Divider className={styles.paramSectionDivider} orientation="center">
              业务参数
            </Divider>
            <div className={styles.paramFieldRow}>
              <span className={styles.paramFieldLabel}>参数类型</span>
              <span className={styles.paramFieldValue}>{editingConnector?.bizParamTypeName || '--'}</span>
            </div>
            <div className={styles.paramFieldRow}>
              <span className={styles.paramFieldLabel}>
                <BusinessCustomParameterAnnotationMarker noteId="BCP-3.2">
                  参数集
                </BusinessCustomParameterAnnotationMarker>
              </span>
              <Select
                allowClear
                showSearch
                placeholder={paramSetPlaceholder}
                value={bizParamDraftId}
                onChange={setBizParamDraftId}
                renderFormat={(option) => {
                  const optionValue = option?.value;
                  return editingBizParamOptions.find((item) => item.id === optionValue)?.paramName || '';
                }}
                dropdownRender={(menu) => (
                  <div>
                    {menu}
                    <div className={styles.paramDropdownFooter}>
                      <Button
                        type="text"
                        icon={<IconPlus />}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={openBizParamCreateModal}
                      >
                        新增{editingConnector?.bizParamTypeName || '业务'}参数
                      </Button>
                    </div>
                  </div>
                )}
              >
                {editingBizParamOptions.map((item) => (
                  <Select.Option key={item.id} value={item.id} disabled={item.status === 'disabled'}>
                    <div className={styles.paramOption}>
                      <Popover
                        position="left"
                        getPopupContainer={() => document.body}
                        style={{ maxWidth: 480 }}
                        content={renderBizParamPreviewTable(item)}
                        disabled={!item.previewRows.length}
                      >
                        <span className={styles.paramOptionName}>{item.paramName}</span>
                      </Popover>
                      <div className={styles.paramOptionActions}>
                        <Button
                          size="mini"
                          type="text"
                          icon={<IconEdit />}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={() => Message.info(`编辑 ${item.paramName}`)}
                        />
                        <Button
                          size="mini"
                          type="text"
                          status="danger"
                          icon={<IconDelete />}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={() => Message.info(`删除 ${item.paramName}`)}
                        />
                      </div>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </div>
          </div>

          <div className={styles.paramSection}>
            <Divider className={styles.paramSectionDivider} orientation="center">
              <button
                type="button"
                className={styles.paramSectionToggle}
                onClick={() => setParamAdvancedOpen((open) => !open)}
              >
                <BusinessCustomParameterAnnotationMarker noteId="BCP-3.3">
                  高级设置
                </BusinessCustomParameterAnnotationMarker>
                <IconDown className={`${styles.paramSectionCaret} ${paramAdvancedOpen ? styles.paramSectionCaretOpen : ''}`} />
              </button>
            </Divider>
            {paramAdvancedOpen ? (
              <div className={styles.paramAdvancedGroup}>
                <div className={styles.paramAdvancedTitle}>
                  <span>取数动态时间范围设置</span>
                  {editingDateRangeInfo ? (
                    <Tooltip content={editingDateRangeInfo}>
                      <IconInfoCircle />
                    </Tooltip>
                  ) : null}
                </div>
                <div className={styles.paramDynamicRange}>
                  <span>每次取</span>
                  <InputNumber
                    hideControl
                    min={0}
                    max={365}
                    value={paramStartOffset}
                    onChange={(value) => setParamStartOffset(Number(value) || 0)}
                  />
                  <span>天前至</span>
                  <InputNumber
                    hideControl
                    min={0}
                    max={365}
                    value={paramEndOffset}
                    onChange={(value) => setParamEndOffset(Number(value) || 0)}
                  />
                  <span>天前的数据</span>
                  {editingDateRangeInfo ? (
                    <Tooltip content={editingDateRangeInfo}>
                      <IconInfoCircle />
                    </Tooltip>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal
        title={(
          <BusinessCustomParameterAnnotationMarker noteId="BCP-3.4">
            {`新增${editingConnector?.bizParamTypeName || '业务'}参数`}
          </BusinessCustomParameterAnnotationMarker>
        )}
        visible={bizParamCreateVisible}
        className={styles.bizParamCreateModal}
        style={{ width: 960 }}
        okText="保存并使用"
        cancelText="取消"
        onOk={confirmBizParamCreate}
        onCancel={closeBizParamCreateModal}
      >
        {editingBizParamCreateConfig ? (
          <div className={styles.bizParamCreateBody}>
            <div className={styles.bizParamCreateTop}>
              {editingConnectorPreviewUrl ? (
                <button
                  type="button"
                  className={styles.bizParamCreatePreview}
                  onClick={() => {
                    if (editingConnector) {
                      setPathPreview({ title: editingConnector.connectorName, imageUrl: editingConnectorPreviewUrl });
                    }
                  }}
                >
                  <img src={editingConnectorPreviewUrl} alt={`${editingConnector?.connectorName || '数据源'}路径图`} />
                  <span className={styles.bizParamCreatePreviewMask}>
                    <IconZoomIn />
                  </span>
                </button>
              ) : null}

              <div className={styles.bizParamCreateFields}>
                <label className={styles.bizParamCreateLabel}>
                  <span className={styles.requiredMark}>*</span>
                  {editingBizParamCreateConfig.nameLabel}
                </label>
                <Form.Item
                  className={styles.bizParamCreateFormItem}
                  validateStatus={bizParamCreateErrors.name ? 'error' : undefined}
                  help={bizParamCreateErrors.name}
                >
                  <Input
                    placeholder={`请输入${editingBizParamCreateConfig.nameLabel}`}
                    value={bizParamCreateName}
                    onChange={(value) => {
                      setBizParamCreateName(value);
                      if (bizParamCreateErrors.name) {
                        setBizParamCreateErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                  />
                </Form.Item>
                <label className={styles.bizParamCreateLabel}>备注</label>
                <Input
                  placeholder="请输入备注说明"
                  value={bizParamCreateRemark}
                  onChange={setBizParamCreateRemark}
                />
              </div>
            </div>

            <div className={styles.bizParamCreateSection}>
              <div className={styles.bizParamCreateSectionHeader}>
                <span>
                  <span className={styles.requiredMark}>*</span>
                  {editingBizParamCreateConfig.infoTitle}
                </span>
                <Space size={12}>
                  <Button
                    type="text"
                    icon={<IconImport />}
                    onClick={() => Message.info('导入时将校验字段格式、层级数量和必填层级完整性')}
                  >
                    导入
                  </Button>
                  <Button
                    type="text"
                    icon={<IconExport />}
                    onClick={() => Message.info('导出当前参数集配置')}
                  >
                    导出
                  </Button>
                </Space>
              </div>

              <div className={styles.bizParamCreateTableWrap}>
                <div
                  className={styles.bizParamCreateTable}
                  style={{ gridTemplateColumns: `repeat(${editingBizParamCreateConfig.columns.length}, minmax(0, 1fr))` }}
                >
                  {editingBizParamCreateConfig.columns.map((column) => (
                    <div key={column} className={styles.bizParamCreateTh}>
                      <span>{column}</span>
                    </div>
                  ))}
                  {bizParamCreateRows.map((row, rowIndex) => (
                    editingBizParamCreateConfig.columns.map((column) => {
                      const cellError = bizParamCreateErrors.cells[`${rowIndex}-${column}`];
                      return (
                        <div key={`${rowIndex}-${column}`} className={styles.bizParamCreateTd}>
                          <Form.Item
                            className={styles.bizParamCreateCellFormItem}
                            validateStatus={cellError ? 'error' : undefined}
                            help={cellError}
                          >
                            <Input
                              value={row[column]}
                              onChange={(value) => updateBizParamCreateCell(rowIndex, column, value)}
                            />
                          </Form.Item>
                        </div>
                      );
                    })
                  ))}
                </div>
                <Button
                  type="dashed"
                  className={styles.bizParamCreateAddColumn}
                  icon={<IconPlus />}
                  onClick={addBizParamCreateRow}
                >
                  添加
                </Button>
              </div>
            </div>

            <div className={styles.bizParamCreateDefault}>
              <div>
                <div className={styles.bizParamCreateDefaultTitle}>设为默认参数配置</div>
                <div className={styles.bizParamCreateDefaultDesc}>开启后，选择该数据源时，将自动带入此配置</div>
              </div>
              <Switch checked={bizParamCreateDefault} onChange={setBizParamCreateDefault} />
            </div>
          </div>
        ) : null}
      </Modal>

      <Image.Preview
        src={pathPreview?.imageUrl || ''}
        visible={Boolean(pathPreview)}
        maskClosable
        escToExit
        actionsLayout={['zoomIn', 'zoomOut', 'originalSize']}
        imgAttributes={{ alt: pathPreview ? `${pathPreview.title}路径图预览` : '路径图预览' }}
        onVisibleChange={(visible) => {
          if (!visible) setPathPreview(undefined);
        }}
      />
    </div>
  );
}
