// 여행 코스 · 기록 앱 — 도메인 타입 정의 (명세서 4절)

// ─── 장소 ────────────────────────────────────────────
export type Category = 'food' | 'cafe' | 'stay' | 'activity' | 'etc';

export interface Place {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  address: string;
  kakaoPlaceId?: string;
  placeUrl?: string; // 카카오/네이버 플레이스 링크
  region: RegionCode; // coord2regioncode로 자동 채움
  tags: string[]; // 상황 태그 (수동)
  businessHours?: BusinessHours; // 수동 입력
  defaultStayMin: number; // 카테고리별 기본값에서 시작
  estCostPerPerson?: number; // B10
  visitCount: number; // 파생 필드, 방문 기록 시 갱신
  lastVisitedAt?: string;
  latestRevisit?: Revisit; // E1 소환용 캐시
  createdAt: string;
  updatedAt: string;
}

export interface RegionCode {
  sido: string; // "강원특별자치도"
  sigungu: string; // "강릉시"
  dong?: string; // "초당동"
}

export interface BusinessHours {
  weekly: DayHours[]; // 길이 7, 0=일요일
  lastOrderMin?: number; // 마감 몇 분 전 라스트오더
  note?: string; // "매월 2·4주 화요일 휴무"
}

export interface DayHours {
  closed: boolean;
  open?: string; // "11:00"
  close?: string; // "21:00"
  breakStart?: string; // "15:00"
  breakEnd?: string; // "17:00"
}

// ─── 방문 기록 ────────────────────────────────────────
export type Revisit = 'yes' | 'maybe' | 'no';

export interface Visit {
  id: string;
  placeId: string;
  courseId?: string;
  visitedAt: string; // ISO
  revisit: Revisit;
  companions: string[]; // ['부모님', '연인', ...]
  memo?: string; // 한 줄
  photoUrls?: string[]; // 수동 업로드만
  voiceMemoUrl?: string; // D6
  cost?: number; // B10 대조용
  auto: VisitAuto; // D4
}

export interface VisitAuto {
  weekday: number;
  timeSlot: 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  weather?: string; // B7과 동일 소스
  stayMin?: number; // 실제 체류 (C4 체크오프 간격)
  partySize?: number;
}

// ─── 코스 ─────────────────────────────────────────────
export interface Course {
  id: string;
  title: string;
  startDate: string;
  partySize: number;
  days: CourseDay[]; // B9
  isTemplate: boolean; // B8
  shareToken?: string; // F1
  createdAt: string;
  updatedAt: string;
}

export interface CourseDay {
  id: string;
  date: string;
  startTime: string; // "09:00"
  anchorPlaceId?: string; // 숙소 (B9)
  blocks: Block[];
}

export type TravelMode = 'car' | 'transit' | 'walk';

export interface Block {
  id: string;
  type: 'place' | 'free';
  placeId?: string; // type === 'place'
  label?: string; // type === 'free' ("점심 후 휴식")
  stayMin: number;
  modeToNext?: TravelMode; // 다음 블록까지 이동수단
  planBPlaceIds?: string[]; // B3
  estCost?: number; // B10
  done?: boolean; // C4
  doneAt?: string;
  delayMin?: number; // C2 (누적 지연)
}

// ─── 파생 (저장하지 않음, 계산) ───────────────────────
export interface TimelineEntry {
  block: Block;
  arriveAt: Date;
  leaveAt: Date;
  legToNext?: RouteLeg;
  warnings: BlockWarning[];
}

export type BlockWarning =
  | { kind: 'closed'; detail: string } // B1 정기휴무
  | { kind: 'breaktime'; detail: string } // B1 브레이크타임
  | { kind: 'lastOrder'; detail: string } // B1 라스트오더
  | { kind: 'longTransfer'; detail: string } // B2 이동 40분+
  | { kind: 'badWeather'; detail: string }; // B7

// ─── 경로 (H1) ─────────────────────────────────────────
export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteLeg {
  durationMin: number;
  distanceM: number;
  mode: TravelMode;
  transitSummary?: string; // "2호선 → 도보 8분"
  tollFee?: number;
  fetchedAt: number;
}
