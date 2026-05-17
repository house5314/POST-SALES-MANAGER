/**
 * 운영·데이터 신선도·API 쿼터에 대한 짧은 고지(푸터·심사용).
 * 상세는 docs/operations-data-quota.md 를 참고합니다.
 */

/** 대시보드 하단 등에 표시하는 한 줄 요약. */
export const DATA_GOVERNANCE_FOOTER =
  "공공·지도·AI API는 **조회 시점** 응답이며, 원천 갱신·일일 호출 한도는 각 포털·키 계약을 따릅니다. PoC 운영 주체는 도입 기관이 확정 시 명시합니다.";

/** README·내부 문서에서 인용 가능한 운영 주체 문장. */
export const OPERATING_ENTITY_POC_LINE =
  "현재 저장소는 우정사업본부 AI 과제 PoC로, 상용 운영 주체·SLA·민원 창구는 도입 우정청(또는 본부 지정 부서)이 확정합니다.";

/** 데이터 갱신(원천 vs 화면) 구분 문장. */
export const DATA_REFRESH_SCOPE_LINE =
  "화면의 상가·단지·상권 수치는 API **조회 시점** 스냅샷이며, 소진공·국토부 원천 DB의 갱신 주기는 각 기관 공지를 따릅니다.";

/** API 쿼터 안내 한 줄(수치는 계약·포털이 우선). */
export const API_QUOTA_POLICY_LINE =
  "apis.data.go.kr·NCP·Google 등 호출 한도는 **발급 계약·포털 안내**가 우선이며, PoC는 필터 변경 등 사용자 조회 위주로 설계되었습니다.";
