import { NextRequest, NextResponse } from "next/server";

import {
  detectPublicApiQuotaExceeded,
  PUBLIC_API_QUOTA_USER_MESSAGE,
} from "@/lib/api/public-data-quota";
import { buildMockRevenueTrend } from "@/lib/commercial-api/mock-sales-metrics";
import { fetchStoreListInDong } from "@/lib/commercial-api/semas-store";
import type { BusinessRow } from "@/lib/sales/types";

const STORE_PAGE_SIZE = 1000;

/**
 * 법정동코드 입력을 시군구 조회 + 서버 필터링으로 우회하는 상가 조회 프록시.
 * 호출 빈도·일일 한도는 공공데이터포털 계약을 따릅니다(`docs/operations-data-quota.md`).
 */
export const GET = async (req: NextRequest) => {
  /** WGS84(한반도) 범위인지 검증합니다. */
  const isKoreaWgs84 = (lat: number, lng: number) => {
    return lat >= 33 && lat <= 38 && lng >= 126 && lng <= 132;
  };

  const key = process.env.PUBLIC_DATA_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        ok: false as const,
        message: "PUBLIC_DATA_API_KEY 가 필요합니다.",
        rows: [],
        total: 0,
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const dongCd = searchParams.get("dong")?.trim() || searchParams.get("dongCd")?.trim();
  const indL = searchParams.get("indL")?.trim();
  const indM = searchParams.get("indM")?.trim();
  const indS = searchParams.get("indS")?.trim();
  const indsLclsCd = searchParams.get("indsLclsCd")?.trim();
  if (!dongCd) {
    return NextResponse.json(
      { ok: false as const, message: "dongCd(법정동코드)가 필요합니다.", rows: [], total: 0 },
      { status: 400 }
    );
  }
  const signguCd = dongCd.slice(0, 5);
  if (signguCd.length !== 5) {
    return NextResponse.json(
      {
        ok: false as const,
        message: "dongCd 형식이 올바르지 않습니다. (10자리 법정동코드 필요)",
        rows: [],
        total: 0,
      },
      { status: 400 }
    );
  }

  try {
    /** PoC: 1회 조회(≤3초 클라이언트 타임아웃). totalCount만으로 잘림 여부를 안내합니다. */
    const page = await fetchStoreListInDong(key, {
      divId: "signguCd",
      key: signguCd,
      indsLclsCd: indsLclsCd || indL || undefined,
      indsMclsCd: indM || undefined,
      indsSclsCd: indS || undefined,
      pageNo: 1,
      numOfRows: STORE_PAGE_SIZE,
    });
    const apiTotal = page.total;
    const truncated =
      apiTotal > page.rows.length && page.rows.length >= STORE_PAGE_SIZE;
    const rows = page.rows;
    const byLdong = rows.filter((r) => (r.ldongCd ?? "").trim() === dongCd);
    const byIndustry = byLdong.filter((r) => {
      if (indL && (r.indsLclsCd ?? "").trim() !== indL) return false;
      if (indM && (r.indsMclsCd ?? "").trim() !== indM) return false;
      if (indS && (r.indsSclsCd ?? "").trim() !== indS) return false;
      return true;
    });
    const mapped: BusinessRow[] = byIndustry.map((row, idx) => {
      const rawLat = Number(row.lat);
      const rawLng = Number(row.lon);
      return {
        id: (row.bizesId ?? `ext-${dongCd}-${idx}`).trim(),
        name: (row.bizesNm ?? "상호 미상").trim(),
        category: (row.indsSclsNm ?? row.indsMclsNm ?? "업종 미상").trim(),
        address: (row.rdnmAdr ?? row.lnoAdr ?? "").trim(),
        lnoAdr: (row.lnoAdr ?? "").trim() || null,
        regionCode: (row.ldongCd ?? row.adongCd ?? dongCd).trim(),
        ldongCd: (row.ldongCd ?? "").trim() || null,
        dataSource: "commercial_public" as const,
        lat: Number.isFinite(rawLat) ? rawLat : null,
        lng: Number.isFinite(rawLng) ? rawLng : null,
        revenueTrend: buildMockRevenueTrend(
          (row.bizesId ?? `ext-${dongCd}-${idx}`).trim(),
          dongCd,
          row.indsLclsCd ?? indL ?? indsLclsCd
        ),
        indsLclsCd: (row.indsLclsCd ?? indL ?? indsLclsCd ?? null) as string | null,
        indsMclsCd: (row.indsMclsCd ?? "").trim() || null,
        indsSclsCd: (row.indsSclsCd ?? "").trim() || null,
      };
    });
    const normalized: BusinessRow[] = mapped.map((row) => {
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { ...row, lat: null, lng: null };
      }
      if (!isKoreaWgs84(lat, lng)) {
        return { ...row, lat: null, lng: null };
      }
      return row;
    });
    if (process.env.NODE_ENV === "development" && byIndustry.length > 0) {
      const raw = byIndustry[0];
      const first = normalized[0];
      console.log("[상가 좌표 매핑 확인]", {
        rawLat: raw.lat ?? raw.y,
        rawLon: raw.lon ?? raw.x,
        mappedLat: first?.lat,
        mappedLng: first?.lng,
        mappedId: first?.id,
      });
    }
    return NextResponse.json({
      ok: true as const,
      rows: normalized,
      total: normalized.length,
      apiTotal,
      truncated,
      ...(truncated
        ? {
            notice: `소진공 API 기준 전체 ${apiTotal.toLocaleString("ko-KR")}건 중 최대 ${STORE_PAGE_SIZE.toLocaleString("ko-KR")}건만 조회되었습니다. 번화 상권은 일부 업체가 누락될 수 있습니다.`,
          }
        : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "상가 조회 실패";
    const quotaMsg = detectPublicApiQuotaExceeded(msg);
    if (quotaMsg) {
      return NextResponse.json(
        {
          ok: false as const,
          code: "QUOTA_EXCEEDED" as const,
          message: PUBLIC_API_QUOTA_USER_MESSAGE,
          rows: [],
          total: 0,
        },
        { status: 429 }
      );
    }
    if (msg.includes("resultCode\":\"03\"") || msg.includes("NODATA_ERROR")) {
      return NextResponse.json({
        ok: true as const,
        rows: [] as BusinessRow[],
        results: [] as BusinessRow[],
        total: 0,
      });
    }
    return NextResponse.json(
      { ok: false as const, message: msg, rows: [], total: 0 },
      { status: 502 }
    );
  }
};
