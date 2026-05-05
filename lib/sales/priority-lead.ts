import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

/** 우선 영업 대상: 매출 증감 &lt; 0 이고 인근 공동주택 증가율 &gt; 10% (PRD 5.1). */
export const isPriorityLead = (
  b: BusinessRow,
  marketByRegion: Record<string, MarketStatRow>
): boolean => {
  const m = marketByRegion[b.regionCode];
  if (!m) return false;
  return b.revenueTrend < 0 && m.housingGrowthPct > 10;
};
