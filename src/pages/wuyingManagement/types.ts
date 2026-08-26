export enum OnlineStateEnum {
  BUSY = '2',
  NOTONLINE = '3',
  CONNECTING = '-1',
  FREE = '1',
  ALONE = '4',
}

export const OnlineStateInfo = {
  [OnlineStateEnum.BUSY]: {
    label: '忙碌',
    color: 'rgb(var(--primary-6))',
  },
  [OnlineStateEnum.NOTONLINE]: {
    label: '离线',
    color: 'rgb(var(--danger-6))',
  },
  [OnlineStateEnum.CONNECTING]: {
    label: '连接中',
    color: 'rgb(var(--warning-6))',
  },
  [OnlineStateEnum.FREE]: {
    label: '空闲',
    color: 'rgb(var(--success-6))',
  },
  [OnlineStateEnum.ALONE]: {
    label: '单机中',
    color: 'var(--color-text-3)',
  },
};

export const OnlineStateArr = [
  {
    key: OnlineStateEnum.BUSY,
    value: OnlineStateInfo[OnlineStateEnum.BUSY].label,
  },
  {
    key: OnlineStateEnum.NOTONLINE,
    value: OnlineStateInfo[OnlineStateEnum.NOTONLINE].label,
  },
  {
    key: OnlineStateEnum.CONNECTING,
    value: OnlineStateInfo[OnlineStateEnum.CONNECTING].label,
  },
  {
    key: OnlineStateEnum.FREE,
    value: OnlineStateInfo[OnlineStateEnum.FREE].label,
  },
  {
    key: OnlineStateEnum.ALONE,
    value: OnlineStateInfo[OnlineStateEnum.ALONE].label,
  },
];

/** 机器人类型 */
export enum SourceFromEnum {
  LOCAL = 1,
  CLOUD = 2,
}

export const SourceFromInfo = {
  [SourceFromEnum.LOCAL]: '本地',
  [SourceFromEnum.CLOUD]: '云端',
};

export const SourceFromArr = [
  {
    key: SourceFromEnum.LOCAL,
    value: SourceFromInfo[SourceFromEnum.LOCAL],
  },
  {
    key: SourceFromEnum.CLOUD,
    value: SourceFromInfo[SourceFromEnum.CLOUD],
  },
];
export enum WuyingStatusEnum {
  RUNNING = 'Running',
  STOPPED = 'Stopped',
  CONNECTED = 'Connected',
  EXPIRED = 'Expired',
  STARTING = 'Starting',
  REBUILDING = 'Rebuilding',
  STOPPING = 'Stopping',
  DELETED = 'Deleted',
  PENDING = 'Pending',
  OPEN_FAILED = 'OpenFailed',
  RENEW_FAILED = 'RenewFailed',
  RELEASE_PERIOD = 'ReleasePeriod',
  UNSUBSCRIBING = 'Unsubscribing',
  AUTO_UNSUBSCRIBING = 'AutoUnsubscribing',
  UNSUBSCRIBED = 'Unsubscribed',
  UNSUBSCRIBE_FAILED = 'UnsubscribeFailed',
}

/** 云桌面状态 */
export const WuYingStatusInfo = {
  [WuyingStatusEnum.RUNNING]: {
    label: '运行中',
    color: 'rgb(var(--primary-6))',
  },
  [WuyingStatusEnum.CONNECTED]: {
    label: '已连接',
    color: 'rgb(var(--warning-6))',
  },
  [WuyingStatusEnum.STOPPED]: {
    label: '已关机',
    color: 'rgb(var(--danger-6))',
  },
  [WuyingStatusEnum.EXPIRED]: {
    label: '已到期',
    color: 'var(--color-text-3)',
  },
  [WuyingStatusEnum.STARTING]: {
    label: '启动中',
    color: 'rgb(var(--success-6))',
  },
  [WuyingStatusEnum.REBUILDING]: {
    label: '重建中',
    color: 'rgb(var(--purple-6))',
  },
  [WuyingStatusEnum.DELETED]: {
    label: '已删除',
    color: 'var(--color-text-4)',
  },
  [WuyingStatusEnum.PENDING]: {
    label: '等待中',
    color: 'rgb(var(--primary-4))',
  },
  [WuyingStatusEnum.STOPPING]: {
    label: '停止中',
    color: 'rgb(var(--warning-6))',
  },
  [WuyingStatusEnum.OPEN_FAILED]: {
    label: '云电脑开通失败',
    color: 'rgb(var(--danger-6))',
  },
  [WuyingStatusEnum.RENEW_FAILED]: {
    label: '续期失败',
    color: 'rgb(var(--danger-6))',
  },
  [WuyingStatusEnum.RELEASE_PERIOD]: {
    label: '释放期',
    color: 'rgb(var(--warning-6))',
  },
  [WuyingStatusEnum.UNSUBSCRIBING]: {
    label: '释放中',
    color: 'rgb(var(--primary-6))',
  },
  [WuyingStatusEnum.AUTO_UNSUBSCRIBING]: {
    label: '自动释放中',
    color: 'rgb(var(--primary-6))',
  },
  [WuyingStatusEnum.UNSUBSCRIBED]: {
    label: '已释放',
    color: 'var(--color-text-3)',
  },
  [WuyingStatusEnum.UNSUBSCRIBE_FAILED]: {
    label: '释放失败',
    color: 'rgb(var(--danger-6))',
  },
};

/** */
export const WuYingStatusArr = [
  {
    key: WuyingStatusEnum.RUNNING,
    value: WuYingStatusInfo[WuyingStatusEnum.RUNNING].label,
  },
  {
    key: WuyingStatusEnum.CONNECTED,
    value: WuYingStatusInfo[WuyingStatusEnum.CONNECTED].label,
  },
  {
    key: WuyingStatusEnum.STOPPED,
    value: WuYingStatusInfo[WuyingStatusEnum.STOPPED].label,
  },
  {
    key: WuyingStatusEnum.EXPIRED,
    value: WuYingStatusInfo[WuyingStatusEnum.EXPIRED].label,
  },
  {
    key: WuyingStatusEnum.STARTING,
    value: WuYingStatusInfo[WuyingStatusEnum.STARTING].label,
  },
  {
    key: WuyingStatusEnum.REBUILDING,
    value: WuYingStatusInfo[WuyingStatusEnum.REBUILDING].label,
  },
  {
    key: WuyingStatusEnum.DELETED,
    value: WuYingStatusInfo[WuyingStatusEnum.DELETED].label,
  },
  {
    key: WuyingStatusEnum.PENDING,
    value: WuYingStatusInfo[WuyingStatusEnum.PENDING].label,
  },
  {
    key: WuyingStatusEnum.STOPPING,
    value: WuYingStatusInfo[WuyingStatusEnum.STOPPING].label,
  },
  {
    key: WuyingStatusEnum.OPEN_FAILED,
    value: WuYingStatusInfo[WuyingStatusEnum.OPEN_FAILED].label,
  },
  {
    key: WuyingStatusEnum.RENEW_FAILED,
    value: WuYingStatusInfo[WuyingStatusEnum.RENEW_FAILED].label,
  },
  {
    key: WuyingStatusEnum.RELEASE_PERIOD,
    value: WuYingStatusInfo[WuyingStatusEnum.RELEASE_PERIOD].label,
  },
  {
    key: WuyingStatusEnum.UNSUBSCRIBING,
    value: WuYingStatusInfo[WuyingStatusEnum.UNSUBSCRIBING].label,
  },
  {
    key: WuyingStatusEnum.AUTO_UNSUBSCRIBING,
    value: WuYingStatusInfo[WuyingStatusEnum.AUTO_UNSUBSCRIBING].label,
  },
  {
    key: WuyingStatusEnum.UNSUBSCRIBED,
    value: WuYingStatusInfo[WuyingStatusEnum.UNSUBSCRIBED].label,
  },
  {
    key: WuyingStatusEnum.UNSUBSCRIBE_FAILED,
    value: WuYingStatusInfo[WuyingStatusEnum.UNSUBSCRIBE_FAILED].label,
  },
];

/** 默认的顶级部门信息 */
export const DefaultTopDepartmentInfo = {
  value: 'top',
  title: '顶级部门',
};
