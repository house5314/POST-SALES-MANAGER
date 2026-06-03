import { buildAdhesivePostalPricingParagraph } from "@/lib/postal-adhesive-pricing";
import type { PostalQuote } from "@/lib/postal-calc";
import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";
import { MOCK_PROPOSAL_PRINT_DISCLAIMER } from "@/lib/commercial-api/mock-sales-metrics";
import { buildSbizIframeSrc } from "@/lib/sbiz-iframe-urls";

type ProposalPrintExtras = {
  postalQuote?: PostalQuote;
  aptTargets?: { name: string; households: number }[];
  /** PRD5 부록 iframe용 소상공인365 certKey(NEXT_PUBLIC_SBIZ_CERT_KEY). */
  sbizCertKey?: string;
  /**
   * 화면 `/api/commercial/getEvlInfo`와 동일한 업력(제안서 템플릿 분기·헤더 표기).
   * 없으면 업력만 시연용 시드 추정으로 대체합니다.
   */
  evlForProposal?: { yearsInBusiness: number } | null;
  /**
   * 업종 필터의 대분류명(화면과 동일) — 제안서 템플릿이 공공 상가 `indsLclsCd`·명칭과 맞물리도록 전달합니다.
   */
  industryLargeLabel?: string | null;
};

type TemplateType = "A" | "B" | "C";
type TemplateContent = {
  type: TemplateType;
  title: string;
  diagnosis: string;
  strategy: string;
  swot: { s: string; w: string; o: string; t: string };
  roi: string;
  recommendedQty: number;
  conversionRate: string;
};

/** 문자열 내 HTML 특수문자를 이스케이프합니다. */
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/**
 * 상가(상권)정보 업종 대분류 선두 1자 — 음식·소매가 아닌 서비스 계열(생활밀착형 템플릿 C).
 * 세부 코드표는 공공데이터포털 「상가(상권)정보 업종코드」 자료와 대조합니다.
 */
const SBIZ_SERVICE_INDS_LCLS_FIRST = new Set([
  "L",
  "M",
  "N",
  "P",
  "Q",
  "R",
  "S",
]);

/** 업종 대분류명·`indsLclsCd`·소분류 키워드·업력으로 제안서 템플릿 유형을 선택합니다. */
const resolveTemplateType = (
  b: BusinessRow,
  yearsInBusiness: number,
  industryLargeLabel?: string | null
) => {
  const largeRaw = (industryLargeLabel ?? "").normalize("NFKC").trim();
  const firstClass = (b.indsLclsCd ?? "").trim().toUpperCase().charAt(0);
  const category = (b.category ?? "").toLowerCase();

  const isFoodLarge =
    largeRaw.includes("외식") ||
    largeRaw.includes("음식") ||
    firstClass === "I";
  const isRetailLarge =
    largeRaw.includes("도소매") ||
    largeRaw.includes("소매") ||
    firstClass === "G";
  const isServiceLarge =
    largeRaw.includes("서비스") ||
    (firstClass ? SBIZ_SERVICE_INDS_LCLS_FIRST.has(firstClass) : false);

  const isFoodCategory =
    category.includes("외식") ||
    category.includes("치킨") ||
    category.includes("카페") ||
    category.includes("음식");
  const isRetailCategory =
    category.includes("도소매") ||
    category.includes("소매") ||
    category.includes("의류") ||
    category.includes("귀금속");

  if (isFoodLarge || isFoodCategory) return "A";
  if (isRetailLarge || isRetailCategory) return "B";
  if (isServiceLarge) return "C";
  if (b.revenueTrend > 8) return "A";
  if (yearsInBusiness >= 5) return "B";
  return "C";
};

/** 평가정보가 없을 때만 사업자 식별값 기준으로 업력을 시연 추정합니다. */
const estimateYearsInBusiness = (b: BusinessRow) => {
  const seed = Array.from(`${b.id}:${b.name}`).reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0
  );
  return 1 + (seed % 9);
};

/**
 * 템플릿 타입별 컨설팅 문구와 SWOT/ROI를 구성합니다.
 * @param yearsInBusiness 템플릿 분기용 업력(평가정보 또는 추정)
 * @param industryLargeLabel 화면 업종 대분류명(있으면 템플릿이 필터 선택과 일치)
 */
const buildTemplateContent = (
  b: BusinessRow,
  m: MarketStatRow | undefined,
  mailQuantity: number,
  yearsInBusiness: number,
  industryLargeLabel?: string | null
): TemplateContent => {
  const type = resolveTemplateType(b, yearsInBusiness, industryLargeLabel);
  if (type === "A") {
    return {
      type,
      title: "Template A · 외식업 / 기회 창출형",
      diagnosis:
        "현재 해당 상권의 외식업 면적당 평균 매출은 지역 내 상위권으로 구매력이 매우 높으며, 배후에 풍부한 배달/포장 잠재 고객이 존재합니다.",
      strategy:
        "주말 가족 단위 배달 수요를 선점하기 위해, 치킨/외식 소비가 극대화되는 금요일 오후에 각 가정에 우편물이 도달하도록 일정을 설계합니다.",
      swot: {
        s: "풍부한 배후 수요",
        w: "초기/동네 인지도 부족",
        o: "배달/포장 수요 증가",
        t: "전단지 등 로컬 광고비 상승",
      },
      roi: `우편물 ${mailQuantity.toLocaleString("ko-KR")}부 발송 시 보수적 전환율 1%(약 ${Math.max(
        1,
        Math.round(mailQuantity * 0.01)
      )}건) 기준으로 즉각적인 매출 증대 효과가 기대됩니다.`,
      recommendedQty: mailQuantity,
      conversionRate: "1.0%",
    };
  }
  if (type === "B") {
    const qty = mailQuantity;
    return {
      type,
      title: "Template B · 도소매업 / 위기 극복형",
      diagnosis:
        "주변 상권의 오프라인 유동인구 변동 및 온라인 채널로의 고객 이탈 방어가 필요한 시점입니다. 고관여 상품 특성상 신뢰도와 매장 방문 유도가 가장 중요합니다.",
      strategy:
        "무작위 전단지가 아닌, 고급스러운 카탈로그 형태의 우편물을 활용한 VIP 타겟팅 및 신뢰 마케팅을 제안합니다.",
      swot: {
        s: "주거 밀집 상권",
        w: "오프라인 방문율 하락",
        o: "이벤트/명절 시즌",
        t: "온라인 채널로의 이탈 가속",
      },
      roi: `우편물 ${qty.toLocaleString("ko-KR")}부 발송 시 전환율 0.5%(약 ${Math.max(
        1,
        Math.round(qty * 0.005)
      )}건) 기준으로 매출 방어 효과가 기대됩니다.`,
      recommendedQty: qty,
      conversionRate: "0.5%",
    };
  }
  const qtyC = mailQuantity;
  return {
    type,
    title: "Template C · 서비스업 / 생활밀착형",
    diagnosis:
      "주거 밀집 지역과 인접해 있어 도보 생활권 내 유동 인구가 매우 풍부합니다. 동네 이웃들에게 매장을 확실히 각인시킬 오프라인 접점이 필요합니다.",
    strategy:
      "우편물 지참 시 혜택을 제공하는 실물 쿠폰 동봉형 홍보를 제안하며, 주말 방문 유도를 위해 목/금요일 도착을 권장합니다.",
    swot: {
      s: "도보 생활권 내 위치",
      w: "디지털 채널로 동네 타겟팅 한계",
      o: "지역 내 소비 심리 회복",
      t: "광고 채널 파편화",
    },
    roi: `우편물 ${qtyC.toLocaleString("ko-KR")}부 발송 시 쿠폰 회수율 2%(약 ${Math.max(
      1,
      Math.round(qtyC * 0.02)
    )}건) 기준으로 신규 단골 확보가 기대됩니다.`,
    recommendedQty: qtyC,
    conversionRate: "2.0%",
  };
};

/**
 * 팝업 차단(Vercel 배포·모바일 Safari 등) 없이 인쇄 대화상자를 띄웁니다.
 * @returns 성공 시 true
 */
const printHtmlViaHiddenIframe = (html: string): boolean => {
  if (typeof document === "undefined") return false;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "제안서 인쇄 미리보기");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* noop */
    }
  };
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      window.setTimeout(cleanup, 800);
    }
  }, 1500);
  return true;
};

/** 보조: 새 탭에서 미리보기 후 인쇄(팝업 허용 시). */
const printHtmlViaPopup = (html: string): boolean => {
  const w = window.open("about:blank", "_blank", "noopener,noreferrer");
  if (!w) return false;
  try {
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    window.setTimeout(() => {
      w.print();
    }, 1500);
    return true;
  } catch {
    try {
      w.close();
    } catch {
      /* noop */
    }
    return false;
  }
};

/** 제안서 인쇄/PDF 출력 문서를 PRD3 구조로 생성합니다. `extras.evlForProposal`이 있으면 업력·템플릿 분기가 화면 평가정보와 동일합니다. */
export const openProposalPrint = (
  b: BusinessRow,
  m: MarketStatRow | undefined,
  mailQuantity: number,
  industryAvgStat?: { avgSalesAmount: number; avgSalesPerArea: number } | null,
  extras?: ProposalPrintExtras | null
) => {
  const yearsFromEvl = extras?.evlForProposal?.yearsInBusiness;
  const hasEvlYears =
    yearsFromEvl != null &&
    Number.isFinite(yearsFromEvl) &&
    yearsFromEvl >= 0;
  const yearsInBusinessForTemplate = hasEvlYears
    ? Math.max(0, Math.floor(yearsFromEvl))
    : estimateYearsInBusiness(b);
  const tenureSourceLabel = hasEvlYears
    ? "평가정보 API(화면과 동일)"
    : "평가정보 미수신·시연 추정";

  const template = buildTemplateContent(
    b,
    m,
    mailQuantity,
    yearsInBusinessForTemplate,
    extras?.industryLargeLabel ?? null
  );
  const seed = Array.from(`${b.id}:${b.regionCode}`).reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0
  );
  const fallbackHouseholds = 1800 + (seed % 6800);
  const fallbackFloatingPop = 4000 + (seed % 18000);
  const resolvedHouseholds = m?.dongHouseholds ?? fallbackHouseholds;
  const resolvedFloatingPop = m?.floatingPop ?? fallbackFloatingPop;
  const resolvedAreaSalesPerUnit =
    industryAvgStat?.avgSalesPerArea ??
    Math.round((resolvedFloatingPop / Math.max(1, resolvedHouseholds)) * 10000);
  const diagnosisRows = {
    areaSales: `${resolvedAreaSalesPerUnit.toLocaleString("ko-KR")}원`,
    floatingPop: `${resolvedFloatingPop.toLocaleString("ko-KR")}명`,
    households: `${resolvedHouseholds.toLocaleString("ko-KR")}세대`,
  };
  const adhesivePricingText = buildAdhesivePostalPricingParagraph(mailQuantity);

  const aptTargetsRows =
    extras?.aptTargets?.length ?
      extras.aptTargets
        .map(
          (t) =>
            `<tr><td>${escapeHtml(t.name)}</td><td style="text-align:right">${t.households.toLocaleString("ko-KR")}세대</td></tr>`
        )
        .join("")
      : "";

  const sbizKey = extras?.sbizCertKey?.trim() ?? "";
  const sbizAppendixSrc = sbizKey ? buildSbizIframeSrc("detail", sbizKey) : "";
  const sbizAppendixSection = sbizAppendixSrc
    ? `<section class="sbiz-appendix" aria-label="소상공인365 상세분석 부록">
      <h2>부록: 소상공인365 데이터 기반 정밀 상권 상세분석 리포트</h2>
      <p class="sbiz-appendix-note">아래는 소상공인365 빅데이터 포털 상세분석 화면입니다. 인쇄/PDF 저장 시 브라우저가 외부 콘텐츠를 함께 렌더링합니다.</p>
      <div class="sbiz-appendix-frame-wrap">
        <iframe src="${escapeHtml(sbizAppendixSrc)}" title="소상공인365 상세분석" class="sbiz-appendix-iframe"></iframe>
      </div>
    </section>`
    : "";

  const title = `생활정보홍보우편 맞춤형 제안서 — ${b.name}`;
  const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8fafc; font-family: "Malgun Gothic", sans-serif; color: #1e293b; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 18mm 16mm; }
    .header { border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 14px; }
    .title { margin: 0; font-size: 20px; color: #1e3a5f; }
    .subtitle { margin: 6px 0 0; font-size: 12px; color: #64748b; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-top: 10px; font-size: 12px; }
    .section { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 12px; }
    .section h2 { margin: 0 0 8px; font-size: 14px; color: #1e3a5f; }
    .section p { margin: 6px 0; font-size: 12px; line-height: 1.55; }
    .kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
    .kpi > div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; font-size: 11px; }
    .kpi strong { display: block; margin-top: 4px; color: #0f172a; font-size: 13px; }
    .swot { margin: 8px 0 0 0; padding-left: 18px; }
    .swot li { margin: 4px 0; font-size: 12px; }
    .footer { margin-top: 14px; padding: 10px; border: 1px dashed #94a3b8; background: #f8fafc; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 10px; margin-left: 6px; }
    .muted { color: #64748b; font-size: 11px; }
    @page { size: A4; margin: 10mm; }
    .sbiz-appendix {
      break-before: page;
      page-break-before: always;
      padding-top: 12mm;
    }
    .sbiz-appendix h2 {
      margin: 0 0 8px;
      font-size: 15px;
      color: #1e3a5f;
    }
    .sbiz-appendix-note {
      margin: 0 0 10px;
      font-size: 11px;
      color: #64748b;
    }
    .sbiz-appendix-frame-wrap {
      width: 800px;
      max-width: 100%;
      margin: 0 auto;
    }
    .sbiz-appendix-iframe {
      width: 800px;
      height: 1100px;
      max-width: 100%;
      border: 0;
      border-radius: 6px;
      display: block;
      background: #f1f5f9;
    }
    @media print {
      body { background: #fff; }
      .page { margin: 0; width: auto; min-height: auto; padding: 0; }
      .sbiz-appendix-iframe {
        width: 100% !important;
        max-width: 190mm !important;
        height: 270mm !important;
        min-height: 270mm !important;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <h1 class="title">생활정보홍보우편 맞춤형 컨설팅 리포트</h1>
      <p class="subtitle">제안서 유형: ${template.title}<span class="badge">자동 분기</span></p>
      <div style="margin:10px 0 12px;padding:10px 12px;border:1px solid #d97706;background:#fffbeb;font-size:11px;line-height:1.5;color:#78350f;border-radius:4px;">
        ${escapeHtml(MOCK_PROPOSAL_PRINT_DISCLAIMER)}
      </div>
      <div class="grid">
        <div><strong>상호명</strong> ${escapeHtml(b.name || "-")}</div>
        <div><strong>업종</strong> ${escapeHtml(b.category || "-")}</div>
        <div><strong>주소</strong> ${escapeHtml(b.address || "-")}</div>
        <div><strong>상권코드</strong> ${escapeHtml(m?.regionCode ?? b.regionCode ?? "-")}</div>
        <div><strong>업력</strong> ${yearsInBusinessForTemplate}년</div>
        <div><strong>업력 출처</strong> ${escapeHtml(tenureSourceLabel)}</div>
      </div>
    </header>

    <section class="section">
      <h2>Section 1. 상권 데이터 진단</h2>
      <p>${template.diagnosis}</p>
      ${
        m?.metricsSourceLabel
          ? `<p class="muted" style="margin:8px 0 0;font-size:11px;">배후 세대·유동인구 등 KPI 출처: ${escapeHtml(m.metricsSourceLabel)}</p>`
          : ""
      }
      <div class="kpi">
        <div>면적당 평균매출<strong>${diagnosisRows.areaSales}</strong></div>
        <div>유동 인구<strong>${diagnosisRows.floatingPop}</strong></div>
        <div>배후 세대<strong>${diagnosisRows.households}</strong></div>
      </div>
    </section>

    <section class="section">
      <h2>Section 2. 맞춤형 홍보 전략 및 SWOT</h2>
      <p><strong>전략 제안:</strong> ${template.strategy}</p>
      <ul class="swot">
        <li><strong>S</strong> ${template.swot.s}</li>
        <li><strong>W</strong> ${template.swot.w}</li>
        <li><strong>O</strong> ${template.swot.o}</li>
        <li><strong>T</strong> ${template.swot.t}</li>
      </ul>
    </section>

    <section class="section">
      <h2>Section 3. 예상 ROI (투자 수익 시뮬레이션)</h2>
      <p>${template.roi}</p>
      <p style="margin-top:10px;">
        <strong>우체국 요금 기준(접착형)</strong><br />
        ${escapeHtml(adhesivePricingText)}
      </p>
      <p class="muted" style="margin-top:8px;">
        추천 수량 <strong>${template.recommendedQty.toLocaleString("ko-KR")}부</strong> ·
        기준 전환율 <strong>${template.conversionRate}</strong>
        (상단 ROI는 시뮬레이션 가정이며, 실제 청구는 우체국 확정 견적·옵션에 따릅니다.)
      </p>
      ${
        aptTargetsRows
          ? `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;">
      <thead><tr><th style="text-align:left;border-bottom:1px solid #e2e8f0;padding:4px;">타겟 단지</th><th style="text-align:right;border-bottom:1px solid #e2e8f0;padding:4px;">세대수</th></tr></thead>
      <tbody>${aptTargetsRows}</tbody>
    </table>`
          : ""
      }
    </section>

    <footer class="footer">
      <h2 style="margin:0 0 8px;font-size:13px;color:#1e3a5f;">우체국 생활정보홍보우편 특장점</h2>
      <p style="margin:0 0 6px;">
        <strong>100% 도달 보장:</strong> 전단지 무단 투기와 달리, 우체국 집배원이 각 세대 우편함에 직접 투함하여 도달률과 신뢰도를 높입니다.
      </p>
      <p style="margin:0 0 6px;">
        <strong>예측 가능한 합리적 비용:</strong> 우체국 접수 시 최대 30% 요금 감액 혜택으로 마케팅 예산을 효율적으로 운용할 수 있습니다.
      </p>
      <p class="muted" style="margin:8px 0 0;">본 문서는 우체국 생활정보홍보우편 B2B 영업을 위한 맞춤형 컨설팅 데모 리포트입니다.</p>
    </footer>
  </main>
  ${sbizAppendixSection}
</body>
</html>`;

  if (printHtmlViaHiddenIframe(fullHtml)) return;
  if (printHtmlViaPopup(fullHtml)) return;

  window.alert(
    "인쇄 창을 열 수 없습니다. 브라우저 설정에서 이 사이트의 팝업을 허용한 뒤 다시 시도하거나, 다른 브라우저에서 열어 주세요."
  );
};
