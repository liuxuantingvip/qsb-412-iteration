import type { RequirementKey } from '@/context/RequirementContext';

export const iterationMeta = {
  title: '取数宝412迭代',
  tabListLabel: '412迭代需求切换',
  defaultRequirement: 'qsbOverview',
} as const satisfies {
  title: string;
  tabListLabel: string;
  defaultRequirement: RequirementKey;
};

export const iterationRequirements: Array<{ key: RequirementKey; label: string }> = [
  { key: 'qsbOverview', label: '概览' },
  { key: 'etlDataMonitoringOptimization', label: '数据监控优化' },
  { key: 'pushStrategyOptimization', label: '推送策略中心优化' },
  { key: 'messageCenter', label: '公告推送' },
  { key: 'crmProvisioningAutomation', label: 'CRM 自动化开通' },
];

export const isRequirementPendingAlignment = (key: RequirementKey) => (
  key === 'crmProvisioningAutomation'
);
