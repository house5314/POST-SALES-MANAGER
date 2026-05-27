/**
 * 공공 API 장애·지연 시 UI 안전 모드(기본 견적) 상수.
 */

/** 상권·단지 미반영 시 권장 발송 부수·견적 기본값. */
export const SAFE_MODE_DEFAULT_MAIL_QTY = 1200;

export const SAFE_MODE_BANNER_TITLE = "안전 모드(기본 견적)";

export const SAFE_MODE_BANNER_DETAIL =
  "공공 API 지연 또는 장애로 최신 상권·상가 데이터를 불러오지 못했습니다. 권장 발송 부수·견적은 기본값(1,200부 기준)으로 표시됩니다. 네트워크·키 설정을 확인한 뒤 필터를 다시 조회해 주세요.";

export const SAFE_MODE_CACHE_HINT =
  "직전 조회에 성공한 데이터가 있으면 캐시를 우선 표시합니다(SWR·React Query와 동일한 역할의 메모리 캐시, TTL 5분).";
