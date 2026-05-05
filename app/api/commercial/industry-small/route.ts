import { NextRequest, NextResponse } from "next/server";

import { fetchIndustrySmallClasses } from "@/lib/commercial-api/semas-store";

/** 업종 대/중분류 코드로 소분류 목록을 조회합니다. */
export const GET = async (req: NextRequest) => {
  const key = process.env.PUBLIC_DATA_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({
      ok: true as const,
      items: [] as {
        indsLclsCd: string;
        indsMclsCd: string;
        indsSclsCd: string;
        indsSclsNm: string;
      }[],
    });
  }
  const sp = new URL(req.url).searchParams;
  const large = sp.get("large")?.trim() ?? "";
  const medium = sp.get("medium")?.trim() ?? "";
  if (!large || !medium) {
    return NextResponse.json(
      {
        ok: true as const,
        items: [] as {
          indsLclsCd: string;
          indsMclsCd: string;
          indsSclsCd: string;
          indsSclsNm: string;
        }[],
      }
    );
  }
  try {
    const items = await fetchIndustrySmallClasses(key, large, medium);
    return NextResponse.json({ ok: true as const, items });
  } catch {
    return NextResponse.json({
      ok: true as const,
      items: [] as {
        indsLclsCd: string;
        indsMclsCd: string;
        indsSclsCd: string;
        indsSclsNm: string;
      }[],
    });
  }
};
