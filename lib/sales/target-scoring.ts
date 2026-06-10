/**
 * 영업 타깃 우선순위 스코어링 — 매출 추세·배후 수요·경쟁 밀도·유동인구를
 * 정규화·가중합하여 0~100점과 A/B/C 등급으로 산출합니다(설계서 §5.3).
 * 결정적(같은 입력 → 같은 출력) 규칙 기반 알고리즘으로 단위 테스트로 검증합니다.
 */
import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

/** 요인별 가중치 — 합 1.0. 홍보우편 효과 가설(하락 업체일수록 홍보 필요)을 반영. */
export const TARGET_SCORE_WEIGHTS = {
  /** 매출 하락 신호: 하락 폭이 클수록 홍보우편 제안 적합 */
  revenueDecline: 0.4,
  /** 배후 수요: 동·단지 세대수가 많을수록 도달 효과 큼 */
  backfillDemand: 0.3,
  /** 경쟁 밀도: 동일 업종이 많을수록 차별화 홍보 필요 */
  competition: 0.2,
  /** 유동인구: 보조 지표 */
  floatingPop: 0.1,
} as const;

/** 정규화 상한(현장 데이터 분포 기준 고정 캡 — 초과분은 1.0 포화). */
const REVENUE_DECLINE_CAP_PCT = 30;
const HOUSEHOLDS_CAP = 20_000;
const COMPETITION_CAP = 30;
const FLOATING_POP_CAP = 50_000;

export type TargetGrade = "A" | "B" | "C";

export type TargetScoreBreakdown = {
  /** 0~1 정규화 값 */
  revenueDecline: number;
  backfillDemand: number;
  competition: number;
  floatingPop: number;
};

export type TargetScoreResult = {
  /** 0~100 종합 점수(소수 첫째 자리 반올림) */
  score: number;
  grade: TargetGrade;
  breakdown: TargetScoreBreakdown;
  /** 점수 근거 한글 설명(상담 멘트·툴팁용) */
  reasons: string[];
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 등급 컷: A ≥ 65, B ≥ 40, 그 외 C. */
export const toTargetGrade = (score: number): TargetGrade =>
  score >= 65 ? "A" : score >= 40 ? "B" : "C";

export type TargetScoreInput = {
  /** 전월 대비 매출 변동률(%) — 음수면 하락 */
  revenueTrendPct: number;
  /** 배후 세대수(동 세대수 또는 선택 단지 세대 합) */
  households: number;
  /** 같은 업종(소분류 기준) 업체 수 — 조회 결과 내 */
  sameCategoryCount: number;
  /** 상권 유동인구(없으면 0) */
  floatingPop: number;
};

/** 단일 업체의 영업 우선순위 점수를 계산합니다. */
export const computeTargetScore = (input: TargetScoreInput): TargetScoreResult => {
  const breakdown: TargetScoreBreakdown = {
    revenueDecline: clamp01(
      Math.max(0, -input.revenueTrendPct) / REVENUE_DECLINE_CAP_PCT
    ),
    backfillDemand: clamp01(input.households / HOUSEHOLDS_CAP),
    competition: clamp01(input.sameCategoryCount / COMPETITION_CAP),
    floatingPop: clamp01(input.floatingPop / FLOATING_POP_CAP),
  };

  const raw =
    breakdown.revenueDecline * TARGET_SCORE_WEIGHTS.revenueDecline +
    breakdown.backfillDemand * TARGET_SCORE_WEIGHTS.backfillDemand +
    breakdown.competition * TARGET_SCORE_WEIGHTS.competition +
    breakdown.floatingPop * TARGET_SCORE_WEIGHTS.floatingPop;
  const score = Math.round(raw * 1000) / 10;

  const reasons: string[] = [];
  if (input.revenueTrendPct < 0) {
    reasons.push(
      `매출 ${input.revenueTrendPct}% 하락 — 홍보우편으로 신규 고객 유입 제안 적기`
    );
  } else {
    reasons.push("매출 유지·성장 중 — 단골 강화·신메뉴 홍보 관점으로 접근");
  }
  if (breakdown.backfillDemand >= 0.3) {
    reasons.push(
      `배후 세대 약 ${input.households.toLocaleString("ko-KR")}세대 — 도달 효과 기대`
    );
  }
  if (breakdown.competition >= 0.3) {
    reasons.push(
      `동일 업종 ${input.sameCategoryCount}곳 경쟁 — 차별화 홍보 필요성 높음`
    );
  }

  return { score, grade: toTargetGrade(score), breakdown, reasons };
};

export type RankedTarget = {
  business: BusinessRow;
  result: TargetScoreResult;
};

/**
 * 조회된 업체 목록을 우선순위 점수로 정렬해 상위 N개를 반환합니다.
 * @param businesses 현재 필터 결과 업체 목록
 * @param market 상권 요약(없으면 세대·유동인구 0으로 계산)
 * @param topN 반환 개수(기본 5)
 */
export const rankBusinessTargets = (
  businesses: BusinessRow[],
  market: MarketStatRow | undefined,
  topN = 5
): RankedTarget[] => {
  const categoryCounts = new Map<string, number>();
  for (const b of businesses) {
    const key = b.indsSclsCd || b.category;
    categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
  }

  const households = market?.dongHouseholds ?? market?.housingCount ?? 0;
  const floatingPop = market?.floatingPop ?? 0;

  return businesses
    .map((business) => ({
      business,
      result: computeTargetScore({
        revenueTrendPct: business.revenueTrend,
        households,
        sameCategoryCount:
          (categoryCounts.get(business.indsSclsCd || business.category) ?? 1) - 1,
        floatingPop,
      }),
    }))
    .sort(
      (a, b) =>
        b.result.score - a.result.score ||
        a.business.name.localeCompare(b.business.name, "ko")
    )
    .slice(0, topN);
};
