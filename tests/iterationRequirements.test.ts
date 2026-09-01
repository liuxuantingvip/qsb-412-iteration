import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isRequirementPendingAlignment,
  iterationMeta,
  iterationRequirements,
} from '../src/iterationRequirements.ts';

test('exposes the seven 412 requirements in review order', () => {
  assert.deepEqual(
    iterationRequirements.map(({ key, label }) => [key, label]),
    [
      ['qsbOverview', '概览'],
      ['etlDataMonitoringOptimization', '数据监控优化'],
      ['portalOperationLog', '门户操作日志'],
      ['pushStrategyOptimization', '推送策略中心优化'],
      ['messageCenter', '公告推送'],
      ['crmProvisioningAutomation', 'CRM 自动化开通'],
    ],
  );
});

test('marks only CRM provisioning automation as pending alignment', () => {
  assert.equal(isRequirementPendingAlignment('crmProvisioningAutomation'), true);
  assert.equal(isRequirementPendingAlignment('portalOperationLog'), false);
  assert.equal(isRequirementPendingAlignment('qsbOverview'), false);
});

test('opens 412 on overview by default', () => {
  assert.deepEqual(iterationMeta, {
    title: '取数宝412迭代',
    tabListLabel: '412迭代需求切换',
    defaultRequirement: 'qsbOverview',
  });
});
