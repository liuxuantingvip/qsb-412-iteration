import { ConnectorStatus, type BizParamConfigHeader, type BizParamConfigRow, type ConnectorFilters, type ConnectorRecord } from './interface';

export const industryProducts = ['电商取数宝', '跨境电商', '网银数据源', '餐饮数据源', '手机数据源'];

export const channels = [
  {
    label: '电商平台',
    value: '电商平台',
    platforms: ['淘宝天猫', '京东', '拼多多', '抖音电商'],
  },
  {
    label: '跨境平台',
    value: '跨境平台',
    platforms: ['Amazon', 'Shopify', 'TikTok Shop'],
  },
  {
    label: '财务系统',
    value: '财务系统',
    platforms: ['招商银行', '建设银行', '网银助手'],
  },
];

export const bizParamTypes = [
  { label: '本店商品', value: 'GOOD' },
  { label: '行业类目', value: 'CATEGORY' },
  { label: '竞争店铺', value: 'COMPETE_STORE' },
  { label: '竞争商品', value: 'COMPETE_GOOD' },
  { label: '竞争品牌', value: 'COMPETE_BRAND' },
];

export const connectorTags = ['高频取数', '核心链路', '需店铺授权', '新版入库', '跨境试点'];

function createBizParamConfigRows(type: string, index = 0): BizParamConfigRow[] {
  void type;
  void index;
  return [];
}

function createBizParamConfigHeaders(type: string): BizParamConfigHeader[] {
  const labelsByType: Record<string, string[]> = {
    GOOD: ['商品 ID'],
    CATEGORY: ['一级类目', '二级类目', '三级类目'],
    COMPETE_STORE: ['竞店名称', '一级类目'],
    COMPETE_GOOD: ['一级类目', '商品 ID', '所属店铺'],
    COMPETE_BRAND: ['竞品名称', '一级类目', '二级类目', '三级类目'],
  };
  return (labelsByType[type] || labelsByType.GOOD).map((label, index) => ({
    id: `biz-param-header-${type}-${index}`,
    label,
  }));
}

const baseReports = [
  {
    id: 'report-1',
    tableNameCn: '商品销售明细',
    tableNameEn: 'mall_goods_sale_detail',
    defaultCleaningRule: 'goods_id,sku_id,gmv',
    bizParam: 'shop_id,biz_date',
    dataRecord: {
      recordNotNullSwitch: 1 as const,
      detectionSwitch: 1 as const,
      detectionType: 0 as const,
      fixedRange: { minValue: 1, maxValue: 1000000 },
      floatRange: {},
      fieldNotNull: 'shop_id,biz_date',
      fieldSum: [{
        fieldName: 'gmv',
        detectionType: 0 as const,
        fixedRange: { minValue: 1, maxValue: 1000000000 },
        floatRange: {},
      }],
    },
    fields: [
      { id: 'f-1', fieldName: 'shop_id', fieldComment: '店铺ID', fieldAttr: 'varchar', fieldLength: 64, fieldType: '文本' as const, fieldLock: 0 as const, validStatus: 1 as const, isBizParam: true, isFieldNotNull: true },
      { id: 'f-2', fieldName: 'biz_date', fieldComment: '业务日期', fieldAttr: 'datetime', fieldLength: null, fieldType: '时间' as const, fieldLock: 0 as const, validStatus: 1 as const, isBizParam: true, isFieldNotNull: true },
      { id: 'f-3', fieldName: 'goods_id', fieldComment: '商品ID', fieldAttr: 'varchar', fieldLength: 64, fieldType: '文本' as const, fieldLock: 0 as const, validStatus: 1 as const, isCleaning: true },
      { id: 'f-4', fieldName: 'sku_id', fieldComment: 'SKU ID', fieldAttr: 'varchar', fieldLength: 64, fieldType: '文本' as const, fieldLock: 0 as const, validStatus: 1 as const, isCleaning: true },
      { id: 'f-5', fieldName: 'gmv', fieldComment: '销售额', fieldAttr: 'decimal', fieldLength: '28,4', fieldType: '数值' as const, fieldLock: 0 as const, validStatus: 1 as const, isCleaning: true, isFieldSum: true, detectionType: 0 as const, fixedRange: { minValue: 1, maxValue: 1000000000 }, floatRange: {} },
    ],
  },
];

const seedRecords: ConnectorRecord[] = [
  {
    id: 'CONN-1001',
    connectorCode: 'QSB-MALL-TMALL-GOODS',
    connectorName: '电商平台淘宝天猫-商品销售',
    connectorModule: '商品销售',
    connectorPath: '/mall/tmall/goods-sale',
    industryProduct: '电商取数宝',
    channel: '电商平台',
    platform: '淘宝天猫',
    bizUnitList: ['运营效率组', '电商数据组'],
    bizSceneList: ['经营日报', '商品分析'],
    tagList: ['高频取数', '核心链路', '需店铺授权'],
    bizParamType: 'GOOD',
    bizParamConfigRows: createBizParamConfigRows('GOOD', 1),
    bizParamConfigHeaders: createBizParamConfigHeaders('GOOD'),
    splitHeartbeatByBiz: true,
    defaultConfig: '[{"key":"dateRange","label":"采集日期","type":"dateRange","required":true}]',
    needStore: 'Y',
    needRange: 'Y',
    dataTimeTypes: [1, 2],
    timeConfig: JSON.stringify({
      日: { outTime: '08:30', startTime: '09:00' },
      周: { outWeekDay: 1, outTime: '08:30', startWeekDay: 1, startTime: '09:00' },
    }),
    elapsedTime: 86,
    processVersion: 'v4.0.9',
    processName: 'tmall_goods_sale_v409.zip',
    publishStatus: ConnectorStatus.Up,
    modifyByName: '白凤',
    modifyTime: '2026-07-12 18:24:31',
    reportRequestList: baseReports,
    diagramUrlList: ['tmall-goods-path-1.png'],
    connectorDescribeUrl: 'https://example.com/qsb/tmall-goods',
  },
  {
    id: 'CONN-1002',
    connectorCode: 'QSB-MALL-JD-ORDER',
    connectorName: '电商平台京东-订单明细',
    connectorModule: '订单明细',
    connectorPath: '/mall/jd/order-detail',
    industryProduct: '电商取数宝',
    channel: '电商平台',
    platform: '京东',
    bizUnitList: ['电商数据组'],
    bizSceneList: ['订单对账', '经营日报'],
    tagList: ['新版入库', '需店铺授权'],
    bizParamType: 'GOOD',
    bizParamConfigRows: createBizParamConfigRows('GOOD', 2),
    bizParamConfigHeaders: createBizParamConfigHeaders('GOOD'),
    splitHeartbeatByBiz: true,
    defaultConfig: '[{"key":"orderStatus","label":"订单状态","type":"select","options":["已付款","已完成"]}]',
    needStore: 'Y',
    needRange: 'Y',
    dataTimeTypes: [1],
    timeConfig: JSON.stringify({
      日: { outTime: '10:00', startTime: '10:30' },
    }),
    elapsedTime: 124,
    processVersion: 'v4.0.8',
    processName: 'jd_order_detail_v408.zip',
    publishStatus: ConnectorStatus.Checking,
    modifyByName: '森森',
    modifyTime: '2026-07-13 09:16:48',
    reportRequestList: baseReports,
    diagramUrlList: ['jd-order-path-1.png'],
  },
  {
    id: 'CONN-1003',
    connectorCode: 'QSB-CB-AMAZON-ADS',
    connectorName: '跨境平台Amazon-广告表现',
    connectorModule: '广告表现',
    connectorPath: '/cross/amazon/ads-performance',
    industryProduct: '跨境电商',
    channel: '跨境平台',
    platform: 'Amazon',
    bizUnitList: ['跨境业务组'],
    bizSceneList: ['广告优化', 'ROI 诊断'],
    tagList: ['跨境试点'],
    bizParamType: 'COMPETE_GOOD',
    bizParamConfigRows: createBizParamConfigRows('COMPETE_GOOD', 3),
    bizParamConfigHeaders: createBizParamConfigHeaders('COMPETE_GOOD'),
    splitHeartbeatByBiz: true,
    defaultConfig: '[{"key":"marketplace","label":"站点","type":"select","required":true}]',
    needStore: 'Y',
    needRange: 'Y',
    dataTimeTypes: [1, 3],
    timeConfig: JSON.stringify({
      日: { outTime: '12:00', startTime: '12:30' },
      月: { outDayOfMonth: 1, outTime: '12:00', startDayOfMonth: 1, startTime: '12:30' },
    }),
    elapsedTime: 210,
    processVersion: 'v4.0.7',
    processName: 'amazon_ads_v407.zip',
    publishStatus: ConnectorStatus.Rejected,
    refuseReason: '自定义配置填写不规范',
    modifyByName: '张军燕',
    modifyTime: '2026-07-10 16:45:09',
    reportRequestList: baseReports,
    diagramUrlList: ['amazon-ads-path-1.png'],
  },
  {
    id: 'CONN-1004',
    connectorCode: 'QSB-MALL-PDD-STOCK',
    connectorName: '电商平台拼多多-库存快照',
    connectorModule: '库存快照',
    connectorPath: '/mall/pdd/stock-snapshot',
    industryProduct: '电商取数宝',
    channel: '电商平台',
    platform: '拼多多',
    bizUnitList: ['供应链组'],
    bizSceneList: ['库存监控'],
    tagList: ['核心链路'],
    bizParamType: 'GOOD',
    bizParamConfigRows: createBizParamConfigRows('GOOD', 4),
    bizParamConfigHeaders: createBizParamConfigHeaders('GOOD'),
    splitHeartbeatByBiz: false,
    defaultConfig: '[{"key":"warehouse","label":"仓库","type":"input"}]',
    needStore: 'Y',
    needRange: 'N',
    dataTimeTypes: [],
    timeConfig: '',
    elapsedTime: 58,
    processVersion: 'v4.0.6',
    processName: 'pdd_stock_v406.zip',
    publishStatus: ConnectorStatus.Down,
    modifyByName: '白凤',
    modifyTime: '2026-07-09 11:08:22',
    reportRequestList: baseReports,
    diagramUrlList: ['pdd-stock-path-1.png'],
  },
];

const moduleNames = [
  '商品销售',
  '订单明细',
  '库存快照',
  '广告表现',
  '售后退款',
  '直播成交',
  '会员资产',
  '搜索词',
  '店铺流量',
  '评价分析',
];

const editors = ['白凤', '森森', '张军燕', '凌波', '长乐2', '城之内', '马丁', '景天测试'];
const bizUnits = ['运营效率组', '电商数据组', '跨境业务组', '供应链组'];
const bizScenes = ['经营日报', '商品分析', '订单对账', '广告优化', '库存监控', 'ROI 诊断'];
const statuses = [ConnectorStatus.Up, ConnectorStatus.Checking, ConnectorStatus.Rejected, ConnectorStatus.Down];

const generatedRecords: ConnectorRecord[] = Array.from({ length: 100 }, (_, index) => {
  const seed = seedRecords[index % seedRecords.length];
  const channel = channels[index % channels.length];
  const platform = channel.platforms[index % channel.platforms.length];
  const moduleName = moduleNames[index % moduleNames.length];
  const status = statuses[index % statuses.length];
  const bizParam = bizParamTypes[index % bizParamTypes.length];
  const day = String((index % 28) + 1).padStart(2, '0');
  const hour = String(8 + (index % 10)).padStart(2, '0');
  const minute = String((index * 7) % 60).padStart(2, '0');

  return {
    ...seed,
    id: `CONN-${String(1001 + index).padStart(4, '0')}`,
    connectorCode: `QSB-${String(index + 1).padStart(4, '0')}`,
    connectorName: `${channel.label}${platform}-${moduleName}`,
    connectorModule: moduleName,
    connectorPath: `/${seed.industryProduct === '跨境电商' ? 'cross' : 'mall'}/${platform.toLowerCase().replace(/\s/g, '-')}/${moduleName}`,
    industryProduct: industryProducts[index % industryProducts.length],
    channel: channel.value,
    platform,
    bizUnitList: [bizUnits[index % bizUnits.length]],
    bizSceneList: [bizScenes[index % bizScenes.length], bizScenes[(index + 1) % bizScenes.length]],
    tagList: [
      connectorTags[index % connectorTags.length],
      connectorTags[(index + 2) % connectorTags.length],
    ],
    bizParamType: bizParam.value,
    bizParamConfigRows: createBizParamConfigRows(bizParam.value, index + 1),
    bizParamConfigHeaders: createBizParamConfigHeaders(bizParam.value),
    splitHeartbeatByBiz: index % 4 !== 0,
    defaultConfig: `[{"key":"dateRange","label":"采集日期","type":"dateRange","required":true},{"key":"platform","label":"${platform}","type":"input"}]`,
    needStore: index % 5 === 0 ? 'N' : 'Y',
    needRange: index % 6 === 0 ? 'N' : 'Y',
    dataTimeTypes: index % 3 === 0 ? [1, 3] : index % 4 === 0 ? [0] : [1],
    timeConfig: JSON.stringify(index % 3 === 0
      ? {
        日: { outTime: `${hour}:30`, startTime: `${String(Number(hour) + 1).padStart(2, '0')}:00` },
        月: { outDayOfMonth: 1, outTime: `${hour}:30`, startDayOfMonth: 1, startTime: `${String(Number(hour) + 1).padStart(2, '0')}:00` },
      }
      : {
        日: { outTime: `${hour}:30`, startTime: `${String(Number(hour) + 1).padStart(2, '0')}:00` },
      }),
    elapsedTime: 45 + (index % 15) * 12,
    processVersion: `v4.0.${index % 10}`,
    processName: `connector_${index + 1}_v40${index % 10}.zip`,
    publishStatus: status,
    refuseReason: status === ConnectorStatus.Rejected ? '自定义配置填写不规范' : undefined,
    modifyByName: editors[index % editors.length],
    modifyTime: `2026-07-${day} ${hour}:${minute}:31`,
    reportRequestList: seed.reportRequestList.map((report) => ({
      ...report,
      id: `${report.id}-${index}`,
      fields: report.fields.map((field) => ({ ...field, id: `${field.id}-${index}` })),
    })),
    diagramUrlList: [`connector-${index + 1}-path.png`],
    connectorDescribeUrl: `https://example.com/qsb/connector-${index + 1}`,
  };
});

let records: ConnectorRecord[] = generatedRecords;

const wait = (ms = 180) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

export async function getConnectorPageList(filters: ConnectorFilters = {}) {
  await wait();
  return records.filter((item) => (
    (!filters.connectorName || item.connectorName.includes(filters.connectorName))
    && (!filters.industryProduct || item.industryProduct === filters.industryProduct)
    && (!filters.channel || item.channel === filters.channel)
    && (!filters.platform || item.platform === filters.platform)
    && (filters.publishStatus === undefined || item.publishStatus === filters.publishStatus)
    && (!filters.bizParamType || item.bizParamType === filters.bizParamType)
    && (!filters.tagIds?.length || filters.tagIds.every((tag) => item.tagList.includes(tag)))
  ));
}

export async function getConnectorInfo(id: string) {
  await wait(120);
  return records.find((item) => item.id === id);
}

export async function saveConnector(payload: ConnectorRecord) {
  await wait(160);
  if (payload.id) {
    records = records.map((item) => (item.id === payload.id ? payload : item));
  } else {
    records = [{ ...payload, id: `CONN-${Date.now()}` }, ...records];
  }
  return { success: true };
}

export async function changeConnectorStatus(id: string, publishStatus: ConnectorStatus, refuseReason?: string) {
  await wait(140);
  records = records.map((item) => (
    item.id === id
      ? { ...item, publishStatus, refuseReason, modifyByName: '森森', modifyTime: '2026-07-13 16:00:00' }
      : item
  ));
}

export async function deleteConnector(id: string) {
  await wait(140);
  records = records.filter((item) => item.id !== id);
}

export async function batchUpdateProcess(ids: string[], version: string) {
  await wait(220);
  records = records.map((item) => (
    ids.includes(item.id)
      ? { ...item, processVersion: version, modifyByName: '森森', modifyTime: '2026-07-13 16:00:00' }
      : item
  ));
}
