/** PoC·설문용 인앱 피드백 — 서버 인메모리(재시작 시 초기화). */

export type FeedbackRating = "up" | "down";

export type FeedbackContext = "session" | "ai_insight";

export type FeedbackEntry = {
  id: string;
  rating: FeedbackRating;
  comment?: string;
  createdAt: string;
  demoMode?: boolean;
  context?: FeedbackContext;
};

const entries: FeedbackEntry[] = [];
const MAX_ENTRIES = 500;

let idSeq = 0;

const nextId = () => {
  idSeq += 1;
  return `fb-${Date.now()}-${idSeq}`;
};

/** 피드백 한 건을 저장합니다. */
export const addFeedbackEntry = (input: {
  rating: FeedbackRating;
  comment?: string;
  demoMode?: boolean;
  context?: FeedbackContext;
}): FeedbackEntry => {
  const entry: FeedbackEntry = {
    id: nextId(),
    rating: input.rating,
    comment: input.comment?.trim() || undefined,
    createdAt: new Date().toISOString(),
    demoMode: input.demoMode,
    context: input.context,
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  return entry;
};

export type FeedbackSummary = {
  up: number;
  down: number;
  total: number;
};

/** 누적 썸업/다운 요약을 반환합니다. */
export const getFeedbackSummary = (): FeedbackSummary => {
  let up = 0;
  let down = 0;
  for (const e of entries) {
    if (e.rating === "up") up += 1;
    else down += 1;
  }
  return { up, down, total: up + down };
};
