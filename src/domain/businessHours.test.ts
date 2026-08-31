import { describe, expect, it } from 'vitest';
import { checkBusinessHours } from './businessHours';
import type { BusinessHours, DayHours } from './types';

function closedDay(): DayHours {
  return { closed: true };
}
function openDay(open: string, close: string, breakStart?: string, breakEnd?: string): DayHours {
  return { closed: false, open, close, breakStart, breakEnd };
}

// 2026-09-01은 화요일(2)
function tue(hour: number, min = 0): Date {
  return new Date(2026, 8, 1, hour, min);
}

describe('checkBusinessHours', () => {
  it('영업시간 정보가 없으면 null을 반환한다 (미확인 처리는 호출부 몫)', () => {
    expect(checkBusinessHours(tue(12), undefined)).toBeNull();
  });

  it('정기휴무일이면 closed: true', () => {
    const hours: BusinessHours = { weekly: [closedDay(), closedDay(), closedDay(), openDay('11:00', '21:00'), closedDay(), closedDay(), closedDay()] };
    const result = checkBusinessHours(tue(12), hours);
    expect(result?.closed).toBe(true);
  });

  it('브레이크타임 중 도착이면 onBreak: true', () => {
    const day = openDay('11:00', '21:00', '15:00', '17:00');
    const hours: BusinessHours = { weekly: [day, day, day, day, day, day, day] };
    const result = checkBusinessHours(tue(15, 30), hours);
    expect(result?.onBreak).toBe(true);
    expect(result?.closed).toBe(false);
  });

  it('브레이크타임 밖이면 onBreak: false', () => {
    const day = openDay('11:00', '21:00', '15:00', '17:00');
    const hours: BusinessHours = { weekly: [day, day, day, day, day, day, day] };
    const result = checkBusinessHours(tue(13, 0), hours);
    expect(result?.onBreak).toBe(false);
  });

  it('라스트오더 이후 도착이면 afterLastOrder: true', () => {
    const day = openDay('11:00', '21:00');
    const hours: BusinessHours = { weekly: [day, day, day, day, day, day, day], lastOrderMin: 30 };
    // 마감 21:00, 라스트오더 20:30 -> 20:45 도착은 라스트오더 이후
    const result = checkBusinessHours(tue(20, 45), hours);
    expect(result?.afterLastOrder).toBe(true);
    expect(result?.detail.lastOrderAt).toBe('20:30');
  });

  it('라스트오더 이전 도착이면 afterLastOrder: false', () => {
    const day = openDay('11:00', '21:00');
    const hours: BusinessHours = { weekly: [day, day, day, day, day, day, day], lastOrderMin: 30 };
    const result = checkBusinessHours(tue(18, 0), hours);
    expect(result?.afterLastOrder).toBe(false);
  });

  it('요일별 데이터가 없으면(open/close 없음) null', () => {
    const hours: BusinessHours = {
      weekly: [
        { closed: false },
        { closed: false },
        { closed: false },
        { closed: false },
        { closed: false },
        { closed: false },
        { closed: false },
      ],
    };
    expect(checkBusinessHours(tue(12), hours)).toBeNull();
  });
});
