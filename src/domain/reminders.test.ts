import { describe, expect, it } from 'vitest';
import { isOverdue, monthsSinceLastVisit, seasonalReminders } from './reminders';
import type { Place, Visit } from './types';

function place(id: string, overrides: Partial<Place> = {}): Place {
  return {
    id,
    name: id,
    category: 'cafe',
    lat: 0,
    lng: 0,
    address: '',
    region: { sido: '', sigungu: '' },
    tags: [],
    defaultStayMin: 60,
    visitCount: 1,
    createdAt: '',
    updatedAt: '',
    latestRevisit: 'yes',
    ...overrides,
  };
}

function visit(id: string, placeId: string, visitedAt: string): Visit {
  return {
    id,
    placeId,
    visitedAt,
    revisit: 'yes',
    companions: [],
    auto: { weekday: 0, timeSlot: 'lunch', season: 'autumn' },
  };
}

describe('seasonalReminders', () => {
  const today = new Date(2026, 8, 1); // 2026-09-01

  it('작년 같은 시기(±14일) 방문 기록이 있으면 리마인드한다', () => {
    const p = place('p1');
    const visits = [visit('v1', 'p1', new Date(2025, 8, 5).toISOString())]; // 2025-09-05, 4일 차이
    const result = seasonalReminders([p], visits, today);
    expect(result).toHaveLength(1);
    expect(result[0]?.place.id).toBe('p1');
  });

  it('올해 방문은 리마인드 대상에서 제외한다', () => {
    const p = place('p1');
    const visits = [visit('v1', 'p1', new Date(2026, 8, 2).toISOString())];
    expect(seasonalReminders([p], visits, today)).toHaveLength(0);
  });

  it('시기가 많이 다르면 제외한다', () => {
    const p = place('p1');
    const visits = [visit('v1', 'p1', new Date(2025, 1, 1).toISOString())]; // 2월
    expect(seasonalReminders([p], visits, today)).toHaveLength(0);
  });

  it("재방문 판정이 '또 감'이 아니면 제외한다", () => {
    const p = place('p1', { latestRevisit: 'maybe' });
    const visits = [visit('v1', 'p1', new Date(2025, 8, 5).toISOString())];
    expect(seasonalReminders([p], visits, today)).toHaveLength(0);
  });
});

describe('monthsSinceLastVisit / isOverdue', () => {
  const today = new Date(2026, 8, 1);

  it('마지막 방문 후 경과 개월 수를 계산한다', () => {
    const p = place('p1', { lastVisitedAt: new Date(2025, 8, 1).toISOString() });
    expect(monthsSinceLastVisit(p, today)).toBe(12);
  });

  it('12개월 이상 지나고 또감이면 overdue', () => {
    const p = place('p1', { lastVisitedAt: new Date(2025, 7, 1).toISOString() });
    expect(isOverdue(p, today)).toBe(true);
  });

  it('12개월 미만이면 overdue 아님', () => {
    const p = place('p1', { lastVisitedAt: new Date(2026, 6, 1).toISOString() });
    expect(isOverdue(p, today)).toBe(false);
  });

  it("또감이 아니면 overdue 아님", () => {
    const p = place('p1', { latestRevisit: 'no', lastVisitedAt: new Date(2024, 0, 1).toISOString() });
    expect(isOverdue(p, today)).toBe(false);
  });
});
