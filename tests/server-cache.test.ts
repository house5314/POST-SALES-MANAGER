/** 서버 인메모리 TTL+LRU 캐시(`server-cache`) 단위 테스트. */
import { describe, expect, it, vi } from "vitest";

import {
  createCacheStoreForTest,
  getOrSetCached,
  serverCache,
} from "@/lib/api/server-cache";

describe("CacheStore (TTL)", () => {
  it("TTL 이내에는 저장한 값을 돌려주고, 만료 후에는 undefined 를 반환한다", async () => {
    vi.useFakeTimers();
    try {
      const cache = createCacheStoreForTest(10);
      await cache.set("k", { rows: [1, 2] }, 1000);
      expect(await cache.get("k")).toEqual({ rows: [1, 2] });

      vi.advanceTimersByTime(1001);
      expect(await cache.get("k")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("ttl 0 이하이면 저장하지 않는다", async () => {
    const cache = createCacheStoreForTest(10);
    await cache.set("k", "v", 0);
    expect(await cache.get("k")).toBeUndefined();
  });

  it("delete 로 키를 즉시 제거한다", async () => {
    const cache = createCacheStoreForTest(10);
    await cache.set("k", "v", 60_000);
    await cache.delete("k");
    expect(await cache.get("k")).toBeUndefined();
  });
});

describe("CacheStore (LRU)", () => {
  it("한도 초과 시 가장 오래 사용하지 않은 키부터 제거한다", async () => {
    const cache = createCacheStoreForTest(2);
    await cache.set("a", 1, 60_000);
    await cache.set("b", 2, 60_000);
    // a 를 최근 사용으로 갱신 → 한도 초과 시 b 가 제거 대상
    await cache.get("a");
    await cache.set("c", 3, 60_000);

    expect(await cache.get("a")).toBe(1);
    expect(await cache.get("b")).toBeUndefined();
    expect(await cache.get("c")).toBe(3);
  });
});

describe("getOrSetCached", () => {
  it("미스 시 loader 를 1회 실행하고, 두 번째 호출은 캐시 적중한다", async () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    const loader = vi.fn(async () => ({ total: 42 }));

    const first = await getOrSetCached(key, 60_000, loader);
    const second = await getOrSetCached(key, 60_000, loader);

    expect(first).toEqual({ value: { total: 42 }, hit: false });
    expect(second).toEqual({ value: { total: 42 }, hit: true });
    expect(loader).toHaveBeenCalledTimes(1);

    await serverCache.delete(key);
  });

  it("loader 실패 시 캐시에 저장하지 않고 오류를 전파한다", async () => {
    const key = `test-fail:${Date.now()}`;
    const loader = vi.fn(async () => {
      throw new Error("upstream 오류");
    });

    await expect(getOrSetCached(key, 60_000, loader)).rejects.toThrow(
      "upstream 오류"
    );
    expect(await serverCache.get(key)).toBeUndefined();
  });
});
