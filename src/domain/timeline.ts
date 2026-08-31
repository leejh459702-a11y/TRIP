import { addMinutes, parse } from 'date-fns';
import type { Block, CourseDay, RouteLeg, TimelineEntry } from './types';

/** legs는 "이 블록에서 다음 블록까지"의 구간을 block.id로 색인합니다. */
export type LegsByFromBlockId = ReadonlyMap<string, RouteLeg>;

export interface TimelineTotals {
  totalTravelMin: number;
  totalStayMin: number;
  placeCount: number;
}

export interface TimelineResult {
  entries: TimelineEntry[];
  totals: TimelineTotals;
}

/** CourseDay.date + startTime을 로컬 Date로 파싱합니다. */
export function dayStartDate(day: Pick<CourseDay, 'date' | 'startTime'>): Date {
  return parse(`${day.date} ${day.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
}

/**
 * 하루치 블록의 도착/출발 시각을 순서대로 계산합니다.
 * React와 무관한 순수 함수 — 시간 계산은 date-fns만 사용합니다 (8절 규칙).
 */
export function computeTimeline(
  day: Pick<CourseDay, 'date' | 'startTime'>,
  blocks: readonly Block[],
  legs: LegsByFromBlockId,
): TimelineResult {
  let cursor = dayStartDate(day);
  const entries: TimelineEntry[] = [];
  let totalTravelMin = 0;
  let totalStayMin = 0;
  let placeCount = 0;

  for (const block of blocks) {
    const arriveAt = cursor;
    const leaveAt = addMinutes(arriveAt, block.stayMin);
    const legToNext = legs.get(block.id);

    entries.push({ block, arriveAt, leaveAt, legToNext, warnings: [] });

    totalStayMin += block.stayMin;
    if (block.type === 'place') placeCount += 1;
    if (legToNext) totalTravelMin += legToNext.durationMin;

    cursor = legToNext ? addMinutes(leaveAt, legToNext.durationMin) : leaveAt;
  }

  return { entries, totals: { totalTravelMin, totalStayMin, placeCount } };
}
