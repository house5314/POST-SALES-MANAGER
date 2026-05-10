/** PRD 시연용 평균매출/평가정보 모의 데이터를 계산합니다. */

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
