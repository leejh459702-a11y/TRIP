import { BALANCE } from '../config/balance';
import type { SideId } from './Unit';

export class Base {
  readonly side: SideId;
  readonly x: number;
  readonly width: number;
  hp: number;
  maxHp: number;

  constructor(side: SideId, era = 0) {
    this.side = side;
    this.x = BALANCE.world.baseX[side];
    this.width = BALANCE.world.baseWidth;
    this.maxHp = BALANCE.era.baseMaxHp[era];
    this.hp = this.maxHp;
  }

  get dir(): 1 | -1 {
    return this.side === 0 ? 1 : -1;
  }

  /** 적 쪽을 향한 앞 가장자리 x */
  get frontX(): number {
    return this.x + (this.dir * this.width) / 2;
  }

  /** 새 시대의 최대 HP로 교체하되 현재 HP 비율을 유지 */
  setMaxHpKeepRatio(newMax: number): void {
    const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.maxHp = newMax;
    this.hp = Math.max(0, Math.min(newMax, ratio * newMax));
  }

  get destroyed(): boolean {
    return this.hp <= 0;
  }
}

/** 점 x 에서 기지 앞 가장자리까지 거리(기지 안쪽이면 0) */
export function distanceToBase(x: number, base: Base): number {
  const d = (x - base.frontX) * base.dir;
  return Math.max(0, d);
}
