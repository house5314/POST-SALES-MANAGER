import { NextRequest, NextResponse } from "next/server";

import { buildMockIndustryAvg } from "@/lib/commercial-api/mock-sales-metrics";

/** 서비스업 평균매출 API 응답을 시연용으로 제공합니다. */
export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const dong = searchParams.get("dong")?.trim() ?? "";
  const metric = buildMockIndustryAvg(dong, "srvc");
  return NextResponse.json({
    ok: true as const,
    endpoint: "/getAreaIndutyAvrSrvcStats",
    ...metric,
  });
};
