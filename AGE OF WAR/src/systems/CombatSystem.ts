import { BALANCE } from '../config/balance';
import { ERAS } from '../config/eras';
import { distanceToBase, type Base } from '../entities/Base';
import { Projectile } from '../entities/Projectile';
import { unitGap, type SideId, type Unit } from '../entities/Unit';
import { grantBaseDamageExp, grantKillReward } from './EconomySystem';
import type { GameEvent, SideState } from './types';

/** CombatSystem 이 필요로 하는 월드 인터페이스(GameWorld 가 구현) */
export interface CombatWorld {
  time: number;
  sides: [SideState, SideState];
  units: Unit[];
  unitMap: Map<number, Unit>;
  projectiles: Projectile[];
  winner: SideId | null;
  nextId(): number;
  emit(e: GameEvent): void;
}

export type Target = { kind: 'unit'; unit: Unit } | { kind: 'base' } | null;

const other = (s: SideId): SideId => (s === 0 ? 1 : 0);

/**
 * 타겟팅 규칙
 * - 근접/중장: 사거리 내 적 중 최전방(우리 기지 쪽으로 가장 많이 전진한) 적
 * - 원거리: 아군 뒤에서도 사거리 내 가장 가까운 적
 * - 사거리 내 적 유닛이 없고 적 기지가 사거리 내면 기지
 */
export function selectTarget(unit: Unit, enemies: readonly Unit[], enemyBase: Base): Target {
  const range = unit.stats.range;
  let best: Unit | null = null;
  let bestScore = Infinity;
  for (const e of enemies) {
    if (e.dead || e.hp <= 0) continue;
    const gap = unitGap(unit, e);
    if (gap > range) continue;
    // 근접: 최전방 = 적 진행 방향 기준 가장 앞선(= e.x × 내 dir 이 최소) 유닛
    const score = unit.isRanged ? gap : e.x * unit.dir;
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  if (best) return { kind: 'unit', unit: best };
  if (distanceToBase(unit.frontX, enemyBase) <= range) return { kind: 'base' };
  return null;
}

/** 진영별 유닛을 전방 → 후방 순으로 정렬 */
export function sortFrontFirst(units: Unit[], dir: 1 | -1): Unit[] {
  return units.sort((a, b) => b.x * dir - a.x * dir);
}

export function damageUnit(world: CombatWorld, target: Unit, amount: number): void {
  if (target.dead) return;
  target.hp -= amount;
  world.emit({ type: 'damage', victimSide: target.side, x: target.x, amount, unitId: target.id });
  if (target.hp <= 0) killUnit(world, target);
}

export function killUnit(world: CombatWorld, unit: Unit): void {
  if (unit.dead) return;
  unit.dead = true;
  unit.hp = 0;
  const killer = world.sides[other(unit.side)];
  world.sides[unit.side].stats.unitsLost += 1;
  const r = grantKillReward(killer, unit.stats.cost);
  world.emit({ type: 'death', unit });
  world.emit({ type: 'reward', side: killer.id, gold: r.gold, exp: r.exp, x: unit.x });
}

export function damageBase(world: CombatWorld, attackerSide: SideId, amount: number): void {
  const victim = world.sides[other(attackerSide)];
  const base = victim.base;
  if (base.hp <= 0) return;
  const dealt = Math.min(base.hp, amount);
  base.hp -= dealt;
  grantBaseDamageExp(world.sides[attackerSide], dealt);
  world.emit({ type: 'damage', victimSide: victim.id, x: base.frontX, amount: dealt, unitId: null });
  if (base.hp <= 0 && world.winner === null) {
    base.hp = 0;
    world.winner = attackerSide;
    world.emit({ type: 'gameOver', winner: attackerSide });
  }
}

/** 유닛 이동 / 타겟팅 / 공격 */
export function updateUnits(world: CombatWorld, dt: number): void {
  const bySide: [Unit[], Unit[]] = [[], []];
  for (const u of world.units) if (!u.dead) bySide[u.side].push(u);
  sortFrontFirst(bySide[0], 1);
  sortFrontFirst(bySide[1], -1);

  for (const sideId of [0, 1] as SideId[]) {
    const own = bySide[sideId];
    const enemies = bySide[other(sideId)];
    const enemyBase = world.sides[other(sideId)].base;
    const dir = world.sides[sideId].dir;

    for (let i = 0; i < own.length; i++) {
      const u = own[i];
      if (u.dead) continue;
      u.cooldownLeft = Math.max(0, u.cooldownLeft - dt);
      const target = selectTarget(u, enemies, enemyBase);

      if (target) {
        u.state = 'attack';
        u.targetId = target.kind === 'unit' ? target.unit.id : -1;
        if (u.cooldownLeft <= 0) {
          attack(world, u, target);
          u.cooldownLeft = u.stats.cooldown;
        }
        continue;
      }

      u.targetId = null;
      let nx = u.x + dir * u.stats.speed * dt;
      // 같은 편 앞 유닛과 최소 간격 유지
      const ahead = own[i - 1];
      if (ahead && !ahead.dead) {
        const limit = ahead.x - dir * ((ahead.width + u.width) / 2 + BALANCE.unitGap);
        if ((nx - limit) * dir > 0) nx = (u.x - limit) * dir > 0 ? u.x : limit;
      }
      // 적 유닛과 겹치지 않기
      const enemyFront = enemies[0];
      if (enemyFront) {
        const limit = enemyFront.x - dir * ((enemyFront.width + u.width) / 2);
        if ((nx - limit) * dir > 0) nx = (u.x - limit) * dir > 0 ? u.x : limit;
      }
      // 적 기지 관통 금지
      const baseLimit = enemyBase.frontX - (dir * u.width) / 2;
      if ((nx - baseLimit) * dir > 0) nx = baseLimit;

      const moved = Math.abs(nx - u.x);
      u.x = nx;
      u.state = moved > 1e-4 ? 'walk' : 'idle';
    }
  }
}

function attack(world: CombatWorld, u: Unit, target: Exclude<Target, null>): void {
  u.lastAttackAt = world.time;
  if (u.isRanged) {
    const def = ERAS[u.era].units[u.role];
    const targetX = target.kind === 'unit' ? target.unit.x : world.sides[other(u.side)].base.frontX;
    const p = new Projectile({
      id: world.nextId(),
      side: u.side,
      targetId: target.kind === 'unit' ? target.unit.id : -1,
      damage: u.stats.atk,
      speed: BALANCE.projectile.speed,
      splashRadius: 0,
      look: def.projectile ?? 'stone',
      source: 'unit',
      x: u.frontX,
      targetX,
    });
    world.projectiles.push(p);
    world.emit({ type: 'shoot', attacker: u, projectile: p });
    return;
  }
  world.emit({ type: 'melee', attacker: u, targetId: target.kind === 'unit' ? target.unit.id : -1 });
  if (target.kind === 'unit') damageUnit(world, target.unit, u.stats.atk);
  else damageBase(world, u.side, u.stats.atk);
}

/** 포탑: 사거리(기지 앞 가장자리 기준) 내 가장 가까운 적 유닛에게 발사 */
export function findTurretTarget(base: Base, enemies: readonly Unit[], range: number): Unit | null {
  let best: Unit | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (e.dead) continue;
    const nearEdge = e.x - (base.dir * e.width) / 2;
    const d = distanceToBase(nearEdge, base);
    if (d <= range && d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

export function updateTurrets(world: CombatWorld, dt: number): void {
  for (const side of world.sides) {
    const enemies = world.units.filter((u) => u.side !== side.id && !u.dead);
    for (const t of side.turrets) {
      if (!t) continue;
      t.cooldownLeft = Math.max(0, t.cooldownLeft - dt);
      const target = findTurretTarget(side.base, enemies, t.stats.range);
      t.targetId = target ? target.id : null;
      if (!target || t.cooldownLeft > 0) continue;
      t.cooldownLeft = t.stats.cooldown;
      t.lastFireAt = world.time;
      const def = ERAS[t.era].turrets[t.tier];
      const p = new Projectile({
        id: world.nextId(),
        side: side.id,
        targetId: target.id,
        damage: t.stats.damage,
        speed: BALANCE.projectile.turretSpeed,
        splashRadius: t.stats.splashRadius,
        look: def.projectile,
        source: 'turret',
        slot: t.slot,
        x: side.base.frontX,
        targetX: target.x,
      });
      world.projectiles.push(p);
      world.emit({ type: 'turretFire', side: side.id, slot: t.slot, projectile: p });
    }
  }
}

/** 투사체 이동/명중. 대상이 사망하면 투사체는 소멸 */
export function updateProjectiles(world: CombatWorld, dt: number): void {
  for (const p of world.projectiles) {
    if (p.done) continue;
    if (p.targetsBase) {
      p.targetX = world.sides[other(p.side)].base.frontX;
    } else {
      const t = world.unitMap.get(p.targetId);
      if (!t || t.dead) {
        p.done = true;
        continue;
      }
      p.targetX = t.x;
    }
    const dx = p.targetX - p.x;
    const step = p.speed * dt;
    if (Math.abs(dx) <= Math.max(step, BALANCE.projectile.hitDistance)) {
      p.x = p.targetX;
      p.done = true;
      hitProjectile(world, p);
    } else {
      p.x += Math.sign(dx) * step;
    }
  }
  world.projectiles = world.projectiles.filter((p) => !p.done);
}

function hitProjectile(world: CombatWorld, p: Projectile): void {
  world.emit({ type: 'projectileHit', projectile: p, x: p.x });
  if (p.targetsBase) {
    damageBase(world, p.side, p.damage);
    return;
  }
  if (p.splashRadius > 0) {
    for (const u of world.units) {
      if (u.dead || u.side === p.side) continue;
      if (Math.abs(u.x - p.x) - u.width / 2 <= p.splashRadius) damageUnit(world, u, p.damage);
    }
    return;
  }
  const t = world.unitMap.get(p.targetId);
  if (t && !t.dead) damageUnit(world, t, p.damage);
}

/** 사망 유닛 제거 */
export function removeDead(world: CombatWorld): void {
  if (!world.units.some((u) => u.dead)) return;
  world.units = world.units.filter((u) => {
    if (u.dead) world.unitMap.delete(u.id);
    return !u.dead;
  });
}
