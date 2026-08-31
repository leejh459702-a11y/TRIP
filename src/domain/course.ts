import { haversineM } from './geo';
import type { Block, Course, CourseDay, Place, TravelMode } from './types';

function newId(): string {
  return crypto.randomUUID();
}

/** B9: 새 날짜를 추가합니다. */
export function createDay(date: string, startTime = '09:00'): CourseDay {
  return { id: newId(), date, startTime, blocks: [] };
}

/** B10: estCost 기본값 = 장소의 1인당 예상 비용 × 인원수. */
export function createPlaceBlock(place: Place, partySize = 1): Block {
  return {
    id: newId(),
    type: 'place',
    placeId: place.id,
    stayMin: place.defaultStayMin,
    modeToNext: 'car',
    estCost: place.estCostPerPerson != null ? place.estCostPerPerson * partySize : undefined,
  };
}

export function createFreeBlock(label: string, stayMin = 60): Block {
  return {
    id: newId(),
    type: 'free',
    label,
    stayMin,
  };
}

/** 블록을 fromIndex에서 toIndex로 옮긴 새 배열을 반환합니다 (불변). */
export function reorderBlocks(blocks: Block[], fromIndex: number, toIndex: number): Block[] {
  const next = [...blocks];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return blocks;
  next.splice(toIndex, 0, moved);
  return next;
}

export function removeBlockById(blocks: Block[], blockId: string): Block[] {
  return blocks.filter((b) => b.id !== blockId);
}

export function updateBlock(blocks: Block[], blockId: string, patch: Partial<Block>): Block[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b));
}

export function updateBlockStayMin(blocks: Block[], blockId: string, stayMin: number): Block[] {
  return updateBlock(blocks, blockId, { stayMin: Math.max(0, stayMin) });
}

export function updateBlockMode(blocks: Block[], blockId: string, mode: TravelMode): Block[] {
  return updateBlock(blocks, blockId, { modeToNext: mode });
}

/** B3: target과 가까운 순으로 정렬한 대체 후보(최대 limit개, target 자신 제외)를 반환합니다. */
export function nearestPlaces(target: Place, candidates: readonly Place[], limit = 3): Place[] {
  return candidates
    .filter((p) => p.id !== target.id)
    .map((p) => ({ p, dist: haversineM(target, p) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map(({ p }) => p);
}

/** B3: 블록의 장소를 대체 장소로 교체합니다 (체류시간은 새 장소의 기본값으로 초기화). */
export function swapBlockPlace(blocks: Block[], blockId: string, replacement: Place): Block[] {
  return blocks.map((b) =>
    b.id === blockId
      ? { ...b, placeId: replacement.id, stayMin: replacement.defaultStayMin }
      : b,
  );
}

/** B8: 블록의 장소 슬롯을 채웁니다. 체류시간·이동수단은 템플릿 값을 그대로 유지합니다. */
export function fillSlot(blocks: Block[], blockId: string, place: Place): Block[] {
  return updateBlock(blocks, blockId, { placeId: place.id });
}

/** 방문 실행 상태(완료·지연 등)는 새 사본에 남기지 않고, id만 새로 발급합니다. */
function cloneDaysResetRuntimeState(days: CourseDay[]): CourseDay[] {
  return days.map((d) => ({
    ...d,
    id: newId(),
    blocks: d.blocks.map((b) => ({
      ...b,
      id: newId(),
      done: undefined,
      doneAt: undefined,
      delayMin: undefined,
    })),
  }));
}

function stripPlaceIds(days: CourseDay[]): CourseDay[] {
  return days.map((d) => ({
    ...d,
    anchorPlaceId: undefined,
    blocks: d.blocks.map((b) => ({ ...b, placeId: undefined, planBPlaceIds: undefined })),
  }));
}

/**
 * B8: 지금 코스를 템플릿으로 저장합니다. 실제 장소는 그대로 복사됩니다
 * (템플릿 자체는 참고용 완성 코스이고, "장소만 비어 있는" 슬롯은 이 템플릿으로
 * 새 코스를 시작할 때만 만들어집니다 — instantiateFromTemplate 참고).
 */
export function createTemplateFrom(course: Course, title: string): Omit<Course, 'id'> {
  const now = new Date().toISOString();
  return {
    title,
    startDate: course.startDate,
    partySize: course.partySize,
    days: cloneDaysResetRuntimeState(course.days),
    isTemplate: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** B8: 템플릿에서 실제 코스를 시작합니다. 장소는 빈 슬롯("이 자리에 넣을 장소")으로 남습니다. */
export function instantiateFromTemplate(
  template: Course,
  input: { title: string; startDate: string; partySize: number },
): Omit<Course, 'id'> {
  const now = new Date().toISOString();
  return {
    title: input.title,
    startDate: input.startDate,
    partySize: input.partySize,
    days: stripPlaceIds(cloneDaysResetRuntimeState(template.days)),
    isTemplate: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** C1: 주어진 날짜(yyyy-MM-dd)와 일치하는 첫 코스/날짜 조합을 찾습니다. */
export function findCourseDayForDate(
  courses: readonly Course[],
  dateISO: string,
): { course: Course; day: CourseDay } | undefined {
  for (const course of courses) {
    const day = course.days.find((d) => d.date === dateISO);
    if (day) return { course, day };
  }
  return undefined;
}
