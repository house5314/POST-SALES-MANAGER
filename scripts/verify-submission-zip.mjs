/**
 * 제출용 ZIP 자가 점검(§1.5) — 사이즈·시크릿·UTF-8 flag·파일명 길이 4종 검증.
 * 실행: node scripts/verify-submission-zip.mjs "submission/제출용(20260604).zip"
 * 종료 코드: 0 = 통과, 1 = 실패 항목 존재.
 */
import { readFileSync, statSync } from "node:fs";

/** ZIP 중앙 디렉터리를 파싱하여 entry 목록(파일명·flag)을 반환합니다. */
const parseZipEntries = (buf) => {
  // EOCD(End of Central Directory, 0x06054b50) 시그니처를 뒤에서부터 탐색
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("EOCD 레코드를 찾지 못했습니다 — 손상된 ZIP");

  const total = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) {
      throw new Error(`중앙 디렉터리 시그니처 불일치 (entry ${n})`);
    }
    const flag = buf.readUInt16LE(off + 8);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const nameBytes = buf.subarray(off + 46, off + 46 + nameLen);
    entries.push({ name: nameBytes.toString("utf8"), flag, nameBytes });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
};

/** ZIP 파일에 대해 §1.5 자가 점검 4종을 실행하고 결과를 출력합니다. */
export const verifySubmissionZip = (zipPath) => {
  const buf = readFileSync(zipPath);
  const entries = parseZipEntries(buf);
  const problems = [];

  // (1) 사이즈 — 압축 후 50MB 이하
  const sizeMb = statSync(zipPath).size / (1024 * 1024);
  const sizeOk = sizeMb <= 50;
  if (!sizeOk) problems.push(`사이즈 초과: ${sizeMb.toFixed(2)} MB > 50 MB`);

  // (1b) 파일 수 — 5,000 이하
  const countOk = entries.length <= 5000;
  if (!countOk) problems.push(`파일 수 초과: ${entries.length} > 5000`);

  // (2) 시크릿·산출물 미포함
  const banned =
    /(^|\/)(\.env($|\.(?!example))|node_modules\/|__pycache__\/|\.git\/|secrets\/|LLM-reports\/)|\.(pem|key)$/;
  const bannedHits = entries.filter((e) => banned.test(e.name)).map((e) => e.name);
  if (bannedHits.length) problems.push(`시크릿/산출물 포함: ${bannedHits.join(", ")}`);

  // (3) UTF-8 flag(bit 11, 0x800) — 비ASCII 파일명에 필수
  const noFlag = entries
    .filter((e) => !(e.flag & 0x800) && [...e.nameBytes].some((b) => b > 127))
    .map((e) => e.name);
  if (noFlag.length) {
    problems.push(`UTF-8 flag 누락(한국어 파일명 ${noFlag.length}개): ${noFlag.slice(0, 5).join(", ")}`);
  }

  // (4) 파일명 component 200 byte 초과 — 서버에서 entry skip
  const tooLong = entries
    .flatMap((e) => e.name.split("/"))
    .filter((c) => Buffer.byteLength(c, "utf8") > 200);
  if (tooLong.length) {
    problems.push(`200 byte 초과 파일명: ${tooLong.slice(0, 5).map((c) => c.slice(0, 40)).join(", ")}`);
  }

  console.log(`[verify-zip] 대상: ${zipPath}`);
  console.log(`  (1) 사이즈        : ${sizeMb.toFixed(2)} MB / 50 MB — ${sizeOk ? "OK" : "초과"}`);
  console.log(`      파일 수       : ${entries.length} / 5000 — ${countOk ? "OK" : "초과"}`);
  console.log(`  (2) 시크릿·산출물 : ${bannedHits.length === 0 ? "OK (없음)" : `발견 ${bannedHits.length}건`}`);
  console.log(`  (3) UTF-8 flag    : ${noFlag.length === 0 ? "OK (비ASCII 전부 set)" : `누락 ${noFlag.length}건`}`);
  console.log(`  (4) 파일명 길이   : ${tooLong.length === 0 ? "OK (200 byte 이하)" : `초과 ${tooLong.length}건`}`);

  if (problems.length) {
    console.error("\n[verify-zip] 실패:");
    for (const p of problems) console.error(`  - ${p}`);
    return false;
  }
  console.log("\n[verify-zip] 4종 점검 모두 통과 — 제출 가능");
  return true;
};

// CLI 직접 실행 시
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  const zipPath = process.argv[2];
  if (!zipPath) {
    console.error('사용법: node scripts/verify-submission-zip.mjs "submission/제출용(20260604).zip"');
    process.exit(2);
  }
  process.exit(verifySubmissionZip(zipPath) ? 0 : 1);
}
