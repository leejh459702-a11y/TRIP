import { differenceInHours } from 'date-fns';
import { haversineM } from './geo';
import type { LatLng, Place } from './types';

export const PROXIMITY_RADIUS_M = 500;
export const PROXIMITY_COOLDOWN_HOURS = 24;

/** G2: 두 좌표가 반경(m) 안에 있는지. */
export function isWithinRadius(a: LatLng, b: LatLng, radiusM = PROXIMITY_RADIUS_M): boolean {
  return haversineM(a, b) <= radiusM;
}

/** G2: 같은 장소를 24시간 내 중복 알림하지 않기 위한 쿨다운 판정. */
export function canAlertAgain(
  lastAlertedAt: string | undefined,
  now: Date,
  cooldownHours = PROXIMITY_COOLDOWN_HOURS,
): boolean {
  if (!lastAlertedAt) return true;
  return differenceInHours(now, new Date(lastAlertedAt)) >= cooldownHours;
}

/**
 * 현재 위치 기준 반경 내에 있고, 쿨다운이 끝난 저장 장소 목록을 반환합니다.
 * `alertedAt`은 장소 id → 마지막 알림 시각(ISO) 맵입니다.
 */
export function findAlertablePlaces(
  current: LatLng,
  places: readonly Place[],
  alertedAt: ReadonlyMap<string, string>,
  now = new Date(),
): Place[] {
  return places.filter(
    (p) => isWithinRadius(current, p) && canAlertAgain(alertedAt.get(p.id), now),
  );
}
