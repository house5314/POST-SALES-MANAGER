/** 하버사인 거리 계산(아파트 배후수요 반경 필터) 단위 테스트. */
import { describe, expect, it } from "vitest";

import { haversineDistanceM } from "@/lib/molit/haversine";

describe("haversineDistanceM", () => {
  it("동일 좌표는 0m 를 반환한다", () => {
    expect(haversineDistanceM(37.5665, 126.978, 37.5665, 126.978)).toBe(0);
  });

  it("서울시청–강남역 거리를 약 8.4km 로 계산한다 (±0.5km)", () => {
    const d = haversineDistanceM(37.5665, 126.978, 37.4979, 127.0276);
    expect(d).toBeGreaterThan(7_900);
    expect(d).toBeLessThan(8_900);
  });

  it("인자 순서를 바꿔도 거리는 동일하다(대칭성)", () => {
    const a = haversineDistanceM(37.5665, 126.978, 35.1796, 129.0756);
    const b = haversineDistanceM(35.1796, 129.0756, 37.5665, 126.978);
    expect(a).toBeCloseTo(b, 6);
  });

  it("위도 0.01도(약 1.11km) 차이를 1km 안팎으로 계산한다", () => {
    const d = haversineDistanceM(37.5, 127.0, 37.51, 127.0);
    expect(d).toBeGreaterThan(1_050);
    expect(d).toBeLessThan(1_180);
  });
});
