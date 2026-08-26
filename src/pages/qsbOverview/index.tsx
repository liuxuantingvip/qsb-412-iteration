import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button, Message, Tooltip } from '@arco-design/web-react';
import { IconApps, IconFullscreen, IconFullscreenExit, IconRobot } from '@arco-design/web-react/icon';
import { BookOpen, Computer, Data, FileText, Robot, Shop } from '@icon-park/react';
import '@icon-park/react/styles/index.css';
import type { IAreaChartSpec, ILinearProgressChartSpec, IPieChartSpec } from '@visactor/react-vchart';
import logo from '@/assets/images/qsb-logo.svg';
import styles from './index.module.less';
import { buildDataCompletionSpec, buildDataOverviewDonutSpec, buildOverviewRunFilters, buildOverviewRunTrendSpec, buildOverviewViewModel, buildSemiSparklineSpec, buildWeeklyRobotLayout, calculateRate, formatOverviewAnnouncementDate, getOverviewRobotSchedules, getOverviewScheduleAxis, getOverviewScheduleBlockPosition, overviewAccountSummary, overviewAnomalyGroups, overviewAnomalySummary, overviewAnnouncements, overviewAssets, overviewCopy, overviewDataSnapshotIntervalMs, overviewDataSnapshots, overviewPendingStoreDetails, overviewRunMetricsByPeriod, overviewScheduleViews, overviewStoreDelivery } from './overviewContent';
import type { OverviewPeriodKey, OverviewRunFilters, OverviewScheduleViewKey } from './overviewContent';

const MetricSparklineChart = lazy(() => import('./OverviewCharts').then((module) => ({ default: module.MetricSparklineChart })));
const DistributionChart = lazy(() => import('./OverviewCharts').then((module) => ({ default: module.DistributionChart })));
const ProgressChart = lazy(() => import('./OverviewCharts').then((module) => ({ default: module.ProgressChart })));
const RunTrendDataChart = lazy(() => import('./OverviewCharts').then((module) => ({ default: module.RunTrendDataChart })));

interface QsbOverviewProps { onViewRuns?: (filters: OverviewRunFilters) => void }

const HELP_CENTER_URL = 'https://help.shizai.com/';
const numberFormatter = new Intl.NumberFormat('zh-CN');
const assetPresentation = {
  stores: { title: '店铺', icon: <Shop theme="outline" size={16} fill="currentColor" /> },
  connectors: { title: '连接器', icon: <Data theme="outline" size={16} fill="currentColor" /> },
  cloud: { title: '云桌面', icon: <Computer theme="outline" size={16} fill="currentColor" /> },
  robots: { title: '机器人', icon: <Robot theme="outline" size={16} fill="currentColor" /> },
} as const;
const assets = overviewAssets.map((item) => ({ ...item, ...assetPresentation[item.key] }));

function AssetItem({ title, used, total, icon }: { title: string; used: number; total: number; icon: ReactNode }) {
  return <div className={styles.assetItem}><span className={styles.assetIcon}>{icon}</span><strong>{used}/{total}</strong><span>{title}</span></div>;
}

function Donut({ value, label, spec }: { value: string; label: string; spec: IPieChartSpec }) {
  return <div className={styles.donut}><Suspense fallback={null}><DistributionChart spec={spec} /></Suspense><div><strong>{value}</strong><span>{label}</span></div></div>;
}

function PendingDeliveryTooltip() {
  return <ol className={styles.pendingTooltip}>{overviewPendingStoreDetails.map((store) => <li key={store.storeName}><strong>{store.storeName}</strong><ul>{store.plans.map((plan) => <li key={plan.planName}>{plan.planName} · {plan.errorDetail}</li>)}</ul></li>)}</ol>;
}

export default function QsbOverview({ onViewRuns }: QsbOverviewProps) {
  const scheduleViewportRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [period, setPeriod] = useState<OverviewPeriodKey>('daily');
  const [scheduleView, setScheduleView] = useState<OverviewScheduleViewKey>('robot');
  const [dataSnapshotIndex, setDataSnapshotIndex] = useState(0);
  const [selectedAnomalyKey, setSelectedAnomalyKey] = useState<(typeof overviewAnomalyGroups)[number]['key']>('login');
  const selectedAnomalyGroup = overviewAnomalyGroups.find((item) => item.key === selectedAnomalyKey) ?? overviewAnomalyGroups[0];
  const selectedPeriodMetrics = overviewRunMetricsByPeriod[period];
  const overviewView = useMemo(() => buildOverviewViewModel(period), [period]);
  const dataSnapshot = overviewDataSnapshots[dataSnapshotIndex];
  const valueSpec = useMemo<IAreaChartSpec>(() => buildSemiSparklineSpec(overviewAccountSummary.sparklineValues), []);
  const runTrendDataSpec = useMemo<IAreaChartSpec>(() => buildOverviewRunTrendSpec(period), [period]);
  const selectedRobotSchedules = useMemo(() => getOverviewRobotSchedules(period), [period]);
  const selectedRobotLayouts = useMemo(() => selectedRobotSchedules.map((robot) => period === 'weekly'
    ? buildWeeklyRobotLayout(robot)
    : { rowHeight: 64, blocks: robot.blocks.map((block) => ({ ...block, top: 4, conflictIndex: 0, conflictCount: 1 })) }), [period, selectedRobotSchedules]);
  const selectedScheduleAxis = useMemo(() => getOverviewScheduleAxis(period), [period]);
  const scheduleContentWidth = selectedScheduleAxis.labels.length * selectedScheduleAxis.unitWidth;
  const scheduleStyle = {
    '--schedule-content-width': `${scheduleContentWidth}px`,
    '--schedule-unit-width': `${selectedScheduleAxis.unitWidth}px`,
    '--schedule-unit-count': selectedScheduleAxis.labels.length,
  } as CSSProperties;
  const completionSpec = useMemo<ILinearProgressChartSpec>(() => buildDataCompletionSpec(dataSnapshot.completionRate), [dataSnapshot.completionRate]);
  const deliverySpec = useMemo<IPieChartSpec>(() => buildDataOverviewDonutSpec([
    { type: '已完成', value: dataSnapshot.storeDelivery.completed },
    { type: '重试中', value: dataSnapshot.storeDelivery.retrying },
    { type: '需处理', value: dataSnapshot.storeDelivery.pending },
  ], ['#165dff', '#cdd3df', '#f53f3f']), [dataSnapshot.storeDelivery]);
  const platformSpec = useMemo<IPieChartSpec>(() => buildDataOverviewDonutSpec(
    dataSnapshot.platforms.map((platform) => ({ type: platform.name, value: platform.total })),
  ), [dataSnapshot.platforms]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDataSnapshotIndex((current) => (current + 1) % overviewDataSnapshots.length);
    }, overviewDataSnapshotIntervalMs);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === scheduleViewportRef.current);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === scheduleViewportRef.current) await document.exitFullscreen();
      else await scheduleViewportRef.current?.requestFullscreen();
    }
    catch { Message.warning('当前浏览器未允许进入全屏'); }
  };

  return <div className={styles.page}><div className={styles.dashboard}>
    <aside className={styles.leftRail}>
      <section className={`${styles.card} ${styles.accountCard}`}>
        <img src={logo} alt="取数宝" />
        <div className={styles.companyRow}><h1>森森科技有限公司</h1><span>自用版</span></div>
        <div className={styles.valueRow}><div><strong>{numberFormatter.format(overviewAccountSummary.savedLaborDays)}<small>天</small></strong><span>累计已节省人力</span></div><div className={styles.valueSpark}><Suspense fallback={null}><MetricSparklineChart spec={valueSpec} /></Suspense></div></div>
        <div className={styles.expiry}><i />到期时间：{overviewAccountSummary.expiresAt}<button type="button">续期</button></div>
      </section>
      <section className={`${styles.card} ${styles.assetCard}`}><div className={styles.cardHeading}><h2>我的资产</h2><button type="button">增购</button></div><div className={styles.assetGrid}>{assets.map(({ key, ...item }) => <AssetItem key={key} {...item} />)}</div></section>
      <section className={`${styles.card} ${styles.announcementCard}`}><div className={styles.cardHeading}><h2>公告</h2></div><div className={styles.announcementList}>{overviewAnnouncements.map(({ title, publishedAt }) => <div key={title}><span>{title}</span><time dateTime={publishedAt}>{formatOverviewAnnouncementDate(publishedAt)}</time></div>)}</div></section>
      <section className={`${styles.card} ${styles.resourceCard}`}><h2>资源中心</h2><a href={HELP_CENTER_URL} target="_blank" rel="noreferrer"><BookOpen theme="outline" size={16} fill="currentColor" />帮助文档</a><a href={`${HELP_CENTER_URL}sla`} target="_blank" rel="noreferrer"><FileText theme="outline" size={16} fill="currentColor" />SLA 服务手册</a></section>
    </aside>

    <main className={styles.mainColumn}>
      <section className={`${styles.card} ${styles.runTrendCard}`}>
        <div className={styles.runTrendHeading}><div><h2>{overviewCopy.trendTitle}</h2><span>更新时间：{overviewView.updatedAtLabel}（以小时进行更新）</span></div><div className={styles.periodTabs} role="tablist" aria-label="运行趋势周期">{([['daily', '每日'], ['weekly', '每周'], ['cumulative', '累计']] as const).map(([key, label]) => <button type="button" role="tab" aria-selected={period === key} className={period === key ? styles.active : ''} key={key} onClick={() => setPeriod(key)}>{label}</button>)}</div></div>
        <div className={styles.runMetricGrid}>{selectedPeriodMetrics.metrics.map((item) => <div key={item.key} className={styles.runMetric}><span>{item.label}</span><strong>{numberFormatter.format(item.value)}<small>{item.suffix}</small></strong><span>{selectedPeriodMetrics.comparisonLabel} <b className={item.change > 0 ? styles.up : styles.down}>{item.change > 0 ? '↑' : '↓'} {Math.abs(item.change).toFixed(1)}%</b></span></div>)}</div>
        <div className={styles.trendDivider} />
        <div className={styles.scheduleToolbar}><div className={styles.viewSwitch}>{overviewScheduleViews.map((view) => <Tooltip key={view.key} content={view.label}><button type="button" aria-label={view.label} aria-pressed={scheduleView === view.key} className={scheduleView === view.key ? styles.active : ''} onClick={() => setScheduleView(view.key)}>{view.key === 'data' ? <IconApps /> : <IconRobot />}</button></Tooltip>)}</div>{scheduleView === 'data' ? <div className={styles.dataViewLegend} aria-label="运行数据图例"><span><i className={styles.totalRunLegend} />总运行</span><span><i className={styles.failedRunLegend} />取数失败次数</span><span><i className={styles.ingestedRunLegend} />入库成功次数</span></div> : <div className={styles.scheduleAlert}><i />当机器人超出运行上限时，计划可能将无法按时执行，请合理安排任务</div>}</div>
        <div ref={scheduleViewportRef} className={styles.scheduleViewport}>
          {scheduleView === 'data'
            ? <div className={styles.runTrendDataView} aria-label="运行数据视图"><div className={styles.runTrendDataChart}><Suspense fallback={null}><RunTrendDataChart spec={runTrendDataSpec} /></Suspense></div></div>
            : <div className={styles.schedule} aria-label={`机器人${period === 'daily' ? '每日' : period === 'weekly' ? '每周' : '累计'}运行排期`}><div className={styles.scheduleCanvas} style={scheduleStyle}><div className={styles.scheduleAxis}><span><span>机器人</span><Tooltip content={isFullscreen ? '退出全屏' : '全屏查看'}><Button className={styles.scheduleFullscreenButton} shape="circle" aria-label={isFullscreen ? '退出全屏' : '全屏查看'} icon={isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />} onClick={toggleFullscreen} /></Tooltip></span>{selectedScheduleAxis.labels.map((label) => <time key={label}>{label}</time>)}</div>{selectedRobotSchedules.map((robot, index) => { const layout = selectedRobotLayouts[index]; return <div className={styles.scheduleRow} style={{ height: layout.rowHeight }} key={robot.name}><div className={styles.robotName}><strong>{robot.name}（{robot.planCount} 个计划）</strong>{index < 2 && <span>超限</span>}</div><div className={styles.timeline}>{layout.blocks.map((block, blockIndex) => { const position = getOverviewScheduleBlockPosition(period, block); const isWeekly = period === 'weekly'; const isStacked = isWeekly || (block.stackCount ?? 1) > 1; const conflictOffset = isWeekly ? block.conflictIndex * 4 : 0; const stackedTop = isWeekly ? block.top : 4 + (block.stackIndex ?? 0) * 6; return <div key={`${block.startTime}-${block.label}-${blockIndex}`} className={`${styles.taskBlock} ${isStacked ? styles.stackedTask : ''} ${isWeekly ? styles.weeklyTask : ''} ${styles[block.tone]}`} style={{ left: isStacked ? `calc(${position.left}% + ${8 + conflictOffset}px)` : `${position.left}%`, width: isStacked ? `calc(${position.width}% - ${16 + conflictOffset}px)` : `${position.width}%`, top: isStacked ? `${stackedTop}px` : undefined, zIndex: isStacked ? (isWeekly ? block.conflictIndex + 1 : (block.stackIndex ?? 0) + 1) : undefined }}><strong>{block.label}</strong><span>{block.startTime}~{block.endTime}</span></div>; })}</div></div>; })}</div></div>}
        </div>
      </section>

      <section className={`${styles.card} ${styles.dataOverviewCard}`}>
        <div className={styles.cardHeading}><h2>{overviewCopy.dataOverviewTitle}</h2><button type="button" onClick={() => Message.info('前往新建计划')}>＋ 新建计划</button></div>
        <div className={styles.dataOverviewGrid}><div className={styles.completionBlock}><span>数据完成率</span><strong>{dataSnapshot.completionRate.toFixed(1)}%</strong><div className={styles.completionChart}><Suspense fallback={null}><ProgressChart spec={completionSpec} /></Suspense></div><small>完成数据表：{numberFormatter.format(dataSnapshot.completedSourceCount)}/{numberFormatter.format(dataSnapshot.totalSourceCount)}</small></div><div className={styles.deliveryBlock}><Donut value={String(overviewStoreDelivery.total)} label="今日涉及店铺" spec={deliverySpec} /><div className={styles.compactLegend}><span><i className={styles.blueDot} />已完成：<b>{dataSnapshot.storeDelivery.completed} 店</b></span><span><i />重试中：<b>{dataSnapshot.storeDelivery.retrying} 店</b></span><Tooltip content={<PendingDeliveryTooltip />} position="right"><span className={styles.detailTrigger}><i className={styles.redDot} />需处理：<b>{dataSnapshot.storeDelivery.pending} 店</b></span></Tooltip></div></div><div className={styles.platformBlock}><Donut value={String(dataSnapshot.platformTotal)} label="平台交付情况" spec={platformSpec} /><div className={styles.platformLegend}>{dataSnapshot.platforms.map((platform) => <span key={platform.name}><i />{platform.name}：<b>{calculateRate(platform.total, dataSnapshot.platformTotal).toFixed(1)}%</b></span>)}</div></div></div>
      </section>

      <section className={`${styles.card} ${styles.anomalyCard}`}>
        <div className={styles.anomalySummary}><span>{overviewCopy.anomalyTitle}</span><strong>{overviewView.anomalyRate.toFixed(1)}%</strong><small>异常数据表：{numberFormatter.format(overviewAnomalySummary.abnormalTableCount)}/{numberFormatter.format(overviewAnomalySummary.totalTableCount)}</small><small>比昨日同时段 <b>{overviewView.anomalyChange < 0 ? '↓' : '↑'} {Math.abs(overviewView.anomalyChange).toFixed(1)}%</b></small></div><div className={styles.anomalyDivider} />
        <div className={styles.anomalyDetails}><div className={styles.anomalyTabs} role="tablist" aria-label="异常环节">{overviewAnomalyGroups.map((group) => <button type="button" role="tab" aria-selected={group.key === selectedAnomalyKey} className={group.key === selectedAnomalyKey ? styles.active : ''} key={group.key} onClick={() => setSelectedAnomalyKey(group.key)}>{group.label}</button>)}</div><div className={styles.anomalyRows} role="tabpanel">{selectedAnomalyGroup.rows.map((row) => <div key={row.runRecordKey} className={styles.anomalyRow}><strong title={`${row.platform} · ${row.planName} · ${row.occurredAt}`}>{row.storeName}</strong><span>{row.issueType}</span><span title={row.reason}>{row.reason}</span><button type="button" onClick={() => Message.success('已提交重试')}>重试</button><button type="button" onClick={() => onViewRuns?.(buildOverviewRunFilters(selectedAnomalyGroup, row))}>查看</button></div>)}</div></div>
      </section>
    </main>
  </div></div>;
}
