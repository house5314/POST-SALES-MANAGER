import { NextRequest, NextResponse } from "next/server";

import { buildMarketStatRow, MARKET_STAT_METRICS_SOURCE_LABEL } from "@/lib/sales/build-market-stat-row";
import type { MarketStatRow } from "@/lib/sales/types";

type RegionInput = { code?: string; label?: string };

/** 동일 법정동코드에 대한 계산 결과를 재사용하고, 라벨은 요청마다 갱신합니다. */
const marketStatCache = new Map<string, MarketStatRow>();

const MAX_REGIONS = 80;

/**
 * 법정동·상권 단위 `MarketStatRow`를 일괄 반환합니다(가공 데이터, DB 없음).
 * 우선 영업 후보(`isPriorityLead`)와 인사이트 패널이 동일 출처를 쓰도록 합니다.
 */
export const POST = async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false as const, message: "JSON 본문이 필요합니다.", byRegion: {} },
      { status: 400 }
    );
  }

  const regions = (body as { regions?: RegionInput[] })?.regions;
  if (!Array.isArray(regions) || regions.length === 0) {
    return NextResponse.json(
      {
        ok: false as const,
        message: "regions 배열(최소 1건)이 필요합니다.",
        byRegion: {},
      },
      { status: 400 }
    );
  }

  if (regions.length > MAX_REGIONS) {
    return NextResponse.json(
      {
        ok: false as const,
        message: `regions는 최대 ${MAX_REGIONS}건까지 요청할 수 있습니다.`,
        byRegion: {},
      },
      { status: 400 }
    );
  }

  const byRegion: Record<string, MarketStatRow> = {};

  for (const item of regions) {
    const code = typeof item?.code === "string" ? item.code.trim() : "";
    if (!code) continue;
    const label =
      typeof item?.label === "string" ? item.label.trim() : "";
    const preferredLabel = label || `상권(${code})`;
    const hit = marketStatCache.get(code);
    if (hit) {
      const merged = {
        ...hit,
        regionLabel: preferredLabel,
        metricsSourceLabel:
          hit.metricsSourceLabel ?? MARKET_STAT_METRICS_SOURCE_LABEL,
      };
      marketStatCache.set(code, merged);
      byRegion[code] = merged;
      continue;
    }
    const row = buildMarketStatRow(code, preferredLabel);
    marketStatCache.set(code, row);
    byRegion[code] = row;
  }

  return NextResponse.json({ ok: true as const, byRegion });
};
