import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import type { Projectile } from '../entities/Projectile';
import type { Unit } from '../entities/Unit';
import { EnemyAI } from '../systems/EnemyAI';
import { GameWorld } from '../systems/GameWorld';

const GROUND = BALANCE.world.groundY;

export class GameScene extends Phaser.Scene {
  world!: GameWorld;
  private ai!: EnemyAI;
  private acc = 0;
  private unitViews = new Map<number, Phaser.GameObjects.Container>();
  private projViews = new Map<number, Phaser.GameObjects.Arc>();
  private baseGfx!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.world = new GameWorld({ seed: Date.now() });
    this.ai = new EnemyAI(this.world, 1);
    this.acc = 0;
    this.unitViews.clear();
    this.projViews.clear();

    const W = BALANCE.world.width;
    this.cameras.main.setBounds(0, 0, W, 720);
    this.add.rectangle(W / 2, GROUND / 2, W, GROUND, 0x9fd3f0);
    this.add.rectangle(W / 2, GROUND + 70, W, 140, 0x8f6b3e).setStrokeStyle(4, 0x222222);
    this.baseGfx = this.add.graphics();
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.scene.launch('UIScene');
  }

  update(_t: number, delta: number): void {
    const dt = BALANCE.sim.fixedDt;
    this.acc += delta / 1000;
    let steps = 0;
    while (this.acc >= dt && steps < BALANCE.sim.maxStepsPerFrame) {
      this.world.step(dt);
      this.ai.update(dt);
      this.acc -= dt;
      steps++;
    }
    if (steps >= BALANCE.sim.maxStepsPerFrame) this.acc = 0;
    this.world.drainEvents();
    this.syncViews();

    const cam = this.cameras.main;
    if (this.cursors.left.isDown) cam.scrollX -= 10;
    if (this.cursors.right.isDown) cam.scrollX += 10;

    if (this.world.isOver) {
      const p = this.world.side(0);
      this.scene.stop('UIScene');
      this.scene.start('ResultScene', { win: this.world.winner === 0, time: this.world.time, kills: p.stats.kills, era: p.era });
    }
  }

  private syncViews(): void {
    const alive = new Set<number>();
    for (const u of this.world.units) {
      alive.add(u.id);
      let v = this.unitViews.get(u.id);
      if (!v) {
        v = this.makeUnitView(u);
        this.unitViews.set(u.id, v);
      }
      v.x = u.x;
    }
    for (const [id, v] of this.unitViews) if (!alive.has(id)) { v.destroy(); this.unitViews.delete(id); }

    const liveP = new Set<number>();
    for (const p of this.world.projectiles) {
      liveP.add(p.id);
      let v = this.projViews.get(p.id);
      if (!v) { v = this.makeProjView(p); this.projViews.set(p.id, v); }
      v.x = p.x;
      v.y = GROUND - 30 - Math.sin(p.progress * Math.PI) * 30;
    }
    for (const [id, v] of this.projViews) if (!liveP.has(id)) { v.destroy(); this.projViews.delete(id); }

    const g = this.baseGfx;
    g.clear();
    for (const s of this.world.sides) {
      const b = s.base;
      g.fillStyle(s.id === 0 ? 0x5577cc : 0xcc5555).lineStyle(4, 0x222222);
      g.fillRect(b.x - b.width / 2, GROUND - BALANCE.world.baseHeight, b.width, BALANCE.world.baseHeight);
      g.strokeRect(b.x - b.width / 2, GROUND - BALANCE.world.baseHeight, b.width, BALANCE.world.baseHeight);
      const r = b.hp / b.maxHp;
      g.fillStyle(0x222222).fillRect(b.x - 8, GROUND - 330, 16, 120);
      g.fillStyle(0x44dd44).fillRect(b.x - 6, GROUND - 212 - 116 * r, 12, 116 * r);
    }
  }

  private makeUnitView(u: Unit): Phaser.GameObjects.Container {
    const color = u.side === 0 ? 0x3355aa : 0xaa3333;
    const h = u.role === 'heavy' ? 50 : 36;
    const body = this.add.rectangle(0, -h / 2, u.width, h, color).setStrokeStyle(3, 0x111111);
    const head = this.add.circle(0, -h - 8, 8, 0xe0a877).setStrokeStyle(3, 0x111111);
    return this.add.container(u.x, GROUND, [body, head]);
  }

  private makeProjView(_p: Projectile): Phaser.GameObjects.Arc {
    return this.add.circle(_p.x, GROUND - 30, 4, 0x333333);
  }
}
