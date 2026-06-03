"use client";

import { BarChart3, Clock, FileCheck, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getPocKpiSnapshot,
  type PocKpiSnapshot,
} from "@/lib/operations/poc-kpi";

type PocImpactPanelProps = {
  /** KPI 숫자 갱신 트리거(제안서 발행·피드백 등). */
  refreshToken?: number;
};

const formatMinutes = (n: number | null) => {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 1) return "1분 미만";
  return `${Math.round(n)}분`;
};

/** PoC·확산 심사용 실적 KPI(로컬 누적) 카드를 표시합니다. */
export const PocImpactPanel = ({ refreshToken = 0 }: PocImpactPanelProps) => {
  const [kpi, setKpi] = useState<PocKpiSnapshot>(() => getPocKpiSnapshot());

  useEffect(() => {
    setKpi(getPocKpiSnapshot());
    const id = window.setInterval(() => setKpi(getPocKpiSnapshot()), 15_000);
    return () => window.clearInterval(id);
  }, [refreshToken]);

  const avgLabel =
    kpi.proposalCountThisMonth > 0
      ? formatMinutes(kpi.avgSessionMinutes)
      : formatMinutes(kpi.currentSessionMinutes);

  return (
    <section
      aria-label="PoC 실적 지표"
      className="shrink-0 border-b border-border bg-muted/30 px-4 py-3 lg:px-8"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <BarChart3 className="size-4 text-brand-primary" aria-hidden />
        <p className="text-xs font-semibold text-foreground">
          PoC 실적 KPI
          <span className="ml-1.5 font-normal text-muted-foreground">
            ({kpi.monthLabel} · 본 기기 localStorage)
          </span>
        </p>
        <p className="w-full text-[10px] leading-snug text-muted-foreground lg:w-auto lg:flex-1">
          설계 목표 §1.10: 상권·제안 패키지 약 90~120분 → 화면
          초안 1분 이내. 아래 수치는 시연·설문 누적 참고용입니다.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <li className="rounded-md border border-border bg-background px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <FileCheck className="size-3.5 shrink-0" aria-hidden />
            이번 달 제안서 발행
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {kpi.proposalCountThisMonth}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">
              건
            </span>
          </p>
        </li>
        <li className="rounded-md border border-border bg-background px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            평균 작성 시간(세션)
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {avgLabel}
          </p>
        </li>
        <li className="rounded-md border border-border bg-background px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            견적 오류
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {kpi.quoteErrorCount}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">
              건
            </span>
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            시스템 견적 {kpi.systemQuoteCount}회
          </p>
        </li>
        <li className="rounded-md border border-border bg-background px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <BarChart3 className="size-3.5 shrink-0" aria-hidden />
            안전 모드
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {kpi.safeModeCount}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">
              회
            </span>
          </p>
        </li>
      </ul>
    </section>
  );
};
