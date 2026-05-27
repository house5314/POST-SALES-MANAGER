/**
 * 공공 API 프록시 호출용 타임아웃·메모리 캐시(SWR/React Query와 동급의 클라이언트 캐시).
 * 장애·지연 시 직전 성공 응답을 재사용하고, 불가 시 상위 UI가 안전 모드로 전환합니다.
 */

/** 기본 요청 타임아웃(ms). */
export const PUBLIC_API_FETCH_TIMEOUT_MS = 3000;

/** 메모리 캐시 TTL(ms) — 동일 URL·메서드·본문 키. */
export const PUBLIC_API_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  data: unknown;
  storedAt: number;
};

const memoryCache = new Map<string, CacheEntry>();

/** 요청 식별 키를 만듭니다. */
const buildCacheKey = (input: RequestInfo | URL, init?: RequestInit): string => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  const body =
    typeof init?.body === "string"
      ? init.body
      : init?.body == null
        ? ""
        : "[body]";
  return `${method}:${url}:${body}`;
};

const readFreshCache = <T>(key: string): T | null => {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.storedAt > PUBLIC_API_CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return hit.data as T;
};

export type PublicApiFetchResult<T> = {
  data: T | null;
  ok: boolean;
  fromCache: boolean;
  timedOut: boolean;
  networkError: boolean;
  message?: string;
};

type FetchPublicApiOptions = {
  timeoutMs?: number;
  /** false면 성공 응답을 캐시에 넣지 않습니다. */
  cacheOnSuccess?: boolean;
};

/**
 * 타임아웃·메모리 캐시가 적용된 JSON fetch.
 * Abort(타임아웃)·네트워크 오류 시 TTL 내 캐시가 있으면 `fromCache: true`로 반환합니다.
 */
export const fetchPublicApiJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: FetchPublicApiOptions
): Promise<PublicApiFetchResult<T>> => {
  const key = buildCacheKey(input, init);
  const timeoutMs = options?.timeoutMs ?? PUBLIC_API_FETCH_TIMEOUT_MS;
  const cacheOnSuccess = options?.cacheOnSuccess !== false;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);

    let data: T;
    try {
      data = (await res.json()) as T;
    } catch {
      const stale = readFreshCache<T>(key);
      if (stale) {
        return {
          data: stale,
          ok: true,
          fromCache: true,
          timedOut: false,
          networkError: true,
          message: "응답을 해석하지 못해 이전 조회 결과를 표시합니다.",
        };
      }
      return {
        data: null,
        ok: false,
        fromCache: false,
        timedOut: false,
        networkError: true,
        message: "공공 API 응답 형식 오류",
      };
    }

    if (cacheOnSuccess && res.ok) {
      memoryCache.set(key, { data, storedAt: Date.now() });
    }

    return {
      data,
      ok: res.ok,
      fromCache: false,
      timedOut: false,
      networkError: false,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    window.clearTimeout(timeoutId);
    const timedOut = e instanceof Error && e.name === "AbortError";
    const stale = readFreshCache<T>(key);
    if (stale) {
      return {
        data: stale,
        ok: true,
        fromCache: true,
        timedOut,
        networkError: !timedOut,
        message: timedOut
          ? `${timeoutMs / 1000}초 이내 응답이 없어 이전 조회 결과를 표시합니다.`
          : "네트워크 오류로 이전 조회 결과를 표시합니다.",
      };
    }
    return {
      data: null,
      ok: false,
      fromCache: false,
      timedOut,
      networkError: !timedOut,
      message: timedOut
        ? `공공 API 응답 지연(약 ${timeoutMs / 1000}초 초과)`
        : e instanceof Error
          ? e.message
          : "공공 API 호출 실패",
    };
  }
};

/** 테스트·로그아웃 시 캐시를 비웁니다. */
export const clearPublicApiMemoryCache = () => {
  memoryCache.clear();
};
