/**
 * 소상공인365 빅데이터 포털 iframe 경로(포털 발급 화면 URL과 동일해야 함).
 * @see https://bigdata.sbiz.or.kr/#/openApi/detail | storSttus | slsIdex
 */
export const SBIZ_IFRAME_PATH_SEGMENTS = {
  /** 상세분석 → …/openApi/detail */
  detail: "detail",
  /** 업소현황 → …/openApi/storSttus */
  storeStatus: "storSttus",
  /** 점포당 매출액 추이 → …/openApi/slsIdex */
  salesTrend: "slsIdex",
} as const;

export type SbizIframeKind = keyof typeof SBIZ_IFRAME_PATH_SEGMENTS;

export type SbizIframeCertKeys = {
  detail: string;
  storeStatus: string;
  salesTrend: string;
};

/**
 * 탭별 certKey(NEXT_PUBLIC_*).
 * Next.js는 `process.env["동적문자열"]` 접근 시 값을 번들에 넣지 않으므로 반드시 정적 속성으로 읽습니다.
 */
export const getSbizIframeCertKeys = (): SbizIframeCertKeys => {
  const shared = process.env.NEXT_PUBLIC_SBIZ_CERT_KEY?.trim() ?? "";
  return {
    detail:
      process.env.NEXT_PUBLIC_SBIZ_CERT_DETAIL?.trim() ||
      process.env.NEXT_PUBLIC_SBIZ_OPENAPI_CERT_DETAIL?.trim() ||
      shared,
    storeStatus:
      process.env.NEXT_PUBLIC_SBIZ_CERT_STOR_STTUS?.trim() ||
      process.env.NEXT_PUBLIC_SBIZ_OPENAPI_CERT_STOR_STTUS?.trim() ||
      shared,
    salesTrend:
      process.env.NEXT_PUBLIC_SBIZ_CERT_SLS_IDEX?.trim() ||
      process.env.NEXT_PUBLIC_SBIZ_OPENAPI_CERT_SLS_IDEX?.trim() ||
      shared,
  };
};

/** certKey 로 소상공인365 iframe src URL을 만듭니다. */
export const buildSbizIframeSrc = (kind: SbizIframeKind, certKey: string): string => {
  const trimmed = certKey.trim();
  const seg = SBIZ_IFRAME_PATH_SEGMENTS[kind];
  return `https://bigdata.sbiz.or.kr/#/openApi/${seg}?certKey=${encodeURIComponent(trimmed)}`;
};

/** 제안서 부록·레거시 호환: 상세분석 탭과 동일 키. */
export const getSbizCertKeyPublic = (): string => getSbizIframeCertKeys().detail;
