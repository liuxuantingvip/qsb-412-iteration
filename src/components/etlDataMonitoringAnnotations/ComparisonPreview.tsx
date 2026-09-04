import { useState } from 'react';
import { Alert, Button, Cascader, DatePicker, Empty, Input, Select, Table, Tooltip } from '@arco-design/web-react';
import { IconInfoCircle, IconRefresh } from '@arco-design/web-react/icon';
import {
  DateStatusCell,
  StageStatusTag,
  StatusHelpContent,
  detailColumnOptions,
  statusFilterOptions,
  storeMonitorColumnLabels,
  ViewTabs,
} from '@/pages/etlDataMonitoringOptimization';
import type { DateStatus } from '@/pages/etlDataMonitoringOptimization/statusModel';
import type { StageStatus } from '@/pages/etlDataMonitoringOptimization/statusModel';
import { mockExecutionDateRange, monitoringPlatformExamples } from '@/pages/etlDataMonitoringOptimization/detailModel';
import { DetailRowActions } from '@/pages/etlDataMonitoringOptimization/DetailRowActions';
import { DetailFilters, DetailHeading, defaultDetailFilter } from '@/pages/etlDataMonitoringOptimization/DetailToolbar';
import { DetailColumnSettings } from '@/pages/etlDataMonitoringOptimization/DetailColumnSettings';
import type { DetailStageField } from '@/pages/etlDataMonitoringOptimization/detailPresentation';
import { detailRowSpans } from '@/pages/etlDataMonitoringOptimization/monitoringPresentation';
import {
  acceptRetryAttempt,
  availableRetryKinds,
  settleRetryAttempt,
} from '@/pages/etlDataMonitoringOptimization/retryConsistency';
import type {
  EffectiveRetryAttempt,
  RetryKind,
  RetryOutcome,
} from '@/pages/etlDataMonitoringOptimization/retryConsistency';
import { aggregateTaskFinalStatus } from '@/pages/etlDataMonitoringOptimization/statusModel';
import pageStyles from '@/pages/etlDataMonitoringOptimization/index.module.less';
import styles from './comparison.module.less';

const beforeStore = '/etl-monitoring-before/store-20260831.png';
const beforeHelp = '/etl-monitoring-before/help-20260831.png';
function BeforeScreenshot({ src, label, crop }: {
  src: string;
  label: string;
  crop: { x: number; y: number; width: number; height: number };
}) {
  return (
    <figure className={styles.evidence}>
      <div className={styles.scroll} tabIndex={0} aria-label={`${label}，可横向滚动`}>
        <div className={styles.cropFrame} style={{ width: crop.width, height: crop.height }}>
          <img
            className={styles.cropImage}
            src={src}
            alt={label}
            style={{ left: -crop.x, top: -crop.y }}
          />
        </div>
      </div>
      <figcaption>
        2026-08-31 · 线上实拍局部 · <a href={src} target="_blank" rel="noreferrer">查看完整截图</a>
      </figcaption>
    </figure>
  );
}

function SummaryFiltersPreview({ dimension }: { dimension: 'store' | 'table' }) {
  const isStore = dimension === 'store';
  const [searchField, setSearchField] = useState('planName');
  const [keyword, setKeyword] = useState('无匹配计划');
  const [status, setStatus] = useState<DateStatus>();
  const [refreshed, setRefreshed] = useState(false);
  const hasResult = keyword.trim() !== '无匹配计划';
  return (
    <div className={styles.preview}>
      <div className={styles.summaryFilters}>
        <DatePicker.RangePicker allowClear className={pageStyles.dateRangeWide} format="YYYY-MM-DD" placeholder={['开始日期', '结束日期']} />
        {isStore ? <Cascader allowClear className={pageStyles.platformCascader} placeholder="平台 / 子平台" options={[
          { label: '淘系', value: '淘系', children: [{ label: '阿里妈妈', value: '阿里妈妈' }, { label: '生意参谋', value: '生意参谋' }] },
        ]} /> : null}
        <Input.Group compact className={`${pageStyles.keywordSearchGroup} qsb-arco-composite-search`}>
          <Select className={pageStyles.keywordFieldSelect} value={searchField} onChange={setSearchField} options={isStore
            ? [{ label: '店铺名称', value: 'storeName' }, { label: '计划名称', value: 'planName' }]
            : [{ label: '表名称', value: 'tableName' }, { label: '计划名称', value: 'planName' }]} />
          <Input.Search className={pageStyles.keywordSearch} allowClear searchButton={false} value={keyword} onChange={setKeyword}
            placeholder={searchField === 'planName' ? '请输入计划名称' : isStore ? '请输入店铺名称' : '请输入表中文/表英文'} />
        </Input.Group>
        {!isStore ? <Input.Search className={pageStyles.connectorSearch} allowClear searchButton={false} placeholder="请输入数据源名称" /> : null}
        <div className={pageStyles.statusRefreshGroup}>
          <Select className={pageStyles.statusSelect} allowClear placeholder="状态筛选" options={statusFilterOptions} value={status} onChange={setStatus} />
          <Tooltip content="刷新">
            <Button className={pageStyles.iconButton} aria-label="预览刷新" icon={<IconRefresh />} onClick={() => setRefreshed(true)} />
          </Tooltip>
        </div>
      </div>
      {hasResult ? <Table pagination={false} borderCell data={[{ key: 'result', name: isStore ? '示例店铺' : '订单履约费用明细', plan: '示例订单计划' }]}
        columns={[{ title: isStore ? '店铺名称' : '表中文名称', dataIndex: 'name' }, { title: '关联计划', dataIndex: 'plan' }]} />
        : <Empty description="暂无符合条件的监控记录" />}
      {refreshed ? <span role="status" className={styles.feedback}>已刷新，当前筛选已保留</span> : null}
    </div>
  );
}

function RefreshAfterPreview() {
  const [status, setStatus] = useState<DateStatus>();
  const [refreshed, setRefreshed] = useState(false);
  return (
    <div className={styles.preview}>
      <div className={styles.refreshRow}>
        <Select
          allowClear
          placeholder="状态筛选"
          aria-label="预览状态筛选"
          options={statusFilterOptions}
          value={status}
          onChange={setStatus}
        />
        <Tooltip content="刷新">
          <Button
            className={pageStyles.iconButton}
            aria-label="预览刷新"
            icon={<IconRefresh />}
            onClick={() => setRefreshed(true)}
          />
        </Tooltip>
      </div>
      {refreshed ? <p role="status">预览已刷新，保留当前筛选。</p> : null}
    </div>
  );
}

function StatusAfterPreview({ dimension }: { dimension: 'store' | 'table' }) {
  const [detail, setDetail] = useState<string>();
  const objectName = dimension === 'store' ? '订单履约费用明细' : '示例店铺 A';
  const examples: Array<{ status: DateStatus; reason: string }> = [
    { status: 'failed', reason: '数据入库 · 1001：字段映射缺失（示例）' },
    { status: 'abnormal', reason: '取数执行 · 1201：店铺无权限登录（示例）' },
    { status: 'waiting', reason: '数据校验尚未结束，且不存在失败或异常（示例）' },
    { status: 'success', reason: '数据已入库，表校验全部通过（示例）' },
    { status: 'noTask', reason: '当前业务日期下全部明细均无实际任务（示例）' },
  ];
  return (
    <div className={styles.preview}>
      <Table
        className={pageStyles.table}
        rowKey="status"
        showHeader={false}
        pagination={false}
        data={examples}
        columns={[
          {
            title: '状态', dataIndex: 'status', width: 240, align: 'left',
            render: (_: DateStatus, item: typeof examples[number]) => (
              <DateStatusCell
                value={item}
                reasons={item.status === 'failed' ? [
                  `${objectName}｜${item.reason}`,
                  `${dimension === 'store' ? '商品货款结算明细' : '示例店铺 B'}｜取数执行 · 2101：平台请求失败（示例）`,
                  `${dimension === 'table' ? '示例店铺 C｜' : ''}示例订单计划｜计划运行超时：本次阈值 60 分钟，已运行 61 分钟`,
                ] : [item.reason]}
                onClick={item.status === 'noTask' ? undefined : () => setDetail(item.reason)}
              />
            ),
          },
        ]}
      />
      {detail ? <p role="status">明细预览：{detail}</p> : null}
    </div>
  );
}

function DetailComparison({ dimension }: { dimension: 'store' | 'table' }) {
  const isStore = dimension === 'store';
  const label = isStore ? '店铺下钻' : '数据表下钻';
  const rows = [0, 1].map((index) => ({
    key: `${dimension}-${index}`, ...monitoringPlatformExamples.天猫,
    bizDateRange: mockExecutionDateRange('2026-07-14', isStore ? index : 0), dataCycle: '日',
    tableName: isStore && index ? '商品货款结算明细' : '订单履约费用明细',
    tableNameEn: isStore && index ? 'goods_settlement_detail' : 'order_fulfillment_fee_detail',
    connectorName: isStore && index ? '商品结算数据源' : '订单履约数据源',
    storeName: !isStore && index ? '示例店铺 B' : '示例店铺 A',
    taskName: `示例采集任务 ${index + 1}`, storageLocation: '取数宝数据仓 / ods',
    storageTableName: isStore && index ? 'ods_goods_settlement' : 'ods_order_fulfillment',
    collectStatus: '成功', collectNoData: index === 1, importStatus: index ? '成功' : '失败',
    validationStatus: index ? '无数据' : '无任务', durationSeconds: index ? 168 : 312,
    expectedImportTime: '2026-07-15 08:30:00', actualImportTime: index ? '2026-07-15 08:36:18' : '-',
  }));
  return (
    <div className={styles.comparison}>
      <h5>Before · 线上{label}</h5>
      <BeforeScreenshot
        src={`/etl-monitoring-before/${dimension}-detail-20260831.jpg`}
        label={`线上${label}的标题、表头与明细`}
        crop={{ x: 276, y: 148, width: 1640, height: isStore ? 265 : 180 }}
      />
      <h5>After · {label}字段预览</h5>
      <Table
        className={pageStyles.table}
        rowKey="key"
        borderCell
        pagination={false}
        scroll={{ x: 2920 }}
        data={rows}
        columns={detailColumnOptions.map(({ key, label: title }) => ({
          title, dataIndex: key, width: key === 'bizDateRange' ? 220 : key === 'collectStatus' ? 160 : key.endsWith('Status') ? 132 : 170,
          align: 'left',
          ...(!isStore ? { onCell: (_: typeof rows[number], index: number) => ({ rowSpan: detailRowSpans(rows, key)[index] }) } : {}),
          ...(key === 'operation' ? { fixed: 'right' as const } : {}),
          render: (value: string, record: typeof rows[number]) => {
            if (key.endsWith('Status')) {
              return <div className={pageStyles.detailStatusCell}><StageStatusTag status={value as StageStatus} stage={key as DetailStageField} noData={key === 'collectStatus' && record.collectNoData} reason={value === '失败' ? '数据入库 · 1001：字段映射缺失（示例）' : undefined} /></div>;
            }
            if (key === 'operation') return <DetailRowActions key={record.key} record={record} />;
            return value;
          },
        }))}
      />
    </div>
  );
}

function DetailControlsComparison({ kind }: { kind: string }) {
  const [filters, setFilters] = useState(defaultDetailFilter);
  const [active, setActive] = useState('store');
  const [views, setViews] = useState([
    { id: 'store', name: '全量店铺', dimension: 'store' as const, scope: 'all' as const, selectedValues: [] },
    { id: 'table', name: '全量数据表', dimension: 'table' as const, scope: 'all' as const, selectedValues: [] },
  ]);
  const [returned, setReturned] = useState(false);
  const tabs = kind === 'view-tabs';
  const heading = kind === 'detail-heading';
  return <div className={styles.comparison}>
    <h5>Before · 线上{tabs ? '线框页签' : heading ? '返回箭头、标题与文本日期' : '店铺下钻搜索表名入口'}</h5>
    <BeforeScreenshot src="/etl-monitoring-before/store-detail-20260831.jpg"
      label={tabs ? '旧版页签' : heading ? '旧版下钻标题' : '旧版店铺下钻搜索'}
      crop={tabs ? { x: 276, y: 92, width: 550, height: 48 } : heading ? { x: 276, y: 145, width: 650, height: 42 } : { x: 276, y: 187, width: 460, height: 48 }} />
    {!tabs && !heading ? <>
      <BeforeScreenshot src="/etl-monitoring-before/table-detail-20260831.jpg" label="旧版数据表下钻工具栏" crop={{ x: 276, y: 145, width: 1640, height: 92 }} />
    </> : null}
    <h5>After · {tabs ? '圆角页签' : heading ? '文字返回与蓝色日期标签' : '组合搜索与分阶段状态筛选'}</h5>
    <div className={styles.scroll}>
      <div style={{ width: tabs ? 640 : heading ? 520 : 720, padding: '8px 0' }}>
        {tabs ? <ViewTabs views={views} activeViewId={active} onChange={setActive} onClose={id => {
          setViews(current => current.filter(view => view.id !== id));
          if (active === id) setActive('list');
        }} /> : heading ? <DetailHeading title="示例店铺" date="2026-07-14" onBack={() => setReturned(true)} />
          : <DetailFilters value={filters} onChange={setFilters} />}
      </div>
    </div>
    {returned ? <p role="status">预览：返回所属监控视图。</p> : null}
  </div>;
}

function FieldNamesComparison() {
  return <div className={styles.comparison}>
    <Table pagination={false} borderCell columns={[{ title: 'Before', dataIndex: 'before' }, { title: 'After', dataIndex: 'after' }]}
      data={[
        { key: 'source', before: '连接器名称（连接器）', after: '数据源' },
        { key: 'platform', before: '平台名称', after: '子平台' },
        { key: 'store', before: '店铺名称', after: '店铺' },
        { key: 'plan', before: '关联任务名', after: '关联计划' },
        { key: 'result', before: '执行结果', after: '前端不展示' },
      ]} />
  </div>;
}

function ColumnSettingsComparison() {
  const [order, setOrder] = useState<string[]>(detailColumnOptions.map(option => option.key));
  const [visible, setVisible] = useState<string[]>(detailColumnOptions.map(option => option.key));
  const previewKeys = order.filter(key => visible.includes(key)).slice(0, 6);
  if (visible.includes('operation') && !previewKeys.includes('operation')) previewKeys.push('operation');
  const row = {
    key: 'preview', channel: '淘系', platform: '阿里妈妈', bizDateRange: '2026-07-08 至 2026-07-14',
    dataCycle: '日', tableName: '订单履约费用明细', tableNameEn: 'order_fulfillment_fee_detail',
    connectorName: '订单履约数据源', storeName: '示例店铺', taskName: '示例订单计划', operation: '日志',
  };
  return <div className={styles.comparison}>
    <h5>Before</h5>
    <BeforeScreenshot src="/etl-monitoring-before/store-detail-20260831.jpg" label="线上列表筛选入口" crop={{ x: 1740, y: 198, width: 175, height: 40 }} />
    <h5>After</h5>
    <div className={styles.columnSettingsPreview}>
      <DetailColumnSettings options={detailColumnOptions} order={order} visible={visible} onOrderChange={setOrder} onVisibleChange={setVisible} />
      <Table pagination={false} borderCell scroll={{ x: 820 }} data={[row]} columns={previewKeys.map(key => {
        const option = detailColumnOptions.find(item => item.key === key)!;
        return { title: option.label, dataIndex: key, width: key === 'bizDateRange' ? 180 : 140, align: 'left' as const };
      })} />
    </div>
  </div>;
}

function createRetryConsistencyAttempt(retryKind: RetryKind): EffectiveRetryAttempt {
  return retryKind === 'collect' ? {
    version: 1,
    lifecycle: 'completed',
    retryKind,
    collectStatus: '失败',
    importStatus: '无任务',
    validationStatus: '无任务',
    issueStage: '取数执行',
    reason: '平台请求失败',
    durationSeconds: '--',
    actualImportTime: '--',
  } : {
    version: 1,
    lifecycle: 'completed',
    retryKind,
    collectStatus: '成功',
    importStatus: '失败',
    validationStatus: '无任务',
    issueStage: '数据入库',
    reason: '字段映射缺失',
    durationSeconds: '--',
    actualImportTime: '--',
  };
}

function RetryConsistencyPreview() {
  const [dimension, setDimension] = useState<'store' | 'table'>('store');
  const [retryKind, setRetryKind] = useState<RetryKind>('collect');
  const [currentAttempt, setCurrentAttempt] = useState<EffectiveRetryAttempt>(() => createRetryConsistencyAttempt('collect'));
  const [feedback, setFeedback] = useState<{ content: string; type: 'error' | 'info' | 'success' }>();
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const reset = (nextKind = retryKind) => {
    const initial = createRetryConsistencyAttempt(nextKind);
    setCurrentAttempt(initial);
    setFeedback(undefined);
    setRefreshFailed(false);
    setHistory([]);
  };
  const handleRetryKindChange = (nextKind: RetryKind) => {
    setRetryKind(nextKind);
    reset(nextKind);
  };
  const acceptRetry = () => {
    if (currentAttempt.lifecycle === 'waiting' || !availableRetryKinds(currentAttempt).includes(retryKind)) return;
    const accepted = acceptRetryAttempt(currentAttempt, retryKind);
    setCurrentAttempt(accepted);
    setRefreshFailed(false);
    setFeedback({ type: 'info', content: `已受理重试，当前行与父表进入等待（V${accepted.version}）。` });
    setHistory(items => [...items, `V${currentAttempt.version} 已移至日志。`]);
  };
  const completeRetry = (outcome: RetryOutcome) => {
    if (currentAttempt.lifecycle !== 'waiting') return;
    const settled = settleRetryAttempt(currentAttempt, currentAttempt.version, outcome);
    if (settled === currentAttempt) return;
    setCurrentAttempt(settled);
    setRefreshFailed(false);
    setFeedback(outcome === 'success'
      ? { type: 'success', content: '完成成功，当前行与父表同步更新。' }
      : { type: 'error', content: '完成失败，当前行与父表同步保留失败。' });
  };
  const submitFailure = () => {
    setRefreshFailed(false);
    setFeedback({ type: 'error', content: '提交失败，请重试；当前有效执行未变。' });
  };
  const showRefreshFailure = () => {
    setRefreshFailed(true);
    setFeedback(undefined);
  };
  const parentStatus = aggregateTaskFinalStatus([currentAttempt]);
  const retryKinds = availableRetryKinds(currentAttempt);
  const isWaiting = currentAttempt.lifecycle === 'waiting';
  const canAccept = !isWaiting && retryKinds.includes(retryKind);
  const acceptanceHint = isWaiting
    ? '已受理，等待完成结果。'
    : canAccept
      ? '可受理当前失败阶段的重试。'
      : '当前已成功或阶段不匹配，需重置后重新演示。';
  const parentObject = dimension === 'store' ? '示例店铺 A' : '订单履约费用明细';
  const detailObject = dimension === 'store' ? '订单履约费用明细' : '示例店铺 A';

  return (
    <div className={`${styles.preview} ${styles.retryConsistencyPreview}`}>
      <div className={styles.retryControls}>
        <Select value={dimension} aria-label="下钻维度" onChange={(value) => setDimension(value as 'store' | 'table')} options={[
          { label: '店铺下钻', value: 'store' },
          { label: '数据表下钻', value: 'table' },
        ]} />
        <Select value={retryKind} aria-label="重试阶段" onChange={(value) => handleRetryKindChange(value as RetryKind)} options={[
          { label: '重试采集', value: 'collect' },
          { label: '重试入库', value: 'import' },
        ]} />
        <Button size="mini" type="primary" disabled={!canAccept} onClick={acceptRetry}>受理重试</Button>
        <Button size="mini" type="primary" disabled={!isWaiting} onClick={() => completeRetry('success')}>完成：成功</Button>
        <Button size="mini" status="danger" disabled={!isWaiting} onClick={() => completeRetry('failure')}>完成：失败</Button>
        <Button size="mini" disabled={isWaiting} onClick={submitFailure}>提交失败</Button>
        <Button size="mini" onClick={showRefreshFailure}>刷新失败</Button>
        <Button size="mini" type="text" onClick={() => reset()}>重置</Button>
      </div>
      <p className={styles.retryHint}>{acceptanceHint}</p>
      <div className={styles.retrySummary}>
        <span>父表聚合</span>
        <DateStatusCell value={{ status: parentStatus }} />
        <span>当前有效尝试 V{currentAttempt.version}</span>
      </div>
      <div className={styles.retryStages}>
        <span>父对象：{parentObject}</span>
        <span>明细对象：{detailObject}</span>
        <span className={styles.retryStage}><span>取数执行</span><StageStatusTag status={currentAttempt.collectStatus} stage="collectStatus" reason={currentAttempt.issueStage === '取数执行' ? currentAttempt.reason : undefined} /></span>
        <span className={styles.retryStage}><span>数据入库</span><StageStatusTag status={currentAttempt.importStatus} stage="importStatus" reason={currentAttempt.issueStage === '数据入库' ? currentAttempt.reason : undefined} /></span>
        <span className={styles.retryStage}><span>数据校验</span><StageStatusTag status={currentAttempt.validationStatus} stage="validationStatus" /></span>
      </div>
      <p className={styles.retryBoundary}>稳定行不新增明细；仅同版本回包可更新当前状态，旧尝试仅保留在日志。</p>
      <p className={styles.retryHistory}>日志：{history.length ? history.join(' ') : '尚无历史尝试。'}</p>
      {feedback ? <Alert className={styles.retryFeedback} type={feedback.type} showIcon content={feedback.content} /> : null}
      {refreshFailed ? <Alert className={styles.retryRefreshFailure} type="error" showIcon content={<span>刷新失败，已保留最后确认状态。<Button size="mini" type="text" onClick={() => setRefreshFailed(false)}>重试刷新</Button></span>} /> : null}
    </div>
  );
}

export function EtlAnnotationComparison({ kind }: { kind: string }) {
  if (['view-tabs', 'detail-heading', 'detail-filters'].includes(kind)) return <DetailControlsComparison kind={kind} />;
  if (kind === 'store-filters' || kind === 'table-filters') return <SummaryFiltersPreview dimension={kind === 'store-filters' ? 'store' : 'table'} />;
  if (kind === 'detail-field-names') return <FieldNamesComparison />;
  if (kind === 'detail-column-settings') return <ColumnSettingsComparison />;
  if (kind === 'retry-consistency') return <RetryConsistencyPreview />;
  if (kind === 'detail-actions') return <Table pagination={false} columns={[
    { title: '店铺', dataIndex: 'storeName', align: 'left' },
    { title: '取数执行', dataIndex: 'collectStatus', align: 'left', render: (status, record) => <StageStatusTag status={status} stage="collectStatus" noData={record.noData} reason={record.reason} /> },
    { title: '操作', align: 'left', render: (_, record) => <DetailRowActions record={record} /> },
  ]} data={[
    { key: 'failed', taskName: '示例计划', storeName: '示例店铺 A', bizDateRange: '2026-07-08 至 2026-07-14', collectStatus: '失败', importStatus: '无任务', reason: '平台请求失败' },
    { key: 'success', taskName: '示例计划', storeName: '示例店铺 B', bizDateRange: '2026-07-08 至 2026-07-14', collectStatus: '成功', importStatus: '成功', noData: true },
  ]} />;
  if (kind === 'store-detail' || kind === 'table-detail') {
    return <DetailComparison dimension={kind === 'store-detail' ? 'store' : 'table'} />;
  }
  if (kind === 'store-columns') {
    return (
      <div className={styles.comparison}>
        <h5>Before · 线上列表字段</h5>
        <BeforeScreenshot src={beforeStore} label="线上店铺维度表头" crop={{ x: 276, y: 204, width: 1120, height: 42 }} />
        <h5>After · 本次前四列</h5>
        <div className={styles.scroll} tabIndex={0} aria-label="新版前四列预览，可横向滚动">
          <Table
            className={`${pageStyles.table} ${styles.headerTable}`}
            columns={Object.entries(storeMonitorColumnLabels).map(([key, title]) => ({
              title, dataIndex: key,
            }))}
            data={[{
              key: 'preview', ...monitoringPlatformExamples.天猫, storeName: '示例店铺',
              relatedTasks: '订单明细采集',
            }]}
            pagination={false}
            borderCell
          />
        </div>
      </div>
    );
  }
  if (kind === 'store-refresh') {
    return (
      <div className={styles.comparison}>
        <h5>Before · 线上工具栏</h5>
        <BeforeScreenshot src={beforeStore} label="线上完整工具栏，未见独立刷新按钮" crop={{ x: 276, y: 147, width: 1640, height: 47 }} />
        <h5>After · 刷新在状态筛选右侧</h5>
        <RefreshAfterPreview />
      </div>
    );
  }
  if (kind === 'store-status' || kind === 'table-status') {
    const dimension = kind === 'store-status' ? 'store' : 'table';
    return (
      <div className={styles.comparison}>
        {dimension === 'store' ? <>
          <h5>Before · 日期格以图标显示</h5>
          <BeforeScreenshot src={beforeStore} label="线上店铺日期单元格中的失败、成功和提醒图标" crop={{ x: 1028, y: 204, width: 590, height: 138 }} />
          <h5>After · 状态、原因与下钻</h5>
        </> : <h5>数据表维度 · 状态、原因与下钻</h5>}
        <StatusAfterPreview dimension={dimension} />
      </div>
    );
  }
  if (kind === 'status-help') {
    return (
      <div className={styles.comparison}>
        <h5>Before · 线上浮层与原文</h5>
        <BeforeScreenshot src={beforeHelp} label="线上状态说明浮层右侧被视口裁切" crop={{ x: 1632, y: 150, width: 327, height: 225 }} />
        <h5>After · 下方展开，右边缘对齐</h5>
        <div className={styles.preview}>
          <div className={styles.helpTrigger}>
            <Tooltip content={<StatusHelpContent />} position="br">
              <Button className={pageStyles.iconButton} aria-label="预览状态说明" icon={<IconInfoCircle />} />
            </Tooltip>
          </div>
          <div className={styles.helpPanel}><StatusHelpContent /></div>
        </div>
      </div>
    );
  }
  return null;
}
