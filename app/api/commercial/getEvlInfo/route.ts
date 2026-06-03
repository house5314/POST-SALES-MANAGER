import { NextRequest, NextResponse } from "next/server";

import { buildMockEvlInfo } from "@/lib/commercial-api/mock-sales-metrics";

/**
 * 개인사업자 평가정보(업력·연령 등) — PoC 시연용 목업.
 *
 * 소진공 「평가정보」 Open API는 별도 사업자 인증·이용 계약이 필요하며,
 * 본 과제 PoC 범위에는 실연동을 포함하지 않았습니다.
 * `buildMockEvlInfo`로 업체 ID·동 코드 기반 시드 일관 응답을 제공하며,
 * 상담 초안·제안서 템플릿 분기는 화면·PDF와 동일 출처를 사용합니다(§6 API 표).
 */
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
