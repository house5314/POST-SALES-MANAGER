/**
 * AI 라우트용 로그 정책: 프로덕션에서는 구조화 메타만, 개발에서만 마스킹 미리보기 허용.
 */

export type AiRouteLogPhase =
  | "mask_applied"
  | "model_skipped"
  | "model_ok"
  | "model_error";

export type AiRouteLogPayload = {
  /** 라우트 식별(예: /api/ai/assist) */
  route: string;
  phase: AiRouteLogPhase;
  /** 원문 길이(내용은 로그에 넣지 않음) */
  rawCharLength: number;
  /** 마스킹 후 길이 */
  maskedCharLength: number;
  /** HTTP·모델 오류 시 짧은 코드만 */
  errorCode?: string;
  /** 호출한 모델 ID(비밀이 아닌 식별자만) */
  modelId?: string;
  /** GOOGLE_GENERATIVE_AI_BASE_URL 사용 여부(URL 본문은 넣지 않음) */
  usesCustomGenerativeAiBase?: boolean;
};

const redactPreview = (masked: string, max = 160) => {
  const t = masked.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
};

/**
 * AI 관련 서버 로그를 단일 정책으로 출력합니다.
 * @param payload 메타데이터만 포함(원문 금지)
 * @param opts 개발 환경에서만 마스킹된 미리보기(이미 마스킹 적용된 문자열)
 */
export const logAiRouteEvent = (
  payload: AiRouteLogPayload,
  opts?: { maskedPreviewSource?: string }
): void => {
  const base: Record<string, unknown> = {
    ...payload,
    env: process.env.NODE_ENV,
  };

  if (process.env.NODE_ENV === "production") {
    console.info("[AI]", JSON.stringify(base));
    return;
  }

  const preview =
    opts?.maskedPreviewSource !== undefined
      ? redactPreview(opts.maskedPreviewSource)
      : undefined;
  console.info(
    "[AI]",
    JSON.stringify({ ...base, maskedPreview: preview ?? null })
  );
};
