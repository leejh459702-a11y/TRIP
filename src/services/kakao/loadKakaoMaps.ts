// 카카오맵 Web(JavaScript) SDK 로더. JavaScript 키 사용 (REST 키와 다름, 8절 주의사항).

export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoLatLngBounds {
  extend(latlng: KakaoLatLng): void;
  isEmpty(): boolean;
}

export interface KakaoMap {
  setCenter(latlng: KakaoLatLng): void;
  setLevel(level: number): void;
  getCenter(): KakaoLatLng;
  getLevel(): number;
  relayout(): void;
  setBounds(bounds: KakaoLatLngBounds): void;
}

export interface KakaoMarker {
  setMap(map: KakaoMap | null): void;
  setPosition(latlng: KakaoLatLng): void;
}

export interface KakaoPolyline {
  setMap(map: KakaoMap | null): void;
}

export interface KakaoCustomOverlay {
  setMap(map: KakaoMap | null): void;
}

export interface KakaoMapsSDK {
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  Marker: new (options: {
    position: KakaoLatLng;
    map?: KakaoMap;
    title?: string;
    image?: unknown;
  }) => KakaoMarker;
  MarkerImage: new (src: string, size: unknown, options?: unknown) => unknown;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  Polyline: new (options: {
    path: KakaoLatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
  }) => KakaoPolyline;
  CustomOverlay: new (options: {
    position: KakaoLatLng;
    content: string | HTMLElement;
    map?: KakaoMap;
    yAnchor?: number;
  }) => KakaoCustomOverlay;
  load(callback: () => void): void;
  services: {
    Status: { OK: string; ZERO_RESULT: string; ERROR: string };
    Places: new () => { keywordSearch: (...args: unknown[]) => void };
  };
  cluster: {
    MarkerClusterer: new (options: {
      map: KakaoMap;
      averageCenter?: boolean;
      minLevel?: number;
    }) => { addMarkers: (markers: KakaoMarker[]) => void; clear: () => void };
  };
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsSDK };
  }
}

const JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;

let loadPromise: Promise<KakaoMapsSDK> | null = null;

/** 카카오맵 SDK를 1회만 로드하고 kakao.maps 네임스페이스를 반환합니다. */
export function loadKakaoMaps(): Promise<KakaoMapsSDK> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve(window.kakao.maps);
      return;
    }
    if (!JS_KEY) {
      reject(new Error('VITE_KAKAO_JS_KEY가 설정되지 않았습니다 (.env 확인)'));
      return;
    }
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false&libraries=services,clusterer`;
    script.async = true;
    script.onload = () => {
      window.kakao?.maps.load(() => {
        if (window.kakao) resolve(window.kakao.maps);
      });
    };
    script.onerror = () => reject(new Error('카카오맵 SDK 로드에 실패했습니다'));
    document.head.appendChild(script);
  });

  return loadPromise;
}
