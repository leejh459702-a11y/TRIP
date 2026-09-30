import { BALANCE } from '../config/balance';
import { ERA_COUNT } from '../config/eras';
import type { SideState } from './types';

export const MAX_ERA = ERA_COUNT - 1;

/** 다음 시대 진화에 필요한 누적 EXP (최종 시대면 null) */
export function expRequired(era: number): number | null {
  return era < MAX_ERA ? BALANCE.era.expToEvolve[era] : null;
}

export function canEvolve(side: Pick<SideState, 'era' | 'exp'>): boolean {
  const req = expRequired(side.era);
  return req !== null && side.exp >= req;
}

/** 0..1 현재 시대 진화 진행률 */
export function evolveProgress(side: Pick<SideState, 'era' | 'exp'>): number {
  const req = expRequired(side.era);
  if (req === null) return 1;
  const prev = side.era > 0 ? BALANCE.era.expToEvolve[side.era - 1] : 0;
  return Math.max(0, Math.min(1, (side.exp - prev) / (req - prev)));
}

/**
 * 진화: 시대 +1, 기지 최대 HP를 새 시대 값으로 바꾸되 현재 HP 비율 유지.
 * 필드 유닛/포탑의 스탯은 그대로 유지된다.
 */
export function evolve(side: SideState): boolean {
  if (!canEvolve(side)) return false;
  side.era += 1;
  side.base.setMaxHpKeepRatio(BALANCE.era.baseMaxHp[side.era] * side.base.hpMult);
  return true;
}
