# 우체국 생활정보홍보우편 — 스마트 영업 네비게이터 (PoC)

Next.js(App Router)·TypeScript·Tailwind 기반 웹앱입니다. 공공데이터(상가·상권)·국토부 단지·네이버 지도를 한 화면에서 묶어 B2B 영업 보조를 목표로 합니다.

**기존 상권 도구와의 차이(요지):** 네이버 스마트플레이스·소상공인365는 상권·매장 조회에 강점이 있으나, 본 PoC는 **우체국 생활정보홍보우편**에 맞춰 **3기관 공공 API + 접착형 견적 + 제안서 PDF + (선택) AI 요약**을 한 화면에 통합합니다. 상세 비교는 [`docs/개발-설계서.md`](docs/개발-설계서.md) §1.7.1.

## 사전 준비

1. 루트에 `.env.local`을 만듭니다. 키 이름 예시는 `.env.example` 을 참고하세요.
2. **필수**
   - `PUBLIC_DATA_API_KEY` — 공공데이터포털 **serviceKey**(상가 API 등). 소상공인365 `certKey`와 혼동하지 마세요.
   - `NEXT_PUBLIC_NAVER_CLIENT_ID` — 네이버 지도 NCP 클라이언트 ID.
3. **선택** — 소상공인365 iframe·제안 부록: `NEXT_PUBLIC_SBIZ_CERT_KEY` 또는 탭별 `NEXT_PUBLIC_SBIZ_CERT_*` / `NEXT_PUBLIC_SBIZ_OPENAPI_CERT_*` (자세한 키 이름은 `lib/sbiz-iframe-urls.ts` 참고).
4. **선택** — AI 보조 문장 생성: `GOOGLE_GENERATIVE_AI_API_KEY` (서버 전용, `app/api/ai/assist`). 내부망·DMZ 프록시는 `GOOGLE_GENERATIVE_AI_BASE_URL`, 모델 변경은 `GOOGLE_GENERATIVE_AI_MODEL` — **경로·배포 시나리오는 [`docs/ai-internal-network.md`](docs/ai-internal-network.md)** 참고.

## AI 보조 API·보안 정책(코드 근거)

- **엔드포인트:** `POST /api/ai/assist` — 본문 `{ "prompt": "..." }`. 키가 없으면 `503` + `AI_DISABLED` (원문은 로그에 남기지 않음).
- **내부망 모델 경로:** `GOOGLE_GENERATIVE_AI_BASE_URL`·`GOOGLE_GENERATIVE_AI_MODEL`·`lib/ai/google-genai-config.ts` — **[`docs/ai-internal-network.md`](docs/ai-internal-network.md)**.
- **가공·시연 지표:** 전월 대비 매출(%) 등은 `lib/commercial-api/mock-sales-metrics.ts` 규칙이며, **제안서 생성(인쇄/PDF) 카드 하단**·매출 추세 카드·우측 필터에 고지 문구가 노출됩니다.
- **입력 마스킹:** `lib/ai/mask-sensitive-text.ts` — 이메일·전화·주민번호형·사업자등록번호·긴 숫자열 등을 모델 전송 전 치환.
- **할루시네이션 억제:** `lib/ai/assist-model-params.ts` — temperature **≤0.2**, System Prompt에 앱과 동기된 우편 요금표(`lib/postal-calc.ts`)와 「제공된 우편 요금표 외 정보 생성 금지」.
- **로그 정책:** `lib/ai/ai-request-logger.ts` — 프로덕션은 길이·단계 메타만 JSON 한 줄; 개발에서만 마스킹된 문자열 **미리보기(상한)**.

### 개인정보 보호·AI 윤리 고지

- **개인정보 비수집·비저장:** 회원가입·로그인이 없고, 개인정보를 서버에 저장하지 않습니다. 조회 데이터는 공공데이터포털의 **공개 상가·행정 정보**만 사용합니다.
- **마스킹 한계 고지:** 위 입력 마스킹은 정규식 기반 **최소 방어선**이며 완전한 비식별화를 보장하지 않습니다. AI 보조 입력란에 개인정보를 넣지 않는 것을 권장합니다.
- **AI 생성물 책임:** AI 응답은 영업 참고용 **보조 문구**입니다. 최종 견적·제안 판단은 직원이 수행하며, 가공 지표는 화면·PDF에 고지 문구가 표시됩니다.
- **설문 익명 수집:** `/api/feedback` 은 식별자 없이 점수·코멘트만 수집합니다.
- 상세 정책 표: [`docs/개발-설계서.md`](docs/개발-설계서.md) §9.4

## 환경 변수 자동 검증

로컬에서 PoC 실행·빌드 전에 키와(기본) 공공 API 응답을 확인합니다.

```bash
npm run validate:env
```

- 네트워크 없이 키 존재만 확인:  
  `node scripts/validate-env.mjs --no-network`
- 기존 스크립트 이름 호환:  
  `npm run verify:public-data` → 내부적으로 동일 검증(`verify-public-data-keys.mjs`가 `validate-env.mjs`에 위임).

`npm run build`는 **`prebuild`** 단계에서 `validate:env`를 먼저 실행합니다. **GitHub Actions·Vercel** 등에서 `.env.local` 파일이 없으면 자동으로 검증을 건너뜁니다(`CI` / `VERCEL` / `SKIP_ENV_VALIDATION`). 배포 환경에서는 플랫폼 대시보드에 동일 변수를 설정하세요.

## 개발 서버

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## 사내망·Docker (Standalone)

사내망 배포 시 **인터넷 연결이 불필요**하도록 `next.config.ts`에 **`output: 'standalone'`**을 사용합니다. 빌드 후 `.next/standalone`만으로 `node server.js`를 실행할 수 있으며, 루트 **`Dockerfile`**로 경량 이미지를 만듭니다.

```bash
# 공인망·CI에서 이미지 빌드
docker build -t post-sales-navigator .

# 사내망에서 기동 (환경 변수는 --env-file)
docker run --rm -p 3000:3000 --env-file .env.production post-sales-navigator
```

상세: [`docs/개발-설계서.md`](docs/개발-설계서.md) §11.1, [`docs/ai-internal-network.md`](docs/ai-internal-network.md) §3.

## 기타 스크립트

| 명령 | 설명 |
|------|------|
| `npm run lint` | ESLint |
| `npm run test` | Vitest 단위 테스트 — 민감정보 마스킹·쿼터 판별·시군구 폴백·거리 계산 (`tests/`) |
| `npm run build` | `validate:env` 후 Next.js 프로덕션 빌드 |

공모 **필수 제출(개발 설계서)** 는 [`docs/개발-설계서.md`](docs/개발-설계서.md) 단독 제출을 권장합니다. (`docs/im.md` 는 내부 초안)

## 운영 주체·데이터 갱신·API 쿼터

- **상세:** [`docs/operations-data-quota.md`](docs/operations-data-quota.md) — 운영 역할(PoC vs 도입 후), 원천 갱신 vs 화면 조회 시점, 공공·지도·AI API 쿼터의 근거와 PoC 호출 패턴.
- **UI 고지:** `lib/operations/governance-copy.ts` 의 문구가 영업 네비게이터 하단에 표시됩니다. 가공 매출·상권 모델은 **제안서 생성란 하단**·필터·PDF에도 표기합니다.
