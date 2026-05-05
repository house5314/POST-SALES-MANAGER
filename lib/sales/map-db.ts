import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

type MarketStatDb = {
  region_code: string;
  region_label: string;
  housing_count: number;
  housing_growth_pct: number;
  target_age_group: string | null;
  peak_time: string | null;
  floating_pop: number;
  dong_households: number;
};

type BusinessDb = {
  id: string;
  name: string;
  category: string;
  address: string;
  lno_adr?: string | null;
  region_code: string | null;
  lat: number;
  lng: number;
  revenue_trend: number;
  inds_lcls_cd: string | null;
};

export const mapMarketStatRow = (r: MarketStatDb): MarketStatRow => ({
  regionCode: r.region_code,
  regionLabel: r.region_label,
  housingCount: r.housing_count,
  housingGrowthPct: Number(r.housing_growth_pct),
  targetAgeGroup: r.target_age_group ?? "",
  peakTime: r.peak_time ?? "",
  floatingPop: r.floating_pop,
  dongHouseholds: r.dong_households,
});

export const mapBusinessRow = (r: BusinessDb): BusinessRow => ({
  id: r.id,
  name: r.name,
  category: r.category,
  address: r.address,
  lnoAdr: r.lno_adr ?? null,
  regionCode: r.region_code ?? "",
  lat: r.lat,
  lng: r.lng,
  revenueTrend: r.revenue_trend,
  indsLclsCd: r.inds_lcls_cd,
});
