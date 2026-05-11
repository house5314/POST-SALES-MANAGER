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

export type RevenueFilter = "all" | "decline" | "growth";

type Option = { value: string; label: string };

type FilterSidebarProps = {
  sidoOptions: Option[];
  sigunguOptions: Option[];
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
};

/** 필터·업체 리스트(PRD 우측 패널). */
export const FilterSidebar = ({
  sidoOptions,
  sigunguOptions,
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
}: FilterSidebarProps) => {
  /** 업체 데이터로 간이 개인사업자 프로파일(연령대/업력)을 추정합니다. */
  const getMockProfile = (b: BusinessRow) => {
    const hash = Array.from(`${b.id}${b.name}`).reduce(
      (acc, ch) => acc + ch.charCodeAt(0),
      0
    );
    const ageGroups = ["20-30대", "30-40대", "40-50대", "50-60대"];
    const years = hash % 10;
    return {
      ageGroup: ageGroups[hash % ageGroups.length],
      yearsInBusiness: years,
    };
  };

  /** PRD 기준 우선 영업 상태 배지를 계산합니다. */
  const getStatusBadge = (b: BusinessRow) => {
    const profile = getMockProfile(b);
    if (profile.yearsInBusiness < 1) {
      return {
        label: "오픈 특수 (1년 미만)",
        className: "border-emerald-500/40 text-emerald-600",
      };
    }
    if (profile.yearsInBusiness >= 5 || b.revenueTrend < 0) {
      return {
        label: "매출 방어 필요 (5년 이상)",
        className: "border-rose-500/40 text-rose-600",
      };
    }
    if (b.revenueTrend >= 0) {
      return {
        label: "고수익 상권 진입",
        className: "border-amber-500/40 text-amber-600",
      };
    }
    return null;
  };

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border border-border bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="border-b border-border bg-brand-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 opacity-90" />
            <h2 className="font-heading text-xs font-semibold tracking-widest uppercase">
              필터 · 목록
            </h2>
          </div>
          <Badge
            variant="outline"
            className="border-white/40 bg-white/10 text-[0.6rem] text-white"
            title="행정동/업종 분류와 업체 기본정보는 공공 원천 응답을 사용합니다."
          >
            실데이터
          </Badge>
        </div>
      </div>

      <div className="space-y-4 border-b border-border p-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-[0.65rem] tracking-widest uppercase text-muted-foreground">
              행정동 (3단계)
            </Label>
            <Badge variant="outline" className="text-[0.55rem]" title="공공 원천 응답값입니다.">
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
            disabled={!selectedSido}
          >
            <NativeSelectOption value="">
              {selectedSido ? "시/군/구 선택" : "먼저 시/도를 선택하세요"}
            </NativeSelectOption>
            {sigunguOptions.map((r) => (
              <NativeSelectOption key={r.value} value={r.value}>
                {r.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
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
            <Label className="text-[0.65rem] tracking-widest uppercase text-muted-foreground">
              업종 (3단계)
            </Label>
            <Badge variant="outline" className="text-[0.55rem]" title="공공 원천 응답값입니다.">
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
          <Label className="text-[0.65rem] tracking-widest uppercase text-muted-foreground">
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
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2 pt-2">
        <p className="mb-2 px-2 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
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
                const crisis = b.revenueTrend < 0;
                const active = b.id === selectedId;
                const profile = getMockProfile(b);
                const statusBadge = getStatusBadge(b);
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
                          className={`shrink-0 tabular-nums ${
                            crisis
                              ? "font-semibold text-brand-negative"
                              : "text-brand-positive"
                          }`}
                        >
                          {b.revenueTrend > 0 ? "+" : ""}
                          {b.revenueTrend}%
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.65rem] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="size-3" />
                          {b.category || "업종 미상"}
                        </span>
                        {priority ? (
                          <Badge
                            variant="outline"
                            className="border-brand-positive/40 text-[0.55rem] text-brand-positive"
                          >
                            우선
                          </Badge>
                        ) : null}
                        {statusBadge ? (
                          <Badge
                            variant="outline"
                            className={`text-[0.55rem] ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </Badge>
                        ) : null}
                        <Badge
                          variant="outline"
                          className="text-[0.55rem]"
                          title="정제·규칙 기반으로 생성된 가공 정보입니다."
                        >
                          가공데이터
                        </Badge>
                        {b.id.startsWith("ext-") ? (
                          <Badge
                            variant="outline"
                            className="text-[0.55rem] text-muted-foreground"
                          >
                            공공
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[0.65rem] text-muted-foreground">
                        {b.address || "주소 정보 없음"}
                      </p>
                      <p className="mt-0.5 text-[0.6rem] text-muted-foreground">
                        대표자 연령대: {profile.ageGroup}
                      </p>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </ScrollArea>
      </div>

      <Separator />
      <p className="px-4 py-2 text-[0.6rem] leading-snug text-muted-foreground">
        매출 하락 + 공동주택 증가율 10% 초과 시 &quot;우선 영업 후보&quot;로
        분류합니다. (PRD 5.1)
      </p>
      <p className="border-t border-border px-4 py-2 text-[0.6rem] leading-snug text-muted-foreground">
        상태 배지와 대표자 속성은 규칙 기반 가공 데이터입니다.
      </p>
    </aside>
  );
};
