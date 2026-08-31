import { describe, expect, it } from 'vitest';
import { buildSharedSnapshot, generateShareToken } from './share';
import type { ResolvedBlock } from './timeline';
import type { Course, CourseDay, Place, RouteLeg } from './types';

function place(id: string, name: string): Place {
  return {
    id,
    name,
    category: 'cafe',
    lat: 37.5,
    lng: 127,
    address: '주소',
    region: { sido: '', sigungu: '' },
    tags: [],
    defaultStayMin: 60,
    visitCount: 0,
    createdAt: '',
    updatedAt: '',
  };
}

describe('buildSharedSnapshot', () => {
  const day: CourseDay = {
    id: 'd1',
    date: '2026-09-01',
    startTime: '09:00',
    blocks: [
      { id: 'a', type: 'place', placeId: 'p1', stayMin: 60, modeToNext: 'car' },
      { id: 'free', type: 'free', label: '휴식', stayMin: 30 },
    ],
  };
  const course: Course = {
    id: 'c1',
    title: '강릉 여행',
    startDate: '2026-09-01',
    partySize: 2,
    days: [day],
    isTemplate: false,
    createdAt: '',
    updatedAt: '',
  };
  const p1 = place('p1', '테라로사');
  const legs = new Map<string, RouteLeg>([
    ['a', { durationMin: 15, distanceM: 3000, mode: 'car', fetchedAt: Date.now() }],
  ]);

  function resolveDayBlocks(d: CourseDay): ResolvedBlock[] {
    return d.blocks.map((b) => ({ block: b, place: b.placeId === 'p1' ? p1 : undefined }));
  }

  it('장소 이름/도착시각/체류시간/이동정보를 값으로 복사한다', () => {
    const snapshot = buildSharedSnapshot(
      'uid1',
      course,
      new Map([['d1', legs]]),
      resolveDayBlocks,
      new Date(2026, 8, 1),
    );
    expect(snapshot.days).toHaveLength(1);
    const [first, second] = snapshot.days[0]?.blocks ?? [];
    expect(first?.name).toBe('테라로사');
    expect(first?.arriveAt).toBe(new Date(2026, 8, 1, 9, 0).toISOString());
    expect(first?.legDurationMin).toBe(15);
    expect(second?.name).toBe('휴식');
    expect(second?.type).toBe('free');
  });

  it('개인 메모·재방문·예산·지난 방문 기록 필드를 포함하지 않는다', () => {
    const snapshot = buildSharedSnapshot('uid1', course, new Map([['d1', legs]]), resolveDayBlocks);
    const keys = Object.keys(snapshot.days[0]?.blocks[0] ?? {});
    for (const forbidden of ['memo', 'revisit', 'cost', 'estCost', 'companions']) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('기본 만료는 90일 뒤다', () => {
    const now = new Date(2026, 8, 1);
    const snapshot = buildSharedSnapshot('uid1', course, new Map([['d1', legs]]), resolveDayBlocks, now);
    const days = (new Date(snapshot.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(days)).toBe(90);
  });
});

describe('generateShareToken', () => {
  it('10자리 영숫자 토큰을 생성한다', () => {
    const token = generateShareToken();
    expect(token).toMatch(/^[a-z0-9]{10}$/);
  });

  it('매번 다른 토큰을 생성한다', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateShareToken()));
    expect(tokens.size).toBeGreaterThan(1);
  });
});
