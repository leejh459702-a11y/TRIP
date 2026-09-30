import { describe, expect, it } from 'vitest';
import { AI_PARAMS } from '../src/config/ai';
import { GameWorld } from '../src/systems/GameWorld';

describe('기본 모드 난이도 보정', () => {
  it('쉬움: 적 유닛 체력 −30%(공격력은 그대로), 플레이어 유닛은 그대로', () => {
    const p = AI_PARAMS.easy;
    const w = new GameWorld({ seed: 1, incomeMult: [p.playerIncomeMult, p.incomeMult], mods: [undefined, { unitHp: p.unitHpMult }] });
    const mine = w.spawnUnit(0, { role: 'heavy', era: 0 });
    const enemy = w.spawnUnit(1, { role: 'heavy', era: 0 });
    expect(enemy.maxHp).toBe(Math.round(mine.maxHp * 0.7));
    expect(enemy.stats.atk).toBe(mine.stats.atk);
    expect(w.side(0).incomeMult).toBeCloseTo(1.3);
    expect(w.side(1).incomeMult).toBe(1);
  });

  it('보통·어려움은 적 체력 보정 없음', () => {
    expect(AI_PARAMS.normal.unitHpMult).toBe(1);
    expect(AI_PARAMS.hard.unitHpMult).toBe(1);
  });
});
