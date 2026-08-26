export type BusinessParamType = 'GOOD' | 'CATEGORY' | 'COMPETE_STORE' | 'COMPETE_GOOD' | 'COMPETE_BRAND';

export interface BusinessParamConnectorRef {
  id: string;
  name: string;
}

export interface BusinessParamSet {
  id: string;
  bizParamType: BusinessParamType;
  paramName: string;
  paramRemark: string;
  previewColumns: string[];
  previewRows: Array<Record<string, string>>;
  associatedConnectors: BusinessParamConnectorRef[];
  channel: string;
  platform: string;
  status: 'enabled' | 'disabled';
  updatedBy: string;
  updatedAt: string;
}

export interface ConnectorParamSchema {
  connectorId: string;
  connectorName: string;
  bizParamType: BusinessParamType;
  headers: string[];
  splitHeartbeatByBiz: boolean;
}

export const businessParamTypeMeta: Record<BusinessParamType, {
  label: string;
  configLabel: string;
  nameLabel: string;
  infoTitle: string;
  columns: string[];
}> = {
  GOOD: {
    label: '本店商品',
    configLabel: '本店商品配置',
    nameLabel: '商品集名称',
    infoTitle: '商品集信息',
    columns: ['商品 ID'],
  },
  CATEGORY: {
    label: '行业类目',
    configLabel: '行业类目配置',
    nameLabel: '类目集名称',
    infoTitle: '类目集信息',
    columns: ['一级类目', '二级类目', '三级类目'],
  },
  COMPETE_STORE: {
    label: '竞品店铺',
    configLabel: '竞品店铺配置',
    nameLabel: '竞店集名称',
    infoTitle: '竞店集信息',
    columns: ['竞店名称', '一级类目'],
  },
  COMPETE_GOOD: {
    label: '竞品商品',
    configLabel: '竞品商品配置',
    nameLabel: '竞品商品集名称',
    infoTitle: '竞品商品集信息',
    columns: ['一级类目', '商品 ID', '所属店铺'],
  },
  COMPETE_BRAND: {
    label: '竞品品牌',
    configLabel: '竞品品牌配置',
    nameLabel: '竞品品牌集名称',
    infoTitle: '竞品品牌集信息',
    columns: ['竞品名称', '一级类目', '二级类目', '三级类目'],
  },
};

export const businessParamTypeList = Object.entries(businessParamTypeMeta).map(([value, meta]) => ({
  value: value as BusinessParamType,
  label: meta.label,
  configLabel: meta.configLabel,
}));

const connectorRefs: BusinessParamConnectorRef[] = [
  { id: 'connector-sycm-product', name: '淘系生意参谋商品 360' },
  { id: 'connector-jd-business-sales', name: '京东商智-交易概览' },
  { id: 'connector-pdd-shop-sales', name: '拼多多商家后台-交易数据' },
  { id: 'connector-xhs-juguang-account', name: '聚光平台-账户报表' },
  { id: 'connector-alimama-account', name: '阿里妈妈-账户日报' },
];

let businessParamSets: BusinessParamSet[] = [
  {
    id: 'biz-param-good-main',
    bizParamType: 'GOOD',
    paramName: '本店商品-核心款',
    paramRemark: '商品 360 默认商品集',
    previewColumns: ['商品 ID'],
    previewRows: [
      { '商品 ID': '8217381273' },
      { '商品 ID': '8217381299' },
      { '商品 ID': '8217381306' },
      { '商品 ID': '8217381320' },
    ],
    associatedConnectors: [connectorRefs[0]],
    channel: '淘系',
    platform: '生意参谋',
    status: 'enabled',
    updatedBy: '森森',
    updatedAt: '2026-07-13 21:30:00',
  },
  {
    id: 'biz-param-category-face',
    bizParamType: 'CATEGORY',
    paramName: '伊芙丽行业构成类目',
    paramRemark: '行业类目参数集',
    previewColumns: businessParamTypeMeta.CATEGORY.columns,
    previewRows: [
      { 一级类目: '森森', 二级类目: 'Sen', 三级类目: 'se' },
      { 一级类目: '网易', 二级类目: 'Wang', 三级类目: 'Wan' },
    ],
    associatedConnectors: [connectorRefs[1]],
    channel: '淘系',
    platform: '生意参谋',
    status: 'enabled',
    updatedBy: '森森',
    updatedAt: '2026-07-13 21:30:00',
  },
  {
    id: 'biz-param-store-main',
    bizParamType: 'COMPETE_STORE',
    paramName: '竞品店铺-核心竞店',
    paramRemark: '竞店参数集',
    previewColumns: businessParamTypeMeta.COMPETE_STORE.columns,
    previewRows: [
      { 竞店名称: '逐本旗舰店', 一级类目: '美容护肤' },
      { 竞店名称: '蓝漂日用品官方旗舰店', 一级类目: '家清' },
    ],
    associatedConnectors: [connectorRefs[3]],
    channel: '小红书',
    platform: '聚光平台',
    status: 'enabled',
    updatedBy: '森森',
    updatedAt: '2026-07-13 21:30:00',
  },
  {
    id: 'biz-param-good-compete-main',
    bizParamType: 'COMPETE_GOOD',
    paramName: '竞品商品-重点监控',
    paramRemark: '竞品商品参数集',
    previewColumns: businessParamTypeMeta.COMPETE_GOOD.columns,
    previewRows: [
      { 一级类目: '美容护肤', '商品 ID': 'C-GOOD-9021', 所属店铺: '逐本旗舰店' },
      { 一级类目: '食品饮料', '商品 ID': 'C-GOOD-9301', 所属店铺: '农夫山泉官方旗舰店' },
    ],
    associatedConnectors: [connectorRefs[2]],
    channel: '拼多多',
    platform: '拼多多商家后台',
    status: 'enabled',
    updatedBy: '森森',
    updatedAt: '2026-07-13 21:30:00',
  },
  {
    id: 'biz-param-brand-main',
    bizParamType: 'COMPETE_BRAND',
    paramName: '竞品品牌-核心品牌',
    paramRemark: '竞品品牌参数集',
    previewColumns: businessParamTypeMeta.COMPETE_BRAND.columns,
    previewRows: [
      { 竞品名称: '逐本', 一级类目: '美容护肤', 二级类目: '面部护理', 三级类目: '洁面' },
      { 竞品名称: '蓝漂', 一级类目: '家清', 二级类目: '衣物清洁', 三级类目: '洗衣液' },
    ],
    associatedConnectors: [connectorRefs[4]],
    channel: '淘系',
    platform: '阿里妈妈',
    status: 'enabled',
    updatedBy: '森森',
    updatedAt: '2026-07-13 21:30:00',
  },
];

let connectorSchemas: Record<string, ConnectorParamSchema> = {
  'connector-sycm-product': {
    connectorId: 'connector-sycm-product',
    connectorName: '淘系生意参谋商品 360',
    bizParamType: 'GOOD',
    headers: ['商品 ID'],
    splitHeartbeatByBiz: false,
  },
  'connector-xhs-juguang-account': {
    connectorId: 'connector-xhs-juguang-account',
    connectorName: '聚光平台-账户报表',
    bizParamType: 'COMPETE_STORE',
    headers: businessParamTypeMeta.COMPETE_STORE.columns,
    splitHeartbeatByBiz: false,
  },
  'connector-pdd-shop-sales': {
    connectorId: 'connector-pdd-shop-sales',
    connectorName: '拼多多商家后台-交易数据',
    bizParamType: 'COMPETE_GOOD',
    headers: businessParamTypeMeta.COMPETE_GOOD.columns,
    splitHeartbeatByBiz: false,
  },
  'connector-alimama-account': {
    connectorId: 'connector-alimama-account',
    connectorName: '阿里妈妈-账户日报',
    bizParamType: 'COMPETE_BRAND',
    headers: businessParamTypeMeta.COMPETE_BRAND.columns,
    splitHeartbeatByBiz: false,
  },
};

let connectorDefaultParamMap: Record<string, string> = {};
const listeners = new Set<() => void>();

function cloneSet(set: BusinessParamSet): BusinessParamSet {
  return {
    ...set,
    previewColumns: [...set.previewColumns],
    previewRows: set.previewRows.map((row) => ({ ...row })),
    associatedConnectors: set.associatedConnectors.map((connector) => ({ ...connector })),
  };
}

function notifyBusinessParamStore() {
  listeners.forEach((listener) => listener());
}

function normalizeConnectors(connectors: BusinessParamConnectorRef[] = []) {
  const map = new Map<string, BusinessParamConnectorRef>();
  connectors.forEach((connector) => {
    if (!connector.id || !connector.name) return;
    map.set(connector.id, { ...connector });
  });
  return Array.from(map.values());
}

export function subscribeBusinessParamStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBusinessParamSets(type?: BusinessParamType) {
  return businessParamSets
    .filter((set) => !type || set.bizParamType === type)
    .map(cloneSet);
}

export function getBusinessParamSet(id?: string) {
  const set = businessParamSets.find((item) => item.id === id);
  return set ? cloneSet(set) : undefined;
}

export function getConnectorParamSchema(connectorId?: string, connectorName?: string) {
  const schema = (connectorId && connectorSchemas[connectorId])
    || Object.values(connectorSchemas).find((item) => item.connectorName === connectorName);
  return schema ? { ...schema, headers: [...schema.headers] } : undefined;
}

export function getBusinessParamColumns(type: BusinessParamType, connectorId?: string, connectorName?: string) {
  const schema = getConnectorParamSchema(connectorId, connectorName);
  if (schema?.headers.length) return schema.headers;
  return businessParamTypeMeta[type].columns;
}

export function getDefaultBusinessParamSetForConnector(connectorId?: string) {
  if (!connectorId) return undefined;
  return getBusinessParamSet(connectorDefaultParamMap[connectorId]);
}

export function getConnectorRefs() {
  const map = new Map<string, BusinessParamConnectorRef>();
  connectorRefs.forEach((connector) => map.set(connector.id, { ...connector }));
  Object.values(connectorSchemas).forEach((schema) => {
    map.set(schema.connectorId, { id: schema.connectorId, name: schema.connectorName });
  });
  businessParamSets.forEach((set) => {
    set.associatedConnectors.forEach((connector) => map.set(connector.id, { ...connector }));
  });
  return Array.from(map.values());
}

export function saveConnectorParamSchema(schema: ConnectorParamSchema) {
  connectorSchemas = {
    ...connectorSchemas,
    [schema.connectorId]: {
      ...schema,
      headers: schema.headers.filter(Boolean),
    },
  };
  notifyBusinessParamStore();
}

export function associateBusinessParamSet(paramId: string, connectors: BusinessParamConnectorRef[]) {
  const nextConnectors = normalizeConnectors(connectors);
  businessParamSets = businessParamSets.map((set) => {
    if (set.id !== paramId) return set;
    return {
      ...set,
      associatedConnectors: normalizeConnectors([...set.associatedConnectors, ...nextConnectors]),
      updatedAt: '2026-07-13 21:30:00',
    };
  });
  notifyBusinessParamStore();
}

export function saveBusinessParamSet(payload: {
  id?: string;
  bizParamType: BusinessParamType;
  paramName: string;
  paramRemark?: string;
  previewColumns: string[];
  previewRows: Array<Record<string, string>>;
  associatedConnectors: BusinessParamConnectorRef[];
  channel?: string;
  platform?: string;
  status?: 'enabled' | 'disabled';
  setDefaultConnectorId?: string;
}) {
  const previousSet = payload.id ? businessParamSets.find((set) => set.id === payload.id) : undefined;
  const normalizedConnectors = normalizeConnectors(payload.associatedConnectors);
  const nextSet: BusinessParamSet = {
    id: payload.id || `biz-param-${payload.bizParamType.toLowerCase()}-${Date.now()}`,
    bizParamType: payload.bizParamType,
    paramName: payload.paramName,
    paramRemark: payload.paramRemark || '',
    previewColumns: payload.previewColumns,
    previewRows: payload.previewRows.map((row) => ({ ...row })),
    associatedConnectors: normalizedConnectors,
    channel: payload.channel || '淘系',
    platform: payload.platform || '生意参谋',
    status: payload.status || 'enabled',
    updatedBy: '森森',
    updatedAt: '2026-07-13 21:30:00',
  };

  businessParamSets = businessParamSets.some((set) => set.id === nextSet.id)
    ? businessParamSets.map((set) => (set.id === nextSet.id ? nextSet : set))
    : [nextSet, ...businessParamSets];

  if (previousSet) {
    const nextConnectorIds = new Set(normalizedConnectors.map((connector) => connector.id));
    connectorDefaultParamMap = Object.fromEntries(
      Object.entries(connectorDefaultParamMap).filter(([connectorId, paramId]) => (
        paramId !== nextSet.id || nextConnectorIds.has(connectorId)
      )),
    );
  }

  if (payload.setDefaultConnectorId) {
    connectorDefaultParamMap = {
      ...connectorDefaultParamMap,
      [payload.setDefaultConnectorId]: nextSet.id,
    };
  }

  notifyBusinessParamStore();
  return cloneSet(nextSet);
}

export function deleteBusinessParamSet(id: string) {
  businessParamSets = businessParamSets.filter((set) => set.id !== id);
  connectorDefaultParamMap = Object.fromEntries(
    Object.entries(connectorDefaultParamMap).filter(([, paramId]) => paramId !== id),
  );
  notifyBusinessParamStore();
}
