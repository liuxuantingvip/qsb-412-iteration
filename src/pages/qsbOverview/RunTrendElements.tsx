import { Skeleton } from '@arco-design/web-react';
import { formatOverviewTrendValue, overviewRunTrendSeries, overviewTrendTooltipStyle } from './overviewContent';
import styles from './RunTrendElements.module.less';

export function RunTrendLegendItem({ seriesKey }: { seriesKey: (typeof overviewRunTrendSeries)[number]['key'] }) {
  const series = overviewRunTrendSeries.find((item) => item.key === seriesKey)!;
  return <span className={styles.legendItem}><i style={{ background: series.color }} />{series.label}</span>;
}

export function RunTrendLoading() {
  return <div className={styles.loading} aria-label="运行数据图表加载中">
    <Skeleton animation text={{ rows: 5, width: ['90%', '72%', '85%', '62%', '95%'] }} />
  </div>;
}

export function RunTrendTooltipPreview({ date, rows }: { date: string; rows: readonly { metric: string; value: number }[] }) {
  const theme = overviewTrendTooltipStyle;
  return <div role="note" aria-label="运行数据提示浮层示例" className={styles.tooltip} style={{
    padding: theme.panel.padding, background: theme.panel.backgroundColor,
    border: `${theme.panel.border.width}px solid ${theme.panel.border.color}`, borderRadius: theme.panel.border.radius,
    fontSize: theme.keyLabel.fontSize, color: theme.keyLabel.fontColor,
  }}>
    <strong style={{ color: theme.titleLabel.fontColor }}>{date}</strong>
    {rows.map((row) => <div className={styles.tooltipRow} key={row.metric} style={{ marginTop: theme.spaceRow }}>
      <i style={{ background: overviewRunTrendSeries.find((item) => item.label === row.metric)?.color, width: theme.shape.size, height: theme.shape.size }} />
      <span>{row.metric}</span><b style={{ color: theme.valueLabel.fontColor }}>{formatOverviewTrendValue(row.value)}</b>
    </div>)}
  </div>;
}
