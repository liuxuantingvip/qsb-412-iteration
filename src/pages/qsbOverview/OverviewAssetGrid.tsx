import { Skeleton } from '@arco-design/web-react';
import { Computer, Data, Robot, Shop } from '@icon-park/react';
import { overviewAssets } from './overviewContent';
import styles from './index.module.less';

const presentation = {
  stores: { title: '店铺', icon: <Shop theme="outline" size={16} fill="currentColor" /> },
  connectors: { title: '连接器', icon: <Data theme="outline" size={16} fill="currentColor" /> },
  cloud: { title: '云桌面', icon: <Computer theme="outline" size={16} fill="currentColor" /> },
  robots: { title: '机器人', icon: <Robot theme="outline" size={16} fill="currentColor" /> },
};

export function OverviewAssetGrid({ loading = false }: { loading?: boolean }) {
  return <div className={styles.assetGrid} aria-busy={loading}>
    {overviewAssets.map((item) => <div className={styles.assetItem} key={item.key}>
      <span className={styles.assetIcon}>{presentation[item.key].icon}</span>
      {loading ? <div className={styles.assetNumberSkeleton} aria-label={`${presentation[item.key].title}数量加载中`}><Skeleton animation text={{ rows: 1, width: '100%' }} /></div>
        : <strong>{item.used}{'total' in item ? `/${item.total}` : ''}</strong>}
      <span>{presentation[item.key].title}</span>
    </div>)}
  </div>;
}
