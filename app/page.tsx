import { Suspense } from "react";

import { SalesNavigatorDashboard } from "@/components/sales-navigator/SalesNavigatorDashboard";

/** 메인: PRD 기반 스마트 영업 네비게이터 대시보드 */
export default function Home() {
  return (
    <main className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-background px-4 text-sm text-muted-foreground">
            화면을 불러오는 중입니다…
          </div>
        }
      >
        <SalesNavigatorDashboard />
      </Suspense>
    </main>
  );
}