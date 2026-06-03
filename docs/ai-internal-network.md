# 내부망·폐쇄망에서의 AI 모델 API 경로

본 문서는 심사·감사·운영 시 **“모델 호출이 어떤 네트워크 경로로 나가는지”**를 코드·환경 변수와 대응시키기 위한 참고입니다. 구현 근거는 `app/api/ai/assist/route.ts`, `lib/ai/google-genai-config.ts` 입니다.

## 1. 공인망(PoC 기본)

| 구분 | 내용 |
|------|------|
| SDK 기본 접두 | `https://generativelanguage.googleapis.com/v1beta` (`@ai-sdk/google` 기본값) |
| 인증 | HTTP 헤더 `x-goog-api-key` — 값은 서버 환경 변수 `GOOGLE_GENERATIVE_AI_API_KEY`만 사용(브라우저에 노출 금지) |
| 모델 ID 기본값 | `gemini-2.0-flash` |

앱 내부 흐름: **클라이언트 → Next 서버(`POST /api/ai/assist`) → (마스킹 후) Google Generative Language API**.

## 2. 내부망·DMZ(프록시·API 게이트웨이)

인터넷 직접 연결이 안 되는 환경에서는, **사내 허용 구간에 둔 리버스 프록시 또는 API 게이트웨이**가 위 공식 호스트와 동일한 API 형태로 중계하는 경우가 많습니다.

| 환경 변수 | 역할 |
|-----------|------|
| `GOOGLE_GENERATIVE_AI_BASE_URL` | (선택) API 호출 시 사용할 **URL 접두**. 예: `https://genai-gw.internal.example.com/v1beta` — 실제 값은 조직의 네트워크 담당자에게 확인 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | (필수·서버) 게이트웨이가 요구하는 키(조직 발급 키일 수 있음) |
| `GOOGLE_GENERATIVE_AI_MODEL` | (선택) 게이트웨이에서 허용하는 모델 ID(기본과 다를 때만 설정) |

코드에서는 `createGoogleGenerativeAI({ apiKey, baseURL })` 형태로 `baseURL`이 있을 때만 덮어씁니다.

## 3. 사내망 Standalone·Docker(앱 배포)

사내망 배포 시 **인터넷 연결이 불필요**하도록 Next.js **`output: 'standalone'`**(`next.config.ts`)으로 빌드하고, **경량 Docker 이미지**로 제공합니다.

| 단계 | 망 | 작업 |
|------|-----|------|
| 빌드 | 공인망·CI | `docker build -t post-sales-navigator .` — `npm ci`·`next build`는 이 단계에서만 |
| 이관 | DMZ/레지스트리 | 이미지를 사내 컨테이너 레지스트리에 push |
| 실행 | 폐쇄망 | `docker run -p 3000:3000 --env-file .env.production …` — 런타임은 `node server.js` |

- 산출 경로: `.next/standalone`, `.next/static`, `public` — 루트 `Dockerfile` 참고.
- **주의:** 이미지가 오프라인이어도, PoC가 호출하는 **공공 API·지도·(선택) AI**는 조직이 허용한 **내부 게이트웨이·DMZ**로 나가야 할 수 있습니다(§2·§3).

## 4. 폐쇄망에서 Google API를 쓸 수 없는 경우

현재 PoC의 `/api/ai/assist`는 **Google Generative AI 프로토콜**을 전제로 합니다. 다음은 문서·로드맵용입니다.

- **온프렘 LLM**(vLLM 등)으로 **OpenAI 호환 HTTP**만 제공되는 경우: 별도 라우트 또는 `generateText`용 프로바이더 분기(`@ai-sdk/openai` + `baseURL`)가 필요합니다.
- **완전 단절**에서 AI를 쓰지 않는 경우: `GOOGLE_GENERATIVE_AI_API_KEY`를 비워 두면 기존과 같이 **503 `AI_DISABLED`**로 동작합니다.

## 5. 로그·보안(경로와의 관계)

- **할루시네이션 억제:** LLM 호출 시 Temperature를 **0.2 이하**로 제한하고, System Prompt에 **「제공된 우편 요금표 외의 정보는 절대 생성하지 말 것」**을 명시합니다(`lib/ai/assist-model-params.ts`, 요금표 출처 `lib/postal-calc.ts`).
- 프로덕션 로그에는 **사용자 `prompt` 원문과 `GOOGLE_GENERATIVE_AI_BASE_URL` 전체 값을 넣지 않습니다.** (`lib/ai/ai-request-logger.ts`)
- 필요 시 `model_ok` 등 메타에 **커스텀 base 사용 여부·모델 ID**만 남깁니다(내부 호스트명 노출 최소화).
- 성공 응답 JSON의 `meta`( `modelId`, `usesCustomGenerativeAiBase` )는 클라이언트가 **디버그 배지** 등에 쓸 수 있는 비밀이 아닌 정보만 담습니다.

## 6. 검증 스크립트와의 관계

`npm run validate:env`는 `GOOGLE_GENERATIVE_AI_API_KEY` 및(설정 시) `GOOGLE_GENERATIVE_AI_BASE_URL` / `GOOGLE_GENERATIVE_AI_MODEL` 존재를 **안내 수준**으로 출력합니다. 프록시 URL이 실제로 Google 호환인지는 **네트워크 정책·게이트웨이 문서**로 별도 검증해야 합니다.

## 7. 연관 문서

- 운영 주체·공공 API 쿼터·데이터 갱신 구분: [`docs/operations-data-quota.md`](./operations-data-quota.md)
