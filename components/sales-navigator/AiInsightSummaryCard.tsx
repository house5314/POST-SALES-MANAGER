"use client";

import { Loader2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildInsightSummaryPrompt } from "@/lib/ai/build-insight-summary-prompt";
import { fetchPublicApiJson } from "@/lib/api/public-api-fetch";
import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

type AiInsightSummaryCardProps = {
  business: BusinessRow;
  market: MarketStatRow | undefined;
  effectiveMailQty: number;
  yearsInBusiness?: number;
  isPriority: boolean;
  regionLabel: string;
};

/** 상권·업체 데이터를 자동 주입해 AI 영업 포인트 요약을 생성합니다. */
export const AiInsightSummaryCard = ({
  business,
  market,
  effectiveMailQty,
  yearsInBusiness,
  isPriority,
  regionLabel,
}: AiInsightSummaryCardProps) => {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const runSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFeedbackMsg(null);
    const prompt = buildInsightSummaryPrompt({
      businessName: business.name,
      category: business.category,
      revenueTrend: business.revenueTrend,
      regionLabel,
      effectiveMailQty,
      yearsInBusiness,
      isPriority,
      housingCount: market?.housingCount,
      dongHouseholds: market?.dongHouseholds,
    });
    try {
      const result = await fetchPublicApiJson<{
        ok: boolean;
        text?: string;
        message?: string;
        code?: string;
        meta?: { modelId?: string };
      }>(
        "/api/ai/assist",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        },
        { cacheOnSuccess: false }
      );
      const data = result.data;
      if (!result.ok || !data?.ok || !data.text?.trim()) {
        setText(null);
        setError(
          data?.message ??
            (data?.code === "AI_DISABLED"
              ? "AI 보조가 비활성화되어 있습니다. 서버에 API 키를 설정해 주세요."
              : "AI 요약을 생성하지 못했습니다.")
        );
        return;
      }
      setText(data.text.trim());
      setModelLabel(data.meta?.modelId ?? null);
    } catch {
      setText(null);
      setError("네트워크 오류로 AI 요약을 요청하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [
    business,
    effectiveMailQty,
    isPriority,
    market,
    regionLabel,
    yearsInBusiness,
  ]);

  const submitAiFeedback = useCallback(
    async (rating: "up" | "down") => {
      if (feedbackPending) return;
      setFeedbackPending(true);
      try {
        await fetchPublicApiJson(
          "/api/feedback",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rating,
              context: "ai_insight",
              comment: text?.slice(0, 200),
            }),
          },
          { cacheOnSuccess: false }
        );
        setFeedbackMsg(
          rating === "up"
            ? "AI 요약에 대한 피드백을 저장했습니다."
            : "부정 피드백을 저장했습니다. 개선에 반영하겠습니다."
        );
      } catch {
        setFeedbackMsg("피드백을 저장하지 못했습니다.");
      } finally {
        setFeedbackPending(false);
      }
    },
    [feedbackPending, text]
  );

  return (
    <Card className="shrink-0 border-dashed border-brand-primary/25 font-sans text-sm shadow-sm">
      <CardHeader className="space-y-1 px-4 pb-2 pt-3 sm:px-5">
        <CardTitle className="flex items-center gap-2 font-sans text-sm font-semibold normal-case">
          <Sparkles className="size-4 text-brand-primary" aria-hidden />
          AI 영업 포인트 요약
        </CardTitle>
        <CardDescription className="text-xs leading-snug">
          선택 업체·상권 지표를 자동으로 넣어 핵심 멘트를 생성합니다. 수동
          프롬프트 입력 없이 원클릭으로 동작합니다.
        </CardDescription>
        <p className="text-[10px] leading-snug text-muted-foreground">
          AI 보조 사용 시 입력 내용은 마스킹 처리 후 외부 AI 서비스(Google
          Generative AI)로 전송됩니다. 민감 정보 입력을 피해 주세요.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4 pb-4 sm:px-5">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full gap-2"
          disabled={loading}
          onClick={() => void runSummary()}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-3.5" aria-hidden />
          )}
          AI 요약 생성
        </Button>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {text ? (
          <div
            className="max-h-48 overflow-y-auto rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap"
            role="region"
            aria-label="AI 영업 포인트 요약 결과"
          >
            {text}
            {modelLabel ? (
              <p className="mt-2 text-[10px] text-muted-foreground">
                사용 모델: {modelLabel}
              </p>
            ) : null}
          </div>
        ) : null}
        {text ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              이 AI 요약이 도움이 되었나요?
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2"
              disabled={feedbackPending}
              onClick={() => void submitAiFeedback("up")}
            >
              <ThumbsUp className="size-3" aria-hidden />
              유용
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2"
              disabled={feedbackPending}
              onClick={() => void submitAiFeedback("down")}
            >
              <ThumbsDown className="size-3" aria-hidden />
              부정확
            </Button>
          </div>
        ) : null}
        {feedbackMsg ? (
          <p className="text-[10px] text-muted-foreground" role="status">
            {feedbackMsg}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};
