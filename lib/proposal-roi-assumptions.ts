/** 제안서(PDF) Section 3 ROI 시뮬레이션 — 가정치·출처 고지(목표 부합성·심사 대응). */

export type ProposalRoiTemplateType = "A" | "B" | "C";

/** PDF·설계서에 공통으로 쓰는 ROI 가정 고지(한 문단). */
export const PROPOSAL_ROI_SIMULATION_DISCLAIMER =
  "※ 본 절의 전환·회수율은 PoC 시연용 가정치이며, 생활정보홍보우편·업종별 실제 반응률과 다를 수 있습니다. 상용화 시 우정사업본부 내부 통계 또는 광고·DM 우편 업계 벤치마크로 교체·검증해야 합니다.";

/** 가정치 참고 범위(출처 성격 명시). */
export const PROPOSAL_ROI_ASSUMPTION_REFERENCE =
  "참고(가정): 일반 광고·직접우편(DM)류 캠페인에서 흔히 인용되는 응답·회수율 **0.5~2% 구간**을 템플릿 분기용으로만 사용했습니다(업계 관행·문헌 범위, **본 과제 실측·우체국 공식 통계 아님**).";

const ROI_RATE_BY_TEMPLATE: Record<
  ProposalRoiTemplateType,
  { ratePct: number; rateLabel: string; effectPhrase: string }
> = {
  A: {
    ratePct: 1.0,
    rateLabel: "1.0%",
    effectPhrase: "즉각적인 매출 증대 효과",
  },
  B: {
    ratePct: 0.5,
    rateLabel: "0.5%",
    effectPhrase: "매출 방어 효과",
  },
  C: {
    ratePct: 2.0,
    rateLabel: "2.0%",
    effectPhrase: "신규 단골 확보",
  },
};

/**
 * 템플릿별 ROI 본문(가정치·출처 문구 포함).
 * @param type A/B/C
 * @param mailQuantity 발송 부수
 */
export const buildProposalRoiNarrative = (
  type: ProposalRoiTemplateType,
  mailQuantity: number
): { roi: string; conversionRate: string } => {
  const qty = Math.max(0, Math.floor(mailQuantity));
  const cfg = ROI_RATE_BY_TEMPLATE[type];
  const cases = Math.max(1, Math.round((qty * cfg.ratePct) / 100));
  const rateWord = type === "C" ? "쿠폰 회수율" : "전환율";

  const roi =
    `우편물 ${qty.toLocaleString("ko-KR")}부 발송 시, ${PROPOSAL_ROI_ASSUMPTION_REFERENCE} ` +
    `이에 따라 ${rateWord} **${cfg.rateLabel}(가정)** · 약 **${cases.toLocaleString("ko-KR")}건** 응답을 가정하면 ${cfg.effectPhrase}가 기대됩니다. ` +
    PROPOSAL_ROI_SIMULATION_DISCLAIMER;

  return { roi, conversionRate: `${cfg.rateLabel}(가정)` };
};
