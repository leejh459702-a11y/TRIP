import { describe, expect, it } from 'vitest';
import { computeLegsForDay, type ResolvedBlock } from './legs';
import { MockRoutingProvider } from './routing/MockRoutingProvider';
import type { Place } from '../domain/types';

function place(id: string, lat: number, lng: number): Place {
  return {
    id,
    name: id,
    category: 'cafe',
    lat,
    lng,
    address: '',
    region: { sido: '', sigungu: '' },
    tags: [],
    defaultStayMin: 45,
    visitCount: 0,
    createdAt: '',
    updatedAt: '',
  };
}

describe('computeLegsForDay', () => {
  const provider = new MockRoutingProvider();

  it('연속된 장소 블록 사이 구간만 계산한다', async () => {
    const blocks: ResolvedBlock[] = [
      { block: { id: 'a', type: 'place', placeId: 'p1', stayMin: 60, modeToNext: 'car' }, place: place('p1', 37.5, 127) },
      { block: { id: 'b', type: 'place', placeId: 'p2', stayMin: 60, modeToNext: 'walk' }, place: place('p2', 37.51, 127.01) },
      { block: { id: 'c', type: 'place', placeId: 'p3', stayMin: 60 }, place: place('p3', 37.52, 127.02) },
    ];
    const legs = await computeLegsForDay(blocks, provider);
    expect(legs.size).toBe(2);
    expect(legs.get('a')?.mode).toBe('car');
    expect(legs.get('b')?.mode).toBe('walk');
  });

  it('자유시간 블록은 건너뛰고 앞뒤 장소를 직접 연결한다 (B4)', async () => {
    const blocks: ResolvedBlock[] = [
      { block: { id: 'a', type: 'place', placeId: 'p1', stayMin: 60, modeToNext: 'car' } , place: place('p1', 37.5, 127) },
      { block: { id: 'free', type: 'free', label: '휴식', stayMin: 30 } },
      { block: { id: 'b', type: 'place', placeId: 'p2', stayMin: 60 }, place: place('p2', 37.6, 127.1) },
    ];
    const legs = await computeLegsForDay(blocks, provider);
    // free 블록에는 leg가 없고, a -> b 직접 연결(한 구간)만 존재
    expect(legs.has('free')).toBe(false);
    expect(legs.size).toBe(1);
    expect(legs.has('a')).toBe(true);
  });
});
