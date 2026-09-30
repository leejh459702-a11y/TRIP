/**
 * 스토리 모드: 1-1 → 5-5 까지 25개 스테이지를 차례로 깨는 모드.
 * 스테이지가 올라갈수록 적 AI 성향·수입·유닛/기지 체력이 강해지고,
 * 클리어로 얻은 강화 포인트로 플레이어 진영을 영구 강화한다.
 * 수치는 모두 이 파일에서 조정한다.
 */
import { AI_PARAMS, type AIParams } from './ai';
import type { SideMods } from '../systems/types';

export const CHAPTERS = 5;
export const STAGES_PER_CHAPTER = 5;
export const STAGE_COUNT = CHAPTERS * STAGES_PER_CHAPTER;

/** 0부터 시작하는 스테이지 번호 → "1-1" */
export function stageLabel(stage: number): string {
  return `${Math.floor(stage / STAGES_PER_CHAPTER) + 1}-${(stage % STAGES_PER_CHAPTER) + 1}`;
}

export interface StageDef {
  index: number;
  label: string;
  /** 적 AI 성향 */
  ai: AIParams;
  /** 적 수입 배율(기본 수입·처치 골드) */
  enemyIncomeMult: number;
  /** 적 강화 배율 */
  enemyMods: Partial<SideMods>;
  /** 첫 클리어 보상 포인트 */
  firstClearPoints: number;
}

/** 재클리어 보상 포인트 */
export const REPLAY_POINTS = 1;

/**
 * 스테이지 난이도 곡선.
 * - 1장: 쉬움 AI(반응 느림)부터 시작
 * - 2~3장: 보통 AI
 * - 4~5장: 어려움 AI
 * 위에 적 수입과 유닛/기지 체력 배율을 스테이지마다 조금씩 더한다.
 */
export function getStage(index: number): StageDef {
  const s = Math.max(0, Math.min(STAGE_COUNT - 1, index));
  const chapter = Math.floor(s / STAGES_PER_CHAPTER);
  const base = chapter === 0 ? AI_PARAMS.easy : chapter <= 2 ? AI_PARAMS.normal : AI_PARAMS.hard;
  const ai: AIParams = {
    ...base,
    label: stageLabel(s),
    desc: `스토리 ${stageLabel(s)}`,
    // 1장은 반응이 점점 빨라진다(2.5초 → 0.5초)
    reactionDelay: chapter === 0 ? 2.5 - (s % STAGES_PER_CHAPTER) * 0.5 : 0,
  };
  return {
    index: s,
    label: stageLabel(s),
    ai,
    enemyIncomeMult: 0.7 + s * 0.035,
    enemyMods: {
      unitStat: 1 + Math.max(0, s - 4) * 0.015,
      baseHp: 1 + s * 0.03,
    },
    firstClearPoints: 3 + chapter,
  };
}

// ───────────────────────── 강화 ─────────────────────────

export type UpgradeKey = 'unitStat' | 'specialCooldown' | 'income' | 'killGold' | 'baseHp';

export interface UpgradeDef {
  key: UpgradeKey;
  name: string;
  /** 레벨당 변화량(배율) */
  perLevel: number;
  maxLevel: number;
  /** 현재 효과 문구 */
  describe: (level: number) => string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const UPGRADES: UpgradeDef[] = [
  { key: 'unitStat', name: '유닛 강화', perLevel: 0.05, maxLevel: 10, describe: (l) => `유닛 HP·공격력 +${pct(l * 0.05)}` },
  { key: 'specialCooldown', name: '특수기 쿨타임 감소', perLevel: 0.05, maxLevel: 10, describe: (l) => `특수기 쿨타임 −${pct(l * 0.05)}` },
  { key: 'income', name: '초당 골드 증가', perLevel: 0.1, maxLevel: 10, describe: (l) => `초당 골드 +${pct(l * 0.1)}` },
  { key: 'killGold', name: '처치 골드 증가', perLevel: 0.1, maxLevel: 10, describe: (l) => `처치 골드 +${pct(l * 0.1)}` },
  { key: 'baseHp', name: '기지 체력 증가', perLevel: 0.1, maxLevel: 10, describe: (l) => `기지 최대 HP +${pct(l * 0.1)}` },
];

/** 다음 레벨로 올리는 비용(포인트) */
export function upgradeCost(level: number): number {
  return level + 1;
}

export type UpgradeLevels = Record<UpgradeKey, number>;

export function emptyLevels(): UpgradeLevels {
  return { unitStat: 0, specialCooldown: 0, income: 0, killGold: 0, baseHp: 0 };
}

/** 강화 레벨 → 진영 배율 */
export function upgradeMods(levels: UpgradeLevels): SideMods {
  const up = (k: UpgradeKey) => (UPGRADES.find((u) => u.key === k)!.perLevel) * levels[k];
  return {
    unitStat: 1 + up('unitStat'),
    specialCooldown: 1 - up('specialCooldown'),
    income: 1 + up('income'),
    killGold: 1 + up('killGold'),
    baseHp: 1 + up('baseHp'),
  };
}
