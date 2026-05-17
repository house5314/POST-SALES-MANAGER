/**
 * Google Generative AI SDK용 클라이언트 설정을 환경 변수에서 읽습니다.
 * 내부망에서는 `GOOGLE_GENERATIVE_AI_BASE_URL`로 DMZ·게이트웨이 URL을 지정합니다.
 */
export type GoogleGenAiClientConfig = {
  apiKey: string;
  /** 미설정 시 SDK 기본(공인 Google v1beta) */
  baseURL?: string;
  /** 기본 `gemini-2.0-flash` */
  modelId: string;
};

/** `GOOGLE_GENERATIVE_AI_*` 환경 변수를 정규화합니다. */
export const getGoogleGenAiClientConfig = (): GoogleGenAiClientConfig => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ?? "";
  const baseURL = process.env.GOOGLE_GENERATIVE_AI_BASE_URL?.trim();
  const modelId =
    process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || "gemini-2.0-flash";
  return {
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    modelId,
  };
};
