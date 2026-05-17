"use client";

import { useMemo } from "react";

import type { MolitAptComplex } from "@/lib/molit/types";
import type { BusinessRow } from "@/lib/sales/types";

type DemoMapFallbackProps = {
  /** 지도에 올릴 상가(좌표 유효분만 표시). */
  businesses: BusinessRow[];
  selectedId: string | null;
  onMarkerSelect: (id: string) => void;
  apartments: MolitAptComplex[];
  selectedAptIdList: string[];
  onAptSelect?: (id: string, opts: { shiftKey: boolean }) => void;
  radiusAnchor?: { lat: number; lng: number } | null;
};

type LngLat = { lat: number; lng: number };

const validBizCoord = (b: BusinessRow): LngLat | null => {
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return null;
  return { lat, lng };
};

const validAptCoord = (a: MolitAptComplex): LngLat | null => {
  if (a.lat == null || a.lng == null) return null;
  const lat = Number(a.lat);
  const lng = Number(a.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

/**
 * NCP 클라이언트 ID 없이 데모 설문 링크만으로 지도 상호작용을 체험할 수 있게 하는 정적 미니맵입니다.
 * @param businesses 상가 마커 후보
 */
export const DemoMapFallback = ({
  businesses,
  selectedId,
  onMarkerSelect,
  apartments,
  selectedAptIdList,
  onAptSelect,
  radiusAnchor,
}: DemoMapFallbackProps) => {
  const layout = useMemo(() => {
    const pts: Array<{ id: string; kind: "biz" | "apt"; coord: LngLat }> = [];
    const bboxCoords: LngLat[] = [];
    for (const b of businesses) {
      const c = validBizCoord(b);
      if (c) {
        bboxCoords.push(c);
        pts.push({ id: b.id, kind: "biz", coord: c });
      }
    }
    for (const a of apartments) {
      const c = validAptCoord(a);
      if (c) {
        bboxCoords.push(c);
        pts.push({ id: a.id, kind: "apt", coord: c });
      }
    }
    if (radiusAnchor) bboxCoords.push(radiusAnchor);
    if (bboxCoords.length === 0) {
      return { minLat: 37.5, maxLat: 37.6, minLng: 126.9, maxLng: 127.05, pts };
    }
    let minLat = bboxCoords[0]!.lat;
    let maxLat = bboxCoords[0]!.lat;
    let minLng = bboxCoords[0]!.lng;
    let maxLng = bboxCoords[0]!.lng;
    for (const c of bboxCoords) {
      minLat = Math.min(minLat, c.lat);
      maxLat = Math.max(maxLat, c.lat);
      minLng = Math.min(minLng, c.lng);
      maxLng = Math.max(maxLng, c.lng);
    }
    const padLat = Math.max(0.0008, (maxLat - minLat) * 0.35 || 0.002);
    const padLng = Math.max(0.0008, (maxLng - minLng) * 0.35 || 0.002);
    return {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
      pts,
    };
  }, [apartments, businesses, radiusAnchor]);

  const toPct = (coord: LngLat) => {
    const { minLat, maxLat, minLng, maxLng } = layout;
    const latSpan = Math.max(1e-9, maxLat - minLat);
    const lngSpan = Math.max(1e-9, maxLng - minLng);
    const topPct = ((maxLat - coord.lat) / latSpan) * 100;
    const leftPct = ((coord.lng - minLng) / lngSpan) * 100;
    return {
      top: `${Math.min(94, Math.max(3, topPct))}%`,
      left: `${Math.min(94, Math.max(3, leftPct))}%`,
    };
  };

  const bizPts = layout.pts.filter((p) => p.kind === "biz");

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-gradient-to-b from-slate-200/95 to-slate-300/90 dark:from-slate-900/95 dark:to-slate-950/90">
      <div className="shrink-0 border-b border-slate-400/30 px-3 py-2 text-center dark:border-slate-600/40">
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          데모 지도 (네이버 NCP 키 없음)
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-700 dark:text-slate-300">
          마커를 눌러 상가를 선택하세요. 단지(🏠)는 Shift+클릭으로 다중 선택됩니다.
        </p>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="absolute inset-2 rounded-lg border border-slate-400/40 bg-[length:24px_24px] dark:border-slate-600/50"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(148 163 184 / 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.25) 1px, transparent 1px)",
            backgroundColor: "rgb(241 245 249 / 0.9)",
          }}
        >
          {radiusAnchor ? (
            <div
              className="pointer-events-none absolute rounded-full border-2 border-blue-500/50 bg-blue-500/10"
              style={{
                ...(() => {
                  const c = radiusAnchor;
                  const p = toPct(c);
                  return {
                    top: `calc(${p.top} - 9%)`,
                    left: `calc(${p.left} - 9%)`,
                    width: "18%",
                    height: "18%",
                  };
                })(),
              }}
              aria-hidden
            />
          ) : null}
          {bizPts.map((p) => {
            const b = businesses.find((x) => x.id === p.id);
            if (!b) return null;
            const pos = toPct(p.coord);
            const selected = b.id === selectedId;
            const bg =
              b.revenueTrend < 0 ? "#dc2626" : b.revenueTrend > 0 ? "#3d7a5c" : "#78716c";
            return (
              <button
                key={b.id}
                type="button"
                title={b.name}
                className="absolute z-20 -translate-x-1/2 -translate-y-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{ top: pos.top, left: pos.left }}
                onClick={() => onMarkerSelect(b.id)}
              >
                <span
                  className="block rounded-full border-2 border-white shadow-md"
                  style={{
                    width: selected ? 18 : 14,
                    height: selected ? 18 : 14,
                    backgroundColor: bg,
                    boxShadow: selected ? "0 0 0 3px rgba(30,58,95,0.35)" : undefined,
                  }}
                />
              </button>
            );
          })}
          {apartments.map((a) => {
            const c = validAptCoord(a);
            if (!c) return null;
            const pos = toPct(c);
            const selected = selectedAptIdList.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                title={`${a.name} (${a.households}세대)`}
                className="absolute z-[25] flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{ top: pos.top, left: pos.left }}
                onClick={(e) => onAptSelect?.(a.id, { shiftKey: e.shiftKey })}
              >
                <span
                  className="flex size-7 items-center justify-center rounded-lg border text-sm shadow"
                  style={{
                    background: selected ? "#eff6ff" : "#fff",
                    borderColor: selected ? "#2563eb" : "#cbd5e1",
                    borderWidth: selected ? 2 : 1,
                  }}
                >
                  🏠
                </span>
                <span className="max-w-[100px] rounded border border-slate-200 bg-white/95 px-1 text-[9px] text-slate-700 dark:border-slate-600 dark:bg-slate-900/95 dark:text-slate-200">
                  {a.name.slice(0, 10)}
                  {a.name.length > 10 ? "…" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
