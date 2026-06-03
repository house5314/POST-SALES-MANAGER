/**
 * 외부 LLM으로 보내기 전 사용자 입력에서 민감 패턴을 가려 누설 위험을 낮춥니다.
 * (완전한 개인정보 처리 대체가 아니라, 심사·운영용 최소 방어선입니다.)
 */

/** 이메일 주소를 치환합니다. */
const maskEmails = (s: string) =>
  s.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[이메일]"
  );

/** 한국식 휴대전화·지역번호 형태를 치환합니다. */
const maskKoreanPhones = (s: string) => {
  let t = s.replace(
    /\b(?:0(?:2|3[1-3]|4[1-4]|5[1-5]|6[1-4]))-?\d{3,4}-?\d{4}\b/g,
    "[전화]"
  );
  t = t.replace(/\b010-?\d{4}-?\d{4}\b/g, "[전화]");
  t = t.replace(/\b01[016789]-?\d{3,4}-?\d{4}\b/g, "[전화]");
  t = t.replace(/\b\d{2,3}-\d{3,4}-\d{4}\b/g, "[전화]");
  return t;
};

/** 주민등록번호·유사 13자리 숫자 패턴을 치환합니다. */
const maskResidentLike = (s: string) =>
  s.replace(/\b\d{6}[- ]?[1-4]\d{6}\b/g, "[주민번호형]");

/** 연속 긴 숫자열(카드 등)을 치환합니다. */
const maskLongDigitRuns = (s: string) =>
  s.replace(/\b\d{13,19}\b/g, "[긴숫자열]");

/** 사업자등록번호(XXX-XX-XXXXX)를 치환합니다. */
const maskBusinessRegNo = (s: string) =>
  s.replace(/\b\d{3}-\d{2}-\d{5}\b/g, "[사업자번호]");

/**
 * 모델 API에 넣기 직전 문자열을 정제합니다.
 * @param input 사용자 또는 내부에서 조합한 원문
 * @returns 마스킹된 문자열(길이는 대체로 유지될 수 있음)
 */
export const maskSensitiveTextForModel = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return "";
  let out = trimmed;
  out = maskEmails(out);
  out = maskKoreanPhones(out);
  out = maskResidentLike(out);
  out = maskBusinessRegNo(out);
  out = maskLongDigitRuns(out);
  return out;
};
