import { NextResponse } from "next/server";

import { fetchIndustryLargeClasses } from "@/lib/commercial-api/semas-store";

/** 상권정보 업종 대분류 목록(소상공인 상가 API). 서버 전용 인증키 사용. */
export const GET = async () => {
  const key = process.env.PUBLIC_DATA_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ ok: true as const, items: [] as { indsLclsCd: string; indsLclsNm: string }[] });
  }
  try {
    const items = await fetchIndustryLargeClasses(key);
    return NextResponse.json({ ok: true as const, items });
  } catch {
    return NextResponse.json({ ok: true as const, items: [] as { indsLclsCd: string; indsLclsNm: string }[] });
  }
};
