export enum ConnectorStatus {
  Down = 0,
  Up = 1,
  Checking = 2,
  Rejected = -1,
}

export interface ConnectorRecord {
  id: string;
  connectorCode: string;
  connectorName: string;
  connectorModule: string;
  connectorPath: string;
  industryProduct: string;
  channel: string;
  platform: string;
  bizUnitList: string[];
  bizSceneList: string[];
  tagList: string[];
  bizParamType: string;
  bizParamConfigRows: BizParamConfigRow[];
  bizParamConfigHeaders?: BizParamConfigHeader[];
  splitHeartbeatByBiz: boolean;
  defaultConfig: string;
  needStore: 'Y' | 'N';
  needRange: 'Y' | 'N';
  dataTimeTypes: number[];
  timeConfig: string;
  elapsedTime: number;
  processVersion: string;
  processName: string;
  publishStatus: ConnectorStatus;
  refuseReason?: string;
  modifyByName: string;
  modifyTime: string;
  reportRequestList: ConnectorReport[];
  diagramUrlList: string[];
  connectorDescribeUrl?: string;
}

export interface BizParamConfigRow {
  id: string;
  goodsId?: string;
  categoryLevel1?: string;
  categoryLevel2?: string;
  categoryLevel3?: string;
  competeStoreName?: string;
  competeBrandName?: string;
  belongStore?: string;
}

export interface BizParamConfigHeader {
  id: string;
  label: string;
}

export interface ConnectorReport {
  id: string;
  tableNameCn: string;
  tableNameEn: string;
  defaultCleaningRule: string;
  bizParam: string;
  dataRecord: ConnectorDataRecord;
  fields: ConnectorField[];
}

export interface ConnectorField {
  id: string;
  fieldName: string;
  fieldComment: string;
  fieldAttr: string;
  fieldLength: number | string | null;
  fieldType?: '文本' | '数值' | '时间';
  fieldLock: 0 | 1;
  validStatus: 0 | 1 | 2;
  isBizParam?: boolean;
  isCleaning?: boolean;
  isFieldNotNull?: boolean;
  isFieldSum?: boolean;
  detectionType?: 0 | 1;
  fixedRange?: ConnectorFixRange;
  floatRange?: ConnectorFloatRange;
}

export interface ConnectorFixRange {
  minValue?: number;
  maxValue?: number;
}

export interface ConnectorFloatRange {
  dayCount?: number;
  minValue?: number;
  maxValue?: number;
}

export interface ConnectorFieldSum {
  fieldName: string;
  detectionType: 0 | 1;
  fixedRange: ConnectorFixRange;
  floatRange: ConnectorFloatRange;
}

export interface ConnectorDataRecord {
  recordNotNullSwitch: 0 | 1;
  detectionSwitch: 0 | 1;
  detectionType: 0 | 1;
  fixedRange: ConnectorFixRange;
  floatRange: ConnectorFloatRange;
  fieldNotNull: string;
  fieldSum: ConnectorFieldSum[];
}

export interface ConnectorFilters {
  connectorName?: string;
  industryProduct?: string;
  channel?: string;
  platform?: string;
  publishStatus?: ConnectorStatus;
  bizParamType?: string;
  tagIds?: string[];
}
