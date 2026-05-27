import type { NextConfig } from "next";

/** 사내망·폐쇄망 Docker 배포 — 빌드 시 `.next/standalone`만 런타임에 복사해 경량 이미지 구성. */
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
