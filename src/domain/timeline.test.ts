import { describe, expect, it } from 'vitest';
import { computeTimeline } from './timeline';
import type { Block, RouteLeg } from './types';

function leg(durationMin: number): RouteLeg {
  return { durationMin, distanceM: durationMin * 500, mode: 'car', fetchedAt: Date.now() };
}

describe('computeTimeline', () => {
  const day = { date: '2026-09-01', startTime: '09:00' };

  it('첫 블록은 startTime에 도착한다', () => {
    const blocks: Block[] = [{ id: 'a', type: 'place', placeId: 'p1', stayMin: 60 }];
    const { entries } = computeTimeline(day, blocks, new Map());
    expect(entries[0]?.arriveAt.toISOString()).toBe(new Date(2026, 8, 1, 9, 0).toISOString());
    expect(entries[0]?.leaveAt.toISOString()).toBe(new Date(2026, 8, 1, 10, 0).toISOString());
  });

  it('이동 구간만큼 다음 블록 도착이 밀린다', () => {
    const blocks: Block[] = [
      { id: 'a', type: 'place', placeId: 'p1', stayMin: 60 },
      { id: 'b', type: 'place', placeId: 'p2', stayMin: 30 },
    ];
    const legs = new Map([['a', leg(20)]]);
    const { entries } = computeTimeline(day, blocks, legs);
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
    // a -> free 구간은 leg 없음(같은 자리), free -> b 구간에 실제 이동 leg
    const legs = new Map([['free', leg(15)]]);
    const { entries, totals } = computeTimeline(day, blocks, legs);
    expect(entries[1]?.arriveAt.toISOString()).toBe(new Date(2026, 8, 1, 10, 0).toISOString()); // a leaveAt과 동일
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
    const { totals } = computeTimeline(day, blocks, legs);
    expect(totals.totalStayMin).toBe(200);
    expect(totals.totalTravelMin).toBe(55);
    expect(totals.placeCount).toBe(3);
  });
});
