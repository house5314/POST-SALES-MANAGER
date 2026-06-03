/**
 * 공모전 제출용 소스 패키지(ZIP) 생성 — node_modules·.next·비밀키 제외.
 * 실행: npm run package:submission
 */
import { execSync } from "node:child_process";
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
const STAGING = join(ROOT, "submission-staging");
const OUT_DIR = join(ROOT, "submission");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  ".cursor",
  ".vercel",
  "submission-staging",
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

const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const zipBase = `POST-SALES-MANAGER-공모제출소스-${dateStamp}`;
const zipPath = join(OUT_DIR, `${zipBase}.zip`);

console.log("[package-submission] 스테이징 초기화…");
if (existsSync(STAGING)) rmSync(STAGING, { recursive: true, force: true });
mkdirSync(STAGING, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

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
  copyTree(src, join(STAGING, d), d);
}

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

if (existsSync(zipPath)) rmSync(zipPath, { force: true });

const isWin = process.platform === "win32";
try {
  if (isWin) {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${STAGING.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`,
      { stdio: "inherit", cwd: ROOT }
    );
  } else {
    execSync(`tar -a -cf "${zipPath}" -C "${STAGING}" .`, {
      stdio: "inherit",
      cwd: ROOT,
    });
  }
} catch (e) {
  console.error("[package-submission] ZIP 생성 실패:", e.message);
  console.log(`스테이징 폴더만 생성됨: ${STAGING}`);
  process.exit(1);
}

rmSync(STAGING, { recursive: true, force: true });

const sizeMb = (statSync(zipPath).size / (1024 * 1024)).toFixed(2);
console.log("");
console.log("완료 — 공모 제출용 패키지");
console.log(`  ZIP: ${zipPath}`);
console.log(`  용량: ${sizeMb} MB · 파일 ${files.length}개`);
console.log("  함께 제출: docs/개발-설계서.md (필수 서류, ZIP 밖 단독 제출 가능)");
