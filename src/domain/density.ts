import type { TimelineTotals } from './timeline';

export interface DensityResult {
  /** 0~1 사이로 clamp된 산출값 */
  score: number;
  /** 5단계 (1=여유 ~ 5=매우 빡빡함) */
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  dots: string; // "●●●○○"
}

const LEVEL_LABEL: Record<DensityResult['level'], string> = {
  1: '여유',
  2: '널널',
  3: '적당',
  4: '빡빡한 편',
  5: '빡빡함',
};

/**
 * B5 빡빡함 게이지.
 * density = (총이동분/총소요분)*0.5 + (블록수/6)*0.3 + (여유분<0 ? 0.2 : 0)
 * "여유분"은 하루 시작 시각부터 자정까지의 가용시간에서 실제 사용한(이동+체류) 시간을 뺀 값으로 정의합니다.
 */
export function computeDensity(
  totals: TimelineTotals,
  dayStart: Date,
): DensityResult {
  const usedMin = totals.totalTravelMin + totals.totalStayMin;
  const minutesSinceMidnight = dayStart.getHours() * 60 + dayStart.getMinutes();
  const dayBudgetMin = 24 * 60 - minutesSinceMidnight;
  const slackMin = dayBudgetMin - usedMin;

  const travelRatio = usedMin > 0 ? totals.totalTravelMin / usedMin : 0;
  const score = travelRatio * 0.5 + (totals.placeCount / 6) * 0.3 + (slackMin < 0 ? 0.2 : 0);
  const clamped = Math.min(1, Math.max(0, score));

  const level = Math.min(5, Math.max(1, Math.ceil(clamped * 5))) as DensityResult['level'];

  return {
    score: clamped,
    level,
    label: LEVEL_LABEL[level],
    dots: '●'.repeat(level) + '○'.repeat(5 - level),
  };
}

/** B5: 하루 place 블록이 5개를 넘으면 부드러운 안내를 띄웁니다. 강제로 막지 않습니다. */
export function tooManyPlacesNotice(placeCount: number): string | null {
  if (placeCount <= 5) return null;
  return '하루 5곳을 넘으면 대부분 못 지킵니다';
}
