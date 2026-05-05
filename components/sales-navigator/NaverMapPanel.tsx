"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

import type { BusinessRow } from "@/lib/sales/types";

type NaverMapPanelProps = {
  /** 네이버 지도 Application Client ID */
  clientId: string | undefined;
  businesses: BusinessRow[];
  selectedId: string | null;
  selectedDongAddress?: string | null;
  onMarkerSelect: (id: string) => void;
};

/** 한국 권역 기준(WGS84) 위경도 범위인지 확인합니다. */
const isValidKoreaCoord = (lat: number, lng: number) => {
  return lat >= 33 && lat <= 38 && lng >= 126 && lng <= 132;
};

/** 임의 좌표값을 숫자로 정규화하고 유효성까지 함께 판정합니다. */
const toValidCoordFromPair = (
  latLike: number | null | undefined,
  lngLike: number | null | undefined
) => {
  const lat = Number(latLike);
  const lng = Number(lngLike);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (!isValidKoreaCoord(lat, lng)) return null;
  return { lat, lng };
};

/** 인포윈도우용 최소 HTML 이스케이프 처리 */
const escapeHtml = (v: string) =>
  v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/** 지오코더 검색어 정제 */
const sanitizeGeocodeQuery = (address: string) => {
  return address.split("(")[0].split(",")[0].trim();
};

/** 관내 업체 마커가 있는 네이버 지도 패널(PRD 좌측). */
export const NaverMapPanel = ({
  clientId,
  businesses,
  selectedId,
  selectedDongAddress,
  onMarkerSelect,
}: NaverMapPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const markerByIdRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const infoWindowRef = useRef<{ open: (m: naver.maps.Map, mk: naver.maps.Marker) => void; close: () => void } | null>(null);
  const [mapScriptReady, setMapScriptReady] = useState(false);
  const [correctedCoords, setCorrectedCoords] = useState<
    Record<string, { lat: number; lng: number }>
  >({});
  const correctedCoordsRef = useRef<Record<string, { lat: number; lng: number }>>({});

  useEffect(() => {
    correctedCoordsRef.current = correctedCoords;
  }, [correctedCoords]);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    markerByIdRef.current.clear();
    infoWindowRef.current?.close();
  };

  /** 선택된 행정동 경계선(GeoJSON) 로딩 지점을 위한 뼈대 함수입니다. */
  const drawRegionBoundary = useCallback((regionName: string) => {
    if (!mapRef.current || typeof window.naver?.maps === "undefined") return;
    if (process.env.NODE_ENV === "development") {
      console.log("[경계선 준비] GeoJSON 로딩 예정:", regionName);
    }
    // TODO: SGIS/외부 GeoJSON을 regionName으로 조회한 뒤
    // mapRef.current.data.addGeoJson(geojson) 형태로 주입하세요.
  }, []);

  /** 업체 상태에 맞는 핀(원형+화살표 꼬리) 마커 HTML을 생성합니다. */
  const buildMarkerHtml = (b: BusinessRow, isSelected: boolean) => {
    const crisis = b.revenueTrend < 0;
    const bg = crisis ? "#dc2626" : "#3d7a5c";
    const size = isSelected ? 18 : 14;
    const ring = isSelected ? "box-shadow:0 0 0 3px rgba(30,58,95,0.35);" : "";
    const tailSize = isSelected ? 7 : 6;
    return `
      <div style="position:relative;width:${size}px;height:${size + tailSize}px;transform:translate(-50%,-100%);">
        <div style="position:absolute;left:0;top:0;width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:2px solid #fff;${ring}"></div>
        <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:${tailSize}px solid transparent;border-right:${tailSize}px solid transparent;border-top:${tailSize + 1}px solid ${bg};filter:drop-shadow(0 1px 0 rgba(255,255,255,0.95));"></div>
      </div>
    `;
  };

  const initMap = useCallback(() => {
    setMapScriptReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.navermap_authFailure = () => {
      if (process.env.NODE_ENV === "development") {
        console.error("네이버 지도 Open API 인증 실패");
      }
    };
    return () => {
      delete window.navermap_authFailure;
    };
  }, []);

  useEffect(() => {
    if (!clientId || !mapScriptReady || !containerRef.current) return;
    if (typeof window.naver?.maps === "undefined") return;

    if (!mapRef.current) {
      mapRef.current = new window.naver.maps.Map(containerRef.current, {
        center: new window.naver.maps.LatLng(35.862, 128.625),
        zoom: 14,
      });
      (
        mapRef.current as unknown as {
          data?: {
            setStyle?: (style: {
              fillColor?: string;
              fillOpacity?: number;
              strokeColor?: string;
              strokeWeight?: number;
            }) => void;
          };
        }
      ).data?.setStyle?.({
        fillColor: "#2563eb",
        fillOpacity: 0.2,
        strokeColor: "#2563eb",
        strokeWeight: 2,
      });
      requestAnimationFrame(() => {
        if (mapRef.current) {
          window.naver.maps.Event.trigger(mapRef.current, "resize");
        }
      });
    }
  }, [clientId, mapScriptReady]);

  useEffect(() => {
    if (!containerRef.current || !mapRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        window.naver.maps.Event.trigger(mapRef.current, "resize");
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [mapScriptReady]);

  useEffect(() => {
    if (
      !mapRef.current ||
      typeof window.naver?.maps === "undefined" ||
      !mapScriptReady
    )
      return;

    clearMarkers();

    const plot = businesses
      .map((b) => {
        const corrected = correctedCoords[b.id];
        const renderLat = corrected?.lat ?? b.lat;
        const renderLng = corrected?.lng ?? b.lng;
        return { b, coord: toValidCoordFromPair(renderLat, renderLng) };
      })
      .filter((x): x is { b: BusinessRow; coord: { lat: number; lng: number } } => x.coord !== null);

    plot.forEach(({ b, coord }) => {
      const isSelected = b.id === selectedId;
      const marker = new window.naver.maps.Marker({
        // 네이버 지도는 LatLng(위도, 경도) 순서입니다.
        position: new window.naver.maps.LatLng(coord.lat, coord.lng),
        map: mapRef.current,
        title: b.name,
        zIndex: isSelected ? 200 : 100,
        icon: {
          content: buildMarkerHtml(b, isSelected),
          anchor: new window.naver.maps.Point(0, 0),
        },
      });
      window.naver.maps.Event.addListener(marker, "click", () => {
        onMarkerSelect(b.id);
      });
      markersRef.current.push(marker);
      markerByIdRef.current.set(b.id, marker);
    });
  }, [businesses, correctedCoords, mapScriptReady, onMarkerSelect, selectedId]);

  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const target = businesses.find((x) => x.id === selectedId);
    if (process.env.NODE_ENV === "development") {
      console.log("[지도 클릭 매칭]", {
        selectedId,
        clickedBusiness: target ?? null,
        sampleIds: businesses.slice(0, 5).map((x) => x.id),
      });
    }
    if (!target) return;
    const morphTo = (lat: number, lng: number) => {
      if (!mapRef.current) return;
      (mapRef.current as unknown as {
        morph: (p: naver.maps.LatLng, z: number) => void;
      }).morph(new window.naver.maps.LatLng(lat, lng), 19);
      // 우측 사이드바 시각 오프셋 보정(핀을 화면 체감 중앙으로).
      (
        mapRef.current as unknown as {
          panBy: (p: naver.maps.Point) => void;
        }
      ).panBy(new window.naver.maps.Point(-200, 0));
    };

    if (mapRef.current && markerByIdRef.current.has(target.id)) {
      const marker = markerByIdRef.current.get(target.id);
      if (marker) {
        const infoText = `[${escapeHtml(target.category || "업종 미상")}] ${escapeHtml(
          target.name || "선택 업체"
        )}`;
        if (!infoWindowRef.current) {
          infoWindowRef.current = new (
            window.naver.maps as unknown as {
              InfoWindow: new (opts: {
                content: string;
                borderWidth?: number;
                backgroundColor?: string;
                borderColor?: string;
                anchorColor?: string;
                disableAnchor?: boolean;
                pixelOffset?: naver.maps.Point;
              }) => {
                open: (m: naver.maps.Map, mk: naver.maps.Marker) => void;
                close: () => void;
              };
            }
          ).InfoWindow({
            content: `<div style="padding:10px;font-size:12px;white-space:nowrap;">${infoText}</div>`,
            borderWidth: 1,
            backgroundColor: "#ffffff",
            borderColor: "#d1d5db",
            anchorColor: "#ffffff",
            disableAnchor: false,
            // 핀 상단으로 말풍선 꼬리가 자연스럽게 연결되도록 위치를 살짝 올립니다.
            pixelOffset: new window.naver.maps.Point(0, -6),
          });
        } else {
          (
            infoWindowRef.current as unknown as {
              setContent?: (content: string) => void;
            }
          ).setContent?.(`<div style="padding:10px;font-size:12px;white-space:nowrap;">${infoText}</div>`);
        }
        infoWindowRef.current.open(mapRef.current, marker);
      }
    }

    const geocoder = (window.naver.maps as unknown as {
      Service?: {
        geocode: (
          options: { query: string },
          cb: (status: string, response: unknown) => void
        ) => void;
        Status?: { OK?: string; ERROR?: string };
      };
    }).Service;

    const applyGeocodedPosition = (lat: number, lng: number) => {
      const selectedMarker = markerByIdRef.current.get(target.id);
      if (selectedMarker) {
        (
          selectedMarker as unknown as {
            setPosition: (p: naver.maps.LatLng) => void;
          }
        ).setPosition(new window.naver.maps.LatLng(lat, lng));
      }
      morphTo(lat, lng);
    };

    const fallbackToPublicCoord = () => {
      const corrected = correctedCoordsRef.current[target.id];
      const coord = toValidCoordFromPair(
        corrected?.lat ?? target.lat,
        corrected?.lng ?? target.lng
      );
      if (!coord) {
        console.error("해당 업체의 좌표 정보가 없습니다.");
        return;
      }
      morphTo(coord.lat, coord.lng);
    };

    const runGeocode = (
      query: string,
      onFail: () => void
    ) => {
      if (!geocoder || !query) {
        onFail();
        return;
      }
      geocoder.geocode({ query }, (status, response) => {
        const statusOk = geocoder.Status?.OK;
        const isError = status === "ERROR" || status === geocoder.Status?.ERROR;
        const result = response as {
          v2?: { addresses?: { y?: string; x?: string }[] };
        };
        const addresses = result.v2?.addresses;
        if (
          isError ||
          (statusOk ? status !== statusOk : status !== "OK") ||
          !addresses ||
          addresses.length === 0
        ) {
          onFail();
          return;
        }
        const first = addresses[0];
        const latGeo = Number(first.y);
        const lngGeo = Number(first.x);
        if (!Number.isFinite(latGeo) || !Number.isFinite(lngGeo)) {
          onFail();
          return;
        }
        if (!isValidKoreaCoord(latGeo, lngGeo)) {
          onFail();
          return;
        }
        setCorrectedCoords((prev) => ({
          ...prev,
          [target.id]: { lat: latGeo, lng: lngGeo },
        }));
        applyGeocodedPosition(latGeo, lngGeo);
      });
    };

    const roadQuery = sanitizeGeocodeQuery(target.address ?? "");
    const lnoQuery = sanitizeGeocodeQuery(target.lnoAdr ?? "");
    runGeocode(roadQuery, () => {
      runGeocode(lnoQuery, () => {
        fallbackToPublicCoord();
      });
    });
  }, [selectedId, businesses]);

  /** 계층형 동 선택 시 지오코딩 좌표로 지도를 자동 이동합니다. */
  useEffect(() => {
    if (!mapRef.current || !mapScriptReady || !selectedDongAddress) return;
    const geocoder = (window.naver.maps as unknown as {
      Service?: {
        geocode: (
          options: { query: string },
          cb: (status: string, response: unknown) => void
        ) => void;
        Status?: { OK?: string; ERROR?: string };
      };
    }).Service;
    if (!geocoder) return;
    const query = sanitizeGeocodeQuery(selectedDongAddress);
    geocoder.geocode({ query }, (status, response) => {
      const statusOk = geocoder.Status?.OK;
      if (status === "ERROR" || status === geocoder.Status?.ERROR) return;
      if (statusOk ? status !== statusOk : status !== "OK") return;
      const first = (response as { v2?: { addresses?: { y?: string; x?: string }[] } })
        .v2?.addresses?.[0];
      const lat = Number(first?.y);
      const lng = Number(first?.x);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (!isValidKoreaCoord(lat, lng)) return;
      if (!mapRef.current) return;
      (
        mapRef.current as unknown as {
          morph: (p: naver.maps.LatLng, z: number) => void;
        }
      ).morph(new window.naver.maps.LatLng(lat, lng), 15);
      drawRegionBoundary(selectedDongAddress);
    });
  }, [drawRegionBoundary, mapScriptReady, selectedDongAddress]);

  /** 데이터·레이아웃 변경 후 지도 캔버스 크기를 다시 맞춥니다(절반만 그려지는 현상 완화). */
  useEffect(() => {
    if (!mapRef.current || !mapScriptReady) return;
    const id = requestAnimationFrame(() => {
      if (mapRef.current) {
        window.naver.maps.Event.trigger(mapRef.current, "resize");
      }
    });
    return () => cancelAnimationFrame(id);
  }, [businesses.length, mapScriptReady, selectedId]);

  return (
    <section className="flex h-full min-h-[300px] flex-1 flex-col overflow-hidden rounded-none border border-border bg-card shadow-sm ring-1 ring-foreground/5 lg:min-h-0">
      <div className="border-b border-border bg-brand-primary px-4 py-3 text-primary-foreground">
        <h2 className="font-heading text-xs font-semibold tracking-widest uppercase">
          관내 지도
        </h2>
        <p className="mt-1 text-[0.65rem] tracking-wide text-primary-foreground/80">
          매출 하락 업체는 붉은 마커로 표시됩니다.
        </p>
      </div>

      {clientId ? (
        <Script
          strategy="afterInteractive"
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&submodules=geocoder`}
          onLoad={initMap}
        />
      ) : null}

      <div className="relative min-h-0 flex-1 bg-muted/40">
        <div
          ref={containerRef}
          className="absolute inset-0 z-0 h-full w-full min-h-[200px]"
          id="sales-nav-map"
        />
        {!clientId ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <p className="text-sm font-medium text-foreground">
              지도를 불러오려면 환경 변수가 필요합니다.
            </p>
            <p className="max-w-xs text-xs">
              프로젝트 루트의{" "}
              <code className="rounded bg-muted px-1 py-0.5">.env.local</code>에{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                NEXT_PUBLIC_NAVER_CLIENT_ID
              </code>
              를 설정한 뒤 개발 서버를 다시 시작하세요.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4 border-t border-border bg-muted/30 px-4 py-2 text-[0.65rem] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: "#dc2626" }}
          />
          매출 하락(위기)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: "#3d7a5c" }}
          />
          매출 유지·성장
        </span>
      </div>
    </section>
  );
};
