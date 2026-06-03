import { NextRequest, NextResponse } from "next/server";

import {
  addFeedbackEntry,
  getFeedbackSummary,
  type FeedbackRating,
} from "@/lib/operations/feedback-store";

const isRating = (v: unknown): v is FeedbackRating =>
  v === "up" || v === "down";

/** PoC 피드백 요약(썸업/다운 누적). */
export const GET = async () => {
  return NextResponse.json({
    ok: true as const,
    summary: getFeedbackSummary(),
  });
};

/** 직원 설문·데모 체험 후 유용/불편 피드백을 기록합니다. */
export const POST = async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false as const, message: "요청 본문을 읽을 수 없습니다." },
      { status: 400 }
    );
  }

  const rating =
    typeof body === "object" && body !== null && "rating" in body
      ? (body as { rating: unknown }).rating
      : undefined;
  if (!isRating(rating)) {
    return NextResponse.json(
      { ok: false as const, message: "rating은 up 또는 down 이어야 합니다." },
      { status: 400 }
    );
  }

  const comment =
    typeof body === "object" &&
    body !== null &&
    "comment" in body &&
    typeof (body as { comment: unknown }).comment === "string"
      ? (body as { comment: string }).comment.slice(0, 500)
      : undefined;

  const demoMode =
    typeof body === "object" &&
    body !== null &&
    "demoMode" in body &&
    (body as { demoMode: unknown }).demoMode === true;

  const contextRaw =
    typeof body === "object" && body !== null && "context" in body
      ? (body as { context: unknown }).context
      : undefined;
  const context =
    contextRaw === "ai_insight" || contextRaw === "session"
      ? contextRaw
      : undefined;

  const entry = addFeedbackEntry({ rating, comment, demoMode, context });
  return NextResponse.json({
    ok: true as const,
    id: entry.id,
    summary: getFeedbackSummary(),
  });
};
