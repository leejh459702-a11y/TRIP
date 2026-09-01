// 체험 모드 시드 데이터. 실제 Firebase/카카오 키 없이도 앱 전체를 눌러볼 수 있게 합니다.
import type { Course, Place, Visit } from '../domain/types';
import type { KeywordSearchResult } from './kakao/local';

const now = new Date().toISOString();

export const DEMO_PLACES: Place[] = [
  {
    id: 'demo-p1',
    name: '초당순두부마을',
    category: 'food',
    lat: 37.7815,
    lng: 128.9438,
    address: '강원특별자치도 강릉시 초당동 1-1',
    region: { sido: '강원특별자치도', sigungu: '강릉시', dong: '초당동' },
    tags: ['비오는날', '가성비'],
    defaultStayMin: 80,
    estCostPerPerson: 12000,
    visitCount: 3,
    lastVisitedAt: '2025-11-02T04:00:00.000Z',
    latestRevisit: 'yes',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-p2',
    name: '커피커퍼 강릉본점',
    category: 'cafe',
    lat: 37.7719,
    lng: 128.9469,
    address: '강원특별자치도 강릉시 강문동 2-3',
    region: { sido: '강원특별자치도', sigungu: '강릉시', dong: '강문동' },
    tags: ['오션뷰', '분위기'],
    defaultStayMin: 60,
    estCostPerPerson: 7000,
    visitCount: 2,
    lastVisitedAt: '2025-10-18T02:00:00.000Z',
    latestRevisit: 'yes',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-p3',
    name: '경포 오션뷰 스테이',
    category: 'stay',
    lat: 37.8046,
    lng: 128.9086,
    address: '강원특별자치도 강릉시 경포로 1',
    region: { sido: '강원특별자치도', sigungu: '강릉시', dong: '저동' },
    tags: [],
    defaultStayMin: 0,
    visitCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-p4',
    name: '경포대',
    category: 'activity',
    lat: 37.7959,
    lng: 128.8967,
    address: '강원특별자치도 강릉시 경포로 365',
    region: { sido: '강원특별자치도', sigungu: '강릉시', dong: '저동' },
    tags: ['아이동반', '산책'],
    defaultStayMin: 120,
    visitCount: 1,
    latestRevisit: 'yes',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-p5',
    name: '강릉 중앙시장',
    category: 'etc',
    lat: 37.752,
    lng: 128.8969,
    address: '강원특별자치도 강릉시 성남동 1',
    region: { sido: '강원특별자치도', sigungu: '강릉시', dong: '성남동' },
    tags: ['친구'],
    defaultStayMin: 60,
    visitCount: 3,
    lastVisitedAt: '2025-08-20T02:00:00.000Z',
    latestRevisit: 'maybe',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-p6',
    name: '봉봉방앗간',
    category: 'food',
    lat: 37.758,
    lng: 128.902,
    address: '강원특별자치도 강릉시 교동 12',
    region: { sido: '강원특별자치도', sigungu: '강릉시', dong: '교동' },
    tags: ['부모님'],
    defaultStayMin: 70,
    estCostPerPerson: 15000,
    visitCount: 1,
    latestRevisit: 'yes',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-p7',
    name: '테라로사 커피공장',
    category: 'cafe',
    lat: 37.7455,
    lng: 128.8765,
    address: '강원특별자치도 강릉시 구정면 언별리',
    region: { sido: '강원특별자치도', sigungu: '강릉시', dong: '구정면' },
    tags: [],
    defaultStayMin: 60,
    estCostPerPerson: 8000,
    visitCount: 2,
    latestRevisit: 'yes',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-p8',
    name: '오죽헌',
    category: 'activity',
    lat: 37.7735,
    lng: 128.8961,
    address: '강원특별자치도 강릉시 율곡로 3139번길 24',
    region: { sido: '강원특별자치도', sigungu: '강릉시', dong: '죽헌동' },
    tags: ['부모님'],
    defaultStayMin: 90,
    visitCount: 1,
    latestRevisit: 'yes',
    createdAt: now,
    updatedAt: now,
  },
];

export const DEMO_COURSES: Course[] = [
  {
    id: 'demo-c1',
    title: '강릉 1박 2일',
    startDate: '2026-09-05',
    partySize: 2,
    isTemplate: false,
    createdAt: now,
    updatedAt: now,
    days: [
      {
        id: 'demo-d1',
        date: '2026-09-05',
        startTime: '09:00',
        anchorPlaceId: 'demo-p3',
        // 일부러 지그재그 순서로 저장 — "순서 자동 최적화"를 눌러 차이를 바로 볼 수 있게 함
        blocks: [
          { id: 'demo-b1', type: 'place', placeId: 'demo-p4', stayMin: 120, modeToNext: 'car', estCost: 0 },
          { id: 'demo-b2', type: 'place', placeId: 'demo-p3', stayMin: 0, modeToNext: 'car', estCost: 0 },
          { id: 'demo-b3', type: 'place', placeId: 'demo-p1', stayMin: 80, modeToNext: 'car', estCost: 12000 },
          { id: 'demo-b4', type: 'place', placeId: 'demo-p2', stayMin: 60, modeToNext: 'walk', estCost: 7000 },
          { id: 'demo-b5', type: 'free', label: '숙소 체크인 · 휴식', stayMin: 60 },
        ],
      },
      {
        id: 'demo-d2',
        date: '2026-09-06',
        startTime: '10:00',
        blocks: [{ id: 'demo-b6', type: 'place', placeId: 'demo-p5', stayMin: 60, estCost: 20000 }],
      },
    ],
  },
  {
    id: 'demo-c2',
    title: '바다여행 템플릿',
    startDate: '2026-01-01',
    partySize: 2,
    isTemplate: true,
    createdAt: now,
    updatedAt: now,
    days: [{ id: 'demo-d3', date: '2026-01-01', startTime: '09:00', blocks: [] }],
  },
];

const VISIT_PLACE_IDS = ['demo-p1', 'demo-p2', 'demo-p4', 'demo-p5', 'demo-p6', 'demo-p7', 'demo-p8'];
const REVISITS: Visit['revisit'][] = ['yes', 'yes', 'yes', 'maybe'];

// G4(코스 초안 자동 생성) 게이트가 30건 이상을 요구하므로 넉넉히 32건을 만듭니다.
export const DEMO_VISITS: Visit[] = Array.from({ length: 32 }, (_, i) => {
  const placeId = VISIT_PLACE_IDS[i % VISIT_PLACE_IDS.length]!;
  const daysAgo = 10 + i * 6;
  const visitedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `demo-v${i + 1}`,
    placeId,
    visitedAt,
    revisit: REVISITS[i % REVISITS.length]!,
    companions: i % 3 === 0 ? ['연인'] : i % 3 === 1 ? ['부모님'] : ['친구'],
    memo: i % 4 === 0 ? '웨이팅 있었지만 갈만했어요' : undefined,
    cost: 8000 + (i % 5) * 3000,
    auto: {
      weekday: i % 7,
      timeSlot: (['morning', 'lunch', 'afternoon', 'evening', 'night'] as const)[i % 5]!,
      season: (['spring', 'summer', 'autumn', 'winter'] as const)[i % 4]!,
      stayMin: 45 + (i % 6) * 10,
      partySize: 2,
    },
  };
});

/** 카카오 REST 키 없이도 "검색" 버튼을 눌러볼 수 있게 하는 목 검색 결과. */
export function demoSearchKeyword(query: string): KeywordSearchResult[] {
  const pool: KeywordSearchResult[] = [
    {
      kakaoPlaceId: 'demo-search-1',
      name: `${query} 맛집`,
      category: '음식점 > 한식',
      address: '강원특별자치도 강릉시 xx동',
      lat: 37.77 + Math.random() * 0.02,
      lng: 128.9 + Math.random() * 0.02,
      placeUrl: 'https://place.map.kakao.com/demo1',
    },
    {
      kakaoPlaceId: 'demo-search-2',
      name: `${query} 카페`,
      category: '카페',
      address: '강원특별자치도 강릉시 yy동',
      lat: 37.77 + Math.random() * 0.02,
      lng: 128.9 + Math.random() * 0.02,
      placeUrl: 'https://place.map.kakao.com/demo2',
    },
    {
      kakaoPlaceId: 'demo-search-3',
      name: `${query} 전망대`,
      category: '관광명소',
      address: '강원특별자치도 강릉시 zz동',
      lat: 37.77 + Math.random() * 0.02,
      lng: 128.9 + Math.random() * 0.02,
      placeUrl: 'https://place.map.kakao.com/demo3',
    },
  ];
  return pool;
}
