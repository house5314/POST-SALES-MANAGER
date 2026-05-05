import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

type SwotBlock = { s: string; w: string; o: string; t: string };

const buildSwot = (
  b: BusinessRow,
  m: MarketStatRow | undefined
): SwotBlock => ({
  s: m
    ? `인근 ${m.housingCount.toLocaleString("ko-KR")}세대 규모의 공동주택·상권 밀집.`
    : "상권·주거 밀집 지역.",
  w:
    b.revenueTrend < 0
      ? `전월 대비 매출 ${b.revenueTrend}% 하락(위기 신호).`
      : "경쟁 채널(디지털) 의존도 점검 필요.",
  o: m
    ? `신축·입주 수요, ${m.housingGrowthPct}% 공동주택 증가율(기회).`
    : "지역 수요 회복·이벤트 시즌.",
  t: m
    ? `피크 ${m.peakTime}·유동 ${m.floatingPop.toLocaleString("ko-KR")}명 수준의 경쟁·집중도.`
    : "광고비 상승·채널 다변화.",
});

/** PRD 5.3: SWOT·배송 시점·우체국 강점이 포함된 제안서(인쇄→PDF) */
export const openProposalPrint = (
  b: BusinessRow,
  m: MarketStatRow | undefined,
  mailQuantity: number
) => {
  const swot = buildSwot(b, m);
  const w = window.open("", "_blank", "width=800,height=1100");
  if (!w) {
    return;
  }
  const title = `생활정보홍보우편 제안 — ${b.name}`;
  w.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: "Malgun Gothic", sans-serif; padding: 32px; color: #1e293b; line-height: 1.6; }
    h1 { font-size: 1.25rem; color: #1e3a5f; border-bottom: 2px solid #c41e3a; padding-bottom: 8px; }
    h2 { font-size: 0.95rem; color: #1e3a5f; margin-top: 24px; }
    .muted { color: #64748b; font-size: 0.85rem; }
    ul { margin: 8px 0 0 20px; }
    .highlight { background: #f1f5f9; padding: 12px 16px; margin-top: 12px; border-left: 4px solid #3d7a5c; }
    .cta { color: #c41e3a; font-weight: 600; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="muted">${b.address} · ${b.category}</p>
  <h2>SWOT 요약</h2>
  <ul>
    <li><strong>S</strong> ${swot.s}</li>
    <li><strong>W</strong> ${swot.w}</li>
    <li><strong>O</strong> ${swot.o}</li>
    <li><strong>T</strong> ${swot.t}</li>
  </ul>
  <h2>추천 발송·도착 시점</h2>
  <p>유동인구가 많은 요일을 고려해 <strong>금요일 도착</strong>을 권장합니다. (PRD 기준 예시)</p>
  <h2>우편 발송 수량(안)</h2>
  <p class="highlight">AI 추천 수량: 약 <strong>${mailQuantity.toLocaleString("ko-KR")}</strong>부 (행정동·신축 세대수 반영)</p>
  <h2>우체국 채널 강점</h2>
  <p>
    <span class="cta">100% 도달</span>을 지향하는 집배원 직접 배달, 생활정보홍보우편 요금 <span class="cta">최대 30% 할인</span> 등
    민간 대비 예측 가능한 비용 구조를 안내드립니다.
  </p>
  <p class="muted" style="margin-top:40px;">본 문서는 데모 목적으로 생성되었습니다.</p>
</body>
</html>`);
  w.document.close();
  w.focus();
  w.print();
};
