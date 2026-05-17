/** 공공데이터포털 연동 API 응답(raw 텍스트·XML 오류·JSON 파싱) 처리. */

/** URLSearchParams 설정 후에도 쿼리 끝에 `&type=json` 을 한 번 더 붙입니다(포털 호환). */
export const buildUrlWithExplicitTypeJson = (
  baseAndPath: string,
  params: URLSearchParams
): string => {
  params.set("type", "json");
  return `${baseAndPath}?${params.toString()}&type=json`;
};

const trimStart = (s: string) => s.trimStart();

/** XML 오류 응답에서 사람이 읽기 쉬운 한 줄 요약을 뽑습니다. */
export const summarizePublicDataXmlBody = (raw: string): string => {
  const errMsg = raw.match(/<errMsg>([^<]*)<\/errMsg>/i)?.[1]?.trim();
  const returnAuthMsg = raw
    .match(/<returnAuthMsg>([^<]*)<\/returnAuthMsg>/i)?.[1]
    ?.trim();
  const resultMsg = raw.match(/<resultMsg>([^<]*)<\/resultMsg>/i)?.[1]?.trim();
  const returnReason = raw
    .match(/<returnReasonCode>([^<]*)<\/returnReasonCode>/i)?.[1]
    ?.trim();
  const resultCode = raw.match(/<resultCode>([^<]*)<\/resultCode>/i)?.[1]?.trim();
  const parts = [
    resultCode && `코드 ${resultCode}`,
    errMsg || returnAuthMsg || resultMsg,
    returnReason && `사유코드 ${returnReason}`,
  ].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return raw.replace(/\s+/g, " ").trim().slice(0, 600);
};

/** 본문이 공공데이터 XML 오류 형태인지 판별합니다. */
export const isPublicDataXmlErrorPayload = (raw: string): boolean => {
  const t = trimStart(raw);
  if (t.startsWith("<?xml")) return true;
  if (/^<\s*OpenAPI_ServiceResponse\b/i.test(t)) return true;
  return /^<\s*response\b[^>]*>/i.test(t) && /<cmmMsgHeader/i.test(t);
};

/**
 * fetch 응답을 text로 읽고(개발 환경에서만 원문 일부를 로그) JSON으로 파싱합니다.
 * XML 오류 본문이면 파싱을 중단하고 예외를 던집니다.
 *
 * @param res fetch 응답
 * @param context 로그/오류 식별용 라벨(예: StanReginCd/getStanReginCdList)
 */
export const parsePublicDataFetchAsJson = async (
  res: Response,
  context: string
): Promise<Record<string, unknown>> => {
  const raw = await res.text();
  if (process.env.NODE_ENV === "development") {
    const preview =
      raw.length > 2000 ? `${raw.slice(0, 2000)}…(${raw.length}자)` : raw;
    // 서버(라우트·RSC)에서는 터미널로, 브라우저에서는 개발자 도구 콘솔로 출력됩니다.
    console.log(`[공공 API Raw] ${context}`, preview);
  }

  const t = trimStart(raw);
  if (isPublicDataXmlErrorPayload(raw)) {
    const summary = summarizePublicDataXmlBody(raw);
    throw new Error(`[공공 API XML] ${context}: ${summary}`);
  }

  if (!res.ok) {
    throw new Error(
      `[공공 API HTTP ${res.status}] ${context}: ${t.slice(0, 500)}`
    );
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      `[공공 API JSON 파싱 실패] ${context}: 원문 앞 400자 — ${t.slice(0, 400)}`
    );
  }
};
