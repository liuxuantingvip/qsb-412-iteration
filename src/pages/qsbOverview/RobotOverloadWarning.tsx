import styles from './index.module.less';

export function RobotOverloadWarning() {
  return <div className={styles.scheduleAlert} role="status"><i />当机器人超出运行上限时，计划可能将无法按时执行，请合理安排任务</div>;
}

export function RobotOverloadBadge() {
  return <em>超限</em>;
}
