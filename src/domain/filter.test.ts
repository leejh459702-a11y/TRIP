import { describe, expect, it } from 'vitest';
import { filterPlaces, isEmptyFilter } from './filter';
import type { Place } from './types';

function place(id: string, tags: string[], sido: string, sigungu: string): Place {
  return {
    id,
    name: id,
    category: 'cafe',
    lat: 0,
    lng: 0,
    address: '',
    region: { sido, sigungu },
    tags,
    defaultStayMin: 60,
    visitCount: 0,
    createdAt: '',
    updatedAt: '',
  };
}

describe('filterPlaces', () => {
  const places = [
    place('a', ['부모님', '주차편함'], '강원특별자치도', '강릉시'),
    place('b', ['부모님'], '강원특별자치도', '강릉시'),
    place('c', ['부모님', '주차편함'], '서울특별시', '강남구'),
  ];

  it('태그를 AND로 걸러낸다', () => {
    const result = filterPlaces(places, { tags: ['부모님', '주차편함'] });
    expect(result.map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('지역 조건과 태그를 함께 적용한다', () => {
    const result = filterPlaces(places, { tags: ['부모님', '주차편함'], sido: '강원특별자치도' });
    expect(result.map((p) => p.id)).toEqual(['a']);
  });

  it('조건이 없으면 전부 반환한다', () => {
    expect(filterPlaces(places, { tags: [] })).toHaveLength(3);
  });
});

describe('isEmptyFilter', () => {
  it('아무 조건도 없으면 true', () => {
    expect(isEmptyFilter({ tags: [] })).toBe(true);
  });
  it('조건이 하나라도 있으면 false', () => {
    expect(isEmptyFilter({ tags: ['부모님'] })).toBe(false);
    expect(isEmptyFilter({ tags: [], sido: '강원특별자치도' })).toBe(false);
  });
});
