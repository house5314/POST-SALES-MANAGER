/** 소상공인시장진흥공단 상가(상권) API(sdsc2) JSON 공통 형태. */

export type SemasHeader = {
  columns?: string[];
  description?: string;
};

export type SemasBody<T = Record<string, unknown>> = {
  totalCount?: number;
  items?: T[] | { item?: T | T[] } | null;
};

export type SemasJsonResponse<T = Record<string, unknown>> = {
  header?: SemasHeader;
  body?: SemasBody<T>;
  /** 오류 시 resultCode 등 */
  resultCode?: string;
};
