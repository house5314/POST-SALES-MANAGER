# 📄 [PRD] 우체국 B2B 스마트 영업 네비게이터 v4.0
**부제: 소상공인365 빅데이터 iframe 3종 통합 및 PDF 제안서 고도화**

## 1. Task Overview (작업 개요)
본 업데이트는 외부 기관(소상공인365)으로부터 발급받은 3종의 상권 분석 iframe 화면(상세분석, 업소현황, 매출 추이)을 기존 대시보드에 통합하는 작업이다. 
단순히 화면에 보여주는 것을 넘어, 영업사원이 고객에게 제공하는 **최종 PDF 제안서(인쇄 화면)의 부록(Appendix)으로 '상세분석' iframe 화면이 온전히 출력되도록 인쇄용 CSS를 최적화**하는 것이 핵심 목표다.

## 2. Iframe Endpoints Definition (데이터 소스 정의)
환경 변수(`NEXT_PUBLIC_SBIZ_CERT_KEY`)를 통해 발급받은 키를 주입하여 3개의 iframe URL을 동적으로 구성한다.

1. **상세분석:** `https://bigdata.sbiz.or.kr/#/openApi/slsIdex?certKey={certKey}`
2. **업소현황:** `https://bigdata.sbiz.or.kr/#/openApi/storStus?certKey={certKey}`
3. **매출액 추이:** `https://bigdata.sbiz.or.kr/#/openApi/storSlsIdex?certKey={certKey}`
*(※ URL의 해시(`#/openApi/...`) 뒷부분은 실제 소상공인365 명세에 맞춰 변동될 수 있으므로 유연하게 적용할 것)*

## 3. UI/UX Architecture (화면 구현 명세)

### 🟡 Center Panel: `<InsightCenterPanel />` 고도화
기존의 영업 멘트 및 요금 계산기 하단에 **[📊 소상공인365 심층 상권분석]** 섹션을 추가한다. iframe 화면이 좁은 영역에서 깨지지 않도록 아래 방식을 적용한다.

* **Trigger Button:** "소상공인 빅데이터 정밀 분석 열기" 버튼 추가.
* **Modal / Dialog UI:** 버튼 클릭 시 화면 중앙에 넓은 `Dialog`(Shadcn UI 활용) 창을 띄운다. 너비는 `max-w-5xl` 수준으로 넉넉하게 확보한다.
* **Tabs UI 적용:** Dialog 내부에는 Shadcn UI의 `Tabs` 컴포넌트를 사용하여 3가지 데이터를 탭으로 구분한다.
  * `[상세분석]` 탭 (Default) -> 상세분석 iframe 렌더링
  * `[업소현황]` 탭 -> 업소현황 iframe 렌더링
  * `[매출추이]` 탭 -> 매출추이 iframe 렌더링
* **Iframe 스타일링:** `w-full h-[600px] border-0 rounded-md` 클래스를 적용하여 깔끔하게 임베딩한다.

### 🖨️ PDF Proposal: `<ProposalDocument />` 고도화 (핵심 요구사항)
기존의 제안서 출력 화면(`window.print()`로 구동되는 인쇄용 뷰)의 가장 마지막 부분에 **[부록: 소상공인365 데이터 기반 정밀 상권 상세분석 리포트]** 페이지를 추가한다.

* **Iframe 삽입:** 출력용 컴포넌트 최하단에 '상세분석' iframe을 고정 크기(예: `w-[800px] h-[1100px]`, A4 비율)로 삽입한다.
* **Page Break:** 인쇄 시 기존 제안서 내용(전략, 요금견적 등)과 겹치지 않고 새 페이지에 출력되도록 CSS `break-before: page;` (또는 `page-break-before: always;`)를 iframe 컨테이너에 적용한다.

## 4. 🚨 Technical Constraints & Print Optimization (기술 제약 및 인쇄 최적화)
외부 iframe은 Cross-Origin 문제로 인해 `html2canvas`나 `jsPDF` 같은 JS 캡처 라이브러리로 렌더링할 수 없다. 반드시 브라우저의 네이티브 인쇄 엔진을 타겟으로 개발해야 한다.

* **`@media print` 최적화:** * iframe이 인쇄 화면에서 잘리거나 스크롤이 생기지 않도록 `@media print` 블록 내에서 iframe의 `height`를 충분히 길게 고정한다.
  * 인쇄 화면에서는 메인 대시보드(지도, 리스트 등)는 완벽히 `display: none;` 처리되고, 오직 `<ProposalDocument />`만 보이도록 보장한다.
* **로딩 지연 고려:** 제안서 생성 버튼을 누르면, iframe 내부 콘텐츠가 완전히 로드될 수 있도록 약간의 딜레이(예: `setTimeout` 1.5초) 후 `window.print()`가 호출되도록 로직을 보강한다.

## 5. Cursor AI Action Directives (실행 지시어)
1. `.env.local`에 `NEXT_PUBLIC_SBIZ_CERT_KEY`를 추가할 수 있도록 세팅하라.
2. `InsightCenterPanel.tsx`에 Shadcn `Dialog`와 `Tabs`를 활용하여 3종의 iframe을 열람할 수 있는 UI를 구축하라.
3. 제안서 출력을 담당하는 컴포넌트(예: `open-proposal-print.ts` 또는 인쇄용 레이아웃 페이지)의 후반부에 **상세분석 iframe**을 추가하라.
4. CSS 파일(또는 Tailwind 클래스)을 수정하여, 인쇄 시(`print` 환경) 해당 iframe이 새 A4 용지 페이지에 꽉 차게 출력되도록 `page-break` 설정과 크기를 최적화하라.