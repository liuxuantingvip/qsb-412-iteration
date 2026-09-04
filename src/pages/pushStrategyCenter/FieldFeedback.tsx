import { Button } from '@arco-design/web-react';
import { IconExclamationCircleFill } from '@arco-design/web-react/icon';
export function FieldFeedback({ message, onRetry, retryLabel = '重新查询' }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, color: 'var(--color-danger-light-4, #f53f3f)', fontSize: 12 }}>
    <IconExclamationCircleFill aria-hidden /><span>{message}</span>
    {onRetry && <Button type="text" size="mini" onClick={onRetry}>{retryLabel}</Button>}
  </div>;
}
