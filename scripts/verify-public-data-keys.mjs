/**
 * .env.local 의 공공데이터포털 키·소상공인365 certKey 를 점검합니다.
 * 실행: npm run verify:public-data
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

if (!existsSync(envPath)) {
  console.error("[오류] .env.local 파일이 없습니다:", envPath);
  process.exit(1);
}

const env = parseEnvLocal(readFileSync(envPath, "utf8"));
const publicKey = env.get("PUBLIC_DATA_API_KEY")?.trim();

console.log("=== 공공데이터포털 (apis.data.go.kr) ===");
if (!publicKey) {
  console.log("결과: PUBLIC_DATA_API_KEY 가 비어 있습니다.");
  process.exit(1);
}
console.log("키 길이:", publicKey.length, "(마지막 6자 …" + publicKey.slice(-6) + ")");

const semas = await probeDataGoKrSemas(publicKey);
if (semas.status === 200 && semas.code === "00") {
  console.log("상가(storeListInDong) 샘플 호출: 성공 —", semas.msg ?? "OK");
} else if (semas.status === 401) {
  console.log(
    "상가(storeListInDong) 샘플 호출: 실패 — 401 Unauthorized (공공데이터포털 serviceKey 가 아닐 수 있습니다. 소상공인365 certKey 와 혼동하지 마세요.)"
  );
  process.exitCode = 1;
} else {
  console.log("상가(storeListInDong) 샘플 호출: HTTP", semas.status, semas.code, semas.msg);
  console.log("응답 앞부분:", semas.snippet.replace(/\s+/g, " "));
  process.exitCode = 1;
}

console.log("\n=== 소상공인365 빅데이터 오픈API (certKey) ===");
const sbizKeys = [
  ["상세분석(detail)", "SBIZ_OPENAPI_CERT_DETAIL"],
  ["업소현황(storSttus)", "SBIZ_OPENAPI_CERT_STOR_STTUS"],
  ["점포당 매출액 추이(slsIdex)", "SBIZ_OPENAPI_CERT_SLS_IDEX"],
];
let anySbiz = false;
for (const [, k] of sbizKeys) {
  const v = env.get(k)?.trim();
  if (v) {
    anySbiz = true;
    console.log(`${k}: 설정됨 (길이 ${v.length})`);
  } else {
    console.log(`${k}: 미설정`);
  }
}
if (!anySbiz) {
  console.log(
    "\n안내: 이 레포의 Next API 는 아직 위 certKey 로 외부를 호출하지 않습니다. 연동 시 포털 문서의 REST 호출주소와 파라미터를 사용하세요(#/ 경로는 브라우저 전용입니다)."
  );
} else {
  console.log(
    "\n안내: certKey 가 .env 에 있습니다. 현재 앱 라우트는 이 값으로 자동 호출하지 않습니다(별도 연동 작업 필요)."
  );
}

process.exit(process.exitCode ?? 0);
