import { describe, expect, it } from 'vitest';
import { generateIcs } from './ics';
import { computeTimeline, type ResolvedBlock } from './timeline';
import type { Block, Place, RouteLeg } from './types';

function place(id: string): Place {
  return {
    id,
    name: '테라로사, 카페',
    category: 'cafe',
    lat: 37.5,
    lng: 127.1,
    address: '강원특별자치도 강릉시',
    region: { sido: '강원특별자치도', sigungu: '강릉시' },
    tags: [],
    defaultStayMin: 60,
    visitCount: 0,
    createdAt: '',
    updatedAt: '',
  };
}

describe('generateIcs', () => {
  const day = { date: '2026-09-01', startTime: '09:00' };
  const blocks: Block[] = [
    { id: 'a', type: 'place', placeId: 'p1', stayMin: 60, modeToNext: 'car' },
    { id: 'free', type: 'free', label: '휴식', stayMin: 30 },
  ];
  const resolved: ResolvedBlock[] = [
    { block: blocks[0] as Block, place: place('p1') },
    { block: blocks[1] as Block },
  ];
  const legs = new Map<string, RouteLeg>([
    ['a', { durationMin: 15, distanceM: 3000, mode: 'car', fetchedAt: 0 }],
  ]);
  const { entries } = computeTimeline(day, resolved, legs);

  it('블록마다 VEVENT를 생성한다', () => {
    const ics = generateIcs('강릉 여행', [{ entries, resolved }], new Date(2026, 8, 1));
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('위치는 주소와 GEO 좌표를 포함한다', () => {
    const ics = generateIcs('강릉 여행', [{ entries, resolved }], new Date(2026, 8, 1));
    expect(ics).toContain('LOCATION:강원특별자치도 강릉시');
    expect(ics).toContain('GEO:37.5;127.1');
  });

  it('설명에 이동수단과 소요시간을 담는다', () => {
    const ics = generateIcs('강릉 여행', [{ entries, resolved }], new Date(2026, 8, 1));
    expect(ics).toContain('DESCRIPTION:이동수단: 자동차 · 소요 15분');
  });

  it('쉼표가 포함된 장소명을 이스케이프한다', () => {
    const ics = generateIcs('강릉 여행', [{ entries, resolved }], new Date(2026, 8, 1));
    expect(ics).toContain('테라로사\\, 카페');
  });

  it('시작/종료 시각을 로컬 형식으로 담는다', () => {
    const ics = generateIcs('강릉 여행', [{ entries, resolved }], new Date(2026, 8, 1));
    expect(ics).toContain('DTSTART:20260901T090000');
    expect(ics).toContain('DTEND:20260901T100000');
  });
});
