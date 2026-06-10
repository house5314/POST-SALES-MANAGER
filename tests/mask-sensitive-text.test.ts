/** LLM 전송 전 민감정보 마스킹(`maskSensitiveTextForModel`) 단위 테스트. */
import { describe, expect, it } from "vitest";

import { maskSensitiveTextForModel } from "@/lib/ai/mask-sensitive-text";

describe("maskSensitiveTextForModel", () => {
  it("이메일 주소를 [이메일]로 치환한다", () => {
    expect(maskSensitiveTextForModel("문의는 hong.gd@post.go.kr 으로")).toBe(
      "문의는 [이메일] 으로"
    );
  });

  it("휴대전화 번호(하이픈 유무)를 [전화]로 치환한다", () => {
    expect(maskSensitiveTextForModel("연락처 010-1234-5678 입니다")).toBe(
      "연락처 [전화] 입니다"
    );
    expect(maskSensitiveTextForModel("연락처 01012345678 입니다")).toBe(
      "연락처 [전화] 입니다"
    );
  });

  it("지역번호 전화(02·031 등)를 [전화]로 치환한다", () => {
    expect(maskSensitiveTextForModel("대표번호 02-1588-1300")).toBe(
      "대표번호 [전화]"
    );
  });

  it("주민등록번호 형태를 [주민번호형]으로 치환한다", () => {
    expect(maskSensitiveTextForModel("주민번호 900101-1234567")).toBe(
      "주민번호 [주민번호형]"
    );
  });

  it("사업자등록번호를 [사업자번호]로 치환한다", () => {
    expect(maskSensitiveTextForModel("사업자 123-45-67890 매장")).toBe(
      "사업자 [사업자번호] 매장"
    );
  });

  it("카드번호 등 13자리 이상 숫자열을 [긴숫자열]로 치환한다", () => {
    expect(maskSensitiveTextForModel("카드 4111111111111111 결제")).toBe(
      "카드 [긴숫자열] 결제"
    );
  });

  it("민감 패턴이 없는 일반 텍스트는 그대로 유지한다", () => {
    expect(maskSensitiveTextForModel("강남구 음식점 상권 분석 요청")).toBe(
      "강남구 음식점 상권 분석 요청"
    );
  });

  it("빈 문자열·공백만 있으면 빈 문자열을 반환한다", () => {
    expect(maskSensitiveTextForModel("")).toBe("");
    expect(maskSensitiveTextForModel("   ")).toBe("");
  });
});
