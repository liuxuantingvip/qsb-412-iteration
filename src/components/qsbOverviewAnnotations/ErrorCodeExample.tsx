import { overviewErrorCodeSource, resolveOverviewError } from '@/pages/qsbOverview/errorCodeMappings';
import styles from './AccountExamples.module.less';

export function ErrorCodeExample() {
  const examples = [
    { stage: '登录', ...resolveOverviewError('login', '1103') },
    { stage: '登录', ...resolveOverviewError('login', '1002') },
    { stage: '采集', ...resolveOverviewError('collection', '1001') },
    { stage: '入库', ...resolveOverviewError('ingestion', '1001') },
  ];
  return <div className={styles.example}>
    <a href={overviewErrorCodeSource} target="_blank" rel="noreferrer">查看《取数宝错误码（辰南版）》原始码表</a>
    <table className={styles.fieldMapping}>
      <thead><tr><th>发生环节 / 错误码</th><th>异常类型展示</th></tr></thead>
      <tbody>{examples.map((item) => <tr key={`${item.stage}-${item.errorCode}`}><td>{item.stage} / {item.errorCode}</td><td>{item.issueType}</td></tr>)}</tbody>
    </table>
  </div>;
}
