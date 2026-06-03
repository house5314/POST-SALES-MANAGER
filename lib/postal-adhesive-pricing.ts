/** 생활정보홍보우편 접착형 — 우체국 안내 단가(PoC·상담·제안서 공통). */

export const ADHESIVE_UNIT_PRICE_WON = 360;

/**
 * 접착형 단가·형태·부수별 비용 안내 문단(우체국 금액 기준).
 * @param quantity 발송 부수(권장 발송 규모 등)
 */
export const buildAdhesivePostalPricingParagraph = (quantity: number): string => {
  const qty = Math.max(0, Math.floor(quantity));
  const totalWon = qty * ADHESIVE_UNIT_PRICE_WON;
  return `'접착형'은 통당 ${ADHESIVE_UNIT_PRICE_WON.toLocaleString("ko-KR")}원이며, 용지 1장(3단 접지, 6면)의 1면에 홍보 내용을 인쇄하여, 3단으로 접어 접착방식으로 봉합한 우편물입니다. ${qty.toLocaleString("ko-KR")}부 기준으로 ${totalWon.toLocaleString("ko-KR")}원의 비용이 발생하고 추가옵션에 따라 비용이 달라질 수 있습니다.`;
};
