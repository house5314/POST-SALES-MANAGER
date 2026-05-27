/** AI 연동 공용: 입력 마스킹·로그 정책(모델 호출 라우트에서 import). */
export { maskSensitiveTextForModel } from "@/lib/ai/mask-sensitive-text";
export { logAiRouteEvent } from "@/lib/ai/ai-request-logger";
export type {
  AiRouteLogPayload,
  AiRouteLogPhase,
} from "@/lib/ai/ai-request-logger";
export {
  getGoogleGenAiClientConfig,
  type GoogleGenAiClientConfig,
} from "@/lib/ai/google-genai-config";
export {
  AI_ASSIST_TEMPERATURE_MAX,
  buildAiAssistSystemPrompt,
  resolveAiAssistTemperature,
} from "@/lib/ai/assist-model-params";
