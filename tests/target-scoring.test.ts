/** 영업 타깃 우선순위 스코어링(`target-scoring`) 단위 테스트. */
import { describe, expect, it } from "vitest";

import {
  computeTargetScore,
  rankBusinessTargets,
  toTargetGrade,
} from "@/lib/sales/target-scoring";
import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

const makeBusiness = (over: Partial<BusinessRow>): BusinessRow => ({
  id: "b-1",
  name: "테스트상회",
  category: "한식",
  address: "서울특별시 강남구",
  regionCode: "1168010100",
  lat: 37.5,
  lng: 127.0,
  revenueTrend: 0,
  dataSource: "commercial_public",
  ...over,
});

const market: MarketStatRow = {
  regionCode: "1168010100",
  regionLabel: "강남구 역삼동",
  housingCount: 12_000,
  housingGrowthPct: 3,
  targetAgeGroup: "30-49",
  peakTime: "18-21시",
  floatingPop: 30_000,
  dongHouseholds: 12_000,
  metricsSourceLabel: "상권 요약 API",
};

describe("computeTargetScore", () => {
  it("매출 하락 + 배후 수요 + 경쟁 밀도가 모두 높으면 A등급이다", () => {
    const r = computeTargetScore({
      revenueTrendPct: -30,
      households: 20_000,
      sameCategoryCount: 30,
      floatingPop: 50_000,
    });
    expect(r.score).toBe(100);
    expect(r.grade).toBe("A");
  });

  it("모든 신호가 0이면 0점·C등급이다", () => {
    const r = computeTargetScore({
      revenueTrendPct: 0,
      households: 0,
      sameCategoryCount: 0,
      floatingPop: 0,
    });
    expect(r.score).toBe(0);
    expect(r.grade).toBe("C");
  });

  it("매출 성장 업체는 하락 요인 점수가 0으로 계산된다", () => {
    const r = computeTargetScore({
      revenueTrendPct: 15,
      households: 10_000,
      sameCategoryCount: 5,
      floatingPop: 10_000,
    });
    expect(r.breakdown.revenueDecline).toBe(0);
    expect(r.reasons[0]).toContain("매출 유지·성장");
  });

  it("정규화 상한을 넘는 입력은 1.0 으로 포화된다(점수 단조성)", () => {
    const atCap = computeTargetScore({
      revenueTrendPct: -30,
      households: 20_000,
      sameCategoryCount: 30,
      floatingPop: 50_000,
    });
    const overCap = computeTargetScore({
      revenueTrendPct: -90,
      households: 100_000,
      sameCategoryCount: 200,
      floatingPop: 999_999,
    });
    expect(overCap.score).toBe(atCap.score);
  });

  it("같은 입력은 항상 같은 점수를 낸다(결정성)", () => {
    const input = {
      revenueTrendPct: -12,
      households: 8_000,
      sameCategoryCount: 7,
      floatingPop: 20_000,
    };
    expect(computeTargetScore(input)).toEqual(computeTargetScore(input));
  });
});

describe("toTargetGrade", () => {
  it("등급 컷(A≥65, B≥40)을 적용한다", () => {
    expect(toTargetGrade(65)).toBe("A");
    expect(toTargetGrade(64.9)).toBe("B");
    expect(toTargetGrade(40)).toBe("B");
    expect(toTargetGrade(39.9)).toBe("C");
  });
});

describe("rankBusinessTargets", () => {
  it("매출 하락 폭이 큰 업체를 상위로 정렬하고 topN 만 반환한다", () => {
    const businesses = [
      makeBusiness({ id: "up", name: "성장가게", revenueTrend: 10 }),
      makeBusiness({ id: "down-5", name: "소폭하락", revenueTrend: -5 }),
      makeBusiness({ id: "down-25", name: "급락가게", revenueTrend: -25 }),
    ];
    const ranked = rankBusinessTargets(businesses, market, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.business.id).toBe("down-25");
    expect(ranked[1]?.business.id).toBe("down-5");
  });

  it("상권 정보가 없으면 세대·유동인구 0으로 계산하되 오류 없이 동작한다", () => {
    const ranked = rankBusinessTargets(
      [makeBusiness({ revenueTrend: -10 })],
      undefined,
      5
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.result.breakdown.backfillDemand).toBe(0);
  });

  it("경쟁 밀도는 자기 자신을 제외한 동일 업종 수로 계산한다", () => {
    const businesses = [
      makeBusiness({ id: "a", indsSclsCd: "I201", revenueTrend: 0 }),
      makeBusiness({ id: "b", indsSclsCd: "I201", revenueTrend: 0 }),
      makeBusiness({ id: "c", indsSclsCd: "I999", revenueTrend: 0 }),
    ];
    const ranked = rankBusinessTargets(businesses, undefined, 3);
    const a = ranked.find((r) => r.business.id === "a");
    const c = ranked.find((r) => r.business.id === "c");
    expect(a?.result.breakdown.competition).toBeGreaterThan(0);
    expect(c?.result.breakdown.competition).toBe(0);
  });
});
