// 原型平台字典示例。生产字段应读取平台字典中的父级与子级名称。
export const monitoringPlatformExamples: Record<string, { channel: string; platform: string }> = {
  拼多多: { channel: '拼多多', platform: '拼多多商家后台' },
  京东: { channel: '京东', platform: '京东商家后台' },
  抖音: { channel: '抖音', platform: '抖店' },
  天猫: { channel: '淘系', platform: '阿里妈妈' },
  淘宝: { channel: '淘系', platform: '生意参谋' },
  小红书: { channel: '小红书', platform: '聚光' },
  唯品会: { channel: '唯品会', platform: '唯品会商家后台' },
};

// 独立的执行明细 mock；不代表由当前计划配置重算历史取数日期。
export function mockExecutionDateRange(businessDate: string, recordIndex: number): string {
  const lookbackDays = [6, 13, 0][recordIndex % 3];
  const end = new Date(`${businessDate}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - lookbackDays);
  return `${start.toISOString().slice(0, 10)} 至 ${businessDate}`;
}

export function canRetryDetail(record: { collectStatus: string; importStatus: string }): boolean {
  return record.collectStatus === '失败'
    || record.collectStatus === '平台未更新'
    || record.importStatus === '失败';
}
