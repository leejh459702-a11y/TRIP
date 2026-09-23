import { UNIT_ROLES } from '../config/eras';
import type { SideId } from '../entities/Unit';
import type { GameWorld } from './GameWorld';

/** M1 단순 AI: 일정 간격으로 무작위 유닛 생산 */
export class EnemyAI {
  private timer = 0;

  constructor(private readonly world: GameWorld, private readonly sideId: SideId) {}

  update(dt: number): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.5;
    const role = UNIT_ROLES[Math.floor(this.world.rng() * UNIT_ROLES.length)];
    this.world.train(this.sideId, role);
  }
}
