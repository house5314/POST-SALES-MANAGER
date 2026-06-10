/**
 * 공공데이터포털 API 베이스 URL 중앙 관리 — 환경변수로 재정의 가능(12-Factor §3 Config).
 *
 * 모든 기본값은 공공데이터포털(data.go.kr)의 *공개* endpoint 로 시크릿을 포함하지 않는다.
 * 인증키(serviceKey)는 별도의 환경변수(PUBLIC_DATA_API_KEY 등)로만 주입되며,
 * 환경별(스테이징·프록시 등) endpoint 교체가 필요하면 아래 env 변수를 설정한다.
 */

/** 소상공인시장진흥공단 상가(상권)정보 API 베이스 URL */
export const SEMAS_BASE_URL =
  process.env.SEMAS_API_BASE_URL ??
  "https://apis.data.go.kr/B553077/api/open/sdsc2";

/** 행정안전부 행정표준코드(법정동) API 베이스 URL */
export const STAN_REGIN_BASE_URL =
  process.env.STAN_REGIN_API_BASE_URL ??
  "https://apis.data.go.kr/1741000/StanReginCd";

/** 국토교통부 공동주택 단지 목록 API endpoint 후보(버전 경로가 다른 두 형식) */
export const MOLIT_APT_ENDPOINT_CANDIDATES = [
  `${
    process.env.MOLIT_APT_API_BASE_URL ??
    "https://apis.data.go.kr/1613000/AptListService3"
  }/getLegaldongAptList3`,
  "https://apis.data.go.kr/1613000/AptListService3_0.1/getLegaldongAptList3",
] as const;
