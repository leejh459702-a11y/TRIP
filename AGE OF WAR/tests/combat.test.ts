import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { getUnitStats } from '../src/config/eras';
import { damageBase, damageUnit } from '../src/systems/CombatSystem';
import { baseDamageExp, killReward } from '../src/systems/EconomySystem';
import { makeWorld, place, run } from './helpers';

describe('유닛 스탯 & 시대 배율', () => {
  it('시대1 기준 스탯은 기획값과 같다', () => {
    const m = getUnitStats('melee', 0);
    expect([m.cost, m.hp, m.atk, m.cooldown, m.range, m.speed, m.trainTime]).toEqual([15, 60, 12, 1.0, 25, 40, 1.0]);
    const r = getUnitStats('ranged', 0);
    expect([r.cost, r.hp, r.atk, r.cooldown, r.range, r.speed, r.trainTime]).toEqual([25, 40, 8, 1.2, 140, 38, 1.5]);
    const h = getUnitStats('heavy', 0);
    expect([h.cost, h.hp, h.atk, h.cooldown, h.range, h.speed, h.trainTime]).toEqual([100, 220, 35, 1.6, 30, 30, 3.0]);
  });

  it('시대 배율이 hp/atk/cost 에 적용된다', () => {
    const m = getUnitStats('melee', 2);
    expect(m.hp).toBe(Math.round(60 * 5.5));
    expect(m.atk).toBe(Math.round(12 * 5.5));
    expect(m.cost).toBe(Math.round(15 * 6));
  });
});

describe('데미지 / 사망 / 보상', () => {
  it('피해만큼 HP가 줄고 0 이하가 되면 사망한다', () => {
    const w = makeWorld();
    const u = place(w, 1, 'melee', 1000);
    damageUnit(w, u, 20);
    expect(u.hp).toBe(40);
    expect(u.dead).toBe(false);
    damageUnit(w, u, 40);
    expect(u.dead).toBe(true);
  });

  it('처치 보상: 골드 = cost×1.25, EXP = cost×2', () => {
    expect(killReward(100)).toEqual({ gold: 125, exp: 200 });
    const w = makeWorld();
    const p = w.side(0);
    const g0 = p.gold;
    const u = place(w, 1, 'heavy', 1000);
    damageUnit(w, u, 9999);
    expect(p.gold - g0).toBe(125);
    expect(p.exp).toBe(200);
    expect(p.stats.kills).toBe(1);
    // 죽은 쪽은 보상 없음
    expect(w.side(1).exp).toBe(0);
  });

  it('사망 보상은 한 번만 지급된다', () => {
    const w = makeWorld();
    const u = place(w, 1, 'melee', 1000);
    damageUnit(w, u, 100);
    damageUnit(w, u, 100);
    expect(w.side(0).exp).toBe(30);
    expect(w.side(0).stats.kills).toBe(1);
  });

  it('기지 피해의 10%가 EXP로 들어오고 HP 0이면 승패가 결정된다', () => {
    expect(baseDamageExp(50)).toBe(5);
    const w = makeWorld();
    damageBase(w, 0, 100);
    expect(w.side(1).base.hp).toBe(BALANCE.era.baseMaxHp[0] - 100);
    expect(w.side(0).exp).toBeCloseTo(10);
    damageBase(w, 0, 99999);
    expect(w.side(1).base.hp).toBe(0);
    // 실제로 깎인 HP 기준 EXP
    expect(w.side(0).exp).toBeCloseTo(BALANCE.era.baseMaxHp[0] * 0.1);
    expect(w.winner).toBe(0);
  });

  it('근접 유닛끼리 싸우면 결국 한쪽이 죽고 보상이 지급된다', () => {
    const w = makeWorld();
    place(w, 0, 'heavy', 900);
    place(w, 1, 'melee', 1000);
    run(w, 10);
    expect(w.unitsOf(1).length).toBe(0);
    expect(w.side(0).stats.kills).toBe(1);
    expect(w.side(0).gold).toBe(BALANCE.economy.startGold + Math.round(15 * 1.25));
  });
});

describe('이동 / 충돌', () => {
  it('같은 편 앞 유닛과 최소 간격을 유지하고 막히면 정지한다', () => {
    const w = makeWorld();
    const front = place(w, 0, 'heavy', 600);
    const back = place(w, 0, 'melee', 540);
    // 앞 유닛을 적 유닛 앞에서 멈추게 한다
    place(w, 1, 'heavy', 700);
    run(w, 2);
    const gap = Math.abs(front.x - back.x) - (front.width + back.width) / 2;
    expect(gap).toBeGreaterThanOrEqual(BALANCE.unitGap - 0.01);
    expect(back.state === 'idle' || back.state === 'attack').toBe(true);
  });

  it('스폰 지점이 막혀 있으면 생산 완료 유닛은 대기한다', () => {
    const w = makeWorld();
    const s = w.side(0);
    s.gold = 1000;
    // 스폰 지점에 움직이지 않는 아군 유닛을 고정
    const blocker = place(w, 0, 'heavy', w.spawnX(s, 'melee'));
    (blocker.stats as { speed: number }).speed = 0;
    w.train(0, 'melee');
    run(w, 3);
    expect(s.queue.length).toBe(1);
    expect(w.unitsOf(0).length).toBe(1);
  });
});
