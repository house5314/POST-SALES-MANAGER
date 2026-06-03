/** 선택 업체·상권 지표를 AI 보조용 프롬프트로 조합합니다(자동 주입). */

export type InsightSummaryPromptInput = {
  businessName: string;
  category: string;
  revenueTrend: number;
  regionLabel: string;
  effectiveMailQty: number;
  yearsInBusiness?: number;
  isPriority: boolean;
  housingCount?: number;
  dongHouseholds?: number;
};

/** 상가 클릭·상권 데이터 기반 영업 포인트 요약 요청문을 만듭니다. */
export const buildInsightSummaryPrompt = (
  input: InsightSummaryPromptInput
): string => {
  const lines = [
    "당신은 우체국 생활정보홍보우편 B2B 영업 코치입니다.",
    "아래 상권·업체 데이터만 근거로, 통화·방문 시 쓸 핵심 영업 포인트 3~5개를 한국어 불릿으로 요약하세요.",
    "우편 요금·할인율은 제공된 요금표·시스템 견적 외에는 추측하지 마세요. 불확실하면 「우체국 최종 견적 확인」이라고 적으세요.",
    "",
    `[업체] ${input.businessName} (${input.category})`,
    `[지역] ${input.regionLabel}`,
    `[매출 추세(가공·시연)] 전월 대비 ${input.revenueTrend}%`,
    `[권장 발송 부수] ${input.effectiveMailQty.toLocaleString("ko-KR")}부`,
  ];
  if (input.yearsInBusiness != null) {
    lines.push(`[업력(평가정보)] ${input.yearsInBusiness}년`);
  }
  if (input.housingCount != null) {
    lines.push(
      `[배후 수요(상권)] 공동주택 ${input.housingCount.toLocaleString("ko-KR")}세대`
    );
  }
  if (input.dongHouseholds != null) {
    lines.push(
      `[동 가구] ${input.dongHouseholds.toLocaleString("ko-KR")}세대`
    );
  }
  lines.push(
    `[우선 후보] ${input.isPriority ? "예" : "아니오"}`,
    "",
    "출력: 불릿만, 각 1~2문장, 과장·허위 통계 금지."
  );
  return lines.join("\n");
};
