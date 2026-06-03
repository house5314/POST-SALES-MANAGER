/** 행정동 3단계 필터(시·도 / 시·군·구 / 읍·면·동) 파싱·매칭 유틸. */

/** 시·도 UI에만 있고 실제 주소 문자열에는 없는 중분류(예: 세종특별자치시 → 세종시). */
export const SIGUNGU_PLACEHOLDER_BY_SIDO: Record<string, string> = {
  세종특별자치시: "세종시",
};

/** 읍·면·동(법정동) 접미사 여부. */
export const isEupMyeonDongName = (name: string): boolean =>
  /(읍|면|동|리)$/.test(name.trim());

/** 시·군·구 단위 접미사(특별시·광역시·자치시·도 명칭 제외). */
export const isSigunguLevelName = (name: string): boolean => {
  const t = name.trim();
  if (!t) return false;
  if (/(특별시|광역시|특별자치시|특별자치도)$/.test(t)) return false;
  return /(시|군|구)$/.test(t);
};

/** UI 중분류가 주소에 없는 placeholder인지 판별합니다. */
export const isPlaceholderSigungu = (sido: string, sigungu: string): boolean =>
  SIGUNGU_PLACEHOLDER_BY_SIDO[sido] === sigungu;

/** 행정표준 검색 API용 검색어(세종 등은 시·도만). */
export const buildRegionSearchQuery = (sido: string, sigungu: string): string =>
  isPlaceholderSigungu(sido, sigungu) ? sido : `${sido} ${sigungu}`.trim();

/**
 * 행정표준 `locatadd_nm` 라벨을 시·도 / 시·군·구 / 동으로 분해합니다.
 * 세종 등 2단(시·도 + 동) 주소는 두 번째 토큰을 동으로 처리합니다.
 */
export const parseRegionLabel = (
  label: string,
  ctx?: { sido?: string; sigungu?: string }
): { sido: string; sigungu: string; dong: string } => {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  const sido = parts[0] ?? "기타";

  if (parts.length >= 3) {
    return {
      sido,
      sigungu: parts[1] ?? "기타",
      dong: parts.slice(2).join(" "),
    };
  }

  if (parts.length === 2) {
    const second = parts[1] ?? "";
    if (isEupMyeonDongName(second)) {
      return {
        sido,
        sigungu: ctx?.sigungu ?? SIGUNGU_PLACEHOLDER_BY_SIDO[sido] ?? second,
        dong: second,
      };
    }
    if (isSigunguLevelName(second)) {
      return { sido, sigungu: second, dong: "" };
    }
    return { sido, sigungu: second, dong: "" };
  }

  return {
    sido,
    sigungu: ctx?.sigungu ?? "기타",
    dong: parts.length === 1 ? "" : label.trim(),
  };
};

/** 선택한 시·도·시군구와 API 라벨이 일치하는지(세종은 시·도만 일치해도 통과). */
export const regionLabelMatchesSelection = (
  label: string,
  sido: string,
  sigungu: string
): boolean => {
  if (!label.includes(sido)) return false;
  if (isPlaceholderSigungu(sido, sigungu)) return true;
  return label.includes(sigungu);
};

/** 지도·지오코딩용 선택 주소(세종은 `세종시`를 주소에 넣지 않음). */
export const formatSelectedDongAddress = (
  sido: string,
  sigungu: string,
  dongLabel: string
): string | null => {
  if (!sido || !dongLabel) return null;
  if (isPlaceholderSigungu(sido, sigungu)) {
    return `${sido} ${dongLabel}`;
  }
  if (!sigungu) return null;
  return `${sido} ${sigungu} ${dongLabel}`;
};
