import { useState } from 'react';
import { Button, Dropdown, Menu, Message, Modal, Space } from '@arco-design/web-react';
import { canRetryDetail } from './detailModel';
import { availableRetryKinds } from './retryConsistency';
import type { RetryKind } from './retryConsistency';
import type { RetryPhase } from './useRetrySimulation';
import styles from './index.module.less';

export interface DetailActionRecord {
  key: string;
  taskName: string;
  storeName: string;
  bizDateRange: string;
  collectStatus: string;
  importStatus: string;
  validationStatus?: string;
  issueStage?: '取数执行' | '数据入库' | '数据校验';
  errorCode?: string;
  reason?: string;
  durationSeconds?: number | string;
  actualImportTime?: string;
}

interface DetailRowActionsProps {
  record: DetailActionRecord;
  phase?: RetryPhase;
  onRetry?: (
    record: DetailActionRecord,
    kind: RetryKind,
  ) => Promise<'accepted' | 'rejected'>;
}

const retryLabels: Record<RetryKind, string> = {
  collect: '重试采集',
  import: '重试入库',
};

export function DetailRowActions({ record, phase, onRetry }: DetailRowActionsProps) {
  const [retryKind, setRetryKind] = useState<RetryKind>();
  const retryKinds = availableRetryKinds(record);
  const isSubmitting = phase === 'submitting';
  const isWaiting = phase === 'waiting';
  const canRetry = Boolean(onRetry) && (isWaiting || (canRetryDetail(record) && retryKinds.length > 0));

  const submit = async () => {
    if (!retryKind || !onRetry) return;

    const result = await onRetry(record, retryKind);
    setRetryKind(undefined);
    if (result === 'rejected') Message.error('重试提交失败，请重试');
  };

  return (
    <>
      <Space className={styles.detailRowActions} size={8}>
        <Button className={styles.logButton} type="text" size="mini" onClick={() => Message.info('打开任务日志')}>
          日志
        </Button>
        {canRetry ? (
          <Dropdown
            trigger="click"
            position="br"
            disabled={isSubmitting || isWaiting}
            droplist={(
              <Menu onClickMenuItem={(key) => setRetryKind(key as RetryKind)}>
                {retryKinds.map((kind) => <Menu.Item key={kind}>{retryLabels[kind]}</Menu.Item>)}
              </Menu>
            )}
          >
            <Button className={styles.logButton} type="text" size="mini" loading={isSubmitting} disabled={isSubmitting || isWaiting}>
              {isWaiting ? '重试中' : '重试'}
            </Button>
          </Dropdown>
        ) : null}
        {isWaiting ? <span role="status" className={styles.retryProgress}>重试中</span> : null}
      </Space>
      <Modal
        title={`确认${retryKind ? retryLabels[retryKind] : '重试'}`}
        visible={Boolean(retryKind)}
        okText="确认重试"
        cancelText="取消"
        confirmLoading={isSubmitting}
        okButtonProps={{ disabled: isSubmitting }}
        cancelButtonProps={{ disabled: isSubmitting }}
        onCancel={() => setRetryKind(undefined)}
        onOk={submit}
      >
        <p>关联计划：{record.taskName}</p>
        <p>店铺：{record.storeName}</p>
        <p>数据日期：{record.bizDateRange}</p>
        <p>仅重试当前业务明细，历史执行记录保留在日志中。</p>
      </Modal>
    </>
  );
}
