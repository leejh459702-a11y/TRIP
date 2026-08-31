import { describe, expect, it } from 'vitest';
import { computeTimeline, type ResolvedBlock } from './timeline';
import type { Block, BusinessHours, Place, RouteLeg } from './types';

function leg(durationMin: number): RouteLeg {
  return { durationMin, distanceM: durationMin * 500, mode: 'car', fetchedAt: Date.now() };
}

function resolve(blocks: Block[], places: Record<string, Place> = {}): ResolvedBlock[] {
  return blocks.map((block) => ({ block, place: block.placeId ? places[block.placeId] : undefined }));
}

function place(id: string, overrides: Partial<Place> = {}): Place {
  return {
    id,
    name: id,
    category: 'food',
    lat: 0,
    lng: 0,
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

describe('computeTimeline', () => {
  const day = { date: '2026-09-01', startTime: '09:00' }; // 화요일(2)

  it('첫 블록은 startTime에 도착한다', () => {
    const blocks: Block[] = [{ id: 'a', type: 'place', placeId: 'p1', stayMin: 60 }];
    const { entries } = computeTimeline(day, resolve(blocks), new Map());
    expect(entries[0]?.arriveAt.toISOString()).toBe(new Date(2026, 8, 1, 9, 0).toISOString());
    expect(entries[0]?.leaveAt.toISOString()).toBe(new Date(2026, 8, 1, 10, 0).toISOString());
  });

  it('이동 구간만큼 다음 블록 도착이 밀린다', () => {
    const blocks: Block[] = [
      { id: 'a', type: 'place', placeId: 'p1', stayMin: 60 },
      { id: 'b', type: 'place', placeId: 'p2', stayMin: 30 },
    ];
    const legs = new Map([['a', leg(20)]]);
    const { entries } = computeTimeline(day, resolve(blocks), legs);
    // 09:00 도착 -> 10:00 출발 -> +20분 이동 -> 10:20 도착
    expect(entries[1]?.arriveAt.toISOString()).toBe(new Date(2026, 8, 1, 10, 20).toISOString());
    expect(entries[1]?.leaveAt.toISOString()).toBe(new Date(2026, 8, 1, 10, 50).toISOString());
  });

  it('자유시간 블록은 이동 없이 시간만 차지한다', () => {
    const blocks: Block[] = [
      { id: 'a', type: 'place', placeId: 'p1', stayMin: 60 },
      { id: 'free', type: 'free', label: '휴식', stayMin: 30 },
      { id: 'b', type: 'place', placeId: 'p2', stayMin: 40 },
    ];
    const legs = new Map([['free', leg(15)]]);
    const { entries, totals } = computeTimeline(day, resolve(blocks), legs);
    expect(entries[1]?.arriveAt.toISOString()).toBe(new Date(2026, 8, 1, 10, 0).toISOString());
    expect(entries[2]?.arriveAt.toISOString()).toBe(new Date(2026, 8, 1, 10, 45).toISOString());
    expect(totals.placeCount).toBe(2);
    expect(totals.totalTravelMin).toBe(15);
    expect(totals.totalStayMin).toBe(130);
  });

  it('총 이동/체류/장소수를 정확히 합산한다', () => {
    const blocks: Block[] = [
      { id: 'a', type: 'place', placeId: 'p1', stayMin: 60 },
      { id: 'b', type: 'place', placeId: 'p2', stayMin: 90 },
      { id: 'c', type: 'place', placeId: 'p3', stayMin: 50 },
    ];
    const legs = new Map([
      ['a', leg(20)],
      ['b', leg(35)],
    ]);
    const { totals } = computeTimeline(day, resolve(blocks), legs);
    expect(totals.totalStayMin).toBe(200);
    expect(totals.totalTravelMin).toBe(55);
    expect(totals.placeCount).toBe(3);
  });

  it('B1: 정기휴무일이면 closed 경고를 붙인다', () => {
    const closedAllWeek: BusinessHours = {
      weekly: Array.from({ length: 7 }, () => ({ closed: true })),
    };
    const blocks: Block[] = [{ id: 'a', type: 'place', placeId: 'p1', stayMin: 60 }];
    const { entries } = computeTimeline(
      day,
      resolve(blocks, { p1: place('p1', { businessHours: closedAllWeek }) }),
      new Map(),
    );
    expect(entries[0]?.warnings).toEqual([{ kind: 'closed', detail: '정기휴무일입니다' }]);
  });

  it('B1: 라스트오더 이후 도착이면 lastOrder 경고를 붙인다', () => {
    const hours: BusinessHours = {
      weekly: Array.from({ length: 7 }, () => ({ closed: false, open: '08:00', close: '09:30' })),
      lastOrderMin: 30,
    };
    const blocks: Block[] = [{ id: 'a', type: 'place', placeId: 'p1', stayMin: 60 }];
    const { entries } = computeTimeline(
      day, // 09:00 도착, 라스트오더는 09:00(=09:30-30분)
      resolve(blocks, { p1: place('p1', { businessHours: hours }) }),
      new Map(),
    );
    expect(entries[0]?.warnings.some((w) => w.kind === 'lastOrder')).toBe(true);
  });

  it('영업시간 정보가 없으면 경고를 붙이지 않는다', () => {
    const blocks: Block[] = [{ id: 'a', type: 'place', placeId: 'p1', stayMin: 60 }];
    const { entries } = computeTimeline(day, resolve(blocks, { p1: place('p1') }), new Map());
    expect(entries[0]?.warnings).toEqual([]);
  });

  it('B2: 임계값을 넘는 이동 구간에 longTransfer 경고를 붙인다', () => {
    const blocks: Block[] = [
      { id: 'a', type: 'place', placeId: 'p1', stayMin: 60 },
      { id: 'b', type: 'place', placeId: 'p2', stayMin: 30 },
    ];
    const legs = new Map([['a', leg(45)]]);
    const { entries } = computeTimeline(day, resolve(blocks), legs, {
      longTransferThresholdMin: 40,
    });
    expect(entries[0]?.warnings.some((w) => w.kind === 'longTransfer')).toBe(true);
  });

  it('B2: 임계값 이하 이동 구간에는 longTransfer 경고가 없다', () => {
    const blocks: Block[] = [
      { id: 'a', type: 'place', placeId: 'p1', stayMin: 60 },
      { id: 'b', type: 'place', placeId: 'p2', stayMin: 30 },
    ];
    const legs = new Map([['a', leg(20)]]);
    const { entries } = computeTimeline(day, resolve(blocks), legs, {
      longTransferThresholdMin: 40,
    });
    expect(entries[0]?.warnings.some((w) => w.kind === 'longTransfer')).toBe(false);
  });
});
