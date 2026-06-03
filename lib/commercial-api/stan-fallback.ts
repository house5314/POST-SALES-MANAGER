/** 행정표준 검색 실패·빈 응답 시 시연·개발용 기본 법정동 후보. */

export type StanRegionFallbackItem = { code: string; label: string };

export const STAN_REGION_SEARCH_FALLBACK: StanRegionFallbackItem[] = [
  {
    code: "2726010100",
    label: "대구광역시 수성구 범어제1동 (법정동코드 · 시연용 기본값)",
  },
];

/** 세종 등 API 빈 응답 시 `q`에 맞춰 보조 후보를 반환합니다. */
export const pickStanRegionFallbackForQuery = (
  query: string
): StanRegionFallbackItem[] => {
  const q = query.trim();
  if (q.includes("세종")) {
    return [
      { code: "3611010300", label: "세종특별자치시 한솔동" },
      { code: "3611010400", label: "세종특별자치시 도담동" },
      { code: "3611010500", label: "세종특별자치시 아름동" },
      { code: "3611010600", label: "세종특별자치시 종촌동" },
      { code: "3611010700", label: "세종특별자치시 고운동" },
    ];
  }
  return STAN_REGION_SEARCH_FALLBACK;
};
