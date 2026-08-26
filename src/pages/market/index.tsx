import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Carousel,
  Descriptions,
  Empty,
  Form,
  Grid,
  Input,
  List,
  Menu,
  Message,
  Modal,
  Pagination,
  Radio,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from '@arco-design/web-react';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import {
  IconClose,
  IconApps,
  IconCalendar,
  IconDownload,
  IconInfoCircle,
  IconLink,
  IconPlayArrow,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconStar,
  IconStarFill,
} from '@arco-design/web-react/icon';
import { BusinessCustomParameterAnnotationMarker } from '@/components/businessCustomParameterAnnotations';
import styles from './index.module.less';

const { TabPane } = Tabs;
const { Text, Title } = Typography;

type IndustryProduct = '1' | '5' | '3';
type MarketSearchField = 'dataSourceName' | 'sourcePath';
type PeriodFilter = 'all' | '0' | '1' | '2' | '3';
type SortOption = 'recommended' | 'usage-desc' | 'name-asc';

interface PlatformNode {
  key: string;
  value: string;
  iconText: string;
  subList: Array<{ key: string; value: string }>;
}

interface SceneItem {
  key: string;
  value: string;
}

interface TimeConfig {
  outTime?: string;
  startTime?: string;
  outWeekDay?: number;
  startWeekDay?: number;
  outDayOfMonth?: number;
  startDayOfMonth?: number;
}

interface ConnectorField {
  label: string;
  field: string;
  description?: string;
}

interface CustomParamColumn {
  key?: string;
  label?: string;
  desc?: string;
  type?: string;
  isNull?: 'Y' | 'N';
  defaultValue?: string;
  items?: string[];
}

interface ConnectorDefaultConfig extends CustomParamColumn {
  required?: boolean;
  options?: string[];
  paramDataColumns?: CustomParamColumn[];
}

interface ConnectorCard {
  id: string;
  connectorId: string;
  connectorName: string;
  connectorPath: string;
  connectorModule: string;
  channel: string;
  platform: string;
  industryProduct: IndustryProduct;
  bizSceneList: string[];
  authNum: number;
  favoriteStatus: boolean;
  connectorDescribeUrl?: string;
  defaultConfig?: ConnectorDefaultConfig[];
  bizParamTypeName?: string;
  dataTimeTypes: number[];
  timeConfig?: Record<string, TimeConfig>;
  sourcePath?: string;
  dataFields?: ConnectorField[];
  reportColumnNameView: string[];
  reportTableColumnNameView: string[];
  diagramUrlList: string[];
}

interface HistoryRecord {
  createTime: string;
  replyStatus: 0 | 1;
  typeName: '取数需求' | '意见反馈';
  platformName?: string;
  pageUrl?: string;
  questionType?: string;
  questionDesc?: string;
  screenShot: string[];
  replyInfo?: string;
}

const productLineMenus: Array<{ key: IndustryProduct | '0'; label: string; iconText: string }> = [
  { key: '1', label: '电商', iconText: '电' },
  { key: '5', label: '跨境', iconText: '跨' },
  { key: '3', label: '网银', iconText: '网' },
  { key: '0', label: '收藏', iconText: '收' },
];

const createPlatformNode = ([key, value, iconText]: [string, string, string]): PlatformNode => ({
  key,
  value,
  iconText,
  subList: [{ key: `${key}-default`, value }],
});

const extraEcommercePlatformNodes = [
  ['im-message', 'IM消息发送', 'IM'],
  ['realtime', '实时', '实'],
  ['huitun', '灰豚', '灰'],
  ['data-bank', '数据银行', '数'],
  ['wechat', '微信', '微'],
  ['feigua', '飞瓜', '飞'],
  ['alibaba', '阿里巴巴', '阿'],
  ['eleme', '饿了么', '饿'],
  ['meituan', '美团', '美'],
  ['duodian', '多点', '多'],
  ['taoxianda', '淘鲜达', '鲜'],
  ['yinli', '引力传媒', '引'],
  ['mojing', '魔镜', '魔'],
  ['kaola', '考拉', '考'],
  ['zhiyi', '知衣', '衣'],
  ['bilibili', '哔哩哔哩', 'B'],
  ['reduyun', '热度云', '热'],
  ['xiaoxiang', '小象超市', '象'],
  ['senshan', '森山后台', '森'],
  ['kingdee', '金蝶云星空', '金'],
  ['qingbaotong', '情报通', '情'],
  ['yunji', '云集', '云'],
  ['mogujie', '蘑菇街', '蘑'],
  ['dongfangzhenxuan', '东方甄选', '东'],
  ['email', '邮箱', '邮'],
  ['juyi', '巨益', '巨'],
  ['zhihu', '知乎', '知'],
  ['mashangying', '马上赢', '赢'],
  ['shiheng', '食亨', '食'],
  ['shudongpo', '蔬东坡', '蔬'],
  ['canxingyun', '喰星云', '喰'],
  ['custom-dev', '定制开发', '定'],
  ['wofeng', '沃丰', '沃'],
  ['woda', '我打', '打'],
  ['baidu', '百度', '百'],
  ['tencent', '腾讯', '腾'],
  ['aikucun', '爱库存', '爱'],
  ['haoyiku', '好衣库', '好'],
  ['silucang', '重庆丝路仓管理系统', '丝'],
  ['baoqing', '豹擎', '豹'],
  ['juxing-cid', '聚星CID', 'C'],
  ['haiziwang', '孩子王', '孩'],
  ['haipaike', '海拍客', '海'],
  ['integrated-platform', '综合平台', '综'],
  ['jianpai', '简派供应链', '简'],
  ['bianjie-bi', '边界BI', '边'],
  ['data-inspection', '数据巡检', '巡'],
  ['data-warehouse', '数据入库', '入'],
].map(createPlatformNode);

const platformData: Record<IndustryProduct, PlatformNode[]> = {
  1: [
    { key: 'tx', value: '淘系', iconText: '淘', subList: [{ key: 'sycm', value: '生意参谋' }, { key: 'tmall-front', value: '淘宝前台' }, { key: 'alimama', value: '阿里妈妈' }] },
    { key: 'jd', value: '京东', iconText: '京', subList: [{ key: 'jd-shop', value: '京东商智' }] },
    { key: 'pdd', value: '拼多多', iconText: '拼', subList: [{ key: 'pdd-merchant', value: '拼多多商家后台' }] },
    { key: 'dy', value: '抖音', iconText: '抖', subList: [{ key: 'douyin-live', value: '直播罗盘' }, { key: 'douyin-shop', value: '抖店' }] },
    { key: 'vip', value: '唯品会', iconText: '唯', subList: [{ key: 'vip-admin', value: '唯品会商家后台' }] },
    { key: 'xhs', value: '小红书', iconText: '红', subList: [{ key: 'xhs-admin', value: '小红书商家后台' }] },
    { key: 'ks', value: '快手', iconText: '快', subList: [{ key: 'ks-admin', value: '快手小店' }] },
    { key: 'dewu', value: '得物', iconText: '得', subList: [{ key: 'dewu-admin', value: '得物商家后台' }] },
    { key: 'suning', value: '苏宁', iconText: '苏', subList: [{ key: 'suning-admin', value: '苏宁商家后台' }] },
    { key: 'youzan', value: '有赞', iconText: '有', subList: [{ key: 'youzan-admin', value: '有赞商城' }] },
    { key: 'jushuitan', value: '聚水潭ERP', iconText: '聚', subList: [{ key: 'jst-erp', value: '聚水潭ERP' }] },
    { key: 'jikeyun', value: '吉客云ERP', iconText: '吉', subList: [{ key: 'jky-erp', value: '吉客云ERP' }] },
    { key: 'mhy', value: 'MIHAYOU', iconText: 'M', subList: [{ key: 'mhy-admin', value: 'MIHAYOU' }] },
    ...extraEcommercePlatformNodes,
  ],
  5: [
    { key: 'shopify', value: 'Shopify', iconText: 'S', subList: [{ key: 'shopify-admin', value: 'Shopify Admin' }] },
    { key: 'amazon', value: 'Amazon', iconText: 'A', subList: [{ key: 'seller-central', value: 'Seller Central' }, { key: 'ads', value: 'Amazon Ads' }] },
    { key: 'tiktok', value: 'TikTok Shop', iconText: 'T', subList: [{ key: 'tiktok-shop', value: 'TikTok Shop' }] },
  ],
  3: [
    { key: 'bank-assistant', value: '网银助手', iconText: '银', subList: [{ key: 'bank-live', value: '直播成交' }, { key: 'bank-flow', value: '流水回单' }] },
    { key: 'alipay', value: '支付宝', iconText: '支', subList: [{ key: 'alipay-bill', value: '支付宝账单' }] },
  ],
};

const sceneData: SceneItem[] = [
  { key: 'live', value: '直播' },
  { key: 'content', value: '内容' },
  { key: 'ad', value: '广告' },
  { key: 'order', value: '订单' },
  { key: 'rank', value: '榜单' },
  { key: 'report_forms', value: '报表' },
  { key: 'account', value: '账户' },
  { key: 'after_sale', value: '售后' },
  { key: 'shop', value: '店铺' },
  { key: 'video', value: '视频' },
  { key: 'product', value: '商品' },
  { key: 'category', value: '品类' },
  { key: 'review', value: '评价' },
  { key: 'traffic', value: '流量' },
  { key: 'competition', value: '竞争' },
  { key: 'transaction', value: '交易' },
  { key: 'crowd', value: '用户' },
  { key: 'finance', value: '财务' },
  { key: 'logistics', value: '物流' },
  { key: 'service', value: '服务' },
  { key: 'inventory', value: '库存' },
  { key: 'supply_chain', value: '供应链' },
];

const primarySceneKeys = ['product', 'order', 'live', 'ad', 'traffic', 'competition', 'crowd', 'finance', 'logistics', 'review'];

const periodOptions: Array<{ label: string; value: PeriodFilter }> = [
  { label: '全部数据周期', value: 'all' },
  { label: '实时', value: '0' },
  { label: '日', value: '1' },
  { label: '周', value: '2' },
  { label: '月', value: '3' },
];

const sortOptions: Array<{ label: string; value: SortOption }> = [
  { label: '综合排序', value: 'recommended' },
  { label: '使用量从高到低', value: 'usage-desc' },
  { label: '名称 A-Z', value: 'name-asc' },
];

const platformIconUrls: Record<string, string> = {
  sycm: 'https://api.iconify.design/ri:taobao-fill.svg?color=%23FF5000',
  'tmall-front': 'https://api.iconify.design/ri:taobao-fill.svg?color=%23FF5000',
  alimama: 'https://api.iconify.design/thesvg-color:alibaba.svg',
  'jd-shop': 'https://downloadr2.apkmirror.com/wp-content/uploads/2021/03/31/604ee930c022c.png',
  'pdd-merchant': 'https://cdn6.aptoide.com/imgs/8/8/7/8877278d2624a2e85335412e4376f22a_icon.png',
  'douyin-live': 'https://api.iconify.design/simple-icons:tiktok.svg?color=%231D2129',
  'douyin-shop': 'https://api.iconify.design/simple-icons:tiktok.svg?color=%231D2129',
  'xhs-admin': 'https://api.iconify.design/simple-icons:xiaohongshu.svg?color=%23FF2442',
  'ks-admin': 'https://api.iconify.design/simple-icons:kuaishou.svg?color=%23FF4906',
  'vip-admin': 'https://api.iconify.design/arcticons:vipshop.svg?color=%23E4007F',
};

const platformLogoUrls: Record<string, string> = {
  tx: platformIconUrls.sycm,
  jd: platformIconUrls['jd-shop'],
  pdd: platformIconUrls['pdd-merchant'],
  dy: platformIconUrls['douyin-live'],
  vip: platformIconUrls['vip-admin'],
  xhs: platformIconUrls['xhs-admin'],
  ks: platformIconUrls['ks-admin'],
};

const marketSearchOptions: { label: string; value: MarketSearchField }[] = [
  { label: '数据源名称', value: 'dataSourceName' },
  { label: '取数路径', value: 'sourcePath' },
];

const marketSearchPlaceholders: Record<MarketSearchField, string> = {
  dataSourceName: '输入数据源名称',
  sourcePath: '输入取数路径',
};

const defaultReportColumns = ['店铺唯一 ID', '企业唯一 ID', '采数时间', '业务日期', '平台名称'];
const defaultReportFields = ['shop_no', 'corp_id', 'gather_time', 'business_date', 'platform_name'];

const connectorsSeed: ConnectorCard[] = [
  {
    id: 'market-001',
    connectorId: 'conn-001',
    connectorName: '淘宝生意参谋·竞品分析',
    connectorPath: '生意参谋-市场-竞品分析-竞品对比-销售分析-关键指标对比',
    connectorModule: '商品销售',
    channel: 'tx',
    platform: 'sycm',
    industryProduct: '1',
    bizSceneList: ['product', 'transaction', 'report_forms'],
    authNum: 12328,
    favoriteStatus: true,
    connectorDescribeUrl: 'https://sxz-ai.yuque.com/qev0bi/qsb/atgpitgzgcfpar48',
    sourcePath: '生意参谋-市场-竞品分析-竞品对比-销售分析-关键指标对比',
    defaultConfig: [
      { key: 'dateRange', label: '统计日期', desc: '统计日期', type: 'dateRange', required: true },
      { key: 'goodsType', label: '商品类型', desc: '商品类型', type: 'select', required: true, options: ['全部商品', '在售商品', '仓库商品'] },
      {
        key: 'dynamicRange',
        type: 'group',
        paramDataColumns: [
          {
            desc: '开始推移时长',
            key: 'start_ty_unit',
            type: 'TEXT',
            isNull: 'N',
            defaultValue: '1',
            items: [],
          },
          {
            desc: '结束推移时长',
            key: 'end_ty_unit',
            type: 'TEXT',
            isNull: 'N',
            defaultValue: '1',
            items: [],
          },
        ],
      },
    ],
    bizParamTypeName: '本店商品',
    dataTimeTypes: [1, 2, 3],
    timeConfig: {
      日: { outTime: '08:00', startTime: '09:00' },
      周: { outWeekDay: 1, startWeekDay: 1, outTime: '08:30', startTime: '09:30' },
      月: { outDayOfMonth: 1, startDayOfMonth: 1, outTime: '09:00', startTime: '10:00' },
    },
    dataFields: defaultReportColumns.map((label, index) => ({ label, field: defaultReportFields[index] })),
    reportColumnNameView: defaultReportColumns,
    reportTableColumnNameView: defaultReportFields,
    diagramUrlList: [],
  },
  ...[
    ['market-002', '京东商智·交易概览', '商智-交易-经营概览', '交易概览', 'jd', 'jd-shop', ['transaction', 'report_forms'], 9876, [1, 2, 3]],
    ['market-003', '拼多多商家后台·商品明细', '商家后台-商品-商品明细', '商品明细', 'pdd', 'pdd-merchant', ['product', 'shop'], 8521, [1, 2]],
    ['market-004', '抖音电商罗盘·直播分析', '电商罗盘-直播-直播分析', '直播分析', 'dy', 'douyin-live', ['live', 'traffic'], 7634, [1, 2, 3]],
    ['market-005', '小红书千帆·订单明细', '千帆-订单-订单明细', '订单明细', 'xhs', 'xhs-admin', ['order', 'product'], 6221, [1, 2]],
    ['market-006', '阿里妈妈·推广数据', '阿里妈妈-推广-效果报表', '推广数据', 'tx', 'alimama', ['ad', 'traffic'], 5412, [1, 2, 3]],
    ['market-007', '快手小店·商品分析', '快手小店-商品-商品分析', '商品分析', 'ks', 'ks-admin', ['product', 'traffic'], 4312, [1, 2]],
    ['market-008', '天猫商家中心·流量概览', '天猫商家中心-流量-流量概览', '流量概览', 'tx', 'tmall-front', ['traffic', 'shop'], 4108, [1, 2, 3]],
    ['market-009', '唯品会商家后台·销售概览', '唯品会商家后台-销售-销售概览', '销售概览', 'vip', 'vip-admin', ['transaction', 'product'], 3686, [1, 2, 3]],
    ['market-010', '抖店·订单管理', '抖店-订单-订单管理', '订单管理', 'dy', 'douyin-shop', ['order', 'after_sale'], 3254, [0, 1]],
    ['market-011', '小红书千帆·商品表现', '千帆-商品-商品表现', '商品表现', 'xhs', 'xhs-admin', ['product', 'content'], 2988, [1, 2]],
    ['market-012', '京东商智·商品诊断', '商智-商品-商品诊断', '商品诊断', 'jd', 'jd-shop', ['product', 'competition'], 2765, [1, 2, 3]],
    ['market-013', '拼多多商家后台·订单明细', '商家后台-订单-订单明细', '订单明细', 'pdd', 'pdd-merchant', ['order', 'after_sale'], 2519, [1, 2]],
    ['market-014', '淘宝生意参谋·流量纵横', '生意参谋-流量-流量纵横', '流量纵横', 'tx', 'sycm', ['traffic', 'competition'], 2386, [1, 2, 3]],
    ['market-015', '快手小店·订单明细', '快手小店-订单-订单明细', '订单明细', 'ks', 'ks-admin', ['order', 'transaction'], 2128, [1, 2]],
    ['market-016', '阿里妈妈·账户报表', '阿里妈妈-账户-账户报表', '账户报表', 'tx', 'alimama', ['ad', 'account'], 1964, [1, 2, 3]],
    ['market-017', '淘宝生意参谋·市场洞察', '生意参谋-市场-市场洞察', '市场洞察', 'tx', 'sycm', ['competition', 'category'], 1843, [1, 2, 3]],
    ['market-018', '抖音电商罗盘·商品分析', '电商罗盘-商品-商品分析', '商品分析', 'dy', 'douyin-live', ['product', 'traffic'], 1697, [1, 2]],
    ['market-019', '唯品会商家后台·订单明细', '唯品会商家后台-订单-订单明细', '订单明细', 'vip', 'vip-admin', ['order', 'after_sale'], 1534, [1, 2]],
    ['market-020', '拼多多商家后台·店铺流量', '商家后台-店铺-店铺流量', '店铺流量', 'pdd', 'pdd-merchant', ['shop', 'traffic'], 1428, [1, 2]],
  ].map(([id, connectorName, connectorPath, connectorModule, channel, platform, scenes, authNum, periods]) => ({
    id: id as string,
    connectorId: `conn-${String(id).split('-')[1]}`,
    connectorName: connectorName as string,
    connectorPath: connectorPath as string,
    connectorModule: connectorModule as string,
    channel: channel as string,
    platform: platform as string,
    industryProduct: '1' as IndustryProduct,
    bizSceneList: scenes as string[],
    authNum: authNum as number,
    favoriteStatus: ['market-002', 'market-005', 'market-006'].includes(id as string),
    sourcePath: getPlatformPath({
      industryProduct: '1',
      channel: channel as string,
      platform: platform as string,
    } as ConnectorCard),
    defaultConfig: [
      { key: 'dateRange', label: '统计日期', desc: '统计日期', type: 'dateRange', required: true },
      ...((periods as number[]).includes(0) ? [] : [{
        key: 'dynamicRange',
        type: 'group',
        paramDataColumns: [
          { desc: '开始推移时长', key: 'start_ty_unit', type: 'TEXT', isNull: 'N' as const, defaultValue: '1', items: [] },
          { desc: '结束推移时长', key: 'end_ty_unit', type: 'TEXT', isNull: 'N' as const, defaultValue: '1', items: [] },
        ],
      }]),
    ],
    bizParamTypeName: '本店商品',
    dataTimeTypes: periods as number[],
    timeConfig: { 日: { outTime: '10:00', startTime: '10:20' } },
    reportColumnNameView: defaultReportColumns,
    reportTableColumnNameView: defaultReportFields,
    diagramUrlList: [],
  })),
  ...[
    ['market-101', 'Shopify·订单分析', 'Shopify Admin-订单-订单分析', '订单分析', 'shopify', 'shopify-admin', ['order', 'transaction'], 1280, [1, 2, 3]],
    ['market-102', 'Amazon·销售概览', 'Seller Central-销售-销售概览', '销售概览', 'amazon', 'seller-central', ['transaction', 'product'], 1068, [1, 2, 3]],
    ['market-103', 'TikTok Shop·直播分析', 'TikTok Shop-直播-直播分析', '直播分析', 'tiktok', 'tiktok-shop', ['live', 'traffic'], 936, [1, 2]],
  ].map(([id, connectorName, connectorPath, connectorModule, channel, platform, scenes, authNum, periods]) => ({
    id: id as string,
    connectorId: `conn-${String(id).split('-')[1]}`,
    connectorName: connectorName as string,
    connectorPath: connectorPath as string,
    connectorModule: connectorModule as string,
    channel: channel as string,
    platform: platform as string,
    industryProduct: '5' as IndustryProduct,
    bizSceneList: scenes as string[],
    authNum: authNum as number,
    favoriteStatus: false,
    sourcePath: connectorPath as string,
    dataTimeTypes: periods as number[],
    timeConfig: { 日: { outTime: '10:00', startTime: '10:20' } },
    reportColumnNameView: defaultReportColumns,
    reportTableColumnNameView: defaultReportFields,
    diagramUrlList: [],
  })),
  ...[
    ['market-201', '网银助手·银行流水', '网银助手-流水-银行流水', '银行流水', 'bank-assistant', 'bank-flow', ['transaction', 'finance'], 728, [0, 1]],
    ['market-202', '支付宝·账单明细', '支付宝-账单-账单明细', '账单明细', 'alipay', 'alipay-bill', ['transaction', 'finance'], 654, [1, 2]],
  ].map(([id, connectorName, connectorPath, connectorModule, channel, platform, scenes, authNum, periods]) => ({
    id: id as string,
    connectorId: `conn-${String(id).split('-')[1]}`,
    connectorName: connectorName as string,
    connectorPath: connectorPath as string,
    connectorModule: connectorModule as string,
    channel: channel as string,
    platform: platform as string,
    industryProduct: '3' as IndustryProduct,
    bizSceneList: scenes as string[],
    authNum: authNum as number,
    favoriteStatus: false,
    sourcePath: connectorPath as string,
    dataTimeTypes: periods as number[],
    timeConfig: { 日: { outTime: '10:00', startTime: '10:20' } },
    reportColumnNameView: defaultReportColumns,
    reportTableColumnNameView: defaultReportFields,
    diagramUrlList: [],
  })),
];

const historySeed: HistoryRecord[] = [
  {
    createTime: '2026-07-11 14:20:31',
    replyStatus: 1,
    typeName: '取数需求',
    platformName: '淘宝直播中控台',
    pageUrl: 'https://example.com/live',
    screenShot: ['直播页面截图'],
    replyInfo: '已评估为可接入，预计进入下一批数据源排期。',
  },
  {
    createTime: '2026-07-10 09:12:45',
    replyStatus: 0,
    typeName: '意见反馈',
    questionType: '异常问题反馈',
    questionDesc: '收藏数据源后切换平台偶现列表刷新慢。',
    screenShot: ['问题截图'],
  },
];

function getPlatformPath(connector: ConnectorCard) {
  const platformList = platformData[connector.industryProduct];
  const channel = platformList.find((item) => item.key === connector.channel);
  const platform = channel?.subList.find((item) => item.key === connector.platform);
  return [channel?.value, platform?.value].filter(Boolean).join('-');
}

function getDetailTitle(connector: ConnectorCard) {
  if (connector.platform === 'sycm') return '淘宝生意参谋';
  const platformName = getPlatformPath(connector).split('-').pop();
  return platformName ? `${platformName}${connector.connectorModule}` : connector.connectorName;
}

function getDataSourceText(connector: ConnectorCard) {
  if (connector.sourcePath) return connector.sourcePath;
  if (connector.platform === 'sycm') {
    return '生意参谋-市场-竞品分析-竞品对比-销售分析-关键指标对比';
  }
  return [getPlatformPath(connector), connector.connectorModule, connector.connectorPath].filter(Boolean).join('-');
}

const dynamicRangeKeys = new Set(['start_ty_unit', 'end_ty_unit']);
const dynamicRangeDescs = new Set(['开始推移时长', '结束推移时长']);

function uniqueLabels(labels: Array<string | undefined>) {
  const result: string[] = [];
  labels.forEach((label) => {
    const value = label?.trim();
    if (value && !result.includes(value)) result.push(value);
  });
  return result;
}

function getCustomParamColumns(defaultConfig?: ConnectorDefaultConfig[]) {
  const columns: CustomParamColumn[] = [];
  defaultConfig?.forEach((item) => {
    if (item.paramDataColumns?.length) {
      columns.push(...item.paramDataColumns);
      return;
    }
    columns.push(item);
  });
  return columns;
}

function isDynamicRangeColumn(column: CustomParamColumn) {
  return Boolean(
    (column.key && dynamicRangeKeys.has(column.key))
    || (column.desc && dynamicRangeDescs.has(column.desc)),
  );
}

function getQueryConditionText(connector: ConnectorCard) {
  const customParamColumns = getCustomParamColumns(connector.defaultConfig);
  const normalCustomLabels = customParamColumns
    .filter((item) => !isDynamicRangeColumn(item))
    .map((item) => item.desc || item.label);
  const hasDynamicRange = customParamColumns.some(isDynamicRangeColumn);
  const values = uniqueLabels([
    ...normalCustomLabels,
    connector.bizParamTypeName,
    hasDynamicRange ? '动态时间范围' : undefined,
  ]);
  return values.length ? values.join('、') : '--';
}

function getSuggestedTimeText(type: number, config: TimeConfig | undefined) {
  const label = getTimeTypeLabel(type);
  const time = config?.outTime || config?.startTime;
  return time ? `${label}（建议取数时间：${time}）` : label;
}

function getSuggestedTimeSummary(connector: ConnectorCard) {
  const values = uniqueLabels(connector.dataTimeTypes.map((type) => (
    getSuggestedTimeText(type, connector.timeConfig?.[getTimeTypeLabel(type)])
  )));
  return values.length ? values.join('｜') : '--';
}

function getTimeTypeLabel(type: number) {
  if (type === 0) return '实时';
  if (type === 1) return '日';
  if (type === 2) return '周';
  if (type === 3) return '月';
  return String(type);
}

function getPeriodTagLabel(type: number) {
  if (type === 0) return '实时';
  if (type === 1) return '日';
  if (type === 2) return '周';
  if (type === 3) return '月';
  return String(type);
}

function getConnectorDescription(connector: ConnectorCard) {
  const descriptionMap: Record<string, string> = {
    商品销售: '提供竞品店铺、商品、流量、交易等核心指标分析，支持多维对比。',
    交易概览: '提供店铺交易核心指标概览，支持趋势分析与明细下载。',
    商品明细: '提供商品明细数据，包括销量、访客、转化率等关键指标。',
    直播分析: '提供直播场次、流量、成交等数据分析，助力直播运营优化。',
    订单明细: '提供订单明细数据，包含订单状态、商品、金额等信息。',
    推广数据: '提供广告推广效果数据，支持多维度报表与效果分析。',
    商品分析: '提供商品曝光、点击、成交等数据分析，助力商品运营。',
    流量概览: '提供店铺流量来源及趋势分析，支持多维度流量洞察。',
  };
  if (descriptionMap[connector.connectorModule]) return descriptionMap[connector.connectorModule];
  const sceneLabels = connector.bizSceneList.slice(0, 3).map(getSceneLabel);
  const subjects = sceneLabels.length ? sceneLabels.join('、') : connector.connectorModule;
  return `提供${subjects}等核心数据，支持业务分析与日常运营。`;
}

function getSceneLabel(sceneKey: string) {
  return sceneData.find((item) => item.key === sceneKey)?.value || sceneKey;
}

function getConnectorFields(connector: ConnectorCard): ConnectorField[] {
  if (connector.dataFields?.length) return connector.dataFields;
  return connector.reportColumnNameView.map((label, index) => ({
    label,
    field: connector.reportTableColumnNameView[index] || '--',
  }));
}

function ConnectorIcon({ connector }: { connector: ConnectorCard }) {
  const platformIcon = platformData[connector.industryProduct].find((item) => item.key === connector.channel)?.iconText || connector.connectorModule.slice(0, 1);
  const iconUrl = platformIconUrls[connector.platform];

  return (
    <Avatar size={48} className={`${styles.connectorIcon} ${styles[`connectorIcon_${connector.channel}`] || ''}`}>
      {iconUrl ? <img src={iconUrl} alt={`${getPlatformPath(connector)}图标`} /> : platformIcon}
    </Avatar>
  );
}

function ConnectorMarketCard({
  item,
  featured = false,
  onFavorite,
  onDetail,
  onUse,
}: {
  item: ConnectorCard;
  featured?: boolean;
  onFavorite: (connectorId: string) => void;
  onDetail: (connector: ConnectorCard) => void;
  onUse: () => void;
}) {
  return (
    <Card
      className={`${styles.connectorCard} ${featured ? styles.featuredCard : ''}`}
      hoverable
      tabIndex={0}
      aria-label={`${item.connectorName}数据源`}
      title={(
        <div className={styles.connectorHeader}>
          <ConnectorIcon connector={item} />
          <div className={styles.connectorHeadingText}>
            <Tooltip content={item.connectorName}>
              <span className={styles.connectorTitle}>{item.connectorName}</span>
            </Tooltip>
            <div className={styles.connectorSubline}>
              <span className={styles.connectorBreadcrumb}>{getPlatformPath(item).replace('-', ' / ')}</span>
              {featured ? <Tag className={styles.featuredTag} color="orange">推荐</Tag> : null}
            </div>
          </div>
        </div>
      )}
      extra={(
        <Button
          type="text"
          aria-label={item.favoriteStatus ? '取消收藏' : '收藏数据源'}
          icon={item.favoriteStatus ? <IconStarFill /> : <IconStar />}
          className={`${styles.favoriteButton} ${item.favoriteStatus ? styles.favoriteActive : ''}`}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite(item.connectorId);
          }}
        />
      )}
      onClick={() => onDetail(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onDetail(item);
      }}
    >
      <p className={styles.connectorDescription}>{getConnectorDescription(item)}</p>
      <div className={styles.cardMetaRow}>
        <div className={styles.cardPeriodRow}>
          <Text type="secondary">支持取数周期</Text>
          <div className={styles.cardTags}>
            {item.dataTimeTypes.slice(0, 3).map((type) => <Tag key={type}>{getPeriodTagLabel(type)}</Tag>)}
          </div>
        </div>
        <div className={styles.connectorUsage}>
          <Text type="secondary">累计使用</Text>
          <strong>{item.authNum.toLocaleString()}</strong>
          <span>次</span>
        </div>
      </div>
      <div className={styles.cardActions}>
        <Button onClick={(event) => { event.stopPropagation(); onDetail(item); }}>查看详情</Button>
        <Button type="primary" onClick={(event) => { event.stopPropagation(); onUse(); }}>立即使用</Button>
      </div>
    </Card>
  );
}

function FeedbackModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState('demand');
  const [submitted, setSubmitted] = useState(false);
  const [fileList, setFileList] = useState<UploadItem[]>([]);
  const [form] = Form.useForm();

  const reset = (tab?: string) => {
    setSubmitted(false);
    form.resetFields();
    setFileList([]);
    if (tab) setActiveTab(tab);
  };

  return (
    <Modal
      visible={visible}
      className={styles.feedbackModal}
      title={(
        <Tabs activeTab={activeTab} onChange={reset} type="text" headerPadding={false}>
          <TabPane key="demand" title="取数需求" />
          <TabPane key="feedback" title="意见反馈" />
          <TabPane key="history" title="提交历史" />
        </Tabs>
      )}
      footer={submitted || activeTab === 'history' ? null : (
        <Button
          type="primary"
          long
          onClick={() => {
            form.validate().then(() => {
              setSubmitted(true);
              Message.success('提交成功');
            });
          }}
        >
          提交
        </Button>
      )}
      onCancel={() => {
        reset('demand');
        onClose();
      }}
    >
      {submitted ? (
        <div className={styles.submitSuccess}>
          <IconInfoCircle />
          <strong>提交成功</strong>
          <span>我们将在3个工作日内回复您~</span>
        </div>
      ) : activeTab === 'history' ? (
        <List
          className={styles.historyList}
          dataSource={historySeed}
          noDataElement={<Empty description="暂无提交内容" />}
          render={(record) => (
            <List.Item>
              <div className={styles.historyCard}>
                <div className={styles.historyHeader}>
                  <span>{record.createTime}</span>
                  <Tag color={record.replyStatus === 1 ? 'green' : 'orange'}>
                    {record.replyStatus === 1 ? '已回复' : '待回复'}
                  </Tag>
                </div>
                <p><Text type="secondary">反馈类型：</Text>{record.typeName}</p>
                {record.typeName === '取数需求' ? (
                  <>
                    <p><Text type="secondary">平台名称：</Text>{record.platformName}</p>
                    <p><Text type="secondary">页面地址：</Text><a href={record.pageUrl} target="_blank" rel="noreferrer">{record.pageUrl}</a></p>
                  </>
                ) : (
                  <>
                    <p><Text type="secondary">问题类型：</Text>{record.questionType}</p>
                    <p><Text type="secondary">问题描述：</Text>{record.questionDesc}</p>
                  </>
                )}
                <p><Text type="secondary">页面截图：</Text>{record.screenShot.join('、') || '--'}</p>
                {record.replyInfo ? <div className={styles.replyBox}><Text type="secondary">回复：</Text>{record.replyInfo}</div> : null}
              </div>
            </List.Item>
          )}
        />
      ) : (
        <Form form={form} layout="vertical">
          {activeTab === 'demand' ? (
            <>
              <Form.Item field="platformName" label="平台名称" rules={[{ required: true, message: '请输入平台名称' }]}>
                <Input placeholder="请输入平台名称" maxLength={20} />
              </Form.Item>
              <Form.Item field="pageUrl" label="页面地址" rules={[{ required: true, message: '请输入页面地址' }]}>
                <Input placeholder="请输入取数平台页面地址" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item field="questionType" label="问题类型" rules={[{ required: true, message: '请选择问题类型' }]}>
                <Select placeholder="请选择问题类型">
                  <Select.Option value="意见建议">意见建议</Select.Option>
                  <Select.Option value="异常问题反馈">异常问题反馈</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item field="questionDesc" label="问题描述" rules={[{ required: true, message: '请输入问题描述' }]}>
                <Input.TextArea rows={4} maxLength={500} showWordLimit placeholder="请详细描述您遇到的问题，不超过500个字符" />
              </Form.Item>
            </>
          )}
          <Form.Item field="screenShot" label="页面截图">
            <Upload
              listType="picture-card"
              fileList={fileList}
              autoUpload={false}
              limit={5}
              imagePreview
              onChange={(nextFileList) => setFileList(nextFileList)}
            >
              <div className={styles.uploadTrigger}>
                <IconPlus />
              </div>
            </Upload>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

function DetailModal({
  connector,
  onClose,
}: {
  connector: ConnectorCard | null;
  onClose: () => void;
}) {
  if (!connector) return null;
  const platformIcon = platformData[connector.industryProduct].find((item) => item.key === connector.channel)?.iconText || connector.connectorModule.slice(0, 1);
  const fieldRows = getConnectorFields(connector).map((field, index) => ({
    ...field,
    key: `field-${index}`,
    dataIndex: field.field || `field_${index}`,
  }));
  const tableRecord = fieldRows.reduce<Record<string, string>>((record, field) => {
    record[field.dataIndex] = field.field || '--';
    return record;
  }, { key: connector.connectorId });
  const previewFields = fieldRows.slice(0, 4);
  const previewRows = [
    previewFields.reduce<Record<string, string>>((record, field, index) => {
      record[field.dataIndex] = index === 0 ? '店铺A' : field.field;
      return record;
    }, { key: 'preview-1' }),
    previewFields.reduce<Record<string, string>>((record, field, index) => {
      record[field.dataIndex] = index === 0 ? '店铺B' : field.label;
      return record;
    }, { key: 'preview-2' }),
  ];
  const fieldPreviewRows = fieldRows.slice(0, 4).map((field) => ({
    key: field.key,
    label: field.label,
    field: field.field || '--',
    description: field.description || getDetailTitle(connector),
  }));
  const useConnector = () => {
    const channelKeyMap: Record<string, string> = {
      tx: 'taoxi',
      jd: 'jd',
      pdd: 'pdd',
      xhs: 'xiaohongshu',
    };
    window.dispatchEvent(new CustomEvent('market:use-connector', {
      detail: {
        connectorId: connector.platform === 'sycm' ? 'connector-sycm-product' : undefined,
        channelKey: channelKeyMap[connector.channel] || connector.channel,
        platformKey: connector.platform,
        dataCycle: connector.dataTimeTypes.includes(1) ? 1 : connector.dataTimeTypes[0],
      },
    }));
    onClose();
  };

  return (
    <Modal
      visible={Boolean(connector)}
      className={styles.detailModal}
      closeIcon={<IconClose className={styles.detailCloseIcon} />}
      footer={null}
      onCancel={onClose}
    >
      <div className={styles.detailContent}>
        <div className={styles.detailModalTitle}>
          <div className={styles.detailHeading}>
            <Avatar shape="square" size={50} className={styles.detailLogo}>
              {platformIcon}
            </Avatar>
            <div className={styles.detailTitle}>
              <h3>
                <BusinessCustomParameterAnnotationMarker noteId="BCP-2.1">
                  {getDetailTitle(connector)}
                </BusinessCustomParameterAnnotationMarker>
              </h3>
              <p>数据来源：{getDataSourceText(connector)}</p>
            </div>
          </div>
          <div className={styles.detailActions}>
            <Button
              className={styles.guideButton}
              icon={<IconLink />}
              onClick={() => {
                if (connector.connectorDescribeUrl) {
                  window.open(connector.connectorDescribeUrl);
                } else {
                  Message.info('该数据源暂无使用说明文档');
                }
              }}
            >
              使用说明
            </Button>
            <Button type="secondary" className={styles.useButton} icon={<IconPlayArrow />} onClick={useConnector}>
              立即使用
            </Button>
          </div>
        </div>
        <Card className={styles.detailHero} bordered={false}>
          <Carousel
            className={styles.heroCarousel}
            autoPlay={false}
            indicatorPosition="top"
            indicatorType="dot"
            showArrow="hover"
          >
            <div className={styles.heroSlide}>
              <Title heading={5}>连接数据，助力企业决策更高效</Title>
              <Tag className={styles.heroSourcePill} color="arcoblue">
                {getDetailTitle(connector)}商品、运营数据等
              </Tag>
              <div className={styles.heroConnectorLine} />
              <Card className={styles.heroSheetCard} bordered={false}>
                <Table
                  className={styles.heroPreviewTable}
                  rowKey="key"
                  pagination={false}
                  data={previewRows}
                  columns={previewFields.map((field) => ({
                    title: field.label,
                    dataIndex: field.dataIndex,
                    width: 126,
                    ellipsis: true,
                  }))}
                />
              </Card>
              <Menu className={styles.heroMenu} selectedKeys={['dashboard']}>
                <Menu.Item key="excel">
                  <span className={styles.heroMenuItem}>
                    <IconDownload />
                    导入 Excel
                    <Tag>.xlsx</Tag>
                    <Tag>.csv</Tag>
                  </span>
                </Menu.Item>
                <Menu.Item key="table">
                  <span className={styles.heroMenuItem}><IconInfoCircle />数据表</span>
                </Menu.Item>
                <Menu.Item key="form">
                  <span className={styles.heroMenuItem}><IconInfoCircle />收集表</span>
                </Menu.Item>
                <Menu.Item key="dashboard">
                  <span className={styles.heroMenuItem}><IconInfoCircle />仪表盘</span>
                </Menu.Item>
                <Menu.Item key="doc">
                  <span className={styles.heroMenuItem}><IconInfoCircle />文档</span>
                </Menu.Item>
              </Menu>
            </div>
            <div className={styles.heroSlide}>
              <Title heading={5}>字段配置，沉淀标准数据表</Title>
              <Tag className={styles.heroSourcePill} color="arcoblue">
                {getDetailTitle(connector)}字段结构
              </Tag>
              <div className={styles.heroConnectorLine} />
              <Card className={styles.heroSheetCard} bordered={false}>
                <Table
                  className={styles.heroPreviewTable}
                  rowKey="key"
                  pagination={false}
                  data={fieldPreviewRows}
                  columns={[
                    { title: '字段名称', dataIndex: 'label', width: 150, ellipsis: true },
                    { title: '字段编码', dataIndex: 'field', width: 150, ellipsis: true },
                    { title: '说明', dataIndex: 'description', ellipsis: true },
                  ]}
                />
              </Card>
              <Menu className={styles.heroMenu} selectedKeys={['table']}>
                <Menu.Item key="excel">
                  <span className={styles.heroMenuItem}>
                    <IconDownload />
                    导入 Excel
                    <Tag>.xlsx</Tag>
                    <Tag>.csv</Tag>
                  </span>
                </Menu.Item>
                <Menu.Item key="table">
                  <span className={styles.heroMenuItem}><IconInfoCircle />数据表</span>
                </Menu.Item>
                <Menu.Item key="form">
                  <span className={styles.heroMenuItem}><IconInfoCircle />收集表</span>
                </Menu.Item>
                <Menu.Item key="dashboard">
                  <span className={styles.heroMenuItem}><IconInfoCircle />仪表盘</span>
                </Menu.Item>
                <Menu.Item key="doc">
                  <span className={styles.heroMenuItem}><IconInfoCircle />文档</span>
                </Menu.Item>
              </Menu>
            </div>
          </Carousel>
        </Card>

        <section className={styles.detailSection}>
          <h3>
            <BusinessCustomParameterAnnotationMarker noteId="BCP-2.2">
              功能概述
            </BusinessCustomParameterAnnotationMarker>
          </h3>
          <Descriptions
            className={styles.detailDescriptions}
            column={1}
            data={[
              { label: '支持查询条件', value: getQueryConditionText(connector) },
              { label: '支持取数时间条件', value: getSuggestedTimeSummary(connector) },
            ]}
          />
        </section>

        <section className={styles.detailSection}>
          <div className={styles.fieldHeader}>
            <h3>数据表</h3>
            <Button type="text" size="small" icon={<IconDownload />} onClick={() => Message.success('字段明细已导出')}>
              导出
            </Button>
          </div>
          <Table
            className={styles.detailDataTable}
            rowKey="key"
            pagination={false}
            data={[tableRecord]}
            scroll={{ x: Math.max(736, fieldRows.length * 148) }}
            columns={fieldRows.map((field) => ({
              title: field.label,
              dataIndex: field.dataIndex,
              width: 148,
              ellipsis: true,
              render: (value) => (
                <Tooltip content={field.description || value}>
                  <span>{value}</span>
                </Tooltip>
              ),
            }))}
          />
        </section>
      </div>
    </Modal>
  );
}

export default function Market() {
  const [industryProduct, setIndustryProduct] = useState<IndustryProduct | '0'>('1');
  const [selectedPlatformKeys, setSelectedPlatformKeys] = useState<string[]>(['all']);
  const [platformSearch, setPlatformSearch] = useState('');
  const [searchField, setSearchField] = useState<MarketSearchField>('dataSourceName');
  const [searchValue, setSearchValue] = useState('');
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('recommended');
  const [connectors, setConnectors] = useState(connectorsSeed);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [detailConnector, setDetailConnector] = useState<ConnectorCard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const openMarketDetail = () => {
      setDetailConnector(
        connectorsSeed.find((item) => item.connectorId === 'connector-sycm-product') || connectorsSeed[0],
      );
    };

    window.addEventListener('business-custom:open-market-detail', openMarketDetail);
    return () => window.removeEventListener('business-custom:open-market-detail', openMarketDetail);
  }, []);

  const isCollect = industryProduct === '0';

  const favoriteList = useMemo(() => {
    const map = connectors
      .filter((item) => item.favoriteStatus)
      .reduce<Record<string, { channelCN: string; channel: string; channelNUM: number }>>((acc, item) => {
        const path = getPlatformPath(item).split('-')[0] || item.channel;
        if (!acc[item.channel]) acc[item.channel] = { channelCN: path, channel: item.channel, channelNUM: 0 };
        acc[item.channel].channelNUM += 1;
        return acc;
      }, {});
    return Object.values(map);
  }, [connectors]);

  const filteredConnectors = useMemo(() => connectors.filter((item) => {
    const keyword = searchValue.trim().toLowerCase();
    const searchTarget = searchField === 'sourcePath'
      ? [item.connectorPath, item.sourcePath, getDataSourceText(item)].filter(Boolean).join(' ')
      : item.connectorName;
    const matchCollect = !isCollect || item.favoriteStatus;
    const matchFavoritePlatform = !isCollect || !selectedPlatformKeys.length || selectedPlatformKeys.includes('favorite-all') || selectedPlatformKeys.includes(item.channel);
    const matchIndustry = isCollect || item.industryProduct === industryProduct;
    const matchPlatform = isCollect || selectedPlatformKeys.includes('all') || selectedPlatformKeys.includes(item.channel) || selectedPlatformKeys.includes(item.platform);
    const matchSearch = !keyword || searchTarget.toLowerCase().includes(keyword);
    const matchScene = !selectedScenes.length || selectedScenes.some((scene) => item.bizSceneList.includes(scene));
    const matchPeriod = periodFilter === 'all' || item.dataTimeTypes.includes(Number(periodFilter));
    return matchCollect && matchFavoritePlatform && matchIndustry && matchPlatform && matchSearch && matchScene && matchPeriod;
  }).sort((a, b) => {
    if (sortOption === 'usage-desc') return b.authNum - a.authNum;
    if (sortOption === 'name-asc') return a.connectorName.localeCompare(b.connectorName, 'zh-CN');
    return b.authNum - a.authNum;
  }), [connectors, industryProduct, isCollect, periodFilter, searchField, searchValue, selectedPlatformKeys, selectedScenes, sortOption]);

  const pageData = filteredConnectors.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const showRecommendations = currentPage === 1
    && !selectedScenes.length
    && periodFilter === 'all'
    && selectedPlatformKeys.includes('all')
    && !searchValue;
  const catalogPageData = showRecommendations ? pageData.slice(3) : pageData;
  const activeMenuKey = isCollect
    ? selectedPlatformKeys.includes('favorite-all') ? 'all' : selectedPlatformKeys[0] || 'all'
    : selectedPlatformKeys[0] || 'all';

  const visiblePlatforms = useMemo(() => {
    if (isCollect) {
      return favoriteList
        .filter((item) => item.channelCN.toLowerCase().includes(platformSearch.trim().toLowerCase()))
        .map((item) => ({ key: item.channel, value: item.channelCN, count: item.channelNUM }));
    }
    const keyword = platformSearch.trim().toLowerCase();
    return platformData[industryProduct as IndustryProduct]
      .filter((item) => item.value.toLowerCase().includes(keyword))
      .map((item) => ({
        key: item.key,
        value: item.value,
        count: connectors.filter((connector) => connector.industryProduct === industryProduct && connector.channel === item.key).length,
      }))
      .filter((item) => item.count > 0);
  }, [connectors, favoriteList, industryProduct, isCollect, platformSearch]);

  const handleProductLineClick = (productKey: IndustryProduct | '0') => {
    setSearchValue('');
    setSelectedScenes([]);
    setPlatformSearch('');
    setPeriodFilter('all');
    setCurrentPage(1);
    if (productKey === '0') {
      setIndustryProduct('0');
      setSelectedPlatformKeys(['favorite-all']);
      return;
    }
    setIndustryProduct(productKey);
    setSelectedPlatformKeys(['all']);
  };

  const handlePlatformMenuClick = (targetKey: string) => {
    setSelectedPlatformKeys([isCollect && targetKey === 'all' ? 'favorite-all' : targetKey]);
    setCurrentPage(1);
  };

  const handleSearchFieldChange = (value: MarketSearchField) => {
    setSearchField(value);
    setSearchValue('');
    setCurrentPage(1);
  };

  const setFavorite = (connectorId: string) => {
    setConnectors((prev) => prev.map((item) => (
      item.connectorId === connectorId ? { ...item, favoriteStatus: !item.favoriteStatus } : item
    )));
    Message.success('收藏状态已更新');
  };

  return (
    <div className={styles.page}>
      <aside className={styles.sider}>
        <Radio.Group
          type="button"
          value={industryProduct}
          className={styles.productLineMenu}
          onChange={(value) => handleProductLineClick(value as IndustryProduct | '0')}
        >
          {productLineMenus.map((product) => (
            <Radio key={product.key} value={product.key}>{product.label}</Radio>
          ))}
        </Radio.Group>

        <div className={styles.platformSearchWrap}>
          <Input
            allowClear
            prefix={<IconSearch />}
            placeholder="搜索平台"
            value={platformSearch}
            onChange={setPlatformSearch}
          />
        </div>

        <Menu
          mode="vertical"
          selectedKeys={[activeMenuKey]}
          className={`${styles.platformMenu} portal-side-menu`}
          onClickMenuItem={handlePlatformMenuClick}
        >
          <Menu.Item key="all">
            <span className={styles.platformMenuRow}>
              <span className={styles.platformMenuName}><IconApps className={styles.allPlatformIcon} /><span>全部平台</span></span>
              <Text type="secondary">{isCollect ? connectors.filter((item) => item.favoriteStatus).length : connectors.filter((item) => item.industryProduct === industryProduct).length}</Text>
            </span>
          </Menu.Item>
          {visiblePlatforms.map((platform) => (
            <Menu.Item key={platform.key}>
            <span className={styles.platformMenuRow}>
              <span className={styles.platformMenuName}>
                {platformLogoUrls[platform.key] ? <img src={platformLogoUrls[platform.key]} alt="" /> : null}
                <span>{platform.value}</span>
              </span>
              <Text type="secondary">{platform.count}</Text>
            </span>
            </Menu.Item>
          ))}
        </Menu>
      </aside>

      <main className={styles.content}>
        <section className={styles.marketHeader}>
          {!isCollect ? (
            <div className={styles.sceneBar}>
              <Tabs
                activeTab={selectedScenes[0] || 'all'}
                className={styles.sceneTabs}
                headerPadding={false}
                type="rounded"
                onChange={(key) => {
                  if (key === 'all') {
                    setSelectedScenes([]);
                  } else {
                    setSelectedScenes([key]);
                  }
                  setCurrentPage(1);
                }}
              >
                <TabPane key="all" title="全部" />
                {primarySceneKeys.map((key) => {
                  const item = sceneData.find((scene) => scene.key === key);
                  return item ? <TabPane key={item.key} title={item.value} /> : null;
                })}
              </Tabs>
            </div>
          ) : null}

          <div className={styles.heroSearch}>
            <Input.Group compact className={`${styles.heroSearchFields} qsb-arco-composite-search`}>
              <Select
                className={styles.searchFieldSelect}
                value={searchField}
                options={marketSearchOptions}
                onChange={(value) => handleSearchFieldChange(value as MarketSearchField)}
              />
              <Input.Search
                className={styles.searchInput}
                allowClear
                placeholder={`${marketSearchPlaceholders[searchField]}，如“交易概览”`}
                value={searchValue}
                onChange={(value) => {
                  setSearchValue(value);
                  setCurrentPage(1);
                }}
                onSearch={() => setCurrentPage(1)}
              />
            </Input.Group>
          </div>

          <div className={styles.resultToolbar}>
            <div className={styles.resultFilters}>
              <Select prefix={<IconCalendar />} value={periodFilter} options={periodOptions} onChange={(value) => { setPeriodFilter(value as PeriodFilter); setCurrentPage(1); }} />
              <Select value={sortOption} options={sortOptions} onChange={(value) => { setSortOption(value as SortOption); setCurrentPage(1); }} />
            </div>
            <Text type="secondary">共 {filteredConnectors.length} 个</Text>
          </div>
        </section>

        {showRecommendations ? (
          <section className={styles.recommendedSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.recommendedTitle}><span className={styles.recommendedTitleIcon}><IconStarFill /></span><Title heading={5}>推荐数据源</Title></span>
                <Text type="secondary">精选高价值数据源，助力业务快速增长</Text>
              </div>
              <Button type="text" icon={<IconRefresh />} onClick={() => Message.info('已为你换一组推荐数据源')}>换一换</Button>
            </div>
            <Grid cols={{ xs: 1, sm: 1, md: 3, xl: 3, xxl: 3 }} colGap={24}>
              {filteredConnectors.slice(0, 3).map((item) => (
                <Grid.GridItem key={`recommended-${item.connectorId}`}>
                  <ConnectorMarketCard
                    item={item}
                    featured
                    onFavorite={setFavorite}
                    onDetail={setDetailConnector}
                    onUse={() => {
                      setLoading(true);
                      window.setTimeout(() => {
                        setLoading(false);
                        Message.success('已打开运行配置');
                      }, 240);
                    }}
                  />
                </Grid.GridItem>
              ))}
            </Grid>
          </section>
        ) : null}

        <div className={styles.allSourcesHeading}>
          <Title heading={5}>全部数据源</Title>
        </div>

        <Spin loading={loading} className={styles.contentSpin}>
          {pageData.length ? (
            <Grid
              className={styles.cardGrid}
              cols={{ xs: 1, sm: 2, md: 3, xl: 3, xxl: 3 }}
              colGap={24}
              rowGap={24}
            >
              {catalogPageData.map((item) => (
                  <Grid.GridItem key={item.connectorId}>
                  <ConnectorMarketCard
                    item={item}
                    onFavorite={setFavorite}
                    onDetail={setDetailConnector}
                    onUse={() => {
                      setLoading(true);
                      window.setTimeout(() => {
                        setLoading(false);
                        Message.success('已打开运行配置');
                      }, 240);
                    }}
                  />
                  </Grid.GridItem>
              ))}
            </Grid>
          ) : (
            <Empty className={styles.empty} description={isCollect ? '暂无收藏的数据源' : '暂无数据源'} />
          )}
        </Spin>

        {filteredConnectors.length > pageSize ? (
          <div className={styles.pagination}>
            <Pagination
              total={filteredConnectors.length}
              current={currentPage}
              pageSize={pageSize}
              sizeCanChange
              showJumper
              sizeOptions={[16, 32, 48]}
              onChange={(page, size) => {
                setCurrentPage(size === pageSize ? page : 1);
                setPageSize(size);
              }}
            />
          </div>
        ) : null}
      </main>

      <DetailModal connector={detailConnector} onClose={() => setDetailConnector(null)} />
    </div>
  );
}
