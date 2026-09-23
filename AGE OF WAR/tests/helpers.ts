import type { UnitRole } from '../src/config/balance';
import type { SideId } from '../src/entities/Unit';
import { GameWorld } from '../src/systems/GameWorld';

/** 기본 수입 없음, 고정 시드의 테스트 월드 */
export function makeWorld(): GameWorld {
  return new GameWorld({ seed: 1234, passiveIncome: false });
}

export function place(world: GameWorld, side: SideId, role: UnitRole, x: number, era = 0) {
  return world.spawnUnit(side, { role, era }, x);
}

export function run(world: GameWorld, seconds: number, dt = 1 / 60): void {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) world.step(dt);
}
