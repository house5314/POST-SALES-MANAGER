import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAiRouteEvent } from "@/lib/ai/ai-request-logger";
import { getGoogleGenAiClientConfig } from "@/lib/ai/google-genai-config";
import { maskSensitiveTextForModel } from "@/lib/ai/mask-sensitive-text";

const bodySchema = z.object({
  /** 사용자가 입력한 상담 메모·질문(모델 전 마스킹 적용) */
  prompt: z.string().min(1).max(12_000),
});

const SYSTEM_PROMPT = `당신은 대한민국 우체국 생활정보홍보우편 B2B 영업을 돕는 보조 역할입니다.
개인·사업자 식별 정보는 입력에서 마스킹되었을 수 있습니다. 마스킹된 토큰([전화], [이메일] 등)은 복원하지 마세요.
답변은 한국어로, 짧고 실무에 맞게(불필요한 장문 금지) 작성하세요.`;

/**
 * 마스킹·로그 정책을 적용한 뒤 선택적으로 Gemini를 호출합니다(API 키 없으면 비활성 응답).
 * 내부망·DMZ 프록시는 `GOOGLE_GENERATIVE_AI_BASE_URL` 로 지정합니다.
 */
export const POST = async (req: Request) => {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "JSON 본문을 읽을 수 없습니다." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "요청 형식이 올바르지 않습니다.",
        issues: parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  const raw = parsed.data.prompt;
  const masked = maskSensitiveTextForModel(raw);

  logAiRouteEvent(
    {
      route: "/api/ai/assist",
      phase: "mask_applied",
      rawCharLength: raw.length,
      maskedCharLength: masked.length,
    },
    { maskedPreviewSource: masked }
  );

  const { apiKey, baseURL, modelId } = getGoogleGenAiClientConfig();
  const usesCustomGenerativeAiBase = Boolean(baseURL);

  if (!apiKey) {
    logAiRouteEvent({
      route: "/api/ai/assist",
      phase: "model_skipped",
      rawCharLength: raw.length,
      maskedCharLength: masked.length,
      errorCode: "NO_GOOGLE_GENERATIVE_AI_API_KEY",
      modelId,
      usesCustomGenerativeAiBase,
    });
    return NextResponse.json(
      {
        ok: false,
        code: "AI_DISABLED",
        message:
          "AI 보조가 비활성화되어 있습니다. 서버에 GOOGLE_GENERATIVE_AI_API_KEY 를 설정한 뒤 다시 시도하세요.",
      },
      { status: 503 }
    );
  }

  try {
    const googleProvider = createGoogleGenerativeAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    const { text, usage } = await generateText({
      model: googleProvider(modelId),
      system: SYSTEM_PROMPT,
      prompt: masked,
    });

    logAiRouteEvent({
      route: "/api/ai/assist",
      phase: "model_ok",
      rawCharLength: raw.length,
      maskedCharLength: masked.length,
      modelId,
      usesCustomGenerativeAiBase,
    });

    return NextResponse.json({
      ok: true,
      text,
      usage: usage ?? null,
      meta: {
        modelId,
        usesCustomGenerativeAiBase,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "모델 호출 오류";
    logAiRouteEvent(
      {
        route: "/api/ai/assist",
        phase: "model_error",
        rawCharLength: raw.length,
        maskedCharLength: masked.length,
        errorCode: "MODEL_CALL_FAILED",
        modelId,
        usesCustomGenerativeAiBase,
      },
      { maskedPreviewSource: masked }
    );
    if (process.env.NODE_ENV === "development") {
      console.error("[AI assist]", e);
    }
    return NextResponse.json(
      {
        ok: false,
        message: "AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        ...(process.env.NODE_ENV === "development" ? { detail: msg } : {}),
      },
      { status: 502 }
    );
  }
};
