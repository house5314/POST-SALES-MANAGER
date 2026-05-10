import { NextRequest, NextResponse } from "next/server";

import { fetchLegaldongApartments } from "@/lib/molit/fetch-legaldong-apts";

/** 국토부 단지 목록(getLegaldongAptList3) 프록시 — 서버에서 인증키를 보관합니다. */
export const GET = async (req: NextRequest) => {
  const key = process.env.PUBLIC_DATA_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        ok: false as const,
        message:
          "PUBLIC_DATA_API_KEY 가 필요합니다. 공공데이터포털에서 공동주택 단지 목록 API 활용 신청 후 설정하세요.",
        items: [],
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const bjdongCd =
    searchParams.get("bjdongCd")?.trim() ||
    searchParams.get("dong")?.trim() ||
    searchParams.get("dongCd")?.trim() ||
    "";

  const latRaw = searchParams.get("lat") ?? searchParams.get("centerLat");
  const lngRaw = searchParams.get("lng") ?? searchParams.get("centerLng");
  const radiusRaw = searchParams.get("radiusM");

  const centerLat = latRaw != null && latRaw !== "" ? Number(latRaw) : null;
  const centerLng = lngRaw != null && lngRaw !== "" ? Number(lngRaw) : null;
  const radiusParsed =
    radiusRaw != null && radiusRaw !== "" ? Number(radiusRaw) : NaN;
  const radiusM = Number.isFinite(radiusParsed)
    ? Math.min(5000, Math.max(100, radiusParsed))
    : 1000;

  if (!/^\d{10}$/.test(bjdongCd)) {
    return NextResponse.json(
      {
        ok: false as const,
        message:
          "bjdongCd(법정동코드 10자리)가 필요합니다. 상가 데이터의 법정동코드를 확인하세요.",
        items: [],
      },
      { status: 400 }
    );
  }

  try {
    const items = await fetchLegaldongApartments({
      serviceKey: key,
      bjdongCd,
      centerLat:
        centerLat != null && Number.isFinite(centerLat) ? centerLat : null,
      centerLng:
        centerLng != null && Number.isFinite(centerLng) ? centerLng : null,
      radiusM,
    });
    return NextResponse.json({ ok: true as const, items });
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "국토부 단지 목록을 불러오지 못했습니다.";
    if (process.env.NODE_ENV === "development") {
      console.error("[molit/getAptList]", e);
    }
    return NextResponse.json(
      { ok: false as const, message, items: [] },
      { status: 502 }
    );
  }
};
