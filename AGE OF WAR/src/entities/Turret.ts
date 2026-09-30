import type { TurretTier } from '../config/balance';
import { getTurretStats, type TurretStats } from '../config/eras';
import type { SideId } from './Unit';

export class Turret {
  readonly side: SideId;
  readonly slot: number;
  readonly tier: TurretTier;
  readonly era: number;
  readonly stats: TurretStats;
  /** 실제 지불한 금액(판매 환급 기준) */
  readonly paid: number;
  cooldownLeft = 0;
  targetId: number | null = null;
  lastFireAt = -1;

  constructor(side: SideId, slot: number, tier: TurretTier, era: number) {
    this.side = side;
    this.slot = slot;
    this.tier = tier;
    this.era = era;
    this.stats = getTurretStats(tier, era);
    this.paid = this.stats.cost;
  }
}
