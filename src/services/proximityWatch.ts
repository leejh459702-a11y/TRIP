import { findAlertablePlaces } from '../domain/proximity';
import type { Place } from '../domain/types';

export interface ProximityWatchHandle {
  stop: () => void;
}

/**
 * G2: 저장 장소 500m 이내 진입 시 알림. 배터리를 고려해 낮은 정확도 + 긴 캐시(5분)를 씁니다.
 * 알림 쿨다운(24시간)은 세션 메모리에만 유지합니다 — 상태 저장소가 아니라 중복 알림 방지용
 * 일시적 캐시이므로 앱을 새로 열면 초기화되어도 무방합니다(8절 원칙: localStorage를 상태로 쓰지 않음).
 */
export function startProximityWatch(
  places: readonly Place[],
  onAlertable: (nearby: Place[]) => void,
): ProximityWatchHandle | null {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  const alertedAt = new Map<string, string>();

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const now = new Date();
      const nearby = findAlertablePlaces(current, places, alertedAt, now);
      if (nearby.length === 0) return;
      nearby.forEach((p) => alertedAt.set(p.id, now.toISOString()));
      onAlertable(nearby);
    },
    () => {
      // 위치 조회 실패는 조용히 무시합니다(권한 거부, 일시적 오차 등).
    },
    { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 20_000 },
  );

  return { stop: () => navigator.geolocation.clearWatch(watchId) };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export function notifyNearbyPlaces(places: readonly Place[]): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  for (const p of places) {
    new Notification('근처에 저장한 장소가 있어요', { body: p.name });
  }
}
