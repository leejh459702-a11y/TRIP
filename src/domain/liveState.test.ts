import { describe, expect, it } from 'vitest';
import { determineLiveState } from './liveState';
import type { Block, RouteLeg, TimelineEntry } from './types';

function block(id: string): Block {
  return { id, type: 'place', placeId: id, stayMin: 60 };
}

function entry(id: string, arriveAt: Date, leaveAt: Date, legToNext?: RouteLeg): TimelineEntry {
  return { block: block(id), arriveAt, leaveAt, legToNext, warnings: [] };
}

function leg(durationMin: number): RouteLeg {
  return { durationMin, distanceM: 1000, mode: 'car', fetchedAt: Date.now() };
}

describe('determineLiveState', () => {
  const t = (h: number, m = 0) => new Date(2026, 8, 1, h, m);

  it('일정이 없으면 done', () => {
    expect(determineLiveState([], t(12)).kind).toBe('done');
  });

  it('첫 블록 시작 전이면 before', () => {
    const entries = [entry('a', t(9), t(10))];
    const state = determineLiveState(entries, t(8, 30));
    expect(state.kind).toBe('before');
    if (state.kind === 'before') expect(state.minutesUntilStart).toBe(30);
  });

  it('블록 체류 구간 안이면 at', () => {
    const entries = [entry('a', t(9), t(10), leg(20)), entry('b', t(10, 20), t(11))];
    const state = determineLiveState(entries, t(9, 30));
    expect(state.kind).toBe('at');
    if (state.kind === 'at') {
      expect(state.entry.block.id).toBe('a');
      expect(state.minutesUntilLeave).toBe(30);
      expect(state.next?.block.id).toBe('b');
    }
  });

  it('이동 구간 안이면 traveling', () => {
    const entries = [entry('a', t(9), t(10), leg(20)), entry('b', t(10, 20), t(11))];
    const state = determineLiveState(entries, t(10, 10));
    expect(state.kind).toBe('traveling');
    if (state.kind === 'traveling') {
      expect(state.from.block.id).toBe('a');
      expect(state.to.block.id).toBe('b');
      expect(state.minutesUntilArrival).toBe(10);
    }
  });

  it('마지막 블록 이후면 done', () => {
    const entries = [entry('a', t(9), t(10))];
    expect(determineLiveState(entries, t(11)).kind).toBe('done');
  });
});
