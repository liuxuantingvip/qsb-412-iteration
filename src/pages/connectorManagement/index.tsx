import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  Message,
  Modal,
  Radio,
  Select,
  Space,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import {
  IconDown,
  IconDownload,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconUpload,
} from '@arco-design/web-react/icon';
import { BusinessCustomParameterAnnotationMarker } from '@/components/businessCustomParameterAnnotations';
import {
  type BizParamConfigHeader,
  type BizParamConfigRow,
  ConnectorStatus,
  type ConnectorDataRecord,
  type ConnectorField,
  type ConnectorFieldSum,
  type ConnectorFilters,
  type ConnectorRecord,
  type ConnectorReport,
} from './interface';
import * as ServiceApi from './services';
import { saveConnectorParamSchema, type BusinessParamType } from '@/mocks/businessParams';
import TimeConfigFields, {
  buildTimeConfigString,
  createDefaultTimeConfig,
  getIncompleteTimeConfigLabels,
  parseTimeConfig,
  TIME_TYPE_LABEL,
  type TimeConfigMap,
  type TimeTypeValue,
} from './TimeConfigFields';
import styles from './index.module.less';

const { TabPane } = Tabs;
const DEFAULT_INDUSTRY_PRODUCT = '电商取数宝';

type BizParamConfigPresetColumn = {
  field: keyof Omit<BizParamConfigRow, 'id'>;
  label: string;
};

const bizParamConfigMap: Record<string, { label: string; columns: BizParamConfigPresetColumn[] }> = {
  GOOD: {
    label: '本店商品配置',
    columns: [{ field: 'goodsId', label: '商品 ID' }],
  },
  CATEGORY: {
    label: '行业类目配置',
    columns: [
      { field: 'categoryLevel1', label: '一级类目' },
      { field: 'categoryLevel2', label: '二级类目' },
      { field: 'categoryLevel3', label: '三级类目' },
    ],
  },
  COMPETE_STORE: {
    label: '竞品店铺配置',
    columns: [
      { field: 'competeStoreName', label: '竞店名称' },
      { field: 'categoryLevel1', label: '一级类目' },
    ],
  },
  COMPETE_GOOD: {
    label: '竞品商品配置',
    columns: [
      { field: 'categoryLevel1', label: '一级类目' },
      { field: 'goodsId', label: '商品 ID' },
      { field: 'belongStore', label: '所属店铺' },
    ],
  },
  COMPETE_BRAND: {
    label: '竞品品牌配置',
    columns: [
      { field: 'competeBrandName', label: '竞品名称' },
      { field: 'categoryLevel1', label: '一级类目' },
      { field: 'categoryLevel2', label: '二级类目' },
      { field: 'categoryLevel3', label: '三级类目' },
    ],
  },
};

function getBizParamConfig(type?: string) {
  return bizParamConfigMap[type || 'GOOD'] || bizParamConfigMap.GOOD;
}

function createBizParamHeaderId(prefix = 'biz-param-header') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultBizParamConfigHeaders(type?: string): BizParamConfigHeader[] {
  return getBizParamConfig(type).columns.map((column, index) => ({
    id: `biz-param-header-${type || 'GOOD'}-${index}`,
    label: column.label,
  }));
}

function normalizeBizParamConfigHeaders(type?: string, headers?: BizParamConfigHeader[]) {
  const sourceHeaders = headers?.length ? headers : createDefaultBizParamConfigHeaders(type);
  const normalizedHeaders = type === 'GOOD' ? sourceHeaders.slice(0, 1) : sourceHeaders;
  return normalizedHeaders.map((header, index) => ({
    id: header.id || createBizParamHeaderId(`biz-param-header-${type || 'GOOD'}-${index}`),
    label: header.label || '',
  }));
}

function createEmptyBizParamConfigHeader(label = ''): BizParamConfigHeader {
  return {
    id: createBizParamHeaderId(),
    label,
  };
}

function getCategoryLevelLabel(level: number) {
  const levelMap = ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级', '九级', '十级'];
  return `${levelMap[level - 1] || `第${level}`}类目`;
}

function getNextBizParamConfigHeaderLabel(type: string | undefined, currentLength: number) {
  if (type === 'CATEGORY') {
    return getCategoryLevelLabel(currentLength + 1);
  }
  if (type === 'COMPETE_STORE' || type === 'COMPETE_BRAND') {
    return getCategoryLevelLabel(currentLength);
  }
  if (type === 'COMPETE_GOOD') {
    return '请命名';
  }
  return '';
}

function getBizParamTypeOptionLabel(value?: string, withConfigSuffix = false) {
  if (withConfigSuffix) {
    return getBizParamConfig(value).label;
  }
  const label = ServiceApi.bizParamTypes.find((item) => item.value === value)?.label || '-';
  return label;
}

const statusMeta: Record<ConnectorStatus, { label: string; color: string }> = {
  [ConnectorStatus.Checking]: { label: '审核中', color: 'arcoblue' },
  [ConnectorStatus.Up]: { label: '已上架', color: 'green' },
  [ConnectorStatus.Down]: { label: '已下架', color: 'gray' },
  [ConnectorStatus.Rejected]: { label: '未通过', color: 'red' },
};

const defaultFormValue: Partial<ConnectorRecord> = {
  industryProduct: '电商取数宝',
  channel: '电商平台',
  platform: '淘宝天猫',
  bizUnitList: ['电商数据组'],
  bizSceneList: ['经营日报'],
  tagList: ['高频取数'],
  bizParamType: 'GOOD',
  bizParamConfigRows: [],
  bizParamConfigHeaders: createDefaultBizParamConfigHeaders('GOOD'),
  splitHeartbeatByBiz: false,
  needStore: 'Y',
  needRange: 'Y',
  dataTimeTypes: [1],
  timeConfig: JSON.stringify({ 日: { outTime: '08:30', startTime: '09:00' } }),
  elapsedTime: 60,
  processVersion: 'v4.0.9',
  processName: 'connector_process_v409.zip',
  defaultConfig: '[{"key":"dateRange","label":"采集日期","type":"dateRange","required":true}]',
  connectorDescribeUrl: '',
};

const DEFAULT_DRAWER_WIDTH = 760;
const MIN_DRAWER_WIDTH = DEFAULT_DRAWER_WIDTH;
const MAX_DRAWER_WIDTH = 1180;

function StatusTag({ status }: { status: ConnectorStatus }) {
  const meta = statusMeta[status];
  return <Tag className={styles.statusTag} color={meta.color}>{meta.label}</Tag>;
}

function getBizParamLabel(value?: string) {
  return getBizParamTypeOptionLabel(value);
}

function getPlatformOptions(channel?: string) {
  return ServiceApi.channels.find((item) => item.value === channel)?.platforms || [];
}

const fieldAttrOptions = ['bigint', 'datetime', 'varchar', 'int', 'decimal', 'text'];

const fieldMapping: Record<string, Pick<ConnectorField, 'fieldName' | 'fieldAttr' | 'fieldLength'>> = {
  店铺ID: { fieldName: 'shop_id', fieldAttr: 'varchar', fieldLength: 64 },
  业务日期: { fieldName: 'biz_date', fieldAttr: 'datetime', fieldLength: null },
  商品ID: { fieldName: 'goods_id', fieldAttr: 'varchar', fieldLength: 64 },
  'SKU ID': { fieldName: 'sku_id', fieldAttr: 'varchar', fieldLength: 64 },
  销售额: { fieldName: 'gmv', fieldAttr: 'decimal', fieldLength: '28,4' },
  订单ID: { fieldName: 'order_id', fieldAttr: 'varchar', fieldLength: 64 },
  订单金额: { fieldName: 'order_amount', fieldAttr: 'decimal', fieldLength: '28,4' },
  点击量: { fieldName: 'click_cnt', fieldAttr: 'bigint', fieldLength: 20 },
};

function createDefaultDataRecord(): ConnectorDataRecord {
  return {
    recordNotNullSwitch: 0,
    detectionSwitch: 0,
    detectionType: 0,
    fixedRange: {},
    floatRange: {},
    fieldNotNull: '',
    fieldSum: [],
  };
}

function getDefaultFieldLength(fieldAttr: string): ConnectorField['fieldLength'] {
  if (fieldAttr === 'bigint' || fieldAttr === 'int') return 20;
  if (fieldAttr === 'varchar') return 255;
  if (fieldAttr === 'decimal') return '28,4';
  return null;
}

function isNumberField(fieldAttr?: string) {
  return ['bigint', 'int', 'decimal'].includes(fieldAttr || '');
}

function needsFieldLength(fieldAttr?: string) {
  return ['bigint', 'varchar', 'int', 'decimal'].includes(fieldAttr || '');
}

function createField(partial: Partial<ConnectorField>): ConnectorField {
  const fieldAttr = partial.fieldAttr || 'varchar';
  return {
    id: partial.id || `field-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fieldName: partial.fieldName || '',
    fieldComment: partial.fieldComment || '',
    fieldAttr,
    fieldLength: partial.fieldLength ?? getDefaultFieldLength(fieldAttr),
    fieldType: partial.fieldType,
    fieldLock: partial.fieldLock ?? 0,
    validStatus: partial.validStatus ?? 2,
    isBizParam: partial.isBizParam,
    isCleaning: partial.isCleaning,
    isFieldNotNull: partial.isFieldNotNull,
    isFieldSum: partial.isFieldSum,
    detectionType: partial.detectionType ?? 0,
    fixedRange: partial.fixedRange || {},
    floatRange: partial.floatRange || {},
  };
}

function syncReportDerived(report: ConnectorReport): ConnectorReport {
  const defaultCleaningRule = report.fields
    .filter((field) => field.isCleaning && field.fieldName)
    .map((field) => field.fieldName)
    .join(',');
  const bizParam = report.fields
    .filter((field) => field.isBizParam && field.fieldName)
    .map((field) => field.fieldName)
    .join(',');
  const fieldNotNull = report.fields
    .filter((field) => field.isFieldNotNull && field.fieldName)
    .map((field) => field.fieldName)
    .join(',');
  const fieldSum: ConnectorFieldSum[] = report.fields
    .filter((field) => field.isFieldSum && field.fieldName)
    .map((field) => ({
      fieldName: field.fieldName,
      detectionType: field.detectionType ?? 0,
      fixedRange: field.fixedRange || {},
      floatRange: field.floatRange || {},
    }));

  return {
    ...report,
    defaultCleaningRule,
    bizParam,
    dataRecord: {
      ...createDefaultDataRecord(),
      ...(report.dataRecord || {}),
      fieldNotNull,
      fieldSum,
    },
  };
}

function isFieldReady(field: ConnectorField) {
  return Boolean(
    field.fieldComment
    && field.fieldName
    && field.fieldAttr
    && (!needsFieldLength(field.fieldAttr) || field.fieldLength),
  );
}

function getSelectedFieldLabels(report: ConnectorReport, key: 'isCleaning' | 'isBizParam' | 'isFieldNotNull') {
  return report.fields
    .filter((field) => field[key] && field.fieldComment && field.fieldName)
    .map((field) => field.fieldComment);
}

function formatFieldSumLabel(field: ConnectorField) {
  if (field.detectionType === 1) {
    const dayCount = field.floatRange?.dayCount;
    const minValue = field.floatRange?.minValue;
    const maxValue = field.floatRange?.maxValue;
    return dayCount && minValue && maxValue
      ? `${field.fieldComment}(近${dayCount}日平均值的${minValue}%~${maxValue}%)`
      : `${field.fieldComment}(未设置求和配置)`;
  }
  const minValue = field.fixedRange?.minValue;
  const maxValue = field.fixedRange?.maxValue;
  return minValue && maxValue
    ? `${field.fieldComment}(${minValue}~${maxValue})`
    : `${field.fieldComment}(未设置求和配置)`;
}

function normalizeReport(report: Partial<ConnectorReport>): ConnectorReport {
  const dataRecord = {
    ...createDefaultDataRecord(),
    ...(report.dataRecord || {}),
    fixedRange: report.dataRecord?.fixedRange || {},
    floatRange: report.dataRecord?.floatRange || {},
    fieldSum: report.dataRecord?.fieldSum || [],
  };
  const cleaningNames = (report.defaultCleaningRule || '').split(',').filter(Boolean);
  const bizParamNames = (report.bizParam || '').split(',').filter(Boolean);
  const fieldNotNullNames = (dataRecord.fieldNotNull || '').split(',').filter(Boolean);
  const fields = (report.fields || []).map((field) => {
    const sumConfig = dataRecord.fieldSum.find((item) => item.fieldName === field.fieldName);
    return createField({
      ...field,
      isCleaning: field.isCleaning ?? cleaningNames.includes(field.fieldName || ''),
      isBizParam: field.isBizParam ?? bizParamNames.includes(field.fieldName || ''),
      isFieldNotNull: field.isFieldNotNull ?? fieldNotNullNames.includes(field.fieldName || ''),
      isFieldSum: field.isFieldSum ?? Boolean(sumConfig),
      detectionType: field.detectionType ?? sumConfig?.detectionType ?? 0,
      fixedRange: field.fixedRange || sumConfig?.fixedRange || {},
      floatRange: field.floatRange || sumConfig?.floatRange || {},
    });
  });

  return syncReportDerived({
    id: report.id || `report-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tableNameCn: report.tableNameCn || '',
    tableNameEn: report.tableNameEn || '',
    defaultCleaningRule: report.defaultCleaningRule || '',
    bizParam: report.bizParam || '',
    dataRecord,
    fields,
  });
}

function buildDefaultReports(): ConnectorReport[] {
  return [
    normalizeReport({
      id: `report-${Date.now()}`,
      tableNameCn: '商品销售明细',
      tableNameEn: 'mall_goods_sale_detail',
      defaultCleaningRule: 'goods_id,sku_id,gmv',
      bizParam: 'shop_id,biz_date',
      dataRecord: {
        ...createDefaultDataRecord(),
        recordNotNullSwitch: 1,
        detectionSwitch: 1,
        detectionType: 0,
        fixedRange: { minValue: 1, maxValue: 1000000 },
        fieldNotNull: 'shop_id,biz_date',
        fieldSum: [{
          fieldName: 'gmv',
          detectionType: 0,
          fixedRange: { minValue: 1, maxValue: 1000000000 },
          floatRange: {},
        }],
      },
      fields: [
        createField({ id: `field-${Date.now()}-1`, fieldName: 'shop_id', fieldComment: '店铺ID', fieldAttr: 'varchar', fieldLength: 64, validStatus: 1, isBizParam: true, isFieldNotNull: true }),
        createField({ id: `field-${Date.now()}-2`, fieldName: 'biz_date', fieldComment: '业务日期', fieldAttr: 'datetime', fieldLength: null, validStatus: 1, isBizParam: true, isFieldNotNull: true }),
        createField({ id: `field-${Date.now()}-3`, fieldName: 'goods_id', fieldComment: '商品ID', fieldAttr: 'varchar', fieldLength: 64, validStatus: 1, isCleaning: true }),
        createField({ id: `field-${Date.now()}-4`, fieldName: 'sku_id', fieldComment: 'SKU ID', fieldAttr: 'varchar', fieldLength: 64, validStatus: 1, isCleaning: true }),
        createField({ id: `field-${Date.now()}-5`, fieldName: 'gmv', fieldComment: '销售额', fieldAttr: 'decimal', fieldLength: '28,4', validStatus: 1, isCleaning: true, isFieldSum: true, fixedRange: { minValue: 1, maxValue: 1000000000 } }),
      ],
    }),
  ];
}

function createEmptyField(): ConnectorField {
  return createField({
    fieldAttr: 'varchar',
    fieldLength: 255,
  });
}

function parseProcessVersion(fileName = '') {
  const version = fileName.match(/v?(\d+\.\d+\.\d+)/i)?.[1];
  return version ? `v${version}` : 'v4.1.0';
}

function formatNow() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function cloneRecord(record: ConnectorRecord): ConnectorRecord {
  return {
    ...record,
    bizUnitList: [...record.bizUnitList],
    bizSceneList: [...record.bizSceneList],
    tagList: [...record.tagList],
    dataTimeTypes: [...record.dataTimeTypes],
    reportRequestList: record.reportRequestList.map((report) => normalizeReport(report)),
    diagramUrlList: [...record.diagramUrlList],
  };
}

function pickTimeConfigByTypes(prev: TimeConfigMap, types: TimeTypeValue[]) {
  const next: TimeConfigMap = {};
  types.forEach((type) => {
    const typeNum = Number(type);
    if (typeNum === 0) return;
    const key = TIME_TYPE_LABEL[typeNum] ?? String(type);
    next[key] = prev[key] || createDefaultTimeConfig(typeNum);
  });
  return next;
}

export default function ConnectorManagement() {
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const tableContentRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<ConnectorFilters>({ industryProduct: DEFAULT_INDUSTRY_PRODUCT });
  const [records, setRecords] = useState<ConnectorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tableScrollY, setTableScrollY] = useState(420);
  const [selectedKeys, setSelectedKeys] = useState<Array<string | number>>([]);
  const [selectedRows, setSelectedRows] = useState<ConnectorRecord[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'detail' | 'review'>('detail');
  const [drawerWidth, setDrawerWidth] = useState(DEFAULT_DRAWER_WIDTH);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentRecord, setCurrentRecord] = useState<ConnectorRecord | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  const readonly = drawerMode === 'detail' || drawerMode === 'review';
  const activeChannel = Form.useWatch('channel', form);
  const activeModule = Form.useWatch('connectorModule', form);
  const activeNeedRange = Form.useWatch('needRange', form);
  const activePlatform = Form.useWatch('platform', form);
  const activeBizParamType = Form.useWatch('bizParamType', form);
  const currentBizParamType = activeBizParamType || form.getFieldValue('bizParamType') || defaultFormValue.bizParamType;
  const canAddBizParamConfigHeader = currentBizParamType !== 'GOOD';
  const filteredPlatforms = getPlatformOptions(activeChannel);
  const [timeConfig, setTimeConfig] = useState<TimeConfigMap>(parseTimeConfig(defaultFormValue.timeConfig));
  const [selectedTimeTypes, setSelectedTimeTypes] = useState<TimeTypeValue[]>(defaultFormValue.dataTimeTypes || []);
  const [timeTypesTouched, setTimeTypesTouched] = useState(false);
  const [diagramFileList, setDiagramFileList] = useState<UploadItem[]>([]);
  const [reportDrafts, setReportDrafts] = useState<ConnectorReport[]>(buildDefaultReports);
  const [sumConfigTarget, setSumConfigTarget] = useState<{ reportId: string; fieldId: string } | null>(null);
  const [sumConfigDraft, setSumConfigDraft] = useState<Pick<ConnectorField, 'detectionType' | 'fixedRange' | 'floatRange'>>({
    detectionType: 0,
    fixedRange: {},
    floatRange: {},
  });
  const [processFileList, setProcessFileList] = useState<UploadItem[]>([]);
  const [packageUploadTime, setPackageUploadTime] = useState('');
  const [bizParamConfigHeaders, setBizParamConfigHeaders] = useState<BizParamConfigHeader[]>(normalizeBizParamConfigHeaders(defaultFormValue.bizParamType, defaultFormValue.bizParamConfigHeaders));
  const [editingBizParamHeaderId, setEditingBizParamHeaderId] = useState<string | null>(null);
  const [splitHeartbeatByBiz, setSplitHeartbeatByBiz] = useState(Boolean(defaultFormValue.splitHeartbeatByBiz));
  const [bizParamConfigErrors, setBizParamConfigErrors] = useState<Record<string, string>>({});
  const effectiveTimeTypes = useMemo(() => {
    if (selectedTimeTypes.length) return selectedTimeTypes;
    if (!timeTypesTouched && drawerMode === 'create' && activeNeedRange === 'Y') return [1];
    return [];
  }, [activeNeedRange, drawerMode, selectedTimeTypes, timeTypesTouched]);

  const fetchList = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const data = await ServiceApi.getConnectorPageList(nextFilters);
      setRecords(data);
      setSelectedKeys([]);
      setSelectedRows([]);
    } catch {
      Message.error('数据源列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    form.setFieldValue('timeConfig', buildTimeConfigString(timeConfig, effectiveTimeTypes));
  }, [effectiveTimeTypes, form, timeConfig]);

  useEffect(() => {
    if (!drawerOpen || drawerMode !== 'create') return;
    form.setFieldValue('connectorName', `${activeChannel || ''}${activePlatform || ''}-${activeModule || ''}`);
  }, [activeChannel, activeModule, activePlatform, drawerMode, drawerOpen, form]);

  useEffect(() => {
    if (!drawerOpen || activeNeedRange !== 'Y' || selectedTimeTypes.length) return;
    const formTypes = (form.getFieldValue('dataTimeTypes') || []) as TimeTypeValue[];
    const nextTypes = formTypes.length ? formTypes : drawerMode === 'create' ? [1] : [];
    if (!nextTypes.length) return;

    setSelectedTimeTypes(nextTypes);
    form.setFieldValue('dataTimeTypes', nextTypes);
    setTimeConfig((prev) => pickTimeConfigByTypes(prev, nextTypes));
  }, [activeNeedRange, drawerMode, drawerOpen, form]);

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

    const updateTableSize = () => {
      const toolbar = root.getElementsByClassName(styles.toolbar)[0] || null;
      const tableHeader = root.querySelector('.arco-table-header');
      const pagination = root.querySelector('.arco-pagination');
      const nextHeight =
        root.clientHeight -
        heightWithMargins(toolbar, 56) -
        heightWithMargins(tableHeader, 55) -
        heightWithMargins(pagination, 48) -
        2;

      setTableScrollY(Math.max(180, Math.floor(nextHeight)));
    };

    updateTableSize();

    const resizeObserver = new ResizeObserver(updateTableSize);
    resizeObserver.observe(root);
    window.addEventListener('resize', updateTableSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateTableSize);
    };
  }, [page, pageSize, records.length, selectedKeys.length]);

  const applyFilters = (patch: ConnectorFilters) => {
    const nextFilters = { ...filters, ...patch };
    setFilters(nextFilters);
    setPage(1);
    fetchList(nextFilters);
  };

  const resetFilters = () => {
    const nextFilters = { industryProduct: DEFAULT_INDUSTRY_PRODUCT };
    setFilters(nextFilters);
    setPage(1);
    fetchList(nextFilters);
  };

  const openDrawer = (mode: typeof drawerMode, record?: ConnectorRecord) => {
    const nextRecord = record ? cloneRecord(record) : null;
    const nextProcessFileList = nextRecord?.processName ? [{
      uid: `${nextRecord?.id || 'new'}-process`,
      name: nextRecord.processName,
      status: 'done' as const,
    }] : [];
    const nextDiagramFileList = (nextRecord?.diagramUrlList || []).map((url, index) => ({
      uid: `${nextRecord?.id || 'new'}-diagram-${index}`,
      name: url.split('/').pop() || `采集路径截图${index + 1}.png`,
      url,
      status: 'done' as const,
    }));
    setDrawerMode(mode);
    setCurrentRecord(nextRecord);
    setCurrentStep(0);
    form.resetFields();
    form.setFieldsValue({
      ...(nextRecord || defaultFormValue),
      diagramUrlList: nextDiagramFileList.map((file) => file.url || file.name || file.uid),
      fileList: nextProcessFileList.map((file) => file.name || file.uid),
    });
    setSelectedTimeTypes(nextRecord?.dataTimeTypes || defaultFormValue.dataTimeTypes || []);
    setTimeTypesTouched(false);
    setTimeConfig(parseTimeConfig(nextRecord?.timeConfig || defaultFormValue.timeConfig));
    setReportDrafts(nextRecord?.reportRequestList?.length ? nextRecord.reportRequestList.map((report) => normalizeReport(report)) : buildDefaultReports());
    setBizParamConfigHeaders(normalizeBizParamConfigHeaders(nextRecord?.bizParamType || defaultFormValue.bizParamType, nextRecord?.bizParamConfigHeaders || defaultFormValue.bizParamConfigHeaders));
    setEditingBizParamHeaderId(null);
    setSplitHeartbeatByBiz(nextRecord?.splitHeartbeatByBiz ?? Boolean(defaultFormValue.splitHeartbeatByBiz));
    setBizParamConfigErrors({});
    setProcessFileList(nextProcessFileList);
    setPackageUploadTime(nextRecord ? nextRecord.modifyTime : '');
    setDiagramFileList(nextDiagramFileList);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setCurrentRecord(null);
    setCurrentStep(0);
    setDiagramFileList([]);
    setProcessFileList([]);
    setPackageUploadTime('');
    setReportDrafts(buildDefaultReports());
    setBizParamConfigHeaders(normalizeBizParamConfigHeaders(defaultFormValue.bizParamType, defaultFormValue.bizParamConfigHeaders));
    setEditingBizParamHeaderId(null);
    setSplitHeartbeatByBiz(Boolean(defaultFormValue.splitHeartbeatByBiz));
    setBizParamConfigErrors({});
    setSumConfigTarget(null);
    setSelectedTimeTypes(defaultFormValue.dataTimeTypes || []);
    setTimeTypesTouched(false);
    setTimeConfig(parseTimeConfig(defaultFormValue.timeConfig));
  };

  useEffect(() => {
    const openConnectorBasic = () => {
      openDrawer('create');
      setCurrentStep(0);
    };
    const openConnectorFlow = () => {
      openDrawer('create');
      window.setTimeout(() => setCurrentStep(2), 0);
    };

    window.addEventListener('business-custom:open-connector-basic', openConnectorBasic);
    window.addEventListener('business-custom:open-connector-flow', openConnectorFlow);
    return () => {
      window.removeEventListener('business-custom:open-connector-basic', openConnectorBasic);
      window.removeEventListener('business-custom:open-connector-flow', openConnectorFlow);
    };
  }, []);

  const handleDrawerResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = drawerWidth;
    const maxWidth = Math.max(MIN_DRAWER_WIDTH, Math.min(MAX_DRAWER_WIDTH, window.innerWidth - 180));
    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = startWidth + startX - moveEvent.clientX;
      setDrawerWidth(Math.min(Math.max(nextWidth, MIN_DRAWER_WIDTH), maxWidth));
    };

    const handleMouseUp = () => {
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const updateStatus = async (record: ConnectorRecord, status: ConnectorStatus, refuseReason?: string) => {
    await ServiceApi.changeConnectorStatus(record.id, status, refuseReason);
    Message.success('状态已更新');
    fetchList();
  };

  const handleMoreAction = (key: string, record: ConnectorRecord) => {
    if (key === 'detail') {
      openDrawer('detail', record);
      return;
    }
    if (key === 'edit') {
      openDrawer('edit', record);
      return;
    }
    if (key === 'delete') {
      deleteRecord(record);
    }
  };

  const confirmStatusChange = (record: ConnectorRecord, status: ConnectorStatus) => {
    Modal.confirm({
      title: status === ConnectorStatus.Up ? '是否确认上架数据源' : '是否确认下架数据源',
      content: `数据源名称：${record.connectorName}`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => updateStatus(record, status),
    });
  };

  const submitDrawer = async () => {
    if (drawerMode === 'review' && currentRecord) {
      await updateStatus(currentRecord, ConnectorStatus.Up);
      closeDrawer();
      return;
    }

    const values = await form.validate();
    if (!validateBizParamConfigHeaders()) return;
    const dataTimeTypes = effectiveTimeTypes;
    const base = currentRecord || {
      id: '',
      connectorCode: `QSB-MOCK-${Date.now()}`,
      modifyByName: '森森',
      modifyTime: '2026-07-13 16:00:00',
      publishStatus: ConnectorStatus.Down,
      reportRequestList: buildDefaultReports(),
      diagramUrlList: [],
    } as ConnectorRecord;
    const nextRecord: ConnectorRecord = {
      ...base,
      ...values,
      tagList: values.tagList || [],
      bizUnitList: values.bizUnitList || [],
      bizSceneList: values.bizSceneList || [],
      bizParamConfigRows: [],
      bizParamConfigHeaders,
      splitHeartbeatByBiz,
      dataTimeTypes,
      timeConfig: buildTimeConfigString(timeConfig, dataTimeTypes),
      diagramUrlList: diagramFileList.map((file) => file.url || file.name || file.uid),
      reportRequestList: reportDrafts,
      processName: values.processName || processFileList[0]?.name || base.processName,
      processVersion: values.processVersion || parseProcessVersion(processFileList[0]?.name || base.processName),
      connectorName: values.connectorName,
      connectorModule: values.connectorModule,
      connectorPath: values.connectorPath,
    };
    await ServiceApi.saveConnector(nextRecord);
    saveConnectorParamSchema({
      connectorId: nextRecord.id || nextRecord.connectorCode,
      connectorName: nextRecord.connectorName,
      bizParamType: nextRecord.bizParamType as BusinessParamType,
      headers: bizParamConfigHeaders.map((header) => header.label.trim()).filter(Boolean),
      splitHeartbeatByBiz,
    });
    Message.success(drawerMode === 'edit' ? '修改成功' : '新增成功');
    closeDrawer();
    fetchList();
  };

  const deleteRecord = (record: ConnectorRecord) => {
    Modal.confirm({
      title: '是否确认删除数据源',
      content: `数据源名称：${record.connectorName}`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        await ServiceApi.deleteConnector(record.id);
        Message.success('删除成功');
        fetchList();
      },
    });
  };

  const submitBatchUpdate = async () => {
    const values = await batchForm.validate();
    await ServiceApi.batchUpdateProcess(selectedKeys as string[], values.processVersion);
    Message.success('流程包已更新');
    setBatchOpen(false);
    batchForm.resetFields();
    fetchList();
  };

  const updateReport = (id: string, patch: Partial<ConnectorReport>) => {
    setReportDrafts((prev) => prev.map((report) => (
      report.id === id ? syncReportDerived({ ...report, ...patch }) : report
    )));
  };

  const updateReportField = (reportId: string, fieldId: string, patch: Partial<ConnectorField>) => {
    setReportDrafts((prev) => prev.map((report) => (
      report.id === reportId
        ? syncReportDerived({
          ...report,
          fields: report.fields.map((field) => {
            if (field.id !== fieldId) return field;
            const nextField = { ...field, ...patch };
            if (patch.fieldAttr) {
              nextField.fieldLength = getDefaultFieldLength(patch.fieldAttr);
              if (patch.fieldAttr === 'text') nextField.isCleaning = false;
              if (!isNumberField(patch.fieldAttr)) nextField.isFieldSum = false;
            }
            if (patch.isFieldSum === true) {
              nextField.detectionType = nextField.detectionType ?? 0;
              nextField.fixedRange = nextField.fixedRange || {};
              nextField.floatRange = nextField.floatRange || {};
            }
            if (patch.isFieldSum === false) {
              nextField.fixedRange = {};
              nextField.floatRange = {};
            }
            return nextField;
          }),
        })
        : report
    )));
  };

  const updateReportDataRecord = (reportId: string, patch: Partial<ConnectorDataRecord>) => {
    setReportDrafts((prev) => prev.map((report) => (
      report.id === reportId
        ? {
          ...report,
          dataRecord: {
            ...createDefaultDataRecord(),
            ...report.dataRecord,
            ...patch,
          },
        }
        : report
    )));
  };

  const mapReportField = (reportId: string, field: ConnectorField) => {
    const mapped = fieldMapping[field.fieldComment];
    if (!mapped) {
      updateReportField(reportId, field.id, { validStatus: 0 });
      Message.warning('字段字典中未找到映射关系');
      return;
    }
    updateReportField(reportId, field.id, { ...mapped, validStatus: 1 });
  };

  const openSumConfig = (reportId: string, field: ConnectorField) => {
    setSumConfigTarget({ reportId, fieldId: field.id });
    setSumConfigDraft({
      detectionType: field.detectionType ?? 0,
      fixedRange: field.fixedRange || {},
      floatRange: field.floatRange || {},
    });
  };

  const submitSumConfig = () => {
    if (!sumConfigTarget) return;
    updateReportField(sumConfigTarget.reportId, sumConfigTarget.fieldId, {
      detectionType: sumConfigDraft.detectionType ?? 0,
      fixedRange: sumConfigDraft.fixedRange || {},
      floatRange: sumConfigDraft.floatRange || {},
    });
    setSumConfigTarget(null);
  };

  const addReport = () => {
    setReportDrafts((prev) => [
      ...prev,
      {
        id: `report-${Date.now()}`,
        tableNameCn: '',
        tableNameEn: '',
        defaultCleaningRule: '',
        bizParam: '',
        dataRecord: createDefaultDataRecord(),
        fields: [createEmptyField()],
      },
    ]);
  };

  const removeReport = (id: string) => {
    setReportDrafts((prev) => prev.filter((report) => report.id !== id));
  };

  const addReportField = (reportId: string) => {
    setReportDrafts((prev) => prev.map((report) => (
      report.id === reportId
        ? { ...report, fields: [...report.fields, createEmptyField()] }
        : report
    )));
  };

  const removeReportField = (reportId: string, fieldId: string) => {
    setReportDrafts((prev) => prev.map((report) => (
      report.id === reportId
        ? { ...report, fields: report.fields.filter((field) => field.id !== fieldId) }
        : report
    )));
  };

  const updateProcessFileList = (fileList: UploadItem[]) => {
    const nextList = fileList.slice(-1).map((file) => ({ ...file, status: 'done' as const }));
    setProcessFileList(nextList);
    form.setFieldValue('fileList', nextList.map((file) => file.name || file.uid));

    const fileName = nextList[0]?.name;
    if (!fileName) return;
    form.setFieldsValue({
      processName: fileName,
      processVersion: parseProcessVersion(fileName),
    });
    setPackageUploadTime(formatNow());
    Message.success('流程包解析成功，已回填版本号');
  };

  const handleBizParamTypeChange = (value: string) => {
    form.setFieldValue('bizParamType', value);
    setBizParamConfigHeaders(normalizeBizParamConfigHeaders(value));
    setEditingBizParamHeaderId(null);
    setBizParamConfigErrors({});
  };

  const updateBizParamConfigHeader = (headerId: string, value: string) => {
    setBizParamConfigHeaders((prev) => prev.map((header) => (
      header.id === headerId ? { ...header, label: value } : header
    )));
    if (value.trim()) {
      setBizParamConfigErrors((prev) => {
        const next = { ...prev };
        delete next[headerId];
        return next;
      });
    }
  };

  const addBizParamConfigHeader = () => {
    if (!canAddBizParamConfigHeader) return;
    const nextHeader = createEmptyBizParamConfigHeader(
      getNextBizParamConfigHeaderLabel(currentBizParamType, bizParamConfigHeaders.length),
    );
    setBizParamConfigHeaders((prev) => [...prev, nextHeader]);
    setEditingBizParamHeaderId(nextHeader.id);
  };

  const validateBizParamConfigHeaders = () => {
    const nextErrors: Record<string, string> = {};

    bizParamConfigHeaders.forEach((header) => {
      if (!header.label.trim()) {
        nextErrors[header.id] = '请输入表头名称';
      }
    });

    if (!bizParamConfigHeaders.length) {
      const nextHeader = createEmptyBizParamConfigHeader();
      setBizParamConfigHeaders([nextHeader]);
      setEditingBizParamHeaderId(nextHeader.id);
      nextErrors[nextHeader.id] = '请输入表头名称';
    }

    setBizParamConfigErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return false;
    }
    return true;
  };

  const validateReportDrafts = () => {
    const minCleaningFields = form.getFieldValue('industryProduct') === '跨境电商' ? 3 : 2;
    const invalidReport = reportDrafts.find((report) => {
      const cleaningCount = report.fields.filter((field) => field.isCleaning && field.fieldName).length;
      const hasInvalidField = report.fields.some((field) => (
        !field.fieldName
        || !field.fieldComment
        || !field.fieldAttr
        || (needsFieldLength(field.fieldAttr) && !field.fieldLength)
      ));
      const hasInvalidSum = report.fields.some((field) => {
        if (!field.isFieldSum) return false;
        if (field.detectionType === 1) {
          return !field.floatRange?.dayCount || !field.floatRange?.minValue || !field.floatRange?.maxValue;
        }
        return !field.fixedRange?.minValue || !field.fixedRange?.maxValue;
      });
      return !report.tableNameCn
        || !report.tableNameEn
        || cleaningCount < minCleaningFields
        || hasInvalidField
        || hasInvalidSum;
    });
    if (invalidReport) {
      Message.warning(`请完善入库配置，清洗字段至少 ${minCleaningFields} 项，并补齐字段与求和配置`);
      return false;
    }
    return true;
  };

  const handleNextStep = async () => {
    if (currentStep === 0) {
      if (activeNeedRange === 'Y' && !effectiveTimeTypes.length) {
        Message.warning('至少选择一个采集时间类型');
        return;
      }
      const incompleteLabels = getIncompleteTimeConfigLabels(timeConfig, effectiveTimeTypes);
      if (activeNeedRange === 'Y' && incompleteLabels.length) {
        Message.warning(`请完善${incompleteLabels.join('、')}的运行时间设置`);
        return;
      }
    }

    if (currentStep === 1 && !validateReportDrafts()) return;

    setCurrentStep((value) => value + 1);
  };

  const columns: ColumnProps<ConnectorRecord>[] = [
    {
      title: '数据源名称',
      dataIndex: 'connectorName',
      width: 300,
      fixed: 'left',
      ellipsis: true,
      render: (value, record) => (
        <span className={styles.connectorName} title={value} onClick={() => openDrawer('detail', record)}>
          {value}
        </span>
      ),
    },
    { title: '平台类型', dataIndex: 'channel', width: 130 },
    { title: '平台名称', dataIndex: 'platform', width: 130 },
    { title: '最近编辑', dataIndex: 'modifyByName', width: 110 },
    { title: '编辑时间', dataIndex: 'modifyTime', width: 180 },
    { title: '版本号', dataIndex: 'processVersion', width: 110 },
    { title: '运行时长(秒)', dataIndex: 'elapsedTime', width: 130 },
    {
      title: '状态',
      dataIndex: 'publishStatus',
      width: 132,
      render: (value: ConnectorStatus, record) => (
        <span className={styles.statusLine}>
          <StatusTag status={value} />
          {value === ConnectorStatus.Rejected ? (
            <Button size="mini" type="text" onClick={() => Message.info(record.refuseReason || '暂无原因')}>原因</Button>
          ) : null}
        </span>
      ),
    },
    {
      title: '业务参数类型',
      dataIndex: 'bizParamType',
      width: 140,
      render: (value) => getBizParamLabel(value),
    },
    {
      title: '操作',
      width: 136,
      fixed: 'right',
      className: styles.actionColumn,
      render: (_, record) => (
        <Space size={8} className={styles.actionButtons}>
          <Button
            size="small"
            type="text"
            onClick={() => confirmStatusChange(record, record.publishStatus === ConnectorStatus.Up ? ConnectorStatus.Down : ConnectorStatus.Up)}
          >
            {record.publishStatus === ConnectorStatus.Up ? '下架' : '上架'}
          </Button>
          <Dropdown
            trigger="click"
            droplist={
              <Menu onClickMenuItem={(key) => handleMoreAction(key, record)}>
                <Menu.Item key="detail">详情</Menu.Item>
                <Menu.Item key="edit">编辑</Menu.Item>
                <Menu.Item key="delete" disabled={record.publishStatus === ConnectorStatus.Up}>删除</Menu.Item>
              </Menu>
            }
          >
            <Button type="text" size="small">
              更多 <IconDown />
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  const tableColumnsWidth = columns.reduce((total, column) => total + (Number(column.width) || 0), 48);
  const tableScrollX = tableColumnsWidth;

  return (
    <div className={styles.page}>
      <Card bordered={false} className={styles.tableCard}>
        <div ref={tableContentRef} className={styles.tableContent}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarTop}>
              <Tabs
                activeTab={filters.industryProduct || DEFAULT_INDUSTRY_PRODUCT}
                className={styles.industryTabs}
                headerPadding={false}
                type="rounded"
                onChange={(key) => applyFilters({
                  industryProduct: key,
                  channel: undefined,
                  platform: undefined,
                })}
              >
                {ServiceApi.industryProducts.map((item) => (
                  <TabPane
                    key={item}
                    title={item === DEFAULT_INDUSTRY_PRODUCT ? (
                      <BusinessCustomParameterAnnotationMarker noteId="BCP-1.1">
                        {item}
                      </BusinessCustomParameterAnnotationMarker>
                    ) : item}
                  />
                ))}
              </Tabs>
              <div className={styles.toolbarActions}>
                <Button icon={<IconUpload />} disabled={!selectedKeys.length} onClick={() => setBatchOpen(true)}>更新流程包</Button>
                <Button type="primary" icon={<IconPlus />} onClick={() => openDrawer('create')}>添加</Button>
              </div>
            </div>
            <div className={styles.toolbarBottom}>
              <div className={styles.filters}>
                <Input.Search
                  allowClear
                  className={styles.keywordSearchInput}
                  placeholder="请输入数据源名称"
                  value={filters.connectorName || ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, connectorName: value }))}
                  onSearch={(value) => applyFilters({ connectorName: value })}
                />
              <Select
                allowClear
                className={styles.filterSelect}
                placeholder="平台类型"
                value={filters.channel}
                onChange={(value) => applyFilters({ channel: value, platform: undefined })}
              >
                {ServiceApi.channels.map((item) => <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>)}
              </Select>
              <Select
                allowClear
                className={styles.filterSelect}
                placeholder="平台名称"
                value={filters.platform}
                onChange={(value) => applyFilters({ platform: value })}
              >
                {getPlatformOptions(filters.channel).map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
              </Select>
              <Select
                allowClear
                className={styles.filterSelect}
                placeholder="状态"
                value={filters.publishStatus}
                onChange={(value) => applyFilters({ publishStatus: value })}
              >
                {Object.entries(statusMeta).map(([value, meta]) => (
                  <Select.Option key={value} value={Number(value)}>{meta.label}</Select.Option>
                ))}
              </Select>
              <Select
                allowClear
                className={styles.filterSelect}
                placeholder="参数类型"
                value={filters.bizParamType}
                onChange={(value) => applyFilters({ bizParamType: value })}
              >
                {ServiceApi.bizParamTypes.map((item) => <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>)}
              </Select>
              <Select
                allowClear
                className={styles.tagFilterSelect}
                mode="multiple"
                maxTagCount={1}
                placeholder="标签筛选"
                value={filters.tagIds}
                onChange={(value) => applyFilters({ tagIds: value })}
              >
                {ServiceApi.connectorTags.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
              </Select>
              <Button onClick={resetFilters}>重置</Button>
              <Button icon={<IconRefresh />} onClick={() => fetchList()}>刷新</Button>
              </div>
            </div>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            data={records}
            loading={loading}
            scroll={{ x: tableScrollX, y: tableScrollY }}
            rowSelection={{
              fixed: true,
              columnWidth: 48,
              selectedRowKeys: selectedKeys,
              onChange: (keys, rows) => {
                setSelectedKeys(keys);
                setSelectedRows(rows as ConnectorRecord[]);
              },
            }}
            pagination={{
              current: page,
              pageSize,
              total: records.length,
              sizeCanChange: true,
              showJumper: true,
              sizeOptions: [20, 50],
              showTotal: (total) => (
                <span className={styles.paginationTotal}>
                  <span>已选 {selectedKeys.length} 条</span>
                  <span className={styles.paginationCount}>共 {total} 条</span>
                </span>
              ),
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage);
                setPageSize(nextPageSize);
              },
            }}
          />
        </div>
      </Card>

      <Drawer
        width={drawerWidth}
        title={drawerMode === 'create' ? '添加数据源' : drawerMode === 'edit' ? '编辑数据源' : drawerMode === 'review' ? '审核数据源' : '数据源详情'}
        visible={drawerOpen}
        footer={null}
        onCancel={closeDrawer}
      >
        <div
          className={styles.drawerResizeHandle}
          style={{ right: drawerWidth - 4 }}
          onMouseDown={handleDrawerResizeStart}
          onDoubleClick={() => setDrawerWidth(DEFAULT_DRAWER_WIDTH)}
        />
        <div className={styles.drawerBody}>
          <Steps current={currentStep + 1} size="small" style={{ marginBottom: 22 }}>
            <Steps.Step title="基础信息" />
            <Steps.Step title="入库配置" />
            <Steps.Step title="流程配置" />
          </Steps>

          <Form form={form} layout="vertical" disabled={readonly}>
            {currentStep === 0 ? (
              <>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>数据源信息</span>
                  {currentRecord ? <Tag>{currentRecord.connectorCode}</Tag> : null}
                </div>
                <div className={styles.formGrid}>
                  <Form.Item label="数据源名称" field="connectorName" rules={[{ required: true, message: '请输入数据源名称' }]}>
                    <Input maxLength={50} placeholder="请输入数据源名称" />
                  </Form.Item>
                  <Form.Item label="采集模块" field="connectorModule" rules={[{ required: true, message: '请输入采集模块' }]}>
                    <Input maxLength={10} placeholder="请输入模块内容" />
                  </Form.Item>
                  <Form.Item label="采集路径" field="connectorPath" rules={[{ required: true, message: '请输入采集路径' }]}>
                    <Input maxLength={40} placeholder="请输入路径" />
                  </Form.Item>
                  <Form.Item
                    label="采集路径截图"
                    field="diagramUrlList"
                    className={styles.fullField}
                    rules={readonly ? [] : [{ required: true, message: '请上传采集路径截图' }]}
                  >
                    <Upload
                      accept="image/*"
                      autoUpload={false}
                      disabled={readonly}
                      fileList={diagramFileList}
                      imagePreview
                      limit={5}
                      listType="picture-card"
                      multiple
                      tip="图片大小 2M 以内，最多 5 张"
                      onChange={(fileList) => {
                        const nextList = fileList.map((file) => ({ ...file, status: 'done' as const }));
                        setDiagramFileList(nextList);
                        form.setFieldValue('diagramUrlList', nextList.map((file) => file.url || file.name || file.uid));
                      }}
                      beforeUpload={(file) => {
                        if (file.size > 2 * 1024 * 1024) {
                          Message.warning('图片大小需控制在 2M 以内');
                          return false;
                        }
                        return true;
                      }}
                    />
                  </Form.Item>
                  <Form.Item label="所需行业产品" field="industryProduct" rules={[{ required: true, message: '请选择行业产品' }]}>
                    <Select placeholder="请选择行业产品">
                      {ServiceApi.industryProducts.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
                    </Select>
                  </Form.Item>
                  <Form.Item label="平台类型" field="channel" rules={[{ required: true, message: '请选择平台类型' }]}>
                    <Select
                      placeholder="请选择平台类型"
                      onChange={() => form.setFieldValue('platform', undefined)}
                    >
                      {ServiceApi.channels.map((item) => <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>)}
                    </Select>
                  </Form.Item>
                  <Form.Item label="平台名称" field="platform" rules={[{ required: true, message: '请选择平台名称' }]}>
                    <Select placeholder="请选择平台名称">
                      {filteredPlatforms.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
                    </Select>
                  </Form.Item>
                  <Form.Item label="业务参数类型" field="bizParamType">
                    <Select placeholder="请选择业务参数类型" onChange={handleBizParamTypeChange}>
                      {ServiceApi.bizParamTypes.map((item) => <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>)}
                    </Select>
                  </Form.Item>
                  <Form.Item label="业务部门" field="bizUnitList" rules={[{ required: true, message: '请选择业务部门' }]}>
                    <Select mode="multiple" placeholder="请选择业务部门">
                      {['运营效率组', '电商数据组', '跨境业务组', '供应链组'].map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
                    </Select>
                  </Form.Item>
                  <Form.Item label="业务场景" field="bizSceneList" rules={[{ required: true, message: '请选择业务场景' }]}>
                    <Select mode="multiple" placeholder="请选择业务场景">
                      {['经营日报', '商品分析', '订单对账', '广告优化', '库存监控'].map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
                    </Select>
                  </Form.Item>
                  <Form.Item label="后台标签" field="tagList" className={styles.fullField}>
                    <Select mode="multiple" maxTagCount={4} placeholder="请选择后台标签">
                      {ServiceApi.connectorTags.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
                    </Select>
                  </Form.Item>
                  <Form.Item label="使用说明 URL" field="connectorDescribeUrl" className={styles.fullField}>
                    <Input maxLength={999} placeholder="请输入使用说明 URL" />
                  </Form.Item>
                  <Form.Item label="所需店铺" field="needStore">
                    <Radio.Group>
                      <Radio value="Y">是</Radio>
                      <Radio value="N">否</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="需要时间" field="needRange">
                    <Radio.Group
                      onChange={(value) => {
                        if (value === 'N') {
                          form.setFieldValue('dataTimeTypes', []);
                          setSelectedTimeTypes([]);
                          setTimeTypesTouched(true);
                          setTimeConfig({});
                          return;
                        }
                        const nextTypes = selectedTimeTypes.length ? selectedTimeTypes : [1];
                        form.setFieldValue('dataTimeTypes', nextTypes);
                        setSelectedTimeTypes(nextTypes);
                        setTimeTypesTouched(false);
                        setTimeConfig((prev) => pickTimeConfigByTypes(prev, nextTypes));
                      }}
                    >
                      <Radio value="Y">是</Radio>
                      <Radio value="N">否</Radio>
                    </Radio.Group>
                  </Form.Item>
                  {activeNeedRange === 'Y' ? (
                    <>
                      <Form.Item
                        label={(
                          <BusinessCustomParameterAnnotationMarker noteId="BCP-1.3">
                            采集时间类型
                          </BusinessCustomParameterAnnotationMarker>
                        )}
                        className={styles.fullField}
                        required
                      >
                        <div className={styles.timeTypeConfigBlock}>
                          <TimeConfigFields
                            disabled={readonly}
                            value={effectiveTimeTypes}
                            timeConfig={timeConfig}
                            onChange={(nextValues) => {
                              form.setFieldValue('dataTimeTypes', nextValues);
                              setSelectedTimeTypes(nextValues);
                              setTimeTypesTouched(true);
                              setTimeConfig((prev) => pickTimeConfigByTypes(prev, nextValues));
                            }}
                            onTimeConfigChange={setTimeConfig}
                          />
                        </div>
                      </Form.Item>
                      <Form.Item field="timeConfig" className={styles.hiddenField}>
                        <Input />
                      </Form.Item>
                    </>
                  ) : null}
                  <Form.Item label="预计运行时长(秒)" field="elapsedTime" rules={[{ required: true, message: '请输入运行时长' }]}>
                    <InputNumber min={0} max={9999} style={{ width: '100%' }} />
                  </Form.Item>
                </div>
              </>
            ) : null}

            {currentStep === 1 ? (
              <div className={styles.reportList}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>入库配置</span>
                  <Button size="small" icon={<IconPlus />} disabled={readonly} onClick={addReport}>新增入库配置</Button>
                </div>
                {reportDrafts.map((report, reportIndex) => {
                  const cleaningLabels = getSelectedFieldLabels(report, 'isCleaning');
                  const bizParamLabels = getSelectedFieldLabels(report, 'isBizParam');
                  const fieldNotNullLabels = getSelectedFieldLabels(report, 'isFieldNotNull');
                  const fieldSumFields = report.fields.filter((field) => field.isFieldSum && field.fieldComment && field.fieldName);
                  const renderChipBox = (labels: string[]) => (
                    <div className={styles.chipBox}>
                      {labels.map((label) => <Tag key={label}>{label}</Tag>)}
                      {!labels.length ? <span className={styles.emptyText}>未选择</span> : null}
                    </div>
                  );

                  return (
                  <div className={styles.reportCard} key={report.id}>
                    <div className={styles.reportHeader}>
                      <div>
                        <div className={styles.reportName}>{`入库配置${reportIndex + 1}`}</div>
                        <div className={styles.reportSub}>{report.tableNameCn || '未命名报表'}</div>
                      </div>
                      <Button
                        size="small"
                        status="danger"
                        type="text"
                        disabled={readonly || reportDrafts.length <= 1}
                        onClick={() => removeReport(report.id)}
                      >
                        删除配置
                      </Button>
                    </div>
                    <div className={styles.reportMeta}>
                      <div className={styles.reportEditGrid}>
                        <label>
                          <span>报表名称</span>
                          <Input
                            disabled={readonly}
                            placeholder="请输入报表名称"
                            value={report.tableNameCn}
                            onChange={(value) => updateReport(report.id, { tableNameCn: value })}
                          />
                        </label>
                        <label>
                          <span>入库表名</span>
                          <Input
                            disabled={readonly}
                            placeholder="请输入入库表名"
                            value={report.tableNameEn}
                            onChange={(value) => updateReport(report.id, { tableNameEn: value })}
                          />
                        </label>
                        <label>
                          <span>清洗字段</span>
                          {renderChipBox(cleaningLabels)}
                        </label>
                        <label>
                          <span>业务参数</span>
                          {renderChipBox(bizParamLabels)}
                        </label>
                      </div>
                    </div>

                    <div className={styles.validationPanel}>
                      <div className={styles.validationHeader}>默认校验（店铺/业务参数）配置</div>
                      <div className={styles.validationInline}>
                        <span>记录非空</span>
                        <Switch
                          size="small"
                          checked={Boolean(report.dataRecord.recordNotNullSwitch)}
                          disabled={readonly}
                          onChange={(checked) => updateReportDataRecord(report.id, { recordNotNullSwitch: checked ? 1 : 0 })}
                        />
                        <span>检测记录值</span>
                        <Switch
                          size="small"
                          checked={Boolean(report.dataRecord.detectionSwitch)}
                          disabled={readonly}
                          onChange={(checked) => updateReportDataRecord(report.id, { detectionSwitch: checked ? 1 : 0 })}
                        />
                        {Boolean(report.dataRecord.detectionSwitch) ? (
                          <Radio.Group
                            type="button"
                            size="small"
                            value={report.dataRecord.detectionType}
                            disabled={readonly}
                            onChange={(value) => updateReportDataRecord(report.id, { detectionType: value })}
                          >
                            <Radio value={0}>固定范围</Radio>
                            <Radio value={1}>波动范围</Radio>
                          </Radio.Group>
                        ) : null}
                      </div>
                      {Boolean(report.dataRecord.detectionSwitch) ? (
                        report.dataRecord.detectionType === 0 ? (
                          <div className={styles.rangeRow}>
                            <span>记录值范围</span>
                            <InputNumber
                              size="small"
                              min={1}
                              max={1000000}
                              placeholder="下限"
                              disabled={readonly}
                              value={report.dataRecord.fixedRange?.minValue}
                              onChange={(value) => updateReportDataRecord(report.id, {
                                fixedRange: { ...report.dataRecord.fixedRange, minValue: Number(value || 0) || undefined },
                              })}
                            />
                            <span>~</span>
                            <InputNumber
                              size="small"
                              min={1}
                              max={1000000}
                              placeholder="上限"
                              disabled={readonly}
                              value={report.dataRecord.fixedRange?.maxValue}
                              onChange={(value) => updateReportDataRecord(report.id, {
                                fixedRange: { ...report.dataRecord.fixedRange, maxValue: Number(value || 0) || undefined },
                              })}
                            />
                          </div>
                        ) : (
                          <div className={styles.rangeRow}>
                            <span>近</span>
                            <InputNumber
                              size="small"
                              min={1}
                              max={7}
                              placeholder="天数"
                              disabled={readonly}
                              value={report.dataRecord.floatRange?.dayCount}
                              onChange={(value) => updateReportDataRecord(report.id, {
                                floatRange: { ...report.dataRecord.floatRange, dayCount: Number(value || 0) || undefined },
                              })}
                            />
                            <span>日平均值的</span>
                            <InputNumber
                              size="small"
                              min={1}
                              max={999}
                              placeholder="下限"
                              disabled={readonly}
                              value={report.dataRecord.floatRange?.minValue}
                              onChange={(value) => updateReportDataRecord(report.id, {
                                floatRange: { ...report.dataRecord.floatRange, minValue: Number(value || 0) || undefined },
                              })}
                            />
                            <span>% ~</span>
                            <InputNumber
                              size="small"
                              min={0}
                              max={999}
                              placeholder="上限"
                              disabled={readonly}
                              value={report.dataRecord.floatRange?.maxValue}
                              onChange={(value) => updateReportDataRecord(report.id, {
                                floatRange: { ...report.dataRecord.floatRange, maxValue: Number(value || 0) || undefined },
                              })}
                            />
                            <span>%</span>
                          </div>
                        )
                      ) : null}
                      <div className={styles.validationGrid}>
                        <label>
                          <span>字段非空</span>
                          {renderChipBox(fieldNotNullLabels)}
                        </label>
                        <label>
                          <span>字段求和</span>
                          <div className={styles.chipBox}>
                            {fieldSumFields.map((field) => <Tag key={field.id}>{formatFieldSumLabel(field)}</Tag>)}
                            {!fieldSumFields.length ? <span className={styles.emptyText}>未选择</span> : null}
                          </div>
                        </label>
                      </div>
                    </div>

                    <Table
                      border={false}
                      pagination={false}
                      rowKey="id"
                      data={report.fields}
                      columns={[
                        {
                          title: '报表字段中文名',
                          dataIndex: 'fieldComment',
                          width: 160,
                          render: (value, field) => (
                            <Input
                              disabled={readonly || field.fieldLock === 1}
                              value={value}
                              placeholder="请输入中文名"
                              onChange={(nextValue) => updateReportField(report.id, field.id, { fieldComment: nextValue, validStatus: 2 })}
                            />
                          ),
                        },
                        {
                          title: '字段映射',
                          width: 90,
                          align: 'center',
                          render: (_, field) => (
                            <Button
                              type="text"
                              size="mini"
                              disabled={readonly || field.fieldLock === 1 || !field.fieldComment}
                              onClick={() => mapReportField(report.id, field)}
                            >
                              映射
                            </Button>
                          ),
                        },
                        {
                          title: '入库字段英文名',
                          dataIndex: 'fieldName',
                          width: 160,
                          render: (value, field) => (
                            <Input
                              disabled={readonly || field.fieldLock === 1}
                              value={value}
                              placeholder="请输入英文名"
                              onChange={(nextValue) => updateReportField(report.id, field.id, { fieldName: nextValue })}
                            />
                          ),
                        },
                        {
                          title: '字段类型',
                          dataIndex: 'fieldAttr',
                          width: 130,
                          render: (value, field) => (
                            <Select
                              disabled={readonly || field.fieldLock === 1}
                              value={value}
                              onChange={(nextValue) => updateReportField(report.id, field.id, { fieldAttr: nextValue })}
                            >
                              {fieldAttrOptions.map((type) => <Select.Option key={type} value={type}>{type}</Select.Option>)}
                            </Select>
                          ),
                        },
                        {
                          title: '字段长度',
                          dataIndex: 'fieldLength',
                          width: 130,
                          render: (value, field) => {
                            if (!needsFieldLength(field.fieldAttr)) return <span className={styles.disabledText}>-</span>;
                            if (field.fieldAttr === 'decimal') {
                              return (
                                <Input
                                  disabled={readonly || field.fieldLock === 1}
                                  value={String(value || '')}
                                  placeholder="28,4"
                                  onChange={(nextValue) => updateReportField(report.id, field.id, { fieldLength: nextValue })}
                                />
                              );
                            }
                            return (
                              <InputNumber
                                disabled={readonly || field.fieldLock === 1}
                                value={typeof value === 'number' ? value : Number(value || 0)}
                                min={1}
                                style={{ width: '100%' }}
                                onChange={(nextValue) => updateReportField(report.id, field.id, { fieldLength: Number(nextValue || 0) })}
                              />
                            );
                          },
                        },
                        {
                          title: '校验结果',
                          dataIndex: 'validStatus',
                          width: 96,
                          align: 'center',
                          render: (value) => {
                            if (value === 1) return <Tag color="green">成功</Tag>;
                            if (value === 0) return <Tag color="red">失败</Tag>;
                            return <Tag color="gray">未校验</Tag>;
                          },
                        },
                        {
                          title: '清洗字段',
                          dataIndex: 'isCleaning',
                          width: 90,
                          align: 'center',
                          render: (_, field) => (
                            <Checkbox
                              disabled={readonly || field.fieldLock === 1 || !isFieldReady(field) || field.fieldAttr === 'text'}
                              checked={Boolean(field.isCleaning)}
                              onChange={(checked) => updateReportField(report.id, field.id, { isCleaning: checked })}
                            />
                          ),
                        },
                        {
                          title: '业务参数',
                          dataIndex: 'isBizParam',
                          width: 90,
                          align: 'center',
                          render: (_, field) => (
                            <Checkbox
                              disabled={readonly || field.fieldLock === 1 || !isFieldReady(field)}
                              checked={Boolean(field.isBizParam)}
                              onChange={(checked) => updateReportField(report.id, field.id, { isBizParam: checked })}
                            />
                          ),
                        },
                        {
                          title: '字段非空',
                          dataIndex: 'isFieldNotNull',
                          width: 90,
                          align: 'center',
                          render: (_, field) => (
                            <Checkbox
                              disabled={readonly || field.fieldLock === 1 || !isFieldReady(field)}
                              checked={Boolean(field.isFieldNotNull)}
                              onChange={(checked) => updateReportField(report.id, field.id, { isFieldNotNull: checked })}
                            />
                          ),
                        },
                        {
                          title: '字段求和',
                          dataIndex: 'isFieldSum',
                          width: 112,
                          align: 'center',
                          render: (_, field) => (
                            <Space size={4}>
                              <Checkbox
                                disabled={readonly || field.fieldLock === 1 || !isFieldReady(field) || !isNumberField(field.fieldAttr)}
                                checked={Boolean(field.isFieldSum)}
                                onChange={(checked) => {
                                  updateReportField(report.id, field.id, { isFieldSum: checked });
                                  if (checked) openSumConfig(report.id, { ...field, isFieldSum: true });
                                }}
                              />
                              {field.isFieldSum ? (
                                <Button type="text" size="mini" disabled={readonly} onClick={() => openSumConfig(report.id, field)}>配置</Button>
                              ) : null}
                            </Space>
                          ),
                        },
                        {
                          title: '操作',
                          width: 118,
                          fixed: 'right',
                          className: styles.actionColumn,
                          render: (_, field) => (
                            <Space size={4} className={styles.actionButtons}>
                              <Button
                                size="mini"
                                type="text"
                                disabled={readonly}
                                onClick={() => updateReportField(report.id, field.id, { fieldLock: field.fieldLock === 1 ? 0 : 1 })}
                              >
                                {field.fieldLock === 1 ? '解锁' : '锁定'}
                              </Button>
                              <Button
                                size="mini"
                                status="danger"
                                type="text"
                                disabled={readonly || field.fieldLock === 1 || report.fields.length <= 1}
                                onClick={() => removeReportField(report.id, field.id)}
                              >
                                删除
                              </Button>
                            </Space>
                          ),
                        },
                      ]}
                      scroll={{ x: 1320 }}
                    />
                    <div className={styles.reportFooter}>
                      <Space size={8}>
                        <Button size="small" icon={<IconPlus />} disabled={readonly} onClick={() => addReportField(report.id)}>添加字段</Button>
                        <Button size="small" disabled={readonly} onClick={() => Message.info('已模拟批量添加字段')}>批量添加</Button>
                        <Button size="small" onClick={() => Message.info('已模拟导出差异')}>导出差异</Button>
                      </Space>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : null}

            {currentStep === 2 ? (
              <>
                <Form.Item
                  label={(
                    <BusinessCustomParameterAnnotationMarker noteId="BCP-1.4">
                      业务参数类型
                    </BusinessCustomParameterAnnotationMarker>
                  )}
                  field="bizParamType"
                >
                  <Select placeholder="请选择业务参数类型" onChange={handleBizParamTypeChange}>
                    {ServiceApi.bizParamTypes.map((item) => (
                      <Select.Option key={item.value} value={item.value}>
                        {getBizParamTypeOptionLabel(item.value, true)}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <div className={styles.bizParamConfigBlock}>
                  <div className={styles.bizParamConfigActions}>
                    <Space size={4}>
                      <Button
                        size="small"
                        type="text"
                        icon={<IconUpload />}
                        disabled={readonly}
                        onClick={() => Message.warning('模拟导入校验失败，当前配置未覆盖')}
                      >
                        导入
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        icon={<IconDownload />}
                        onClick={() => Message.info('已导出当前业务参数配置')}
                      >
                        导出
                      </Button>
                    </Space>
                  </div>
                  <div className={styles.bizParamConfigTableWrap}>
                    <div
                      className={styles.bizParamConfigTable}
                      style={{ gridTemplateColumns: `repeat(${bizParamConfigHeaders.length}, minmax(0, 1fr))` }}
                    >
                      {bizParamConfigHeaders.map((header, index) => (
                        <div
                          key={header.id}
                          className={`${styles.bizParamConfigTh} ${index === bizParamConfigHeaders.length - 1 ? styles.bizParamConfigLastCell : ''}`}
                        >
                          {editingBizParamHeaderId === header.id ? (
                            <Form.Item
                              className={styles.bizParamConfigHeaderFormItem}
                              validateStatus={bizParamConfigErrors[header.id] ? 'error' : undefined}
                              help={bizParamConfigErrors[header.id]}
                            >
                              <Input
                                autoFocus
                                value={header.label}
                                disabled={readonly}
                                placeholder="请输入表头名称"
                                onBlur={() => setEditingBizParamHeaderId(null)}
                                onPressEnter={() => setEditingBizParamHeaderId(null)}
                                onChange={(value) => updateBizParamConfigHeader(header.id, value)}
                              />
                            </Form.Item>
                          ) : (
                            <Button
                              type="text"
                              className={styles.bizParamConfigHeaderButton}
                              disabled={readonly}
                              onClick={() => setEditingBizParamHeaderId(header.id)}
                            >
                              <span>{header.label || '请输入表头名称'}</span>
                              <IconEdit />
                            </Button>
                          )}
                        </div>
                      ))}
                      {bizParamConfigHeaders.map((header, index) => (
                        <div
                          key={`${header.id}-empty`}
                          className={`${styles.bizParamConfigTd} ${index === bizParamConfigHeaders.length - 1 ? styles.bizParamConfigLastCell : ''}`}
                        />
                      ))}
                    </div>
                    <Button
                      type="dashed"
                      className={styles.bizParamConfigAdd}
                      disabled={readonly || !canAddBizParamConfigHeader}
                      onClick={addBizParamConfigHeader}
                    >
                      <IconPlus />
                      <span>添加</span>
                    </Button>
                  </div>
                  <div className={styles.bizParamHeartbeatRow}>
                    <span>支持按业务拆分心跳</span>
                    <Switch
                      checked={splitHeartbeatByBiz}
                      disabled={readonly}
                      onChange={setSplitHeartbeatByBiz}
                    />
                  </div>
                </div>
                <div className={styles.configActions}>
                  <span className={styles.sectionTitle}>
                    <BusinessCustomParameterAnnotationMarker noteId="BCP-1.5">
                      自定义配置
                    </BusinessCustomParameterAnnotationMarker>
                  </span>
                  <Button type="text" onClick={() => Message.info('自定义配置格式正确')}>预览</Button>
                </div>
                <Form.Item field="defaultConfig" rules={[{ required: true, message: '请输入自定义配置' }]}>
                  <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} placeholder="请输入自定义配置 JSON" />
                </Form.Item>
                <Form.Item
                  field="fileList"
                  label="流程包"
                  rules={readonly ? [] : [{ required: true, message: '请上传流程包' }]}
                >
                  <Upload
                    accept=".zip"
                    autoUpload={false}
                    disabled={readonly}
                    fileList={processFileList}
                    limit={1}
                    tip="支持上传 zip 流程包，解析后自动回填版本号和流程包名称"
                    onChange={updateProcessFileList}
                    beforeUpload={(file) => {
                      if (!file.name.endsWith('.zip')) {
                        Message.warning('请上传 zip 流程包');
                        return false;
                      }
                      return true;
                    }}
                  />
                </Form.Item>
                <Form.Item field="processName" className={styles.hiddenField}>
                  <Input />
                </Form.Item>
                <Form.Item field="processVersion" className={styles.hiddenField}>
                  <Input />
                </Form.Item>
                {(processFileList.length || currentRecord?.processName) ? (
                  <div className={styles.packageCard}>
                    <div className={styles.packageIcon}>ZIP</div>
                    <div className={styles.packageMeta}>
                      <div className={styles.uploadName}>
                        {form.getFieldValue('processName') || currentRecord?.processName || processFileList[0]?.name}
                      </div>
                      <div className={styles.uploadHint}>
                        版本：{form.getFieldValue('processVersion') || currentRecord?.processVersion || 'v4.1.0'}
                        {packageUploadTime ? ` ｜ 上传时间：${packageUploadTime}` : ''}
                      </div>
                    </div>
                    <Button size="small" icon={<IconDownload />} disabled={!currentRecord?.processName}>下载</Button>
                  </div>
                ) : null}
                <Descriptions
                  style={{ marginTop: 16 }}
                  column={2}
                  data={[
                    { label: '版本号', value: form.getFieldValue('processVersion') || currentRecord?.processVersion || 'v4.0.9' },
                    { label: '流程包', value: form.getFieldValue('processName') || currentRecord?.processName || 'connector_process_v409.zip' },
                  ]}
                />
              </>
            ) : null}
          </Form>

          <Modal
            title="求和配置"
            visible={Boolean(sumConfigTarget)}
            onCancel={() => setSumConfigTarget(null)}
            onOk={submitSumConfig}
            unmountOnExit
          >
            <div className={styles.sumConfigBody}>
              <Form layout="vertical">
                <Form.Item label="求和类型">
                  <Select
                    value={sumConfigDraft.detectionType ?? 0}
                    onChange={(value) => setSumConfigDraft((prev) => ({
                      ...prev,
                      detectionType: value,
                    }))}
                  >
                    <Select.Option value={0}>固定范围</Select.Option>
                    <Select.Option value={1}>波动范围</Select.Option>
                  </Select>
                </Form.Item>
                {(sumConfigDraft.detectionType ?? 0) === 0 ? (
                  <div className={styles.rangeRow}>
                    <span>范围区间</span>
                    <InputNumber
                      min={1}
                      max={1000000000}
                      placeholder="下限"
                      value={sumConfigDraft.fixedRange?.minValue}
                      onChange={(value) => setSumConfigDraft((prev) => ({
                        ...prev,
                        fixedRange: { ...prev.fixedRange, minValue: Number(value || 0) || undefined },
                      }))}
                    />
                    <span>~</span>
                    <InputNumber
                      min={1}
                      max={1000000000}
                      placeholder="上限"
                      value={sumConfigDraft.fixedRange?.maxValue}
                      onChange={(value) => setSumConfigDraft((prev) => ({
                        ...prev,
                        fixedRange: { ...prev.fixedRange, maxValue: Number(value || 0) || undefined },
                      }))}
                    />
                  </div>
                ) : (
                  <div className={styles.rangeRow}>
                    <span>近</span>
                    <InputNumber
                      min={1}
                      max={7}
                      placeholder="天数"
                      value={sumConfigDraft.floatRange?.dayCount}
                      onChange={(value) => setSumConfigDraft((prev) => ({
                        ...prev,
                        floatRange: { ...prev.floatRange, dayCount: Number(value || 0) || undefined },
                      }))}
                    />
                    <span>日平均值的</span>
                    <InputNumber
                      min={1}
                      max={999}
                      placeholder="下限"
                      value={sumConfigDraft.floatRange?.minValue}
                      onChange={(value) => setSumConfigDraft((prev) => ({
                        ...prev,
                        floatRange: { ...prev.floatRange, minValue: Number(value || 0) || undefined },
                      }))}
                    />
                    <span>% ~</span>
                    <InputNumber
                      min={0}
                      max={999}
                      placeholder="上限"
                      value={sumConfigDraft.floatRange?.maxValue}
                      onChange={(value) => setSumConfigDraft((prev) => ({
                        ...prev,
                        floatRange: { ...prev.floatRange, maxValue: Number(value || 0) || undefined },
                      }))}
                    />
                    <span>%</span>
                  </div>
                )}
              </Form>
            </div>
          </Modal>

          <div className={styles.drawerFooter}>
            {currentStep > 0 ? <Button onClick={() => setCurrentStep((value) => value - 1)}>上一步</Button> : null}
            {currentStep < 2 ? (
              <Button type="primary" onClick={handleNextStep}>下一步</Button>
            ) : (
              <Button type="primary" disabled={drawerMode === 'detail'} onClick={submitDrawer}>
                {drawerMode === 'review' ? '审核通过' : '保存'}
              </Button>
            )}
          </div>
        </div>
      </Drawer>

      <Modal
        title="批量更新流程包"
        visible={batchOpen}
        onCancel={() => setBatchOpen(false)}
        onOk={submitBatchUpdate}
      >
        <Form form={batchForm} layout="vertical">
          <Form.Item label="已选数据源">
            <span>{selectedRows.map((item) => item.connectorName).join('、')}</span>
          </Form.Item>
          <Form.Item label="目标版本号" field="processVersion" rules={[{ required: true, message: '请输入目标版本号' }]}>
            <Input placeholder="例如 v4.0.9" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
