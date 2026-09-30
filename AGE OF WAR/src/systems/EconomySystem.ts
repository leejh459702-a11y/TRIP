import { BALANCE } from '../config/balance';
import type { SideState } from './types';

/** 처치 보상: 골드 = cost × 1.25, EXP = cost × 2 (배율은 balance.ts) */
export function killReward(cost: number): { gold: number; exp: number } {
  return {
    gold: Math.round(cost * BALANCE.economy.killGoldMult),
    exp: Math.round(cost * BALANCE.economy.killExpMult),
  };
}

/** 기지 피해에 따른 EXP */
export function baseDamageExp(damage: number): number {
  return damage * BALANCE.economy.baseDamageExpRatio;
}

export function applyIncome(side: SideState, dt: number): void {
  const g = BALANCE.economy.incomePerSec * side.incomeMult * side.mods.income * dt;
  side.gold += g;
  side.stats.goldEarned += g;
}

export function canAfford(side: { gold: number }, amount: number): boolean {
  return side.gold >= amount;
}

export function spend(side: { gold: number }, amount: number): boolean {
  if (!canAfford(side, amount)) return false;
  side.gold -= amount;
  return true;
}

/** 처치 보상 지급. 실제 지급된 골드/EXP를 반환 */
export function grantKillReward(side: SideState, cost: number): { gold: number; exp: number } {
  const r = killReward(cost);
  const gold = Math.round(r.gold * side.incomeMult * side.mods.killGold);
  side.gold += gold;
  side.exp += r.exp;
  side.stats.goldEarned += gold;
  side.stats.kills += 1;
  return { gold, exp: r.exp };
}

export function grantBaseDamageExp(side: SideState, damage: number): number {
  const e = baseDamageExp(damage);
  side.exp += e;
  return e;
}
