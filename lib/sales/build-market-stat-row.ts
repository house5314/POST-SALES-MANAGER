import type { MarketStatRow } from "@/lib/sales/types";

/** 세대·유동인구 등 상권 요약 지표의 공통 출처 문구(상담·PDF와 동일하게 사용). */
export const MARKET_STAT_METRICS_SOURCE_LABEL =
  "상권 요약 API(POST /api/commercial/market-stats) · 법정동코드 기준 가공 모델(실제 행정통계 원천 아님)";

/** 상권 요약이 아직 없을 때 상세 패널·상담 초안에 쓰는 안내 문구. */
export const MARKET_STAT_METRICS_UNAVAILABLE_LABEL =
  "상권 요약 미연동 — 읍·면·동(법정동) 선택 후 상가 조회가 완료되면 동일 API로 세대·유동인구 지표가 붙습니다.";

const PEAK_SLOTS = ["07~10시", "11~14시", "14~17시", "18~21시"] as const;
const AGE_GROUPS = ["20-30대", "30-40대", "40-50대", "50-60대"] as const;

/** 법정동코드 문자열로 결정적 시드를 만듭니다. */
const regionSeed = (regionCode: string) =>
  Array.from(regionCode.trim() || "default").reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0
  );

/**
 * 법정동(또는 상권) 코드 기준 상권 요약 행을 생성합니다(가공·시연용).
 * @param regionCode 법정동코드 등 `BusinessRow.regionCode`와 동일 키
 * @param regionLabel 지도·상담에 쓸 한글 라벨(없으면 코드 기반 기본값)
 */
export const buildMarketStatRow = (
  regionCode: string,
  regionLabel: string
): MarketStatRow => {
  const code = regionCode.trim();
  const seed = regionSeed(code);
  const housingCount = 1200 + (seed % 5200);
  const dongHouseholds = 1800 + (seed % 6800);
  const floatingPop = 4000 + (seed % 18000);
  const peakTime = PEAK_SLOTS[seed % PEAK_SLOTS.length];
  const targetAgeGroup = AGE_GROUPS[seed % AGE_GROUPS.length];
  /** 우선 영업(PR: 주택 증가율 10% 초과)과 맞물리도록 4~38% 구간으로 분포합니다. */
  const housingGrowthPct = 4 + (seed % 35);
  const label = regionLabel.trim() || `상권(${code})`;
  return {
    regionCode: code,
    regionLabel: label,
    housingCount,
    housingGrowthPct,
    targetAgeGroup,
    peakTime,
    floatingPop,
    dongHouseholds,
    metricsSourceLabel: MARKET_STAT_METRICS_SOURCE_LABEL,
  };
};
