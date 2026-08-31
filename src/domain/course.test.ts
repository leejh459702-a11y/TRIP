import { describe, expect, it } from 'vitest';
import {
  createFreeBlock,
  createPlaceBlock,
  nearestPlaces,
  reorderBlocks,
  removeBlockById,
  swapBlockPlace,
  updateBlockMode,
  updateBlockStayMin,
} from './course';
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

describe('reorderBlocks', () => {
  it('블록을 지정한 위치로 옮긴다', () => {
    const blocks: Block[] = [
      { id: 'a', type: 'free', stayMin: 10 },
      { id: 'b', type: 'free', stayMin: 10 },
      { id: 'c', type: 'free', stayMin: 10 },
    ];
    const next = reorderBlocks(blocks, 0, 2);
    expect(next.map((b) => b.id)).toEqual(['b', 'c', 'a']);
  });

  it('원본 배열을 변경하지 않는다', () => {
    const blocks: Block[] = [
      { id: 'a', type: 'free', stayMin: 10 },
      { id: 'b', type: 'free', stayMin: 10 },
    ];
    reorderBlocks(blocks, 0, 1);
    expect(blocks.map((b) => b.id)).toEqual(['a', 'b']);
  });
});

describe('createPlaceBlock', () => {
  it('장소의 기본 체류시간을 그대로 사용한다', () => {
    const block = createPlaceBlock(place('p1'));
    expect(block.stayMin).toBe(45);
    expect(block.placeId).toBe('p1');
    expect(block.type).toBe('place');
    expect(block.modeToNext).toBe('car');
  });
});

describe('createFreeBlock', () => {
  it('라벨과 기본 60분을 갖는다', () => {
    const block = createFreeBlock('점심 후 휴식');
    expect(block.label).toBe('점심 후 휴식');
    expect(block.stayMin).toBe(60);
  });
});

describe('removeBlockById / updateBlockStayMin / updateBlockMode', () => {
  const blocks: Block[] = [
    { id: 'a', type: 'place', placeId: 'p1', stayMin: 60, modeToNext: 'car' },
    { id: 'b', type: 'place', placeId: 'p2', stayMin: 30, modeToNext: 'car' },
  ];

  it('id로 블록을 제거한다', () => {
    expect(removeBlockById(blocks, 'a').map((b) => b.id)).toEqual(['b']);
  });

  it('체류시간을 0 미만으로 내려가지 않게 갱신한다', () => {
    expect(updateBlockStayMin(blocks, 'a', -10).find((b) => b.id === 'a')?.stayMin).toBe(0);
    expect(updateBlockStayMin(blocks, 'a', 90).find((b) => b.id === 'a')?.stayMin).toBe(90);
  });

  it('이동수단을 갱신한다', () => {
    expect(updateBlockMode(blocks, 'a', 'walk').find((b) => b.id === 'a')?.modeToNext).toBe(
      'walk',
    );
  });
});

describe('nearestPlaces', () => {
  it('가까운 순으로 정렬하고 자기 자신은 제외한다', () => {
    const target = place('target', { lat: 37.5, lng: 127.0 });
    const far = place('far', { lat: 38.5, lng: 128.0 });
    const near = place('near', { lat: 37.51, lng: 127.01 });
    const mid = place('mid', { lat: 37.7, lng: 127.2 });
    const result = nearestPlaces(target, [far, target, near, mid]);
    expect(result.map((p) => p.id)).toEqual(['near', 'mid', 'far']);
  });

  it('limit 개수만큼만 반환한다', () => {
    const target = place('target', { lat: 0, lng: 0 });
    const candidates = Array.from({ length: 10 }, (_, i) => place(`p${i}`, { lat: i, lng: i }));
    expect(nearestPlaces(target, candidates, 3)).toHaveLength(3);
  });
});

describe('swapBlockPlace', () => {
  it('블록의 장소와 체류시간을 교체한다', () => {
    const blocks: Block[] = [{ id: 'a', type: 'place', placeId: 'p1', stayMin: 60 }];
    const replacement = place('p2', { defaultStayMin: 90 });
    const next = swapBlockPlace(blocks, 'a', replacement);
    expect(next[0]?.placeId).toBe('p2');
    expect(next[0]?.stayMin).toBe(90);
  });
});
