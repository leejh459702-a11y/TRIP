import type { Place } from './types';

export interface PlaceFilter {
  tags: string[]; // AND 조건
  sido?: string;
  sigungu?: string;
}

/** G1: 태그(AND) + 지역 조건으로 저장 장소를 걸러냅니다. */
export function filterPlaces(places: readonly Place[], filter: PlaceFilter): Place[] {
  return places.filter((p) => {
    if (filter.sido && p.region.sido !== filter.sido) return false;
    if (filter.sigungu && p.region.sigungu !== filter.sigungu) return false;
    return filter.tags.every((tag) => p.tags.includes(tag));
  });
}

export function isEmptyFilter(filter: PlaceFilter): boolean {
  return filter.tags.length === 0 && !filter.sido && !filter.sigungu;
}
