import { extractSemasLikeBody } from "@/lib/commercial-api/extract-response-body";
import { parseSemasItems } from "@/lib/commercial-api/parse-semas-items";
import {
  buildUrlWithExplicitTypeJson,
  parsePublicDataFetchAsJson,
} from "@/lib/commercial-api/public-data-response";
import { STAN_REGIN_BASE_URL } from "@/lib/api/public-data-endpoints";

const STAN_BASE = STAN_REGIN_BASE_URL;

export type StanRegionItem = {
  locatadd_nm?: string;
  locatjumin_cd?: string;
  region_cd?: string;
};

/** StanReginCd 배열 형태(구 스키마)에서 row 를 추출합니다. */
const extractStanRows = (
  json: Record<string, unknown>
): StanRegionItem[] | undefined => {
  const stan = json.StanReginCd;
  if (!Array.isArray(stan) || !stan[0] || typeof stan[0] !== "object") {
    return undefined;
  }
  const first = stan[0] as { row?: StanRegionItem[]; body?: unknown };
  if (Array.isArray(first.row) && first.row.length > 0) {
    return first.row;
  }
  return undefined;
};

/** 행정표준코드 목록 조회(지역명 검색). @see 행정안전부 행정표준코드 API */
export const fetchStanRegionList = async (
  serviceKey: string,
  options: { pageNo?: number; numOfRows?: number; locatadd_nm?: string }
): Promise<{ total: number; rows: StanRegionItem[] }> => {
  const q = new URLSearchParams();
  q.set("serviceKey", serviceKey);
  q.set("type", "json");
  q.set("pageNo", String(options.pageNo ?? 1));
  q.set("numOfRows", String(options.numOfRows ?? 50));
  if (options.locatadd_nm) q.set("locatadd_nm", options.locatadd_nm);

  const url = buildUrlWithExplicitTypeJson(
    `${STAN_BASE}/getStanReginCdList`,
    q
  );
  const res = await fetch(url, { next: { revalidate: 0 } });
  const json = await parsePublicDataFetchAsJson(
    res,
    "StanReginCd/getStanReginCdList"
  );
  const body = extractSemasLikeBody<StanRegionItem>(json);
  let rows = parseSemasItems<StanRegionItem>(
    body as { items?: StanRegionItem[] | { item?: StanRegionItem | StanRegionItem[] } }
  );
  if (rows.length === 0) {
    const legacy = extractStanRows(json);
    if (legacy?.length) rows = legacy;
  }
  const total = body?.totalCount ?? rows.length;
  return { total, rows };
};
