import { Tag } from '@arco-design/web-react';
import type { DetailStatus } from './model';
import styles from './index.module.less';

export const detailStatusColorMap: Record<DetailStatus, string> = {
  待运行: 'gray',
  运行中: 'arcoblue',
  成功: 'green',
  '成功(部分无数据)': 'green',
  运行失败: 'red',
  '异常(1)': 'red',
  失败: 'red',
};

export function DetailStatusTag({ status }: { status: DetailStatus }) {
  return (
    <Tag className={styles.statusTag} color={detailStatusColorMap[status]}>
      {status}
    </Tag>
  );
}
