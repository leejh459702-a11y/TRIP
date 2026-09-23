import type { TurretTier, UnitRole } from '../config/balance';
import type { SpecialLook } from '../config/eras';
import type { Base } from '../entities/Base';
import type { Projectile } from '../entities/Projectile';
import type { Turret } from '../entities/Turret';
import type { SideId, Unit } from '../entities/Unit';
import type { ProductionQueue } from './ProductionQueue';

export interface SideStats {
  kills: number;
  unitsTrained: number;
  goldEarned: number;
  unitsLost: number;
}

/** 한 진영의 상태. 양측은 완전히 같은 구조·규칙을 따른다. */
export interface SideState {
  id: SideId;
  dir: 1 | -1;
  gold: number;
  exp: number;
  era: number;
  base: Base;
  queue: ProductionQueue;
  turrets: (Turret | null)[];
  unlockedSlots: number;
  specialCooldown: number;
  /** 난이도 보정(기본 1). 기본 수입·처치 골드에 곱해진다 */
  incomeMult: number;
  stats: SideStats;
}

export interface SpecialDrop {
  side: SideId;
  x: number;
  /** 낙하 시작까지 남은 시간 */
  delay: number;
  /** 착탄까지 남은 낙하 시간 */
  fallLeft: number;
  fallTime: number;
  damage: number;
  look: SpecialLook;
  started: boolean;
  done: boolean;
}

export type CommandResult = { ok: true } | { ok: false; reason: string };

export type GameEvent =
  | { type: 'spawn'; unit: Unit }
  | { type: 'melee'; attacker: Unit; targetId: number }
  | { type: 'shoot'; attacker: Unit; projectile: Projectile }
  | { type: 'turretFire'; side: SideId; slot: number; projectile: Projectile }
  | { type: 'projectileHit'; projectile: Projectile; x: number }
  | { type: 'damage'; victimSide: SideId; x: number; amount: number; unitId: number | null }
  | { type: 'death'; unit: Unit }
  | { type: 'reward'; side: SideId; gold: number; exp: number; x: number }
  | { type: 'trained'; side: SideId; role: UnitRole }
  | { type: 'evolve'; side: SideId; era: number }
  | { type: 'special'; side: SideId; era: number; look: SpecialLook }
  | { type: 'dropStart'; drop: SpecialDrop }
  | { type: 'dropImpact'; side: SideId; x: number; look: SpecialLook }
  | { type: 'turretBuilt'; side: SideId; slot: number; tier: TurretTier }
  | { type: 'turretSold'; side: SideId; slot: number; refund: number }
  | { type: 'slotUnlocked'; side: SideId; slot: number }
  | { type: 'gameOver'; winner: SideId };
