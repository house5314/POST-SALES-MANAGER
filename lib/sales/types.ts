/** PRD·Supabase 매핑용 영업 대시보드 타입. */

export type MarketStatRow = {
  regionCode: string;
  regionLabel: string;
  housingCount: number;
  housingGrowthPct: number;
  targetAgeGroup: string;
  peakTime: string;
  floatingPop: number;
  dongHouseholds: number;
};

export type BusinessRow = {
  id: string;
  name: string;
  category: string;
  address: string;
  /** 지번 주소(있을 때만, 지오코딩 2차 fallback용) */
  lnoAdr?: string | null;
  regionCode: string;
  lat: number | null;
  lng: number | null;
  revenueTrend: number;
  /** 상가 API 대분류 코드(있을 때만) */
  indsLclsCd?: string | null;
};
