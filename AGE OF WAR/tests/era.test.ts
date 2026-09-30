import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { canEvolve, evolveProgress } from '../src/systems/EraSystem';
import { makeWorld, place } from './helpers';

describe('진화', () => {
  it('EXP가 부족하면 진화할 수 없다', () => {
    const w = makeWorld();
    w.side(0).exp = 999;
    expect(canEvolve(w.side(0))).toBe(false);
    expect(w.evolve(0).ok).toBe(false);
    expect(w.side(0).era).toBe(0);
  });

  it('진화 시 기지 최대 HP가 바뀌고 현재 HP 비율은 유지된다', () => {
    const w = makeWorld();
    const s = w.side(0);
    s.base.hp = 250; // 50%
    s.exp = 1000;
    expect(w.evolve(0).ok).toBe(true);
    expect(s.era).toBe(1);
    expect(s.base.maxHp).toBe(BALANCE.era.baseMaxHp[1]);
    expect(s.base.hp).toBeCloseTo(BALANCE.era.baseMaxHp[1] * 0.5);
  });

  it('여러 번 진화해도 비율이 유지되고 최종 시대 이후엔 진화 불가', () => {
    const w = makeWorld();
    const s = w.side(0);
    s.base.hp = s.base.maxHp * 0.3;
    s.exp = 1e9;
    for (let i = 0; i < 4; i++) expect(w.evolve(0).ok).toBe(true);
    expect(s.era).toBe(4);
    expect(s.base.maxHp).toBe(5000);
    expect(s.base.hp).toBeCloseTo(1500);
    expect(w.evolve(0).ok).toBe(false);
    expect(evolveProgress(s)).toBe(1);
  });

  it('기존 필드 유닛 스탯은 진화 후에도 유지되고 새 유닛은 새 시대 스탯', () => {
    const w = makeWorld();
    const s = w.side(0);
    const old = place(w, 0, 'melee', 500);
    s.exp = 1000;
    w.evolve(0);
    expect(old.era).toBe(0);
    expect(old.maxHp).toBe(60);
    s.gold = 1000;
    w.train(0, 'melee');
    expect(s.queue.items[0].era).toBe(1);
    expect(s.queue.items[0].cost).toBe(Math.round(15 * 2.5));
  });

  it('진화 진행률은 이전 기준치부터 계산된다', () => {
    expect(evolveProgress({ era: 0, exp: 500 })).toBeCloseTo(0.5);
    expect(evolveProgress({ era: 1, exp: 1000 + 1250 })).toBeCloseTo(0.5);
  });
});
