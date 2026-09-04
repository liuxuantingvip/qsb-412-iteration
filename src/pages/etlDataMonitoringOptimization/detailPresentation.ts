export type DetailStageField = 'collectStatus' | 'importStatus' | 'validationStatus';

export const detailStageOptions: Record<DetailStageField, string[]> = {
  collectStatus: ['运行中', '等待', '失败', '已停止', '成功', '停止中', '已终止', '加载中', '丢失结果', '无任务'],
  importStatus: ['等待', '成功', '失败', '无任务'],
  validationStatus: ['等待', '成功', '失败', '无任务'],
};

// 仅用于详情展示与筛选，不回写原始阶段事实或修改最终状态聚合。
export function normalizeDetailStatus(field: DetailStageField, raw: string): string {
  const aliases: Record<string, string> = {
    待运行: '等待', 运行失败: '失败', 已完成: '成功',
    PENDING: '等待', RUNNING: '运行中', FAILED: '失败', COMPLETED: '成功',
  };
  if (field === 'validationStatus') {
    if (['正常', '无数据', '无需校验'].includes(raw)) return '成功';
    if (raw === '异常') return '失败';
  }
  return aliases[raw] || raw;
}

export function moveDetailColumn<T extends string>(order: T[], dragged: string, target: string, after: boolean): T[] {
  if (dragged === 'operation' || target === 'operation' || dragged === target) return order;
  if (!order.some(key => key === dragged) || !order.some(key => key === target)) return order;
  const result = order.filter(key => key !== dragged);
  result.splice(result.findIndex(key => key === target) + Number(after), 0, order.find(key => key === dragged)!);
  return result;
}
