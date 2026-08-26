import { PaginationInitData } from '@/constants';

export const setIdxForPaginationData = (
  source: Record<string, any>[],
  pageNo?: number,
  pageSize?: number,
) => {
  (source || []).map((item: any, index: number) => {
    item.idx =
      index +
      1 +
      (Number(pageNo || PaginationInitData.pageNo) - 1) *
        Number(pageSize || PaginationInitData.pageSize);

    return item;
  });

  return source || [];
};
