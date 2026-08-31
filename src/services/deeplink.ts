export interface DeepLinkPoint {
  name: string;
  lat: number;
  lng: number;
}

// 이 앱의 커스텀 스킴. 네이버지도가 돌아올 곳이 없어도 앱 실행 자체는 됩니다.
const APP_SCHEME = 'triplog';

/**
 * 네이버지도 딥링크. 최대 5개 경유지 지원 (v1~v5).
 * 완료판정 7: 4개 지점 = 출발지 + 경유지2 + 도착지.
 */
export function buildNaverMapUrl(points: DeepLinkPoint[]): string {
  if (points.length < 2) return '';
  const origin = points[0];
  const destination = points[points.length - 1];
  const waypoints = points.slice(1, -1).slice(0, 5);
  if (!origin || !destination) return '';

  const params = new URLSearchParams({
    slat: String(origin.lat),
    slng: String(origin.lng),
    sname: origin.name,
    dlat: String(destination.lat),
    dlng: String(destination.lng),
    dname: destination.name,
    appname: APP_SCHEME,
  });
  waypoints.forEach((wp, i) => {
    const n = i + 1;
    params.set(`v${n}lat`, String(wp.lat));
    params.set(`v${n}lng`, String(wp.lng));
    params.set(`v${n}name`, wp.name);
  });
  return `nmap://route/car?${params.toString()}`;
}

/**
 * 카카오맵 딥링크. 공식 스킴은 출발지/도착지만 지원합니다(경유지 미지원).
 * 여러 지점이 있으면 첫 구간(출발→다음 지점)만 안내합니다.
 */
export function buildKakaoMapUrl(points: DeepLinkPoint[]): string {
  if (points.length < 2) return '';
  const from = points[0];
  const to = points[1];
  if (!from || !to) return '';
  return `kakaomap://route?sp=${from.lat},${from.lng}&ep=${to.lat},${to.lng}&by=CAR`;
}

/** 티맵 딥링크. 공식 스킴은 목적지 하나만 지원합니다. */
export function buildTmapUrl(points: DeepLinkPoint[]): string {
  const destination = points[points.length - 1];
  if (!destination) return '';
  const params = new URLSearchParams({
    rGoName: destination.name,
    rGoX: String(destination.lng),
    rGoY: String(destination.lat),
  });
  return `tmap://route?${params.toString()}`;
}

/**
 * 네이버지도 장소 보기 딥링크(경로 없이 단일 지점). 출발지가 없는 C1 "길찾기" 버튼처럼
 * 현재 위치를 모를 때 사용 — 지도 앱을 열면 앱 자체에서 현재 위치 기준 길찾기를 제공합니다.
 */
export function buildNaverPlaceUrl(point: DeepLinkPoint): string {
  const params = new URLSearchParams({
    lat: String(point.lat),
    lng: String(point.lng),
    name: point.name,
    appname: APP_SCHEME,
  });
  return `nmap://place?${params.toString()}`;
}

/**
 * 카카오맵 웹 공유 링크(장소 상세). 앱 설치 없이 어떤 브라우저에서도 열립니다 —
 * F1 공유 링크(카톡 인앱 브라우저 포함)에서 씁니다.
 */
export function buildKakaoWebMapUrl(point: DeepLinkPoint): string {
  return `https://map.kakao.com/link/map/${encodeURIComponent(point.name)},${point.lat},${point.lng}`;
}

/** 카카오맵 웹 길찾기 링크(장소 하나로 길찾기, 앱 설치 없이 동작). */
export function buildKakaoWebDirectionsUrl(point: DeepLinkPoint): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(point.name)},${point.lat},${point.lng}`;
}

export type MapApp = 'naver' | 'kakao' | 'tmap';

export function buildDeepLink(app: MapApp, points: DeepLinkPoint[]): string {
  if (app === 'naver') return buildNaverMapUrl(points);
  if (app === 'kakao') return buildKakaoMapUrl(points);
  return buildTmapUrl(points);
}

export function openDeepLink(app: MapApp, points: DeepLinkPoint[]): void {
  const url = buildDeepLink(app, points);
  if (!url) return;
  window.location.href = url;
}
