import { addDays, format } from 'date-fns';
import { checkBusinessHours } from './businessHours';
import { haversineM } from './geo';
import { createDay, createPlaceBlock } from './course';
import type { CourseDay, Place } from './types';

/** G4: 방문 기록이 이 건수 이상 쌓여야 초안 생성이 의미가 생깁니다. */
export const DRAFT_MIN_VISIT_COUNT = 30;

export interface DraftGeneratorInput {
  sido?: string;
  sigungu?: string;
  /** 동행 태그(부모님/연인/친구/혼자/아이동반 등). 비어 있으면 필터하지 않습니다. */
  companionTags: string[];
  partySize: number;
  days: number;
  /** 1인당 예산대 상한. 없으면 예산 필터를 적용하지 않습니다. */
  budgetPerPerson?: number;
  startDate: string; // yyyy-MM-dd
}

export interface DraftGeneratorResult {
  days: CourseDay[];
  /** 카테고리를 다 채우지 못했거나 영업시간이 불확실한 경우의 안내. */
  warnings: string[];
}

const LUNCH_REFERENCE = { hour: 12, minute: 0 };
const DINNER_REFERENCE = { hour: 18, minute: 0 };

/** 후보군 중 latestRevisit === 'no'는 제외하고, 'yes' → 미방문 → 'maybe' 순으로 우선순위를 매깁니다. */
function priorityScore(p: Place): number {
  if (p.latestRevisit === 'yes') return 0;
  if (p.visitCount === 0) return 1;
  if (p.latestRevisit === 'maybe') return 2;
  return Infinity; // 'no' — 다시 추천하지 않음
}

function matchesFilter(p: Place, input: DraftGeneratorInput): boolean {
  if (input.sido && p.region.sido !== input.sido) return false;
  if (input.sigungu && p.region.sigungu !== input.sigungu) return false;
  if (input.companionTags.length > 0 && !input.companionTags.every((t) => p.tags.includes(t))) {
    return false;
  }
  if (input.budgetPerPerson != null && p.estCostPerPerson != null) {
    if (p.estCostPerPerson > input.budgetPerPerson) return false;
  }
  return true;
}

/** 후보 목록에서 카테고리별로 나눠, 이미 쓴 장소를 제외하고 정렬합니다. */
function candidatesByCategory(pool: Place[], used: ReadonlySet<string>) {
  const byCategory = { food: [] as Place[], cafe: [] as Place[], activity: [] as Place[], etc: [] as Place[] };
  for (const p of pool) {
    if (used.has(p.id)) continue;
    if (p.category === 'food') byCategory.food.push(p);
    else if (p.category === 'cafe') byCategory.cafe.push(p);
    else if (p.category === 'activity') byCategory.activity.push(p);
    else if (p.category === 'etc') byCategory.etc.push(p);
  }
  return byCategory;
}

/** 영업시간이 명확히 충돌하면 false. 미확인이거나 문제없으면 true(낙관적으로 채택). */
function isBusinessHoursOk(p: Place, referenceDate: Date): boolean {
  const result = checkBusinessHours(referenceDate, p.businessHours);
  if (!result) return true; // 미확인 — 배제하지 않고 초안에는 포함(타임라인에서 "미확인" 배지로 드러남)
  return !result.closed && !result.onBreak;
}

/** 후보 중, referenceDate 기준 영업시간이 맞는 것을 우선으로 하나 고릅니다. */
function pickWithBusinessHours(
  candidates: Place[],
  referenceDate: Date,
  warnings: string[],
  mealLabel: string,
): Place | undefined {
  const ok = candidates.find((p) => isBusinessHoursOk(p, referenceDate));
  if (ok) return ok;
  if (candidates.length > 0) {
    warnings.push(`${mealLabel} 후보 중 영업시간이 맞는 곳을 찾지 못해 첫 후보로 채웠습니다 — 직접 확인해 주세요.`);
    return candidates[0];
  }
  return undefined;
}

/** 근접도 순서로 재배치합니다(첫 장소 고정, 이후 최근접 이웃). */
function orderByProximity(picks: Place[]): Place[] {
  if (picks.length <= 1) return picks;
  const remaining = [...picks];
  const route = [remaining.shift()!];
  while (remaining.length > 0) {
    const last = route[route.length - 1]!;
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineM(last, p);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    });
    route.push(remaining.splice(nearestIdx, 1)[0]!);
  }
  return route;
}

/**
 * G4: 저장 장소 + 방문 기록만으로 코스 초안을 만듭니다. 외부 추천은 절대 섞지 않습니다.
 * 선정 우선순위(revisit:'yes' → 미방문 → 'maybe') → 카테고리 배분(끼니 수 = 일수×2) →
 * 근접도 순서 배치 → 영업시간 검증(B1) 순으로 처리합니다.
 */
export function generateCourseDraft(places: readonly Place[], input: DraftGeneratorInput): DraftGeneratorResult {
  const warnings: string[] = [];
  const pool = places
    .filter((p) => matchesFilter(p, input))
    .filter((p) => priorityScore(p) !== Infinity)
    .sort((a, b) => priorityScore(a) - priorityScore(b));

  const used = new Set<string>();
  const days: CourseDay[] = [];

  for (let dayIdx = 0; dayIdx < input.days; dayIdx++) {
    const date = format(addDays(new Date(`${input.startDate}T00:00:00`), dayIdx), 'yyyy-MM-dd');
    const day = createDay(date, '09:00');
    const byCategory = candidatesByCategory(pool, used);

    const lunchRef = new Date(`${date}T00:00:00`);
    lunchRef.setHours(LUNCH_REFERENCE.hour, LUNCH_REFERENCE.minute, 0, 0);
    const dinnerRef = new Date(`${date}T00:00:00`);
    dinnerRef.setHours(DINNER_REFERENCE.hour, DINNER_REFERENCE.minute, 0, 0);

    const lunch = pickWithBusinessHours(byCategory.food, lunchRef, warnings, `${dayIdx + 1}일차 점심`);
    if (lunch) used.add(lunch.id);
    const dinnerCandidates = byCategory.food.filter((p) => p.id !== lunch?.id);
    const dinner = pickWithBusinessHours(dinnerCandidates, dinnerRef, warnings, `${dayIdx + 1}일차 저녁`);
    if (dinner) used.add(dinner.id);
    if (!lunch && !dinner) {
      warnings.push(`${dayIdx + 1}일차에 넣을 만한 식사 장소가 부족합니다.`);
    }

    const activityPicks = byCategory.activity.slice(0, 2);
    activityPicks.forEach((p) => used.add(p.id));
    const cafePick = byCategory.cafe[0];
    if (cafePick) used.add(cafePick.id);
    if (activityPicks.length === 0 && !cafePick) {
      warnings.push(`${dayIdx + 1}일차에 채울 활동/카페 장소가 부족합니다.`);
    }

    const morningPicks = orderByProximity(activityPicks.slice(0, 1));
    const afternoonPicks = orderByProximity([...activityPicks.slice(1), ...(cafePick ? [cafePick] : [])]);

    const orderedPicks = [
      ...morningPicks,
      ...(lunch ? [lunch] : []),
      ...afternoonPicks,
      ...(dinner ? [dinner] : []),
    ];

    day.blocks = orderedPicks.map((p) => createPlaceBlock(p, input.partySize));
    days.push(day);
  }

  return { days, warnings };
}

/** 방문 기록이 초안 생성 게이트(30건)를 넘겼는지. */
export function hasEnoughVisitHistory(visitCount: number): boolean {
  return visitCount >= DRAFT_MIN_VISIT_COUNT;
}
