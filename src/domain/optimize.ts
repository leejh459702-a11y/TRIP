import { haversineM } from './geo';
import type { Block, Place } from './types';

interface Entry {
  block: Block;
  place?: Place;
}

export interface OptimizeResult {
  /** 재배치된 블록 순서. 원본과 내용은 같고 순서만 다릅니다. */
  blocks: Block[];
  /** 원래 순서와 실제로 달라졌는지. false면 미리보기에서 "이미 최적입니다" 안내용. */
  changed: boolean;
  /** 참고용: 장소 블록 사이 총 직선거리(m). 최적화 전/후 비교에 씁니다. */
  totalDistanceM: number;
}

/** 순서대로 이어진 장소 블록들의 총 직선거리(m). 자유시간 블록은 좌표가 없어 건너뜁니다. */
function chainDistanceM(entries: readonly Entry[]): number {
  const points = entries.map((e) => e.place).filter((p): p is Place => !!p);
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineM(points[i]!, points[i + 1]!);
  }
  return total;
}

/** 열린 경로(사이클 아님) 총 거리를 최소화하는 순열을 완전탐색합니다. n<=6에서만 사용. */
function bruteForceOrder(items: Entry[]): Entry[] {
  if (items.length <= 1) return items;
  let best = items;
  let bestDist = chainDistanceM(items);

  function permute(arr: Entry[], k: number) {
    if (k === arr.length) {
      const dist = chainDistanceM(arr);
      if (dist < bestDist) {
        bestDist = dist;
        best = [...arr];
      }
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      permute(arr, k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  }
  permute([...items], 0);
  return best;
}

/** 최근접 이웃으로 초기 경로를 만들고, 개선되는 동안 2-opt로 다듬습니다. n>6일 때 사용. */
function nearestNeighborThenTwoOpt(items: Entry[]): Entry[] {
  if (items.length <= 1) return items;

  const remaining = [...items];
  const route: Entry[] = [remaining.shift()!];
  while (remaining.length > 0) {
    const last = route[route.length - 1]!.place!;
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((e, i) => {
      const d = e.place ? haversineM(last, e.place) : Infinity;
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    });
    route.push(remaining.splice(nearestIdx, 1)[0]!);
  }

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 2; i++) {
      for (let j = i + 2; j < route.length; j++) {
        const a = route[i]!.place!;
        const b = route[i + 1]!.place!;
        const c = route[j]!.place!;
        const d = route[j + 1]?.place;
        const before = haversineM(a, b) + (d ? haversineM(c, d) : 0);
        const after = haversineM(a, c) + (d ? haversineM(b, d) : 0);
        if (after < before) {
          const reversed = route.slice(i + 1, j + 1).reverse();
          route.splice(i + 1, reversed.length, ...reversed);
          improved = true;
        }
      }
    }
  }
  return route;
}

function optimizeOrder(items: Entry[]): Entry[] {
  return items.length <= 6 ? bruteForceOrder(items) : nearestNeighborThenTwoOpt(items);
}

/**
 * B6: 하루 블록 순서를 자동 최적화합니다.
 * - `food` 블록(점심/저녁)과 `free` 블록은 시간대·의미가 고정이므로 위치를 바꾸지 않습니다.
 * - `stay` 블록은 하루의 첫 블록 또는 마지막 블록으로 고정합니다(원래 위치가 앞쪽이면 첫 블록으로).
 * - 그 외 장소 블록만 이동시간(직선거리로 근사) 최소화 순서로 재배치합니다.
 * B1·B2가 구현된 뒤에 착수하라는 명세 8절 지시에 따라, 영업시간·이동경고는 호출부(타임라인)에서
 * 재배치 결과를 다시 계산해 그대로 드러납니다 — 이 함수 자체는 순서만 바꿉니다.
 */
export function optimizeDayOrder(
  blocks: readonly Block[],
  placeById: ReadonlyMap<string, Place>,
): OptimizeResult {
  const entries: Entry[] = blocks.map((block) => ({
    block,
    place: block.placeId ? placeById.get(block.placeId) : undefined,
  }));

  const stayEntries = entries.filter((e) => e.place?.category === 'stay');
  const rest = entries.filter((e) => e.place?.category !== 'stay');

  const lockedIndices: number[] = []; // rest 배열 기준, food/free/좌표없음
  const movable: Entry[] = [];
  rest.forEach((e, i) => {
    const isMovable = e.block.type === 'place' && e.place && e.place.category !== 'food';
    if (isMovable) movable.push(e);
    else lockedIndices.push(i);
  });

  const reorderedMovable = optimizeOrder(movable);

  const restResult: Entry[] = [];
  let movableCursor = 0;
  for (let i = 0; i < rest.length; i++) {
    if (lockedIndices.includes(i)) {
      restResult.push(rest[i]!);
    } else {
      restResult.push(reorderedMovable[movableCursor]!);
      movableCursor += 1;
    }
  }

  // stay 앵커: 원래 위치가 앞쪽 절반이었으면 맨 앞, 아니면 맨 뒤.
  const originalStayIndex = entries.findIndex((e) => e.place?.category === 'stay');
  const stayAtFront = originalStayIndex >= 0 && originalStayIndex < entries.length / 2;

  const finalEntries =
    stayEntries.length === 0
      ? restResult
      : stayAtFront
        ? [...stayEntries, ...restResult]
        : [...restResult, ...stayEntries];

  const finalBlocks = finalEntries.map((e) => e.block);
  const changed = finalBlocks.some((b, i) => b.id !== blocks[i]?.id);

  return {
    blocks: finalBlocks,
    changed,
    totalDistanceM: chainDistanceM(finalEntries),
  };
}

/** 최적화 전 원래 순서의 총 거리(m). 미리보기에서 전/후 비교용. */
export function currentChainDistanceM(
  blocks: readonly Block[],
  placeById: ReadonlyMap<string, Place>,
): number {
  const entries: Entry[] = blocks.map((block) => ({
    block,
    place: block.placeId ? placeById.get(block.placeId) : undefined,
  }));
  return chainDistanceM(entries);
}
