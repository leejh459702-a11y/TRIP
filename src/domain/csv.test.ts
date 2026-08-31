import { describe, expect, it } from 'vitest';
import { placesToCsv, visitsToCsv } from './csv';
import type { Place, Visit } from './types';

describe('placesToCsv', () => {
  it('헤더와 값을 콤마로 구분해 만든다', () => {
    const place: Place = {
      id: 'p1',
      name: '카페, 좋음',
      category: 'cafe',
      lat: 37.5,
      lng: 127,
      address: '주소',
      region: { sido: '강원특별자치도', sigungu: '강릉시' },
      tags: ['부모님', '주차편함'],
      defaultStayMin: 60,
      visitCount: 2,
      createdAt: '',
      updatedAt: '',
    };
    const csv = placesToCsv([place]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('name');
    expect(lines[1]).toContain('"카페, 좋음"');
    expect(lines[1]).toContain('부모님; 주차편함');
  });
});

describe('visitsToCsv', () => {
  it('방문 기록을 CSV로 만든다', () => {
    const visit: Visit = {
      id: 'v1',
      placeId: 'p1',
      visitedAt: '2026-09-01T09:00:00.000Z',
      revisit: 'yes',
      companions: ['친구'],
      memo: '웨이팅 있음',
      auto: { weekday: 2, timeSlot: 'morning', season: 'autumn' },
    };
    const csv = visitsToCsv([visit]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('revisit');
    expect(lines[1]).toContain('yes');
    expect(lines[1]).toContain('웨이팅 있음');
  });
});
