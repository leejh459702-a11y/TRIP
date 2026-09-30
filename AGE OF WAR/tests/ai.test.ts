import { damageUnit } from '../src/systems/CombatSystem';
import { describe, expect, it } from 'vitest';
import { AI_PARAMS } from '../src/config/ai';
import { EnemyAI } from '../src/systems/EnemyAI';
import { GameWorld } from '../src/systems/GameWorld';
import { makeWorld, place, run } from './helpers';

describe('난이도별 플레이어 골드 배율', () => {
  it('쉬움 ×1.3 / 보통 ×1.0 / 어려움 ×0.9 가 기본 수입과 처치 골드에 적용된다', () => {
    for (const [d, mult] of [['easy', 1.3], ['normal', 1], ['hard', 0.9]] as const) {
      expect(AI_PARAMS[d].playerIncomeMult).toBe(mult);
      const w = new GameWorld({ seed: 1, incomeMult: [AI_PARAMS[d].playerIncomeMult, AI_PARAMS[d].incomeMult] });
      const g0 = w.side(0).gold;
      w.step(1);
      expect(w.side(0).gold - g0).toBeCloseTo(2 * mult);
      const before = w.side(0).gold;
      const u = w.spawnUnit(1, { role: 'heavy', era: 0 }, 1000);
      u.hp = 1;
      damageUnit(w, u, 10);
      expect(w.side(0).gold - before).toBeCloseTo(Math.round(100 * mult));
    }
  });
});

describe('EnemyAI', () => {
  it('EXP가 충족되면 즉시 진화한다', () => {
    const w = makeWorld();
    const ai = new EnemyAI(w, 1, 'normal');
    w.side(1).exp = 1000;
    ai.update(0.5);
    expect(w.side(1).era).toBe(1);
  });

  it('열세면 방어 모드로 가용 골드 내 유닛을 생산한다', () => {
    const w = makeWorld();
    const ai = new EnemyAI(w, 1, 'normal');
    for (let i = 0; i < 3; i++) place(w, 0, 'heavy', 400 + i * 60);
    w.side(1).gold = 50;
    ai.update(0.5);
    expect(ai.mode).toBe('defend');
    expect(w.side(1).queue.length).toBe(1);
    expect(w.side(1).queue.items[0].role).toBe('melee');
  });

  it('우세/대등하면 골드를 모았다가 웨이브를 보낸다', () => {
    const w = makeWorld();
    const ai = new EnemyAI(w, 1, 'normal');
    w.side(1).gold = 10;
    ai.update(0.5);
    expect(ai.mode).toBe('save');
    expect(w.side(1).queue.length).toBe(0);
    w.side(1).gold = 5000;
    ai.update(0.5);
    expect(ai.mode === 'wave' || ai.mode === 'save').toBe(true);
    expect(w.side(1).queue.length).toBeGreaterThan(0);
    expect(ai.pendingWave.length + w.side(1).queue.length).toBeGreaterThan(1);
  });

  it('첫 웨이브는 작은 오프닝 구성이라 오래 모으지 않는다', () => {
    const w = makeWorld();
    const ai = new EnemyAI(w, 1, 'normal');
    w.side(1).gold = 100; // 오프닝(근접3+원거리2 = 95G)은 가능, 본 웨이브(430G)는 불가
    ai.update(0.5);
    expect(w.side(1).queue.length).toBe(5);
  });

  it('웨이브를 모으는 중에도 여유 골드가 임계치 이상이면 포탑을 산다', () => {
    const w = makeWorld();
    const ai = new EnemyAI(w, 1, 'normal');
    w.side(1).gold = 90;
    ai.update(0.5); // 오프닝 웨이브 대기열 투입
    w.side(1).gold = 400;
    for (let i = 0; i < 4; i++) ai.update(0.5);
    expect(w.side(1).turrets.some((t) => t !== null)).toBe(true);
  });

  it('최고 효율 유닛은 가용 골드 안에서 고른다', () => {
    const ai = new EnemyAI(makeWorld(), 1, 'normal');
    expect(ai.bestEfficiencyUnit(10, 0)).toBeNull();
    expect(ai.bestEfficiencyUnit(20, 0)).toBe('melee');
    expect(ai.bestEfficiencyUnit(100, 0)).toBe('heavy');
  });

  it('AI는 명령 API로만 골드를 쓴다(골드가 음수가 되지 않음)', () => {
    const w = new GameWorld({ seed: 7 });
    const a = new EnemyAI(w, 0, 'hard');
    const b = new EnemyAI(w, 1, 'easy');
    for (let i = 0; i < 60 * 180; i++) {
      w.step(1 / 60);
      a.update(1 / 60);
      b.update(1 / 60);
      expect(w.side(0).gold).toBeGreaterThanOrEqual(0);
      expect(w.side(1).gold).toBeGreaterThanOrEqual(0);
    }
    expect(w.side(0).stats.unitsTrained + w.side(1).stats.unitsTrained).toBeGreaterThan(10);
  });

  it('쉬움 난이도는 판단이 지연된다', () => {
    const w = makeWorld();
    const ai = new EnemyAI(w, 1, 'easy');
    w.side(1).gold = 50;
    ai.update(0.5); // t=0 기록
    for (let i = 0; i < 3; i++) place(w, 0, 'heavy', 400 + i * 60);
    run(w, 0.5);
    ai.update(0.5);
    expect(ai.mode).not.toBe('defend');
    run(w, AI_PARAMS.easy.reactionDelay + 0.1);
    for (let i = 0; i < 6; i++) ai.update(0.5);
    expect(ai.mode).toBe('defend');
  });
});
