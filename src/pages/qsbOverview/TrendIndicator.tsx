import { IconArrowFall, IconArrowRise } from '@arco-design/web-react/icon';
import styles from './TrendIndicator.module.less';

interface TrendIndicatorProps {
  value: number;
  className?: string;
}

export function TrendIndicator({ value, className }: TrendIndicatorProps) {
  if (!Number.isFinite(value)) return <span>--</span>;
  const isRising = value >= 0;
  const direction = isRising ? '上升' : '下降';
  const formattedValue = Math.abs(value).toFixed(1);

  return <b className={className ? `${styles.root} ${className}` : styles.root} aria-label={`${direction} ${formattedValue}%`}>
    {isRising ? <IconArrowRise aria-hidden /> : <IconArrowFall aria-hidden />}
    <span aria-hidden>{formattedValue}%</span>
  </b>;
}
