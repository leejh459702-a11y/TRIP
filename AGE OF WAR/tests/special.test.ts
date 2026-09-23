import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { makeWorld, place, run } from './helpers';

describe('특수기', () => {
  it('쿨다운 중엔 사용 불가, 사용 후 60초 쿨다운', () => {
    const w = makeWorld();
    const s = w.side(0);
    expect(w.useSpecial(0).ok).toBe(false);
    s.specialCooldown = 0;
    expect(w.useSpecial(0).ok).toBe(true);
    expect(s.specialCooldown).toBe(BALANCE.special.cooldown);
    expect(w.drops.length).toBeGreaterThanOrEqual(BALANCE.special.dropsMin);
    expect(w.drops.length).toBeLessThanOrEqual(BALANCE.special.dropsMax);
    expect(w.useSpecial(0).ok).toBe(false);
  });

  it('착탄 후 적 유닛만 피해, 적 기지와 아군은 무사', () => {
    const w = makeWorld();
    w.side(0).specialCooldown = 0;
    const enemies = [800, 1000, 1200, 1400].map((x) => place(w, 1, 'heavy', x, 4));
    const ally = place(w, 0, 'heavy', 600, 4);
    for (const u of [...enemies, ally]) (u.stats as { speed: number }).speed = 0;
    const baseHp = w.side(1).base.hp;
    w.useSpecial(0);
    run(w, BALANCE.special.spreadDuration + BALANCE.special.fallTime + 0.2);
    expect(w.drops.length).toBe(0);
    expect(enemies.some((e) => e.hp < e.maxHp)).toBe(true);
    expect(ally.hp).toBe(ally.maxHp);
    expect(w.side(1).base.hp).toBe(baseHp);
  });
});
