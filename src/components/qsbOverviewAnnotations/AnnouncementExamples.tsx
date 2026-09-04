import { useState } from 'react';
import { Button, Image } from '@arco-design/web-react';
import { MessageCenterModal } from '@/components/messageCenter';
import type { AnnouncementMessageItem } from '@/components/messageCenter';
import { overviewAnnouncements } from '@/pages/qsbOverview/overviewContent';
import styles from './AccountExamples.module.less';

function Screenshot({ file, caption }: { file: string; caption: string }) {
  return <figure className={styles.screenshot}>
    <Image src={`/annotation-examples/qsb-overview/${file}.png?v=message-box-2`} alt={caption} width="100%" />
    <figcaption>{caption} · 点击放大</figcaption>
  </figure>;
}

const previewAnnouncements: AnnouncementMessageItem[] = overviewAnnouncements.slice(0, 2).map((item, index) => ({
  ...item, unread: true, type: index === 0 ? '维护通知' : '平台公告', range: '电商取数宝',
  status: 'published', publishedAt: `${item.publishedAt} 09:00`, readCount: 118, totalCount: 326,
}));

function AnnouncementStateExample({ state }: { state: 'empty' | 'error' }) {
  const [visible, setVisible] = useState(false);
  const [loadState, setLoadState] = useState<'ready' | 'loading' | 'error'>('ready');
  const [messages, setMessages] = useState<AnnouncementMessageItem[]>([]);
  const caption = state === 'empty' ? '消息盒子 · 暂无公告消息' : '消息盒子 · 公告加载失败';
  return <div className={styles.example}>
    <Screenshot file={`announcement-${state}-box`} caption={caption} />
    <Button type="text" onClick={() => {
      setMessages(state === 'empty' ? [] : previewAnnouncements);
      setLoadState(state === 'empty' ? 'ready' : 'error');
      setVisible(true);
    }}>{state === 'empty' ? '查看无数据弹窗' : '查看加载失败弹窗'}</Button>
    <MessageCenterModal visible={visible} initialCategory="announcement"
      initialAnnouncementId={previewAnnouncements[0].id} dataMessages={[]}
      announcementMessages={messages} announcementLoadState={loadState}
      onClose={() => setVisible(false)} onMarkDataRead={() => {}} onOpenRunDetail={() => {}}
      onMarkAnnouncementRead={(id) => setMessages((current) => current.map((item) => item.id === id ? { ...item, unread: false } : item))}
      onRetryAnnouncements={() => {
        setLoadState('loading');
        // 原型演示重试成功；不请求生产接口。
        window.setTimeout(() => setLoadState('ready'), 500);
      }} />
  </div>;
}

export function renderAnnouncementExample(key: string) {
  if (key === 'announcement-source') return <Screenshot file="announcement-source" caption="公告推送 → 后台管理 → 公告管理" />;
  if (key === 'announcement-scope') return <Screenshot file="announcement-scope" caption="编辑公告 → 发送范围" />;
  if (key === 'announcement-detail') return <Screenshot file="announcement-message-box" caption="消息盒子 · 公告消息" />;
  if (key === 'announcement-fields') return <table className={styles.fieldMapping}>
    <thead><tr><th>概览展示</th><th>后台来源及示例</th></tr></thead>
    <tbody>
      <tr><td>公告标题</td><td>公告管理的“公告标题”：8 月数据源稳定性维护通知</td></tr>
      <tr><td>08/25</td><td>同一条公告的“发布时间”：2026-08-25 09:00，仅展示月/日</td></tr>
      <tr><td>详情正文</td><td>编辑公告中的“公告内容”：近期将进行数据源稳定性维护……</td></tr>
    </tbody>
  </table>;
  if (key === 'announcement-empty') return <AnnouncementStateExample state="empty" />;
  if (key === 'announcement-error') return <AnnouncementStateExample state="error" />;
  return null;
}
