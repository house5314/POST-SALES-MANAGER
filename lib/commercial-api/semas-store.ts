import { extractSemasLikeBody } from "@/lib/commercial-api/extract-response-body";
import { parseSemasItems } from "@/lib/commercial-api/parse-semas-items";
import type { SemasJsonResponse } from "@/lib/commercial-api/semas-types";
import {
  buildUrlWithExplicitTypeJson,
  parsePublicDataFetchAsJson,
} from "@/lib/commercial-api/public-data-response";
import { SEMAS_BASE_URL } from "@/lib/api/public-data-endpoints";

const SEMAS_BASE = SEMAS_BASE_URL;
const getServiceKeyCandidates = (serviceKey: string): string[] => {
  let decoded = serviceKey;
  try {
    decoded = decodeURIComponent(serviceKey);
  } catch {
    decoded = serviceKey;
  }
  return decoded !== serviceKey ? [serviceKey, decoded] : [serviceKey];
};
const fetchSemasJsonWithKeyVariants = async <T>(
  endpointPath: string,
  params: URLSearchParams,
  context: string,
  serviceKey: string
): Promise<Record<string, unknown> & SemasJsonResponse<T>> => {
  let lastError: Error | null = null;
  for (const keyCandidate of getServiceKeyCandidates(serviceKey)) {
    try {
      const q = new URLSearchParams(params);
      q.set("serviceKey", keyCandidate);
      q.set("type", "json");
      const url = buildUrlWithExplicitTypeJson(`${SEMAS_BASE}/${endpointPath}`, q);
      const res = await fetch(url, { next: { revalidate: 0 } });
      const json = (await parsePublicDataFetchAsJson(
        res,
        context
      )) as Record<string, unknown> & SemasJsonResponse<T>;
      return json;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("공공 API 호출 실패");
    }
  }
  throw lastError ?? new Error("공공 API 호출 실패");
};

export type StoreListInDongParams = {
  /** key 값(divId에 맞는 코드) */
  key: string;
  /** ctprvnCd | signguCd | adongCd */
  divId?: "ctprvnCd" | "signguCd" | "adongCd";
  indsLclsCd?: string;
  indsMclsCd?: string;
  indsSclsCd?: string;
  pageNo?: number;
  numOfRows?: number;
};

export type SbizStoreItem = {
  bizesId?: string;
  bizesNm?: string;
  indsLclsCd?: string;
  indsLclsNm?: string;
  indsMclsCd?: string;
  indsMclsNm?: string;
  indsSclsCd?: string;
  indsSclsNm?: string;
  lnoAdr?: string;
  rdnmAdr?: string;
  adongCd?: string;
  adongNm?: string;
  ldongCd?: string;
  ldongNm?: string;
  /** 일부 응답에서 경위도 필드명이 다를 수 있음 */
  lon?: string;
  lat?: string;
  x?: string;
  y?: string;
};

/** storeListInDong 조회(divId/key 조합). @see 공공데이터 15012005 */
export const fetchStoreListInDong = async (
  serviceKey: string,
  params: StoreListInDongParams
): Promise<{ total: number; rows: SbizStoreItem[] }> => {
  const q = new URLSearchParams();
  q.set("numOfRows", String(params.numOfRows ?? 200));
  q.set("pageNo", String(params.pageNo ?? 1));
  q.set("divId", params.divId ?? "adongCd");
  q.set("key", params.key);
  if (params.indsLclsCd) q.set("indsLclsCd", params.indsLclsCd);
  if (params.indsMclsCd) q.set("indsMclsCd", params.indsMclsCd);
  if (params.indsSclsCd) q.set("indsSclsCd", params.indsSclsCd);
  const json = await fetchSemasJsonWithKeyVariants<SbizStoreItem>(
    "storeListInDong",
    q,
    "sdsc2/storeListInDong",
    serviceKey
  );
  const body = extractSemasLikeBody<SbizStoreItem>(json) ?? json.body;
  const rows = parseSemasItems(body);
  return {
    total: body?.totalCount ?? rows.length,
    rows,
  };
};

export type IndustryLargeItem = { indsLclsCd: string; indsLclsNm: string };
export type IndustryMediumItem = {
  indsLclsCd: string;
  indsMclsCd: string;
  indsMclsNm: string;
};
export type IndustrySmallItem = {
  indsLclsCd: string;
  indsMclsCd: string;
  indsSclsCd: string;
  indsSclsNm: string;
};

/** 업종 대분류(upjongLarge) 목록을 조회합니다. */
export const fetchIndustryLargeClasses = async (
  serviceKey: string
): Promise<IndustryLargeItem[]> => {
  try {
    const q = new URLSearchParams();
    const json = await fetchSemasJsonWithKeyVariants<IndustryLargeItem>(
      "baroApi/api/store/upjong/large",
      q,
      "sdsc2/upjongLarge",
      serviceKey
    );
    const body = extractSemasLikeBody<IndustryLargeItem>(json) ?? json.body;
    const rows = parseSemasItems(body);
    const parsed = rows
      .map((x) => ({
        indsLclsCd: (x.indsLclsCd ?? "").trim(),
        indsLclsNm: (x.indsLclsNm ?? "").trim(),
      }))
      .filter((x) => !!x.indsLclsCd && !!x.indsLclsNm);
    if (parsed.length > 0) return parsed;
  } catch {
    // 공식 업종 API 미지원/오류 시 하단 fallback으로 대체
  }
  const fallbackRows = await fetchIndustryFallbackRows(serviceKey, {});
  return dedupeByCode(
    fallbackRows
      .map((row) => ({
        indsLclsCd: (row.indsLclsCd ?? "").trim(),
        indsLclsNm: (row.indsLclsNm ?? "").trim(),
      }))
      .filter((x) => !!x.indsLclsCd && !!x.indsLclsNm),
    (x) => x.indsLclsCd
  );
};

/** 업종 중분류(upjongMedium) 목록을 조회합니다. */
export const fetchIndustryMediumClasses = async (
  serviceKey: string,
  indsLclsCd: string
): Promise<IndustryMediumItem[]> => {
  try {
    const q = new URLSearchParams();
    q.set("indsLclsCd", indsLclsCd);
    const json = await fetchSemasJsonWithKeyVariants<IndustryMediumItem>(
      "baroApi/api/store/upjong/medium",
      q,
      "sdsc2/upjongMedium",
      serviceKey
    );
    const body = extractSemasLikeBody<IndustryMediumItem>(json) ?? json.body;
    const rows = parseSemasItems(body);
    const parsed = rows
      .map((x) => ({
        indsLclsCd: (x.indsLclsCd ?? "").trim(),
        indsMclsCd: (x.indsMclsCd ?? "").trim(),
        indsMclsNm: (x.indsMclsNm ?? "").trim(),
      }))
      .filter((x) => !!x.indsLclsCd && !!x.indsMclsCd && !!x.indsMclsNm);
    if (parsed.length > 0) return parsed;
  } catch {
    // 공식 업종 API 미지원/오류 시 하단 fallback으로 대체
  }
  const fallbackRows = await fetchIndustryFallbackRows(serviceKey, { indsLclsCd });
  return dedupeByCode(
    fallbackRows
      .map((row) => ({
        indsLclsCd: (row.indsLclsCd ?? "").trim(),
        indsMclsCd: (row.indsMclsCd ?? "").trim(),
        indsMclsNm: (row.indsMclsNm ?? "").trim(),
      }))
      .filter((x) => !!x.indsLclsCd && !!x.indsMclsCd && !!x.indsMclsNm),
    (x) => `${x.indsLclsCd}:${x.indsMclsCd}`
  );
};

/** 업종 소분류(upjongSmall) 목록을 조회합니다. */
export const fetchIndustrySmallClasses = async (
  serviceKey: string,
  indsLclsCd: string,
  indsMclsCd: string
): Promise<IndustrySmallItem[]> => {
  try {
    const q = new URLSearchParams();
    q.set("indsLclsCd", indsLclsCd);
    q.set("indsMclsCd", indsMclsCd);
    const json = await fetchSemasJsonWithKeyVariants<IndustrySmallItem>(
      "baroApi/api/store/upjong/small",
      q,
      "sdsc2/upjongSmall",
      serviceKey
    );
    const body = extractSemasLikeBody<IndustrySmallItem>(json) ?? json.body;
    const rows = parseSemasItems(body);
    const parsed = rows
      .map((x) => ({
        indsLclsCd: (x.indsLclsCd ?? "").trim(),
        indsMclsCd: (x.indsMclsCd ?? "").trim(),
        indsSclsCd: (x.indsSclsCd ?? "").trim(),
        indsSclsNm: (x.indsSclsNm ?? "").trim(),
      }))
      .filter(
        (x) =>
          !!x.indsLclsCd && !!x.indsMclsCd && !!x.indsSclsCd && !!x.indsSclsNm
      );
    if (parsed.length > 0) return parsed;
  } catch {
    // 공식 업종 API 미지원/오류 시 하단 fallback으로 대체
  }
  const fallbackRows = await fetchIndustryFallbackRows(serviceKey, {
    indsLclsCd,
    indsMclsCd,
  });
  return dedupeByCode(
    fallbackRows
      .map((row) => ({
        indsLclsCd: (row.indsLclsCd ?? "").trim(),
        indsMclsCd: (row.indsMclsCd ?? "").trim(),
        indsSclsCd: (row.indsSclsCd ?? "").trim(),
        indsSclsNm: (row.indsSclsNm ?? "").trim(),
      }))
      .filter(
        (x) =>
          !!x.indsLclsCd && !!x.indsMclsCd && !!x.indsSclsCd && !!x.indsSclsNm
      ),
    (x) => `${x.indsLclsCd}:${x.indsMclsCd}:${x.indsSclsCd}`
  );
};

/** 업종 분류 fallback용 표본 상가 데이터를 조회합니다. */
const fetchIndustryFallbackRows = async (
  serviceKey: string,
  filters: { indsLclsCd?: string; indsMclsCd?: string }
) => {
  const { rows } = await fetchStoreListInDong(serviceKey, {
    divId: "signguCd",
    key: "27110",
    numOfRows: 1000,
    pageNo: 1,
    indsLclsCd: filters.indsLclsCd,
    indsMclsCd: filters.indsMclsCd,
  });
  return rows;
};

/** 코드 기준으로 업종 목록 중복을 제거합니다. */
const dedupeByCode = <T>(items: T[], getKey: (item: T) => string): T[] => {
  const byKey = new Map<string, T>();
  items.forEach((item) => {
    const key = getKey(item);
    if (!key || byKey.has(key)) return;
    byKey.set(key, item);
  });
  return Array.from(byKey.values());
};
