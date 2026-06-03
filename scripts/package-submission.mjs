/**
 * 공모전 제출용 소스 패키지(ZIP) 생성 — node_modules·.next·비밀키 제외.
 * 실행: npm run package:submission
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT_DIR = join(ROOT, "submission");

const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const STAGING = join(ROOT, `submission-staging-${dateStamp}`);

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  ".cursor",
  ".vercel",
  "submission-staging",
  "submission-staging-",
  "submission",
  "coverage",
  "out",
  "build",
]);

const SKIP_FILE_NAMES = new Set([
  ".DS_Store",
  "next-env.d.ts",
  "index.html",
  "CLAUDE.md",
  "AGENTS.md",
]);

const SKIP_DOC_FILES = new Set([
  "im.md",
  "final.md",
  "final2.md",
]);

const ROOT_FILES = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "components.json",
  "Dockerfile",
  ".dockerignore",
  ".env.example",
  "README.md",
];

const COPY_DIRS = ["app", "components", "lib", "hooks", "types", "public", "scripts", ".github"];

const COPY_DOCS = [
  "docs/개발-설계서.md",
  "docs/ai-internal-network.md",
  "docs/operations-data-quota.md",
  "docs/공모-코드제출-패키지-안내.md",
];

/** 디렉터리를 재귀 복사하며 제외 규칙을 적용합니다. */
const copyTree = (src, dest, relBase = "") => {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    if (SKIP_DIR_NAMES.has(name)) continue;
    if (SKIP_FILE_NAMES.has(name)) continue;
    const srcPath = join(src, name);
    const rel = relBase ? `${relBase}/${name}` : name;
    if (rel.startsWith("docs/") && SKIP_DOC_FILES.has(name)) continue;
    const st = statSync(srcPath);
    const destPath = join(dest, name);
    if (st.isDirectory()) {
      copyTree(srcPath, destPath, rel);
    } else {
      cpSync(srcPath, destPath);
    }
  }
};

/** 스테이징 트리의 파일 목록을 수집합니다. */
const collectFiles = (dir, base = "") => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const st = statSync(p);
    if (st.isDirectory()) out.push(...collectFiles(p, rel));
    else out.push(rel.replace(/\\/g, "/"));
  }
  return out.sort((a, b) => a.localeCompare(b, "ko"));
};

const zipBase = `POST-SALES-MANAGER-공모제출소스-${dateStamp}`;
const zipPath = join(OUT_DIR, `${zipBase}.zip`);

console.log("[package-submission] 스테이징 초기화…");
if (existsSync(STAGING)) rmSync(STAGING, { recursive: true, force: true });
mkdirSync(STAGING, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

console.log("[package-submission] 루트 파일 복사…");
for (const f of ROOT_FILES) {
  const src = join(ROOT, f);
  if (!existsSync(src)) {
    console.warn(`  건너뜀(없음): ${f}`);
    continue;
  }
  cpSync(src, join(STAGING, f));
}

for (const d of COPY_DIRS) {
  const src = join(ROOT, d);
  if (!existsSync(src)) continue;
  console.log(`[package-submission] 디렉터리: ${d}`);
  copyTree(src, join(STAGING, d), d);
}

console.log("[package-submission] 문서 복사…");
mkdirSync(join(STAGING, "docs"), { recursive: true });
for (const doc of COPY_DOCS) {
  const src = join(ROOT, doc);
  if (!existsSync(src)) {
    console.warn(`  건너뜀(없음): ${doc}`);
    continue;
  }
  cpSync(src, join(STAGING, doc));
}

const submissionReadmeSrc = join(ROOT, "docs", "제출_README.md");
if (existsSync(submissionReadmeSrc)) {
  cpSync(submissionReadmeSrc, join(STAGING, "제출_README.md"));
}

const files = collectFiles(STAGING);
const manifest = {
  packageName: zipBase,
  generatedAt: new Date().toISOString(),
  fileCount: files.length,
  excluded: [
    "node_modules",
    ".next",
    ".env* (except .env.example)",
    ".git",
    ".cursor",
    "내부 초안 문서(im.md, final.md, final2.md)",
  ],
  files,
};
writeFileSync(
  join(STAGING, "SUBMISSION_MANIFEST.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

/** ZIP 밖 포털 업로드용 MD 복사본(최신 `docs/` 동기화). */
console.log("[package-submission] 제출 MD 복사…");
const mdOutDir = join(OUT_DIR, "제출문서");
mkdirSync(mdOutDir, { recursive: true });
for (const doc of COPY_DOCS) {
  const src = join(ROOT, doc);
  if (!existsSync(src)) continue;
  cpSync(src, join(mdOutDir, basename(doc)));
}
if (existsSync(submissionReadmeSrc)) {
  cpSync(submissionReadmeSrc, join(mdOutDir, "제출_README.md"));
}
const designSrc = join(ROOT, "docs", "개발-설계서.md");
if (existsSync(designSrc)) {
  cpSync(designSrc, join(mdOutDir, "개발-설계서.md"));
}

if (existsSync(zipPath)) rmSync(zipPath, { force: true });

console.log("[package-submission] ZIP 생성…");
const tarResult = spawnSync("tar", ["-a", "-cf", zipPath, "."], {
  cwd: STAGING,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (tarResult.error || tarResult.status !== 0) {
  console.error(
    "[package-submission] ZIP 생성 실패:",
    tarResult.error?.message ?? `exit ${tarResult.status}`
  );
  console.log(`스테이징 폴더 유지: ${STAGING}`);
  console.log(`제출 MD: ${mdOutDir}`);
  process.exit(1);
}

try {
  rmSync(STAGING, { recursive: true, force: true });
} catch (e) {
  console.warn(`[package-submission] 스테이징 폴더 삭제 건너뜀: ${STAGING}`);
}

const sizeMb = (statSync(zipPath).size / (1024 * 1024)).toFixed(2);
console.log("");
console.log("완료 — 공모 제출용 패키지");
console.log(`  ZIP: ${zipPath}`);
console.log(`  MD:  ${mdOutDir}`);
console.log(`  용량: ${sizeMb} MB · 파일 ${files.length}개`);
console.log("  함께 제출: submission/제출문서/개발-설계서.md (필수 서류, ZIP 밖 단독 업로드)");
