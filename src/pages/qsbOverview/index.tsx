import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button, Empty, Message, Tabs, Tooltip } from '@arco-design/web-react';
import { IconApps, IconFullscreen, IconFullscreenExit, IconLeft, IconRight, IconRobot } from '@arco-design/web-react/icon';
import { BookOpen, FileText } from '@icon-park/react';
import '@icon-park/react/styles/index.css';
import type { ILinearProgressChartSpec, ILineChartSpec } from '@visactor/react-vchart';
import { OverviewAccountContent } from './OverviewAccountContent';
import { OverviewAssetGrid } from './OverviewAssetGrid';
import { RobotOverloadWarning, RobotOverloadBadge } from './RobotOverloadWarning';
import { RunTrendLegendItem, RunTrendLoading } from './RunTrendElements';
import { overviewRunTrendSeries } from './overviewContent';
import { OverviewAnomalyRecord, useWorkRetry } from './AnomalyElements';
import { buildOverviewWorkRecord } from './workRetry';
import { RunRecordDetailDrawer } from '../autoRetryOptimization';
import type { RunRecord } from '../autoRetryOptimization/interface';
import styles from './index.module.less';
import { TrendIndicator } from './TrendIndicator';
import { shouldShowOverviewOverloadWarning } from './overviewContent';
import { buildDataCompletionSpec, buildOverviewMonthlyCalendarDays, buildOverviewRunTrendSpec, buildOverviewTimeCalendarDays, buildOverviewViewModel, canNavigateOverviewScheduleForward, formatOverviewAnnouncementDate, formatOverviewTaskDuration, getOverviewMonthlyRobotSchedules, getOverviewRobotSchedules, getOverviewScheduleAxis, getOverviewTimeEventLayout, overviewAnomalyGroups, overviewAnomalySummary, overviewCalendarHourLabels, overviewCopy, overviewDataSnapshotIntervalMs, overviewDataSnapshots, overviewMonthlyPlanCycleLegend, overviewPeriodOptions, overviewRunMetricsByPeriod, overviewScheduleViews, overviewTimeCalendarAnchorDate } from './overviewContent';
import type { OverviewPeriodKey, OverviewRobotSchedule, OverviewScheduleViewKey } from './overviewContent';

const ProgressChart = lazy(() => import('./OverviewCharts').then((module) => ({ default: module.ProgressChart })));
const RunTrendDataChart = lazy(() => import('./OverviewCharts').then((module) => ({ default: module.RunTrendDataChart })));
const { TabPane } = Tabs;

interface QsbOverviewProps {
  announcements: readonly {
    id: string;
    publishedAt: string;
    range: '全部租户' | '电商取数宝' | '跨境取数宝';
    status: 'published' | 'draft';
    title: string;
  }[];
  onOpenAnnouncement?: (id: string) => void;
  onOpenAnnouncements?: () => void;
}

const HELP_CENTER_URL = 'https://help.shizai.com/';
const numberFormatter = new Intl.NumberFormat('zh-CN');

function AnnouncementTitle({ title }: { title: string }) {
  const titleRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement) return undefined;
    const updateOverflow = () => setOverflow(titleElement.scrollWidth > titleElement.clientWidth);
    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(titleElement);
    return () => observer.disconnect();
  }, [title]);

  const content = <span ref={titleRef}>{title}</span>;
  return overflow ? <Tooltip content={title} trigger={['hover', 'focus']}>{content}</Tooltip> : content;
}

type ScheduleTaskBlock = OverviewRobotSchedule['blocks'][number];

const getScheduleClock = (dateTime: string) => dateTime.match(/(\d{2}:\d{2}(?::\d{2})?)$/)?.[1] ?? dateTime;
const getScheduleTooltipPosition = (columnIndex: number, columnCount: number) => columnCount === 1 ? 'top' : columnIndex <= 1 ? 'right' : columnIndex >= columnCount - 2 ? 'left' : 'top';
const scheduleTooltipTriggerProps = { autoFitPosition: true, boundaryDistance: { left: 16, right: 16, top: 16, bottom: 16 } } as const;
const scheduleTooltipStyle = { width: 'max-content', maxWidth: 'min(660px, calc(100vw - 48px))' } as CSSProperties;

function ScheduleTaskContent({ block, compact = false }: { block: ScheduleTaskBlock; compact?: boolean }) {
  const timeAndDuration = <><time>{getScheduleClock(block.startTime)}~{getScheduleClock(block.endTime)}</time>（{formatOverviewTaskDuration(block.startTime, block.endTime)}）</>;
  if (compact) return <><i /><span>{block.label} {timeAndDuration}</span></>;
  return <><i /><span>{block.label}</span><small>{timeAndDuration}</small></>;
}

function ScheduleTaskTooltip({ block }: { block: ScheduleTaskBlock }) {
  const stores = block.stores ?? [];
  const tables = block.tables ?? [];
  const failed = block.latestWorkResult === 'failed';
  return <div className={styles.scheduleTaskTooltip}>
    <strong>{block.label}</strong>
    <span>运行次数：{block.runCount ?? 0} 次</span>
    <span>最新结果：<b className={failed ? styles.tooltipFailure : styles.tooltipSuccess}>{failed ? `失败（${block.latestWorkErrorCode ?? '未知错误码'}）` : '入库成功'}</b></span>
    <div className={styles.tooltipStores}><span>涉及店铺（{stores.length}）</span><div className={styles.tooltipStoreList}>{stores.length ? stores.map((store, index) => <em key={store}>{store}{index < stores.length - 1 ? '、' : ''}</em>) : <em>暂无</em>}</div></div>
    <div className={styles.tooltipStores}><span>涉及入库表</span><div className={styles.tooltipStoreList}>{tables.length ? tables.map((table, index) => <em key={table}>{table}{index < tables.length - 1 ? '、' : ''}</em>) : <em>暂无</em>}</div></div>
  </div>;
}

export function TimeRobotCalendar({ robots, days, period, isFullscreen, onToggleFullscreen, annotated = true, robotCount = robots.length }: {
  robots: readonly OverviewRobotSchedule[];
  days: ReturnType<typeof buildOverviewTimeCalendarDays>;
  period: 'daily' | 'weekly';
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  annotated?: boolean;
  robotCount?: number;
}) {
  const calendarStyle = { '--calendar-day-count': days.length } as CSSProperties;
  const firstScheduleTask = robots.flatMap((robot) => days.flatMap((day, dayIndex) => (
    robot.blocks
      .filter((block) => period === 'daily' || block.startSlot === dayIndex)
      .map((block) => `${robot.name}:${day.date}:${block.startTime}:${block.label}`)
  )))[0];
  return <div className={`${styles.schedule} ${styles.timeRobotCalendar}`} style={calendarStyle} aria-label={`机器人${period === 'daily' ? '每日' : '每周'}运行日历`}>
    <div className={styles.timeCalendarHeader}>
      <span><span>机器人（{robotCount}）</span><Tooltip content={isFullscreen ? '退出全屏' : '全屏查看'}><Button data-note-id={annotated ? 'QSB-2.3' : undefined} className={styles.scheduleFullscreenButton} shape="circle" aria-label={isFullscreen ? '退出全屏' : '全屏查看'} icon={isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />} onClick={onToggleFullscreen} /></Tooltip></span>
      <small>GMT+08</small>
      <div className={styles.timeCalendarDays}>{days.map((day) => <strong key={day.date}><span>{day.weekday}</span><time dateTime={day.date}>{String(day.day).padStart(2, '0')}</time></strong>)}</div>
    </div>
    {robots.map((robot) => <div className={styles.timeRobotGroup} key={robot.name}>
      <div className={styles.timeRobotName}><strong>{robot.name}</strong><span>{robot.planCount} 个计划</span>{robot.overLimit && <RobotOverloadBadge />}</div>
      <div className={styles.timeCalendarBody}>
        <div className={styles.hourAxis}>{overviewCalendarHourLabels.map((label, hour) => <time key={label} style={{ '--hour-index': hour } as CSSProperties}>{label}</time>)}</div>
        <div className={styles.timeDayColumns}>
          {days.map((day, dayIndex) => <div className={styles.timeDayColumn} key={day.date}>
            {robot.blocks.filter((block) => period === 'daily' || block.startSlot === dayIndex).map((block, blockIndex) => {
              const position = getOverviewTimeEventLayout(block.startTime, block.endTime);
              const scheduleTaskId = `${robot.name}:${day.date}:${block.startTime}:${block.label}`;
              return <Tooltip key={`${block.startTime}-${block.label}-${blockIndex}`} position={getScheduleTooltipPosition(dayIndex, days.length)} triggerProps={scheduleTooltipTriggerProps} style={scheduleTooltipStyle} trigger={['hover', 'focus']} content={<ScheduleTaskTooltip block={block} />}><div
                className={`${styles.scheduleTaskItem} ${styles.timeCalendarEvent} ${position.compact ? styles.compactScheduleTaskItem : ''} ${styles[block.tone]}`}
                data-note-id={annotated && scheduleTaskId === firstScheduleTask ? 'QSB-2.4' : undefined}
                style={{ top: `${position.top}%`, height: `${position.height}%` }}
                title={`${block.label} ${block.startTime}~${block.endTime}`}
                aria-label={`${block.label} ${block.startTime}~${block.endTime}`}
                tabIndex={0}
              ><ScheduleTaskContent block={block} compact={position.compact} /></div></Tooltip>;
            })}
          </div>)}
        </div>
      </div>
    </div>)}
  </div>;
}

export function MonthlyRobotCalendar({ robots, calendarDays, isFullscreen, onToggleFullscreen, annotated = true, robotCount = robots.length }: {
  robots: readonly OverviewRobotSchedule[];
  calendarDays: ReturnType<typeof buildOverviewMonthlyCalendarDays>;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  annotated?: boolean;
  robotCount?: number;
}) {
  const weekdays = getOverviewScheduleAxis('cumulative').labels;
  const firstScheduleTask = robots.flatMap((robot) => calendarDays.flatMap((day) => (
    robot.blocks
      .filter((block) => block.startTime.startsWith(day.date))
      .map((block) => `${robot.name}:${day.date}:${block.startTime}:${block.label}`)
  )))[0];
  return <div className={`${styles.schedule} ${styles.monthlyRobotCalendar}`} aria-label="机器人月度运行排期">
    <div className={styles.monthlyCalendarHeader}>
      <span><span>机器人（{robotCount}）</span><Tooltip content={isFullscreen ? '退出全屏' : '全屏查看'}><Button data-note-id={annotated ? 'QSB-2.3' : undefined} className={styles.scheduleFullscreenButton} shape="circle" aria-label={isFullscreen ? '退出全屏' : '全屏查看'} icon={isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />} onClick={onToggleFullscreen} /></Tooltip></span>
      <div className={styles.monthlyWeekdays}>{weekdays.map((weekday) => <strong key={weekday}>{weekday}</strong>)}</div>
    </div>
    {robots.map((robot) => <div className={styles.monthlyRobotGroup} key={robot.name}>
      <div className={styles.monthlyRobotName}><strong>{robot.name}</strong><span>{robot.planCount} 个计划</span>{robot.overLimit && <RobotOverloadBadge />}</div>
      <div className={styles.monthlyCalendarGrid}>
        {calendarDays.map((day, dayIndex) => {
          const dayTasks = robot.blocks.filter((block) => block.startTime.startsWith(day.date));
          return <div className={`${styles.monthlyDayCell} ${day.inCurrentMonth ? '' : styles.outsideMonth}`} key={day.date}>
            <time dateTime={day.date}>{day.day}</time>
            <div className={styles.monthlyDayTasks}>
              {dayTasks.map((block, taskIndex) => <Tooltip
                key={`${block.startTime}-${block.label}-${taskIndex}`}
                position={getScheduleTooltipPosition(dayIndex % 7, 7)}
                triggerProps={scheduleTooltipTriggerProps}
                style={scheduleTooltipStyle}
                trigger={['hover', 'focus']}
                content={<ScheduleTaskTooltip block={block} />}
              ><div
                  className={`${styles.scheduleTaskItem} ${styles[block.tone]}`}
                  data-note-id={annotated && `${robot.name}:${day.date}:${block.startTime}:${block.label}` === firstScheduleTask ? 'QSB-2.4' : undefined}
                  aria-label={`${block.label} ${block.startTime.slice(-8)}~${block.endTime.slice(-8)}（${formatOverviewTaskDuration(block.startTime, block.endTime)}）`}
                  tabIndex={0}
                ><ScheduleTaskContent block={block} /></div></Tooltip>)}
            </div>
          </div>;
        })}
      </div>
    </div>)}
  </div>;
}

export default function QsbOverview({ announcements, onOpenAnnouncement, onOpenAnnouncements }: QsbOverviewProps) {
  const openAnnouncement = (id: string) => onOpenAnnouncement?.(id);
  const scheduleViewportRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [period, setPeriod] = useState<OverviewPeriodKey>('cumulative');
  const [scheduleView, setScheduleView] = useState<OverviewScheduleViewKey>('robot');
  const [scheduleMonth, setScheduleMonth] = useState({ year: 2026, monthIndex: 7 });
  const [scheduleAnchorDate, setScheduleAnchorDate] = useState(overviewTimeCalendarAnchorDate);
  const [dataSnapshotIndex, setDataSnapshotIndex] = useState(0);
  const [selectedAnomalyKey, setSelectedAnomalyKey] = useState<(typeof overviewAnomalyGroups)[number]['key']>('login');
  const workRetry = useWorkRetry(overviewAnomalyGroups.flatMap((group) => group.rows));
  const anomalyGroups = overviewAnomalyGroups.map((group) => ({ ...group, rows: workRetry.rows.filter((row) => group.rows.some((initial) => initial.workId === row.workId)) }));
  const selectedAnomalyGroup = anomalyGroups.find((item) => item.key === selectedAnomalyKey) ?? anomalyGroups[0];
  const [workDetail, setWorkDetail] = useState<RunRecord | null>(null);
  const visibleAnomalies = selectedAnomalyGroup.rows;
  const selectedPeriodMetrics = overviewRunMetricsByPeriod[period];
  const displayedAnnouncements = useMemo(() => announcements
    .filter((item) => item.status === 'published' && (item.range === '全部租户' || item.range === '电商取数宝'))
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt)), [announcements]);
  const overviewView = useMemo(() => buildOverviewViewModel(period), [period]);
  const dataSnapshot = overviewDataSnapshots[dataSnapshotIndex];
  const runTrendDataSpec = useMemo<ILineChartSpec>(() => buildOverviewRunTrendSpec(period), [period]);
  const selectedRobotSchedules = useMemo(() => period === 'cumulative'
    ? getOverviewMonthlyRobotSchedules(scheduleMonth.year, scheduleMonth.monthIndex)
    : getOverviewRobotSchedules(period), [period, scheduleMonth]);
  const monthlyCalendarDays = useMemo(() => buildOverviewMonthlyCalendarDays(scheduleMonth.year, scheduleMonth.monthIndex), [scheduleMonth]);
  const timeCalendarDays = useMemo(() => buildOverviewTimeCalendarDays(period === 'weekly' ? 'weekly' : 'daily', scheduleAnchorDate), [period, scheduleAnchorDate]);
  const completionSpec = useMemo<ILinearProgressChartSpec>(() => buildDataCompletionSpec(dataSnapshot.completionRate), [dataSnapshot.completionRate]);

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

  useEffect(() => {
    const showDataView = () => setScheduleView('data');
    const showRobotView = () => setScheduleView('robot');
    window.addEventListener('qsb-overview:show-data-view', showDataView);
    window.addEventListener('qsb-overview:show-robot-view', showRobotView);
    return () => {
      window.removeEventListener('qsb-overview:show-data-view', showDataView);
      window.removeEventListener('qsb-overview:show-robot-view', showRobotView);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (isFullscreen) await document.exitFullscreen();
      else await scheduleViewportRef.current?.requestFullscreen();
    }
    catch { Message.warning('当前浏览器未允许进入全屏'); }
  };

  const canNavigateForward = canNavigateOverviewScheduleForward(period, scheduleAnchorDate, scheduleMonth.year, scheduleMonth.monthIndex);
  const shiftScheduleMonth = (offset: number) => setScheduleMonth((current) => {
    if (offset > 0 && !canNavigateForward) return current;
    const nextMonth = new Date(current.year, current.monthIndex + offset, 1);
    return { year: nextMonth.getFullYear(), monthIndex: nextMonth.getMonth() };
  });
  const shiftScheduleDate = (offset: number) => setScheduleAnchorDate((current) => {
    if (offset > 0 && !canNavigateForward) return current;
    const [year, month, day] = current.split('-').map(Number);
    const nextDate = new Date(year, month - 1, day + offset);
    return [nextDate.getFullYear(), String(nextDate.getMonth() + 1).padStart(2, '0'), String(nextDate.getDate()).padStart(2, '0')].join('-');
  });
  const scheduleNavigationLabel = period === 'cumulative'
    ? `${scheduleMonth.year}年${scheduleMonth.monthIndex + 1}月`
    : period === 'daily'
      ? `${timeCalendarDays[0].date.replace(/-(\d{2})-(\d{2})$/, '年$1月$2日')}`
      : `${timeCalendarDays[0].date.slice(0, 4)}年${Number(timeCalendarDays[0].date.slice(5, 7))}月${timeCalendarDays[0].day}日–${timeCalendarDays[6].day}日`;

  return <div className={styles.page}><div className={styles.dashboard}>
    <aside className={styles.leftRail}>
      <section className={`${styles.card} ${styles.accountCard}`} data-note-id="QSB-1.1">
        <OverviewAccountContent />
      </section>
      <section className={`${styles.card} ${styles.assetCard}`} data-note-id="QSB-1.2"><div className={styles.cardHeading}><h2>我的资产</h2><button type="button">增购</button></div><OverviewAssetGrid /></section>
      <section className={`${styles.card} ${styles.announcementCard}`} data-note-id="QSB-1.3"><div className={styles.cardHeading}><h2>公告</h2><Button type="text" size="mini" onClick={onOpenAnnouncements}>更多</Button></div><div className={styles.announcementList}>{displayedAnnouncements.length ? displayedAnnouncements.map(({ id, title, publishedAt }) => <button type="button" key={id} onClick={() => openAnnouncement(id)}><AnnouncementTitle title={title} /><time dateTime={publishedAt}>{formatOverviewAnnouncementDate(publishedAt)}</time></button>) : <div className={styles.announcementEmpty}><Empty description="暂无公告" /></div>}</div></section>
      <section className={`${styles.card} ${styles.resourceCard}`}><h2>资源中心</h2><a href={HELP_CENTER_URL} target="_blank" rel="noreferrer"><BookOpen theme="outline" size={16} fill="currentColor" />帮助文档</a><a href={`${HELP_CENTER_URL}sla`} target="_blank" rel="noreferrer"><FileText theme="outline" size={16} fill="currentColor" />SLA 服务手册</a></section>
    </aside>

    <main className={styles.mainColumn}>
      <section className={`${styles.card} ${styles.runTrendCard}`}>
        <div className={styles.runTrendSummary} data-note-id="QSB-2.1"><div className={styles.runTrendHeading}><div><h2>{overviewCopy.trendTitle}</h2></div><div className={styles.periodTabs} role="tablist" aria-label="运行趋势周期">{overviewPeriodOptions.map(({ key, label }) => <button type="button" role="tab" aria-selected={period === key} className={period === key ? styles.active : ''} key={key} onClick={() => setPeriod(key)}>{label}</button>)}</div></div>
        <div className={styles.runMetricGrid}>{selectedPeriodMetrics.metrics.map((item) => <div key={item.key} className={styles.runMetric}><span>{item.label}</span><strong>{numberFormatter.format(item.value)}<small>{item.suffix}</small></strong><span className={styles.comparisonRow}>{selectedPeriodMetrics.comparisonLabel}<TrendIndicator value={item.change} className={item.change > 0 ? styles.up : styles.down} /></span></div>)}</div></div>
        <div className={styles.trendDivider} />
        <div className={styles.scheduleToolbar}>
          <div className={styles.viewSwitch} data-note-id="QSB-2.2">{overviewScheduleViews.map((view) => <Tooltip key={view.key} content={view.label}><button type="button" aria-label={view.label} aria-pressed={scheduleView === view.key} className={scheduleView === view.key ? styles.active : ''} onClick={() => setScheduleView(view.key)}>{view.key === 'data' ? <IconApps /> : <IconRobot />}</button></Tooltip>)}</div>
          {scheduleView === 'data'
            ? <div className={styles.dataViewLegend} aria-label="运行数据图例">{overviewRunTrendSeries.map((series) => <RunTrendLegendItem key={series.key} seriesKey={series.key} />)}</div>
            : <><div>{shouldShowOverviewOverloadWarning(scheduleView, selectedRobotSchedules) && <RobotOverloadWarning />}</div><div className={styles.scheduleToolbarActions}><div className={styles.monthlyCycleLegend} aria-label="计划周期图例">{overviewMonthlyPlanCycleLegend.map((item) => <span key={item.label}><i className={styles[item.tone]} />{item.label}</span>)}</div><div className={styles.monthNavigator} data-note-id="QSB-2.3" aria-label="排期日期切换"><button type="button" aria-label="上一个周期" onClick={() => period === 'cumulative' ? shiftScheduleMonth(-1) : shiftScheduleDate(period === 'weekly' ? -7 : -1)}><IconLeft /></button><button type="button" aria-label="下一个周期" disabled={!canNavigateForward} onClick={() => period === 'cumulative' ? shiftScheduleMonth(1) : shiftScheduleDate(period === 'weekly' ? 7 : 1)}><IconRight /></button><strong>{scheduleNavigationLabel}</strong></div></div></>}
        </div>
        <div ref={scheduleViewportRef} className={styles.scheduleViewport}>
          {scheduleView === 'data'
              ? <div className={styles.runTrendDataView} data-note-id="QSB-2.5" aria-label="运行数据视图"><div className={styles.runTrendDataChart}><Suspense fallback={<RunTrendLoading />}><RunTrendDataChart spec={runTrendDataSpec} /></Suspense></div></div>
            : period === 'cumulative'
              ? <MonthlyRobotCalendar robots={selectedRobotSchedules} calendarDays={monthlyCalendarDays} isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />
              : <TimeRobotCalendar robots={selectedRobotSchedules} days={timeCalendarDays} period={period} isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />}
        </div>
      </section>

      <section className={`${styles.card} ${styles.completionCard}`}>
        <div className={styles.completionMetrics} data-note-id="QSB-3.1">
          <div className={styles.completionSummary}><span>{overviewCopy.completionTitle}</span><strong>{dataSnapshot.completionRate.toFixed(1)}%</strong><div className={styles.completionChart}><Suspense fallback={null}><ProgressChart spec={completionSpec} /></Suspense></div><small>完成数据表：{numberFormatter.format(dataSnapshot.completedSourceCount)}/{numberFormatter.format(dataSnapshot.totalSourceCount)}</small><small className={styles.comparisonRow}>同比：<TrendIndicator value={dataSnapshot.completionYoYChange} className={dataSnapshot.completionYoYChange >= 0 ? styles.up : styles.down} /></small></div>
          <div className={styles.anomalySummary}><span>{overviewCopy.anomalyTitle}</span><strong>{overviewView.anomalyRate.toFixed(1)}%</strong><small>异常数据表：{numberFormatter.format(overviewAnomalySummary.abnormalTableCount)}/{numberFormatter.format(overviewAnomalySummary.totalTableCount)}</small><small className={styles.comparisonRow}>同比：<TrendIndicator value={overviewView.anomalyChange} className={overviewView.anomalyChange <= 0 ? styles.up : styles.down} /></small></div>
        </div><div className={styles.anomalyDivider} />
        <div className={styles.anomalyDetails} data-note-id="QSB-3.2"><Tabs activeTab={selectedAnomalyKey} className={styles.anomalyTabs} headerPadding={false} type="rounded" onChange={(key) => setSelectedAnomalyKey(key as (typeof overviewAnomalyGroups)[number]['key'])}>{anomalyGroups.map((group) => <TabPane key={group.key} title={`${group.label}（${group.rows.length}）`} />)}</Tabs><div className={styles.anomalyRows} role="tabpanel">{visibleAnomalies.map((row) => <OverviewAnomalyRecord key={row.workId} row={row} state={workRetry.states[row.workId]} recordKey={workRetry.records[row.workId]?.key ?? row.runRecordKey} remainingSeconds={workRetry.remainingSeconds[row.workId]} onRetry={() => void workRetry.retry(row)} onView={() => setWorkDetail(workRetry.records[row.workId] ?? buildOverviewWorkRecord(selectedAnomalyGroup, row))} />)}</div></div>
      </section>
    </main>
  </div><RunRecordDetailDrawer record={workDetail} onClose={() => setWorkDetail(null)} /></div>;
}
