"use client";

import { Building2, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { BusinessRow } from "@/lib/sales/types";
import {
  MOCK_REVENUE_FILTER_FOOTNOTE,
  MOCK_SALES_METRICS_BADGE_LABEL,
} from "@/lib/commercial-api/mock-sales-metrics";

export type RevenueFilter = "all" | "decline" | "growth";

type Option = { value: string; label: string };

/** 평가정보 API 응답 형태(대시보드 `EvlInfo`와 동일). */
type SelectedBusinessEvl = {
  gender: "남성" | "여성";
  ageGroup: string;
  establishedYear: number;
  yearsInBusiness: number;
};

type FilterSidebarProps = {
  sidoOptions: Option[];
  sigunguOptions: Option[];
  /** 시·군·구 목록을 행정표준 API에서 불러오는 중이면 true. */
  sigunguOptionsLoading?: boolean;
  /** 시·군·구 목록 출처(api·정적 폴백). */
  sigunguSource?: "api" | "static" | null;
  /** 정적 폴백일 때 데이터 기준일(예: 2026-05). */
  sigunguStaticAsOf?: string;
  dongOptions: Option[];
  selectedSido: string;
  selectedSigungu: string;
  selectedDong: string;
  onSidoChange: (v: string) => void;
  onSigunguChange: (v: string) => void;
  onDongChange: (v: string) => void;
  indLargeOptions: Option[];
  indMediumOptions: Option[];
  indSmallOptions: Option[];
  selectedIndLarge: string;
  selectedIndMedium: string;
  selectedIndSmall: string;
  onIndLargeChange: (v: string) => void;
  onIndMediumChange: (v: string) => void;
  onIndSmallChange: (v: string) => void;
  revenueFilter: RevenueFilter;
  onRevenueChange: (v: RevenueFilter) => void;
  businesses: BusinessRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  getPriority: (b: BusinessRow) => boolean;
  /** 현재 선택된 업체에 대한 평가정보(상담 초안의 업력·연령과 동일 출처). */
  selectedBusinessEvl: SelectedBusinessEvl | null;
  /** 선택 업체 평가정보를 불러오는 중이면 true. */
  selectedBusinessEvlLoading: boolean;
  /** 모바일 하단 시트 등에서 방향 안내(우·중앙)를 중립 문구로 바꿉니다. */
  embeddedMobile?: boolean;
};

/** 전월 대비 추세에 맞춰 상담 초안 2단계(기회/위기)와 동일 기준의 배지를 만듭니다. */
const getSalesTrajectoryBadge = (revenueTrend: number) => {
  if (revenueTrend > 0) {
    return {
      label: "매출 성장·수요 확대",
      className: "border-brand-positive/50 text-brand-positive",
    };
  }
  if (revenueTrend < 0) {
    return {
      label: "매출 하락·방어 구간",
      className: "border-brand-negative/50 text-brand-negative",
    };
  }
  return {
    label: "매출 정체·방어 구간",
    className: "border-amber-600/45 text-amber-800",
  };
};

/** 평가정보 업력으로 상담 초안 1단계(공감) 분기와 동일 기준의 배지를 만듭니다. */
const getTenureTrajectoryBadge = (yearsInBusiness: number) => {
  if (yearsInBusiness >= 5) {
    return {
      label: "장기 운영·지역 신뢰",
      className: "border-brand-primary/45 text-brand-primary",
    };
  }
  if (yearsInBusiness < 1) {
    return {
      label: "신규 오픈",
      className: "border-emerald-500/40 text-emerald-600",
    };
  }
  return {
    label: "성장기 운영",
    className: "border-slate-500/35 text-slate-600",
  };
};

/** 필터·업체 리스트(PRD 우측 패널). */
export const FilterSidebar = ({
  sidoOptions,
  sigunguOptions,
  sigunguOptionsLoading = false,
  sigunguSource = null,
  sigunguStaticAsOf,
  dongOptions,
  selectedSido,
  selectedSigungu,
  selectedDong,
  onSidoChange,
  onSigunguChange,
  onDongChange,
  indLargeOptions,
  indMediumOptions,
  indSmallOptions,
  selectedIndLarge,
  selectedIndMedium,
  selectedIndSmall,
  onIndLargeChange,
  onIndMediumChange,
  onIndSmallChange,
  revenueFilter,
  onRevenueChange,
  businesses,
  selectedId,
  onSelect,
  getPriority,
  selectedBusinessEvl,
  selectedBusinessEvlLoading,
  embeddedMobile = false,
}: FilterSidebarProps) => {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border border-border bg-card font-sans text-sm shadow-sm ring-1 ring-foreground/5">
      <div className="border-b border-border bg-brand-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 opacity-90" />
            <h2 className="text-xs font-semibold tracking-wide uppercase">
              필터 · 목록
            </h2>
          </div>
          <Badge
            variant="outline"
            className="border-white/40 bg-white/10 text-xs text-white"
            title="행정동/업종 분류와 업체 기본정보는 공공 원천 응답을 사용합니다."
          >
            실데이터
          </Badge>
        </div>
      </div>

      <div className="space-y-4 border-b border-border p-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs tracking-widest uppercase text-muted-foreground">
              행정동 (3단계)
            </Label>
            <Badge variant="outline" className="text-xs" title="공공 원천 응답값입니다.">
              실데이터
            </Badge>
          </div>
          <NativeSelect
            value={selectedSido}
            onChange={(e) => onSidoChange(e.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="">시/도 선택</NativeSelectOption>
            {sidoOptions.map((r) => (
              <NativeSelectOption key={r.value} value={r.value}>
                {r.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            key={`sigungu-${selectedSido}`}
            value={selectedSigungu || ""}
            onChange={(e) => onSigunguChange(e.target.value)}
            className="w-full"
            disabled={!selectedSido || sigunguOptionsLoading}
          >
            <NativeSelectOption value="">
              {sigunguOptionsLoading
                ? "시·군·구 불러오는 중…"
                : selectedSido
                  ? "시/군/구 선택"
                  : "먼저 시/도를 선택하세요"}
            </NativeSelectOption>
            {sigunguOptions.map((r) => (
              <NativeSelectOption key={r.value} value={r.value}>
                {r.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {selectedSido && sigunguSource ? (
            <p className="text-[10px] leading-snug text-muted-foreground">
              시·군·구:{" "}
              {sigunguSource === "api"
                ? "행정표준코드 API"
                : `정적 목록(기준 ${sigunguStaticAsOf ?? "—"})`}
            </p>
          ) : null}
          <NativeSelect
            key={`dong-${selectedSido}-${selectedSigungu}`}
            value={selectedDong || ""}
            onChange={(e) => onDongChange(e.target.value)}
            className="w-full"
            disabled={!selectedSigungu}
          >
            <NativeSelectOption value="">
              {selectedSigungu ? "읍/면/동 선택" : "먼저 시/군/구를 선택하세요"}
            </NativeSelectOption>
            {dongOptions.map((r) => (
              <NativeSelectOption key={r.value} value={r.value}>
                {r.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs tracking-widest uppercase text-muted-foreground">
              업종 (3단계)
            </Label>
            <Badge variant="outline" className="text-xs" title="공공 원천 응답값입니다.">
              실데이터
            </Badge>
          </div>
          <NativeSelect
            value={selectedIndLarge}
            onChange={(e) => onIndLargeChange(e.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="">대분류 선택</NativeSelectOption>
            {indLargeOptions.map((c) => (
              <NativeSelectOption key={c.value} value={c.value}>
                {c.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            key={`ind-medium-${selectedIndLarge}`}
            value={selectedIndMedium || ""}
            onChange={(e) => onIndMediumChange(e.target.value)}
            className="w-full"
            disabled={!selectedIndLarge}
          >
            <NativeSelectOption value="">
              {selectedIndLarge ? "중분류 선택" : "먼저 대분류를 선택하세요"}
            </NativeSelectOption>
            {indMediumOptions.map((c) => (
              <NativeSelectOption key={c.value} value={c.value}>
                {c.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            key={`ind-small-${selectedIndLarge}-${selectedIndMedium}`}
            value={selectedIndSmall || ""}
            onChange={(e) => onIndSmallChange(e.target.value)}
            className="w-full"
            disabled={!selectedIndMedium}
          >
            <NativeSelectOption value="">
              {selectedIndMedium ? "소분류 선택" : "먼저 중분류를 선택하세요"}
            </NativeSelectOption>
            {indSmallOptions.map((c) => (
              <NativeSelectOption key={c.value} value={c.value}>
                {c.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label className="text-xs tracking-widest uppercase text-muted-foreground">
            매출 추세
          </Label>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="xs"
              variant={revenueFilter === "all" ? "default" : "outline"}
              onClick={() => onRevenueChange("all")}
            >
              전체
            </Button>
            <Button
              type="button"
              size="xs"
              variant={revenueFilter === "decline" ? "default" : "outline"}
              className={
                revenueFilter === "decline"
                  ? "border-brand-negative bg-brand-negative text-white hover:bg-brand-negative/90"
                  : ""
              }
              onClick={() => onRevenueChange("decline")}
            >
              하락(위기)
            </Button>
            <Button
              type="button"
              size="xs"
              variant={revenueFilter === "growth" ? "default" : "outline"}
              className={
                revenueFilter === "growth"
                  ? "border-brand-positive bg-brand-positive text-white hover:bg-brand-positive/90"
                  : ""
              }
              onClick={() => onRevenueChange("growth")}
            >
              성장
            </Button>
          </div>
          <p
            className="rounded-md border border-amber-600/40 bg-amber-500/10 px-2 py-1.5 text-[11px] font-medium leading-snug text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/25 dark:text-amber-100"
            role="note"
          >
            <span className="sr-only">{MOCK_SALES_METRICS_BADGE_LABEL} </span>
            {MOCK_REVENUE_FILTER_FOOTNOTE}
            {embeddedMobile
              ? " ‘상담·제안’ 탭 제안서 생성란 하단 안내와 동일 출처입니다."
              : " 제안서 생성란 하단 안내와 동일 출처입니다."}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2 pt-2">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          검색 결과 · {businesses.length}건
        </p>
        <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
          <ul className="space-y-1 pr-2">
            {businesses.length === 0 ? (
              <li className="px-3 py-8 text-center text-xs text-muted-foreground">
                조건에 맞는 업체가 없습니다.
              </li>
            ) : (
              businesses.map((b) => {
                const priority = getPriority(b);
                const active = b.id === selectedId;
                const salesBadge = getSalesTrajectoryBadge(b.revenueTrend);
                const trendClass =
                  b.revenueTrend < 0
                    ? "font-semibold text-brand-negative"
                    : b.revenueTrend > 0
                      ? "font-semibold text-brand-positive"
                      : "font-semibold text-muted-foreground";
                const tenureBadge =
                  active && selectedBusinessEvl && !selectedBusinessEvlLoading
                    ? getTenureTrajectoryBadge(selectedBusinessEvl.yearsInBusiness)
                    : null;
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(b.id)}
                      onDoubleClick={() => onSelect(b.id)}
                      className={`w-full rounded-none border px-3 py-2.5 text-left text-xs transition-colors ${
                        active
                          ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/20"
                          : "border-transparent hover:bg-muted/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          {b.name || "상호 미상"}
                        </span>
                        <span
                          className={`shrink-0 tabular-nums ${trendClass}`}
                          title="해당 상가 행의 전월 대비 매출 변동률(상담 초안·추세 게이지와 동일)"
                        >
                          {b.revenueTrend > 0 ? "+" : ""}
                          {b.revenueTrend}%
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="size-3" />
                          {b.category || "업종 미상"}
                        </span>
                        {priority ? (
                          <Badge
                            variant="outline"
                            className="border-brand-positive/40 text-xs text-brand-positive"
                          >
                            우선
                          </Badge>
                        ) : null}
                        <Badge
                          variant="outline"
                          className={`text-xs ${salesBadge.className}`}
                          title="상담 초안의 상황 분석 문장과 같은 기준입니다."
                        >
                          {salesBadge.label}
                        </Badge>
                        {active && selectedBusinessEvlLoading ? (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            평가정보 조회 중
                          </Badge>
                        ) : null}
                        {tenureBadge ? (
                          <Badge
                            variant="outline"
                            className={`text-xs ${tenureBadge.className}`}
                            title="상담 초안 도입부(업력 공감)와 동일한 평가정보입니다."
                          >
                            {tenureBadge.label}
                          </Badge>
                        ) : null}
                        {b.id.startsWith("ext-") ? (
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground"
                          >
                            공공
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {b.address || "주소 정보 없음"}
                      </p>
                      {active ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {selectedBusinessEvlLoading ? (
                            <span>대표자 평가정보를 불러오는 중입니다…</span>
                          ) : selectedBusinessEvl ? (
                            <span>
                              대표자 {selectedBusinessEvl.gender} ·{" "}
                              {selectedBusinessEvl.ageGroup} · 업력{" "}
                              {selectedBusinessEvl.yearsInBusiness}년
                              <span className="ml-1 text-[10px] text-muted-foreground/90">
                                (평가정보·상담 초안과 동일)
                              </span>
                            </span>
                          ) : (
                            <span>
                              평가정보가 없습니다. 상담 초안의 공감 문장은 업력 없이
                              구성됩니다.
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                          {embeddedMobile
                            ? "목록의 %는 해당 상가의 전월 대비 추세이며, 상담 초안·매출 추세 카드와 동일합니다."
                            : "우측 퍼센트는 해당 상가의 전월 대비 추세이며, 상담 초안·추세 카드와 동일합니다."}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </ScrollArea>
      </div>

      <Separator />
      <p className="px-4 py-2 text-xs leading-snug text-muted-foreground">
        매출 하락 + 공동주택 증가율 10% 초과 시 &quot;우선 영업 후보&quot;로
        분류합니다. (PRD 5.1)
      </p>
      <p className="border-t border-border px-4 py-2 text-xs leading-snug text-muted-foreground">
        {embeddedMobile
          ? "목록의 %는 각 상가 행의 전월 대비 매출 변동률이며, 상담 초안·매출 추세와 동일합니다. 선택한 업체의 업력·연령은 평가정보 API 결과로만 표시합니다."
          : "목록의 %는 각 상가 행의 전월 대비 매출 변동률이며, 중앙 &quot;매출 추세&quot;·상담 초안과 동일합니다. 선택한 업체의 업력·연령은 평가정보 API 결과로만 표시합니다."}
      </p>
    </aside>
  );
};
