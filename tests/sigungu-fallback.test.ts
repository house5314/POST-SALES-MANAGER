/** 시·군·구 추출·정적 폴백 유틸 단위 테스트. */
import { describe, expect, it } from "vitest";

import { extractSigunguNamesFromStanResults } from "@/lib/sales/fetch-sigungu-options";
import {
  SIGUNGU_STATIC_DATA,
  getStaticSigunguOptions,
} from "@/lib/sales/sigungu-static-data";

describe("extractSigunguNamesFromStanResults", () => {
  it("행정표준 라벨에서 시·군·구를 중복 없이 한글 정렬로 추출한다", () => {
    const results = [
      { code: "1", label: "서울특별시 강남구" },
      { code: "2", label: "서울특별시 강남구 역삼동" },
      { code: "3", label: "서울특별시 서초구" },
      { code: "4", label: "서울특별시 마포구" },
    ];
    expect(extractSigunguNamesFromStanResults(results, "서울특별시")).toEqual([
      "강남구",
      "마포구",
      "서초구",
    ]);
  });

  it("다른 시·도 라벨은 제외한다", () => {
    const results = [
      { code: "1", label: "서울특별시 강남구" },
      { code: "2", label: "부산광역시 해운대구" },
    ];
    expect(extractSigunguNamesFromStanResults(results, "서울특별시")).toEqual([
      "강남구",
    ]);
  });

  it("시·도 단독 라벨이나 빈 결과는 추출하지 않는다", () => {
    expect(
      extractSigunguNamesFromStanResults(
        [{ code: "1", label: "서울특별시" }],
        "서울특별시"
      )
    ).toEqual([]);
    expect(extractSigunguNamesFromStanResults([], "서울특별시")).toEqual([]);
  });
});

describe("getStaticSigunguOptions (API 실패 시 정적 폴백)", () => {
  it("서울특별시는 25개 자치구를 반환한다", () => {
    const options = getStaticSigunguOptions("서울특별시");
    expect(options).toHaveLength(25);
    expect(options[0]).toEqual({ value: "종로구", label: "종로구" });
    expect(options.map((o) => o.value)).toContain("강남구");
  });

  it("등록되지 않은 시·도는 빈 배열을 반환한다", () => {
    expect(getStaticSigunguOptions("없는시도")).toEqual([]);
    expect(getStaticSigunguOptions("")).toEqual([]);
  });

  it("모든 시·도의 정적 목록이 비어 있지 않다", () => {
    for (const [sido, list] of Object.entries(SIGUNGU_STATIC_DATA)) {
      expect(list.length, `${sido} 목록이 비어 있음`).toBeGreaterThan(0);
    }
  });
});
