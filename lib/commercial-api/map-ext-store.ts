import type { SbizStoreItem } from "@/lib/commercial-api/semas-store";
import type { BusinessRow } from "@/lib/sales/types";

/** 상가 API 행을 앱 BusinessRow 로 변환(매출은 미연동 시 0). */
export const mapSbizStoreToBusinessRow = (
  s: SbizStoreItem,
  indsLclsCd?: string
): BusinessRow => {
  // 공공데이터 좌표 원본은 lat(위도), lon(경도)이며 앱에서는 lat/lng로 사용합니다.
  const latRaw = Number.parseFloat(String(s.lat ?? "NaN"));
  const lngRaw = Number.parseFloat(String(s.lon ?? "NaN"));
  const latFallback = Number.parseFloat(String(s.y ?? "NaN"));
  const lngFallback = Number.parseFloat(String(s.x ?? "NaN"));
  const lat = Number.isFinite(latRaw) ? latRaw : latFallback;
  const lng = Number.isFinite(lngRaw) ? lngRaw : lngFallback;
  return {
    id: `ext-${s.bizesId ?? `${s.adongCd}-${Math.random().toString(36).slice(2, 9)}`}`,
    name: (s.bizesNm ?? "상호 미상").trim(),
    category: (s.indsSclsNm ?? s.indsMclsNm ?? s.indsLclsNm ?? "기타").trim(),
    address: (s.rdnmAdr ?? s.lnoAdr ?? "").trim(),
    lnoAdr: (s.lnoAdr ?? "").trim() || null,
    regionCode: ((s.ldongCd ?? s.adongCd) ?? "").trim(),
    ldongCd: (s.ldongCd ?? "").trim() || null,
    dataSource: "commercial_public",
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    revenueTrend: 0,
    indsLclsCd: indsLclsCd ?? s.indsLclsCd ?? null,
    indsMclsCd: (s.indsMclsCd ?? "").trim() || null,
    indsSclsCd: (s.indsSclsCd ?? "").trim() || null,
  };
};
