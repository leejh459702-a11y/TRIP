import type { UnitRole } from '../config/balance';
import { getUnitStats, type UnitStats } from '../config/eras';

export type SideId = 0 | 1;
export type UnitState = 'walk' | 'attack' | 'idle';

/** 필드 위 유닛(순수 데이터). 렌더링은 render/UnitRenderer 가 담당. */
export class Unit {
  readonly id: number;
  readonly side: SideId;
  readonly role: UnitRole;
  readonly era: number;
  readonly stats: UnitStats;
  /** 몸통 중심 x */
  x: number;
  hp: number;
  cooldownLeft = 0;
  state: UnitState = 'walk';
  /** 현재 공격 대상 (유닛 id, -1 = 기지, null = 없음) */
  targetId: number | null = null;
  dead = false;
  /** 마지막으로 공격한 시각(월드 시간) — 연출용 */
  lastAttackAt = -1;

  /** statMult: 진영 강화 배율(HP·공격력), hpMult: HP만 추가 배율 */
  constructor(id: number, side: SideId, role: UnitRole, era: number, x: number, statMult = 1, hpMult = 1) {
    this.id = id;
    this.side = side;
    this.role = role;
    this.era = era;
    const base = getUnitStats(role, era);
    this.stats = statMult === 1 && hpMult === 1 ? base : { ...base, hp: Math.round(base.hp * statMult * hpMult), atk: base.atk * statMult };
    this.x = x;
    this.hp = this.stats.hp;
  }

  get maxHp(): number {
    return this.stats.hp;
  }

  get width(): number {
    return this.stats.width;
  }

  /** 전진 방향 (+1 = 오른쪽) */
  get dir(): 1 | -1 {
    return this.side === 0 ? 1 : -1;
  }

  /** 적 쪽을 향한 몸통 앞 가장자리 x */
  get frontX(): number {
    return this.x + (this.dir * this.width) / 2;
  }

  get isRanged(): boolean {
    return this.role === 'ranged';
  }

  /** 전력 지표 hp × atk */
  get power(): number {
    return Math.max(0, this.hp) * this.stats.atk;
  }
}

/** 두 유닛 몸통 사이 간격(겹치면 음수) */
export function unitGap(a: { x: number; width: number }, b: { x: number; width: number }): number {
  return Math.abs(a.x - b.x) - (a.width + b.width) / 2;
}
