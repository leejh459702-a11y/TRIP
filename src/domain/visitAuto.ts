import type { VisitAuto } from './types';

/** D4: 방문 기록 시 사용자 입력 없이 자동으로 채우는 메타 정보. */
export function computeVisitAuto(
  visitedAt: Date,
  extra: { stayMin?: number; partySize?: number; weather?: string } = {},
): VisitAuto {
  return {
    weekday: visitedAt.getDay(),
    timeSlot: timeSlotOf(visitedAt.getHours()),
    season: seasonOf(visitedAt.getMonth() + 1),
    weather: extra.weather,
    stayMin: extra.stayMin,
    partySize: extra.partySize,
  };
}

function timeSlotOf(hour: number): VisitAuto['timeSlot'] {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

function seasonOf(month: number): VisitAuto['season'] {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}
