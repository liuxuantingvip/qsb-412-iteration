import { lazy, Suspense, useMemo, useState } from 'react';
import { Radio } from '@arco-design/web-react';
import { buildOverviewRunTrendSpec, overviewRunTrendSeries, type OverviewRunTrendPoint } from '@/pages/qsbOverview/overviewContent';
import { RunTrendLegendItem, RunTrendLoading, RunTrendTooltipPreview } from '@/pages/qsbOverview/RunTrendElements';
import styles from './AccountExamples.module.less';

const RunTrendDataChart = lazy(() => import('@/pages/qsbOverview/OverviewCharts').then((module) => ({ default: module.RunTrendDataChart })));

function TrendDataBoundaryExample() {
  const [state, setState] = useState('empty');
  const spec = useMemo(() => {
    const points: OverviewRunTrendPoint[] = state === 'empty' ? [] : [
      { date: '2026-08-19', total: 12 }, { date: '2026-08-21', total: 8 },
      { date: '2026-08-22', total: 10 }, { date: '2026-08-23', total: 6 },
      { date: '2026-08-24', total: 14 }, { date: '2026-08-25', total: 11 },
    ];
    return buildOverviewRunTrendSpec('weekly', points);
  }, [state]);
  return <div className={styles.example}>
    <Radio.Group type="button" size="mini" value={state} onChange={setState} options={[{ label: '全部无数据', value: 'empty' }, { label: '缺失时间点补 0', value: 'gap' }]} />
    <div style={{ display: 'flex', gap: '6px 12px', flexWrap: 'wrap', marginTop: 12 }}>{overviewRunTrendSeries.map((item) => <RunTrendLegendItem key={item.key} seriesKey={item.key} />)}</div>
    <div style={{ height: 210 }} aria-label="运行数据边界示例"><Suspense fallback={<RunTrendLoading />}><RunTrendDataChart spec={spec} /></Suspense></div>
    <span className={styles.caption}>{state === 'empty' ? '保留时间轴和图例，不绘制曲线，也不展示空态或重试按钮。' : '演示数据：8月20日总运行次数缺失，补为0并连线；其他三项整条无数据，不画线。'}</span>
  </div>;
}

export function renderRunTrendExample(key: string) {
  const series = overviewRunTrendSeries.find((item) => key === `trend-legend-${item.key}`);
  if (series) return <div className={styles.example}><RunTrendLegendItem seriesKey={series.key} /></div>;
  if (key === 'trend-chart') return <div className={styles.example}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>{overviewRunTrendSeries.map((item) => <RunTrendLegendItem key={item.key} seriesKey={item.key} />)}</div>
    <div style={{ height: 240 }} aria-label="运行数据趋势实时预览"><Suspense fallback={<RunTrendLoading />}><RunTrendDataChart spec={buildOverviewRunTrendSpec('weekly')} /></Suspense></div>
  </div>;
  if (key === 'trend-loading') return <div className={styles.example}><RunTrendLoading /></div>;
  if (key === 'trend-boundary') return <TrendDataBoundaryExample />;
  if (key === 'trend-tooltip') {
    const date = '2026-08-19';
    const rows = buildOverviewRunTrendSpec('weekly').data[0].values.filter((row) => row.date === date);
    return <div className={styles.example}><RunTrendTooltipPreview date={date} rows={rows} /><span className={styles.caption}>周视图8月19日的示例值；实际浮层显示鼠标所在时间点的数据，单位均为“次”。</span></div>;
  }
  return null;
}
