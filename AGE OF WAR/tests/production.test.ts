import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { ProductionQueue, tryEnqueue } from '../src/systems/ProductionQueue';
import { makeWorld, run } from './helpers';

describe('생산 대기열', () => {
  it('최대 5칸까지만 들어간다', () => {
    const w = makeWorld();
    w.side(0).gold = 10000;
    for (let i = 0; i < 5; i++) expect(w.train(0, 'melee').ok).toBe(true);
    const r = w.train(0, 'melee');
    expect(r.ok).toBe(false);
    expect(w.side(0).queue.length).toBe(BALANCE.production.maxQueue);
  });

  it('주문 시 골드를 차감하고, 부족하면 거부한다', () => {
    const w = makeWorld();
    const s = w.side(0);
    s.gold = 120;
    expect(w.train(0, 'heavy').ok).toBe(true);
    expect(s.gold).toBe(20);
    const r = w.train(0, 'ranged');
    expect(r.ok).toBe(false);
    expect(s.gold).toBe(20);
    expect(s.queue.length).toBe(1);
  });

  it('순서대로 하나씩 생산되어 기지 앞에 스폰된다', () => {
    const w = makeWorld();
    const s = w.side(0);
    s.gold = 1000;
    w.train(0, 'ranged');
    w.train(0, 'melee');
    run(w, 1.4);
    expect(w.unitsOf(0).length).toBe(0);
    run(w, 0.2);
    expect(w.unitsOf(0).map((u) => u.role)).toEqual(['ranged']);
    run(w, 1.1);
    expect(w.unitsOf(0).map((u) => u.role)).toEqual(['ranged', 'melee']);
    expect(s.queue.length).toBe(0);
  });

  it('스폰 위치는 기지 앞(양측 대칭)', () => {
    const w = makeWorld();
    w.side(0).gold = w.side(1).gold = 1000;
    w.train(0, 'melee');
    w.train(1, 'melee');
    run(w, 1.02);
    const [a] = w.unitsOf(0);
    const [b] = w.unitsOf(1);
    expect(a.x - w.side(0).base.frontX).toBeCloseTo(w.side(1).base.frontX - b.x, 0);
    expect(a.x).toBeGreaterThan(w.side(0).base.frontX);
  });

  it('ProductionQueue 단독: 진행률과 shift', () => {
    const q = new ProductionQueue(2);
    const wallet = { gold: 100 };
    expect(tryEnqueue(wallet, q, 'melee', 0).ok).toBe(true);
    expect(tryEnqueue(wallet, q, 'melee', 0).ok).toBe(true);
    expect(tryEnqueue(wallet, q, 'melee', 0).ok).toBe(false);
    expect(wallet.gold).toBe(70);
    expect(q.update(0.5)).toBeNull();
    expect(q.ratio).toBeCloseTo(0.5);
    expect(q.update(0.5)?.role).toBe('melee');
    q.shift();
    expect(q.length).toBe(1);
    expect(q.ratio).toBe(0);
  });
});
