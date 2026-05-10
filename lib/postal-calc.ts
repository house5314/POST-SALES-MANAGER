/** 생활정보홍보우편 발송 비용을 수량 구간별로 산출합니다(실제 요금은 우체국 최종 견적 기준). */

export type PostalQuote = {
  quantity: number;
  /** 부당 단가(원). */
  unitPriceWon: number;
  /** 구간 할인 전 총액. */
  baseTotalWon: number;
  /** 우체국 특별 감액 비율(%). */
  discountPct: number;
  /** 최종 예상 청구액(원, 원 미만 반올림). */
  finalTotalWon: number;
};

const REFERENCE_UNIT_PRICE = 280;

const DISCOUNT_BRACKETS: { minQty: number; pct: number }[] = [
  { minQty: 8000, pct: 30 },
  { minQty: 5000, pct: 25 },
  { minQty: 3000, pct: 20 },
  { minQty: 1500, pct: 15 },
  { minQty: 500, pct: 10 },
];

/** 발송 부수에 따른 특별 감액률을 결정합니다. */
export const resolvePostalDiscountPct = (quantity: number): number => {
  const q = Math.max(0, Math.floor(quantity));
  const hit = DISCOUNT_BRACKETS.find((b) => q >= b.minQty);
  return hit?.pct ?? 0;
};

/**
 * 수량·단가 기준 견적을 계산합니다.
 * @param quantity 발송 부수
 * @param unitPriceWon 부당 단가(원), 생략 시 기준 단가
 */
export const calculatePostalQuote = (
  quantity: number,
  unitPriceWon: number = REFERENCE_UNIT_PRICE
): PostalQuote => {
  const q = Math.max(0, Math.floor(quantity));
  const pct = resolvePostalDiscountPct(q);
  const baseTotalWon = q * unitPriceWon;
  const finalTotalWon = Math.round((baseTotalWon * (100 - pct)) / 100);
  return {
    quantity: q,
    unitPriceWon,
    baseTotalWon,
    discountPct: pct,
    finalTotalWon,
  };
};
