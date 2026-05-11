"use client";

import { LayoutDashboard } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  FilterSidebar,
  type RevenueFilter,
} from "@/components/sales-navigator/FilterSidebar";
import { InsightCenterPanel } from "@/components/sales-navigator/InsightCenterPanel";
import { NaverMapPanel } from "@/components/sales-navigator/NaverMapPanel";
import { Badge } from "@/components/ui/badge";
import type {
  IndustryMediumItem,
  IndustrySmallItem,
} from "@/lib/commercial-api/semas-store";
import type { MolitAptComplex } from "@/lib/molit/types";
import { calculatePostalQuote } from "@/lib/postal-calc";
import { resolveLegalDongForMolit } from "@/lib/sales/resolve-legal-dong-for-molit";
import { isPriorityLead } from "@/lib/sales/priority-lead";
import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

type IndsLarge = { indsLclsCd: string; indsLclsNm: string };
type Option = { value: string; label: string };

/** 상가 목록 조회 후 첫 업체 자동 포커스 시 축척(약 300m 수준, 네이버 NCP 줌 14 전후). */
const ZOOM_AFTER_AUTO_FIRST_STORE = 14;
/** 목록·지도에서 업체를 직접 선택했을 때 줌(약 50m 수준, 19는 과도 확대). */
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
  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID?.trim();

  const [overlayStores, setOverlayStores] = useState<BusinessRow[]>([]);
  const [marketByRegion] = useState<Record<string, MarketStatRow>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [evlInfo, setEvlInfo] = useState<EvlInfo | null>(null);
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

  useEffect(() => {
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
          console.error("[공공 API · 업종 대분류]", data.message);
        }
      } catch {
        /* 업종 API 실패 시 필터만 비움 */
      }
    })();
  }, []);

  const allRows = overlayStores;

  const [revenueFilter, setRevenueFilter] = useState<RevenueFilter>("all");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [businessMorphZoom, setBusinessMorphZoom] = useState(ZOOM_AFTER_MANUAL_BUSINESS_SELECT);
  const [aptRows, setAptRows] = useState<MolitAptComplex[]>([]);
  const [aptLoading, setAptLoading] = useState(false);
  const [aptError, setAptError] = useState<string | null>(null);
  const [selectedAptIds, setSelectedAptIds] = useState<Set<string>>(new Set());
  const [moveInPitch, setMoveInPitch] = useState<{
    surge: boolean;
    headline: string;
    detail: string;
  } | null>(null);

  /** 지역 라벨을 시/도-시군구-동으로 안전하게 분해합니다. */
  const parseRegionHierarchy = useCallback(
    (label: string): { sido: string; sigungu: string; dong: string } => {
      const parts = label.trim().split(/\s+/).filter(Boolean);
      return {
        sido: parts[0] ?? "기타",
        sigungu: parts[1] ?? "기타",
        dong: parts[2] ?? label.trim(),
      };
    },
    []
  );

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
    if (!selectedSido || !selectedSigungu) return;
    let isActive = true;
    void (async () => {
      try {
        const query = `${selectedSido} ${selectedSigungu}`;
        const res = await fetch(
          `/api/regions/search?q=${encodeURIComponent(query)}`
        );
        const data = (await res.json()) as {
          ok: boolean;
          results?: { code: string; label: string }[];
        };
        if (!isActive || !data.ok) return;
        const parentMatched = (data.results ?? []).filter(
          (r) =>
            r.label.includes(selectedSido) &&
            r.label.includes(selectedSigungu)
        );
        const dedupByDong = new Map<string, Option>();
        parentMatched.forEach((r) => {
          const parsed = parseRegionHierarchy(r.label);
          if (!parsed.dong) return;
          if (!dedupByDong.has(parsed.dong)) {
            dedupByDong.set(parsed.dong, { value: r.code, label: parsed.dong });
          }
        });
        const next = Array.from(dedupByDong.values()).sort((a, b) =>
          a.label.localeCompare(b.label, "ko")
        );
        if (!isActive) return;
        setDongOptions(next);
      } catch {
        if (isActive) setDongOptions([]);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [parseRegionHierarchy, selectedSido, selectedSigungu]);

  /** 대분류 선택 시 중분류를 서버 API로 조회합니다. */
  useEffect(() => {
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
  }, [selectedIndLarge]);

  /** 중분류 선택 시 소분류를 서버 API로 조회합니다. */
  useEffect(() => {
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
  }, [selectedIndLarge, selectedIndMedium]);

  const filtered = useMemo(() => {
    /** 현재 매출 추세 필터와 업체의 추세값이 일치하는지 판정합니다. */
    const matchesRevenueFilter = (revenueTrend: number) => {
      if (revenueFilter === "decline") return revenueTrend < 0;
      if (revenueFilter === "growth") return revenueTrend > 0;
      return true;
    };

    return allRows.filter((b) => {
      // 1) 행정동/업종 조건을 먼저 적용합니다.
      if (selectedDong && b.regionCode !== selectedDong) return false;
      if (selectedIndLarge && b.indsLclsCd !== selectedIndLarge) return false;
      if (selectedIndMedium) {
        const medium = b.category.split(/[>/]/)[0]?.trim() || b.category.trim();
        if (medium !== selectedIndMedium) return false;
      }
      if (selectedIndSmall && b.category.trim() !== selectedIndSmall) return false;

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
    selectedIndMedium,
    selectedIndSmall,
  ]);

  const selectedDongLabel = useMemo(() => {
    if (!selectedDong) return "";
    return dongOptions.find((x) => x.value === selectedDong)?.label ?? "";
  }, [dongOptions, selectedDong]);

  const selectedDongAddress = useMemo(() => {
    if (!selectedSido || !selectedSigungu || !selectedDongLabel) return null;
    return `${selectedSido} ${selectedSigungu} ${selectedDongLabel}`;
  }, [selectedDongLabel, selectedSido, selectedSigungu]);

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

  const mailQuantity = useMemo(() => {
    if (!market) return 1200;
    return Math.max(
      500,
      Math.round(((market.dongHouseholds + market.housingCount) / 2) * 0.1)
    );
  }, [market]);

  /** 국토부 단지 선택이 있으면 세대 합산을 우선하고, 없으면 기존 추정 부수를 씁니다. */
  const effectiveMailQty = useMemo(() => {
    if (!aptRows.length || selectedAptIds.size === 0) return mailQuantity;
    const sum = aptRows
      .filter((a) => selectedAptIds.has(a.id))
      .reduce((acc, a) => acc + a.households, 0);
    return sum > 0 ? sum : mailQuantity;
  }, [aptRows, mailQuantity, selectedAptIds]);

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

  /** 지도에서 단지 마커 클릭 시 선택을 갱신합니다(Shift면 다중 토글). */
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

  /** 체크박스로 단지 선택을 바꿉니다. */
  const handleAptToggle = useCallback((id: string, checked: boolean) => {
    setSelectedAptIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /** 반경 내 단지 전체 선택. */
  const handleSelectAllApts = useCallback(() => {
    setSelectedAptIds(new Set(aptRows.map((a) => a.id)));
  }, [aptRows]);

  /** 단지 선택 초기화. */
  const handleClearApts = useCallback(() => {
    setSelectedAptIds(new Set());
  }, []);

  /** 선택된 업체의 개인사업자 평가정보를 조회해 중앙 패널로 전달합니다. */
  useEffect(() => {
    if (!selected) {
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
        if (!data.ok || !data.info) {
          setEvlInfo(null);
          return;
        }
        setEvlInfo(data.info);
      } catch {
        if (active) setEvlInfo(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [selected]);

  /** 법정동 기준 국토부 공동주택 단지 목록을 불러옵니다. */
  useEffect(() => {
    if (!selected) {
      queueMicrotask(() => {
        setAptRows([]);
        setAptError(null);
        setAptLoading(false);
      });
      return;
    }
    const bjdong = resolveLegalDongForMolit(selected);
    if (!bjdong) {
      queueMicrotask(() => {
        setAptRows([]);
        setAptError(
          "이 상가 응답에 법정동코드(ldongCd)가 없어 단지 목록을 호출할 수 없습니다. 법정동이 있는 다른 상호를 선택하거나, 같은 법정동으로 조회되는 상가 데이터를 이용해 주세요."
        );
        setAptLoading(false);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      setAptLoading(true);
      setAptError(null);
    });

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
          setAptError(data.message ?? "국토부 단지 목록을 불러오지 못했습니다.");
          setSelectedAptIds(new Set());
          return;
        }
        const items = data.items ?? [];
        setAptRows(items);
        setAptError(null);
        setSelectedAptIds(new Set(items.map((x) => x.id)));
      } catch (e) {
        if (cancelled) return;
        setAptRows([]);
        setAptError(
          e instanceof Error
            ? e.message
            : "국토부 단지 목록 조회 중 오류가 발생했습니다."
        );
        setSelectedAptIds(new Set());
      } finally {
        if (!cancelled) setAptLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected]);

  /** 이사·입주 트리거 문구(업종 규칙)를 조회합니다. */
  useEffect(() => {
    if (!selected) {
      queueMicrotask(() => {
        setMoveInPitch(null);
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const q = new URLSearchParams({
          category: selected.category,
          regionCode: selected.regionCode,
        });
        const res = await fetch(`/api/molit/getStatList?${q.toString()}`);
        const data = (await res.json()) as {
          ok: boolean;
          surge?: boolean;
          headline?: string;
          detail?: string;
        };
        if (cancelled || !data.ok) {
          if (!cancelled) setMoveInPitch(null);
          return;
        }
        setMoveInPitch({
          surge: !!data.surge,
          headline: data.headline ?? "",
          detail: data.detail ?? "",
        });
      } catch {
        if (!cancelled) setMoveInPitch(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

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
    [selectedIndLarge]
  );

  const handleFetchCommercialStores = useCallback(async () => {
    const effectiveDong = selectedDong.trim();
    if (!effectiveDong) return;
    try {
      const q = new URLSearchParams();
      q.set("dong", effectiveDong);
      if (selectedIndLarge) q.set("indL", selectedIndLarge);
      if (selectedIndMedium) q.set("indM", selectedIndMedium);
      if (selectedIndSmall) q.set("indS", selectedIndSmall);
      if (indsLclsFilter !== "all") q.set("indsLclsCd", indsLclsFilter);
      const res = await fetch(`/api/commercial/stores?${q.toString()}`);
      const data = (await res.json()) as {
        ok: boolean;
        rows?: BusinessRow[];
        message?: string;
      };
      if (!data.ok) {
        const msg = data.message ?? "공공 상가 조회에 실패했습니다.";
        console.error("[공공 API · 상가업소]", msg);
        setApiError(msg);
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
    } catch (e) {
      setApiError(
        e instanceof Error ? e.message : "공공 상가 조회 중 오류가 났습니다."
      );
    }
  }, [
    indsLclsFilter,
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border bg-brand-primary px-4 py-4 text-primary-foreground lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <LayoutDashboard className="size-6 opacity-90" aria-hidden />
          <div>
            <p className="font-heading text-[0.65rem] font-semibold tracking-[0.2em] text-primary-foreground/80 uppercase">
              Post AI Smart Sales Navigator
            </p>
            <h1 className="mt-0.5 font-heading text-lg font-semibold tracking-wide md:text-xl">
              우체국 B2B 스마트 영업 네비게이터
            </h1>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-primary-foreground/85 md:text-sm">
          생활정보홍보우편 매출 극대화를 위해 위기 업체와 배후 수요(기회)를
          매칭하고, 상담 멘트·제안서까지 한 화면에서 지원합니다.
        </p>
      </header>

      {apiError ? (
        <div
          className="mx-4 mt-4 rounded-none border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 lg:mx-8"
          role="status"
        >
          {apiError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row lg:gap-5 lg:p-6">
          <div className="min-h-0 lg:w-[60%]">
            <NaverMapPanel
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
          <div className="min-h-0 lg:w-[20%]">
            <InsightCenterPanel
              business={selected}
              market={market}
              mailQuantity={mailQuantity}
              effectiveMailQty={effectiveMailQty}
              postalQuote={postalQuote}
              isPriority={isPriority}
              evlInfo={evlInfo}
              industryAvgStat={industryAvgStat}
              selectedLargeName={selectedLargeName}
              selectedDongLabel={selectedDongLabel}
              apartments={aptRows}
              aptLoading={aptLoading}
              aptError={aptError}
              selectedAptIds={selectedAptIds}
              onAptToggle={handleAptToggle}
              onSelectAllApts={handleSelectAllApts}
              onClearApts={handleClearApts}
              moveInPitch={moveInPitch}
            />
          </div>
          <div className="min-h-0 lg:w-[20%]">
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
            />
          </div>
        </div>
      <div className="border-t border-border bg-muted/30 px-4 py-2 text-[0.65rem] text-muted-foreground lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[0.55rem]">
            실데이터
          </Badge>
          <Badge variant="outline" className="text-[0.55rem]">
            가공데이터
          </Badge>
          <Badge variant="outline" className="text-[0.55rem]">
            시뮬레이션
          </Badge>
          <span>
            실데이터(공공 원천), 가공데이터(정제/규칙), 시뮬레이션(가정 기반)을
            함께 사용합니다.
          </span>
        </div>
      </div>
    </div>
  );
};
