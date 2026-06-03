import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = fs.readFileSync(
  path.join(root, "components/sales-navigator/SalesNavigatorDashboard.tsx"),
  "utf8"
);
const m = src.match(
  /const SIGUNGU_DATA: Record<string, string\[\]> = (\{[\s\S]*?\n\});/
);
if (!m) {
  console.error("SIGUNGU_DATA block not found");
  process.exit(1);
}
const out = `/** 전국 시·군·구 정적 목록 — 행정표준 API 보조·API 실패 시 폴백. */

/** 행정구역 데이터 기준일(정적 배열). 개편 시 행안부 API·목록 갱신 필요. */
export const SIGUNGU_DATA_AS_OF = "2026-05";

export const SIGUNGU_STATIC_DATA: Record<string, string[]> = ${m[1]};

/** 시·도별 시·군·구 Option 목록(정적). */
export const getStaticSigunguOptions = (sido: string) =>
  (SIGUNGU_STATIC_DATA[sido] ?? []).map((name) => ({
    value: name,
    label: name,
  }));
`;
fs.writeFileSync(path.join(root, "lib/sales/sigungu-static-data.ts"), out);
const dashPath = path.join(
  root,
  "components/sales-navigator/SalesNavigatorDashboard.tsx"
);
let dash = fs.readFileSync(dashPath, "utf8");
dash = dash.replace(
  /const SIGUNGU_DATA: Record<string, string\[\]> = \{[\s\S]*?\n\};\r?\n\r?\n/,
  ""
);
fs.writeFileSync(dashPath, dash);
console.log("wrote lib/sales/sigungu-static-data.ts, patched dashboard");
