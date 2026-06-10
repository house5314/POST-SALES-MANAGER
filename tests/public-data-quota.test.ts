/** 공공데이터 일일 한도(쿼터) 판별 유틸 단위 테스트. */
import { describe, expect, it } from "vitest";

import {
  PUBLIC_API_QUOTA_USER_MESSAGE,
  detectPublicApiQuotaExceeded,
  isHttpQuotaStatus,
} from "@/lib/api/public-data-quota";

describe("isHttpQuotaStatus", () => {
  it("429만 쿼터 상태로 판별한다", () => {
    expect(isHttpQuotaStatus(429)).toBe(true);
    expect(isHttpQuotaStatus(200)).toBe(false);
    expect(isHttpQuotaStatus(500)).toBe(false);
    expect(isHttpQuotaStatus(403)).toBe(false);
  });
});

describe("detectPublicApiQuotaExceeded", () => {
  it("resultCode 22(공공데이터 한도 초과)를 탐지한다", () => {
    const payload = {
      response: { header: { resultCode: "22", resultMsg: "한도초과" } },
    };
    expect(detectPublicApiQuotaExceeded(payload)).toBe(
      PUBLIC_API_QUOTA_USER_MESSAGE
    );
  });

  it("INFO-22 문자열 패턴을 탐지한다", () => {
    expect(
      detectPublicApiQuotaExceeded("LIMITED_NUMBER_OF_SERVICE_REQUESTS INFO-22")
    ).toBe(PUBLIC_API_QUOTA_USER_MESSAGE);
  });

  it("'일일 트래픽 한도' 한글 안내문을 탐지한다", () => {
    expect(detectPublicApiQuotaExceeded("일일 트래픽 한도를 초과했습니다")).toBe(
      PUBLIC_API_QUOTA_USER_MESSAGE
    );
  });

  it("Too Many Requests 영문 패턴을 탐지한다", () => {
    expect(detectPublicApiQuotaExceeded("429 Too Many Requests")).toBe(
      PUBLIC_API_QUOTA_USER_MESSAGE
    );
  });

  it("정상 응답·일반 오류는 쿼터로 오탐하지 않는다", () => {
    expect(
      detectPublicApiQuotaExceeded({
        response: { header: { resultCode: "00", resultMsg: "NORMAL SERVICE" } },
      })
    ).toBeNull();
    expect(detectPublicApiQuotaExceeded("Internal Server Error")).toBeNull();
    expect(detectPublicApiQuotaExceeded(null)).toBeNull();
    expect(detectPublicApiQuotaExceeded(undefined)).toBeNull();
  });
});
