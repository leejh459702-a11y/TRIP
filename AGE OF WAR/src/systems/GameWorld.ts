import { BALANCE, type TurretTier, type UnitRole } from '../config/balance';
import { getTurretStats } from '../config/eras';
import { Base } from '../entities/Base';
import type { Projectile } from '../entities/Projectile';
import { Turret } from '../entities/Turret';
import { Unit, unitGap, type SideId } from '../entities/Unit';
import { removeDead, updateProjectiles, updateTurrets, updateUnits } from './CombatSystem';
import { applyIncome } from './EconomySystem';
import { canEvolve, evolve } from './EraSystem';
import { ProductionQueue, tryEnqueue, type QueueItem } from './ProductionQueue';
import { createRng } from './rng';
import { activateSpecial, updateSpecials, type SpecialWorld } from './SpecialAbility';
import { DEFAULT_MODS, type CommandResult, type GameEvent, type SideMods, type SideState, type SpecialDrop } from './types';

export interface WorldOptions {
  seed?: number;
  /** 진영별 수입 배율 [플레이어, 적] (난이도 보정) */
  incomeMult?: [number, number];
  /** 진영별 강화 배율 [플레이어, 적] (스토리 모드) */
  mods?: [Partial<SideMods>?, Partial<SideMods>?];
  /** false 면 초당 기본 수입을 끈다(테스트용) */
  passiveIncome?: boolean;
}

const OK: CommandResult = { ok: true };
const fail = (reason: string): CommandResult => ({ ok: false, reason });

function createSide(id: SideId, incomeMult: number, partialMods?: Partial<SideMods>): SideState {
  const mods: SideMods = { ...DEFAULT_MODS, ...partialMods };
  return {
    id,
    dir: id === 0 ? 1 : -1,
    gold: BALANCE.economy.startGold,
    exp: 0,
    era: 0,
    base: new Base(id, 0, mods.baseHp),
    queue: new ProductionQueue(),
    turrets: new Array(BALANCE.turret.slotCount).fill(null),
    unlockedSlots: 1,
    specialCooldown: BALANCE.special.initialCooldown * mods.specialCooldown,
    incomeMult,
    mods,
    stats: { kills: 0, unitsTrained: 0, goldEarned: 0, unitsLost: 0 },
  };
}

/**
 * 게임 월드. Phaser 에 의존하지 않는 순수 로직.
 * 플레이어 UI 와 EnemyAI 는 모두 아래의 "명령 API"만 호출한다(치트 불가 구조).
 */
export class GameWorld implements SpecialWorld {
  time = 0;
  readonly sides: [SideState, SideState];
  units: Unit[] = [];
  readonly unitMap = new Map<number, Unit>();
  projectiles: Projectile[] = [];
  drops: SpecialDrop[] = [];
  winner: SideId | null = null;
  readonly rng: () => number;
  private events: GameEvent[] = [];
  private idSeq = 1;
  private readonly passiveIncome: boolean;

  constructor(opts: WorldOptions = {}) {
    const mult = opts.incomeMult ?? [1, 1];
    this.sides = [createSide(0, mult[0], opts.mods?.[0]), createSide(1, mult[1], opts.mods?.[1])];
    this.rng = createRng(opts.seed ?? Date.now());
    this.passiveIncome = opts.passiveIncome ?? true;
  }

  nextId(): number {
    return this.idSeq++;
  }

  emit(e: GameEvent): void {
    this.events.push(e);
  }

  /** 누적 이벤트를 꺼내고 비운다(렌더러/사운드용) */
  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  get isOver(): boolean {
    return this.winner !== null;
  }

  side(id: SideId): SideState {
    return this.sides[id];
  }

  unitsOf(id: SideId): Unit[] {
    return this.units.filter((u) => u.side === id && !u.dead);
  }

  /** 전력 = 필드 유닛의 Σ(hp × atk) */
  fieldPower(id: SideId): number {
    let p = 0;
    for (const u of this.units) if (u.side === id && !u.dead) p += u.power;
    return p;
  }

  // ───────────────────────── 시뮬레이션 ─────────────────────────

  step(dt: number): void {
    if (this.winner !== null) return;
    this.time += dt;
    for (const s of this.sides) {
      if (this.passiveIncome) applyIncome(s, dt);
      this.updateProduction(s, dt);
    }
    updateUnits(this, dt);
    updateTurrets(this, dt);
    updateProjectiles(this, dt);
    updateSpecials(this, dt);
    removeDead(this);
  }

  spawnX(side: SideState, role: UnitRole): number {
    const w = BALANCE.units[role].width;
    return side.base.frontX + side.dir * (BALANCE.world.spawnOffset + w / 2);
  }

  /** 같은 편 유닛이 스폰 지점을 막고 있는지 */
  isSpawnBlocked(side: SideState, role: UnitRole): boolean {
    const probe = { x: this.spawnX(side, role), width: BALANCE.units[role].width };
    return this.units.some((u) => !u.dead && u.side === side.id && unitGap(u, probe) < BALANCE.unitGap);
  }

  private updateProduction(side: SideState, dt: number): void {
    const ready = side.queue.update(dt);
    if (!ready || this.isSpawnBlocked(side, ready.role)) return;
    side.queue.shift();
    this.spawnUnit(side.id, ready);
  }

  spawnUnit(sideId: SideId, item: Pick<QueueItem, 'role' | 'era'>, x?: number): Unit {
    const side = this.sides[sideId];
    const u = new Unit(this.nextId(), sideId, item.role, item.era, x ?? this.spawnX(side, item.role), side.mods.unitStat);
    this.units.push(u);
    this.unitMap.set(u.id, u);
    side.stats.unitsTrained += 1;
    this.emit({ type: 'spawn', unit: u });
    return u;
  }

  // ───────────────────────── 명령 API ─────────────────────────

  train(sideId: SideId, role: UnitRole): CommandResult {
    if (this.isOver) return fail('게임 종료');
    const side = this.sides[sideId];
    const r = tryEnqueue(side, side.queue, role, side.era);
    if (!r.ok) return fail(r.reason);
    this.emit({ type: 'trained', side: sideId, role });
    return OK;
  }

  canEvolve(sideId: SideId): boolean {
    return canEvolve(this.sides[sideId]);
  }

  evolve(sideId: SideId): CommandResult {
    if (this.isOver) return fail('게임 종료');
    const side = this.sides[sideId];
    if (!evolve(side)) return fail('EXP가 부족합니다');
    this.emit({ type: 'evolve', side: sideId, era: side.era });
    return OK;
  }

  firstEmptySlot(sideId: SideId): number {
    const s = this.sides[sideId];
    for (let i = 0; i < s.unlockedSlots; i++) if (!s.turrets[i]) return i;
    return -1;
  }

  buyTurret(sideId: SideId, tier: TurretTier, slot = this.firstEmptySlot(sideId)): CommandResult {
    if (this.isOver) return fail('게임 종료');
    const side = this.sides[sideId];
    if (slot < 0) return fail('빈 포탑 슬롯이 없습니다');
    if (slot >= side.unlockedSlots) return fail('잠긴 슬롯입니다');
    if (side.turrets[slot]) return fail('이미 포탑이 있습니다');
    const stats = getTurretStats(tier, side.era);
    if (side.gold < stats.cost) return fail('골드가 부족합니다');
    side.gold -= stats.cost;
    side.turrets[slot] = new Turret(sideId, slot, tier, side.era);
    this.emit({ type: 'turretBuilt', side: sideId, slot, tier });
    return OK;
  }

  sellTurret(sideId: SideId, slot: number): CommandResult {
    if (this.isOver) return fail('게임 종료');
    const side = this.sides[sideId];
    const t = side.turrets[slot];
    if (!t) return fail('판매할 포탑이 없습니다');
    const refund = sellRefund(t.paid);
    side.gold += refund;
    side.turrets[slot] = null;
    this.emit({ type: 'turretSold', side: sideId, slot, refund });
    return OK;
  }

  nextSlotCost(sideId: SideId): number | null {
    const s = this.sides[sideId];
    return s.unlockedSlots < BALANCE.turret.slotCount ? BALANCE.turret.slotUnlockCost[s.unlockedSlots] : null;
  }

  unlockSlot(sideId: SideId): CommandResult {
    if (this.isOver) return fail('게임 종료');
    const side = this.sides[sideId];
    const cost = this.nextSlotCost(sideId);
    if (cost === null) return fail('모든 슬롯이 열렸습니다');
    if (side.gold < cost) return fail('골드가 부족합니다');
    side.gold -= cost;
    const slot = side.unlockedSlots;
    side.unlockedSlots += 1;
    this.emit({ type: 'slotUnlocked', side: sideId, slot });
    return OK;
  }

  useSpecial(sideId: SideId): CommandResult {
    if (this.isOver) return fail('게임 종료');
    if (!activateSpecial(this, sideId)) return fail('특수기 쿨다운 중');
    return OK;
  }
}

/** 포탑 판매 환급액 */
export function sellRefund(paid: number): number {
  return Math.floor(paid * BALANCE.turret.sellRefund);
}
