/**
 * 서버 인메모리 TTL+LRU 캐시 — 공공 API 프록시 응답 재사용으로 쿼터·지연을 절감합니다.
 * Redis 와 호환되는 비동기 인터페이스(`CacheStore`)로 설계해, 상용 단계에서는
 * 구현체만 Redis 클라이언트로 교체하면 라우트 코드 변경이 없습니다(설계서 §8.7).
 */

export type CacheStore = {
  /** 키 조회 — 만료되었으면 undefined. */
  get: <T>(key: string) => Promise<T | undefined>;
  /** 키 저장 — ttlMs(밀리초) 후 만료. */
  set: <T>(key: string, value: T, ttlMs: number) => Promise<void>;
  /** 키 삭제. */
  delete: (key: string) => Promise<void>;
};

type Entry = { value: unknown; expiresAt: number };

/** Map 삽입 순서를 LRU 순서로 활용하는 인메모리 구현체. */
const createInMemoryTtlLruCache = (maxEntries: number): CacheStore => {
  const store = new Map<string, Entry>();

  const evictIfNeeded = () => {
    while (store.size > maxEntries) {
      const oldest = store.keys().next().value;
      if (oldest === undefined) break;
      store.delete(oldest);
    }
  };

  return {
    get: async <T>(key: string): Promise<T | undefined> => {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() >= entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      // LRU 갱신: 재삽입으로 가장 최근 사용으로 이동
      store.delete(key);
      store.set(key, entry);
      return entry.value as T;
    },
    set: async <T>(key: string, value: T, ttlMs: number): Promise<void> => {
      if (ttlMs <= 0) return;
      store.delete(key);
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      evictIfNeeded();
    },
    delete: async (key: string): Promise<void> => {
      store.delete(key);
    },
  };
};

const MAX_ENTRIES = 200;

/** dev HMR·라우트 모듈 재평가에도 캐시가 유지되도록 globalThis 에 싱글턴 보관. */
const globalCache = globalThis as unknown as { __serverCache?: CacheStore };

/** 서버 전역 캐시 인스턴스(상용: Redis 구현체로 교체 지점). */
export const serverCache: CacheStore =
  globalCache.__serverCache ?? (globalCache.__serverCache = createInMemoryTtlLruCache(MAX_ENTRIES));

/**
 * 캐시에 있으면 즉시 반환, 없으면 loader 실행 후 저장합니다.
 * @param key 캐시 키
 * @param ttlMs 만료(밀리초)
 * @param loader 캐시 미스 시 실행할 비동기 로더
 * @returns 값과 캐시 적중 여부
 */
export const getOrSetCached = async <T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<{ value: T; hit: boolean }> => {
  const cached = await serverCache.get<T>(key);
  if (cached !== undefined) return { value: cached, hit: true };
  const value = await loader();
  await serverCache.set(key, value, ttlMs);
  return { value, hit: false };
};

/** 테스트용 — 항목 수 한도가 다른 독립 캐시를 만듭니다. */
export const createCacheStoreForTest = (maxEntries: number): CacheStore =>
  createInMemoryTtlLruCache(maxEntries);
