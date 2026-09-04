import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Badge, Button, Empty, Input, Select, Spin, Tabs, Tag, Typography } from '@arco-design/web-react';
import {
  IconApps,
  IconCheckCircleFill,
  IconClose,
  IconCloseCircleFill,
  IconExclamationCircleFill,
  IconPauseCircleFill,
  IconRobot,
} from '@arco-design/web-react/icon';
import type { RequirementKey } from '@/context/RequirementContext';
import { useActiveRequirement } from '@/context/RequirementContext';
import styles from './index.module.less';

const { TabPane } = Tabs;

export type AnnotationPreview =
  | {
      color?: string;
      icon?: 'failed' | 'remind' | 'success' | 'waiting';
      label: string;
      type: 'tag';
    }
  | {
      disabled?: boolean;
      label: string;
      loading?: boolean;
      status?: 'danger' | 'success' | 'warning';
      type: 'button';
      variant?: 'primary' | 'secondary' | 'text' | 'outline';
    }
  | {
      label: string;
      status: 'error' | 'info' | 'success' | 'warning';
      type: 'alert';
    }
  | {
      label: string;
      type: 'empty';
    }
  | {
      actionLabel?: string;
      label: string;
      status?: 'empty' | 'error';
      textColor?: string;
      type: 'empty-state';
    }
  | {
      label: string;
      type: 'field';
    }
  | {
      actionLabel: string;
      relationLabel: string;
      searchPlaceholder: string;
      selectPlaceholders: string[];
      type: 'filter-bar';
    }
  | {
      label: string;
      type: 'loading-state';
    }
  | {
      label: string;
      status: 'success' | 'error';
      type: 'result-text';
    }
  | {
      selected: 'robot' | 'data';
      type: 'view-switch';
    };

export type AnnotationContentItem = {
  children?: AnnotationContentItem[];
  example?: string;
  previews?: AnnotationPreview[];
  text: string;
};

export type RequirementAnnotation = {
  noteId: string;
  number: string;
  page: string;
  module: string;
  target: string;
  rule?: string;
  ruleItems?: AnnotationContentItem[];
  ruleLabel?: string;
  exception?: string;
  exceptionItems?: AnnotationContentItem[];
  exceptionLabel?: string;
  state?: string;
  stateItems?: AnnotationContentItem[];
  stateLabel?: string;
  recovery?: string;
  recoveryItems?: AnnotationContentItem[];
  recoveryLabel?: string;
  acceptance: string;
  acceptanceItems?: AnnotationContentItem[];
  topTab: '数据源市场' | '电商取数宝' | '跨境取数宝' | '后台管理' | '个人中心' | '推送策略中心';
  menuKey: string;
  openEvent?: string;
  locateMode?: 'column-headers';
};

function renderPreview(preview: AnnotationPreview) {
  if (preview.type === 'tag') {
    const iconMap = {
      failed: <IconCloseCircleFill />,
      remind: <IconExclamationCircleFill />,
      success: <IconCheckCircleFill />,
      waiting: <IconPauseCircleFill />,
    };
    const icon = preview.icon ? iconMap[preview.icon] : null;

    return (
      <Tag className={styles.tagPreview} color={preview.color} key={`${preview.type}-${preview.label}`}>
        {icon ? (
          <span className={styles.tagPreviewContent}>
            {icon}
            <span>{preview.label}</span>
          </span>
        ) : preview.label}
      </Tag>
    );
  }
  if (preview.type === 'button') {
    return (
      <Button
        disabled={preview.disabled}
        key={`${preview.type}-${preview.label}`}
        loading={preview.loading}
        size="mini"
        status={preview.status}
        type={preview.variant || 'secondary'}
      >
        {preview.label}
      </Button>
    );
  }
  if (preview.type === 'alert') {
    return (
      <Alert
        className={styles.alertPreview}
        content={preview.label}
        key={`${preview.type}-${preview.label}`}
        showIcon
        type={preview.status}
      />
    );
  }
  if (preview.type === 'field') {
    return (
      <span className={styles.fieldPreview} key={`${preview.type}-${preview.label}`}>
        {preview.label}
      </span>
    );
  }
  if (preview.type === 'filter-bar') {
    return (
      <div className={styles.filterBarPreview} key={preview.type}>
        <Input.Search
          className={styles.filterSearchPreview}
          placeholder={preview.searchPlaceholder}
          readOnly
          size="mini"
        />
        <div className={styles.filterControlsPreview}>
          {preview.selectPlaceholders.map((placeholder) => (
            <Select key={placeholder} placeholder={placeholder} size="mini" />
          ))}
          <Button size="mini" type="text">{preview.actionLabel}</Button>
        </div>
        <div className={styles.filterRelationPreview}>{preview.relationLabel}</div>
      </div>
    );
  }
  if (preview.type === 'loading-state') {
    return (
      <span className={styles.loadingStatePreview} key={`${preview.type}-${preview.label}`}>
        <Spin loading size={16} />
        <span>{preview.label}</span>
      </span>
    );
  }
  if (preview.type === 'empty-state') {
    return (
      <div
        className={`${styles.emptyStatePreview} ${preview.status === 'error' ? styles.emptyStateError : ''}`}
        style={preview.textColor ? { '--annotation-empty-description-color': preview.textColor } as React.CSSProperties : undefined}
        key={`${preview.type}-${preview.label}`}
      >
        <Empty description={preview.label} />
        {preview.actionLabel ? <Button size="mini" type="primary">{preview.actionLabel}</Button> : null}
      </div>
    );
  }
  if (preview.type === 'result-text') {
    return (
      <span
        className={preview.status === 'success' ? styles.resultSuccessPreview : styles.resultErrorPreview}
        key={`${preview.type}-${preview.label}`}
      >
        {preview.label}
      </span>
    );
  }
  if (preview.type === 'view-switch') {
    return (
      <span className={styles.viewSwitchPreview} key={`${preview.type}-${preview.selected}`}>
        <span className={preview.selected === 'robot' ? styles.viewSwitchActivePreview : ''} aria-label="机器人视图">
          <IconRobot />
        </span>
        <span className={preview.selected === 'data' ? styles.viewSwitchActivePreview : ''} aria-label="运行数据视图">
          <IconApps />
        </span>
      </span>
    );
  }
  return (
    <span className={styles.emptyPreview} key={`${preview.type}-${preview.label}`}>
      {preview.label}
    </span>
  );
}

function renderContentItems(items: AnnotationContentItem[], level = 1, renderExample?: (key: string) => ReactNode) {
  return (
    <ol className={`${styles.annotationListText} ${level > 1 ? styles.annotationSubListText : ''}`}>
      {items.map((item, index) => (
        <li key={`${item.text}-${index}`}>
          <span className={styles.annotationItemLine}>
            <span>{item.text}</span>
            {item.previews?.length ? (
              <span className={styles.inlinePreviewList}>
                {item.previews.map((preview) => renderPreview(preview))}
              </span>
            ) : null}
          </span>
          {item.example && renderExample ? renderExample(item.example) : null}
          {item.children?.length ? renderContentItems(item.children, level + 1, renderExample) : null}
        </li>
      ))}
    </ol>
  );
}

function renderSection(label: string, text?: string, items?: AnnotationContentItem[], renderExample?: (key: string) => ReactNode) {
  if (!text && !items?.length) return null;
  return (
    <div className={styles.cardSection}>
      <span className={styles.cardSectionLabel}>{label}</span>
      {items?.length ? renderContentItems(items, 1, renderExample) : null}
      {text ? <span className={styles.cardSectionValue}>{text}</span> : null}
    </div>
  );
}

export function RequirementAnnotationMarker({
  requirementKey,
  annotations,
  noteId,
  children,
  layout = 'inline',
}: {
  requirementKey: RequirementKey;
  annotations: RequirementAnnotation[];
  noteId: string;
  children?: ReactNode;
  layout?: 'inline' | 'block' | 'fill';
}) {
  const activeRequirement = useActiveRequirement();
  const targetRef = useRef<HTMLSpanElement>(null);
  const annotation = annotations.find((item) => item.noteId === noteId);
  if (!annotation || activeRequirement !== requirementKey) return <>{children}</>;

  return (
    <span
      ref={targetRef}
      className={`${styles.markerTarget} ${layout === 'block' ? styles.markerBlock : ''} ${layout === 'fill' ? styles.markerFill : ''}`}
      data-note-id={noteId}
    >
      {children}
    </span>
  );
}

export function RequirementAnnotationDrawer({
  visible,
  annotations,
  pageLabel,
  onClose,
  onLocate,
  renderExample,
}: {
  visible: boolean;
  annotations: RequirementAnnotation[];
  pageLabel?: (page: string) => string;
  onClose: () => void;
  onLocate: (annotation: RequirementAnnotation) => void;
  renderExample?: (key: string) => ReactNode;
}) {
  const [activePage, setActivePage] = useState('全部');
  const pages = useMemo(
    () => ['全部', ...Array.from(new Set(annotations.map((item) => item.page)))],
    [annotations],
  );
  const filtered = activePage === '全部'
    ? annotations
    : annotations.filter((item) => item.page === activePage);
  const grouped = filtered.reduce<Record<string, RequirementAnnotation[]>>((result, item) => {
    result[item.page] = [...(result[item.page] || []), item];
    return result;
  }, {});

  if (!visible) return null;

  return (
    <aside className={styles.drawer} aria-label="交互标注">
      <div className={styles.drawerHeader}>
        <div className={styles.drawerTitleRow}>
          <Typography.Text className={styles.drawerTitle} bold>交互标注</Typography.Text>
          <Typography.Text className={styles.drawerCount} type="secondary">{annotations.length} 条</Typography.Text>
        </div>
        <Button
          icon={<IconClose />}
          type="text"
          aria-label="关闭交互标注"
          onClick={onClose}
        />
      </div>
      <div className={styles.drawerBody}>
        <Tabs
          activeTab={activePage}
          className={styles.filterTabs}
          headerPadding={false}
          type="rounded"
          onChange={setActivePage}
        >
          {pages.map((page) => <TabPane key={page} title={pageLabel ? pageLabel(page) : page} />)}
        </Tabs>
        <div className={styles.annotationList}>
          {Object.entries(grouped).map(([page, items]) => (
            <section className={styles.group} key={page}>
              <div className={styles.groupTitle}>
                <Typography.Text bold>{page}</Typography.Text>
                <Typography.Text type="secondary">{items.length} 条</Typography.Text>
              </div>
              {items.map((item) => (
                <article className={styles.annotationCard} data-annotation-card={item.noteId} key={item.noteId}>
                  <div className={styles.cardHeader}>
                    <Badge className={styles.numberBadge} color="arcoblue" count={item.number} />
                    <div className={styles.cardTitle}>
                      <strong>{item.module}</strong>
                      {item.target ? <span>{item.target}</span> : null}
                    </div>
                    <Button
                      className={styles.locateButton}
                      type="text"
                      onClick={() => onLocate(item)}
                    >
                      定位
                    </Button>
                  </div>
                  {renderSection(item.ruleLabel || '规则', item.rule, item.ruleItems, renderExample)}
                  {renderSection(item.exceptionLabel || '边界/限制', item.exception, item.exceptionItems, renderExample)}
                  {renderSection(item.stateLabel || '状态', item.state, item.stateItems, renderExample)}
                  {renderSection(item.recoveryLabel || '恢复', item.recovery, item.recoveryItems, renderExample)}
                  {renderSection('验收', item.acceptance, item.acceptanceItems, renderExample)}
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>
    </aside>
  );
}
