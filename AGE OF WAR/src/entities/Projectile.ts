import type { ProjectileLook } from '../config/eras';
import type { SideId } from './Unit';

export type ProjectileSource = 'unit' | 'turret';

/**
 * 1차원(레인 x축) 투사체. 높이/포물선은 렌더러가 진행률로 계산한다.
 * 피해량과 대상은 발사 시점에 확정되고, 대상이 사라지면 투사체도 소멸한다.
 */
export class Projectile {
  readonly id: number;
  readonly side: SideId;
  /** 발사 시점에 확정된 대상: 유닛 id, 또는 -1 = 적 기지 */
  readonly targetId: number;
  readonly damage: number;
  readonly speed: number;
  readonly splashRadius: number;
  readonly look: ProjectileLook;
  readonly source: ProjectileSource;
  /** 포탑 발사체면 슬롯 번호 */
  readonly slot: number;
  readonly startX: number;
  x: number;
  /** 대상의 최신 x (렌더러 포물선 계산용) */
  targetX: number;
  done = false;

  constructor(opts: {
    id: number; side: SideId; targetId: number; damage: number; speed: number; splashRadius: number;
    look: ProjectileLook; source: ProjectileSource; slot?: number; x: number; targetX: number;
  }) {
    this.id = opts.id;
    this.side = opts.side;
    this.targetId = opts.targetId;
    this.damage = opts.damage;
    this.speed = opts.speed;
    this.splashRadius = opts.splashRadius;
    this.look = opts.look;
    this.source = opts.source;
    this.slot = opts.slot ?? -1;
    this.x = opts.x;
    this.startX = opts.x;
    this.targetX = opts.targetX;
  }

  get targetsBase(): boolean {
    return this.targetId === -1;
  }

  /** 0..1 비행 진행률 */
  get progress(): number {
    const total = Math.abs(this.targetX - this.startX);
    if (total < 1) return 1;
    return Math.min(1, Math.abs(this.x - this.startX) / total);
  }
}
