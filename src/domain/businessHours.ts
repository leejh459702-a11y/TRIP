import type { BusinessHours, DayHours } from './types';

/** "HH:mm" 문자열을 자정 기준 분으로 변환합니다. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export interface BusinessHoursCheckResult {
  closed: boolean;
  onBreak: boolean;
  afterLastOrder: boolean;
  detail: {
    breakStart?: string;
    breakEnd?: string;
    lastOrderAt?: string; // "HH:mm"
    close?: string;
  };
}

/**
 * 특정 도착 시각이 영업시간과 충돌하는지 검사합니다 (B1).
 * 요일별 정보가 없거나(day.open/close 미입력) 영업시간 자체가 없으면 판정을 내리지 않습니다
 * (호출부에서 "영업시간 미확인" 배지로 별도 처리).
 */
export function checkBusinessHours(
  arriveAt: Date,
  hours: BusinessHours | undefined,
): BusinessHoursCheckResult | null {
  if (!hours) return null;
  const weekday = arriveAt.getDay();
  const day: DayHours | undefined = hours.weekly[weekday];
  if (!day) return null;

  if (day.closed) {
    return {
      closed: true,
      onBreak: false,
      afterLastOrder: false,
      detail: {},
    };
  }

  if (!day.open || !day.close) return null;

  const arriveMin = arriveAt.getHours() * 60 + arriveAt.getMinutes();
  const openMin = toMinutes(day.open);
  const closeMin = toMinutes(day.close);

  const onBreak =
    !!day.breakStart &&
    !!day.breakEnd &&
    arriveMin >= toMinutes(day.breakStart) &&
    arriveMin < toMinutes(day.breakEnd);

  const lastOrderMin = hours.lastOrderMin ?? 0;
  const lastOrderAtMin = closeMin - lastOrderMin;
  // 라스트오더 시각(또는 마감 시각) 이후에 도착하면 경고. openMin 이전 도착은 별도 판정하지 않습니다.
  const afterLastOrder = arriveMin >= openMin && arriveMin >= lastOrderAtMin;

  return {
    closed: false,
    onBreak,
    afterLastOrder,
    detail: {
      breakStart: day.breakStart,
      breakEnd: day.breakEnd,
      lastOrderAt: minutesToHHMM(lastOrderAtMin),
      close: day.close,
    },
  };
}

function minutesToHHMM(totalMin: number): string {
  const clamped = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
