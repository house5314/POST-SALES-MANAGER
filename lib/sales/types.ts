/** 영업 대시보드(공공 상가 등) 타입. */

export type MarketStatRow = {
  regionCode: string;
  regionLabel: string;
  housingCount: number;
  housingGrowthPct: number;
  targetAgeGroup: string;
  peakTime: string;
  floatingPop: number;
  dongHouseholds: number;
  /**
   * 세대·유동인구 등 지표의 출처(상담 초안·상세 패널에 그대로 표기).
   * `/api/commercial/market-stats` 응답에서 채웁니다.
   */
  metricsSourceLabel: string;
};

/** 업체 행 출처(공모전 데모: 공공 상가 API 오버레이만 사용). */
export type BusinessDataSource = "commercial_public";

export type BusinessRow = {
  id: string;
  name: string;
  category: string;
  address: string;
  /** 지번 주소(있을 때만, 지오코딩 2차 fallback용) */
  lnoAdr?: string | null;
  regionCode: string;
  /**
   * 국토부 단지 API용 법정동코드(10자리). 공공 상가 API의 ldongCd.
   * commercial_public 행에서는 이 값 없이 행정동만 있으면 단지 조회를 하지 않습니다.
   */
  ldongCd?: string | null;
  /** 공공 상가 API에서 온 행에는 `commercial_public`을 둡니다. */
  dataSource?: BusinessDataSource;
  lat: number | null;
  lng: number | null;
  revenueTrend: number;
  /** 상가 API 대분류 코드(있을 때만) */
  indsLclsCd?: string | null;
  /** 상가 API 중분류 코드(필터·표시는 코드 기준으로 통일) */
  indsMclsCd?: string | null;
  /** 상가 API 소분류 코드 */
  indsSclsCd?: string | null;
};
