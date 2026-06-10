/**
 * 의존성 없는 순수 Node ZIP 생성기 — PKWARE UTF-8 flag(bit 11, 0x800)를 모든 entry 에 강제.
 * Windows `tar -a`(bsdtar)·Compress-Archive 가 한국어 파일명을 CP949/flag 누락으로
 * 저장하는 문제를 피하기 위한 제출 패키징 전용 구현 (deflate 압축, ZIP32).
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";

/** CRC32 테이블(IEEE 802.3 다항식)을 1회 생성합니다. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** 버퍼의 CRC32 체크섬을 계산합니다. */
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

/** Date 를 ZIP(MS-DOS) 시각 필드 쌍으로 변환합니다. */
const toDosDateTime = (date) => {
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
};

/** 디렉터리 하위 모든 파일의 상대경로(슬래시 구분)를 수집합니다. */
const collectRelativeFiles = (root) => {
  const out = [];
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(abs, relPath);
      else if (entry.isFile()) out.push(relPath);
    }
  };
  walk(root, "");
  return out.sort();
};

/**
 * 디렉터리 전체를 ZIP 으로 묶습니다. 모든 entry 에 UTF-8 flag(0x800)를 설정합니다.
 * @param {string} sourceDir 압축할 루트 디렉터리
 * @param {string} zipPath 생성할 ZIP 파일 경로
 * @returns {{ fileCount: number, totalBytes: number }} entry 수·압축 후 크기
 */
export const createUtf8Zip = (sourceDir, zipPath) => {
  const files = collectRelativeFiles(sourceDir);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const rel of files) {
    const abs = join(sourceDir, rel);
    const data = readFileSync(abs);
    const { dosTime, dosDate } = toDosDateTime(statSync(abs).mtime);
    const nameBytes = Buffer.from(rel, "utf8");
    const crc = crc32(data);
    const deflated = deflateRawSync(data, { level: 9 });
    // deflate 가 오히려 커지면 store(무압축) 사용
    const useDeflate = deflated.length < data.length;
    const payload = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const FLAG_UTF8 = 0x800;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(FLAG_UTF8, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28); // extra len
    localParts.push(local, nameBytes, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(FLAG_UTF8, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    // extra·comment·disk·내부속성·외부속성 = 0 (alloc 기본값)
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBytes);

    offset += 30 + nameBytes.length + payload.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  const zipBuf = Buffer.concat([...localParts, centralBuf, eocd]);
  writeFileSync(zipPath, zipBuf);
  return { fileCount: files.length, totalBytes: zipBuf.length };
};
