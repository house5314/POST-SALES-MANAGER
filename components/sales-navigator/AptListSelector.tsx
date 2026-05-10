"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import type { MolitAptComplex } from "@/lib/molit/types";

type AptListSelectorProps = {
  items: MolitAptComplex[];
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  onClear: () => void;
};

/** 반경 내 아파트 단지를 체크박스로 고르는 미니 패널입니다. */
export const AptListSelector = ({
  items,
  loading,
  error,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
}: AptListSelectorProps) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-none border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Spinner className="size-3.5 text-brand-primary" />
        국토부 단지 목록을 불러오는 중입니다.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-none border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-50">
        {error}
      </div>
    );
  }

  if (!items.length) {
    return (
      <p className="text-xs text-muted-foreground">
        이 법정동·반경 조건에서 표시할 단지가 없습니다. (상가 좌표가 있으면 좌표 기준
        1km 안이며, 위치 좌표가 없는 단지는 제외합니다.)
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="text-[0.65rem] font-medium text-brand-primary underline-offset-2 hover:underline"
          onClick={onSelectAll}
        >
          전체 선택
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          className="text-[0.65rem] font-medium text-muted-foreground underline-offset-2 hover:underline"
          onClick={onClear}
        >
          전체 해제
        </button>
      </div>
      <ul className="max-h-40 space-y-2 overflow-y-auto pr-1 text-xs">
        {items.map((apt) => {
          const checked = selectedIds.has(apt.id);
          return (
            <li
              key={apt.id}
              className="flex items-start gap-2 rounded-none border border-border/80 bg-card px-2 py-1.5"
            >
              <Checkbox
                id={`apt-${apt.id}`}
                checked={checked}
                onCheckedChange={(v) => onToggle(apt.id, v === true)}
                className="mt-0.5"
              />
              <label htmlFor={`apt-${apt.id}`} className="flex-1 cursor-pointer">
                <span className="font-medium text-foreground">{apt.name}</span>
                <span className="ml-1 tabular-nums text-muted-foreground">
                  ({apt.households.toLocaleString("ko-KR")}세대)
                </span>
                {apt.distanceM != null ? (
                  <span className="ml-1 text-[0.6rem] text-muted-foreground">
                    · 상가에서 {Math.round(apt.distanceM)}m
                  </span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
