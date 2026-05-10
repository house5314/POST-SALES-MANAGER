import type { MolitAptComplex } from "@/lib/molit/types";

/** 공공데이터 JSON item 객체에서 문자열 필드를 추출합니다. */
const pickStr = (raw: Record<string, unknown>, keys: string[]): string => {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
};

/** 공공데이터 JSON item 객체에서 숫자 필드를 추출합니다. */
const pickNum = (raw: Record<string, unknown>, keys: string[]): number => {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v.replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
};

/** 위·경도 후보 키에서 좌표를 꺼냅니다(없으면 null). */
const pickCoord = (raw: Record<string, unknown>, keys: string[]): number | null => {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v.replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
};

/** 단일 레코드를 내부 표준 형태로 정규화합니다. */
export const normalizeMolitAptItem = (
  raw: Record<string, unknown>,
  idx: number
): MolitAptComplex => {
  const code = pickStr(raw, [
    "kaptCode",
    "kaptcode",
    "KAPT_CODE",
    "aptCode",
    "aptCd",
  ]);
  const name = pickStr(raw, [
    "kaptName",
    "kaptname",
    "aptName",
    "aptNm",
    "단지명",
  ]);
  const households = Math.max(
    0,
    Math.round(
      pickNum(raw, [
        "hhldCnt",
        "hhldcnt",
        "totHouseCnt",
        "hoCnt",
        "세대수",
      ])
    )
  );

  const latRaw = pickCoord(raw, ["latitude", "lat", "braLat", "LAT", "gpsLat"]);
  const lngRaw = pickCoord(raw, ["longitude", "lng", "lon", "braLng", "LNG", "gpsLng"]);

  const latOk =
    latRaw !== null && latRaw >= 33 && latRaw <= 39;
  const lngOk =
    lngRaw !== null && lngRaw >= 124 && lngRaw <= 132;

  const id =
    code.trim() ||
    `${name || "apt"}-${idx}-${pickStr(raw, ["bjdongCd", "bjdong_cd"])}`;

  return {
    id,
    name: name || "단지명 미상",
    households,
    lat: latOk ? latRaw : null,
    lng: lngOk ? lngRaw : null,
    distanceM: null,
  };
};
