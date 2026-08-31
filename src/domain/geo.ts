import type { LatLng } from './types';

/** 두 좌표 사이 직선거리(m). 목 데이터 및 근접도 정렬(B3)에 사용. */
export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 좌표를 소수점 5자리로 반올림 (명세서 8절: 좌표 비교 규칙). */
export function roundCoord(v: number): number {
  return Math.round(v * 1e5) / 1e5;
}
