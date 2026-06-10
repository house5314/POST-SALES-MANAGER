# 공모전 제출용 소스 패키지 안내

**과제명:** 우체국 B2B 스마트 영업 네비게이터 (생활정보홍보우편 PoC)  
**패키지:** 본 ZIP은 심사·검토용 **소스 코드** 묶음입니다. (비밀키·`node_modules`·빌드 산출물 제외)

---

## 1. 제출 구성 (권장)

| 구분 | 파일 |
|------|------|
| **필수 서류** | `docs/개발-설계서.md` (ZIP 포함·포털에 단독 업로드 가능) |
| **소스 코드** | `POST-SALES-MANAGER-공모제출소스-YYYYMMDD.zip` (본 패키지) |
| **시연 URL** | https://post-sales-manager.co.kr (보조: https://post-sales-manager.vercel.app) · 데모: `?demo=1` |

---

## 2. 로컬 실행

```bash
npm ci
cp .env.example .env.local
# .env.local 에 PUBLIC_DATA_API_KEY, NEXT_PUBLIC_NAVER_CLIENT_ID 설정

npm run validate:env
npm run dev
```

브라우저: http://localhost:3000

프로덕션 빌드:

```bash
npm run build
npm run start
```

Docker(Standalone): 루트 `Dockerfile` 참고.

---

## 3. 디렉터리 구조 (핵심)

| 경로 | 역할 |
|------|------|
| `app/` | Next.js App Router·API Route Handlers |
| `components/sales-navigator/` | 영업 네비게이터 UI |
| `lib/commercial-api/` | 공공 상가 API 프록시 |
| `lib/ai/` | AI 보조·마스킹·할루시네이션 억제 |
| `lib/postal-adhesive-pricing.ts` | 접착형 우체국 요금 안내 |
| `lib/sales/region-hierarchy.ts` | 행정동 3단계(세종 등) |
| `lib/open-proposal-print.ts` | 제안서 인쇄/PDF |
| `scripts/validate-env.mjs` | 환경 변수 검증 |

---

## 4. 환경 변수 (`.env.example`)

- **필수:** `PUBLIC_DATA_API_KEY`, `NEXT_PUBLIC_NAVER_CLIENT_ID`
- **선택:** `GOOGLE_GENERATIVE_AI_*`, 소상공인365 `NEXT_PUBLIC_SBIZ_*`

실제 키 값은 제출 ZIP에 **포함되지 않습니다.**

---

## 5. 파일 목록

루트 `SUBMISSION_MANIFEST.json` 에 패키징된 전체 경로가 기록되어 있습니다.

---

## 6. 문의·저장소

- GitHub: https://github.com/house5314/POST-SALES-MANAGER
