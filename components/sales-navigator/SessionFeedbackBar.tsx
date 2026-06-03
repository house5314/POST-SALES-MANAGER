"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { fetchPublicApiJson } from "@/lib/api/public-api-fetch";

type SessionFeedbackBarProps = {
  demoMode?: boolean;
  onSubmitted?: () => void;
};

type FeedbackSummary = { up: number; down: number; total: number };

/** 데모·설문용 썸업/다운 피드백을 서버에 기록합니다. */
export const SessionFeedbackBar = ({
  demoMode = false,
  onSubmitted,
}: SessionFeedbackBarProps) => {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);

  const submit = useCallback(
    async (rating: "up" | "down") => {
      if (pending) return;
      setPending(true);
      setMessage(null);
      try {
        const result = await fetchPublicApiJson<{
          ok: boolean;
          summary?: FeedbackSummary;
          message?: string;
        }>(
          "/api/feedback",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating, demoMode }),
          },
          { cacheOnSuccess: false }
        );
        const data = result.data;
        if (!result.ok || !data?.ok) {
          setMessage(data?.message ?? "피드백을 저장하지 못했습니다.");
          return;
        }
        if (data.summary) setSummary(data.summary);
        setMessage(
          rating === "up"
            ? "감사합니다. 유용하다는 의견을 기록했습니다."
            : "불편하셨다는 의견을 기록했습니다. 개선에 반영하겠습니다."
        );
        onSubmitted?.();
      } catch {
        setMessage("네트워크 오류로 피드백을 보내지 못했습니다.");
      } finally {
        setPending(false);
      }
    },
    [demoMode, onSubmitted, pending]
  );

  return (
    <div
      role="region"
      aria-label="체험 피드백"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-2.5 lg:px-8"
    >
      <p className="text-xs text-muted-foreground">
        이번 화면 체험이{" "}
        <span className="font-medium text-foreground">도움이 되었나요?</span>
        {demoMode ? (
          <span className="ml-1 text-[10px]">(데모 모드)</span>
        ) : null}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={pending}
          onClick={() => void submit("up")}
        >
          <ThumbsUp className="size-3.5" aria-hidden />
          유용함
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={pending}
          onClick={() => void submit("down")}
        >
          <ThumbsDown className="size-3.5" aria-hidden />
          불편함
        </Button>
        {summary && summary.total > 0 ? (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            누적 👍 {summary.up} · 👎 {summary.down}
          </span>
        ) : null}
      </div>
      {message ? (
        <p className="w-full text-[11px] text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
};
