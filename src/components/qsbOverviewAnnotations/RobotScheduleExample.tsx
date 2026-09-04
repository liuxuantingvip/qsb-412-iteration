import { useEffect, useRef, useState } from 'react';
import { Button, Message, Modal, Radio } from '@arco-design/web-react';
import { IconLeft, IconRight } from '@arco-design/web-react/icon';
import { MonthlyRobotCalendar, TimeRobotCalendar } from '@/pages/qsbOverview';
import { buildOverviewMonthlyCalendarDays, buildOverviewTimeCalendarDays, getOverviewMonthlyRobotSchedules, getOverviewRobotSchedules, overviewPeriodOptions, overviewTimeCalendarAnchorDate, type OverviewPeriodKey } from '@/pages/qsbOverview/overviewContent';
import pageStyles from '@/pages/qsbOverview/index.module.less';
import styles from './RobotScheduleExample.module.less';

function CalendarPreview({ period, expanded = false }: { period: OverviewPeriodKey; expanded?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, element.clientWidth / 1180)));
    observer.observe(element);
    const update = () => setFullscreen(document.fullscreenElement === element);
    document.addEventListener('fullscreenchange', update);
    return () => { observer.disconnect(); document.removeEventListener('fullscreenchange', update); };
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (fullscreen) await document.exitFullscreen();
      else await host.current?.requestFullscreen();
    } catch { Message.warning('当前浏览器未允许进入全屏'); }
  };
  const month = new Date(2026, 7 + offset, 1);
  const anchor = new Date(`${overviewTimeCalendarAnchorDate}T12:00:00+08:00`);
  anchor.setDate(anchor.getDate() + offset * (period === 'weekly' ? 7 : 1));
  const date = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
  const days = buildOverviewTimeCalendarDays(period === 'weekly' ? 'weekly' : 'daily', date);
  const title = period === 'cumulative' ? `${month.getFullYear()}年${month.getMonth() + 1}月` : period === 'weekly' ? `${days[0].date} ～ ${days[6].date}` : days[0].date;
  const fullSize = expanded || fullscreen;
  const robots = period === 'cumulative' ? getOverviewMonthlyRobotSchedules(month.getFullYear(), month.getMonth()) : getOverviewRobotSchedules(period);
  const effectiveScale = fullSize ? 1 : scale;
  return <div ref={host} className={styles.host} aria-label={`${overviewPeriodOptions.find((item) => item.key === period)?.label}机器人排期预览`}>
    <div className={pageStyles.monthNavigator} aria-label="示例排期日期切换">
      <button type="button" aria-label="示例上一个周期" onClick={() => setOffset((value) => value - 1)}><IconLeft /></button>
      <button type="button" aria-label="示例下一个周期" disabled={offset === 0} onClick={() => setOffset((value) => Math.min(0, value + 1))}><IconRight /></button>
      <strong>{title}</strong>
    </div>
    <div className={styles.frame} style={{ height: fullSize ? '70vh' : 1040 * effectiveScale }}>
      <div className={styles.canvas} style={{ width: fullSize ? '100%' : 1180, height: fullSize ? '100%' : 1040, transform: `scale(${effectiveScale})` }}>
        {period === 'cumulative'
          ? <MonthlyRobotCalendar robots={robots.slice(0, 1)} robotCount={robots.length} calendarDays={buildOverviewMonthlyCalendarDays(month.getFullYear(), month.getMonth())} isFullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} annotated={false} />
          : <TimeRobotCalendar robots={robots.slice(0, 1)} robotCount={robots.length} days={days} period={period} isFullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} annotated={false} />}
      </div>
    </div>
  </div>;
}

export function RobotScheduleExample() {
  const [period, setPeriod] = useState<OverviewPeriodKey>('daily');
  const [expanded, setExpanded] = useState(false);
  return <div className={styles.example}>
    <div className={styles.controls}>
      <Radio.Group type="button" size="mini" aria-label="机器人预览周期" value={period} onChange={setPeriod} options={overviewPeriodOptions.map((item) => ({ label: item.label, value: item.key }))} />
      <Button type="text" size="mini" onClick={() => setExpanded(true)}>放大查看</Button>
    </div>
    <CalendarPreview key={period} period={period} />
    <p>真实组件预览：展示首台机器人，可切换周期、前后翻页、悬浮查看计划。窄侧栏按比例缩小，放大后可滚动查看全部内容；不改变左侧概览。</p>
    <Modal title="机器人排期预览" visible={expanded} style={{ width: 'min(1240px, calc(100vw - 48px))' }} footer={null} onCancel={() => setExpanded(false)} unmountOnExit>
      <Radio.Group type="button" size="small" aria-label="放大机器人预览周期" value={period} onChange={setPeriod} options={overviewPeriodOptions.map((item) => ({ label: item.label, value: item.key }))} />
      <CalendarPreview key={period} period={period} expanded />
    </Modal>
  </div>;
}
