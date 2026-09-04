import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isRequirementPendingAlignment,
  iterationMeta,
  iterationRequirements,
} from '../src/iterationRequirements.ts';

test('exposes the six 412 requirements after moving CRM to 413', () => {
  assert.deepEqual(
    iterationRequirements.map(({ key, label }) => [key, label]),
    [
      ['qsbOverview', '概览'],
      ['etlDataMonitoringOptimization', '数据监控优化'],
      ['runDetailStorageLog', '运行详情新增入库日志'],
      ['portalOperationLog', '门户操作日志'],
      ['pushStrategyOptimization', '推送策略中心优化'],
      ['messageCenter', '公告推送'],
    ],
  );
});

test('has no pending-alignment requirements in 412', () => {
  assert.ok(iterationRequirements.every(({ key }) => !isRequirementPendingAlignment(key)));
  assert.equal(isRequirementPendingAlignment('qsbOverview'), false);
  assert.equal(isRequirementPendingAlignment('runDetailStorageLog'), false);
  assert.equal(isRequirementPendingAlignment('portalOperationLog'), false);
});

test('opens 412 on overview by default', () => {
  assert.deepEqual(iterationMeta, {
    title: '取数宝412迭代',
    tabListLabel: '412迭代需求切换',
    defaultRequirement: 'qsbOverview',
  });
});
