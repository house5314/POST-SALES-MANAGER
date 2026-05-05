/** 행정표준 검색 실패·빈 응답 시 시연·개발용 기본 법정동 후보. */

export type StanRegionFallbackItem = { code: string; label: string };

export const STAN_REGION_SEARCH_FALLBACK: StanRegionFallbackItem[] = [
  {
    code: "2726010100",
    label: "대구광역시 수성구 범어제1동 (법정동코드 · 시연용 기본값)",
  },
];
