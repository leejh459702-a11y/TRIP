import { describe, expect, it } from 'vitest';
import { canAlertAgain, findAlertablePlaces, isWithinRadius } from './proximity';
import type { Place } from './types';

function place(id: string, overrides: Partial<Place> = {}): Place {
  return {
    id,
    name: id,
    category: 'cafe',
    lat: 37.5665,
    lng: 126.978,
    address: '',
    region: { sido: '', sigungu: '' },
    tags: [],
    defaultStayMin: 60,
    visitCount: 0,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('isWithinRadius', () => {
  it('500m 이내면 true', () => {
    expect(isWithinRadius({ lat: 37.5665, lng: 126.978 }, { lat: 37.5665, lng: 126.978 })).toBe(true);
    // 위도 0.01도 ≈ 1.1km — 확실히 반경 밖
    expect(isWithinRadius({ lat: 37.5665, lng: 126.978 }, { lat: 37.5765, lng: 126.978 })).toBe(false);
  });
});

describe('canAlertAgain', () => {
  it('알림 기록이 없으면 항상 true', () => {
    expect(canAlertAgain(undefined, new Date())).toBe(true);
  });

  it('24시간이 지나지 않았으면 false', () => {
    const now = new Date('2026-09-01T12:00:00.000Z');
    const lastAlertedAt = new Date('2026-09-01T06:00:00.000Z').toISOString();
    expect(canAlertAgain(lastAlertedAt, now)).toBe(false);
  });

  it('24시간이 지났으면 true', () => {
    const now = new Date('2026-09-02T12:01:00.000Z');
    const lastAlertedAt = new Date('2026-09-01T12:00:00.000Z').toISOString();
    expect(canAlertAgain(lastAlertedAt, now)).toBe(true);
  });
});

describe('findAlertablePlaces', () => {
  it('반경 밖이거나 쿨다운 중인 장소는 제외한다', () => {
    const now = new Date('2026-09-01T12:00:00.000Z');
    const places = [
      place('near-fresh', { lat: 37.5665, lng: 126.978 }),
      place('near-cooldown', { lat: 37.5665, lng: 126.978 }),
      place('far', { lat: 37.6, lng: 127.05 }),
    ];
    const alertedAt = new Map([['near-cooldown', new Date('2026-09-01T06:00:00.000Z').toISOString()]]);

    const result = findAlertablePlaces({ lat: 37.5665, lng: 126.978 }, places, alertedAt, now);

    expect(result.map((p) => p.id)).toEqual(['near-fresh']);
  });
});
