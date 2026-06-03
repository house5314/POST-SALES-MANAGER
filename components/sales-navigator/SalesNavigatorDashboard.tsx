"use client";

import { LayoutDashboard, ListFilter, MessageSquare } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FilterSidebar,
  type RevenueFilter,
} from "@/components/sales-navigator/FilterSidebar";
import { InsightCenterPanel } from "@/components/sales-navigator/InsightCenterPanel";
import { NaverMapPanel } from "@/components/sales-navigator/NaverMapPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  IndustryMediumItem,
  IndustrySmallItem,
} from "@/lib/commercial-api/semas-store";
import type { MolitAptComplex } from "@/lib/molit/types";
import { buildMockEvlInfo } from "@/lib/commercial-api/mock-sales-metrics";
import { calculatePostalQuote } from "@/lib/postal-calc";
import {
  buildRegionSearchQuery,
  formatSelectedDongAddress,
  isEupMyeonDongName,
  parseRegionLabel,
  regionLabelMatchesSelection,
} from "@/lib/sales/region-hierarchy";
import {
  buildDemoBusinessRows,
  buildDemoIndustryAvgStat,
  buildDemoMarketByRegion,
  buildDemoMolitApts,
  DEMO_DONG_OPTIONS,
  DEMO_IND_MEDIUM,
  DEMO_IND_SMALL,
  DEMO_INDUSTRY_LARGE,
  demoAnchorForDongCode,
  isSalesNavigatorDemoMode,
} from "@/lib/sales/demo-sales-navigator-data";
import { resolveLegalDongForMolit } from "@/lib/sales/resolve-legal-dong-for-molit";
import { isPriorityLead } from "@/lib/sales/priority-lead";
import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";
import { fetchPublicApiJson } from "@/lib/api/public-api-fetch";
import { DATA_GOVERNANCE_FOOTER } from "@/lib/operations/governance-copy";
import {
  SAFE_MODE_BANNER_DETAIL,
  SAFE_MODE_BANNER_TITLE,
  SAFE_MODE_DEFAULT_MAIL_QTY,
} from "@/lib/operations/safe-mode";

type IndsLarge = { indsLclsCd: string; indsLclsNm: string };
type Option = { value: string; label: string };

/** 상가 목록 조회 후 첫 업체 자동 포커스 시 축척(약 300m 수준, 네이버 NCP 줌 14 전후). */
const ZOOM_AFTER_AUTO_FIRST_STORE = 14;
/** 목록·지도에서 업체를 직접 선택했을 때 줌(약 30m 체감, 네이버 NCP 줌 18 전후). */
const ZOOM_AFTER_MANUAL_BUSINESS_SELECT = 18;
type EvlInfo = {
  gender: "남성" | "여성";
  ageGroup: string;
  establishedYear: number;
  yearsInBusiness: number;
};
type IndustryAvgStat = {
  endpoint: string;
  avgSalesAmount: number;
  avgSalesPerArea: number;
};
const SIDO_LIST: Option[] = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
].map((name) => ({ value: name, label: name }));
const SIGUNGU_DATA: Record<string, string[]> = {
  서울특별시: [
    "종로구",
    "중구",
    "용산구",
    "성동구",
    "광진구",
    "동대문구",
    "중랑구",
    "성북구",
    "강북구",
    "도봉구",
    "노원구",
    "은평구",
    "서대문구",
    "마포구",
    "양천구",
    "강서구",
    "구로구",
    "금천구",
    "영등포구",
    "동작구",
    "관악구",
    "서초구",
    "강남구",
    "송파구",
    "강동구",
  ],
  부산광역시: [
    "중구",
    "서구",
    "동구",
    "영도구",
    "부산진구",
    "동래구",
    "남구",
    "북구",
    "해운대구",
    "사하구",
    "금정구",
    "강서구",
    "연제구",
    "수영구",
    "사상구",
    "기장군",
  ],
  대구광역시: [
    "중구",
    "동구",
    "서구",
    "남구",
    "북구",
    "수성구",
    "달서구",
    "달성군",
    "군위군",
  ],
  인천광역시: [
    "중구",
    "동구",
    "미추홀구",
    "연수구",
    "남동구",
    "부평구",
    "계양구",
    "서구",
    "강화군",
    "옹진군",
  ],
  광주광역시: ["동구", "서구", "남구", "북구", "광산구"],
  대전광역시: ["동구", "중구", "서구", "유성구", "대덕구"],
  울산광역시: ["중구", "남구", "동구", "북구", "울주군"],
  세종특별자치시: ["세종시"],
  경기도: [
    "수원시",
    "성남시",
    "의정부시",
    "안양시",
    "부천시",
    "광명시",
    "평택시",
    "동두천시",
    "안산시",
    "고양시",
    "과천시",
    "구리시",
    "남양주시",
    "오산시",
    "시흥시",
    "군포시",
    "의왕시",
    "하남시",
    "용인시",
    "파주시",
    "이천시",
    "안성시",
    "김포시",
    "화성시",
    "광주시",
    "양주시",
    "포천시",
    "여주시",
    "연천군",
    "가평군",
    "양평군",
  ],
  강원특별자치도: [
    "춘천시",
    "원주시",
    "강릉시",
    "동해시",
    "태백시",
    "속초시",
    "삼척시",
    "홍천군",
    "횡성군",
    "영월군",
    "평창군",
    "정선군",
    "철원군",
    "화천군",
    "양구군",
    "인제군",
    "고성군",
    "양양군",
  ],
  충청북도: [
    "청주시",
    "충주시",
    "제천시",
    "보은군",
    "옥천군",
    "영동군",
    "증평군",
    "진천군",
    "괴산군",
    "음성군",
    "단양군",
  ],
  충청남도: [
    "천안시",
    "공주시",
    "보령시",
    "아산시",
    "서산시",
    "논산시",
    "계룡시",
    "당진시",
    "금산군",
    "부여군",
    "서천군",
    "청양군",
    "홍성군",
    "예산군",
    "태안군",
  ],
  전북특별자치도: [
    "전주시",
    "군산시",
    "익산시",
    "정읍시",
    "남원시",
    "김제시",
    "완주군",
    "진안군",
    "무주군",
    "장수군",
    "임실군",
    "순창군",
    "고창군",
    "부안군",
  ],
  전라남도: [
    "목포시",
    "여수시",
    "순천시",
    "나주시",
    "광양시",
    "담양군",
    "곡성군",
    "구례군",
    "고흥군",
    "보성군",
    "화순군",
    "장흥군",
    "강진군",
    "해남군",
    "영암군",
    "무안군",
    "함평군",
    "영광군",
    "장성군",
    "완도군",
    "진도군",
    "신안군",
  ],
  경상북도: [
    "포항시",
    "경주시",
    "김천시",
    "안동시",
    "구미시",
    "영주시",
    "영천시",
    "상주시",
    "문경시",
    "경산시",
    "의성군",
    "청송군",
    "영양군",
    "영덕군",
    "청도군",
    "고령군",
    "성주군",
    "칠곡군",
    "예천군",
    "봉화군",
    "울진군",
    "울릉군",
  ],
  경상남도: [
    "창원시",
    "진주시",
    "통영시",
    "사천시",
    "김해시",
    "밀양시",
    "거제시",
    "양산시",
    "의령군",
    "함안군",
    "창녕군",
    "고성군",
    "남해군",
    "하동군",
    "산청군",
    "함양군",
    "거창군",
    "합천군",
  ],
  제주특별자치도: ["제주시", "서귀포시"],
};

/** PRD 레이아웃 + 공공 상가 API 오버레이(공모전 제출용 · DB 없음). */
export const SalesNavigatorDashboard = () => {
  const searchParams = useSearchParams();
  const isDemo = useMemo(
    () => isSalesNavigatorDemoMode(searchParams.get("demo")),
    [searchParams]
  );
  const demoLayoutSeededRef = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID?.trim();

  const [overlayStores, setOverlayStores] = useState<BusinessRow[]>([]);
  const [marketByRegion, setMarketByRegion] = useState<
    Record<string, MarketStatRow>
  >({});
  /** 상권 요약 fetch 응답이 늦게 도착해 이전 목록에 덮어쓰이지 않도록 순번을 맞춥니다. */
  const marketStatsFetchSeq = useRef(0);
  const [marketStatsLoading, setMarketStatsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  /** 공공 API 장애·지연 시 기본 견적(1,200부)으로 전환합니다. */
  const [safeMode, setSafeMode] = useState(false);
  /** 타임아웃·캐시 재사용 등 부가 안내(오류 배너와 별도). */
  const [apiNotice, setApiNotice] = useState<string | null>(null);
  const [evlInfo, setEvlInfo] = useState<EvlInfo | null>(null);
  /** `evlInfo`가 어느 `business.id` 조회 결과인지 표시해, 선택이 바뀐 뒤에도 이전 평가정보가 노출되지 않게 합니다. */
  const [evlFetchedForId, setEvlFetchedForId] = useState<string | null>(null);
  /** 평가정보 fetch 응답 시점의 선택 업체 id(꼬인 응답 폐기용). */
  const evlTargetIdRef = useRef<string | null>(null);
  const [industryAvgStat, setIndustryAvgStat] = useState<IndustryAvgStat | null>(
    null
  );

  const [indsLargeOptions, setIndsLargeOptions] = useState<IndsLarge[]>([]);
  const [indsLclsFilter, setIndsLclsFilter] = useState<string | "all">("all");
  const [selectedSido, setSelectedSido] = useState("");
  const [selectedSigungu, setSelectedSigungu] = useState("");
  const [selectedDong, setSelectedDong] = useState("");
  const [selectedIndLarge, setSelectedIndLarge] = useState("");
  const [selectedIndMedium, setSelectedIndMedium] = useState("");
  const [selectedIndSmall, setSelectedIndSmall] = useState("");
  const [sigunguOptions, setSigunguOptions] = useState<Option[]>([]);
  const [dongOptions, setDongOptions] = useState<Option[]>([]);
  const [indMediumOptions, setIndMediumOptions] = useState<Option[]>([]);
  const [indSmallOptions, setIndSmallOptions] = useState<Option[]>([]);

  /** 설문 링크 `?demo=1` — 레이아웃·필터 옵션만 시드하고 상가는 로컬 빌더로 채웁니다. */
  useEffect(() => {
    if (!isDemo) {
      demoLayoutSeededRef.current = false;
      return;
    }
    if (demoLayoutSeededRef.current) return;
    demoLayoutSeededRef.current = true;
    setApiError(null);
    setIndsLargeOptions(DEMO_INDUSTRY_LARGE.map((x) => ({ ...x })));
    setSelectedSido("서울특별시");
    setSelectedSigungu("종로구");
    setSigunguOptions(
      (SIGUNGU_DATA["서울특별시"] ?? []).map((name) => ({
        value: name,
        label: name,
      }))
    );
    setDongOptions([...DEMO_DONG_OPTIONS]);
    setSelectedDong(DEMO_DONG_OPTIONS[0]!.value);
    setSelectedIndLarge("I");
    setSelectedIndMedium("I01");
    setSelectedIndSmall("I0111");
    setIndsLclsFilter("all");
  }, [isDemo]);

  /** 데모 모드에서 중·소분류 드롭다운을 API 대신 고정 목록으로 채웁니다. */
  useEffect(() => {
    if (!isDemo || !selectedIndLarge) return;
    const mo = DEMO_IND_MEDIUM[selectedIndLarge] ?? [];
    queueMicrotask(() => {
      setIndMediumOptions(mo);
      setSelectedIndMedium((prev) =>
        mo.some((x) => x.value === prev) ? prev : mo[0]?.value ?? ""
      );
    });
  }, [isDemo, selectedIndLarge]);

  useEffect(() => {
    if (!isDemo || !selectedIndMedium) return;
    const so = DEMO_IND_SMALL[selectedIndMedium] ?? [];
    queueMicrotask(() => {
      setIndSmallOptions(so);
      setSelectedIndSmall((prev) =>
        so.some((x) => x.value === prev) ? prev : so[0]?.value ?? ""
      );
    });
  }, [isDemo, selectedIndMedium]);

  useEffect(() => {
    if (isDemo) return;
    void (async () => {
      try {
        const res = await fetch("/api/commercial/industry-large");
        const data = (await res.json()) as {
          ok: boolean;
          items?: IndsLarge[];
          message?: string;
        };
        if (data.ok && data.items?.length) {
          setIndsLargeOptions(data.items);
        } else if (!data.ok && data.message) {
          if (process.env.NODE_ENV === "development") {
            console.error("[공공 API · 업종 대분류]", data.message);
          }
        }
      } catch (e) {
        /* 업종 API 실패 시 필터만 비움 */
        if (process.env.NODE_ENV === "development") {
          console.warn("[공공 API · 업종 대분류] 네트워크 또는 파싱 오류", e);
        }
      }
    })();
  }, [isDemo]);

  const allRows = overlayStores;

  const [revenueFilter, setRevenueFilter] = useState<RevenueFilter>("all");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [businessMorphZoom, setBusinessMorphZoom] = useState(ZOOM_AFTER_MANUAL_BUSINESS_SELECT);
  const [aptRows, setAptRows] = useState<MolitAptComplex[]>([]);
  const [selectedAptIds, setSelectedAptIds] = useState<Set<string>>(new Set());
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<
    "insight" | "filter"
  >("insight");

  const sidoOptions = SIDO_LIST;

  const indLargeOptions = useMemo<Option[]>(
    () =>
      indsLargeOptions.map((i) => ({
        value: i.indsLclsCd,
        label: `${i.indsLclsNm} (${i.indsLclsCd})`,
      })),
    [indsLargeOptions]
  );

  /** 시군구 선택 시 행정표준 검색 API로 읍/면/동 목록을 동적으로 갱신합니다. */
  useEffect(() => {
    if (isDemo) return;
    if (!selectedSido || !selectedSigungu) return;
    let isActive = true;
    void (async () => {
      try {
        const query = buildRegionSearchQuery(selectedSido, selectedSigungu);
        const res = await fetch(
          `/api/regions/search?q=${encodeURIComponent(query)}`
        );
        const data = (await res.json()) as {
          ok: boolean;
          results?: { code: string; label: string }[];
        };
        if (!isActive || !data.ok) return;
        const parentMatched = (data.results ?? []).filter((r) =>
          regionLabelMatchesSelection(r.label, selectedSido, selectedSigungu)
        );
        const dedupByDong = new Map<string, Option>();
        parentMatched.forEach((r) => {
          const parsed = parseRegionLabel(r.label, {
            sido: selectedSido,
            sigungu: selectedSigungu,
          });
          if (!parsed.dong || !isEupMyeonDongName(parsed.dong)) return;
          if (!dedupByDong.has(parsed.dong)) {
            dedupByDong.set(parsed.dong, { value: r.code, label: parsed.dong });
          }
        });
        const next = Array.from(dedupByDong.values()).sort((a, b) =>
          a.label.localeCompare(b.label, "ko")
        );
        if (!isActive) return;
        setDongOptions(next);
        if (next.length > 0) {
          setSelectedDong((prev) =>
            prev && next.some((o) => o.value === prev) ? prev : next[0]!.value
          );
        }
      } catch {
        if (isActive) setDongOptions([]);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [isDemo, selectedSido, selectedSigungu]);

  /** 대분류 선택 시 중분류를 서버 API로 조회합니다. */
  useEffect(() => {
    if (isDemo) return;
    if (!selectedIndLarge) return;
    let isActive = true;
    void (async () => {
      try {
        const res = await fetch(
          `/api/commercial/industry-medium?large=${encodeURIComponent(selectedIndLarge)}`
        );
        const data = (await res.json()) as {
          ok: boolean;
          items?: IndustryMediumItem[];
        };
        if (!isActive || !data.ok) return;
        const next = (data.items ?? []).map((item) => ({
          value: item.indsMclsCd,
          label: `${item.indsMclsNm} (${item.indsMclsCd})`,
        }));
        setIndMediumOptions(next);
      } catch {
        if (isActive) setIndMediumOptions([]);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [isDemo, selectedIndLarge]);

  /** 중분류 선택 시 소분류를 서버 API로 조회합니다. */
  useEffect(() => {
    if (isDemo) return;
    if (!selectedIndLarge || !selectedIndMedium) return;
    let isActive = true;
    void (async () => {
      try {
        const q = new URLSearchParams({
          large: selectedIndLarge,
          medium: selectedIndMedium,
        });
        const res = await fetch(`/api/commercial/industry-small?${q.toString()}`);
        const data = (await res.json()) as {
          ok: boolean;
          items?: IndustrySmallItem[];
        };
        if (!isActive || !data.ok) return;
        const next = (data.items ?? []).map((item) => ({
          value: item.indsSclsCd,
          label: `${item.indsSclsNm} (${item.indsSclsCd})`,
        }));
        setIndSmallOptions(next);
      } catch {
        if (isActive) setIndSmallOptions([]);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [isDemo, selectedIndLarge, selectedIndMedium]);

  const filtered = useMemo(() => {
    /** 현재 매출 추세 필터와 업체의 추세값이 일치하는지 판정합니다. */
    const matchesRevenueFilter = (revenueTrend: number) => {
      if (revenueFilter === "decline") return revenueTrend < 0;
      if (revenueFilter === "growth") return revenueTrend > 0;
      return true;
    };

    return allRows.filter((b) => {
      // 1) 동·대분류만 클라이언트에서 걸고, 중·소분류는 `/api/commercial/stores` 서버 필터 결과를 그대로 둡니다.
      if (selectedDong && b.regionCode !== selectedDong) return false;
      if (selectedIndLarge && b.indsLclsCd !== selectedIndLarge) return false;

      // 2) 매출 추세 버튼(하락/성장/전체)을 마지막에 적용합니다.
      if (!matchesRevenueFilter(b.revenueTrend)) return false;

      if (
        indsLclsFilter !== "all" &&
        b.indsLclsCd != null &&
        b.indsLclsCd !== indsLclsFilter
      ) {
        return false;
      }
      return true;
    });
  }, [
    allRows,
    indsLclsFilter,
    revenueFilter,
    selectedDong,
    selectedIndLarge,
  ]);

  const selectedDongLabel = useMemo(() => {
    if (!selectedDong) return "";
    return dongOptions.find((x) => x.value === selectedDong)?.label ?? "";
  }, [dongOptions, selectedDong]);

  const selectedDongAddress = useMemo(
    () =>
      formatSelectedDongAddress(
        selectedSido,
        selectedSigungu,
        selectedDongLabel
      ),
    [selectedDongLabel, selectedSido, selectedSigungu]
  );

  const activeId = useMemo(() => {
    if (!pickedId) return null;
    if (!filtered.some((b) => b.id === pickedId)) return null;
    return pickedId;
  }, [filtered, pickedId]);

  const selected = useMemo(
    () => allRows.find((b) => b.id === activeId) ?? null,
    [activeId, allRows]
  );
  const selectedLargeName = useMemo(() => {
    if (!selectedIndLarge) return "";
    return (
      indsLargeOptions.find((x) => x.indsLclsCd === selectedIndLarge)?.indsLclsNm ??
      ""
    );
  }, [indsLargeOptions, selectedIndLarge]);

  const market = selected
    ? marketByRegion[selected.regionCode]
    : undefined;

  /** 읍·면·동(법정동)·상가 목록·선택 업체 `regionCode`로 `marketByRegion`을 채워 우선 영업·인사이트에 반영합니다. */
  useEffect(() => {
    const codes = new Set<string>();
    const dongCd = selectedDong.trim();
    if (dongCd) codes.add(dongCd);
    for (const row of overlayStores) {
      const c = row.regionCode?.trim();
      if (c) codes.add(c);
    }
    const selCode = selected?.regionCode?.trim();
    if (selCode) codes.add(selCode);

    if (codes.size === 0) {
      queueMicrotask(() => {
        setMarketByRegion({});
        setMarketStatsLoading(false);
      });
      return;
    }

    if (isDemo) {
      const dongLabelDemo = selectedDongLabel.trim();
      const seq = ++marketStatsFetchSeq.current;
      queueMicrotask(() => {
        setMarketStatsLoading(true);
      });
      queueMicrotask(() => {
        if (seq !== marketStatsFetchSeq.current) return;
        const dongMeta = DEMO_DONG_OPTIONS.find((d) => d.value === dongCd);
        const label = (dongMeta?.label ?? dongLabelDemo).trim() || "데모";
        setMarketByRegion(buildDemoMarketByRegion(overlayStores, dongCd, label));
        setMarketStatsLoading(false);
      });
      return;
    }

    const dongLabel = selectedDongLabel.trim();
    const regions = [...codes].map((code) => ({
      code,
      ...(dongCd && code === dongCd && dongLabel ? { label: dongLabel } : {}),
    }));

    queueMicrotask(() => {
      setMarketStatsLoading(true);
    });

    const seq = ++marketStatsFetchSeq.current;
    const marketStatsUrl = "/api/commercial/market-stats";
    const marketStatsBody = JSON.stringify({ regions });
    void (async () => {
      const result = await fetchPublicApiJson<{
        ok: boolean;
        byRegion?: Record<string, MarketStatRow>;
        message?: string;
      }>(marketStatsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: marketStatsBody,
      });

      if (seq !== marketStatsFetchSeq.current) return;

      if (result.fromCache && result.message) {
        setApiNotice((prev) => prev ?? result.message ?? null);
      }

      const data = result.data;
      if (!data?.ok || !data.byRegion) {
        if (process.env.NODE_ENV === "development" && data?.message) {
          console.error("[상권 요약]", data?.message);
        }
        if (!result.fromCache) {
          setSafeMode(true);
        }
        if (seq === marketStatsFetchSeq.current) {
          queueMicrotask(() => {
            setMarketStatsLoading(false);
          });
        }
        return;
      }

      const incoming = data.byRegion;
      setMarketByRegion(() => {
        const next: Record<string, MarketStatRow> = {};
        for (const code of codes) {
          const row = incoming[code];
          if (row) next[code] = row;
        }
        return next;
      });
      if (seq === marketStatsFetchSeq.current) {
        queueMicrotask(() => {
          setMarketStatsLoading(false);
        });
      }
    })();
  }, [
    isDemo,
    overlayStores,
    selected?.regionCode,
    selectedDong,
    selectedDongLabel,
  ]);

  /** 상권 기반 추정 부수(단지 미선택 시 `effectiveMailQty`의 기본값으로만 사용). */
  const mailQuantity = useMemo(() => {
    if (!market) return 1200;
    return Math.max(
      500,
      Math.round(((market.dongHouseholds + market.housingCount) / 2) * 0.1)
    );
  }, [market]);

  /** 국토부 단지 선택이 있으면 세대 합산을 우선하고, 없으면 기존 추정 부수를 씁니다. */
  const effectiveMailQty = useMemo(() => {
    const useSafeDefault =
      safeMode && (!aptRows.length || selectedAptIds.size === 0);
    if (useSafeDefault) return SAFE_MODE_DEFAULT_MAIL_QTY;
    if (!aptRows.length || selectedAptIds.size === 0) return mailQuantity;
    const sum = aptRows
      .filter((a) => selectedAptIds.has(a.id))
      .reduce((acc, a) => acc + a.households, 0);
    return sum > 0 ? sum : mailQuantity;
  }, [aptRows, mailQuantity, safeMode, selectedAptIds]);

  const postalQuote = useMemo(
    () => calculatePostalQuote(effectiveMailQty),
    [effectiveMailQty]
  );

  /** 지도 반경 원 중심 — 상가 좌표가 유효할 때만 표시합니다. */
  const radiusAnchor = useMemo(() => {
    if (!selected) return null;
    const lat = Number(selected.lat);
    const lng = Number(selected.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat === 0 && lng === 0) return null;
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return null;
    return { lat, lng };
  }, [selected]);

  const isPriority = selected
    ? isPriorityLead(selected, marketByRegion)
    : false;

  const getPriority = useCallback(
    (b: BusinessRow) => isPriorityLead(b, marketByRegion),
    [marketByRegion]
  );

  const handleSelect = useCallback((id: string) => {
    setBusinessMorphZoom(ZOOM_AFTER_MANUAL_BUSINESS_SELECT);
    setPickedId(id);
  }, []);

  /** 현재 선택과 일치할 때만 평가정보를 넘깁니다(목록·상담 초안 동기화). */
  const evlForSelected = useMemo(
    () => (selected && evlFetchedForId === selected.id ? evlInfo : null),
    [evlFetchedForId, evlInfo, selected]
  );
  /** 선택 업체에 대한 평가정보를 아직 받지 못했으면 true. */
  const evlLoading = useMemo(
    () => !!(selected && evlFetchedForId !== selected.id),
    [evlFetchedForId, selected]
  );
  const handleAptMapSelect = useCallback(
    (id: string, opts: { shiftKey: boolean }) => {
      setSelectedAptIds((prev) => {
        if (opts.shiftKey) {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }
        return new Set([id]);
      });
    },
    []
  );

  /** 선택된 업체의 개인사업자 평가정보를 조회해 중앙 패널·목록과 동기화합니다. */
  useEffect(() => {
    evlTargetIdRef.current = selected?.id ?? null;
    if (!selected) {
      return;
    }
    const targetId = selected.id;
    if (isDemo) {
      queueMicrotask(() => {
        if (evlTargetIdRef.current !== targetId) return;
        setEvlInfo(buildMockEvlInfo(selected.id, selected.name));
        setEvlFetchedForId(targetId);
      });
      return;
    }
    let active = true;
    void (async () => {
      try {
        const q = new URLSearchParams({
          businessId: selected.id,
          name: selected.name,
        });
        const res = await fetch(`/api/commercial/getEvlInfo?${q.toString()}`);
        const data = (await res.json()) as {
          ok: boolean;
          info?: EvlInfo;
          message?: string;
        };
        if (!active) return;
        if (evlTargetIdRef.current !== targetId) return;
        if (!data.ok || !data.info) {
          setEvlInfo(null);
          setEvlFetchedForId(targetId);
          return;
        }
        setEvlInfo(data.info);
        setEvlFetchedForId(targetId);
      } catch {
        if (!active) return;
        if (evlTargetIdRef.current !== targetId) return;
        setEvlInfo(null);
        setEvlFetchedForId(targetId);
      }
    })();
    return () => {
      active = false;
    };
  }, [isDemo, selected]);

  /** 법정동 기준 국토부 공동주택 단지 목록을 불러옵니다. */
  useEffect(() => {
    if (!selected) {
      queueMicrotask(() => {
        setAptRows([]);
      });
      return;
    }
    if (isDemo) {
      let cancelled = false;
      const latN = Number(selected.lat);
      const lngN = Number(selected.lng);
      const anchor =
        Number.isFinite(latN) &&
        Number.isFinite(lngN) &&
        !(latN === 0 && lngN === 0)
          ? { lat: latN, lng: lngN }
          : demoAnchorForDongCode(selected.regionCode ?? "");
      queueMicrotask(() => {
        if (cancelled) return;
        const apts = buildDemoMolitApts(anchor);
        setAptRows(apts);
        setSelectedAptIds(new Set(apts.map((x) => x.id)));
      });
      return () => {
        cancelled = true;
      };
    }
    const bjdong = resolveLegalDongForMolit(selected);
    if (!bjdong) {
      queueMicrotask(() => {
        setAptRows([]);
      });
      return;
    }

    let cancelled = false;

    const q = new URLSearchParams({ bjdongCd: bjdong });
    const lat = Number(selected.lat);
    const lng = Number(selected.lng);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      !(lat === 0 && lng === 0)
    ) {
      q.set("lat", String(lat));
      q.set("lng", String(lng));
    }
    q.set("radiusM", "1000");

    void (async () => {
      try {
        const res = await fetch(`/api/molit/getAptList?${q.toString()}`);
        const data = (await res.json()) as {
          ok: boolean;
          message?: string;
          items?: MolitAptComplex[];
        };
        if (cancelled) return;
        if (!data.ok) {
          setAptRows([]);
          setSelectedAptIds(new Set());
          return;
        }
        const items = data.items ?? [];
        setAptRows(items);
        setSelectedAptIds(new Set(items.map((x) => x.id)));
      } catch (e) {
        if (cancelled) return;
        if (process.env.NODE_ENV === "development") {
          console.error("[국토부 단지 목록]", e);
        }
        setAptRows([]);
        setSelectedAptIds(new Set());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isDemo, selected]);

  /** 업종 대분류에 따라 평균매출 API 엔드포인트를 동적으로 분기 호출합니다. */
  useEffect(() => {
    const effectiveLargeName =
      selectedLargeName ||
      indsLargeOptions.find((x) => x.indsLclsCd === selected?.indsLclsCd)?.indsLclsNm ||
      "";
    const effectiveDong = selectedDong || selected?.regionCode || "";
    if (!effectiveLargeName || !effectiveDong) {
      queueMicrotask(() => {
        setIndustryAvgStat(null);
      });
      return;
    }
    if (isDemo) {
      queueMicrotask(() => {
        setIndustryAvgStat(
          buildDemoIndustryAvgStat(effectiveDong, effectiveLargeName)
        );
      });
      return;
    }
    let endpoint = "/api/commercial/getAreaIndutyAvrSrvcStats";
    if (effectiveLargeName.includes("외식")) {
      endpoint = "/api/commercial/getAreaIndutyAvrOutStats";
    } else if (
      effectiveLargeName.includes("도소매") ||
      effectiveLargeName.includes("소매")
    ) {
      endpoint = "/api/commercial/getAreaIndutyAvrWhrtStats";
    }
    let active = true;
    void (async () => {
      try {
        const q = new URLSearchParams({ dong: effectiveDong });
        if (selectedIndLarge || selected?.indsLclsCd) {
          q.set("indL", selectedIndLarge || selected?.indsLclsCd || "");
        }
        const res = await fetch(`${endpoint}?${q.toString()}`);
        const data = (await res.json()) as {
          ok: boolean;
          endpoint?: string;
          avgSalesAmount?: number;
          avgSalesPerArea?: number;
        };
        if (!active) return;
        if (!data.ok) {
          setIndustryAvgStat(null);
          return;
        }
        setIndustryAvgStat({
          endpoint: data.endpoint ?? endpoint,
          avgSalesAmount: data.avgSalesAmount ?? 0,
          avgSalesPerArea: data.avgSalesPerArea ?? 0,
        });
      } catch {
        if (active) setIndustryAvgStat(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    indsLargeOptions,
    isDemo,
    selected,
    selectedDong,
    selectedIndLarge,
    selectedLargeName,
  ]);

  /** 시/도 변경 시 하위 선택과 옵션을 즉시 초기화하고 새 옵션을 반영합니다. */
  const handleSidoChange = useCallback((newSido: string) => {
    setSelectedSido(newSido);
    setSelectedSigungu("");
    setSelectedDong("");
    setDongOptions([]);
    setSigunguOptions(
      (SIGUNGU_DATA[newSido] ?? []).map((name) => ({
        value: name,
        label: name,
      }))
    );
  }, []);

  /** 시/군/구 변경 시 동 선택과 옵션을 즉시 초기화합니다. */
  const handleSigunguChange = useCallback((newSigungu: string) => {
    setSelectedSigungu(newSigungu);
    setSelectedDong("");
    setDongOptions([]);
  }, []);

  /** 대분류 변경 시 중·소분류를 초기화하고 중분류 목록을 즉시 조회합니다. */
  const handleIndLargeChange = useCallback((newLarge: string) => {
    setSelectedIndLarge(newLarge);
    setSelectedIndMedium("");
    setSelectedIndSmall("");
    setIndMediumOptions([]);
    setIndSmallOptions([]);
    setIndsLclsFilter(newLarge || "all");
  }, []);

  /** 중분류 변경 시 소분류를 즉시 초기화하고 신규 값 기준으로 소분류를 조회합니다. */
  const handleIndMediumChange = useCallback(
    (newMedium: string) => {
      setSelectedIndMedium(newMedium);
      setSelectedIndSmall("");
      setIndSmallOptions([]);
      if (!selectedIndLarge || !newMedium) return;
      if (isDemo) return;
      void (async () => {
        try {
          const q = new URLSearchParams({
            large: selectedIndLarge,
            medium: newMedium,
          });
          const res = await fetch(`/api/commercial/industry-small?${q.toString()}`);
          const data = (await res.json()) as {
            ok: boolean;
            items?: IndustrySmallItem[];
          };
          if (!data.ok) return;
          setIndSmallOptions(
            (data.items ?? []).map((item) => ({
              value: item.indsSclsCd,
              label: `${item.indsSclsNm} (${item.indsSclsCd})`,
            }))
          );
        } catch {
          setIndSmallOptions([]);
        }
      })();
    },
    [isDemo, selectedIndLarge]
  );

  const handleFetchCommercialStores = useCallback(async () => {
    const effectiveDong = selectedDong.trim();
    if (!effectiveDong) return;
    if (isDemo) {
      const dongMeta = DEMO_DONG_OPTIONS.find((d) => d.value === effectiveDong);
      const dongLabel = dongMeta?.label ?? "데모";
      const rows = buildDemoBusinessRows({
        regionCode: effectiveDong,
        dongLabel,
        indsLclsCd: selectedIndLarge,
        indsMclsCd: selectedIndMedium,
        indsSclsCd: selectedIndSmall,
      });
      setOverlayStores(rows);
      const firstWithPoint = rows.find(
        (s) =>
          Number.isFinite(s.lat) &&
          Number.isFinite(s.lng) &&
          !(s.lat === 0 && s.lng === 0)
      );
      if (firstWithPoint) {
        setBusinessMorphZoom(ZOOM_AFTER_AUTO_FIRST_STORE);
        setPickedId(firstWithPoint.id);
      }
      setApiError(null);
      return;
    }
    const q = new URLSearchParams();
    q.set("dong", effectiveDong);
    if (selectedIndLarge) q.set("indL", selectedIndLarge);
    if (selectedIndMedium) q.set("indM", selectedIndMedium);
    if (selectedIndSmall) q.set("indS", selectedIndSmall);
    if (indsLclsFilter !== "all") q.set("indsLclsCd", indsLclsFilter);
    const url = `/api/commercial/stores?${q.toString()}`;

    const result = await fetchPublicApiJson<{
      ok: boolean;
      rows?: BusinessRow[];
      message?: string;
    }>(url);

    setApiNotice(result.fromCache && result.message ? result.message : null);

    const data = result.data;
    if (!data?.ok) {
      const msg =
        data?.message ?? result.message ?? "공공 상가 조회에 실패했습니다.";
      if (process.env.NODE_ENV === "development") {
        console.error("[공공 API · 상가업소]", msg);
      }
      setApiError(msg);
      setSafeMode(true);
      return;
    }

    const rows = data.rows ?? [];
    setOverlayStores(rows);
    const firstWithPoint = rows.find(
      (s) =>
        Number.isFinite(s.lat) &&
        Number.isFinite(s.lng) &&
        !(s.lat === 0 && s.lng === 0)
    );
    if (firstWithPoint) {
      setBusinessMorphZoom(ZOOM_AFTER_AUTO_FIRST_STORE);
      setPickedId(firstWithPoint.id);
    }
    setApiError(null);
    setSafeMode(false);
  }, [
    indsLclsFilter,
    isDemo,
    selectedDong,
    selectedIndLarge,
    selectedIndMedium,
    selectedIndSmall,
  ]);

  /** 지역/업종 필터가 바뀌면 상가 데이터를 자동으로 다시 조회합니다. */
  useEffect(() => {
    if (!selectedDong.trim()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void handleFetchCommercialStores();
  }, [
    handleFetchCommercialStores,
    selectedDong,
    selectedIndLarge,
    selectedIndMedium,
    selectedIndSmall,
  ]);

  /** 데스크톱 너비로 바뀌면 하단 시트를 닫아 패널 중복·포커스 트랩을 방지합니다. */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setMobileWorkspaceOpen(false);
    };
    onChange();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-background font-sans text-sm">
      <a
        href="#sales-map-panel"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-20 focus:z-[70] focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:outline-none"
      >
        지도 영역으로 건너뛰기
      </a>
      {isDemo ? (
        <div
          role="status"
          className="shrink-0 border-b border-amber-500/50 bg-amber-100 px-4 py-2.5 text-center text-xs leading-snug text-amber-950 dark:border-amber-400/40 dark:bg-amber-950/50 dark:text-amber-50 lg:px-8"
        >
          <strong>데모 모드</strong> — 공공·행정·네이버 지도 API 키 없이 시연 데이터로 전체 흐름을 체험합니다.
          실제 연동은 URL에서 <span className="font-mono">?demo=1</span>을 제거한 뒤 이용하세요.
        </div>
      ) : null}
      <header className="shrink-0 border-b border-border bg-brand-primary px-4 py-4 text-primary-foreground lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <LayoutDashboard className="size-6 opacity-90" aria-hidden />
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary-foreground/80 uppercase">
              Post AI Smart Sales Navigator
            </p>
            <h1
              id="sales-navigator-title"
              className="mt-0.5 text-base font-semibold tracking-tight md:text-lg"
            >
              우체국 B2B 스마트 영업 네비게이터
            </h1>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-primary-foreground/85 md:text-sm">
          생활정보홍보우편 매출 극대화를 위해 위기 업체와 배후 수요(기회)를
          매칭하고, 상담 멘트·제안서까지 한 화면에서 지원합니다.
        </p>
      </header>

      {safeMode ? (
        <div
          className="mx-4 mt-4 rounded-none border border-sky-500/45 bg-sky-500/10 px-4 py-3 text-sm text-sky-950 dark:border-sky-400/40 dark:bg-sky-950/40 dark:text-sky-50 lg:mx-8"
          role="status"
        >
          <p className="font-semibold">{SAFE_MODE_BANNER_TITLE}</p>
          <p className="mt-1 text-xs leading-relaxed opacity-95">
            {SAFE_MODE_BANNER_DETAIL}
          </p>
        </div>
      ) : null}

      {apiNotice && !apiError ? (
        <div
          className="mx-4 mt-2 rounded-none border border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground lg:mx-8"
          role="status"
        >
          {apiNotice}
        </div>
      ) : null}

      {apiError ? (
        <div
          className="mx-4 mt-4 rounded-none border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 lg:mx-8"
          role="status"
        >
          {apiError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 lg:flex-row lg:gap-5 lg:p-6">
          <div
            id="sales-map-panel"
            className="relative flex min-h-0 min-h-[min(42dvh,18rem)] flex-1 flex-col scroll-mt-4 lg:h-full lg:min-h-0 lg:min-w-0 lg:w-[60%]"
            tabIndex={-1}
          >
            <NaverMapPanel
              demoMode={isDemo}
              clientId={clientId}
              businesses={filtered}
              selectedId={activeId}
              selectedDongAddress={selectedDongAddress}
              onMarkerSelect={handleSelect}
              apartments={aptRows}
              selectedAptIdList={[...selectedAptIds]}
              onAptSelect={handleAptMapSelect}
              radiusAnchor={radiusAnchor}
              businessMorphZoom={businessMorphZoom}
            />
          </div>
          <div className="hidden min-h-0 lg:block lg:w-[20%]">
            <InsightCenterPanel
              business={selected}
              market={market}
              marketStatsLoading={marketStatsLoading}
              effectiveMailQty={effectiveMailQty}
              postalQuote={postalQuote}
              isPriority={isPriority}
              evlInfo={evlForSelected}
              industryAvgStat={industryAvgStat}
              selectedLargeName={selectedLargeName}
              selectedDongLabel={selectedDongLabel}
              apartments={aptRows}
              selectedAptIds={selectedAptIds}
              safeMode={safeMode}
            />
          </div>
          <div className="hidden min-h-0 lg:block lg:w-[20%]">
            <FilterSidebar
              sidoOptions={sidoOptions}
              sigunguOptions={sigunguOptions}
              dongOptions={dongOptions}
              selectedSido={selectedSido}
              selectedSigungu={selectedSigungu}
              selectedDong={selectedDong}
              onSidoChange={handleSidoChange}
              onSigunguChange={handleSigunguChange}
              onDongChange={setSelectedDong}
              indLargeOptions={indLargeOptions}
              indMediumOptions={indMediumOptions}
              indSmallOptions={indSmallOptions}
              selectedIndLarge={selectedIndLarge}
              selectedIndMedium={selectedIndMedium}
              selectedIndSmall={selectedIndSmall}
              onIndLargeChange={handleIndLargeChange}
              onIndMediumChange={handleIndMediumChange}
              onIndSmallChange={setSelectedIndSmall}
              revenueFilter={revenueFilter}
              onRevenueChange={setRevenueFilter}
              businesses={filtered}
              selectedId={activeId}
              onSelect={handleSelect}
              getPriority={getPriority}
              selectedBusinessEvl={evlForSelected}
              selectedBusinessEvlLoading={evlLoading}
            />
          </div>
        </div>

        <nav
          className="flex shrink-0 gap-2 border-t border-border bg-background/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm lg:hidden"
          aria-label="모바일·태블릿 상담 및 필터"
        >
          <Button
            type="button"
            variant="secondary"
            className="h-11 min-h-11 flex-1 gap-2 font-medium"
            aria-expanded={mobileWorkspaceOpen && mobileWorkspaceTab === "insight"}
            onClick={() => {
              setMobileWorkspaceTab("insight");
              setMobileWorkspaceOpen(true);
            }}
          >
            <MessageSquare className="size-4 shrink-0" aria-hidden />
            상담·제안
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 min-h-11 flex-1 gap-2 font-medium"
            aria-expanded={mobileWorkspaceOpen && mobileWorkspaceTab === "filter"}
            onClick={() => {
              setMobileWorkspaceTab("filter");
              setMobileWorkspaceOpen(true);
            }}
          >
            <ListFilter className="size-4 shrink-0" aria-hidden />
            필터·목록
          </Button>
        </nav>
      </div>

      <Sheet open={mobileWorkspaceOpen} onOpenChange={setMobileWorkspaceOpen}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="flex max-h-[min(92dvh,880px)] flex-col gap-0 rounded-t-xl border-x-0 p-0 pt-2"
          aria-describedby="mobile-workspace-desc"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-4 py-3 sm:px-5">
            <SheetTitle className="font-sans text-base font-semibold normal-case tracking-tight text-foreground">
              상담·필터
            </SheetTitle>
            <SheetDescription
              id="mobile-workspace-desc"
              className="text-xs leading-snug text-muted-foreground"
            >
              창구 태블릿에서 지도를 넓게 쓰고, 필요할 때만 패널을 여세요. 아래 탭으로
              상담 초안과 필터를 전환합니다.
            </SheetDescription>
          </SheetHeader>
          <Tabs
            value={mobileWorkspaceTab}
            onValueChange={(v) => {
              if (v === "insight" || v === "filter") setMobileWorkspaceTab(v);
            }}
            className="flex min-h-0 flex-1 flex-col px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
          >
            <TabsList
              variant="line"
              className="mb-2 grid h-auto w-full max-w-full shrink-0 grid-cols-2 gap-1 px-0"
            >
              <TabsTrigger value="insight" className="normal-case">
                상담·제안
              </TabsTrigger>
              <TabsTrigger value="filter" className="normal-case">
                필터·목록
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="insight"
              className="mt-0 min-h-0 flex-1 overflow-y-auto px-1 pb-4 outline-none data-[state=inactive]:hidden"
            >
              <InsightCenterPanel
                business={selected}
                market={market}
                marketStatsLoading={marketStatsLoading}
                effectiveMailQty={effectiveMailQty}
                postalQuote={postalQuote}
                isPriority={isPriority}
                evlInfo={evlForSelected}
                industryAvgStat={industryAvgStat}
                selectedLargeName={selectedLargeName}
                selectedDongLabel={selectedDongLabel}
                apartments={aptRows}
                selectedAptIds={selectedAptIds}
                singleScrollSurface
                safeMode={safeMode}
              />
            </TabsContent>
            <TabsContent
              value="filter"
              className="mt-0 min-h-0 flex-1 overflow-y-auto px-1 pb-4 outline-none data-[state=inactive]:hidden"
            >
              <FilterSidebar
                sidoOptions={sidoOptions}
                sigunguOptions={sigunguOptions}
                dongOptions={dongOptions}
                selectedSido={selectedSido}
                selectedSigungu={selectedSigungu}
                selectedDong={selectedDong}
                onSidoChange={handleSidoChange}
                onSigunguChange={handleSigunguChange}
                onDongChange={setSelectedDong}
                indLargeOptions={indLargeOptions}
                indMediumOptions={indMediumOptions}
                indSmallOptions={indSmallOptions}
                selectedIndLarge={selectedIndLarge}
                selectedIndMedium={selectedIndMedium}
                selectedIndSmall={selectedIndSmall}
                onIndLargeChange={handleIndLargeChange}
                onIndMediumChange={handleIndMediumChange}
                onIndSmallChange={setSelectedIndSmall}
                revenueFilter={revenueFilter}
                onRevenueChange={setRevenueFilter}
                businesses={filtered}
                selectedId={activeId}
                onSelect={handleSelect}
                getPriority={getPriority}
                selectedBusinessEvl={evlForSelected}
                selectedBusinessEvlLoading={evlLoading}
                embeddedMobile
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <div className="shrink-0 border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              실데이터
            </Badge>
            <Badge variant="outline" className="text-xs">
              가공데이터
            </Badge>
            <Badge variant="outline" className="text-xs">
              시뮬레이션
            </Badge>
            <span>
              실데이터(공공 원천), 가공데이터(정제/규칙), 시뮬레이션(가정 기반)을
              함께 사용합니다.
            </span>
          </div>
          <p className="min-w-0 text-[11px] leading-snug text-muted-foreground/95 sm:flex-1 sm:basis-full lg:basis-full">
            {DATA_GOVERNANCE_FOOTER}
          </p>
        </div>
      </div>
    </div>
  );
};
