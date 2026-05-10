import { extractSemasLikeBody } from "@/lib/commercial-api/extract-response-body";
import { parseSemasItems } from "@/lib/commercial-api/parse-semas-items";
import type { SemasBody } from "@/lib/commercial-api/semas-types";
import {
  buildUrlWithExplicitTypeJson,
  parsePublicDataFetchAsJson,
} from "@/lib/commercial-api/public-data-response";
import { haversineDistanceM } from "@/lib/molit/haversine";
import { normalizeMolitAptItem } from "@/lib/molit/normalize-apt-item";
import type { MolitAptComplex } from "@/lib/molit/types";

const APT_ENDPOINT_CANDIDATES = [
  "https://apis.data.go.kr/1613000/AptListService3/getLegaldongAptList3",
  "https://apis.data.go.kr/1613000/AptListService3_0.1/getLegaldongAptList3",
] as const;

const getServiceKeyCandidates = (serviceKey: string): string[] => {
  let decoded = serviceKey;
  try {
    decoded = decodeURIComponent(serviceKey);
  } catch {
    decoded = serviceKey;
  }
  return decoded !== serviceKey ? [serviceKey, decoded] : [serviceKey];
};

/** 공공데이터포털 AptListService 응답에서 헤더 결과코드를 확인합니다. */
const isOkHeader = (json: Record<string, unknown>): boolean => {
  const resp = json.response as Record<string, unknown> | undefined;
  const directHeader = json.header as Record<string, unknown> | undefined;
  const nestedHeader = resp?.header as Record<string, unknown> | undefined;
  const h = nestedHeader ?? directHeader;
  const code =
    (typeof h?.resultCode === "string" ? h.resultCode : undefined) ??
    (typeof h?.resultcode === "string" ? h.resultcode : undefined);
  if (!code) return true;
  return code === "00";
};

type FetchPageArgs = {
  serviceKey: string;
  bjdongCd: string;
  pageNo: number;
  numOfRows: number;
  endpoint: string;
  dongParam: string;
};

/** 단일 페이지를 호출해 원본 item 레코드 목록을 가져옵니다. */
const fetchOnePageRaw = async ({
  serviceKey,
  bjdongCd,
  pageNo,
  numOfRows,
  endpoint,
  dongParam,
}: FetchPageArgs): Promise<{ items: Record<string, unknown>[]; total: number }> => {
  let lastErr: Error | null = null;
  for (const keyCandidate of getServiceKeyCandidates(serviceKey)) {
    try {
      const q = new URLSearchParams();
      q.set("serviceKey", keyCandidate);
      q.set("pageNo", String(pageNo));
      q.set("numOfRows", String(numOfRows));
      q.set(dongParam, bjdongCd);
      const url = buildUrlWithExplicitTypeJson(endpoint, q);
      const res = await fetch(url, { next: { revalidate: 0 } });
      const json = await parsePublicDataFetchAsJson(
        res,
        `molit/getLegaldongAptList3(p${pageNo})`
      );
      if (!isOkHeader(json)) {
        const header = (json.response as Record<string, unknown> | undefined)?.header;
        throw new Error(
          `국토부 단지 API 결과코드 오류: ${JSON.stringify(header ?? "")}`
        );
      }
      const body =
        extractSemasLikeBody<Record<string, unknown>>(json) ??
        (json.body as SemasBody<Record<string, unknown>> | undefined);
      const rows = parseSemasItems(body);
      const rawTotal = body?.totalCount;
      const parsedTotal =
        typeof rawTotal === "number" && Number.isFinite(rawTotal)
          ? rawTotal
          : Number(rawTotal);
      const total = Number.isFinite(parsedTotal)
        ? Math.max(rows.length, parsedTotal)
        : rows.length;
      return { items: rows as Record<string, unknown>[], total };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error("국토부 단지 API 호출 실패");
    }
  }
  throw lastErr ?? new Error("국토부 단지 API 호출 실패");
};

type FetchAllArgs = {
  serviceKey: string;
  bjdongCd: string;
  /** 상가 기준 좌표(반경 필터). 없으면 좌표 필터를 건너뜁니다. */
  centerLat?: number | null;
  centerLng?: number | null;
  radiusM?: number;
};

/** 법정동 단지 목록을 페이징으로 모두 가져와 거리 필터·정규화까지 수행합니다. */
export const fetchLegaldongApartments = async ({
  serviceKey,
  bjdongCd,
  centerLat,
  centerLng,
  radiusM = 1000,
}: FetchAllArgs): Promise<MolitAptComplex[]> => {
  const dongParams = ["bjdongCd", "bjdong_cd"] as const;
  const numOfRows = 100;
  const maxPages = 40;

  let collected: Record<string, unknown>[] = [];
  let endpointUsed: string = APT_ENDPOINT_CANDIDATES[0];
  let dongParamUsed: string = dongParams[0];
  let lastFailure: Error | null = null;

  outer: for (const endpoint of APT_ENDPOINT_CANDIDATES) {
    for (const dongParam of dongParams) {
      try {
        const first = await fetchOnePageRaw({
          serviceKey,
          bjdongCd,
          pageNo: 1,
          numOfRows,
          endpoint,
          dongParam,
        });
        lastFailure = null;
        collected = [...first.items];
        endpointUsed = endpoint;
        dongParamUsed = dongParam;

        const total = Math.max(first.total, collected.length);
        const pagesNeeded = Math.min(
          maxPages,
          Math.max(1, Math.ceil(total / numOfRows))
        );
        for (let p = 2; p <= pagesNeeded; p++) {
          const next = await fetchOnePageRaw({
            serviceKey,
            bjdongCd,
            pageNo: p,
            numOfRows,
            endpoint,
            dongParam,
          });
          collected.push(...next.items);
        }
        break outer;
      } catch (e) {
        lastFailure = e instanceof Error ? e : new Error(String(e));
      }
    }
  }

  if (!collected.length && lastFailure) {
    throw lastFailure;
  }

  const normalized = collected.map((raw, idx) =>
    normalizeMolitAptItem(raw as Record<string, unknown>, idx)
  );

  const dedup = new Map<string, MolitAptComplex>();
  normalized.forEach((row) => {
    if (!dedup.has(row.id)) dedup.set(row.id, row);
  });
  let uniq = [...dedup.values()];

  const hasCenter =
    centerLat != null &&
    centerLng != null &&
    Number.isFinite(centerLat) &&
    Number.isFinite(centerLng);

  if (hasCenter) {
    uniq = uniq
      .map((row) => {
        if (row.lat != null && row.lng != null) {
          const d = haversineDistanceM(
            centerLat as number,
            centerLng as number,
            row.lat,
            row.lng
          );
          return { ...row, distanceM: d };
        }
        return { ...row, distanceM: null };
      })
      .filter((row) => {
        if (row.distanceM == null) return false;
        return row.distanceM <= radiusM;
      });
  } else {
    uniq = uniq.map((row) => ({ ...row, distanceM: null }));
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[molit/apt] endpoint=${endpointUsed} dongParam=${dongParamUsed} rows=${uniq.length}`
    );
  }

  return uniq.sort((a, b) => {
    const da = a.distanceM ?? Number.POSITIVE_INFINITY;
    const db = b.distanceM ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
};
