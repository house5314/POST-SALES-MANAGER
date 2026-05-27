/**
 * PoC에 필요한 환경 변수(.env.local)를 점검합니다.
 * - 필수: PUBLIC_DATA_API_KEY, NEXT_PUBLIC_NAVER_CLIENT_ID
 * - 선택: 소상공인365 iframe용 NEXT_PUBLIC_SBIZ_* (미설정 시 안내만)
 * 실행: npm run validate:env | npm run verify:public-data
 * 옵션: --no-network  공공 API 샘플 호출 생략(오프라인·CI 스모크)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const argv = new Set(process.argv.slice(2));
const noNetwork = argv.has("--no-network");

/** .env 형식 한 줄을 KEY=VALUE 로 파싱합니다. */
const parseEnvLocal = (raw) => {
  const map = new Map();
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    map.set(k, v);
  }
  return map;
};

/** 상가 storeListInDong 최소 호출로 serviceKey 유효성을 확인합니다. */
const probeDataGoKrSemas = async (serviceKey) => {
  const base = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong";
  const params = new URLSearchParams({
    divId: "signguCd",
    key: "11680",
    numOfRows: "1",
    pageNo: "1",
    type: "json",
    serviceKey,
  });
  const url = `${base}?${params.toString()}&type=json`;
  const res = await fetch(url);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const header = json?.header ?? json?.response?.header;
  const code =
    typeof header?.resultCode === "string" ? header.resultCode : undefined;
  const msg =
    typeof header?.resultMsg === "string" ? header.resultMsg : undefined;
  return { status: res.status, code, msg, snippet: text.slice(0, 200) };
};

const root = resolve(process.cwd());
const envPath = resolve(root, ".env.local");

const isCiLike =
  process.env.CI === "true" ||
  process.env.VERCEL === "1" ||
  process.env.SKIP_ENV_VALIDATION === "1";

if (!existsSync(envPath)) {
  if (isCiLike) {
    console.log(
      "[validate-env] .env.local 없음 — CI/배포 환경에서 검증을 건너뜁니다. 로컬 PoC는 .env.local 을 추가하세요."
    );
    process.exit(0);
  }
  console.error("[오류] .env.local 파일이 없습니다:", envPath);
  process.exit(1);
}

const env = parseEnvLocal(readFileSync(envPath, "utf8"));

console.log("=== 필수 키(영업 네비게이터 PoC) ===\n");

const publicKey = env.get("PUBLIC_DATA_API_KEY")?.trim();
if (!publicKey) {
  console.error("결과: PUBLIC_DATA_API_KEY 가 비어 있습니다(공공데이터포털 serviceKey).");
  process.exit(1);
}
console.log(
  "PUBLIC_DATA_API_KEY: 설정됨 (길이",
  publicKey.length,
  ", 마지막 6자 …" + publicKey.slice(-6) + ")"
);

const naverId = env.get("NEXT_PUBLIC_NAVER_CLIENT_ID")?.trim();
if (!naverId || naverId.length < 4) {
  console.error(
    "결과: NEXT_PUBLIC_NAVER_CLIENT_ID 가 비어 있거나 너무 짧습니다(네이버 지도 클라이언트 ID)."
  );
  process.exit(1);
}
console.log(
  "NEXT_PUBLIC_NAVER_CLIENT_ID: 설정됨 (길이",
  naverId.length,
  ", 앞 4자 " + naverId.slice(0, 4) + "…)"
);

if (noNetwork) {
  console.log(
    "\n[안내] --no-network: 공공 API 샘플 호출을 건너뜁니다(키 형식만 확인했습니다)."
  );
} else {
  console.log("\n=== 공공데이터포털 (apis.data.go.kr) 샘플 호출 ===");
  const semas = await probeDataGoKrSemas(publicKey);
  if (semas.status === 200 && semas.code === "00") {
    console.log("상가(storeListInDong) 샘플 호출: 성공 —", semas.msg ?? "OK");
  } else if (semas.status === 401) {
    console.error(
      "상가(storeListInDong) 샘플 호출: 실패 — 401 Unauthorized (공공데이터포털 serviceKey 가 아닐 수 있습니다. 소상공인365 certKey 와 혼동하지 마세요.)"
    );
    process.exit(1);
  } else {
    console.error(
      "상가(storeListInDong) 샘플 호출: HTTP",
      semas.status,
      semas.code,
      semas.msg
    );
    console.error("응답 앞부분:", semas.snippet.replace(/\s+/g, " "));
    process.exit(1);
  }
}

console.log("\n=== 소상공인365 iframe (선택 · NEXT_PUBLIC_*) ===");
const sbizPublicCandidates = [
  "NEXT_PUBLIC_SBIZ_CERT_KEY",
  "NEXT_PUBLIC_SBIZ_CERT_DETAIL",
  "NEXT_PUBLIC_SBIZ_OPENAPI_CERT_DETAIL",
  "NEXT_PUBLIC_SBIZ_CERT_STOR_STTUS",
  "NEXT_PUBLIC_SBIZ_OPENAPI_CERT_STOR_STTUS",
  "NEXT_PUBLIC_SBIZ_CERT_SLS_IDEX",
  "NEXT_PUBLIC_SBIZ_OPENAPI_CERT_SLS_IDEX",
];
let anySbizPublic = false;
for (const k of sbizPublicCandidates) {
  const v = env.get(k)?.trim();
  if (v) {
    anySbizPublic = true;
    console.log(`${k}: 설정됨 (길이 ${v.length})`);
  }
}
if (!anySbizPublic) {
  console.log(
    "안내: 소상공인365 iframe용 키가 없습니다. 제안서 부록 탭은 설정 후 사용하세요."
  );
}

console.log("\n=== 소상공인365 서버용 certKey (선택 · 연동 예정) ===");
const sbizServerKeys = [
  ["상세분석(detail)", "SBIZ_OPENAPI_CERT_DETAIL"],
  ["업소현황(storSttus)", "SBIZ_OPENAPI_CERT_STOR_STTUS"],
  ["점포당 매출액 추이(slsIdex)", "SBIZ_OPENAPI_CERT_SLS_IDEX"],
];
let anySbizServer = false;
for (const [, k] of sbizServerKeys) {
  const v = env.get(k)?.trim();
  if (v) {
    anySbizServer = true;
    console.log(`${k}: 설정됨 (길이 ${v.length})`);
  } else {
    console.log(`${k}: 미설정`);
  }
}
if (!anySbizServer) {
  console.log(
    "\n안내: 위 서버용 certKey 는 현재 Next API 가 자동 호출에 쓰지 않을 수 있습니다. 연동 시 포털 REST 문서를 따르세요."
  );
} else {
  console.log(
    "\n안내: 서버용 certKey 가 .env.local 에 있습니다. 라우트 연동 여부는 코드를 확인하세요."
  );
}

console.log("\n=== Google Generative AI (선택 · /api/ai/assist) ===");
const googleKey = env.get("GOOGLE_GENERATIVE_AI_API_KEY")?.trim();
if (googleKey) {
  console.log(
    "GOOGLE_GENERATIVE_AI_API_KEY: 설정됨 (길이",
    googleKey.length,
    ")"
  );
} else {
  console.log(
    "안내: GOOGLE_GENERATIVE_AI_API_KEY 가 없습니다. AI 보조 라우트는 503(AI_DISABLED)로 응답합니다."
  );
}
const googleBase = env.get("GOOGLE_GENERATIVE_AI_BASE_URL")?.trim();
if (googleBase) {
  console.log(
    "GOOGLE_GENERATIVE_AI_BASE_URL: 설정됨(내부망·DMZ 프록시). URL 본문은 로그에 출력하지 않습니다. docs/ai-internal-network.md 참고."
  );
} else {
  console.log(
    "GOOGLE_GENERATIVE_AI_BASE_URL: 미설정 — SDK 기본 공인 엔드포인트(v1beta)를 사용합니다."
  );
}
const googleModel = env.get("GOOGLE_GENERATIVE_AI_MODEL")?.trim();
if (googleModel) {
  console.log("GOOGLE_GENERATIVE_AI_MODEL:", googleModel);
} else {
  console.log(
    "GOOGLE_GENERATIVE_AI_MODEL: 미설정 — 코드 기본값(gemini-2.0-flash) 사용."
  );
}
const googleTemp = env.get("GOOGLE_GENERATIVE_AI_TEMPERATURE")?.trim();
if (googleTemp) {
  const n = Number(googleTemp);
  const capped = Number.isFinite(n) ? Math.min(0.2, Math.max(0, n)) : 0.2;
  console.log(
    "GOOGLE_GENERATIVE_AI_TEMPERATURE:",
    googleTemp,
    "→ 실제 호출 상한:",
    capped,
    "(코드 최대 0.2)"
  );
} else {
  console.log(
    "GOOGLE_GENERATIVE_AI_TEMPERATURE: 미설정 — AI assist 기본 0.2 사용."
  );
}

console.log("\n검증 완료.");
process.exit(0);
