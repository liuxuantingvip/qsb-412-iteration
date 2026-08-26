export type DateStatus = 'success' | 'abnormal' | 'failed' | 'waiting' | 'noTask';

export type StageStatus =
  | '成功'
  | '失败'
  | '运行中'
  | '等待'
  | '正常'
  | '异常'
  | '无数据'
  | '无任务';

export interface TaskStageFacts {
  collectStatus: StageStatus;
  importStatus: StageStatus;
  validationStatus: StageStatus;
  collectErrorCode?: string;
  importErrorCode?: string;
}

const statusPriority: Array<Exclude<DateStatus, 'noTask'>> = ['failed', 'abnormal', 'waiting', 'success'];

const isWaiting = (status: StageStatus) => status === '运行中' || status === '等待';

export const classifyTaskFinalStatus = (facts: TaskStageFacts): DateStatus => {
  const { collectStatus, importStatus, validationStatus } = facts;

  if ([collectStatus, importStatus, validationStatus].every((status) => status === '无任务')) {
    return 'noTask';
  }
  if (importStatus === '失败' || facts.importErrorCode) return 'failed';
  if (collectStatus === '失败') {
    return facts.collectErrorCode?.startsWith('1') ? 'abnormal' : 'failed';
  }
  if (validationStatus === '异常') return 'abnormal';
  if ([collectStatus, importStatus, validationStatus].some(isWaiting)) return 'waiting';
  return 'success';
};

export const aggregateFinalStatus = (statuses: readonly DateStatus[]): DateStatus => {
  const actualStatuses = new Set(statuses.filter((status) => status !== 'noTask'));
  if (!actualStatuses.size) return 'noTask';
  return statusPriority.find((status) => actualStatuses.has(status)) || 'success';
};

export const aggregateTaskFinalStatus = (taskFacts: readonly TaskStageFacts[]): DateStatus => (
  aggregateFinalStatus(taskFacts.map(classifyTaskFinalStatus))
);
