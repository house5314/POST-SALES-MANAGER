/** 국토부 단지·통계 연동용 공통 타입입니다. */

export type MolitAptComplex = {
  /** 단지 식별용 안정 키(kaptCode 우선). */
  id: string;
  /** 단지명. */
  name: string;
  /** 세대수(미제공 시 0). */
  households: number;
  lat: number | null;
  lng: number | null;
  /** 상가 기준 거리(m), 좌표 없으면 null. */
  distanceM: number | null;
};
