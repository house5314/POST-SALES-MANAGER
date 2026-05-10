import { NextRequest, NextResponse } from "next/server";

import { evaluateMoveInPitch } from "@/lib/molit/move-in-script";

/** 국토부 공동저장소 통계 연동 자리 — 현재는 업종 규칙 기반 트리거를 반환합니다. */
export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const category =
    searchParams.get("category")?.trim() ||
    searchParams.get("inds")?.trim() ||
    "";
  const regionCode =
    searchParams.get("regionCode")?.trim() ||
    searchParams.get("dong")?.trim() ||
    "";

  if (!category || !regionCode) {
    return NextResponse.json(
      {
        ok: false as const,
        message: "category 와 regionCode(또는 dong)가 필요합니다.",
      },
      { status: 400 }
    );
  }

  const pitch = evaluateMoveInPitch(category, regionCode);

  return NextResponse.json({
    ok: true as const,
    surge: pitch.surge,
    headline: pitch.headline,
    detail: pitch.detail,
    source: "heuristic" as const,
    disclaimer:
      "실거래·이사 통계 원시 데이터가 아니라 업종·지역 시드 기반 시뮬레이션입니다.",
  });
};
