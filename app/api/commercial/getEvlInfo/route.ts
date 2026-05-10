import { NextRequest, NextResponse } from "next/server";

import { buildMockEvlInfo } from "@/lib/commercial-api/mock-sales-metrics";

/** 개인사업자 평가정보 API 응답을 시연용으로 제공합니다. */
export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId")?.trim() ?? "";
  const name = searchParams.get("name")?.trim() ?? "";
  if (!businessId) {
    return NextResponse.json(
      { ok: false as const, message: "businessId가 필요합니다." },
      { status: 400 }
    );
  }
  const info = buildMockEvlInfo(businessId, name);
  return NextResponse.json({
    ok: true as const,
    info,
  });
};
