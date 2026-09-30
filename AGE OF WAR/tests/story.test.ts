import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { emptyLevels, getStage, STAGE_COUNT, stageLabel, upgradeCost, upgradeMods } from '../src/config/story';
import { applyIncome, grantKillReward } from '../src/systems/EconomySystem';
import { evolve } from '../src/systems/EraSystem';
import { GameWorld } from '../src/systems/GameWorld';
import { buyUpgrade, isStageUnlocked, loadStory, newSave, recordWin, refundUpgrades, saveStory, type KeyValueStore } from '../src/systems/StoryProgress';

function memStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('스토리 스테이지', () => {
  it('1-1 ~ 5-5 라벨', () => {
    expect(STAGE_COUNT).toBe(25);
    expect(stageLabel(0)).toBe('1-1');
    expect(stageLabel(4)).toBe('1-5');
    expect(stageLabel(5)).toBe('2-1');
    expect(stageLabel(24)).toBe('5-5');
  });

  it('스테이지가 올라갈수록 적이 강해진다', () => {
    for (let s = 1; s < STAGE_COUNT; s++) {
      const a = getStage(s - 1);
      const b = getStage(s);
      expect(b.enemyIncomeMult).toBeGreaterThan(a.enemyIncomeMult);
      expect(b.enemyMods.baseHp!).toBeGreaterThan(a.enemyMods.baseHp!);
      expect(b.enemyMods.unitStat!).toBeGreaterThanOrEqual(a.enemyMods.unitStat!);
      expect(b.firstClearPoints).toBeGreaterThanOrEqual(a.firstClearPoints);
    }
  });
});

describe('스토리 진행 저장', () => {
  it('첫 클리어는 다음 스테이지를 열고 큰 보상, 재클리어는 1P', () => {
    const s = newSave();
    expect(isStageUnlocked(s, 0)).toBe(true);
    expect(isStageUnlocked(s, 1)).toBe(false);
    expect(recordWin(s, 0)).toBe(getStage(0).firstClearPoints);
    expect(s.cleared).toBe(1);
    expect(isStageUnlocked(s, 1)).toBe(true);
    expect(recordWin(s, 0)).toBe(1);
    expect(s.cleared).toBe(1);
  });

  it('강화 구매·초기화', () => {
    const s = newSave();
    s.points = 3;
    expect(buyUpgrade(s, 'income')).toBe(true); // 1P
    expect(buyUpgrade(s, 'income')).toBe(true); // 2P
    expect(buyUpgrade(s, 'income')).toBe(false); // 3P 필요, 0P 남음
    expect(s.levels.income).toBe(2);
    refundUpgrades(s);
    expect(s.levels.income).toBe(0);
    expect(s.points).toBe(3);
    expect(upgradeCost(0)).toBe(1);
  });

  it('저장/불러오기, 손상된 저장본은 새로 시작', () => {
    const store = memStore();
    const s = newSave();
    s.cleared = 7;
    s.points = 12;
    s.levels.baseHp = 4;
    saveStory(s, store);
    expect(loadStory(store)).toEqual(s);
    store.data.set('chronofront.story.v1', '{깨짐');
    expect(loadStory(store)).toEqual(newSave());
    store.data.set('chronofront.story.v1', JSON.stringify({ cleared: 999, points: -5, levels: { unitStat: 99 } }));
    const l = loadStory(store);
    expect(l.cleared).toBe(STAGE_COUNT);
    expect(l.points).toBe(0);
    expect(l.levels.unitStat).toBe(10);
    expect(loadStory(null)).toEqual(newSave());
  });
});

describe('진영 강화 배율', () => {
  const lv = { ...emptyLevels(), unitStat: 2, specialCooldown: 4, income: 5, killGold: 3, baseHp: 10 };
  const mods = upgradeMods(lv);

  it('레벨 → 배율', () => {
    expect(mods.unitStat).toBeCloseTo(1.1);
    expect(mods.specialCooldown).toBeCloseTo(0.8);
    expect(mods.income).toBeCloseTo(1.5);
    expect(mods.killGold).toBeCloseTo(1.3);
    expect(mods.baseHp).toBeCloseTo(2);
    expect(upgradeMods(emptyLevels())).toEqual({ unitStat: 1, specialCooldown: 1, income: 1, killGold: 1, baseHp: 1 });
  });

  it('유닛·기지·특수기·수입·처치 골드에 적용', () => {
    const w = new GameWorld({ seed: 1, mods: [mods] });
    const me = w.side(0);
    const u = w.spawnUnit(0, { role: 'melee', era: 0 });
    const plain = w.spawnUnit(1, { role: 'melee', era: 0 });
    expect(u.maxHp).toBe(Math.round(plain.maxHp * 1.1));
    expect(u.stats.atk).toBeCloseTo(plain.stats.atk * 1.1);
    expect(me.base.maxHp).toBe(BALANCE.era.baseMaxHp[0] * 2);
    expect(w.side(1).base.maxHp).toBe(BALANCE.era.baseMaxHp[0]);
    expect(me.specialCooldown).toBeCloseTo(BALANCE.special.initialCooldown * 0.8);

    me.specialCooldown = 0;
    expect(w.useSpecial(0).ok).toBe(true);
    expect(me.specialCooldown).toBeCloseTo(BALANCE.special.cooldown * 0.8);

    const g0 = me.gold;
    applyIncome(me, 1);
    expect(me.gold - g0).toBeCloseTo(BALANCE.economy.incomePerSec * 1.5);

    const r = grantKillReward(me, 100);
    expect(r.gold).toBe(Math.round(100 * BALANCE.economy.killGoldMult * 1.3));

    me.exp = 1e9;
    evolve(me);
    expect(me.base.maxHp).toBe(BALANCE.era.baseMaxHp[1] * 2);
  });
});
