"use client";

import { FileDown, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AptListSelector } from "@/components/sales-navigator/AptListSelector";
import { openProposalPrint } from "@/lib/open-proposal-print";
import type { MolitAptComplex } from "@/lib/molit/types";
import type { PostalQuote } from "@/lib/postal-calc";
import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

type InsightCenterPanelProps = {
  business: BusinessRow | null;
  market: MarketStatRow | undefined;
  mailQuantity: number;
  /** 단지 선택 반영 발송 부수. */
  effectiveMailQty: number;
  postalQuote: PostalQuote;
  isPriority: boolean;
  evlInfo: {
    gender: "남성" | "여성";
    ageGroup: string;
    establishedYear: number;
    yearsInBusiness: number;
  } | null;
  industryAvgStat: {
    endpoint: string;
    avgSalesAmount: number;
    avgSalesPerArea: number;
  } | null;
  selectedLargeName: string;
  selectedDongLabel: string;
  apartments: MolitAptComplex[];
  aptLoading: boolean;
  aptError: string | null;
  selectedAptIds: Set<string>;
  onAptToggle: (id: string, checked: boolean) => void;
  onSelectAllApts: () => void;
  onClearApts: () => void;
  moveInPitch: {
    surge: boolean;
    headline: string;
    detail: string;
  } | null;
};

/** 전월 대비 매출 변동률을 막대 스케일로 시각화합니다. */
const RevenueTrendGauge = ({ pct }: { pct: number }) => {
  const clamped = Math.max(-50, Math.min(50, pct));
  const thumbLeftPct = 50 + clamped;
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm tracking-wide">매출 추세</CardTitle>
        <CardDescription className="text-xs">
          전월 대비 변동률 — 우측 필터의 &quot;매출 추세&quot;와 같은 기준입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-[0.65rem] text-muted-foreground">
          <span>하락 · 위기</span>
          <span>성장</span>
        </div>
        <div className="relative mt-2 h-4 w-full overflow-hidden rounded-full bg-muted">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-brand-negative/20" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-brand-positive/20" />
          <div className="absolute bottom-0 left-1/2 top-0 w-px bg-border" />
          <div
            className="absolute bottom-0.5 top-0.5 w-2.5 -translate-x-1/2 rounded-sm border border-background bg-brand-primary shadow"
            style={{ left: `${thumbLeftPct}%` }}
            title={`${pct}%`}
          />
        </div>
        <p className="mt-3 text-center">
          <span className="font-heading text-2xl font-semibold tabular-nums text-foreground">
            <span
              className={
                pct < 0
                  ? "text-brand-negative"
                  : pct > 0
                    ? "text-brand-positive"
                    : "text-muted-foreground"
              }
            >
              {pct > 0 ? "+" : ""}
              {pct}%
            </span>
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              전월 대비
            </span>
          </span>
        </p>
      </CardContent>
    </Card>
  );
};

/** 상담 멘트·근거·제안서(PRD 중앙 패널). */
export const InsightCenterPanel = ({
  business,
  market,
  mailQuantity,
  effectiveMailQty,
  postalQuote,
  isPriority,
  evlInfo,
  industryAvgStat,
  selectedLargeName,
  selectedDongLabel,
  apartments,
  aptLoading,
  aptError,
  selectedAptIds,
  onAptToggle,
  onSelectAllApts,
  onClearApts,
  moveInPitch,
}: InsightCenterPanelProps) => {
  if (!business) {
    return (
      <section className="flex min-h-[200px] flex-col justify-center rounded-none border border-dashed border-border bg-muted/20 p-8 text-center lg:min-h-0">
        <p className="text-sm font-medium text-muted-foreground">
          우측 목록에서 업체를 선택하거나 지도 마커를 눌러 주세요.
        </p>
      </section>
    );
  }

  const householdLabel =
    market?.dongHouseholds != null
      ? market.dongHouseholds.toLocaleString("ko-KR")
      : "지역";

  const years = evlInfo?.yearsInBusiness ?? 0;
  const isOpportunity = years <= 1 && business.revenueTrend >= 0;
  const aptTargetsSummary =
    apartments.length > 0 && selectedAptIds.size > 0
      ? apartments
          .filter((a) => selectedAptIds.has(a.id))
          .slice(0, 4)
          .map((a) => `${a.name}(${a.households.toLocaleString("ko-KR")}세대)`)
          .join(", ")
      : "";

  const pitchCore = isOpportunity
    ? `대표님, 현재 ${selectedDongLabel || market?.regionLabel || "선택 지역"} ${selectedLargeName || business.category} 상권은 면적당 매출이 높은 기회의 구간입니다. 오픈 초기 배후 수요를 선점하기 위해 홍보우편 발송이 가장 시급한 타이밍입니다.`
    : `대표님, 매장을 운영하신 지 ${years || "N"}년이 되셨네요. 최근 해당 상권의 ${selectedLargeName || business.category} 경쟁이 치열해 기존 고객 방어 전략이 중요합니다. 타겟팅 우편 프로모션으로 동네 상권 점유율을 지키는 방안을 제안드립니다.`;
  const scriptLines = [
    `안녕하세요, ${business.name} 대표님. 우체국 생활정보홍보우편 담당입니다.`,
    pitchCore,
    `현재 전월 대비 매출 변동은 **${business.revenueTrend > 0 ? "+" : ""}${business.revenueTrend}%**로 파악됩니다.`,
    market
      ? `${market.regionLabel} 일대는 공동주택 약 ${market.housingCount.toLocaleString("ko-KR")}세대, 유동인구 ${market.floatingPop.toLocaleString("ko-KR")}명 수준입니다.`
      : "상권 특성을 반영한 맞춤 배송·도달 설계가 가능합니다.",
    aptTargetsSummary
      ? `국토부 단지 기준 주요 타겟은 **${aptTargetsSummary}** 등 **총 ${effectiveMailQty.toLocaleString("ko-KR")}세대** 우편함 커버가 가능합니다.`
      : `동네 배후 세대 규모(${householdLabel} 등)를 반영하면 **약 ${mailQuantity.toLocaleString("ko-KR")}부** 규모의 도달 설계가 가능합니다.`,
    moveInPitch?.detail
      ? `**(시뮬레이션·통계 미연동)** ${moveInPitch.detail}${
          moveInPitch.headline ? ` (${moveInPitch.headline})` : ""
        }`
      : "",
    `우체국 채널은 **100% 도달**을 목표로 집배원이 직접 배달하며, 생활정보홍보우편은 **최대 30% 요금 할인** 혜택으로 비용을 예측 가능하게 관리할 수 있습니다.`,
    `정밀 견적 기준 **${effectiveMailQty.toLocaleString("ko-KR")}부** 발송 시 기준 요금 **${postalQuote.baseTotalWon.toLocaleString("ko-KR")}원**, 특별 감액 **${postalQuote.discountPct}%** 적용 시 **최종 약 ${postalQuote.finalTotalWon.toLocaleString("ko-KR")}원** 수준입니다.`,
    aptTargetsSummary
      ? `사장님, 선택하신 단지 세대(${effectiveMailQty.toLocaleString("ko-KR")}세대) 우편함에 쿠폰을 넣는 데 드는 비용은 위 금액대이며, 배달 앱 수수료 대비 예측 가능하고 확실한 동네 도달을 만들 수 있습니다.`
      : `검토해 보시고, ${householdLabel} 세대 규모를 반영한 ${mailQuantity.toLocaleString("ko-KR")}부 안으로 시안을 준비해 드리겠습니다.`,
  ].filter(Boolean);

  const rationale = market
    ? `${market.regionLabel} ${business.category} 업종은 매출이 ${business.revenueTrend}% 변동되었으나, 주변 신축·공동주택 약 ${market.housingCount.toLocaleString("ko-KR")}세대 수준의 수요가 있어 홍보 도달 시 효과가 기대됩니다.`
    : `${business.name}의 매출 추세와 상권 특성을 반영한 접근이 유리합니다.`;
  const seed = Array.from(`${business.id}:${business.regionCode}`).reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0
  );
  const fallbackHousingCount = 1200 + (seed % 5200);
  const fallbackHouseholds = 1800 + (seed % 6800);
  const fallbackFloatingPop = 4000 + (seed % 18000);
  const peakSlots = ["07~10시", "11~14시", "14~17시", "18~21시"] as const;
  const fallbackPeakTime = peakSlots[seed % peakSlots.length];
  const resolvedRegionLabel =
    market?.regionLabel || selectedDongLabel || business.regionCode || "선택 지역";
  const resolvedHousingCount = market?.housingCount ?? fallbackHousingCount;
  const resolvedHouseholds = market?.dongHouseholds ?? fallbackHouseholds;
  const resolvedFloatingPop = market?.floatingPop ?? fallbackFloatingPop;
  const resolvedPeakTime = market?.peakTime || fallbackPeakTime;

  return (
    <section className="flex min-h-0 flex-col gap-4 overflow-y-auto lg:max-h-full">
      <RevenueTrendGauge pct={business.revenueTrend} />
      <Card className="border-brand-primary/15 shadow-sm ring-brand-primary/10">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm tracking-wide">
              타겟 단지 · 정밀 발송 견적
            </CardTitle>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[0.55rem]">
                단지 · 공공 API
              </Badge>
              <Badge variant="outline" className="text-[0.55rem]" title="우체국 실제 단가 아님">
                우편요금 · 시뮬
              </Badge>
            </div>
          </div>
          <CardDescription className="text-xs">
            단지 목록은 국토부 법정동·좌표 기준 반경 1km(좌표 없는 단지는 제외)입니다.
            우편 금액은 참조 단가·구간 감액 규칙 예시이며 최종 견적은 우체국 기준입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <AptListSelector
            items={apartments}
            loading={aptLoading}
            error={aptError}
            selectedIds={selectedAptIds}
            onToggle={onAptToggle}
            onSelectAll={onSelectAllApts}
            onClear={onClearApts}
          />
          <div className="rounded-none border border-border bg-muted/25 px-3 py-2 leading-relaxed">
            <p className="font-medium text-foreground">
              발송 부수:{" "}
              <span className="tabular-nums text-brand-accent">
                {effectiveMailQty.toLocaleString("ko-KR")}부
              </span>
            </p>
            <p className="mt-1 text-muted-foreground">
              기준 요금{" "}
              <span className="tabular-nums text-foreground">
                {postalQuote.baseTotalWon.toLocaleString("ko-KR")}
              </span>
              원 → 특별 감액 {postalQuote.discountPct}% → 최종 예상{" "}
              <span className="tabular-nums font-semibold text-brand-accent">
                {postalQuote.finalTotalWon.toLocaleString("ko-KR")}
              </span>
              원
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm tracking-wide">상권 팩트 체크</CardTitle>
            <Badge
              variant="outline"
              className="text-[0.55rem]"
              title="현재 평균매출 수치는 시연용 계산값입니다."
            >
              시뮬레이션
            </Badge>
          </div>
          <CardDescription className="text-xs">
            업종 대분류 기준 동적 평균매출 API 결과
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p>
            평균 매출금액:{" "}
            <strong className="text-brand-accent">
              {industryAvgStat
                ? `${Math.round(industryAvgStat.avgSalesAmount).toLocaleString("ko-KR")}원`
                : "데이터 대기"}
            </strong>
          </p>
          <p>
            면적단위 평균매출:{" "}
            <strong className="text-brand-accent">
              {industryAvgStat
                ? `${Math.round(industryAvgStat.avgSalesPerArea).toLocaleString("ko-KR")}원`
                : "데이터 대기"}
            </strong>
          </p>
          <p className="text-[0.65rem] text-muted-foreground">
            호출 API: {industryAvgStat?.endpoint ?? "업종 선택 대기"}
          </p>
        </CardContent>
      </Card>
      <Card className="border-brand-primary/15 shadow-sm ring-brand-primary/10">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base tracking-wide">
              영업 선정 근거
            </CardTitle>
            {isPriority ? (
              <span
                className="rounded-none px-2 py-0.5 text-[0.6rem] font-semibold tracking-widest uppercase text-white"
                style={{ backgroundColor: "#3d7a5c" }}
              >
                우선 영업 후보
              </span>
            ) : null}
          </div>
          <CardDescription className="text-pretty text-sm leading-relaxed">
            {rationale}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-start gap-2 text-brand-primary">
            <Sparkles className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-heading text-xs font-semibold tracking-widest uppercase text-brand-primary">
                자동 상담 멘트 초안
                <Badge
                  variant="outline"
                  className="ml-2 text-[0.55rem]"
                  title="업체/상권 조건을 결합한 규칙 기반 생성 문구입니다."
                >
                  가공데이터
                </Badge>
              </p>
              <ul className="mt-3 max-h-56 space-y-3 overflow-y-auto pr-2 text-sm leading-relaxed text-foreground">
                {scriptLines.map((line, idx) => (
                  <li key={idx} className="text-pretty">
                    {line.split("**").map((chunk, i) =>
                      i % 2 === 1 ? (
                        <strong key={i} className="text-brand-accent">
                          {chunk}
                        </strong>
                      ) : (
                        <span key={i}>{chunk}</span>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm tracking-wide">영업선정 근거 상세</CardTitle>
            <Badge
              variant="outline"
              className="text-[0.55rem]"
              title="공공 원천값과 규칙 기반 가공값을 결합한 선정 근거입니다."
            >
              가공데이터
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p className="flex items-center justify-between gap-2">
            <span>
              배후 수요: {resolvedRegionLabel} 기준 공동주택{" "}
              {resolvedHousingCount.toLocaleString("ko-KR")}세대, 동 가구수{" "}
              {resolvedHouseholds.toLocaleString("ko-KR")}세대
              {market ? (
                <span className="ml-1 text-[0.6rem] text-muted-foreground/90">
                  (출처: 행정동통계)
                </span>
              ) : null}
            </span>
            <Badge variant="outline" className="shrink-0 text-[0.55rem]">
              {market ? "실데이터" : "가공데이터"}
            </Badge>
          </p>
          <p className="flex items-center justify-between gap-2">
            <span>
              상권 밀도: 유동인구 {resolvedFloatingPop.toLocaleString("ko-KR")}명, 주요
              방문 시간대 {resolvedPeakTime}
              {market ? (
                <span className="ml-1 text-[0.6rem] text-muted-foreground/90">
                  (출처: 상가API+행정동통계)
                </span>
              ) : null}
            </span>
            <Badge variant="outline" className="shrink-0 text-[0.55rem]">
              {market ? "실데이터" : "가공데이터"}
            </Badge>
          </p>
          <p className="flex items-center justify-between gap-2">
            <span>
              대표자 프로필: {evlInfo?.gender ?? "-"} / {evlInfo?.ageGroup ?? "-"} /
              업력 {evlInfo?.yearsInBusiness ?? "-"}년
            </span>
            <Badge variant="outline" className="shrink-0 text-[0.55rem]">
              가공데이터
            </Badge>
          </p>
          <p className="flex items-center justify-between gap-2">
            <span>
              권장 발송 규모: {effectiveMailQty.toLocaleString("ko-KR")}부 (
              {aptTargetsSummary ? "국토부 단지 선택 반영" : "지역 수요 규모 기반"})
            </span>
            <Badge variant="outline" className="shrink-0 text-[0.55rem]">
              가공데이터
            </Badge>
          </p>
          <p className="text-[0.6rem]">
            * 실데이터 미존재 구간은 동일 키 기반 가공값으로 자동 보정합니다.
          </p>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="bg-brand-accent text-white hover:bg-brand-accent/90"
          onClick={() =>
            openProposalPrint(business, market, effectiveMailQty, industryAvgStat, {
              postalQuote,
              aptTargets: apartments
                .filter((a) => selectedAptIds.has(a.id))
                .map((a) => ({ name: a.name, households: a.households })),
            })
          }
        >
          <FileDown className="size-3.5" data-icon="inline-start" />
          제안서 생성 (인쇄/PDF)
        </Button>
        <p className="w-full text-[0.65rem] text-muted-foreground">
          브라우저 인쇄 대화상자에서 PDF로 저장할 수 있습니다.
        </p>
      </div>
    </section>
  );
};
