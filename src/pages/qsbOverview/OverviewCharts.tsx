import {
  AreaChart,
  LineChart,
  LinearProgressChart,
  VChart,
  type IAreaChartSpec,
  type ICommonChartSpec,
  type ILinearProgressChartSpec,
  type ILineChartSpec,
} from '@visactor/react-vchart';

export function SavedHoursChart({ spec }: { spec: IAreaChartSpec }) {
  return <AreaChart spec={spec} />;
}

export function MetricSparklineChart({ spec }: { spec: IAreaChartSpec }) {
  return <AreaChart spec={spec} />;
}

export function RunTrendDataChart({ spec }: { spec: ILineChartSpec }) {
  return <LineChart spec={spec} />;
}

export function PlanIngestionChart({ spec }: { spec: ICommonChartSpec }) {
  return <VChart spec={spec} />;
}

export function ProgressChart({ spec }: { spec: ILinearProgressChartSpec }) {
  return <LinearProgressChart spec={spec} />;
}
