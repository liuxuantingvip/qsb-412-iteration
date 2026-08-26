export interface PaginationParamsType {
  pageSize?: number;
  pageNo?: number;
}

export interface ListBackType<T> {
  total?: string | number;
  pages?: string | number;
  size?: string | number;
  current?: string | number;
  records: T[];
}

export interface ApiResponseBackType<T> {
  code: string;
  msg?: null | string;
  subCode?: null | string;
  subMsg?: null | string;
  bizData?: T;
}
