/** PRD 시연용 평균매출/평가정보 모의 데이터를 계산합니다. */

/** 시연·가공 지표 배지(필터·카드 등). */
export const MOCK_SALES_METRICS_BADGE_LABEL = "가공·시연";

/**
 * 제안서 생성(인쇄/PDF) 카드 하단 등에 노출하는 시연 데이터 안내(심사관 확인용).
 * 상권 세대·유동인구는 `MARKET_STAT_METRICS_SOURCE_LABEL`(lib/sales/build-market-stat-row)과 함께 안내합니다.
 */
export const MOCK_DATA_SIMULATION_PANEL_INTRO = [
  "전월 대비 매출(%), 업종 평균매출, 대표자 프로필(성별·연령·업력) 중 일부는",
  "시연용 가공 규칙으로 생성된 값이며, 소진공 실매출·행정통계 원천과 동일하지 않습니다.",
].join(" ");

/** ‘매출 추세’ 게이지 카드 하단 한 줄. */
export const MOCK_REVENUE_TREND_GAUGE_DISCLAIMER =
  "위 비율(%)는 시연용 가모델이며 실제 매출 조회값이 아닙니다.";

/** 필터 패널 매출 추세 구역 하단 한 줄. */
export const MOCK_REVENUE_FILTER_FOOTNOTE =
  "목록 %·필터는 동일한 시연용 가공 매출 추세를 사용합니다.";

/** 제안서 PDF 상단에 넣는 고지(HTML 이스케이프 후 삽입). */
export const MOCK_PROPOSAL_PRINT_DISCLAIMER =
  "본 PDF의 전월 대비 매출(%), 업종 평균·진단 수치 일부 및 평가정보 미연동 시 업력은 시연용 가공 규칙이며 행정통계·실제 소진공 조회 원천이 아닙니다. 배후 세대·유동인구는 본 절 KPI 출처 문구를 따릅니다.";

export type MockIndustryAvg = {
  avgSalesAmount: number;
  avgSalesPerArea: number;
};

/** 문자열 시드 기반으로 안정적인 숫자 해시를 만듭니다. */
const toSeed = (value: string) =>
  Array.from(value).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

/** 업종/행정동 기반 평균매출 모의치를 계산합니다. */
export const buildMockIndustryAvg = (
  dong: string,
  endpointKey: "out" | "srvc" | "whrt"
): MockIndustryAvg => {
  const baseSeed = toSeed(dong || "default");
  const endpointBias =
    endpointKey === "out" ? 3800000 : endpointKey === "srvc" ? 2600000 : 3200000;
  const avgSalesAmount = endpointBias + ((baseSeed % 140) + 30) * 22000;
  const avgSalesPerArea = Math.round(avgSalesAmount / 11.5);
  return {
    avgSalesAmount,
    avgSalesPerArea,
  };
};

/** 업체 식별값 기준 개인사업자 평가정보 모의치를 계산합니다. */
export const buildMockEvlInfo = (businessId: string, name: string) => {
  const seed = toSeed(`${businessId}:${name}`);
  const establishedYear = 2015 + (seed % 10);
  const yearsInBusiness = new Date().getFullYear() - establishedYear;
  const ageGroups = ["20-30대", "30-40대", "40-50대", "50-60대"] as const;
  return {
    gender: seed % 2 === 0 ? ("남성" as const) : ("여성" as const),
    ageGroup: ageGroups[seed % ageGroups.length],
    establishedYear,
    yearsInBusiness: Math.max(0, yearsInBusiness),
  };
};

/** 업체/동/업종 기반으로 안정적인 매출 추세(%)를 계산합니다. */
export const buildMockRevenueTrend = (
  businessId: string,
  dong: string,
  indsLclsCd?: string | null
) => {
  const seed = toSeed(`${businessId}:${dong}:${indsLclsCd ?? "all"}`);
  const cycle = (seed % 25) - 12;
  const trend = Math.max(-18, Math.min(16, cycle));
  return trend === 0 ? 2 : trend;
};
