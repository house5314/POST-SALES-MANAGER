/** PoC·설문용 실적 KPI — 브라우저 localStorage(서버 DB 없음). */

const STORAGE_KEY = "post-poc-kpi-v1";

type PocKpiStore = {
  monthKey: string;
  proposalCount: number;
  systemQuoteCount: number;
  quoteErrorCount: number;
  safeModeCount: number;
  sessionStartedAt: number | null;
  proposalDurationsMinutes: number[];
};

const emptyStore = (monthKey: string): PocKpiStore => ({
  monthKey,
  proposalCount: 0,
  systemQuoteCount: 0,
  quoteErrorCount: 0,
  safeModeCount: 0,
  sessionStartedAt: null,
  proposalDurationsMinutes: [],
});

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const readStore = (): PocKpiStore => {
  if (typeof window === "undefined") {
    return emptyStore(currentMonthKey());
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore(currentMonthKey());
    const parsed = JSON.parse(raw) as Partial<PocKpiStore>;
    const monthKey = currentMonthKey();
    if (parsed.monthKey !== monthKey) {
      return emptyStore(monthKey);
    }
    return {
      monthKey,
      proposalCount: Math.max(0, Number(parsed.proposalCount) || 0),
      systemQuoteCount: Math.max(0, Number(parsed.systemQuoteCount) || 0),
      quoteErrorCount: Math.max(0, Number(parsed.quoteErrorCount) || 0),
      safeModeCount: Math.max(0, Number(parsed.safeModeCount) || 0),
      sessionStartedAt:
        typeof parsed.sessionStartedAt === "number"
          ? parsed.sessionStartedAt
          : null,
      proposalDurationsMinutes: Array.isArray(parsed.proposalDurationsMinutes)
        ? parsed.proposalDurationsMinutes.filter(
            (n) => typeof n === "number" && Number.isFinite(n) && n >= 0
          )
        : [],
    };
  } catch {
    return emptyStore(currentMonthKey());
  }
};

const writeStore = (store: PocKpiStore) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 저장 공간 부족 등 — PoC에서는 무시 */
  }
};

const mutate = (fn: (s: PocKpiStore) => PocKpiStore) => {
  const next = fn(readStore());
  writeStore(next);
  return next;
};

/** 대시보드 진입 시 세션 시작 시각을 기록합니다(월별 키 갱신 포함). */
export const startPocSession = () => {
  mutate((s) => ({
    ...s,
    sessionStartedAt: s.sessionStartedAt ?? Date.now(),
  }));
};

/** 시스템 우편 견적이 화면에 반영될 때마다 호출합니다. */
export const recordPocSystemQuote = () => {
  mutate((s) => ({
    ...s,
    systemQuoteCount: s.systemQuoteCount + 1,
  }));
};

/** 공공 API 장애로 안전 모드가 켜질 때 호출합니다. */
export const recordPocSafeMode = () => {
  mutate((s) => ({
    ...s,
    safeModeCount: s.safeModeCount + 1,
  }));
};

/** 수동·비정상 견적 입력 등 오류로 분류할 때만 증가(PoC 기본 0건 유지). */
export const recordPocQuoteError = () => {
  mutate((s) => ({
    ...s,
    quoteErrorCount: s.quoteErrorCount + 1,
  }));
};

/** 제안서(인쇄/PDF) 생성 버튼 성공 시 호출 — 발행 건수·세션 소요를 누적합니다. */
export const recordPocProposalIssued = () => {
  const now = Date.now();
  mutate((s) => {
    const started = s.sessionStartedAt ?? now;
    const minutes = Math.max(0, (now - started) / 60_000);
    return {
      ...s,
      sessionStartedAt: started,
      proposalCount: s.proposalCount + 1,
      proposalDurationsMinutes: [...s.proposalDurationsMinutes, minutes],
    };
  });
};

export type PocKpiSnapshot = {
  monthLabel: string;
  proposalCountThisMonth: number;
  avgSessionMinutes: number | null;
  currentSessionMinutes: number | null;
  systemQuoteCount: number;
  quoteErrorCount: number;
  safeModeCount: number;
};

/** KPI 패널 표시용 스냅샷을 반환합니다. */
export const getPocKpiSnapshot = (): PocKpiSnapshot => {
  const s = readStore();
  const durations = s.proposalDurationsMinutes;
  const avg =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;
  const current =
    s.sessionStartedAt != null
      ? Math.max(0, (Date.now() - s.sessionStartedAt) / 60_000)
      : null;
  const [y, m] = s.monthKey.split("-");
  return {
    monthLabel: y && m ? `${y}년 ${Number(m)}월` : s.monthKey,
    proposalCountThisMonth: s.proposalCount,
    avgSessionMinutes: avg,
    currentSessionMinutes: current,
    systemQuoteCount: s.systemQuoteCount,
    quoteErrorCount: s.quoteErrorCount,
    safeModeCount: s.safeModeCount,
  };
};
