import { NextRequest, NextResponse } from "next/server";

import { pickStanRegionFallbackForQuery } from "@/lib/commercial-api/stan-fallback";
import {
  buildUrlWithExplicitTypeJson,
  parsePublicDataFetchAsJson,
} from "@/lib/commercial-api/public-data-response";
import { toStanApiLocataddNm } from "@/lib/commercial-api/stan-search-query";

/** 행정표준코드 지역명 검색(행정동 코드 후보). */
export const GET = async (req: NextRequest) => {
  const key = process.env.PUBLIC_DATA_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        ok: false as const,
        message: "PUBLIC_DATA_API_KEY 가 필요합니다.",
        results: [] as { code: string; label: string }[],
      },
      { status: 503 }
    );
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({
      ok: true as const,
      results: [] as { code: string; label: string }[],
      usedFallback: false,
    });
  }

  const apiLocatNm = toStanApiLocataddNm(q);

  const fetchStanRows = async (locataddNm: string) => {
    const params = new URLSearchParams();
    params.set("serviceKey", key);
    params.set("pageNo", "1");
    params.set("numOfRows", "200");
    params.set("type", "json");
    params.set("locatadd_nm", locataddNm);
    const url = buildUrlWithExplicitTypeJson(
      "https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList",
      params
    );
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await parsePublicDataFetchAsJson(
      res,
      "StanReginCd/getStanReginCdList"
    );
    const stanArray = data.StanReginCd as
      | Array<{
          head?: Array<{ RESULT?: { resultCode?: string; resultMsg?: string } }>;
          row?: { region_cd?: string; locatadd_nm?: string }[];
        }>
      | undefined;
    const resultMeta = stanArray
      ?.flatMap((item) => item.head ?? [])
      .find((h) => h.RESULT?.resultCode)?.RESULT;
    if (resultMeta?.resultCode && resultMeta.resultCode !== "INFO-0") {
      throw new Error(
        `[공공 API] ${resultMeta.resultCode}: ${resultMeta.resultMsg ?? "응답 오류"}`
      );
    }
    return (
      stanArray
        ?.find((item) => Array.isArray(item.row))
        ?.row ?? []
    );
  };

  try {
    let rows: { region_cd?: string; locatadd_nm?: string }[] = [];
    let firstError: Error | null = null;
    try {
      rows = await fetchStanRows(apiLocatNm);
    } catch (e) {
      firstError = e instanceof Error ? e : new Error("행정동 조회 오류");
    }
    if (rows.length === 0 && apiLocatNm.includes(" ")) {
      const compactQuery = apiLocatNm.replace(/\s+/g, "");
      try {
        rows = await fetchStanRows(compactQuery);
      } catch {
        // 첫 번째 실패 원인을 우선 사용합니다.
      }
    }
    if (rows.length === 0 && firstError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[행정표준 재시도 실패]", firstError.message);
      }
      return NextResponse.json({
        ok: true as const,
        results: [] as { code: string; label: string }[],
        usedFallback: true,
        message: firstError.message,
      });
    }

    const mapped = rows
      .map((r) => {
        const code = (r.region_cd ?? "").trim();
        const label = (r.locatadd_nm ?? "").trim();
        if (!code || !label) return null;
        return { code, label };
      })
      .filter(
        (x): x is { code: string; label: string } =>
          x !== null && !x.label.includes("기타")
      );

    if (mapped.length === 0) {
      return NextResponse.json({
        ok: true as const,
        results: pickStanRegionFallbackForQuery(q),
        usedFallback: true,
      });
    }

    return NextResponse.json({
      ok: true as const,
      results: mapped,
      usedFallback: false,
    });
  } catch (e) {
    const devMsg =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : undefined;
    return NextResponse.json({
      ok: true as const,
      results: pickStanRegionFallbackForQuery(q),
      usedFallback: true,
      message: devMsg,
    });
  }
};
