import type { BusinessRow } from "@/lib/sales/types";

/**
 * 국토부 법정동 단지 API(bjdongCd)에 사용할 10자리 법정동코드를 반환합니다.
 * 공공 상가 행은 행정동만 있을 때 regionCode를 쓰지 않아 오조회를 막습니다.
 */
export const resolveLegalDongForMolit = (b: BusinessRow): string => {
  const fromLdong = b.ldongCd?.trim() ?? "";
  if (/^\d{10}$/.test(fromLdong)) return fromLdong;
  if (b.dataSource === "commercial_public") return "";
  const rc = b.regionCode?.trim() ?? "";
  if (/^\d{10}$/.test(rc)) return rc;
  return "";
};
