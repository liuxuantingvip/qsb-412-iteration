import test from 'node:test';
import assert from 'node:assert/strict';
import { detailStageOptions, normalizeDetailStatus, moveDetailColumn } from '../src/pages/etlDataMonitoringOptimization/detailPresentation.ts';

test('three stages have exactly their own ordered options', () => {
  assert.deepEqual(detailStageOptions.collectStatus, ['运行中', '等待', '失败', '已停止', '成功', '停止中', '已终止', '加载中', '丢失结果', '无任务']);
  for (const field of ['importStatus', 'validationStatus'] as const) {
    assert.deepEqual(detailStageOptions[field], ['等待', '成功', '失败', '无任务']);
  }
});
test('raw aliases map to display values without modifying source facts', () => {
  for (const [raw, label] of [['待运行', '等待'], ['运行失败', '失败'], ['已完成', '成功'], ['RUNNING', '运行中'], ['PENDING', '等待'], ['FAILED', '失败'], ['COMPLETED', '成功']]) {
    assert.equal(normalizeDetailStatus('collectStatus', raw), label);
  }
  assert.equal(normalizeDetailStatus('importStatus', '待运行'), '等待');
  assert.equal(normalizeDetailStatus('validationStatus', '正常'), '成功');
  assert.equal(normalizeDetailStatus('validationStatus', '异常'), '失败');
  assert.equal(normalizeDetailStatus('validationStatus', '无数据'), '成功');
  assert.equal(normalizeDetailStatus('collectStatus', '未知状态'), '未知状态');
});
test('reorder preserves every column and keeps operation last', () => {
  const source = ['a', 'b', 'c', 'operation'];
  assert.deepEqual(moveDetailColumn(source, 'a', 'c', true), ['b', 'c', 'a', 'operation']);
  assert.deepEqual(moveDetailColumn(source, 'c', 'a', false), ['c', 'a', 'b', 'operation']);
  for (const [drag, target] of [['operation', 'a'], ['a', 'operation'], ['missing', 'a'], ['a', 'a']]) {
    assert.deepEqual(moveDetailColumn(source, drag, target, true), source);
  }
  assert.deepEqual(source, ['a', 'b', 'c', 'operation']);
});
