import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { getTurretStats } from '../src/config/eras';
import { sellRefund } from '../src/systems/GameWorld';
import { makeWorld, place, run } from './helpers';

describe('포탑', () => {
  it('시대1 포탑 비용/DPS 기준값', () => {
    const l = getTurretStats('light', 0);
    const m = getTurretStats('medium', 0);
    const h = getTurretStats('heavy', 0);
    expect([l.cost, l.damage / l.cooldown]).toEqual([100, 8]);
    expect([m.cost, m.damage / m.cooldown]).toEqual([200, 14]);
    expect([h.cost, h.damage / h.cooldown, h.splashRadius]).toEqual([350, 10, 60]);
    expect(l.range).toBe(260);
  });

  it('구매 시 골드 차감, 슬롯 1번만 기본 개방', () => {
    const w = makeWorld();
    const s = w.side(0);
    s.gold = 1000;
    expect(w.buyTurret(0, 'medium').ok).toBe(true);
    expect(s.gold).toBe(800);
    expect(s.turrets[0]?.tier).toBe('medium');
    // 빈 슬롯 없음
    expect(w.buyTurret(0, 'light').ok).toBe(false);
    expect(w.buyTurret(0, 'light', 1).ok).toBe(false);
  });

  it('슬롯 해금 비용 1000 / 3000', () => {
    const w = makeWorld();
    const s = w.side(0);
    s.gold = 3999;
    expect(w.unlockSlot(0).ok).toBe(true);
    expect(s.gold).toBe(2999);
    expect(w.unlockSlot(0).ok).toBe(false);
    s.gold = 3000;
    expect(w.unlockSlot(0).ok).toBe(true);
    expect(s.unlockedSlots).toBe(3);
    expect(w.unlockSlot(0).ok).toBe(false);
  });

  it('판매 시 구매가의 50% 환급', () => {
    expect(sellRefund(350)).toBe(175);
    const w = makeWorld();
    const s = w.side(0);
    s.gold = 350;
    w.buyTurret(0, 'heavy');
    expect(s.gold).toBe(0);
    expect(w.sellTurret(0, 0).ok).toBe(true);
    expect(s.gold).toBe(175);
    expect(s.turrets[0]).toBeNull();
    expect(w.sellTurret(0, 0).ok).toBe(false);
  });

  it('진화 후 판매해도 환급은 실제 구매가 기준', () => {
    const w = makeWorld();
    const s = w.side(0);
    s.gold = 100;
    w.buyTurret(0, 'light');
    s.exp = 1000;
    w.evolve(0);
    s.gold = 0;
    w.sellTurret(0, 0);
    expect(s.gold).toBe(50);
  });

  it('사거리 안의 적을 공격하고, 범위 포탑은 주변 적도 피해', () => {
    const w = makeWorld();
    const s = w.side(0);
    s.gold = 350;
    w.buyTurret(0, 'heavy');
    const x = s.base.frontX + 150;
    const a = place(w, 1, 'melee', x);
    const b = place(w, 1, 'melee', x + 30);
    (a.stats as { speed: number }).speed = 0;
    (b.stats as { speed: number }).speed = 0;
    run(w, 1.0);
    expect(a.hp).toBeLessThan(a.maxHp);
    expect(b.hp).toBeLessThan(b.maxHp);
  });

  it('사거리 밖 적은 공격하지 않는다', () => {
    const w = makeWorld();
    const s = w.side(0);
    s.gold = 100;
    w.buyTurret(0, 'light');
    const far = place(w, 1, 'melee', s.base.frontX + BALANCE.turret.range + 100);
    (far.stats as { speed: number }).speed = 0;
    run(w, 2);
    expect(far.hp).toBe(far.maxHp);
  });
});
