import { AI_PARAMS, type AIParams, type Difficulty } from '../config/ai';
import { BALANCE, type UnitRole } from '../config/balance';
import { getTurretStats, getUnitStats, TURRET_TIERS, UNIT_ROLES } from '../config/eras';
import type { SideId, Unit } from '../entities/Unit';
import type { GameWorld } from './GameWorld';
import type { SideState } from './types';

/**
 * AI 가 접근할 수 있는 월드 표면: 읽기 전용 조회 + 플레이어와 동일한 명령 API.
 * (골드/EXP를 직접 수정하는 등의 치트 경로가 타입 수준에서 막힌다)
 */
export interface AIWorld {
  readonly time: number;
  readonly units: readonly Unit[];
  readonly isOver: boolean;
  side(id: SideId): Readonly<SideState>;
  fieldPower(id: SideId): number;
  canEvolve(id: SideId): boolean;
  firstEmptySlot(id: SideId): number;
  nextSlotCost(id: SideId): number | null;
  train: GameWorld['train'];
  evolve: GameWorld['evolve'];
  buyTurret: GameWorld['buyTurret'];
  sellTurret: GameWorld['sellTurret'];
  unlockSlot: GameWorld['unlockSlot'];
  useSpecial: GameWorld['useSpecial'];
}

export type AIMode = 'defend' | 'save' | 'wave';

interface Perception {
  t: number;
  myPower: number;
  enemyPower: number;
  enemyCount: number;
  /** clusterWidth 구간 안에 몰린 적 유닛 최대 수 */
  cluster: number;
  /** 우리 진영 절반 안에 들어온 적 유닛 수 */
  intruders: number;
}

export class EnemyAI {
  readonly params: AIParams;
  mode: AIMode = 'save';
  private timer = 0;
  private history: Perception[] = [];
  private wavePlan: UnitRole[] = [];
  /** 디버그 패널용 최근 판단 정보 */
  lastPerception: Perception | null = null;

  constructor(
    private readonly world: AIWorld,
    private readonly me: SideId,
    difficulty: Difficulty | AIParams = 'normal',
  ) {
    this.params = typeof difficulty === 'string' ? AI_PARAMS[difficulty] : difficulty;
  }

  private get enemy(): SideId {
    return this.me === 0 ? 1 : 0;
  }

  get pendingWave(): readonly UnitRole[] {
    return this.wavePlan;
  }

  update(dt: number): void {
    if (this.world.isOver) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer += this.params.thinkInterval;
    this.think();
  }

  // ───────────────────────── 인지 ─────────────────────────

  private perceive(): Perception {
    const w = this.world;
    const mySide = w.side(this.me);
    const enemies = w.units.filter((u) => u.side === this.enemy && !u.dead);
    const xs = enemies.map((u) => u.x).sort((a, b) => a - b);
    let cluster = 0;
    for (let i = 0, j = 0; i < xs.length; i++) {
      while (xs[i] - xs[j] > this.params.clusterWidth) j++;
      cluster = Math.max(cluster, i - j + 1);
    }
    const mid = BALANCE.world.width / 2;
    const intruders = enemies.filter((u) => (u.x - mid) * mySide.dir < 0).length;
    // 생산 대기 중인 유닛도 곧 전력이 되므로 포함(과잉 생산 방지)
    let queued = 0;
    for (const it of mySide.queue.items) {
      const s = getUnitStats(it.role, it.era);
      queued += s.hp * s.atk;
    }
    return {
      t: w.time,
      myPower: w.fieldPower(this.me) + queued,
      enemyPower: w.fieldPower(this.enemy),
      enemyCount: enemies.length,
      cluster,
      intruders,
    };
  }

  /** 판단 지연을 적용한 인지 결과 */
  private delayedPerception(now: Perception): Perception {
    const d = this.params.reactionDelay;
    this.history.push(now);
    if (d <= 0) {
      this.history.length = 0;
      return now;
    }
    while (this.history.length > 1 && this.history[1].t <= now.t - d) this.history.shift();
    return this.history[0].t <= now.t - d ? this.history[0] : { ...this.history[0], enemyPower: 0, enemyCount: 0, cluster: 0, intruders: 0 };
  }

  // ───────────────────────── 판단 ─────────────────────────

  private think(): void {
    const w = this.world;
    const me = this.me;
    const p = this.delayedPerception(this.perceive());
    this.lastPerception = p;

    // 1) EXP 충족 시 즉시 진화
    if (w.canEvolve(me)) w.evolve(me);

    const side = w.side(me);
    const threatened = p.enemyPower > 0 && p.myPower < p.enemyPower * this.params.defensiveRatio;

    // 2) 생산
    if (threatened) {
      this.mode = 'defend';
      this.wavePlan = [];
      const role = this.bestEfficiencyUnit(side.gold, side.era, this.isRich(side.gold, side.era));
      if (role && !side.queue.isFull) w.train(me, role);
    } else {
      if (this.mode === 'defend' || (this.mode === 'save' && this.wavePlan.length === 0)) {
        this.mode = 'save';
        this.wavePlan = this.makeWave(side.era, side.gold);
      }
      if (this.mode === 'save' && side.gold >= this.planCost(side.era)) this.mode = 'wave';
      if (this.mode === 'wave') {
        while (this.wavePlan.length > 0 && !w.side(me).queue.isFull) {
          if (!w.train(me, this.wavePlan[0]).ok) break;
          this.wavePlan.shift();
        }
        if (this.wavePlan.length === 0) this.mode = 'save';
      }
    }

    // 3) 포탑 구매/교체/슬롯 해금
    this.manageTurrets();

    // 4) 특수기
    if (side.specialCooldown <= 0 && this.shouldUseSpecial(p)) w.useSpecial(me);
  }

  /** 골드가 아니라 생산 시간이 병목인 상태 */
  isRich(gold: number, era: number): boolean {
    return gold >= this.params.richGold * BALANCE.eraMult.cost[era];
  }

  /**
   * 가용 골드 내 최고 효율 유닛.
   * 효율 = hp×atk / cost × 역할 가중치 (부유할 땐 cost 대신 생산 시간 기준)
   */
  bestEfficiencyUnit(gold: number, era: number, rich = false): UnitRole | null {
    let best: UnitRole | null = null;
    let bestScore = -1;
    for (const role of UNIT_ROLES) {
      const s = getUnitStats(role, era);
      if (s.cost > gold) continue;
      const score = ((s.hp * s.atk) / (rich ? s.trainTime : s.cost)) * this.params.roleWeight[role];
      if (score > bestScore) {
        bestScore = score;
        best = role;
      }
    }
    return best;
  }

  private makeWave(era: number, gold: number): UnitRole[] {
    const { wave, wavePerEra } = this.params;
    const total = UNIT_ROLES.reduce((sum, r) => sum + wave[r] + wavePerEra[r] * era, 0);
    if (this.isRich(gold, era)) return new Array<UnitRole>(Math.ceil(total / 2)).fill('heavy');
    const n = (r: UnitRole) => wave[r] + wavePerEra[r] * era;
    // 탱커가 앞에 서도록 중장 → 근접 → 원거리 순
    const plan: UnitRole[] = [];
    for (const r of ['heavy', 'melee', 'ranged'] as UnitRole[]) for (let i = 0; i < n(r); i++) plan.push(r);
    return plan;
  }

  private planCost(era: number): number {
    return this.wavePlan.reduce((sum, r) => sum + getUnitStats(r, era).cost, 0);
  }

  private manageTurrets(): void {
    const w = this.world;
    const me = this.me;
    const side = w.side(me);
    if (this.mode === 'defend') return;
    const reserve = this.mode === 'save' ? this.planCost(side.era) : 0;
    const threshold = (this.params.turretSpareGold * BALANCE.eraMult.cost[side.era]) / this.params.turretPriority;
    const spare = side.gold - reserve;
    if (spare < threshold) return;

    const budget = spare - threshold * 0.5;
    const pickTier = (money: number) => {
      for (let i = Math.min(TURRET_TIERS.length - 1, this.params.maxTurretTier); i >= 0; i--) {
        const tier = TURRET_TIERS[i];
        if (getTurretStats(tier, side.era).cost <= money) return tier;
      }
      return null;
    };

    const empty = w.firstEmptySlot(me);
    if (empty >= 0) {
      const tier = pickTier(budget);
      if (tier) w.buyTurret(me, tier, empty);
      return;
    }
    // 구시대 포탑 교체
    let oldest = -1;
    for (let i = 0; i < side.unlockedSlots; i++) {
      const t = side.turrets[i];
      if (t && t.era < side.era && (oldest < 0 || t.era < side.turrets[oldest]!.era)) oldest = i;
    }
    if (oldest >= 0) {
      const refund = Math.floor(side.turrets[oldest]!.paid * BALANCE.turret.sellRefund);
      const tier = pickTier(budget + refund);
      if (tier) {
        w.sellTurret(me, oldest);
        w.buyTurret(me, tier, oldest);
      }
      return;
    }
    const slotCost = w.nextSlotCost(me);
    // 부유하면 가장 약한 포탑을 상위 등급으로 교체
    if (this.isRich(spare, side.era) && (slotCost === null || side.unlockedSlots >= this.params.maxSlots)) {
      const tierIdx = (i: number) => TURRET_TIERS.indexOf(side.turrets[i]!.tier);
      let weakest = -1;
      for (let i = 0; i < side.unlockedSlots; i++) if (side.turrets[i] && (weakest < 0 || tierIdx(i) < tierIdx(weakest))) weakest = i;
      const top = Math.min(TURRET_TIERS.length - 1, this.params.maxTurretTier);
      if (weakest >= 0 && tierIdx(weakest) < top) {
        w.sellTurret(me, weakest);
        w.buyTurret(me, TURRET_TIERS[top], weakest);
      }
      return;
    }
    if (slotCost !== null && side.unlockedSlots < this.params.maxSlots && spare >= slotCost * (1 + this.params.slotReserveRatio)) {
      w.unlockSlot(me);
    }
  }

  private shouldUseSpecial(p: Perception): boolean {
    const { specialPolicy, specialMinUnits } = this.params;
    switch (specialPolicy) {
      case 'whenAny':
        return p.enemyCount >= specialMinUnits;
      case 'count':
        return p.enemyCount >= specialMinUnits || p.intruders >= Math.ceil(specialMinUnits / 2);
      case 'cluster':
        return p.cluster >= specialMinUnits || (p.intruders >= 3 && p.enemyPower > p.myPower);
    }
  }
}
