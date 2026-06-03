import { fetchPublicApiJson } from "@/lib/api/public-api-fetch";
import {
  getStaticSigunguOptions,
  SIGUNGU_DATA_AS_OF,
} from "@/lib/sales/sigungu-static-data";
import {
  isSigunguLevelName,
  parseRegionLabel,
  regionLabelMatchesSelection,
} from "@/lib/sales/region-hierarchy";

type Option = { value: string; label: string };

export type SigunguOptionsSource = "api" | "static";

export type SigunguOptionsResult = {
  options: Option[];
  source: SigunguOptionsSource;
  /** 정적 폴백일 때만 — `SIGUNGU_DATA_AS_OF`. */
  staticAsOf?: string;
};

/** 행정표준 검색 결과에서 시·도에 속한 시·군·구 명칭을 중복 없이 추출합니다. */
export const extractSigunguNamesFromStanResults = (
  results: { code: string; label: string }[],
  sido: string
): string[] => {
  const seen = new Set<string>();
  for (const row of results) {
    if (!regionLabelMatchesSelection(row.label, sido, "")) continue;
    const parsed = parseRegionLabel(row.label, { sido });
    const candidate = parsed.sigungu.trim();
    if (!candidate || candidate === "기타") continue;
    if (!isSigunguLevelName(candidate) && !/(시|군|구)$/.test(candidate)) {
      continue;
    }
    seen.add(candidate);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, "ko"));
};

const MIN_API_SIGUNGU_COUNT = 2;

/** 시·도 선택 시 행정표준 API로 시·군·구를 조회하고, 부족하면 정적 목록으로 폴백합니다. */
export const fetchSigunguOptionsForSido = async (
  sido: string
): Promise<SigunguOptionsResult> => {
  if (!sido.trim()) {
    return { options: [], source: "static", staticAsOf: SIGUNGU_DATA_AS_OF };
  }

  try {
    const result = await fetchPublicApiJson<{
      ok?: boolean;
      results?: { code: string; label: string }[];
    }>(`/api/regions/search?q=${encodeURIComponent(sido.trim())}`);
    const names = extractSigunguNamesFromStanResults(
      result.data?.results ?? [],
      sido
    );
    if (names.length >= MIN_API_SIGUNGU_COUNT) {
      return {
        options: names.map((name) => ({ value: name, label: name })),
        source: "api",
      };
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[시·군·구 API] 조회 실패, 정적 목록 사용", e);
    }
  }

  return {
    options: getStaticSigunguOptions(sido),
    source: "static",
    staticAsOf: SIGUNGU_DATA_AS_OF,
  };
};
