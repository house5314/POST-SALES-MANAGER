/** 네이버 지도 JS API v3 전역 타입(지도·마커용 최소 선언). */

declare global {
  interface Window {
    naver: typeof naver;
    navermap_authFailure?: () => void;
  }

  namespace naver {
    namespace maps {
      class LatLng {
        constructor(lat: number, lng: number);
      }

      class Point {
        constructor(x: number, y: number);
      }

      class Map {
        constructor(element: string | HTMLElement, options: MapOptions);
        panTo(latlng: LatLng): void;
      }

      interface MapOptions {
        center: LatLng;
        zoom: number;
      }

      class Marker {
        constructor(options: MarkerOptions);
        setMap(map: Map | null): void;
      }

      interface MarkerOptions {
        position: LatLng;
        map?: Map | null;
        title?: string;
        icon?: MarkerIcon;
        zIndex?: number;
      }

      interface MarkerIcon {
        content: string | HTMLElement;
        anchor?: Point;
      }

      namespace Event {
        function addListener(
          instance: object,
          event: string,
          handler: () => void
        ): void;
        function trigger(instance: object, event: string): void;
      }
    }
  }
}

export {};
