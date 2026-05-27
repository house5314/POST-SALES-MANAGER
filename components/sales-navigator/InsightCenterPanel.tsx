"use client";

import { FileDown, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { openProposalPrint } from "@/lib/open-proposal-print";
import {
  MARKET_STAT_METRICS_SOURCE_LABEL,
  MARKET_STAT_METRICS_UNAVAILABLE_LABEL,
} from "@/lib/sales/build-market-stat-row";
import {
  MOCK_DATA_SIMULATION_PANEL_INTRO,
  MOCK_REVENUE_TREND_GAUGE_DISCLAIMER,
  MOCK_SALES_METRICS_BADGE_LABEL,
} from "@/lib/commercial-api/mock-sales-metrics";
import { SAFE_MODE_DEFAULT_MAIL_QTY } from "@/lib/operations/safe-mode";
import { getSbizCertKeyPublic } from "@/lib/sbiz-iframe-urls";
import { cn } from "@/lib/utils";
import type { MolitAptComplex } from "@/lib/molit/types";
import type { PostalQuote } from "@/lib/postal-calc";
import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

type InsightCenterPanelProps = {
  business: BusinessRow | null;
  market: MarketStatRow | undefined;
  /** 상권 요약 API 호출 진행 중이면 true(세대·유동인구 문구 대기 표시). */
  marketStatsLoading: boolean;
  /** 견적·상담 초안·권장 부수에 쓰는 단일 기준(상권 추정 또는 단지 세대 반영). */
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
  selectedAptIds: Set<string>;
  /**
   * 모바일 하단 시트 등 부모가 스크롤을 맡을 때 true.
   * 내부 이중 스크롤을 줄입니다.
   */
  singleScrollSurface?: boolean;
  /** 공공 API 장애·지연 시 기본 견적 부수로 표시 중이면 true. */
  safeMode?: boolean;
};

/** 전월 대비 매출 변동률을 막대 스케일로 시각화합니다. */
const RevenueTrendGauge = ({
  pct,
  neutralFilterCopy,
}: {
  pct: number;
  /** true면 "우측 필터" 대신 중립 문구를 씁니다. */
  neutralFilterCopy?: boolean;
}) => {
  const clamped = Math.max(-50, Math.min(50, pct));
  const thumbLeftPct = 50 + clamped;
  return (
    <Card className="border-border/80 font-sans text-sm shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="font-sans text-sm font-semibold normal-case tracking-wide">
          매출 추세
        </CardTitle>
        <CardDescription className="text-xs">
          전월 대비 변동률 —{" "}
          {neutralFilterCopy ? (
            <>필터의 &quot;매출 추세&quot;와 같은 기준입니다.</>
          ) : (
            <>우측 필터의 &quot;매출 추세&quot;와 같은 기준입니다.</>
          )}
        </CardDescription>
        <p className="mt-2 text-[11px] font-semibold leading-snug text-amber-900 dark:text-amber-200/95">
          {MOCK_REVENUE_TREND_GAUGE_DISCLAIMER}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-xs text-muted-foreground">
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
          <span className="font-sans text-xl font-semibold tabular-nums text-foreground">
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
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              전월 대비
            </span>
          </span>
        </p>
      </CardContent>
    </Card>
  );
};

/** 상담 초안(핵심)·영업 근거·매출·제안서 등 중앙 패널을 렌더링합니다. */
export const InsightCenterPanel = ({
  business,
  market,
  marketStatsLoading,
  effectiveMailQty,
  postalQuote,
  isPriority,
  evlInfo,
  industryAvgStat,
  selectedLargeName,
  selectedDongLabel,
  apartments,
  selectedAptIds,
  singleScrollSurface = false,
  safeMode = false,
}: InsightCenterPanelProps) => {
  if (!business) {
    return (
      <section className="flex min-h-[200px] flex-col justify-center rounded-none border border-dashed border-border bg-muted/20 p-8 text-center font-sans text-sm lg:min-h-0">
        <p className="font-medium text-muted-foreground">
          우측 목록에서 업체를 선택하거나 지도 마커를 눌러 주세요.
        </p>
      </section>
    );
  }

  const years = evlInfo?.yearsInBusiness ?? 0;
  const aptTargetsSummary =
    apartments.length > 0 && selectedAptIds.size > 0
      ? apartments
          .filter((a) => selectedAptIds.has(a.id))
          .slice(0, 4)
          .map((a) => `${a.name}(${a.households.toLocaleString("ko-KR")}세대)`)
          .join(", ")
      : "";

  /** 전월 대비 매출 변동률(상권·업체 지표)을 기준으로 기회/위기 멘트를 구성합니다. */
  const revenuePct = business.revenueTrend;
  const revenuePctLabel = `${revenuePct > 0 ? "+" : ""}${revenuePct}%`;

  /** [1] 도입: 업력 기반 공감(업력은 평균·정수 연차 기준). */
  const empathyIntro =
    years >= 5
      ? `한 자리에서 무려 **${years}년** 동안 운영해 오셨네요. 지역 주민들의 두터운 신뢰가 느껴집니다.`
      : evlInfo != null && years < 1
        ? "최근 새로 오픈하셨네요! 초기 동네 상권 장악을 돕겠습니다."
        : years >= 1 && years < 5
          ? `**${years}년**차 운영으로 상권 내 입지를 다지신 시점입니다. 이제 배후 가구에 도달하는 실행력이 경쟁 우위로 이어질 수 있습니다.`
          : `${selectedDongLabel || market?.regionLabel || "선택 지역"} 일대 **${selectedLargeName || business.category}** 상권에서 ${business.name}의 성장 잠재력을 높게 평가했습니다.`;

  /** [2] 상황: 매출 변동률(전월 대비)에 따른 기회 vs 방어·정체 */
  const situationLine =
    revenuePct > 0
      ? `최근 상권 수요가 **${revenuePctLabel}** 활기를 띠고 있습니다. 지금이 신규 고객을 확보할 최적의 타이밍입니다.`
      : "최근 상권 경쟁이 치열해지며 기존 고객 방어 전략이 매우 중요해졌습니다.";

  /** [3] 해결책: 우체국 직배 신뢰 + 발송 부수(effectiveMailQty) 단일 기준 */
  const targetingContext = aptTargetsSummary
    ? `선택하신 단지 기준 **${aptTargetsSummary}** 등 **총 ${effectiveMailQty.toLocaleString("ko-KR")}세대** 우편함까지 설계가 가능합니다.`
    : "";
  const solutionLine = [
    "우편은 **우체국 집배원이 100% 직접 배달**하는 채널이라, 브로슈어·쿠폰이 가정의 우편함에 안정적으로 도달한다는 점이 가장 큰 강점입니다.",
    `이번 제안은 **발송 부수 ${effectiveMailQty.toLocaleString("ko-KR")}부**를 기준으로, **매장** 주변 배후 세대에 도달하도록 집중 타겟팅하는 구성입니다.`,
    targetingContext,
  ]
    .filter(Boolean)
    .join(" ");

  /** [4] 우편물 형태·단가 안내(접착형) */
  const roiLine =
    "'접착형'은 통당 360원이며, 용지 1장(3단 접지, 6면)의 1면에 홍보 내용을 인쇄하여, 3단으로 접어 접착방식으로 봉합한 우편물입니다. 500부 기준으로 180,000원의 비용이 발생하고 추가옵션에 따라 비용이 달라질 수 있습니다.";

  /** [5] 액션: 마무리 */
  const actionClose = `검토해 보시고, **${effectiveMailQty.toLocaleString("ko-KR")}부** 안으로 시안과 발송 일정을 준비해 드리겠습니다.`;

  const metricsSourceWhenPresent =
    market?.metricsSourceLabel ?? MARKET_STAT_METRICS_SOURCE_LABEL;

  const densityLine = market
    ? `${market.regionLabel} 일대는 공동주택 약 ${market.housingCount.toLocaleString("ko-KR")}세대, 유동인구 ${market.floatingPop.toLocaleString("ko-KR")}명 수준으로 수요 밀도가 확인됩니다.`
    : marketStatsLoading
      ? "상권 요약의 **세대·유동인구** 지표를 불러오는 중입니다. **(출처: 상권 요약 API, 조회 진행)**"
      : `세대·유동인구 수치는 **상권 요약 API**로만 제시합니다. **(현재 출처: 미연동)** ${MARKET_STAT_METRICS_UNAVAILABLE_LABEL}`;

  const scriptLines = [
    `안녕하세요, ${business.name} 대표님. 우체국 생활정보홍보우편 담당입니다.`,
    empathyIntro,
    situationLine,
    densityLine,
    solutionLine,
    roiLine,
    actionClose,
  ];

  const rationale = market
    ? `${market.regionLabel} ${business.category} 업종은 매출이 ${business.revenueTrend}% 변동되었으나, 주변 신축·공동주택 약 ${market.housingCount.toLocaleString("ko-KR")}세대 수준의 수요가 있어 홍보 도달 시 효과가 기대됩니다.`
    : `${business.name}의 매출 추세를 바탕으로 한 접근이 유리합니다. (세대·유동인구: ${
        marketStatsLoading
          ? "상권 요약 API 조회 중"
          : `미연동 — ${MARKET_STAT_METRICS_UNAVAILABLE_LABEL}`
      })`;

  const resolvedRegionLabel =
    market?.regionLabel || selectedDongLabel || business.regionCode || "선택 지역";

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col gap-3 font-sans text-sm leading-normal",
        singleScrollSurface
          ? "min-h-0 flex-1 overflow-visible"
          : "overflow-y-auto lg:max-h-full"
      )}
    >
      {/* 상담 초안: Card의 overflow-hidden을 피하기 위해 별도 블록 */}
      <div className="shrink-0 rounded-none border-2 border-brand-primary/45 bg-card shadow-md ring-1 ring-brand-primary/15">
        <div className="flex items-start gap-2 border-b border-brand-primary/25 bg-brand-primary/12 px-3 py-2.5 sm:px-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-brand-primary" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              상담 초안
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              통화·방문 시 활용할 문장입니다. 내용이 길면 아래 영역을 스크롤해 전체를 확인하세요.
            </p>
          </div>
        </div>
        <div
          className={cn(
            "scroll-pb-8 overscroll-y-contain px-3 py-3 sm:px-4",
            singleScrollSurface
              ? "min-h-0 flex-1 overflow-y-auto"
              : "max-h-[min(60dvh,28rem)] min-h-[12rem] overflow-y-auto"
          )}
          role="region"
          aria-label="상담 초안 본문"
        >
          <ul className="space-y-3 pb-12 text-sm leading-relaxed text-foreground">
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

      <Card size="sm" className="shrink-0 border-brand-primary/15 py-3 font-sans text-sm shadow-sm ring-brand-primary/10">
        <CardHeader className="space-y-1.5 px-4 pb-2 pt-0 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-sans text-sm font-semibold normal-case tracking-wide">
              영업 선정 근거
            </CardTitle>
            {isPriority ? (
              <span
                className="rounded-none px-2 py-0.5 text-xs font-semibold tracking-wide uppercase text-white"
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
      </Card>

      <div className="shrink-0">
        <RevenueTrendGauge
          pct={business.revenueTrend}
          neutralFilterCopy={singleScrollSurface}
        />
      </div>

      <Card
        size="sm"
        className="shrink-0 overflow-visible border-border/80 gap-1.5 py-3 font-sans text-sm shadow-sm"
      >
        <CardHeader className="space-y-0.5 px-4 pb-1 pt-0 sm:px-5">
          <CardTitle className="font-sans text-sm font-semibold normal-case tracking-wide">
            영업선정 근거 상세
          </CardTitle>
          <CardDescription className="text-xs leading-snug">
            선택 업체·상권을 기준으로 한 지표 요약입니다. 가공·시연 구분은 아래 제안서 생성
            영역 하단 안내를 참고하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 px-4 pb-3 pt-0 sm:px-5">
          <div
            className="max-h-[min(16rem,40vh)] min-h-0 overflow-y-auto rounded-md border border-border/70 bg-muted/20 px-2 py-2 sm:max-h-[min(18rem,36vh)]"
            role="region"
            aria-label="영업선정 근거 상세 지표"
          >
            <dl className="divide-y divide-border pb-4">
            <div className="grid gap-1 py-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-x-4 sm:gap-y-0">
              <dt className="text-xs font-medium text-muted-foreground sm:pt-0.5">
                배후 수요
              </dt>
              <dd className="text-sm leading-relaxed text-foreground">
                {market ? (
                  <>
                    <span className="text-muted-foreground">{resolvedRegionLabel} · </span>
                    공동주택 {market.housingCount.toLocaleString("ko-KR")}세대, 동 가구{" "}
                    {market.dongHouseholds.toLocaleString("ko-KR")}세대
                    <span className="mt-1 block border-l-2 border-amber-600/55 pl-2 text-[10px] font-normal leading-snug text-amber-950 dark:text-amber-100">
                      {metricsSourceWhenPresent}
                    </span>
                  </>
                ) : marketStatsLoading ? (
                  <>
                    <span className="text-muted-foreground">불러오는 중…</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      출처: 상권 요약 API(조회 진행)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">{resolvedRegionLabel}</span>
                    <p className="mt-1 text-foreground">세대·가구 수: —</p>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {MARKET_STAT_METRICS_UNAVAILABLE_LABEL}
                    </span>
                  </>
                )}
              </dd>
            </div>
            <div className="grid gap-1 py-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-x-4 sm:gap-y-0">
              <dt className="text-xs font-medium text-muted-foreground sm:pt-0.5">
                상권 밀도
              </dt>
              <dd className="text-sm leading-relaxed text-foreground">
                {market ? (
                  <>
                    유동인구 약 {market.floatingPop.toLocaleString("ko-KR")}명 · 주요 방문{" "}
                    {market.peakTime}
                    <span className="mt-1 block border-l-2 border-amber-600/55 pl-2 text-[10px] font-normal leading-snug text-amber-950 dark:text-amber-100">
                      {metricsSourceWhenPresent}
                    </span>
                  </>
                ) : marketStatsLoading ? (
                  <>
                    <span className="text-muted-foreground">불러오는 중…</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      출처: 상권 요약 API(조회 진행)
                    </span>
                  </>
                ) : (
                  <>
                    <p className="text-foreground">유동인구·방문 시간대: —</p>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {MARKET_STAT_METRICS_UNAVAILABLE_LABEL}
                    </span>
                  </>
                )}
              </dd>
            </div>
            <div className="grid gap-1 py-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-x-4 sm:gap-y-0">
              <dt className="text-xs font-medium text-muted-foreground sm:pt-0.5">
                대표자 프로필
              </dt>
              <dd className="text-sm leading-relaxed text-foreground">
                {evlInfo?.gender ?? "—"} · {evlInfo?.ageGroup ?? "—"} · 업력{" "}
                {evlInfo?.yearsInBusiness ?? "—"}년
              </dd>
            </div>
            <div className="grid gap-1 py-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-x-4 sm:gap-y-0">
              <dt className="text-xs font-medium text-muted-foreground sm:pt-0.5">
                권장 발송 규모
              </dt>
              <dd className="text-sm leading-relaxed text-foreground">
                {effectiveMailQty.toLocaleString("ko-KR")}부
                <span className="mt-1 block text-xs text-muted-foreground">
                  {safeMode
                    ? `안전 모드: 공공 API 장애·지연으로 기본 ${SAFE_MODE_DEFAULT_MAIL_QTY.toLocaleString("ko-KR")}부 기준 견적을 표시합니다.`
                    : aptTargetsSummary
                      ? "지도에서 선택한 국토부 단지 세대를 반영했습니다."
                      : "지역 수요 규모를 반영한 산출입니다."}
                </span>
              </dd>
            </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card className="shrink-0 border-dashed border-brand-primary/30 bg-brand-primary/[0.04] font-sans text-sm shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="font-medium text-foreground">제안서 생성</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                브라우저 인쇄 대화상자에서 PDF로 저장할 수 있습니다.
              </p>
            </div>
            <Button
              type="button"
              className="w-full shrink-0 bg-brand-accent text-white hover:bg-brand-accent/90 sm:w-auto sm:min-w-[11rem]"
              onClick={() =>
                openProposalPrint(business, market, effectiveMailQty, industryAvgStat, {
                  postalQuote,
                  aptTargets: apartments
                    .filter((a) => selectedAptIds.has(a.id))
                    .map((a) => ({ name: a.name, households: a.households })),
                  sbizCertKey: getSbizCertKeyPublic(),
                  evlForProposal: evlInfo
                    ? { yearsInBusiness: evlInfo.yearsInBusiness }
                    : null,
                  industryLargeLabel: selectedLargeName.trim() || null,
                })
              }
            >
              <FileDown className="size-3.5" data-icon="inline-start" />
              제안서 생성 (인쇄/PDF)
            </Button>
          </div>
          <div
            role="note"
            className="border-t border-amber-600/25 pt-2.5 text-[10px] leading-snug text-amber-950/95 dark:border-amber-500/25 dark:text-amber-100/90"
          >
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              {MOCK_SALES_METRICS_BADGE_LABEL} 데이터 안내
            </p>
            <p className="mt-1">{MOCK_DATA_SIMULATION_PANEL_INTRO}</p>
            <p className="mt-1 font-medium text-amber-900 dark:text-amber-100">
              상권 세대·유동인구 출처: {MARKET_STAT_METRICS_SOURCE_LABEL}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
