import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import type { ProjectileLook, SpecialLook } from '../config/eras';
import type { Projectile } from '../entities/Projectile';
import type { SpecialDrop } from '../systems/types';
import { applyOrigin, makeTexture } from './draw';

/**
 * 파티클/팝업/투사체/특수기 낙하물 등 연출.
 * Text 는 풀링해서 재사용한다.
 */

const GROUND = BALANCE.world.groundY;
const MAX_PARTICLES = 260;
const MAX_TEXTS = 48;

export function prepareEffectTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'fx_dot', 16, 16, 8, 8, (p) => p.glow(0, 0, 7, 0xffffff, 1));
  makeTexture(scene, 'fx_ring', 64, 64, 32, 32, (p) => p.arc(0, 0, 28, 0, Math.PI * 2, 0xffffff, 4, false));
  makeTexture(scene, 'fx_star', 32, 32, 16, 16, (p) => p.poly([0, -14, 4, -4, 14, 0, 4, 4, 0, 14, -4, 4, -14, 0, -4, -4], 0xffffff, false));
  makeTexture(scene, 'fx_puff', 40, 40, 20, 20, (p) => {
    p.glow(0, 0, 16, 0xffffff, 0.9);
    p.glow(-6, -4, 10, 0xffffff, 1);
  });
  // 투사체
  makeTexture(scene, 'pr_stone', 16, 16, 8, 8, (p) => p.circle(0, 0, 5, 0x9a8f80));
  makeTexture(scene, 'pr_arrow', 40, 14, 20, 7, (p) => {
    p.line(-14, 0, 12, 0, 0x8a5a2b, 2);
    p.poly([12, -4, 19, 0, 12, 4], 0xb8c0c8);
    p.poly([-16, -4, -10, 0, -16, 4], 0xf2f2f2, false);
  });
  makeTexture(scene, 'pr_bolt', 34, 14, 17, 7, (p) => {
    p.line(-10, 0, 10, 0, 0x5a4030, 3);
    p.poly([10, -4, 16, 0, 10, 4], 0x9aa0aa);
  });
  makeTexture(scene, 'pr_bullet', 24, 10, 12, 5, (p) => {
    p.glow(-4, 0, 4, 0xffe9a0, 0.6);
    p.ellipse(3, 0, 10, 5, 0xffd24a, false);
  });
  makeTexture(scene, 'pr_laser', 60, 12, 30, 6, (p) => {
    p.rect(-26, -4, 52, 8, 0xffffff, 4, false);
    p.g.fillStyle(0xffffff, 0.35).fillRoundedRect(p.ox - 28, p.oy - 6, 56, 12, 6);
  });
  makeTexture(scene, 'pr_shell', 24, 24, 12, 12, (p) => {
    p.circle(0, 0, 7, 0x2a2a30);
    p.glow(-2, -2, 2, 0xffffff, 0.6);
  });
  makeTexture(scene, 'pr_plasma', 32, 32, 16, 16, (p) => {
    p.glow(0, 0, 13, 0xffffff, 0.35);
    p.glow(0, 0, 8, 0xffffff, 1);
  });
  // 특수기 낙하물
  makeTexture(scene, 'sp_meteor', 60, 60, 30, 30, (p) => {
    p.glow(-8, -8, 22, 0xff7a1a, 0.45);
    p.circle(0, 0, 14, 0x6b4a3a);
    p.glow(-4, -4, 5, 0x9a7a6a, 1);
    p.glow(5, 4, 3, 0x3a2418, 1);
  });
  makeTexture(scene, 'sp_rock', 40, 40, 20, 20, (p) => {
    p.poly([-12, -6, -4, -13, 9, -11, 13, 0, 7, 11, -6, 12, -13, 4], 0x8c8f99);
    p.glow(-3, -4, 3, 0xb8bcc4, 1);
  });
}

type ParticleOpts = {
  tex?: string;
  tint: number;
  count: number;
  speed: [number, number];
  life: [number, number];
  scale: [number, number];
  gravity?: number;
  spread?: [number, number];
  depth?: number;
  alpha?: number;
};

export class Effects {
  private texts: Phaser.GameObjects.Text[] = [];
  private textIdx = 0;
  private particles = 0;
  private projViews = new Map<number, { img: Phaser.GameObjects.Image; startY: number; endY: number; arc: number; px: number; py: number }>();
  private dropViews = new Map<SpecialDrop, { img: Phaser.GameObjects.Image; sx: number; beam?: Phaser.GameObjects.Rectangle }>();

  constructor(private readonly scene: Phaser.Scene) {
    for (let i = 0; i < MAX_TEXTS; i++) {
      this.texts.push(
        scene.add.text(0, 0, '', {
          fontFamily: '"Pretendard", "Noto Sans KR", sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#0b0d14',
          strokeThickness: 4,
        }).setOrigin(0.5).setDepth(900).setVisible(false),
      );
    }
  }

  // ───────────────────────── 팝업 텍스트 ─────────────────────────

  floatText(x: number, y: number, text: string, color: string, size = 18, rise = 40): void {
    const t = this.texts[this.textIdx];
    this.textIdx = (this.textIdx + 1) % this.texts.length;
    this.scene.tweens.killTweensOf(t);
    t.setText(text).setColor(color).setFontSize(size).setPosition(x, y).setAlpha(1).setScale(0.6).setVisible(true);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 120, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: t,
      y: y - rise,
      alpha: 0,
      delay: 250,
      duration: 650,
      ease: 'Quad.In',
      onComplete: () => t.setVisible(false),
    });
  }

  gold(x: number, y: number, amount: number): void {
    this.floatText(x, y, `+${Math.round(amount)}`, '#ffd84a', 20, 56);
  }

  damage(x: number, y: number, amount: number, onPlayer: boolean): void {
    this.floatText(x + (Math.random() - 0.5) * 16, y, `${Math.round(amount)}`, onPlayer ? '#ff9c9c' : '#ffffff', 15, 30);
  }

  // ───────────────────────── 파티클 ─────────────────────────

  burst(x: number, y: number, o: ParticleOpts): void {
    const s = this.scene;
    const n = Math.min(o.count, MAX_PARTICLES - this.particles);
    for (let i = 0; i < n; i++) {
      const [a0, a1] = o.spread ?? [0, Math.PI * 2];
      const ang = a0 + Math.random() * (a1 - a0);
      const sp = o.speed[0] + Math.random() * (o.speed[1] - o.speed[0]);
      const life = o.life[0] + Math.random() * (o.life[1] - o.life[0]);
      const sc = o.scale[0] + Math.random() * (o.scale[1] - o.scale[0]);
      const img = s.add.image(x, y, o.tex ?? 'fx_dot').setTint(o.tint).setScale(sc).setDepth(o.depth ?? 800).setAlpha(o.alpha ?? 1);
      this.particles++;
      const dx = Math.cos(ang) * sp * (life / 1000);
      const dy = Math.sin(ang) * sp * (life / 1000) + (o.gravity ?? 0) * (life / 1000) ** 2;
      s.tweens.add({
        targets: img,
        x: x + dx,
        y: y + dy,
        alpha: 0,
        scale: sc * 0.3,
        duration: life,
        ease: 'Quad.Out',
        onComplete: () => {
          img.destroy();
          this.particles--;
        },
      });
    }
  }

  spark(x: number, y: number, tint = 0xfff2a8): void {
    this.burst(x, y, { tint, count: 5, speed: [60, 160], life: [150, 280], scale: [0.35, 0.6] });
    const star = this.scene.add.image(x, y, 'fx_star').setTint(tint).setScale(0.5).setDepth(801).setRotation(Math.random());
    this.scene.tweens.add({ targets: star, scale: 1, alpha: 0, duration: 160, onComplete: () => star.destroy() });
  }

  explosion(x: number, y: number, radius: number, tint = 0xffa53a): void {
    const s = this.scene;
    const ring = s.add.image(x, y, 'fx_ring').setTint(0xfff1c0).setScale(0.2).setDepth(802);
    s.tweens.add({ targets: ring, scale: radius / 28, alpha: 0, duration: 320, ease: 'Quad.Out', onComplete: () => ring.destroy() });
    const core = s.add.image(x, y, 'fx_dot').setTint(0xfff6d0).setScale(radius / 10).setDepth(803);
    s.tweens.add({ targets: core, scale: radius / 5, alpha: 0, duration: 220, onComplete: () => core.destroy() });
    this.burst(x, y, { tint, count: 14, speed: [80, 260], life: [250, 550], scale: [0.5, 1.1], gravity: 300 });
    this.burst(x, y - 10, { tex: 'fx_puff', tint: 0x6b6b70, count: 5, speed: [20, 60], life: [500, 900], scale: [0.6, 1.2], gravity: -60, alpha: 0.6, depth: 799 });
  }

  puff(x: number, y: number, tint = 0xd8cdb8, count = 6): void {
    this.burst(x, y, { tex: 'fx_puff', tint, count, speed: [20, 80], life: [350, 650], scale: [0.4, 0.9], gravity: -40, alpha: 0.8, spread: [Math.PI, Math.PI * 2] });
  }

  smoke(x: number, y: number): void {
    this.burst(x, y, { tex: 'fx_puff', tint: 0x3a3a40, count: 2, speed: [10, 30], life: [900, 1500], scale: [0.8, 1.5], gravity: -120, alpha: 0.55, depth: 600 });
  }

  muzzle(x: number, y: number, dir: number, tint = 0xffe08a): void {
    const f = this.scene.add.image(x, y, 'fx_star').setTint(tint).setScale(0.8, 0.5).setDepth(805);
    f.setRotation(dir > 0 ? 0 : Math.PI);
    this.scene.tweens.add({ targets: f, scaleX: 1.3, alpha: 0, duration: 90, onComplete: () => f.destroy() });
  }

  deathPoof(x: number, y: number): void {
    this.puff(x, y - 20, 0xe8e0d0, 5);
  }

  // ───────────────────────── 투사체 ─────────────────────────

  private projTex(look: ProjectileLook): string {
    return `pr_${look}`;
  }

  /** 투사체 생성: 시작 높이와 도착 높이를 기억해 포물선/직선으로 그린다 */
  addProjectile(p: Projectile, startY: number, endY: number, tint?: number): void {
    const img = applyOrigin(this.scene.add.image(p.x, startY, this.projTex(p.look))).setDepth(850);
    if (tint !== undefined) img.setTint(tint);
    const dist = Math.abs(p.targetX - p.startX);
    const arcK = p.look === 'shell' ? 0.35 : p.look === 'stone' || p.look === 'arrow' ? 0.18 : 0;
    const arc = Math.min(140, dist * arcK);
    this.projViews.set(p.id, { img, startY, endY, arc, px: p.x, py: startY });
  }

  syncProjectiles(list: readonly Projectile[]): void {
    const alive = new Set<number>();
    for (const p of list) {
      const v = this.projViews.get(p.id);
      if (!v) continue;
      alive.add(p.id);
      const t = p.progress;
      const y = v.startY + (v.endY - v.startY) * t - Math.sin(t * Math.PI) * v.arc;
      v.img.setPosition(p.x, y);
      const dx = p.x - v.px;
      const dy = y - v.py;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) v.img.setRotation(Math.atan2(dy, dx));
      v.px = p.x;
      v.py = y;
    }
    for (const [id, v] of this.projViews) {
      if (!alive.has(id)) {
        v.img.destroy();
        this.projViews.delete(id);
      }
    }
  }

  projectileY(id: number): number | null {
    return this.projViews.get(id)?.py ?? null;
  }

  // ───────────────────────── 특수기 낙하물 ─────────────────────────

  addDrop(d: SpecialDrop, dir: number): void {
    const s = this.scene;
    const sx = d.x - dir * 170;
    let img: Phaser.GameObjects.Image;
    let beam: Phaser.GameObjects.Rectangle | undefined;
    switch (d.look) {
      case 'meteor':
        img = s.add.image(sx, -60, 'sp_meteor').setScale(1.1);
        break;
      case 'arrowRain':
        img = s.add.image(sx, -60, 'pr_arrow').setScale(1.4);
        break;
      case 'catapult':
        img = s.add.image(sx, -60, 'sp_rock').setScale(1.2);
        break;
      case 'barrage':
        img = s.add.image(sx, -60, 'pr_shell').setScale(1.5);
        break;
      case 'orbitalLaser':
      default:
        img = s.add.image(d.x, -60, 'pr_plasma').setTint(0x9ef3ff).setScale(0.6);
        beam = s.add.rectangle(d.x, GROUND / 2, 6, GROUND, 0x9ef3ff, 0.15).setDepth(840);
        break;
    }
    img.setDepth(860);
    this.dropViews.set(d, { img, sx, beam });
  }

  syncDrops(list: readonly SpecialDrop[], dt: number): void {
    const alive = new Set(list);
    for (const [d, v] of this.dropViews) {
      if (!alive.has(d) || d.done) {
        v.img.destroy();
        v.beam?.destroy();
        this.dropViews.delete(d);
        continue;
      }
      const t = 1 - Math.max(0, d.fallLeft) / d.fallTime;
      const e = t * t;
      const x = d.look === 'orbitalLaser' ? d.x : v.sx + (d.x - v.sx) * e;
      const y = -60 + (GROUND - 10 + 60) * e;
      const px = v.img.x;
      const py = v.img.y;
      v.img.setPosition(x, y);
      if (d.look !== 'orbitalLaser') v.img.setRotation(Math.atan2(y - py, x - px));
      if (d.look === 'meteor' && Math.random() < 0.7) {
        this.burst(x, y, { tint: 0xff8a2a, count: 1, speed: [5, 20], life: [200, 350], scale: [0.5, 0.9], alpha: 0.9 });
      }
      if (v.beam) {
        v.beam.setAlpha(0.1 + t * 0.4).setSize(4 + t * 10, GROUND);
        v.beam.setOrigin(0.5);
      }
    }
    void dt;
  }

  impact(x: number, look: SpecialLook): void {
    switch (look) {
      case 'orbitalLaser': {
        const beam = this.scene.add.rectangle(x, GROUND / 2, 40, GROUND, 0xdffbff, 0.9).setDepth(841);
        this.scene.tweens.add({ targets: beam, scaleX: 0.1, alpha: 0, duration: 260, onComplete: () => beam.destroy() });
        this.explosion(x, GROUND - 10, 34, 0x9ef3ff);
        break;
      }
      case 'arrowRain':
        this.spark(x, GROUND - 10, 0xffffff);
        this.puff(x, GROUND - 4, 0xd8cdb8, 3);
        break;
      default:
        this.explosion(x, GROUND - 10, 30, look === 'meteor' ? 0xff7a1a : 0xffa53a);
    }
  }

  clear(): void {
    for (const v of this.projViews.values()) v.img.destroy();
    this.projViews.clear();
    for (const v of this.dropViews.values()) {
      v.img.destroy();
      v.beam?.destroy();
    }
    this.dropViews.clear();
  }
}
