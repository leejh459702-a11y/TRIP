import { describe, expect, it } from 'vitest';
import { DRAFT_MIN_VISIT_COUNT, generateCourseDraft, hasEnoughVisitHistory } from './draftGenerator';
import type { Place } from './types';

function place(id: string, overrides: Partial<Place> = {}): Place {
  return {
    id,
    name: id,
    category: 'cafe',
    lat: 0,
    lng: 0,
    address: '',
    region: { sido: '강원특별자치도', sigungu: '강릉시' },
    tags: [],
    defaultStayMin: 60,
    visitCount: 0,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('hasEnoughVisitHistory', () => {
  it(`${DRAFT_MIN_VISIT_COUNT}건 미만이면 false`, () => {
    expect(hasEnoughVisitHistory(29)).toBe(false);
    expect(hasEnoughVisitHistory(30)).toBe(true);
  });
});

describe('generateCourseDraft', () => {
  const basePlaces: Place[] = [
    place('lunch1', { category: 'food', latestRevisit: 'yes', lng: 1 }),
    place('lunch2', { category: 'food', latestRevisit: 'yes', lng: 2 }),
    place('dinner1', { category: 'food', latestRevisit: 'yes', lng: 3 }),
    place('cafe1', { category: 'cafe', latestRevisit: 'yes', lng: 1.5 }),
    place('act1', { category: 'activity', latestRevisit: 'yes', lng: 0.5 }),
    place('act2', { category: 'activity', latestRevisit: 'yes', lng: 2.5 }),
    place('rejected', { category: 'activity', latestRevisit: 'no', lng: 10 }),
  ];

  it('revisit:no 장소는 절대 포함하지 않는다', () => {
    const result = generateCourseDraft(basePlaces, {
      companionTags: [],
      partySize: 2,
      days: 1,
      startDate: '2026-09-05',
    });
    const usedIds = result.days.flatMap((d) => d.blocks.map((b) => b.placeId));
    expect(usedIds).not.toContain('rejected');
  });

  it('일수만큼 CourseDay를 만들고 각 날짜는 날짜순으로 하루씩 늘어난다', () => {
    const result = generateCourseDraft(basePlaces, {
      companionTags: [],
      partySize: 2,
      days: 2,
      startDate: '2026-09-05',
    });
    expect(result.days).toHaveLength(2);
    expect(result.days[0]!.date).toBe('2026-09-05');
    expect(result.days[1]!.date).toBe('2026-09-06');
  });

  it('같은 장소를 여러 날에 중복 배정하지 않는다', () => {
    const result = generateCourseDraft(basePlaces, {
      companionTags: [],
      partySize: 2,
      days: 2,
      startDate: '2026-09-05',
    });
    const usedIds = result.days.flatMap((d) => d.blocks.map((b) => b.placeId));
    expect(new Set(usedIds).size).toBe(usedIds.length);
  });

  it('지역 필터에 맞지 않는 장소는 제외한다', () => {
    const places = [...basePlaces, place('busan', { category: 'food', region: { sido: '부산광역시', sigungu: '해운대구' }, latestRevisit: 'yes' })];
    const result = generateCourseDraft(places, {
      sido: '강원특별자치도',
      companionTags: [],
      partySize: 2,
      days: 1,
      startDate: '2026-09-05',
    });
    const usedIds = result.days.flatMap((d) => d.blocks.map((b) => b.placeId));
    expect(usedIds).not.toContain('busan');
  });

  it('동행 태그가 일치하지 않는 장소는 제외한다', () => {
    const places = [
      place('p1', { category: 'food', tags: ['부모님'], latestRevisit: 'yes' }),
      place('p2', { category: 'food', tags: [], latestRevisit: 'yes' }),
    ];
    const result = generateCourseDraft(places, {
      companionTags: ['부모님'],
      partySize: 2,
      days: 1,
      startDate: '2026-09-05',
    });
    const usedIds = result.days.flatMap((d) => d.blocks.map((b) => b.placeId));
    expect(usedIds).toContain('p1');
    expect(usedIds).not.toContain('p2');
  });

  it('후보가 부족하면 경고 메시지를 남긴다', () => {
    const result = generateCourseDraft([], {
      companionTags: [],
      partySize: 2,
      days: 1,
      startDate: '2026-09-05',
    });
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
