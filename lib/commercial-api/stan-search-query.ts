/**
 * 행정표준코드 getStanReginCdList(locatadd_nm) 용 검색어 정규화·결과 필터.
 * 사용자 검색어의 의미를 유지하면서 숫자/표기 변형만 제거해 검색 정확도를 높입니다.
 */

/** 숫자·'제'를 제거하고, 끝의 '가'만 제거해 API locatadd_nm 검색어를 만듭니다. */
export const toStanApiLocataddNm = (userQuery: string): string => {
  const q = userQuery.trim();
  const parsedQuery = q
    .replace(/[0-9]/g, "")
    .replace("제", "")
    .replace(/가$/, "");
  return parsedQuery;
};

/** API로 받은 후보를 원본 검색어 또는 정제 검색어 포함 여부로 2차 필터링합니다. */
export const refineStanSearchResults = (
  items: { code: string; label: string }[],
  originalQuery: string
): { code: string; label: string }[] => {
  const query = originalQuery.trim();
  const parsedQuery = toStanApiLocataddNm(query);
  if ((!query && !parsedQuery) || items.length === 0) return items;
  return items.filter(
    (row) =>
      (!!query && row.label.includes(query)) ||
      (!!parsedQuery && row.label.includes(parsedQuery))
  );
};
