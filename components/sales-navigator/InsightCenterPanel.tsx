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
import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

type InsightCenterPanelProps = {
  business: BusinessRow | null;
  market: MarketStatRow | undefined;
  mailQuantity: number;
  isPriority: boolean;
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
  isPriority,
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

  const scriptLines = [
    `안녕하세요, ${business.name} 대표님. 우체국 생활정보홍보우편 담당입니다.`,
    `현재 전월 대비 매출 변동은 **${business.revenueTrend > 0 ? "+" : ""}${business.revenueTrend}%**로 파악됩니다.`,
    market
      ? `${market.regionLabel} 일대는 공동주택 약 ${market.housingCount.toLocaleString("ko-KR")}세대 수준으로, ${
          market.housingGrowthPct > 10 ? "입주·유입 수요가 두드러지는" : "안정적인 주거 수요가 있는"
        } 상권입니다.`
      : "상권 특성을 반영한 맞춤 배송·도달 설계가 가능합니다.",
    `주요 방문 시간대는 ${market?.peakTime ?? "상권 데이터 기준으로 산정"}이며, 우편 도착 시점을 이에 맞추면 노출 효율이 높아집니다.`,
    `우체국 채널은 **100% 도달**을 목표로 집배원이 직접 배달하며, 생활정보홍보우편은 **최대 30% 요금 할인** 혜택으로 비용을 예측 가능하게 관리할 수 있습니다.`,
    `검토해 보시고, ${householdLabel} 세대 규모를 반영한 ${mailQuantity.toLocaleString("ko-KR")}부 안으로 시안을 준비해 드리겠습니다.`,
  ];

  const rationale = market
    ? `${market.regionLabel} ${business.category} 업종은 매출이 ${business.revenueTrend}% 변동되었으나, 주변 신축·공동주택 약 ${market.housingCount.toLocaleString("ko-KR")}세대 수준의 수요가 있어 홍보 도달 시 효과가 기대됩니다.`
    : `${business.name}의 매출 추세와 상권 특성을 반영한 접근이 유리합니다.`;

  return (
    <section className="flex min-h-0 flex-col gap-4 overflow-y-auto lg:max-h-full">
      <RevenueTrendGauge pct={business.revenueTrend} />
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
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-foreground">
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

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="bg-brand-accent text-white hover:bg-brand-accent/90"
          onClick={() => openProposalPrint(business, market, mailQuantity)}
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
