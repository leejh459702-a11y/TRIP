import { differenceInCalendarDays, differenceInMonths, setYear } from 'date-fns';
import type { Place, Visit } from './types';

const SEASONAL_WINDOW_DAYS = 14;
const DEFAULT_OVERDUE_MONTHS = 12;

export interface SeasonalReminder {
  place: Place;
  lastMatchingVisit: Visit;
}

/**
 * E4: 과거 같은 시기(±14일)에 방문했고 재방문 판정이 '또 감'인 장소를 찾습니다.
 * "지금이 그 시즌"이라는 신호로 홈/재방문 상단에 띄웁니다.
 */
export function seasonalReminders(
  places: readonly Place[],
  visits: readonly Visit[],
  today: Date,
): SeasonalReminder[] {
  const yesPlaceIds = new Set(places.filter((p) => p.latestRevisit === 'yes').map((p) => p.id));
  const result: SeasonalReminder[] = [];

  for (const place of places) {
    if (!yesPlaceIds.has(place.id)) continue;
    const placeVisits = visits.filter((v) => v.placeId === place.id);
    let best: Visit | undefined;
    for (const v of placeVisits) {
      const visitDate = new Date(v.visitedAt);
      if (visitDate.getFullYear() === today.getFullYear()) continue; // 올해 방문은 제외
      const sameYearDate = setYear(visitDate, today.getFullYear());
      const diffDays = Math.abs(differenceInCalendarDays(today, sameYearDate));
      if (diffDays <= SEASONAL_WINDOW_DAYS) {
        if (!best || v.visitedAt > best.visitedAt) best = v;
      }
    }
    if (best) result.push({ place, lastMatchingVisit: best });
  }

  return result;
}

/** E5: 마지막 방문 후 일정 기간이 지난 '또 감' 장소에 "N개월 경과" 표시. */
export function monthsSinceLastVisit(place: Place, today: Date): number | null {
  if (!place.lastVisitedAt) return null;
  return differenceInMonths(today, new Date(place.lastVisitedAt));
}

export function isOverdue(
  place: Place,
  today: Date,
  thresholdMonths = DEFAULT_OVERDUE_MONTHS,
): boolean {
  if (place.latestRevisit !== 'yes') return false;
  const months = monthsSinceLastVisit(place, today);
  return months != null && months >= thresholdMonths;
}
