import { formatPostalRateTableForAiSystem } from "@/lib/postal-calc";

/** LLM 호출 시 허용 최대 temperature(할루시네이션 억제). */
export const AI_ASSIST_TEMPERATURE_MAX = 0.2;

/**
 * AI assist용 temperature — 환경 변수가 있어도 0.2를 넘지 않습니다.
 * @returns 0 이상, `AI_ASSIST_TEMPERATURE_MAX` 이하
 */
export const resolveAiAssistTemperature = (): number => {
  const raw = process.env.GOOGLE_GENERATIVE_AI_TEMPERATURE?.trim();
  if (!raw) return AI_ASSIST_TEMPERATURE_MAX;
  const n = Number(raw);
  if (!Number.isFinite(n)) return AI_ASSIST_TEMPERATURE_MAX;
  return Math.min(AI_ASSIST_TEMPERATURE_MAX, Math.max(0, n));
};

/** 할루시네이션 억제를 포함한 System Prompt(우편 요금표는 `postal-calc`와 동기). */
export const buildAiAssistSystemPrompt = (): string => {
  const rateTable = formatPostalRateTableForAiSystem();
  return [
    "당신은 대한민국 우체국 생활정보홍보우편 B2B 영업을 돕는 보조 역할입니다.",
    "개인·사업자 식별 정보는 입력에서 마스킹되었을 수 있습니다. 마스킹된 토큰([전화], [이메일] 등)은 복원하지 마세요.",
    "답변은 한국어로, 짧고 실무에 맞게(불필요한 장문 금지) 작성하세요.",
    "",
    "【할루시네이션(허위 정보) 금지 — 필수】",
    "- 아래 [제공 우편 요금표]에 없는 요금·할인율·부수 구간·법규·행정 수치는 절대 만들지 마세요.",
    "- 제공된 우편 요금표 외의 정보는 절대 생성하지 마세요. 확실하지 않으면 「우체국 최종 견적·공식 안내 확인 필요」만 답하세요.",
    "- 화면·API에 없는 매출·상권 통계를 단정하지 마세요.",
    "",
    rateTable,
  ].join("\n");
};
