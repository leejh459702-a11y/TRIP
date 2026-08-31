import { addMinutes, parse } from 'date-fns';
import { checkBusinessHours } from './businessHours';
import type { Block, BlockWarning, CourseDay, Place, RouteLeg, TimelineEntry } from './types';

/** legs는 "이 블록에서 다음 블록까지"의 구간을 block.id로 색인합니다. */
export type LegsByFromBlockId = ReadonlyMap<string, RouteLeg>;

export interface ResolvedBlock {
  block: Block;
  place?: Place; // type === 'place'일 때만 존재
}

export interface TimelineTotals {
  totalTravelMin: number;
  totalStayMin: number;
  placeCount: number;
}

export interface TimelineResult {
  entries: TimelineEntry[];
  totals: TimelineTotals;
}

export interface TimelineOptions {
  /** B2: 이 값(분)을 넘는 이동 구간에 longTransfer 경고를 붙입니다. 기본 40분. */
  longTransferThresholdMin?: number;
}

const DEFAULT_LONG_TRANSFER_MIN = 40;

/** CourseDay.date + startTime을 로컬 Date로 파싱합니다. */
export function dayStartDate(day: Pick<CourseDay, 'date' | 'startTime'>): Date {
  return parse(`${day.date} ${day.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
}

function businessHoursWarnings(arriveAt: Date, place: Place | undefined): BlockWarning[] {
  if (!place?.businessHours) return [];
  const result = checkBusinessHours(arriveAt, place.businessHours);
  if (!result) return [];
  const warnings: BlockWarning[] = [];
  if (result.closed) {
    warnings.push({ kind: 'closed', detail: place.businessHours.note || '정기휴무일입니다' });
    return warnings;
  }
  if (result.onBreak) {
    warnings.push({
      kind: 'breaktime',
      detail: `브레이크타임 ${result.detail.breakStart}~${result.detail.breakEnd} 중 도착`,
    });
  }
  if (result.afterLastOrder) {
    warnings.push({
      kind: 'lastOrder',
      detail: `라스트오더 ${result.detail.lastOrderAt} 이후 도착`,
    });
  }
  return warnings;
}

/**
 * 하루치 블록의 도착/출발 시각과 경고(B1/B2)를 순서대로 계산합니다.
 * React와 무관한 순수 함수 — 시간 계산은 date-fns만 사용합니다 (8절 규칙).
 */
export function computeTimeline(
  day: Pick<CourseDay, 'date' | 'startTime'>,
  blocks: readonly ResolvedBlock[],
  legs: LegsByFromBlockId,
  options: TimelineOptions = {},
): TimelineResult {
  const longTransferMin = options.longTransferThresholdMin ?? DEFAULT_LONG_TRANSFER_MIN;
  let cursor = dayStartDate(day);
  const entries: TimelineEntry[] = [];
  let totalTravelMin = 0;
  let totalStayMin = 0;
  let placeCount = 0;

  for (const { block, place } of blocks) {
    const arriveAt = cursor;
    const leaveAt = addMinutes(arriveAt, block.stayMin);
    const legToNext = legs.get(block.id);

    const warnings: BlockWarning[] = businessHoursWarnings(arriveAt, place);
    if (legToNext && legToNext.durationMin > longTransferMin) {
      warnings.push({
        kind: 'longTransfer',
        detail: `이동 ${legToNext.durationMin}분 · 길게 이동합니다`,
      });
    }

    entries.push({ block, arriveAt, leaveAt, legToNext, warnings });

    totalStayMin += block.stayMin;
    if (block.type === 'place') placeCount += 1;
    if (legToNext) totalTravelMin += legToNext.durationMin;

    cursor = legToNext ? addMinutes(leaveAt, legToNext.durationMin) : leaveAt;
  }

  return { entries, totals: { totalTravelMin, totalStayMin, placeCount } };
}
