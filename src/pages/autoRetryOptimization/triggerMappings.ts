import type { TriggerGroup } from './interface';

export interface TriggerCondition {
  label: string;
  codes: string[];
}

export const triggerMappings: Record<TriggerGroup, TriggerCondition[]> = {
  账号异常: [
    {
      label: '手机验证码或短信验证异常',
      codes: ['rpa:1001', 'rpa:1002'],
    },
    {
      label: '账号密码或登录过程异常',
      codes: ['rpa:1103', 'rpa:1801'],
    },
    {
      label: '账号权限未开通',
      codes: ['rpa:1201'],
    },
    {
      label: '账号被平台风控或验证码拦截',
      codes: ['rpa:1301', 'rpa:1701'],
    },
  ],
  平台异常: [
    {
      label: '平台数据暂未更新',
      codes: ['rpa:2001'],
    },
    {
      label: '平台报表生成超时',
      codes: ['rpa:2101'],
    },
    {
      label: '平台页面变更或筛选异常',
      codes: ['rpa:2201', 'rpa:2202'],
    },
    {
      label: '平台页面与下载数据不一致',
      codes: ['rpa:2301'],
    },
    {
      label: '平台页面加载或识别异常',
      codes: ['rpa:3001', 'rpa:3002', 'rpa:3101', 'rpa:3102'],
    },
    {
      label: '平台页面操作执行失败',
      codes: ['rpa:3201', 'rpa:3202', 'rpa:3203', 'rpa:3204', 'rpa:3205', 'rpa:3301'],
    },
  ],
  数据入库异常: [
    {
      label: '数据库连接超时',
      codes: ['storage:1001'],
    },
    {
      label: '数据处理脚本异常',
      codes: ['storage:2001'],
    },
    {
      label: '入库配置或表结构异常',
      codes: ['storage:2002', 'storage:2003', 'storage:2004', 'storage:2005', 'storage:2007'],
    },
    {
      label: '入库文件为空或读取失败',
      codes: ['storage:2006', 'storage:2008'],
    },
    {
      label: '数据写入 SQL 执行异常',
      codes: ['storage:3001', 'storage:3002', 'storage:3003', 'storage:3004'],
    },
  ],
};

export const triggerGroups = Object.keys(triggerMappings) as TriggerGroup[];

export const triggerOptions: Record<TriggerGroup, string[]> = triggerGroups.reduce((options, group) => ({
  ...options,
  [group]: triggerMappings[group].map((item) => item.label),
}), {} as Record<TriggerGroup, string[]>);

const triggerCodeMap = triggerGroups.reduce((map, group) => {
  triggerMappings[group].forEach((item) => {
    map[item.label] = item.codes;
  });
  return map;
}, {} as Record<string, string[]>);

export const getTriggerCodes = (labels: string[]) => Array.from(new Set(
  labels.flatMap((label) => triggerCodeMap[label] || []),
));
