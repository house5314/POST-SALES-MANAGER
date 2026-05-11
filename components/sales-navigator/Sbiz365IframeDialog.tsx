"use client";

import { BarChart3 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildSbizIframeSrc,
  getSbizIframeCertKeys,
  type SbizIframeKind,
} from "@/lib/sbiz-iframe-urls";

/** 소상공인365 3종 iframe을 Dialog·Tabs 로 열람합니다. */
export const Sbiz365IframeDialog = () => {
  const [open, setOpen] = useState(false);
  const keys = getSbizIframeCertKeys();
  const canOpen = Boolean(keys.detail || keys.storeStatus || keys.salesTrend);
  const [tab, setTab] = useState<SbizIframeKind>(() =>
    keys.detail ? "detail" : keys.storeStatus ? "storeStatus" : "salesTrend"
  );

  const detailSrc = keys.detail ? buildSbizIframeSrc("detail", keys.detail) : "";
  const storeSrc = keys.storeStatus
    ? buildSbizIframeSrc("storeStatus", keys.storeStatus)
    : "";
  const salesSrc = keys.salesTrend
    ? buildSbizIframeSrc("salesTrend", keys.salesTrend)
    : "";

  const missingHint = (
    <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground">
      이 탭용 인증키가 없습니다.{" "}
      <code className="rounded bg-muted px-1">NEXT_PUBLIC_SBIZ_CERT_*</code> 를{" "}
      <code className="rounded bg-muted px-1">.env.local</code> 에 맞춰 넣은 뒤 개발 서버를
      재시작하세요.
    </p>
  );

  return (
    <>
      <div className="rounded-none border border-dashed border-border/80 bg-muted/15 px-3 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-foreground">
              소상공인365 심층 상권분석
            </p>
            <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
              상세분석·업소현황·매출 추이를 외부 리포트(iframe)로 확인합니다.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={!canOpen}
            title={
              canOpen
                ? undefined
                : ".env.local 에 NEXT_PUBLIC_SBIZ_CERT_KEY 또는 탭별 NEXT_PUBLIC_SBIZ_CERT_* 를 설정하세요."
            }
            onClick={() => setOpen(true)}
          >
            <BarChart3 className="size-3.5" />
            소상공인 빅데이터 정밀 분석 열기
          </Button>
        </div>
        {!canOpen ? (
          <p className="mt-2 text-[0.65rem] text-amber-800 dark:text-amber-200">
            <code className="rounded bg-muted px-1">.env.local</code> 에{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_SBIZ_CERT_KEY</code> 또는 탭별{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_SBIZ_CERT_DETAIL</code> 등을 넣은 뒤{" "}
            <code className="rounded bg-muted px-1">npm run dev</code> 를 다시 실행하세요. (
            <code className="rounded bg-muted px-1">SBIZ_OPENAPI_*</code> 는 서버 전용이라 iframe 에는
            쓰이지 않습니다.)
          </p>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-5xl gap-4 overflow-hidden p-4 sm:p-6"
        >
          <DialogHeader className="shrink-0 space-y-1 text-left">
            <DialogTitle className="text-base normal-case tracking-tight">
              소상공인365 심층 상권분석
            </DialogTitle>
            <DialogDescription className="text-xs">
              탭마다 포털에서 발급받은 certKey 가 다를 수 있습니다. 외부 사이트 콘텐츠이므로 로딩에
              시간이 걸릴 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {canOpen ? (
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as SbizIframeKind)}
              className="flex min-h-0 flex-1 flex-col gap-3"
            >
              <TabsList
                variant="line"
                className="h-auto w-full shrink-0 flex-wrap justify-start gap-1 bg-transparent p-0"
              >
                <TabsTrigger value="detail" className="text-[0.7rem] sm:text-xs" disabled={!keys.detail}>
                  상세분석
                </TabsTrigger>
                <TabsTrigger
                  value="storeStatus"
                  className="text-[0.7rem] sm:text-xs"
                  disabled={!keys.storeStatus}
                >
                  업소현황
                </TabsTrigger>
                <TabsTrigger
                  value="salesTrend"
                  className="text-[0.7rem] sm:text-xs"
                  disabled={!keys.salesTrend}
                >
                  매출추이
                </TabsTrigger>
              </TabsList>
              <TabsContent value="detail" className="mt-0 min-h-0 flex-1 overflow-hidden">
                {detailSrc ? (
                  <iframe
                    title="소상공인365 상세분석"
                    src={detailSrc}
                    className="h-[600px] w-full rounded-md border-0 bg-muted/30"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : (
                  missingHint
                )}
              </TabsContent>
              <TabsContent
                value="storeStatus"
                className="mt-0 min-h-0 flex-1 overflow-hidden"
              >
                {storeSrc ? (
                  <iframe
                    title="소상공인365 업소현황"
                    src={storeSrc}
                    className="h-[600px] w-full rounded-md border-0 bg-muted/30"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : (
                  missingHint
                )}
              </TabsContent>
              <TabsContent
                value="salesTrend"
                className="mt-0 min-h-0 flex-1 overflow-hidden"
              >
                {salesSrc ? (
                  <iframe
                    title="소상공인365 매출 추이"
                    src={salesSrc}
                    className="h-[600px] w-full rounded-md border-0 bg-muted/30"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : (
                  missingHint
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
