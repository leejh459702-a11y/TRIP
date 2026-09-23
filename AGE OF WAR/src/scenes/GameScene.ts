import Phaser from 'phaser';
import { sfx, type Sfx } from '../audio/Sfx';
import { AI_PARAMS, type Difficulty } from '../config/ai';
import { BALANCE } from '../config/balance';
import { ERAS } from '../config/eras';
import type { Projectile } from '../entities/Projectile';
import type { SideId } from '../entities/Unit';
import { Background } from '../render/Background';
import { BaseView } from '../render/BaseRenderer';
import { TEAM } from '../render/draw';
import { Effects } from '../render/Effects';
import { UnitView } from '../render/UnitRenderer';
import { EnemyAI } from '../systems/EnemyAI';
import { GameWorld } from '../systems/GameWorld';
import type { CommandResult, GameEvent } from '../systems/types';

const GROUND = BALANCE.world.groundY;

/** 전장 씬: 순수 로직(GameWorld)을 고정 스텝으로 돌리고, 이벤트를 받아 연출/사운드를 재생한다. */
export class GameScene extends Phaser.Scene {
  world!: GameWorld;
  ai!: EnemyAI;
  readonly sfx: Sfx = sfx;
  paused = false;
  difficulty: Difficulty = 'normal';
  private speedIdx = 0;
  private acc = 0;
  private ended = false;
  private unitViews = new Map<number, UnitView>();
  private baseViews!: [BaseView, BaseView];
  private background!: Background;
  private effects!: Effects;
  private hpGfx!: Phaser.GameObjects.Graphics;
  private keys!: Record<'left' | 'right' | 'a' | 'd', Phaser.Input.Keyboard.Key>;
  private dragging = false;
  private dragLastX = 0;

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
    this.world = new GameWorld({ seed: Date.now() >>> 0, incomeMult: [1, params.incomeMult] });
    this.ai = new EnemyAI(this.world, 1, this.difficulty);
    this.acc = 0;
    this.paused = false;
    this.speedIdx = 0;
    this.ended = false;
    this.unitViews = new Map();
    this.dragging = false;

    this.cameras.main.setBounds(0, 0, BALANCE.world.width, BALANCE.world.height);
    this.cameras.main.setScroll(0, 0);
    this.background = new Background(this, 0);
    this.baseViews = [new BaseView(this, this.world.side(0)), new BaseView(this, this.world.side(1))];
    this.effects = new Effects(this);
    this.hpGfx = this.add.graphics().setDepth(700);

    const kb = this.input.keyboard!;
    this.keys = { left: kb.addKey('LEFT'), right: kb.addKey('RIGHT'), a: kb.addKey('A'), d: kb.addKey('D') };
    this.setupCameraInput();
    this.input.on('pointerdown', () => this.sfx.unlock());
    kb.on('keydown', () => this.sfx.unlock());
    this.events.once('shutdown', () => this.effects.clear());

    this.scene.launch('UIScene');
  }

  // ───────────────────────── 플레이어 API (UIScene 사용) ─────────────────────────

  /** 플레이어 명령은 모두 이 경로 → GameWorld 명령 API (AI 와 동일) */
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

  private setupCameraInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // HUD 영역(상단/하단)은 UIScene 이 처리
      if (p.y < 170 || p.y > 655) return;
      this.dragging = true;
      this.dragLastX = p.x;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      this.cameras.main.scrollX -= p.x - this.dragLastX;
      this.dragLastX = p.x;
    });
    this.input.on('pointerup', () => { this.dragging = false; });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, dx: number, dy: number) => {
      this.cameras.main.scrollX += (Math.abs(dx) > Math.abs(dy) ? dx : dy) * 0.8;
    });
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
    for (const e of this.world.drainEvents()) this.handleEvent(e);
    this.syncViews(dtReal);

    if (this.world.isOver && !this.ended) this.finish();
  }

  private finish(): void {
    this.ended = true;
    const win = this.world.winner === 0;
    const loser = this.world.side(win ? 1 : 0).base;
    this.cameras.main.pan(loser.x, 360, 700, 'Sine.InOut');
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 180, () => {
        this.effects.explosion(loser.x + (Math.random() - 0.5) * 140, GROUND - 40 - Math.random() * 160, 40 + Math.random() * 30);
        this.sfx.impact();
        this.cameras.main.shake(150, 0.006);
      });
    }
    this.time.delayedCall(400, () => this.sfx.victory(win));
    const p = this.world.side(0);
    this.time.delayedCall(2000, () => {
      this.scene.stop('UIScene');
      this.scene.start('ResultScene', { win, time: this.world.time, kills: p.stats.kills, era: p.era, difficulty: this.difficulty });
    });
  }

  private inView(x: number): boolean {
    const cam = this.cameras.main;
    return x > cam.scrollX - 40 && x < cam.scrollX + cam.width + 40;
  }

  private unitY(id: number, fallback = GROUND - 34): number {
    const v = this.unitViews.get(id);
    if (!v) return fallback;
    return v.root.y - (v.unit.role === 'heavy' ? 52 : 32);
  }

  private handleEvent(e: GameEvent): void {
    const fx = this.effects;
    switch (e.type) {
      case 'spawn':
        if (this.inView(e.unit.x)) fx.puff(e.unit.x, GROUND, 0xd8cdb8, 4);
        break;
      case 'melee': {
        this.unitViews.get(e.attacker.id)?.attack();
        if (this.inView(e.attacker.x)) this.sfx.hit();
        break;
      }
      case 'shoot': {
        const v = this.unitViews.get(e.attacker.id);
        v?.attack();
        const start = v ? v.muzzle : { x: e.attacker.x, y: GROUND - 40 };
        this.addProjectileView(e.projectile, start.y, e.attacker.era >= 4 ? TEAM[e.attacker.side].light : undefined);
        if (e.attacker.era >= 3 && v) fx.muzzle(start.x, start.y, e.attacker.dir, e.attacker.era >= 4 ? TEAM[e.attacker.side].light : 0xffe08a);
        if (this.inView(e.attacker.x)) this.sfx.shoot(e.attacker.era);
        break;
      }
      case 'turretFire': {
        const bv = this.baseViews[e.side];
        bv.recoil(e.slot);
        const m = bv.muzzle(e.slot);
        const t = this.world.side(e.side).turrets[e.slot];
        const era = t?.era ?? 0;
        this.addProjectileView(e.projectile, m.y, era >= 4 ? TEAM[e.side].light : undefined);
        if (era >= 3) fx.muzzle(m.x, m.y, this.world.side(e.side).dir, era >= 4 ? TEAM[e.side].light : 0xffe08a);
        if (this.inView(m.x)) this.sfx.shoot(era);
        break;
      }
      case 'projectileHit': {
        const y = fx.projectileY(e.projectile.id) ?? GROUND - 34;
        if (e.projectile.splashRadius > 0) {
          fx.explosion(e.x, y, e.projectile.splashRadius * 0.6);
          if (this.inView(e.x)) this.sfx.impact();
        } else if (this.inView(e.x)) fx.spark(e.x, y, e.projectile.look === 'laser' || e.projectile.look === 'plasma' ? 0x9ef3ff : 0xfff2a8);
        break;
      }
      case 'damage': {
        if (e.unitId !== null) {
          const v = this.unitViews.get(e.unitId);
          v?.flash();
          if (v && this.inView(e.x)) fx.damage(e.x, v.headY - 6, e.amount, e.victimSide === 0);
        } else {
          this.baseViews[e.victimSide].hit();
          if (this.inView(e.x)) {
            fx.damage(e.x, GROUND - 200, e.amount, e.victimSide === 0);
            this.sfx.baseHit();
          }
        }
        break;
      }
      case 'death': {
        const v = this.unitViews.get(e.unit.id);
        if (v) {
          this.unitViews.delete(e.unit.id);
          v.die(() => {});
        }
        if (this.inView(e.unit.x)) {
          fx.deathPoof(e.unit.x, GROUND);
          this.sfx.death();
        }
        break;
      }
      case 'reward':
        if (e.side === 0) {
          fx.gold(e.x, GROUND - 110, e.gold);
          if (this.inView(e.x)) this.sfx.gold();
        }
        break;
      case 'evolve': {
        this.baseViews[e.side].setEra(e.era);
        const bx = this.world.side(e.side).base.x;
        fx.explosion(bx, GROUND - 100, 70, 0xfff1a8);
        if (e.side === 0) {
          this.cameras.main.flash(600, 255, 255, 230);
          this.background.setEra(e.era);
          this.sfx.evolve();
          this.events.emit('banner', `${ERAS[e.era].name} 진입!`, '#ffe066');
        } else {
          this.events.emit('banner', `적이 ${ERAS[e.era].name}로 진화했습니다`, '#ff9c9c');
        }
        break;
      }
      case 'special':
        this.sfx.special();
        this.cameras.main.shake(250, 0.004);
        this.events.emit('banner', e.side === 0 ? `${ERAS[e.era].special.name}!` : `적의 ${ERAS[e.era].special.name}!`, e.side === 0 ? '#ffe066' : '#ff9c9c');
        break;
      case 'dropStart':
        fx.addDrop(e.drop, this.world.side(e.drop.side).dir);
        break;
      case 'dropImpact':
        fx.impact(e.x, e.look);
        if (this.inView(e.x)) {
          this.sfx.impact();
          this.cameras.main.shake(80, 0.003);
        }
        break;
      case 'turretBuilt': {
        const m = this.baseViews[e.side].mount(e.slot);
        fx.puff(m.x, m.y + 10, 0xd8cdb8, 6);
        if (e.side === 0) this.sfx.build();
        break;
      }
      case 'turretSold': {
        const m = this.baseViews[e.side].mount(e.slot);
        fx.puff(m.x, m.y + 10, 0xb0a890, 6);
        if (e.side === 0) fx.gold(m.x, m.y - 20, e.refund);
        break;
      }
      case 'slotUnlocked': {
        const m = this.baseViews[e.side].mount(e.slot);
        fx.spark(m.x, m.y, 0xffe066);
        if (e.side === 0) this.sfx.build();
        break;
      }
      case 'trained':
      case 'gameOver':
        break;
    }
  }

  private addProjectileView(p: Projectile, startY: number, tint?: number): void {
    const endY = p.targetsBase ? GROUND - 110 : this.unitY(p.targetId);
    this.effects.addProjectile(p, startY, endY, tint);
  }

  private syncViews(dt: number): void {
    for (const u of this.world.units) {
      if (u.dead) continue;
      let v = this.unitViews.get(u.id);
      if (!v) {
        v = new UnitView(this, u, GROUND);
        this.unitViews.set(u.id, v);
      }
      v.update();
    }
    // 월드에서 사라졌는데 death 이벤트를 못 받은 뷰 정리(안전장치)
    for (const [id, v] of this.unitViews) {
      if (!this.world.unitMap.has(id)) {
        v.destroy();
        this.unitViews.delete(id);
      }
    }

    this.effects.syncProjectiles(this.world.projectiles);
    this.effects.syncDrops(this.world.drops, dt);
    for (const bv of this.baseViews) bv.update(dt, this.world.units, (x, y) => this.effects.smoke(x, y));
    this.background.update(dt);

    // 유닛 HP 바(피해 입은 유닛만)
    const g = this.hpGfx;
    g.clear();
    for (const v of this.unitViews.values()) {
      const u = v.unit;
      if (u.hp >= u.maxHp) continue;
      const w = Math.min(44, u.width + 8);
      const x = u.x - w / 2;
      const y = v.headY - 10;
      g.fillStyle(0x0b0d14, 0.85).fillRect(x - 1, y - 1, w + 2, 6);
      g.fillStyle(TEAM[u.side as SideId].main).fillRect(x, y, w * Math.max(0, u.hp / u.maxHp), 4);
    }
  }

  /** 디버그 패널용 */
  get debugInfo(): string {
    const w = this.world;
    const p = this.ai.lastPerception;
    const s1 = w.side(1);
    return [
      `AI(${AI_PARAMS[this.difficulty].label}) 모드: ${this.ai.mode}  웨이브 대기: ${this.ai.pendingWave.length}`,
      `AI 전력(필드+대기열): ${Math.round(p?.myPower ?? 0).toLocaleString()}`,
      `플레이어 전력(AI 인지): ${Math.round(p?.enemyPower ?? 0).toLocaleString()}`,
      `플레이어 필드 전력: ${Math.round(w.fieldPower(0)).toLocaleString()}`,
      `AI 골드 ${Math.floor(s1.gold)} / EXP ${Math.floor(s1.exp)} / ${s1.era + 1}시대`,
      `유닛 ${w.units.length} · 투사체 ${w.projectiles.length} · ${this.game.loop.actualFps.toFixed(0)} FPS`,
      `경과 ${Math.floor(w.time)}s`,
    ].join('\n');
  }
}
