/** 업종·지역코드 기반으로 이사·입주 관련 영업 트리거 문구를 생성합니다(국토부 통계 연동 전 보조 규칙). */

const INTERIOR_KEYWORDS =
  /가구|인테리어|청소|통신|침대|소파|조명|리모델/i;

/** 문자열 시드를 숫자 해시로 바꿉니다. */
const hashSeed = (s: string): number =>
  Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

export type MoveInScriptResult = {
  surge: boolean;
  headline: string;
  detail: string;
};

/**
 * @param category 업종 텍스트
 * @param regionCode 행정·법정 코드 등 식별자
 */
export const evaluateMoveInPitch = (
  category: string,
  regionCode: string
): MoveInScriptResult => {
  const relevant = INTERIOR_KEYWORDS.test(category);
  const seed = hashSeed(`${category}:${regionCode}`);
  const surge = relevant && seed % 3 !== 0;

  if (!relevant) {
    return {
      surge: false,
      headline: "",
      detail:
        "실제 거래·입주 통계는 아직 연동 전입니다. 해당 업종(가구·인테리어·청소·통신 등)은 스크립트 트리거 후보입니다.",
    };
  }

  if (!surge) {
    return {
      surge: false,
      headline: "",
      detail:
        "이번에는 규칙 기반 시뮬레이션에서 보수적인 시나리오로 두었습니다. 실제 급증 여부는 국토부 통계 API 연동 후 반영하게 됩니다.",
    };
  }

  return {
    surge: true,
    headline:
      "[시뮬레이션] 최근 이사·입주 수요 급증 시나리오 (홍보 타이밍 예시)",
    detail:
      "업종 패턴 규칙으로 생성된 멘트이며 통계값이 아닙니다. 생활정보홍보우편은 동일 생활권 세대 타겟에 유리함을 근거로 제안합니다.",
  };
};
