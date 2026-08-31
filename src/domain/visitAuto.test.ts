import { describe, expect, it } from 'vitest';
import { computeVisitAuto } from './visitAuto';

describe('computeVisitAuto', () => {
  it('시간대를 올바르게 분류한다', () => {
    expect(computeVisitAuto(new Date(2026, 5, 1, 8, 0)).timeSlot).toBe('morning');
    expect(computeVisitAuto(new Date(2026, 5, 1, 12, 30)).timeSlot).toBe('lunch');
    expect(computeVisitAuto(new Date(2026, 5, 1, 15, 0)).timeSlot).toBe('afternoon');
    expect(computeVisitAuto(new Date(2026, 5, 1, 18, 0)).timeSlot).toBe('evening');
    expect(computeVisitAuto(new Date(2026, 5, 1, 23, 0)).timeSlot).toBe('night');
    expect(computeVisitAuto(new Date(2026, 5, 1, 2, 0)).timeSlot).toBe('night');
  });

  it('계절을 올바르게 분류한다', () => {
    expect(computeVisitAuto(new Date(2026, 3, 1)).season).toBe('spring');
    expect(computeVisitAuto(new Date(2026, 6, 1)).season).toBe('summer');
    expect(computeVisitAuto(new Date(2026, 9, 1)).season).toBe('autumn');
    expect(computeVisitAuto(new Date(2026, 0, 1)).season).toBe('winter');
  });

  it('요일과 부가 정보를 그대로 담는다', () => {
    const auto = computeVisitAuto(new Date(2026, 8, 1, 12, 0), {
      stayMin: 95,
      partySize: 3,
      weather: '맑음',
    });
    expect(auto.weekday).toBe(2); // 화요일
    expect(auto.stayMin).toBe(95);
    expect(auto.partySize).toBe(3);
    expect(auto.weather).toBe('맑음');
  });
});
