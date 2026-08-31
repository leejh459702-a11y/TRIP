import { addDays } from 'date-fns';
import { computeTimeline, type LegsByFromBlockId, type ResolvedBlock } from './timeline';
import type { Category, Course, CourseDay, TravelMode } from './types';

export interface SharedBlock {
  type: 'place' | 'free';
  name: string;
  category?: Category;
  lat?: number;
  lng?: number;
  placeUrl?: string;
  stayMin: number;
  arriveAt: string; // ISO, 공유 시점에 고정
  leaveAt: string;
  modeToNext?: TravelMode;
  legDurationMin?: number;
  legTransitSummary?: string;
}

export interface SharedDay {
  date: string;
  startTime: string;
  blocks: SharedBlock[];
}

export interface SharedSnapshot {
  ownerUid: string;
  courseId: string;
  title: string;
  startDate: string;
  createdAt: string;
  expiresAt: string;
  days: SharedDay[];
}

/**
 * F1: 코스를 공유용 스냅샷으로 값 복사합니다.
 * 원본을 참조하지 않고, 공유 시점의 값을 그대로 굳혀서 저장합니다.
 * 개인 메모·재방문 판정·예산·지난 방문 기록은 애초에 포함하지 않습니다.
 */
export function buildSharedSnapshot(
  ownerUid: string,
  course: Course,
  legsByDay: ReadonlyMap<string, LegsByFromBlockId>,
  resolveDayBlocks: (day: CourseDay) => ResolvedBlock[],
  now = new Date(),
  expiryDays = 90,
): SharedSnapshot {
  const days: SharedDay[] = course.days.map((day) => {
    const resolved = resolveDayBlocks(day);
    const legs = legsByDay.get(day.id) ?? new Map();
    const { entries } = computeTimeline(day, resolved, legs);
    const blocks: SharedBlock[] = entries.map((entry) => {
      const resolvedBlock = resolved.find((r) => r.block.id === entry.block.id);
      const place = resolvedBlock?.place;
      return {
        type: entry.block.type,
        name: entry.block.type === 'free' ? entry.block.label || '자유시간' : (place?.name ?? '-'),
        category: place?.category,
        lat: place?.lat,
        lng: place?.lng,
        placeUrl: place?.placeUrl,
        stayMin: entry.block.stayMin,
        arriveAt: entry.arriveAt.toISOString(),
        leaveAt: entry.leaveAt.toISOString(),
        modeToNext: entry.block.modeToNext,
        legDurationMin: entry.legToNext?.durationMin,
        legTransitSummary: entry.legToNext?.transitSummary,
      };
    });
    return { date: day.date, startTime: day.startTime, blocks };
  });

  return {
    ownerUid,
    courseId: course.id,
    title: course.title,
    startDate: course.startDate,
    createdAt: now.toISOString(),
    expiresAt: addDays(now, expiryDays).toISOString(),
    days,
  };
}

/** 짧은 공유 토큰을 생성합니다 (URL 친화적, 10자). */
export function generateShareToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}
