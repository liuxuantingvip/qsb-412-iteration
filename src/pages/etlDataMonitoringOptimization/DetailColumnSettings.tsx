import { Button, Popover, Tree } from '@arco-design/web-react';
import { IconSettings, IconDragDotVertical } from '@arco-design/web-react/icon';
import { moveDetailColumn } from './detailPresentation';
import styles from './detailColumnSettings.module.less';
import pageStyles from './index.module.less';

interface ColumnOption { key: string; label: string; disabled?: boolean }

export function DetailColumnSettings({ options, order, visible, onOrderChange, onVisibleChange, noteId }: {
  options: ColumnOption[];
  order: string[];
  visible: string[];
  onOrderChange: (keys: string[]) => void;
  onVisibleChange: (keys: string[]) => void;
  noteId?: string;
}) {
  const required = options.filter(option => option.disabled).map(option => option.key);
  return (
    <Popover trigger="click" position="br" content={(
      <div className={styles.panel}>
        <div className={styles.header}>
          <strong>列展示设置</strong>
          <Button type="text" size="mini" onClick={() => {
            onOrderChange(options.map(option => option.key));
            onVisibleChange(options.map(option => option.key));
          }}>恢复默认</Button>
        </div>
        <p className={styles.hint}>勾选显示列，拖拽调整顺序</p>
        <div className={styles.list}>
          <Tree
            blockNode checkable draggable selectable={false}
            checkedKeys={visible}
            icons={{ dragIcon: <IconDragDotVertical /> }}
            treeData={order.map(key => {
              const option = options.find(item => item.key === key)!;
              return {
                key, title: <span className={styles.label}>{option.label}</span>,
                disableCheckbox: option.disabled,
                draggable: key !== 'operation',
              };
            })}
            allowDrop={({ dragNode, dropNode, dropPosition }) => dropPosition !== 0 && String(dragNode?.key) !== 'operation' && String(dropNode.key) !== 'operation'}
            onDrop={({ dragNode, dropNode, dropPosition }) => {
              if (dragNode && dropNode) onOrderChange(moveDetailColumn(order, String(dragNode.key), String(dropNode.key), dropPosition > 0));
            }}
            onCheck={keys => onVisibleChange(Array.from(new Set([...keys, ...required])))}
          />
        </div>
      </div>
    )}>
      <Button data-note-id={noteId} className={pageStyles.iconButton} aria-label="列设置" icon={<IconSettings />} />
    </Popover>
  );
}
