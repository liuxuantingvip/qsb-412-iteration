import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Checkbox,
  Drawer,
  Empty,
  Dropdown,
  Input,
  Menu,
  Message,
  Pagination,
  Radio,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  TimePicker,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import {
  IconCalendar,
  IconDown,
  IconInfoCircle,
  IconList,
  IconMore,
  IconPlus,
  IconRefresh,
  IconSettings,
} from '@arco-design/web-react/icon';
import { AutoRetryAnnotationMarker } from '@/components/autoRetryAnnotations';
import type { OverviewRunFilters } from '@/pages/qsbOverview/overviewContent';
import * as ServiceApi from './services';
import type {
  RelatedPlan,
  RelatedStore,
  RetryStrategy,
  RetryStrategyDraft,
  RunRecord,
  RunStatus,
  TriggerGroup,
} from './interface';
import { RunDetailModal } from './runDetail/RunDetailModal';
import { triggerGroups, triggerOptions } from './triggerMappings';
import styles from './index.module.less';

const { RangePicker } = TimePicker;
const { TabPane } = Tabs;

const statusOptions = [
  { label: '待运行', value: '待运行' },
  { label: '运行中', value: '运行中' },
  { label: '成功', value: '成功' },
  { label: '部分成功', value: '部分成功' },
  { label: '失败', value: '失败' },
];

type RunSearchField = 'planName' | 'storeName';
type StrategySearchField = 'strategyName' | 'planName' | 'storeName';

const runSearchOptions: { label: string; value: RunSearchField }[] = [
  { label: '计划名称', value: 'planName' },
  { label: '店铺', value: 'storeName' },
];

const strategySearchOptions: { label: string; value: StrategySearchField }[] = [
  { label: '策略名称', value: 'strategyName' },
  { label: '计划名称', value: 'planName' },
  { label: '店铺名称', value: 'storeName' },
];

const runSearchPlaceholders: Record<RunSearchField, string> = {
  planName: '请输入计划名称',
  storeName: '请输入店铺',
};

const strategySearchPlaceholders: Record<StrategySearchField, string> = {
  strategyName: '请输入策略名称',
  planName: '请输入计划名称',
  storeName: '请输入店铺名称',
};

const cloudResourceOptions = [
  { label: '云资源-杭州 01', value: 'cloud-resource-hz-01' },
  { label: '云资源-上海 02', value: 'cloud-resource-sh-02' },
  { label: '云资源-深圳 03', value: 'cloud-resource-sz-03' },
];

const defaultTriggerValues: RetryStrategyDraft['triggerValues'] = {
  账号异常: [],
  平台异常: [],
  数据入库异常: [],
};

const restoreTriggerValues = (triggers: string[]): RetryStrategyDraft['triggerValues'] => (
  triggerGroups.reduce((values, group) => ({
    ...values,
    [group]: triggerOptions[group].filter((item) => triggers.includes(item)),
  }), {} as RetryStrategyDraft['triggerValues'])
);

const createDraft = (strategy?: RetryStrategy): RetryStrategyDraft => ({
  key: strategy?.key,
  name: strategy?.name || '',
  associationType: strategy?.associationType || 'PLAN',
  planScope: strategy?.planScope || 'CUSTOM',
  relatedPlans: strategy?.relatedPlans?.length
    ? strategy.relatedPlans.map((item) => ({ ...item }))
    : ServiceApi.relatedPlans.map((item) => ({ ...item })),
  storeScope: strategy?.storeScope || 'CUSTOM',
  relatedStores: strategy?.relatedStores?.length
    ? strategy.relatedStores.map((item) => ({ ...item }))
    : ServiceApi.relatedStores.map((item) => ({ ...item })),
  triggerValues: strategy
    ? restoreTriggerValues(strategy.triggers)
    : {
      账号异常: [...defaultTriggerValues.账号异常],
      平台异常: [...defaultTriggerValues.平台异常],
      数据入库异常: [...defaultTriggerValues.数据入库异常],
    },
  retryCount: strategy?.retryCount || 1,
  retryInterval: strategy?.retryInterval || 30,
  specifiedTime: strategy?.specifiedTime ?? true,
  timeRange: strategy?.timeRange ? [...strategy.timeRange] : ['00:00:00', '23:59:59'],
  executeMode: strategy?.executeMode || 'DYNAMIC',
  cloudResourceId: strategy?.cloudResourceId,
});

function StatusTag({ status }: { status: RunStatus }) {
  const colorMap: Record<RunStatus, string> = {
    待运行: 'gray',
    运行中: 'arcoblue',
    成功: 'green',
    部分成功: 'orange',
    失败: 'red',
  };
  return <Tag className={styles.statusTag} color={colorMap[status]}>{status}</Tag>;
}

function PageFooter({
  total,
  current,
  pageSize,
  onChange,
}: {
  total: number;
  current: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
}) {
  return (
    <div className={styles.pageFooter}>
      <span>共{total}条</span>
      <Pagination
        total={total}
        current={current}
        pageSize={pageSize}
        sizeCanChange
        sizeOptions={[10, 20, 50, 100]}
        onChange={onChange}
      />
    </div>
  );
}

function useAutoTableScrollY(deps: readonly unknown[]) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [tableScrollY, setTableScrollY] = useState(420);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const heightWithMargins = (element: Element | null, fallback = 0) => {
      if (!element) return fallback;
      const style = window.getComputedStyle(element);
      return (
        element.getBoundingClientRect().height
        + (Number.parseFloat(style.marginTop) || 0)
        + (Number.parseFloat(style.marginBottom) || 0)
      );
    };

    const updateTableScrollY = () => {
      const toolbar = root.getElementsByClassName(styles.toolbar)[0] || null;
      const footer = root.getElementsByClassName(styles.pageFooter)[0] || null;
      const tableHeader = root.querySelector('.arco-table-header');
      const nextHeight =
        root.clientHeight
        - heightWithMargins(toolbar, 56)
        - heightWithMargins(tableHeader, 55)
        - heightWithMargins(footer, 52)
        - 2;

      setTableScrollY(Math.max(180, Math.floor(nextHeight)));
    };

    updateTableScrollY();

    const resizeObserver = new ResizeObserver(updateTableScrollY);
    resizeObserver.observe(root);
    window.addEventListener('resize', updateTableScrollY);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateTableScrollY);
    };
  }, deps);

  return { pageRef, tableScrollY };
}

function matchesOverviewIssue(item: RunRecord, issueType?: OverviewRunFilters['issueType']) {
  if (!issueType) return true;
  if (item.issueStage) return item.issueStage === issueType;
  if (issueType === 'login') return false;
  if (issueType === 'collection') return item.collectionStatus === '失败' || item.collectionStatus === '部分成功';
  if (issueType === 'ingestion') return item.storageStatus === '失败' || item.storageStatus === '部分成功';
  if (issueType === 'validation') return item.validationStatus === '失败' || item.validationStatus === '部分成功';
  return false;
}

export function RunRecordDetailDrawer({ record, onClose }: { record: RunRecord | null; onClose: () => void }) {
  return <RunDetailModal record={record} onClose={onClose} />;
}

function RunRecordsView({ initialFilters }: { initialFilters?: OverviewRunFilters }) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RunRecord[]>([]);
  const [searchField, setSearchField] = useState<RunSearchField>(initialFilters?.planName ? 'planName' : initialFilters?.storeName ? 'storeName' : 'planName');
  const [keyword, setKeyword] = useState(initialFilters?.planName ?? initialFilters?.storeName ?? '');
  const [overviewFilters, setOverviewFilters] = useState(initialFilters);
  const [collectionStatus, setCollectionStatus] = useState<string>();
  const [validationStatus, setValidationStatus] = useState<string>();
  const [storageStatus, setStorageStatus] = useState<string>();
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);
  const [detailRecord, setDetailRecord] = useState<RunRecord | null>(null);
  const [storageLogAnnotationRequested, setStorageLogAnnotationRequested] = useState<'entry' | 'drawer' | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => {
    let active = true;
    ServiceApi.getRunRecords()
      .then(({ bizData }) => {
        if (active) setRecords(bizData);
      })
      .catch(() => Message.error('运行记录加载失败'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!overviewFilters?.targetRecordKey || !records.length) return;
    const targetRecord = records.find((item) => item.key === overviewFilters.targetRecordKey);
    if (targetRecord) setDetailRecord(targetRecord);
  }, [overviewFilters?.targetRecordKey, records]);

  useEffect(() => {
    const openStorageLog = () => setStorageLogAnnotationRequested('drawer');
    const openStorageLogEntry = () => setStorageLogAnnotationRequested('entry');
    window.addEventListener('run-detail-storage-log:open', openStorageLog);
    window.addEventListener('run-detail-storage-log:open-entry', openStorageLogEntry);
    return () => {
      window.removeEventListener('run-detail-storage-log:open', openStorageLog);
      window.removeEventListener('run-detail-storage-log:open-entry', openStorageLogEntry);
    };
  }, []);

  useEffect(() => {
    if (!storageLogAnnotationRequested || !records.length) return;
    setDetailRecord(records[0]);
    const openStorage = storageLogAnnotationRequested === 'drawer';
    setStorageLogAnnotationRequested(null);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('run-detail-storage-log:open-record', {
      detail: { openStorage },
    })), 180);
  }, [storageLogAnnotationRequested, records]);

  const data = useMemo(() => records.filter((item) => (
    (!keyword.trim() || item[searchField].includes(keyword.trim()))
    && (!collectionStatus || item.collectionStatus === collectionStatus)
    && (!validationStatus || item.validationStatus === validationStatus)
    && (!storageStatus || item.storageStatus === storageStatus)
    && (!overviewFilters || (
      item.startTime.slice(0, 10) >= overviewFilters.startDate
      && item.startTime.slice(0, 10) <= overviewFilters.endDate
      && matchesOverviewIssue(item, overviewFilters.issueType)
      && (!overviewFilters.planName || item.planName.includes(overviewFilters.planName))
      && (!overviewFilters.storeName || item.storeName.includes(overviewFilters.storeName))
    ))
  )), [records, searchField, keyword, collectionStatus, validationStatus, storageStatus, overviewFilters]);
  const pageData = useMemo(
    () => data.slice((page - 1) * pageSize, page * pageSize),
    [data, page, pageSize],
  );

  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(data.length / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [data.length, page, pageSize]);

  const { pageRef, tableScrollY } = useAutoTableScrollY([page, pageSize, pageData.length, selectedKeys.length, loading]);

  const columns: ColumnProps<RunRecord>[] = [
    { title: '计划名称', dataIndex: 'planName', width: 190 },
    { title: '店铺', dataIndex: 'storeName', width: 150, ellipsis: true },
    { title: '最近运行开始时间', dataIndex: 'startTime', width: 188 },
    { title: '最近运行结束时间', dataIndex: 'endTime', width: 188 },
    {
      title: '取数执行',
      dataIndex: 'collectionStatus',
      width: 160,
      render: (value: RunStatus) => <StatusTag status={value} />,
    },
    {
      title: '数据入库',
      dataIndex: 'storageStatus',
      width: 160,
      render: (value: RunStatus, record) => (
        <Space size={6} className={styles.storageStatusCell}>
          <StatusTag status={value} />
          {record.storageNote ? (
            <Tooltip content={record.storageNote} position="tl">
              <span className={styles.storageNote}>{record.storageNote}</span>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    {
      title: <div className={styles.operationTitle}><span>操作</span><IconSettings /></div>,
      width: 135,
      className: styles.actionColumn,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} className={styles.actionButtons}>
          <Button type="text" onClick={() => setDetailRecord(record)}>运行详情</Button>
        </Space>
      ),
    },
  ];

  const reset = () => {
    setSearchField('planName');
    setKeyword('');
    setCollectionStatus(undefined);
    setValidationStatus(undefined);
    setStorageStatus(undefined);
    setOverviewFilters(undefined);
  };

  return (
    <div ref={pageRef} className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Input.Group compact className={`${styles.keywordSearchGroup} qsb-arco-composite-search`}>
            <Select
              className={styles.keywordFieldSelect}
              value={searchField}
              options={runSearchOptions}
              onChange={(value) => {
                setSearchField(value as RunSearchField);
                setKeyword('');
              }}
            />
            <Input.Search
              className={styles.keywordSearch}
              value={keyword}
              placeholder={runSearchPlaceholders[searchField]}
              allowClear
              searchButton={false}
              onChange={setKeyword}
              onSearch={setKeyword}
            />
          </Input.Group>
          <Select
            value={collectionStatus}
            placeholder="取数执行"
            allowClear
            options={statusOptions}
            style={{ width: 146 }}
            onChange={setCollectionStatus}
          />
          <Select
            value={validationStatus}
            placeholder="采集文件校验"
            allowClear
            options={statusOptions}
            style={{ width: 146 }}
            onChange={setValidationStatus}
          />
          <Select
            value={storageStatus}
            placeholder="数据入库"
            allowClear
            options={statusOptions}
            style={{ width: 132 }}
            onChange={setStorageStatus}
          />
          <Button type="text" onClick={reset}>重置</Button>
          {overviewFilters ? (
            <div className={styles.overviewFilterTags} aria-label="概览下钻条件">
              <Tag color="arcoblue">{overviewFilters.startDate} 至 {overviewFilters.endDate}</Tag>
              <Tag color="red">{overviewFilters.issueLabel}</Tag>
              {overviewFilters.planName ? <Tag>{overviewFilters.planName}</Tag> : null}
              {overviewFilters.storeName ? <Tag>{overviewFilters.storeName}</Tag> : null}
            </div>
          ) : null}
        </div>
        <div className={styles.toolbarActions}>
          <Button.Group>
            <Button icon={<IconCalendar />} aria-label="日历视图" />
            <Button icon={<IconList />} aria-label="列表视图" />
          </Button.Group>
          <span className={styles.toolbarDivider} />
          <Button
            type="primary"
            icon={<IconRefresh />}
            disabled={!selectedKeys.length}
            onClick={() => Message.success(`已提交 ${selectedKeys.length} 条运行记录重新运行`)}
          >
            重新运行
          </Button>
        </div>
      </div>

      <Spin loading={loading} className={styles.tableSpin}>
        <Table<RunRecord>
          rowKey="key"
          data={pageData}
          columns={columns}
          pagination={false}
          size="default"
          scroll={{ x: 1170, y: tableScrollY }}
          noDataElement={<Empty className={styles.tableEmpty} description="暂无运行记录" />}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: selectedKeys,
            onChange: setSelectedKeys,
          }}
        />
      </Spin>
      <PageFooter
        total={data.length}
        current={page}
        pageSize={pageSize}
        onChange={(nextPage, nextPageSize) => {
          setPage(nextPageSize === pageSize ? nextPage : 1);
          setPageSize(nextPageSize);
        }}
      />
      <RunDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
    </div>
  );
}

function TriggerEditor({
  draft,
  setDraft,
}: {
  draft: RetryStrategyDraft;
  setDraft: (draft: RetryStrategyDraft) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<TriggerGroup, boolean>>({
    账号异常: false,
    平台异常: false,
    数据入库异常: false,
  });

  const changeGroup = (group: TriggerGroup, values: string[]) => {
    setDraft({
      ...draft,
      triggerValues: {
        ...draft.triggerValues,
        [group]: values,
      },
    });
  };

  const toggleGroup = (group: TriggerGroup) => {
    setCollapsedGroups((current) => ({
      ...current,
      [group]: !current[group],
    }));
  };

  return (
    <div className={styles.triggerGroups}>
      {triggerGroups.map((group) => {
        const groupOptions = triggerOptions[group];
        const groupIsEmpty = groupOptions.length === 0;

        return (
          <div className={styles.triggerGroupBlock} key={group}>
          <div
            className={styles.triggerGroupHeader}
            role="button"
            tabIndex={0}
            aria-expanded={!collapsedGroups[group]}
            onClick={() => toggleGroup(group)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleGroup(group);
              }
            }}
          >
            <span
              className={styles.triggerGroupTitle}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Checkbox
                checked={!groupIsEmpty && draft.triggerValues[group].length === groupOptions.length}
                disabled={groupIsEmpty}
                indeterminate={!groupIsEmpty && draft.triggerValues[group].length > 0 && draft.triggerValues[group].length < groupOptions.length}
                onChange={(checked) => changeGroup(group, checked ? [...groupOptions] : [])}
              >
                {group}
              </Checkbox>
              <span className={styles.triggerGroupCount}>
                {draft.triggerValues[group].length}/{groupOptions.length}
              </span>
            </span>
            <IconDown className={collapsedGroups[group] ? styles.triggerGroupIconCollapsed : styles.triggerGroupIcon} />
          </div>
          {!collapsedGroups[group] && !groupIsEmpty ? (
            <Checkbox.Group
              className={styles.triggerChildren}
              value={draft.triggerValues[group]}
              onChange={(values) => changeGroup(group, values as string[])}
            >
              {groupOptions.map((item) => (
                <Checkbox key={item} value={item}>{item}</Checkbox>
              ))}
            </Checkbox.Group>
          ) : null}
        </div>
        );
      })}
    </div>
  );
}

function StrategyDrawer({
  visible,
  initialValue,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initialValue?: RetryStrategy;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<RetryStrategyDraft>(createDraft(initialValue));
  const [saving, setSaving] = useState(false);
  const [executeHintVisible, setExecuteHintVisible] = useState(false);

  useEffect(() => {
    if (visible) setDraft(createDraft(initialValue));
  }, [visible, initialValue]);

  const removePlan = (key: string) => {
    setDraft({ ...draft, relatedPlans: draft.relatedPlans.filter((item) => item.key !== key) });
  };

  const removeStore = (key: string) => {
    setDraft({ ...draft, relatedStores: draft.relatedStores.filter((item) => item.key !== key) });
  };

  const updateExecuteMode = (executeMode: RetryStrategyDraft['executeMode']) => {
    setDraft({
      ...draft,
      executeMode,
      cloudResourceId: executeMode === 'DYNAMIC' ? undefined : draft.cloudResourceId,
    });
  };

  const planColumns: ColumnProps<RelatedPlan>[] = [
    { title: '计划名称', dataIndex: 'name', width: 196, ellipsis: true },
    { title: '计划类型', dataIndex: 'type', width: 96 },
    { title: '平台', dataIndex: 'platform', width: 88 },
    { title: '店铺', dataIndex: 'store', width: 136, ellipsis: true },
    {
      title: '操作',
      width: 72,
      align: 'center',
      render: (_, record) => (
        <Button
          className={styles.planRemoveButton}
          type="text"
          status="danger"
          onClick={() => removePlan(record.key)}
        >
          移除
        </Button>
      ),
    },
  ];

  const storeColumns: ColumnProps<RelatedStore>[] = [
    { title: '店铺', dataIndex: 'name', width: 220, ellipsis: true },
    { title: '平台', dataIndex: 'platform', width: 120 },
    { title: '授权账号', dataIndex: 'account', width: 160, ellipsis: true },
    {
      title: '操作',
      width: 72,
      align: 'center',
      render: (_, record) => (
        <Button
          className={styles.planRemoveButton}
          type="text"
          status="danger"
          onClick={() => removeStore(record.key)}
        >
          移除
        </Button>
      ),
    },
  ];

  const save = async () => {
    if (!draft.name.trim()) {
      Message.warning('请输入策略名称');
      return;
    }
    if (draft.associationType === 'PLAN' && draft.planScope === 'CUSTOM' && !draft.relatedPlans.length) {
      Message.warning('请至少关联一个计划');
      return;
    }
    if (draft.associationType === 'STORE' && draft.storeScope === 'CUSTOM' && !draft.relatedStores.length) {
      Message.warning('请至少关联一个店铺');
      return;
    }
    if (!Object.values(draft.triggerValues).some((items) => items.length)) {
      Message.warning('请至少选择一个触发条件');
      return;
    }
    if (draft.executeMode === 'SPECIFIED' && !draft.cloudResourceId) {
      Message.warning('请选择云资源');
      return;
    }
    setSaving(true);
    try {
      await ServiceApi.saveRetryStrategy({ ...draft, name: draft.name.trim() });
      Message.success(initialValue ? '策略已更新' : '策略已创建');
      onSaved();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '策略保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      visible={visible}
      className={styles.strategyDrawer}
      width="min(723px, calc(100vw - 24px))"
      title={initialValue ? '编辑策略' : '新建策略'}
      unmountOnExit={false}
      onCancel={onClose}
      footer={(
        <Space>
          <Button onClick={onClose}>取消</Button>
          <AutoRetryAnnotationMarker noteId="ARO-3.7">
            <Button type="primary" loading={saving} onClick={save}>确定</Button>
          </AutoRetryAnnotationMarker>
        </Space>
      )}
    >
      <div className={styles.drawerBody}>
        <div className={styles.formField}>
          <label>
            <span className={styles.requiredMark}>*</span>
            <AutoRetryAnnotationMarker noteId="ARO-3.2">策略名称</AutoRetryAnnotationMarker>
          </label>
          <Input
            className={styles.strategyNameInput}
            value={draft.name}
            placeholder="请输入策略名称"
            onChange={(value) => setDraft({ ...draft, name: value })}
          />
        </div>

        <div className={styles.formField}>
          <label><AutoRetryAnnotationMarker noteId="ARO-3.3">关联计划/店铺</AutoRetryAnnotationMarker></label>
          <Tabs
            activeTab={draft.associationType}
            className={styles.associationTabs}
            headerPadding={false}
            onChange={(value) => setDraft({
              ...draft,
              associationType: value as RetryStrategyDraft['associationType'],
            })}
            type="rounded"
          >
            <TabPane key="PLAN" title="计划" />
            <TabPane key="STORE" title="店铺" />
          </Tabs>

          {draft.associationType === 'PLAN' ? (
            <div className={styles.scopeBlock}>
              <div className={styles.scopeRow}>
                <Radio.Group
                  value={draft.planScope}
                  onChange={(value) => setDraft({ ...draft, planScope: value })}
                >
                  <Radio value="CUSTOM">指定计划</Radio>
                  <Radio value="ALL">全部计划</Radio>
                </Radio.Group>
                {draft.planScope === 'CUSTOM' ? <Button type="text" icon={<IconPlus />}>添加</Button> : null}
              </div>
              {draft.planScope === 'CUSTOM' ? (
                <Table<RelatedPlan>
                  className={styles.planTable}
                  rowKey="key"
                  pagination={false}
                  data={draft.relatedPlans}
                  columns={planColumns}
                  noDataElement={<Empty className={styles.tableEmpty} description="暂无关联计划" />}
                />
              ) : null}
            </div>
          ) : null}

          {draft.associationType === 'STORE' ? (
            <div className={styles.scopeBlock}>
              <div className={styles.scopeRow}>
                <Radio.Group
                  value={draft.storeScope}
                  onChange={(value) => setDraft({ ...draft, storeScope: value })}
                >
                  <Radio value="CUSTOM">指定店铺</Radio>
                  <Radio value="ALL">全部店铺</Radio>
                </Radio.Group>
                {draft.storeScope === 'CUSTOM' ? <Button type="text" icon={<IconPlus />}>添加</Button> : null}
              </div>
              {draft.storeScope === 'CUSTOM' ? (
                <Table<RelatedStore>
                  className={styles.planTable}
                  rowKey="key"
                  pagination={false}
                  data={draft.relatedStores}
                  columns={storeColumns}
                  noDataElement={<Empty className={styles.tableEmpty} description="暂无关联店铺" />}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={styles.formField}>
          <label><AutoRetryAnnotationMarker noteId="ARO-3.4">触发条件</AutoRetryAnnotationMarker></label>
          <TriggerEditor draft={draft} setDraft={setDraft} />
        </div>

        <div className={styles.formField}>
          <label><AutoRetryAnnotationMarker noteId="ARO-3.5">重试规则</AutoRetryAnnotationMarker></label>
          <span className={styles.ruleHint}>重试将占用机器人执行资源，可能会导致其余任务排队</span>
          <div className={styles.ruleRow}>
            <span>自动重试次数</span>
            <Select
              value={draft.retryCount}
              options={[1, 2, 3].map((value) => ({ label: String(value), value }))}
              onChange={(value) => setDraft({ ...draft, retryCount: value })}
            />
          </div>
          <div className={styles.ruleRow}>
            <span>重试间隔</span>
            <Select
              value={draft.retryInterval}
              options={[10, 20, 30, 60].map((value) => ({ label: `${value} 分钟`, value }))}
              onChange={(value) => setDraft({ ...draft, retryInterval: value })}
            />
          </div>
          <div className={`${styles.ruleRow} ${styles.timeRuleRow}`}>
            <div className={styles.timeRuleTitle}>
              <span>指定时间执行</span>
              <Switch
                checked={draft.specifiedTime}
                onChange={(checked) => setDraft({ ...draft, specifiedTime: checked })}
              />
            </div>
            {draft.specifiedTime ? (
              <div className={styles.timeRuleContent}>
                <RangePicker
                  value={draft.timeRange}
                  format="HH:mm:ss"
                  onChange={(value) => setDraft({
                    ...draft,
                    timeRange: (value || ['00:00:00', '23:59:59']) as [string, string],
                  })}
                />
              </div>
            ) : null}
          </div>
          <div className={`${styles.ruleRow} ${styles.executeModeRow}`}>
            <div className={styles.executeModeTitle}>
              <AutoRetryAnnotationMarker noteId="ARO-3.6">执行方式</AutoRetryAnnotationMarker>
              <div className={styles.executeModeOptions} role="radiogroup">
                <span className={styles.executeRadioLabel}>
                  <Radio
                    checked={draft.executeMode === 'DYNAMIC'}
                    onChange={() => updateExecuteMode('DYNAMIC')}
                  >
                    动态分配
                  </Radio>
                  <Tooltip
                    content="默认动态分配，到指定时间执行时自动找空闲云资源"
                    popupVisible={executeHintVisible}
                    position="top"
                    onVisibleChange={setExecuteHintVisible}
                  >
                    <span
                      className={styles.executeInfoTrigger}
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        setExecuteHintVisible(true);
                      }}
                      onBlur={() => setExecuteHintVisible(false)}
                      onFocus={() => setExecuteHintVisible(true)}
                      onMouseEnter={() => setExecuteHintVisible(true)}
                      onMouseLeave={() => setExecuteHintVisible(false)}
                      onMouseMove={() => setExecuteHintVisible(true)}
                      onMouseOver={() => setExecuteHintVisible(true)}
                      onPointerEnter={() => setExecuteHintVisible(true)}
                      onPointerMove={() => setExecuteHintVisible(true)}
                    >
                      <IconInfoCircle className={styles.executeInfoIcon} />
                    </span>
                  </Tooltip>
                </span>
                <Radio
                  checked={draft.executeMode === 'SPECIFIED'}
                  onChange={() => updateExecuteMode('SPECIFIED')}
                >
                  指定云资源
                </Radio>
              </div>
            </div>
            {draft.executeMode === 'SPECIFIED' ? (
              <div className={styles.executeResourceContent}>
                <Select
                  className={styles.executeResourceSelect}
                  value={draft.cloudResourceId}
                  placeholder="请选择云资源"
                  options={cloudResourceOptions}
                  onChange={(value) => setDraft({ ...draft, cloudResourceId: value })}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function RetryStrategyView() {
  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState<RetryStrategy[]>([]);
  const [searchField, setSearchField] = useState<StrategySearchField>('strategyName');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<RetryStrategy>();
  const [pendingStatusKeys, setPendingStatusKeys] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => {
    const openCreateDrawer = () => {
      setEditingStrategy(undefined);
      setDrawerVisible(true);
    };
    window.addEventListener('auto-retry:open-strategy-drawer', openCreateDrawer);
    return () => window.removeEventListener('auto-retry:open-strategy-drawer', openCreateDrawer);
  }, []);

  const loadStrategies = async () => {
    setLoading(true);
    try {
      const { bizData } = await ServiceApi.getRetryStrategies();
      setStrategies(bizData);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '策略列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStrategies();
  }, []);

  const data = useMemo(() => {
    const value = keyword.trim();
    const matchKeyword = (item: RetryStrategy) => {
      if (!value) return true;
      if (searchField === 'strategyName') return item.name.includes(value);
      if (searchField === 'planName') {
        return item.relatedPlans.some((plan) => plan.name.includes(value));
      }
      return item.relatedStores.some((store) => store.name.includes(value))
        || item.relatedPlans.some((plan) => plan.store.includes(value));
    };
    return strategies.filter((item) => (
      matchKeyword(item)
      && (!status || (status === 'ENABLED' ? item.enabled : !item.enabled))
    ));
  }, [strategies, searchField, keyword, status]);
  const pageData = useMemo(
    () => data.slice((page - 1) * pageSize, page * pageSize),
    [data, page, pageSize],
  );

  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(data.length / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [data.length, page, pageSize]);

  const { pageRef, tableScrollY } = useAutoTableScrollY([page, pageSize, pageData.length, status, loading]);

  const openDrawer = (strategy?: RetryStrategy) => {
    setEditingStrategy(strategy);
    setDrawerVisible(true);
  };

  const updateStatus = async (record: RetryStrategy, enabled: boolean) => {
    setPendingStatusKeys((current) => [...current, record.key]);
    setStrategies((current) => current.map((item) => item.key === record.key ? { ...item, enabled } : item));
    try {
      await ServiceApi.updateStrategyStatus(record.key, enabled);
    } catch (error) {
      setStrategies((current) => current.map((item) => item.key === record.key ? { ...item, enabled: record.enabled } : item));
      Message.error(error instanceof Error ? error.message : '策略状态更新失败');
    } finally {
      setPendingStatusKeys((current) => current.filter((key) => key !== record.key));
    }
  };

  const handleMoreAction = async (key: string, record: RetryStrategy) => {
    try {
      if (key === 'copy') {
        await ServiceApi.copyRetryStrategy(record.key);
        Message.success('策略已复制，新副本默认停用');
      } else if (key === 'delete') {
        await ServiceApi.deleteRetryStrategy(record.key);
        Message.success('策略已删除');
      }
      await loadStrategies();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const columns: ColumnProps<RetryStrategy>[] = [
    {
      title: <AutoRetryAnnotationMarker noteId="ARO-2.1">策略名称</AutoRetryAnnotationMarker>,
      dataIndex: 'name',
      width: 180,
    },
    {
      title: <AutoRetryAnnotationMarker noteId="ARO-2.2">关联计划/店铺</AutoRetryAnnotationMarker>,
      width: 220,
      render: (_, record) => (
        <div className={styles.associationCell}>
          {record.associationType === 'PLAN' ? (
            <span>
              {record.planScope === 'ALL'
                ? `计划：全部计划（${record.planCount}）`
                : `计划：指定计划（${record.planCount}）`}
            </span>
          ) : (
            <span>
              {record.storeScope === 'ALL'
                ? `店铺：全部店铺（${record.storeCount}）`
                : `店铺：指定店铺（${record.storeCount}）`}
            </span>
          )}
        </div>
      ),
    },
    {
      title: <AutoRetryAnnotationMarker noteId="ARO-2.3">触发条件</AutoRetryAnnotationMarker>,
      width: 300,
      render: (_, record) => (
        <Space size={6} wrap>
          {record.triggers.map((item) => <Tag className={styles.triggerTag} key={item}>{item}</Tag>)}
        </Space>
      ),
    },
    {
      title: '重试规则',
      width: 158,
      render: (_, record) => `${record.retryCount} 次/${record.retryInterval} 分钟`,
    },
    {
      title: <AutoRetryAnnotationMarker noteId="ARO-2.4">状态</AutoRetryAnnotationMarker>,
      width: 88,
      render: (_, record) => (
        <Switch
          checked={record.enabled}
          loading={pendingStatusKeys.includes(record.key)}
          disabled={pendingStatusKeys.includes(record.key)}
          checkedText="开启"
          uncheckedText="停用"
          onChange={(checked) => updateStatus(record, checked)}
        />
      ),
    },
    {
      title: (
        <AutoRetryAnnotationMarker noteId="ARO-2.5">
          <div className={styles.operationTitle}><span>操作</span><IconSettings /></div>
        </AutoRetryAnnotationMarker>
      ),
      width: 152,
      className: styles.actionColumn,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} className={styles.actionButtons}>
          <Button type="text" onClick={() => openDrawer(record)}>编辑</Button>
          <Dropdown
            droplist={(
              <Menu onClickMenuItem={(key) => void handleMoreAction(key, record)}>
                <Menu.Item key="copy">复制策略</Menu.Item>
                <Menu.Item key="delete">删除策略</Menu.Item>
              </Menu>
            )}
            trigger="click"
            position="br"
          >
            <Button type="text">更多</Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div ref={pageRef} className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Input.Group compact className={`${styles.keywordSearchGroup} qsb-arco-composite-search`}>
            <Select
              className={styles.keywordFieldSelect}
              value={searchField}
              options={strategySearchOptions}
              onChange={(value) => {
                setSearchField(value as StrategySearchField);
                setKeyword('');
                setPage(1);
              }}
            />
            <Input.Search
              className={styles.keywordSearch}
              value={keyword}
              placeholder={strategySearchPlaceholders[searchField]}
              allowClear
              searchButton={false}
              onChange={(value) => {
                setKeyword(value);
                setPage(1);
              }}
              onSearch={(value) => {
                setKeyword(value);
                setPage(1);
              }}
            />
          </Input.Group>
          <Select
            value={status}
            placeholder="状态"
            allowClear
            style={{ width: 128 }}
            options={[
              { label: '开启', value: 'ENABLED' },
              { label: '停用', value: 'DISABLED' },
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button
            type="text"
            onClick={() => {
              setSearchField('strategyName');
              setKeyword('');
              setStatus(undefined);
              setPage(1);
            }}
          >
            重置
          </Button>
        </div>
        <AutoRetryAnnotationMarker noteId="ARO-3.1">
          <Button type="primary" icon={<IconPlus />} onClick={() => openDrawer()}>新建策略</Button>
        </AutoRetryAnnotationMarker>
      </div>

      <Spin loading={loading} className={styles.tableSpin}>
        <Table<RetryStrategy>
          rowKey="key"
          data={pageData}
          columns={columns}
          pagination={false}
          size="default"
          scroll={{ x: 1110, y: tableScrollY }}
          noDataElement={<Empty className={styles.tableEmpty} description="暂无重试策略" />}
        />
      </Spin>
      <PageFooter
        total={data.length}
        current={page}
        pageSize={pageSize}
        onChange={(nextPage, nextPageSize) => {
          setPage(nextPageSize === pageSize ? nextPage : 1);
          setPageSize(nextPageSize);
        }}
      />

      <StrategyDrawer
        visible={drawerVisible}
        initialValue={editingStrategy}
        onClose={() => setDrawerVisible(false)}
        onSaved={() => {
          setDrawerVisible(false);
          void loadStrategies();
        }}
      />
    </div>
  );
}

export default function AutoRetryOptimization({
  page,
  initialRunFilters,
}: {
  page: '运行记录' | '重试策略';
  initialRunFilters?: OverviewRunFilters;
}) {
  return (
    <div className={styles.productShell}>
      <div className={styles.productContent}>
        {page === '重试策略' ? <RetryStrategyView /> : <RunRecordsView initialFilters={initialRunFilters} />}
      </div>
    </div>
  );
}
