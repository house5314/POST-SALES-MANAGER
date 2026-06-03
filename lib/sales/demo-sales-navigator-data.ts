/**
 * `?demo=1` 설문·2차 심사용: 공공/NCP 키 없이 동작하는 고정 시연 데이터를 제공합니다.
 */
import {
  buildMockIndustryAvg,
  buildMockRevenueTrend,
} from "@/lib/commercial-api/mock-sales-metrics";
import { buildMarketStatRow } from "@/lib/sales/build-market-stat-row";
import type { MolitAptComplex } from "@/lib/molit/types";
import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

/** URL 쿼리 `demo` 값이 이 문자열이면 데모 모드입니다. */
export const SALES_NAVIGATOR_DEMO_QUERY_VALUE = "1";

/** 운영 배포에서 URL 데모를 막을 때 `NEXT_PUBLIC_DEMO_DISABLED=true` 로 설정합니다. */
export const isDemoModeDisabledByEnv = () =>
  process.env.NEXT_PUBLIC_DEMO_DISABLED === "true";

/** `searchParams.get("demo")` 기준 데모 여부를 판별합니다. */
export const isSalesNavigatorDemoMode = (demoParam: string | null | undefined) => {
  if (isDemoModeDisabledByEnv()) return false;
  return demoParam === SALES_NAVIGATOR_DEMO_QUERY_VALUE;
};

/** 데모 상가·상권 키로 쓰는 고정 행정동 식별자(실제 표준코드와 무관). */
export const DEMO_DONG_OPTIONS: { value: string; label: string }[] = [
  { value: "demo-adong-jongno-cheongjin", label: "청진동(데모)" },
  { value: "demo-adong-jongno-samcheong", label: "삼청동(데모)" },
];

/** 국토부 단지 조회용 예시 법정동코드(종로 일대 예시 — 시연용). */
export const DEMO_LDONG_CD = "1111010100";

export type DemoIndustryLarge = { indsLclsCd: string; indsLclsNm: string };

export const DEMO_INDUSTRY_LARGE: DemoIndustryLarge[] = [
  { indsLclsCd: "I", indsLclsNm: "외식(음식점·카페 등) — 데모" },
  { indsLclsCd: "G", indsLclsNm: "도소매 — 데모" },
  { indsLclsCd: "S", indsLclsNm: "수리·개인 서비스 — 데모" },
];

export const DEMO_IND_MEDIUM: Record<string, { value: string; label: string }[]> = {
  I: [{ value: "I01", label: "음식점업 (데모)" }],
  G: [{ value: "G47", label: "소매업 (데모)" }],
  S: [{ value: "S02", label: "개인·생활 서비스 (데모)" }],
};

export const DEMO_IND_SMALL: Record<string, { value: string; label: string }[]> = {
  I01: [{ value: "I0111", label: "한식 음식점 (데모)" }],
  G47: [{ value: "G4721", label: "슈퍼마켓·잡화 (데모)" }],
  S02: [{ value: "S0211", label: "미용·이용 서비스 (데모)" }],
};

type DemoAnchor = { lat: number; lng: number };

/** 동 데모 키에 따른 지도 기준 좌표(종로 일대). */
export const demoAnchorForDongCode = (dongValue: string): DemoAnchor =>
  dongValue === DEMO_DONG_OPTIONS[1]?.value
    ? { lat: 37.5842, lng: 126.9821 }
    : { lat: 37.5759, lng: 126.979 };

const demoStoreTemplates: Array<{
  name: string;
  category: string;
  indsLclsCd: string;
  indsMclsCd: string;
  indsSclsCd: string;
  offsetLat: number;
  offsetLng: number;
}> = [
  {
    name: "은하수곱창(데모)",
    category: "한식 음식점",
    indsLclsCd: "I",
    indsMclsCd: "I01",
    indsSclsCd: "I0111",
    offsetLat: 0.0008,
    offsetLng: -0.0005,
  },
  {
    name: "티타임카페(데모)",
    category: "커피·음료 전문점",
    indsLclsCd: "I",
    indsMclsCd: "I01",
    indsSclsCd: "I0111",
    offsetLat: -0.0006,
    offsetLng: 0.0004,
  },
  {
    name: "동네슈퍼(데모)",
    category: "슈퍼마켓",
    indsLclsCd: "G",
    indsMclsCd: "G47",
    indsSclsCd: "G4721",
    offsetLat: 0.0003,
    offsetLng: 0.0007,
  },
  {
    name: "헤어살롱(데모)",
    category: "미용실",
    indsLclsCd: "S",
    indsMclsCd: "S02",
    indsSclsCd: "S0211",
    offsetLat: -0.0009,
    offsetLng: -0.0003,
  },
  {
    name: "24세탁(데모)",
    category: "세탁소",
    indsLclsCd: "S",
    indsMclsCd: "S02",
    indsSclsCd: "S0211",
    offsetLat: 0.0011,
    offsetLng: 0.0002,
  },
];

/**
 * 현재 필터에 맞는 데모 상가 목록을 만듭니다.
 * @param regionCode `DEMO_DONG_OPTIONS`의 value
 * @param dongLabel 동 라벨(상권 행 표시용)
 */
export const buildDemoBusinessRows = (params: {
  regionCode: string;
  dongLabel: string;
  indsLclsCd: string;
  indsMclsCd: string;
  indsSclsCd: string;
}): BusinessRow[] => {
  const { regionCode, dongLabel, indsLclsCd, indsMclsCd, indsSclsCd } = params;
  const anchor = demoAnchorForDongCode(regionCode);
  const addr = `서울특별시 종로구 ${dongLabel}`;

  return demoStoreTemplates
    .filter((t) => {
      if (indsLclsCd && t.indsLclsCd !== indsLclsCd) return false;
      if (indsMclsCd && t.indsMclsCd !== indsMclsCd) return false;
      if (indsSclsCd && t.indsSclsCd !== indsSclsCd) return false;
      return true;
    })
    .map((t, i) => {
      const id = `demo-store-${regionCode}-${t.indsSclsCd}-${i}`;
      const lat = anchor.lat + t.offsetLat;
      const lng = anchor.lng + t.offsetLng;
      return {
        id,
        name: t.name,
        category: t.category,
        address: addr,
        regionCode,
        ldongCd: DEMO_LDONG_CD,
        dataSource: "commercial_public" as const,
        lat,
        lng,
        revenueTrend: buildMockRevenueTrend(id, regionCode, t.indsLclsCd),
        indsLclsCd: t.indsLclsCd,
        indsMclsCd: t.indsMclsCd,
        indsSclsCd: t.indsSclsCd,
      };
    });
};

/** 데모 상가가 속한 동 코드들로 상권 요약 맵을 채웁니다. */
export const buildDemoMarketByRegion = (
  rows: BusinessRow[],
  dongValue: string,
  dongLabel: string
): Record<string, MarketStatRow> => {
  const codes = new Set<string>();
  if (dongValue.trim()) codes.add(dongValue.trim());
  for (const r of rows) {
    const c = r.regionCode?.trim();
    if (c) codes.add(c);
  }
  const next: Record<string, MarketStatRow> = {};
  for (const code of codes) {
    next[code] = buildMarketStatRow(
      code,
      code === dongValue.trim() ? dongLabel : `상권(${code})`
    );
  }
  return next;
};

/** 선택 상가 주변 데모 단지(국토부 흉내). */
export const buildDemoMolitApts = (anchor: DemoAnchor): MolitAptComplex[] => {
  const bases: Array<{ name: string; hh: number; dLat: number; dLng: number }> = [
    { name: "광화문데모아파트", hh: 420, dLat: 0.0015, dLng: -0.001 },
    { name: "세종로데모빌", hh: 180, dLat: -0.0012, dLng: 0.0011 },
    { name: "청진데모타운", hh: 96, dLat: 0.0009, dLng: 0.0006 },
  ];
  return bases.map((b, i) => ({
    id: `demo-apt-${i}`,
    name: b.name,
    households: b.hh,
    lat: anchor.lat + b.dLat,
    lng: anchor.lng + b.dLng,
    distanceM: Math.round(120 + i * 80),
  }));
};

export type DemoIndustryAvgStat = {
  endpoint: string;
  avgSalesAmount: number;
  avgSalesPerArea: number;
};

/** 데모용 업종 평균매출( mock-sales-metrics 규칙 ). */
export const buildDemoIndustryAvgStat = (
  dongKey: string,
  largeName: string
): DemoIndustryAvgStat => {
  let key: "out" | "whrt" | "srvc" = "srvc";
  if (largeName.includes("외식")) key = "out";
  else if (largeName.includes("도소매") || largeName.includes("소매")) key = "whrt";
  const m = buildMockIndustryAvg(dongKey || "demo", key);
  return {
    endpoint: `(데모) mock-sales-metrics / ${key}`,
    avgSalesAmount: m.avgSalesAmount,
    avgSalesPerArea: m.avgSalesPerArea,
  };
};
