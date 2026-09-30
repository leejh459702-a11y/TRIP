import { BALANCE } from '../config/balance';
import { ERAS, getSpecialDamage } from '../config/eras';
import type { SideId } from '../entities/Unit';
import { damageUnit, type CombatWorld } from './CombatSystem';
import type { SpecialDrop } from './types';

export interface SpecialWorld extends CombatWorld {
  drops: SpecialDrop[];
  rng(): number;
}

export function canUseSpecial(world: SpecialWorld, side: SideId): boolean {
  return world.sides[side].specialCooldown <= 0;
}

/**
 * 특수기 발동: 적 진영 쪽 레인에 20~30개의 낙하물을 분산 투하.
 * 낙하 연출(fallTime) 후 착탄 시 반경 내 적 유닛만 피해. 기지는 피해 없음.
 */
export function activateSpecial(world: SpecialWorld, sideId: SideId): boolean {
  const side = world.sides[sideId];
  if (side.specialCooldown > 0) return false;
  const cfg = BALANCE.special;
  side.specialCooldown = cfg.cooldown * side.mods.specialCooldown;
  const enemyBase = world.sides[sideId === 0 ? 1 : 0].base;
  const from = side.base.frontX + side.dir * cfg.minDistanceFromOwnBase;
  const to = enemyBase.frontX;
  const count = cfg.dropsMin + Math.floor(world.rng() * (cfg.dropsMax - cfg.dropsMin + 1));
  const damage = getSpecialDamage(side.era);
  const look = ERAS[side.era].special.look;
  for (let i = 0; i < count; i++) {
    // 구간을 count 등분해 고르게 퍼지도록 지터
    const t = (i + world.rng()) / count;
    world.drops.push({
      side: sideId,
      x: from + (to - from) * t,
      delay: world.rng() * cfg.spreadDuration,
      fallLeft: cfg.fallTime,
      fallTime: cfg.fallTime,
      damage,
      look,
      started: false,
      done: false,
    });
  }
  world.emit({ type: 'special', side: sideId, era: side.era, look });
  return true;
}

export function updateSpecials(world: SpecialWorld, dt: number): void {
  for (const s of world.sides) s.specialCooldown = Math.max(0, s.specialCooldown - dt);
  for (const d of world.drops) {
    if (d.done) continue;
    if (!d.started) {
      d.delay -= dt;
      if (d.delay <= 0) {
        d.started = true;
        world.emit({ type: 'dropStart', drop: d });
      }
      continue;
    }
    d.fallLeft -= dt;
    if (d.fallLeft > 0) continue;
    d.done = true;
    world.emit({ type: 'dropImpact', side: d.side, x: d.x, look: d.look });
    for (const u of world.units) {
      if (u.dead || u.side === d.side) continue;
      if (Math.abs(u.x - d.x) - u.width / 2 <= BALANCE.special.radius) damageUnit(world, u, d.damage);
    }
  }
  if (world.drops.some((d) => d.done)) world.drops = world.drops.filter((d) => !d.done);
}
