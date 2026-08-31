import { differenceInMinutes } from 'date-fns';
import type { TimelineEntry } from './types';

export type LiveState =
  | { kind: 'before'; first: TimelineEntry; minutesUntilStart: number }
  | { kind: 'at'; entry: TimelineEntry; index: number; next?: TimelineEntry; minutesUntilLeave: number }
  | { kind: 'traveling'; from: TimelineEntry; to: TimelineEntry; minutesUntilArrival: number }
  | { kind: 'done' };

/**
 * C1 라이브 뷰의 상태 머신. 지금이 어느 블록/이동 구간에 해당하는지 판정합니다.
 * React와 무관한 순수 함수 — 계획된 도착/출발 시각을 기준으로 판정합니다.
 */
export function determineLiveState(entries: readonly TimelineEntry[], now: Date): LiveState {
  const first = entries[0];
  if (!first) return { kind: 'done' };
  if (now < first.arriveAt) {
    return { kind: 'before', first, minutesUntilStart: differenceInMinutes(first.arriveAt, now) };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    if (now >= entry.arriveAt && now < entry.leaveAt) {
      return {
        kind: 'at',
        entry,
        index: i,
        next: entries[i + 1],
        minutesUntilLeave: differenceInMinutes(entry.leaveAt, now),
      };
    }
    const next = entries[i + 1];
    if (next && now >= entry.leaveAt && now < next.arriveAt) {
      return {
        kind: 'traveling',
        from: entry,
        to: next,
        minutesUntilArrival: differenceInMinutes(next.arriveAt, now),
      };
    }
  }

  return { kind: 'done' };
}
