/** 공공데이터포털·소진공 API 일일 한도·HTTP 429 판별. */

export const PUBLIC_API_QUOTA_USER_MESSAGE =
  "API 일일 한도 초과. 내일 다시 시도하세요.";

/** HTTP 상태가 쿼터 초과인지 판별합니다. */
export const isHttpQuotaStatus = (status: number) => status === 429;

/**
 * JSON·오류 문자열에서 resultCode 22 등 일일 한도 패턴을 탐지합니다.
 * @param payload 응답 본문 또는 오류 메시지
 */
export const detectPublicApiQuotaExceeded = (
  payload: unknown
): string | null => {
  if (payload == null) return null;
  const text =
    typeof payload === "string"
      ? payload
      : (() => {
          try {
            return JSON.stringify(payload);
          } catch {
            return String(payload);
          }
        })();

  if (
    /resultCode["\s:]*"?22"?/i.test(text) ||
    /INFO-22/i.test(text) ||
    /일일\s*(트래픽|호출|이용)?\s*한도|한도\s*초과|EXCEEDS|Too Many Requests|429/i.test(
      text
    )
  ) {
    return PUBLIC_API_QUOTA_USER_MESSAGE;
  }
  return null;
};
