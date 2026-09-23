import Phaser from 'phaser';
import { sfx, type Sfx } from '../audio/Sfx';
import { AI_PARAMS, type Difficulty } from '../config/ai';
import { BALANCE } from '../config/balance';
import type { Unit } from '../entities/Unit';
import { EnemyAI } from '../systems/EnemyAI';
import { GameWorld } from '../systems/GameWorld';
import type { CommandResult } from '../systems/types';

const GROUND = BALANCE.world.groundY;

export class GameScene extends Phaser.Scene {
  world!: GameWorld;
  ai!: EnemyAI;
  readonly sfx: Sfx = sfx;
  paused = false;
  private speedIdx = 0;
  private acc = 0;
  private unitViews = new Map<number, Phaser.GameObjects.Container>();
  private gfx!: Phaser.GameObjects.Graphics;
  private hpTexts: Phaser.GameObjects.Text[] = [];
  private keys!: Record<'left' | 'right' | 'a' | 'd', Phaser.Input.Keyboard.Key>;
  private ended = false;
  difficulty: Difficulty = 'normal';

  constructor() {
    super('GameScene');
  }

  get speed(): number {
    return BALANCE.sim.speedOptions[this.speedIdx];
  }

  init(data: { difficulty?: Difficulty }): void {
    this.difficulty = data?.difficulty ?? 'normal';
  }

  create(): void {
    const params = AI_PARAMS[this.difficulty];
    this.world = new GameWorld({ seed: Date.now(), incomeMult: [1, params.incomeMult] });
    this.ai = new EnemyAI(this.world, 1, this.difficulty);
    this.acc = 0;
    this.paused = false;
    this.speedIdx = 0;
    this.ended = false;
    this.unitViews.clear();

    const W = BALANCE.world.width;
    this.cameras.main.setBounds(0, 0, W, 720);
    this.add.rectangle(W / 2, GROUND / 2, W, GROUND, 0x9fd3f0);
    this.add.rectangle(W / 2, GROUND + 70, W, 140, 0x8f6b3e).setStrokeStyle(4, 0x222222);
    this.gfx = this.add.graphics().setDepth(5);
    this.hpTexts = [0, 1].map(() => this.add.text(0, 0, '', { fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(6));

    const kb = this.input.keyboard!;
    this.keys = {
      left: kb.addKey('LEFT'), right: kb.addKey('RIGHT'), a: kb.addKey('A'), d: kb.addKey('D'),
    };
    this.setupCameraDrag();
    this.input.on('pointerdown', () => this.sfx.unlock());
    kb.on('keydown', () => this.sfx.unlock());

    this.scene.launch('UIScene');
  }

  // ───────────────────────── 플레이어 API (UIScene 사용) ─────────────────────────

  command(fn: (w: GameWorld) => CommandResult): CommandResult {
    this.sfx.unlock();
    const r = fn(this.world);
    if (r.ok) this.sfx.click();
    else this.sfx.deny();
    return r;
  }

  togglePause(): void {
    if (this.ended) return;
    this.paused = !this.paused;
    this.sfx.click();
  }

  toggleSpeed(): void {
    this.speedIdx = (this.speedIdx + 1) % BALANCE.sim.speedOptions.length;
    this.sfx.click();
  }

  toggleMute(): void {
    this.sfx.unlock();
    this.sfx.toggleMute();
    this.sfx.click();
  }

  quitToMenu(): void {
    this.scene.stop('UIScene');
    this.scene.start('MenuScene');
  }

  centerCameraOn(x: number): void {
    this.cameras.main.centerOnX(x);
  }

  // ───────────────────────── 카메라 ─────────────────────────

  private setupCameraDrag(): void {
    let dragging = false;
    let lastX = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // HUD 영역(상단/하단)은 UIScene 이 처리
      if (p.y < 170 || p.y > 660) return;
      dragging = true;
      lastX = p.x;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown) return;
      this.cameras.main.scrollX -= p.x - lastX;
      lastX = p.x;
    });
    this.input.on('pointerup', () => { dragging = false; });
  }

  private updateCamera(dtReal: number): void {
    const cam = this.cameras.main;
    const k = this.keys;
    const speed = 900 * dtReal;
    if (k.left.isDown || k.a.isDown) cam.scrollX -= speed;
    if (k.right.isDown || k.d.isDown) cam.scrollX += speed;
  }

  // ───────────────────────── 루프 ─────────────────────────

  update(): void {
    // Phaser 의 delta 는 저사양에서 스무딩으로 잘리므로 실제 경과 시간(rawDelta)으로 고정 스텝을 돌린다
    const dtReal = Math.min(BALANCE.sim.maxFrameTime, this.game.loop.rawDelta / 1000);
    this.updateCamera(dtReal);
    if (!this.paused && !this.ended) {
      const dt = BALANCE.sim.fixedDt;
      this.acc += dtReal * this.speed;
      let steps = 0;
      const maxSteps = Math.ceil(BALANCE.sim.maxFrameTime / dt) * this.speed;
      while (this.acc >= dt && steps < maxSteps) {
        this.world.step(dt);
        this.ai.update(dt);
        this.acc -= dt;
        steps++;
      }
      if (steps >= maxSteps) this.acc = 0;
    }
    this.world.drainEvents();
    this.syncViews();

    if (this.world.isOver && !this.ended) {
      this.ended = true;
      const p = this.world.side(0);
      this.time.delayedCall(800, () => {
        this.scene.stop('UIScene');
        this.scene.start('ResultScene', { win: this.world.winner === 0, time: this.world.time, kills: p.stats.kills, era: p.era, difficulty: this.difficulty });
      });
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

    const g = this.gfx;
    g.clear();
    for (const p of this.world.projectiles) {
      g.fillStyle(0x333333).fillCircle(p.x, GROUND - 30 - Math.sin(p.progress * Math.PI) * 30, 4);
    }
    for (const d of this.world.drops) {
      if (!d.started) continue;
      const y = GROUND - (d.fallLeft / d.fallTime) * 500;
      g.fillStyle(0xff7722).fillCircle(d.x, y, 8);
    }
    for (const s of this.world.sides) {
      const b = s.base;
      const top = GROUND - BALANCE.world.baseHeight;
      g.fillStyle(s.id === 0 ? 0x5577cc : 0xcc5555).lineStyle(4, 0x222222);
      g.fillRect(b.x - b.width / 2, top, b.width, BALANCE.world.baseHeight);
      g.strokeRect(b.x - b.width / 2, top, b.width, BALANCE.world.baseHeight);
      s.turrets.forEach((t, i) => {
        const ty = top + 20 + i * 45;
        g.fillStyle(i < s.unlockedSlots ? 0x333333 : 0x777777).fillRect(b.frontX - 15, ty, 30, 12);
        if (t) g.fillStyle(0xffcc00).fillRect(b.frontX - 10 + s.dir * 10, ty - 10, 20, 10);
      });
      const r = b.hp / b.maxHp;
      const bx = b.x - s.dir * (b.width / 2 + 18);
      g.fillStyle(0x111111).fillRect(bx - 8, top - 10, 16, 164);
      g.fillStyle(r > 0.3 ? 0x44dd44 : 0xff4444).fillRect(bx - 6, top - 8 + 160 * (1 - r), 12, 160 * r);
      this.hpTexts[s.id].setPosition(bx, top - 24).setText(`${Math.ceil(b.hp)}`);
    }
  }

  private makeUnitView(u: Unit): Phaser.GameObjects.Container {
    const color = u.side === 0 ? 0x3355aa : 0xaa3333;
    const h = u.role === 'heavy' ? 50 : 36;
    const body = this.add.rectangle(0, -h / 2, u.width, h, color).setStrokeStyle(3, 0x111111);
    const head = this.add.circle(0, -h - 8, 8, 0xe0a877).setStrokeStyle(3, 0x111111);
    return this.add.container(u.x, GROUND, [body, head]);
  }
}
