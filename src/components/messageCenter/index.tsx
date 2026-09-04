import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Empty,
  Modal,
  Spin,
  Tag,
} from '@arco-design/web-react';
import {
  IconFile,
  IconDown,
  IconNotification,
} from '@arco-design/web-react/icon';
import { MessageCenterAnnotationMarker } from '@/components/messageCenterAnnotations';
import styles from './index.module.less';

export type DataMessageStatus = 'success' | 'partial_success' | 'failed' | 'running' | 'timeout';

export type DataMessageItem = {
  id: string;
  unread: boolean;
  status: DataMessageStatus;
  planName: string;
  workId: string;
  tableName: string;
  shopName: string;
  actionName: string;
  successCount: number;
  failedCount: number;
  totalCount: number;
  reason?: string;
  createdAt: string;
};

export type AnnouncementMessageItem = {
  id: string;
  unread: boolean;
  type: '平台公告' | '运营公告' | '维护通知';
  range: '全部租户' | '电商取数宝' | '跨境取数宝';
  status: 'published' | 'draft';
  title: string;
  summary: string;
  publishedAt: string;
  linkLabel?: string;
  linkUrl?: string;
  readCount: number;
  totalCount: number;
};

export type MessageCenterCategory = 'data' | 'announcement';

const statusPriority: Record<DataMessageStatus, number> = {
  failed: 1,
  timeout: 2,
  partial_success: 3,
  running: 4,
  success: 5,
};

export function MessageCenterModal({
  visible,
  initialCategory = 'data',
  initialAnnouncementId,
  dataMessages,
  announcementMessages,
  announcementLoadState = 'ready',
  onRetryAnnouncements,
  onClose,
  onMarkDataRead,
  onMarkAnnouncementRead,
  onOpenRunDetail,
}: {
  visible: boolean;
  initialCategory?: MessageCenterCategory;
  initialAnnouncementId?: string | null;
  dataMessages: DataMessageItem[];
  announcementMessages: AnnouncementMessageItem[];
  announcementLoadState?: 'ready' | 'loading' | 'error';
  onRetryAnnouncements?: () => void;
  onClose: () => void;
  onMarkDataRead: (id: string) => void;
  onMarkAnnouncementRead: (id: string) => void;
  onOpenRunDetail: (message: DataMessageItem) => void;
}) {
  const [category, setCategory] = useState<MessageCenterCategory>('data');
  const [expandedDataIds, setExpandedDataIds] = useState<string[]>([]);
  const [expandedAnnouncementIds, setExpandedAnnouncementIds] = useState<string[]>([]);
  const unreadDataCount = dataMessages.filter((item) => item.unread).length;
  const sortedDataMessages = useMemo(() => [...dataMessages].sort((left, right) => (
    statusPriority[left.status] - statusPriority[right.status]
    || Date.parse(right.createdAt) - Date.parse(left.createdAt)
  )), [dataMessages]);
  const sortedAnnouncementMessages = useMemo(() => announcementMessages
    .filter((item) => item.status === 'published')
    .sort((left, right) => (
    Date.parse(right.publishedAt) - Date.parse(left.publishedAt)
  )), [announcementMessages]);
  const displayedAnnouncementMessages = useMemo(() => {
    if (!initialAnnouncementId) return sortedAnnouncementMessages;
    if (!sortedAnnouncementMessages.some((item) => item.id === initialAnnouncementId)) return [];
    return [...sortedAnnouncementMessages].sort((left, right) => (
      Number(right.id === initialAnnouncementId) - Number(left.id === initialAnnouncementId)
    ));
  }, [initialAnnouncementId, sortedAnnouncementMessages]);
  const unreadAnnouncementCount = sortedAnnouncementMessages.filter((item) => item.unread).length;

  useEffect(() => {
    if (visible) {
      const hasTargetAnnouncement = Boolean(initialAnnouncementId
        && sortedAnnouncementMessages.some((item) => item.id === initialAnnouncementId));
      const nextCategory = hasTargetAnnouncement ? 'announcement' : initialCategory;
      setCategory(nextCategory);
      setExpandedDataIds(nextCategory === 'data' && dataMessages[0] ? [dataMessages[0].id] : []);
      setExpandedAnnouncementIds(hasTargetAnnouncement && initialAnnouncementId
        ? [initialAnnouncementId]
        : nextCategory === 'announcement' ? sortedAnnouncementMessages.map((item) => item.id) : []);
      if (announcementLoadState === 'ready' && hasTargetAnnouncement && initialAnnouncementId
        && sortedAnnouncementMessages.some((item) => item.id === initialAnnouncementId && item.unread)) {
        onMarkAnnouncementRead(initialAnnouncementId);
      }
    }
  }, [initialAnnouncementId, initialCategory, visible, announcementLoadState]);

  const toggleDataDetail = (item: DataMessageItem) => {
    setExpandedDataIds((current) => (
      current.includes(item.id)
        ? current.filter((id) => id !== item.id)
        : [...current, item.id]
    ));
    if (item.unread) onMarkDataRead(item.id);
  };

  const toggleAnnouncementDetail = (item: AnnouncementMessageItem) => {
    setExpandedAnnouncementIds((current) => (
      current.includes(item.id)
        ? current.filter((id) => id !== item.id)
        : [...current, item.id]
    ));
    if (item.unread) onMarkAnnouncementRead(item.id);
  };

  const title = category === 'data' ? '取数消息' : '公告消息';
  const messageTotal = category === 'data' ? sortedDataMessages.length : sortedAnnouncementMessages.length;
  const unreadTotal = category === 'data' ? unreadDataCount : unreadAnnouncementCount;

  return (
    <Modal
      className={styles.modal}
      visible={visible}
      footer={null}
      title={null}
      unmountOnExit={false}
      style={{ width: 920 }}
      onCancel={onClose}
    >
      <div className={styles.shell}>
        <MessageCenterAnnotationMarker noteId="MSG-2" layout="fill">
          <aside className={styles.side}>
            <div className={styles.sideTitle}>消息盒子</div>
            <div className={styles.categoryList}>
              <button
                className={`${styles.categoryButton} ${category === 'data' ? styles.categoryActive : ''}`}
                type="button"
                onClick={() => setCategory('data')}
              >
                <span className={styles.categoryLabel}><IconNotification />取数消息</span>
                {unreadDataCount ? <Badge count={unreadDataCount} /> : null}
              </button>
              <button
                className={`${styles.categoryButton} ${category === 'announcement' ? styles.categoryActive : ''}`}
                type="button"
                onClick={() => setCategory('announcement')}
              >
                <span className={styles.categoryLabel}><IconFile />公告消息</span>
                {unreadAnnouncementCount ? <Badge count={unreadAnnouncementCount} /> : null}
              </button>
            </div>
          </aside>
        </MessageCenterAnnotationMarker>
        <section className={styles.content}>
          <header className={styles.header}>
            <div>
              <div className={styles.titleRow}>
                <h3 className={styles.title}>{title}</h3>
                {category === 'data' || announcementLoadState === 'ready' ? <span className={styles.subtitle}>{messageTotal} 条 · {unreadTotal} 未读</span> : null}
              </div>
            </div>
          </header>
          <div className={styles.list}>
            {category === 'data' ? (
              sortedDataMessages.length ? sortedDataMessages.map((item) => {
                const expanded = expandedDataIds.includes(item.id);
                return (
                  <MessageCenterAnnotationMarker
                    noteId={item.id === sortedDataMessages[0]?.id ? 'MSG-3' : ''}
                    key={item.id}
                    layout="block"
                  >
                    <article className={`${styles.card} ${item.unread ? styles.unread : ''}`}>
                    <div className={styles.cardHead}>
                      <div className={styles.cardTitle}>
                        <div className={styles.name}>{item.planName}</div>
                        <div className={styles.titleTime}>{item.createdAt}</div>
                      </div>
                      <Button
                        className={styles.expandButton}
                        type="text"
                        size="mini"
                        icon={<IconDown className={expanded ? styles.expandIconOpen : styles.expandIcon} />}
                        aria-label={expanded ? '收起详情' : '展开详情'}
                        onClick={() => toggleDataDetail(item)}
                      />
                    </div>
                    {expanded ? (
                      <div className={styles.detailList}>
                        <div className={styles.detailLine}>
                          <span className={styles.detailLabel}>数据表：</span>
                          <span className={styles.detailValue}>{item.tableName}</span>
                        </div>
                        <div className={styles.detailLine}>
                          <span className={styles.detailLabel}>店铺：</span>
                          <span className={styles.detailValue}>{item.shopName}</span>
                        </div>
                        <div className={styles.detailLine}>
                          <span className={styles.detailLabel}>计划名称：</span>
                          <span className={styles.detailValue}>{item.planName}</span>
                        </div>
                        <div className={styles.detailLine}>
                          <span className={styles.detailLabel}>失败原因：</span>
                          <span className={styles.detailValue}>{item.reason || '-'}</span>
                        </div>
                        <div className={styles.detailActions}>
                          <Button size="small" type="primary" onClick={() => onOpenRunDetail(item)}>
                            查看运行详情
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    </article>
                  </MessageCenterAnnotationMarker>
                );
              }) : (
                <div className={styles.empty}><Empty description="暂无取数消息" /></div>
              )
            ) : (
              announcementLoadState === 'loading' ? (
                <div className={styles.empty}><Spin tip="公告加载中" /></div>
              ) : announcementLoadState === 'error' ? (
                <div className={styles.empty}><Empty description={<div className={styles.emptyActions}>
                  <span>公告加载失败</span>
                  <Button type="primary" size="small" onClick={onRetryAnnouncements}>重试</Button>
                </div>} /></div>
              ) : displayedAnnouncementMessages.length ? displayedAnnouncementMessages.map((item) => {
                const expanded = expandedAnnouncementIds.includes(item.id);
                return (
                  <MessageCenterAnnotationMarker
                    noteId={item.id === displayedAnnouncementMessages[0]?.id ? 'MSG-4' : ''}
                    key={item.id}
                    layout="block"
                  >
                    <article className={`${styles.card} ${item.unread ? styles.unread : ''}`}>
                    <div className={styles.cardHead}>
                      <div className={styles.cardTitle}>
                        <div className={styles.nameRow}>
                          <div className={styles.name}>{item.title}</div>
                          <Tag className={styles.typeTag} color={item.type === '运营公告' ? 'purple' : 'arcoblue'}>{item.type}</Tag>
                        </div>
                        <div className={styles.titleTime}>{item.publishedAt}</div>
                      </div>
                      <div className={styles.cardHeadActions}>
                        <Button
                          className={styles.expandButton}
                          type="text"
                          size="mini"
                          icon={<IconDown className={expanded ? styles.expandIconOpen : styles.expandIcon} />}
                          aria-label={expanded ? '收起详情' : '展开详情'}
                          onClick={() => toggleAnnouncementDetail(item)}
                        />
                      </div>
                    </div>
                    {expanded ? (
                      <div className={styles.detailList}>
                        <div className={styles.announcementSummary}>{item.summary}</div>
                        {item.linkUrl ? (
                          <div className={styles.detailActions}>
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => {
                                onMarkAnnouncementRead(item.id);
                                window.open(item.linkUrl, '_blank', 'noopener,noreferrer');
                              }}
                            >
                              查看详情
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    </article>
                  </MessageCenterAnnotationMarker>
                );
              }) : (
                <div className={styles.empty}><Empty description="暂无公告消息" /></div>
              )
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}

export function getUnreadMessageCount(
  dataMessages: DataMessageItem[],
  announcementMessages: AnnouncementMessageItem[],
) {
  return dataMessages.filter((item) => item.unread).length
    + announcementMessages.filter((item) => item.status === 'published' && item.unread).length;
}
