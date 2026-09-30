import { emptyLevels, getStage, REPLAY_POINTS, STAGE_COUNT, UPGRADES, upgradeCost, type UpgradeKey, type UpgradeLevels } from '../config/story';

/** 스토리 모드 진행 상황(브라우저에 저장) */
export interface StorySave {
  /** 클리어한 스테이지 수 = 다음에 열린 스테이지 번호 */
  cleared: number;
  /** 사용 가능한 강화 포인트 */
  points: number;
  levels: UpgradeLevels;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'chronofront.story.v1';

export function newSave(): StorySave {
  return { cleared: 0, points: 0, levels: emptyLevels() };
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** 저장본을 읽는다. 없거나 깨졌으면 새 진행 상황 */
export function loadStory(store: KeyValueStore | null = defaultStore()): StorySave {
  const save = newSave();
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return save;
    const d = JSON.parse(raw) as Partial<StorySave>;
    save.cleared = clampInt(d.cleared, 0, STAGE_COUNT);
    save.points = clampInt(d.points, 0, 1e6);
    for (const u of UPGRADES) save.levels[u.key] = clampInt(d.levels?.[u.key], 0, u.maxLevel);
  } catch {
    // 저장소 접근 불가·손상 → 새로 시작
  }
  return save;
}

export function saveStory(save: StorySave, store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.setItem(KEY, JSON.stringify(save));
  } catch {
    // 저장 실패는 무시(이번 세션 동안만 유지)
  }
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : min;
  return Math.max(min, Math.min(max, n));
}

export function isStageUnlocked(save: StorySave, stage: number): boolean {
  return stage >= 0 && stage < STAGE_COUNT && stage <= save.cleared;
}

/** 스테이지 승리 처리: 첫 클리어면 다음 스테이지 해금 + 큰 보상, 아니면 소량 보상. 얻은 포인트 반환 */
export function recordWin(save: StorySave, stage: number): number {
  const first = stage === save.cleared;
  const pts = first ? getStage(stage).firstClearPoints : REPLAY_POINTS;
  if (first) save.cleared = Math.min(STAGE_COUNT, save.cleared + 1);
  save.points += pts;
  return pts;
}

export function canUpgrade(save: StorySave, key: UpgradeKey): boolean {
  const def = UPGRADES.find((u) => u.key === key)!;
  const lv = save.levels[key];
  return lv < def.maxLevel && save.points >= upgradeCost(lv);
}

export function buyUpgrade(save: StorySave, key: UpgradeKey): boolean {
  if (!canUpgrade(save, key)) return false;
  save.points -= upgradeCost(save.levels[key]);
  save.levels[key] += 1;
  return true;
}

/** 강화를 모두 되돌리고 쓴 포인트를 돌려준다 */
export function refundUpgrades(save: StorySave): void {
  for (const u of UPGRADES) {
    for (let l = 0; l < save.levels[u.key]; l++) save.points += upgradeCost(l);
    save.levels[u.key] = 0;
  }
}
