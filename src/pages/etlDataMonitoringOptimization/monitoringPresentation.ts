export function filterMonitorDates(dates: string[], range?: string[]): string[] {
  if (!range || range.length !== 2) return dates;
  return dates.filter(date => date >= range[0] && date <= range[1]);
}

export function matchesPlanKeyword(plans: string[], keyword: string): boolean {
  const query = keyword.trim();
  return !query || plans.some(plan => plan.includes(query));
}

export function showNoDataLabel(status: string, noData?: boolean): boolean {
  return status === '成功' && Boolean(noData);
}

export const mergedDetailFields = ['channel', 'platform', 'bizDateRange', 'dataCycle', 'tableName', 'tableNameEn', 'connectorName'] as const;
type MergeRow = Record<typeof mergedDetailFields[number], string>;

// 仅传入已筛选、已分页的行。按同报表同日期分组后，各公共列独立合并连续相同值。
export function detailRowSpans<T extends MergeRow>(rows: T[], field: string): number[] {
  const spans = rows.map(() => 1);
  if (!(mergedDetailFields as readonly string[]).includes(field)) return spans;
  const key = field as keyof MergeRow;
  for (let start = 0; start < rows.length;) {
    let end = start + 1;
    while (end < rows.length && rows[end].tableName === rows[start].tableName
      && rows[end].tableNameEn === rows[start].tableNameEn
      && rows[end].bizDateRange === rows[start].bizDateRange
      && rows[end][key] === rows[start][key]) end++;
    spans[start] = end - start;
    for (let index = start + 1; index < end; index++) spans[index] = 0;
    start = end;
  }
  return spans;
}
