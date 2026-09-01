import { describe, expect, it } from 'vitest';
import { currentChainDistanceM, optimizeDayOrder } from './optimize';
import type { Block, Place } from './types';

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
    defaultStayMin: 45,
    visitCount: 0,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function placeBlock(id: string, placeId: string): Block {
  return { id, type: 'place', placeId, stayMin: 60 };
}

describe('optimizeDayOrder', () => {
  it('지그재그로 저장된 장소를 지리적으로 가까운 순서로 재배치한다', () => {
    // x축 위에 0, 10, 20, 30 지점을 일부러 0 → 20 → 10 → 30 순서로 저장
    const places = new Map<string, Place>([
      ['p0', place('p0', { category: 'activity', lat: 0, lng: 0 })],
      ['p1', place('p1', { category: 'activity', lat: 0, lng: 10 })],
      ['p2', place('p2', { category: 'activity', lat: 0, lng: 20 })],
      ['p3', place('p3', { category: 'activity', lat: 0, lng: 30 })],
    ]);
    const blocks: Block[] = [
      placeBlock('b0', 'p0'),
      placeBlock('b2', 'p2'),
      placeBlock('b1', 'p1'),
      placeBlock('b3', 'p3'),
    ];

    const before = currentChainDistanceM(blocks, places);
    const result = optimizeDayOrder(blocks, places);

    expect(result.changed).toBe(true);
    expect(result.totalDistanceM).toBeLessThan(before);
    // 최적 순서는 0→10→20→30(또는 역순) 이어야 거리가 최소가 됩니다.
    expect(result.blocks.map((b) => b.placeId)).toEqual(['p0', 'p1', 'p2', 'p3']);
  });

  it('food 블록과 free 블록은 자리를 옮기지 않는다', () => {
    const places = new Map<string, Place>([
      ['lunch', place('lunch', { category: 'food', lat: 0, lng: 5 })],
      ['a', place('a', { category: 'activity', lat: 0, lng: 20 })],
      ['b', place('b', { category: 'activity', lat: 0, lng: 0 })],
    ]);
    const blocks: Block[] = [
      placeBlock('b-a', 'a'),
      placeBlock('b-lunch', 'lunch'),
      { id: 'b-free', type: 'free', label: '휴식', stayMin: 30 },
      placeBlock('b-b', 'b'),
    ];

    const result = optimizeDayOrder(blocks, places);

    // lunch, free 블록은 원래 인덱스(1, 2)에 그대로 남아 있어야 한다.
    expect(result.blocks[1]!.id).toBe('b-lunch');
    expect(result.blocks[2]!.id).toBe('b-free');
  });

  it('stay 블록이 뒤쪽에 있었으면 마지막으로 고정한다', () => {
    const places = new Map<string, Place>([
      ['a', place('a', { category: 'activity', lat: 0, lng: 0 })],
      ['b', place('b', { category: 'activity', lat: 0, lng: 10 })],
      ['hotel', place('hotel', { category: 'stay', lat: 0, lng: 5 })],
    ]);
    const blocks: Block[] = [placeBlock('b-a', 'a'), placeBlock('b-b', 'b'), placeBlock('b-hotel', 'hotel')];

    const result = optimizeDayOrder(blocks, places);

    expect(result.blocks[result.blocks.length - 1]!.id).toBe('b-hotel');
  });

  it('stay 블록이 앞쪽에 있었으면 첫 블록으로 고정한다', () => {
    const places = new Map<string, Place>([
      ['hotel', place('hotel', { category: 'stay', lat: 0, lng: 5 })],
      ['a', place('a', { category: 'activity', lat: 0, lng: 0 })],
      ['b', place('b', { category: 'activity', lat: 0, lng: 10 })],
    ]);
    const blocks: Block[] = [placeBlock('b-hotel', 'hotel'), placeBlock('b-a', 'a'), placeBlock('b-b', 'b')];

    const result = optimizeDayOrder(blocks, places);

    expect(result.blocks[0]!.id).toBe('b-hotel');
  });

  it('이미 최적 순서면 changed가 false다', () => {
    const places = new Map<string, Place>([
      ['a', place('a', { category: 'activity', lat: 0, lng: 0 })],
      ['b', place('b', { category: 'activity', lat: 0, lng: 10 })],
    ]);
    const blocks: Block[] = [placeBlock('b-a', 'a'), placeBlock('b-b', 'b')];

    const result = optimizeDayOrder(blocks, places);

    expect(result.changed).toBe(false);
    expect(result.blocks.map((b) => b.id)).toEqual(['b-a', 'b-b']);
  });

  it('7개 이상(브루트포스 임계 초과)이어도 원래보다 나쁘지 않은 순서를 만든다', () => {
    const places = new Map<string, Place>();
    const blocks: Block[] = [];
    // 지그재그 배치: 0, 60, 10, 50, 20, 40, 30 (직선상 지그재그)
    const order = [0, 60, 10, 50, 20, 40, 30];
    order.forEach((lng, i) => {
      const id = `p${i}`;
      places.set(id, place(id, { category: 'activity', lat: 0, lng }));
      blocks.push(placeBlock(`b${i}`, id));
    });

    const before = currentChainDistanceM(blocks, places);
    const result = optimizeDayOrder(blocks, places);

    expect(result.blocks).toHaveLength(7);
    expect(result.totalDistanceM).toBeLessThanOrEqual(before);
  });
});
