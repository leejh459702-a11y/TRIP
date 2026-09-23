import Phaser from 'phaser';
import { BALANCE, type TurretTier } from '../config/balance';
import { ERAS, TURRET_TIERS } from '../config/eras';
import type { Unit } from '../entities/Unit';
import type { SideState } from '../systems/types';
import { applyOrigin, makeTexture, type Pen, shade, TEAM } from './draw';

/** 시대별 기지(동굴 → 석조 → 성 → 요새 → 미래 기지)와 포탑 */

const GROUND = BALANCE.world.groundY;
/** 기지 중심 기준 포탑 슬롯 위치(오른쪽을 바라보는 기준) */
export const TURRET_MOUNTS = [
  { x: 30, y: -206 },
  { x: 62, y: -150 },
  { x: 70, y: -96 },
];

function flag(p: Pen, x: number, y: number, h: number, side: number): void {
  p.line(x, y, x, y - h, 0x5a4a3a, 4);
  p.poly([x + 2, y - h, x + 38, y - h + 10, x + 2, y - h + 22], TEAM[side].main);
}

function drawBase(p: Pen, era: number, side: number): void {
  const team = TEAM[side];
  switch (ERAS[era].base.look) {
    case 'cave': {
      p.poly([-96, 0, -86, -90, -58, -160, -8, -200, 46, -186, 80, -130, 96, -60, 98, 0], 0x8a7d6b);
      p.poly([-70, -40, -60, -110, -30, -150, -10, -120, -40, -60], 0x9d917f, false);
      p.poly([40, -150, 70, -120, 60, -90, 36, -110], 0x776b5b, false);
      p.ellipse(34, -44, 70, 88, 0x2a1f18);
      p.rect(-4, -4, 76, 8, 0x5f4526, 0, false);
      p.line(84, -10, 84, -70, 0x6b4a2a, 5);
      p.circle(84, -76, 8, 0xffb13b);
      p.glow(84, -80, 5, 0xfff1a8, 1);
      p.ellipse(-50, -8, 26, 8, 0xefe6d0);
      flag(p, -8, -196, 56, side);
      break;
    }
    case 'stone': {
      p.rect(-96, -24, 192, 24, 0xcfc4a4, 2);
      p.rect(-86, -40, 172, 18, 0xdcd2b4, 2);
      for (let i = 0; i < 5; i++) p.rect(-78 + i * 36, -150, 18, 112, 0xefe6cc, 2);
      p.rect(-90, -170, 180, 22, 0xdcd2b4, 2);
      p.rect(-90, -166, 180, 8, team.main, 0, false);
      p.poly([-96, -168, 0, -222, 96, -168], 0xe8dfc2);
      p.circle(0, -186, 9, team.main);
      p.rect(22, -110, 36, 72, 0x5a4630, 3);
      flag(p, -60, -220, 40, side);
      break;
    }
    case 'castle': {
      p.rect(-70, -160, 150, 160, 0x9aa0aa, 2);
      for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) p.rect(-66 + c * 25 + (r % 2) * 12, -150 + r * 21, 20, 2, 0x7d838d, 0, false);
      for (let i = 0; i < 6; i++) p.rect(-70 + i * 26, -176, 16, 18, 0x9aa0aa, 2);
      p.rect(-100, -232, 56, 232, 0x8c929c, 2);
      for (let i = 0; i < 3; i++) p.rect(-100 + i * 20, -248, 14, 18, 0x8c929c, 2);
      p.poly([-106, -246, -72, -296, -38, -246], team.main);
      p.rect(-84, -200, 10, 22, 0x2a2a34, 5);
      p.poly([14, 0, 14, -64, 34, -86, 54, -64, 54, 0], 0x3a2a1e);
      p.thin(20, -60, 48, -60, 0x6b4a2a, 3).thin(20, -40, 48, -40, 0x6b4a2a, 3);
      p.rect(-24, -140, 18, 44, team.main, 0);
      break;
    }
    case 'fortress': {
      p.poly([-96, 0, -86, -150, 70, -150, 96, -60, 96, 0], 0x9c6b4c);
      for (let r = 0; r < 7; r++) for (let c = 0; c < 8; c++) p.rect(-84 + c * 22 + (r % 2) * 11, -140 + r * 20, 16, 2, 0x7a513a, 0, false);
      p.rect(-92, -166, 164, 18, 0x8a5a3e, 2);
      for (let i = 0; i < 3; i++) p.circle(-40 + i * 40, -110, 9, 0x2a1f18);
      p.rect(-20, -60, 50, 60, 0x3a2a1e, 3);
      for (let i = 0; i < 5; i++) p.ellipse(56 + (i % 3) * 14, -8 - Math.floor(i / 3) * 12, 18, 12, 0xc9b98a);
      flag(p, -70, -166, 70, side);
      break;
    }
    case 'future': {
      p.glow(0, -90, 118, team.light, 0.12);
      p.rect(-92, -30, 184, 30, 0x3a3f4f, 6);
      p.ellipse(0, -60, 176, 190, 0x5a6278);
      p.rect(-92, -60, 184, 60, 0x4a5064, 0);
      p.ellipse(0, -110, 120, 70, 0x6b7489, false);
      for (let i = 0; i < 5; i++) p.rect(-70 + i * 30, -52, 18, 8, team.light, 3, false);
      p.rect(26, -86, 40, 86, 0x23262f, 8);
      p.rect(32, -80, 28, 6, team.light, 2, false);
      p.line(-30, -150, -40, -230, 0x8a93a8, 4);
      p.circle(-40, -234, 7, team.light);
      p.arc(0, -40, 140, -1.3, -0.1, team.light, 3, false);
      break;
    }
  }
}

export function baseTexture(scene: Phaser.Scene, era: number, side: number): string {
  return makeTexture(scene, `base_${era}_${side}`, 260, 330, 130, 320, (p) => drawBase(p, era, side));
}

/** 포탑 텍스처: 관절(0,0) 기준 오른쪽을 향함 */
export function turretTexture(scene: Phaser.Scene, era: number, tier: TurretTier, side: number): string {
  const ti = TURRET_TIERS.indexOf(tier);
  return makeTexture(scene, `tur_${era}_${tier}_${side}`, 110, 70, 34, 38, (p) => {
    const team = TEAM[side];
    const mat = [0x8a5a2b, 0xc9a14a, 0x7a808a, 0x3a3a42, 0x5a6278][era];
    const len = [30, 40, 26][ti];
    const th = [8, 10, 18][ti];
    // 포신/발사대
    if (ti === 2) {
      p.rect(-10, -th / 2 - 4, len + 8, th + 4, mat, 6);
      p.ellipse(len - 2, -2, 14, th + 8, shade(mat, 0.7));
    } else {
      p.rect(-6, -th / 2, len + 6, th, mat, 3);
      p.rect(len - 4, -th / 2 - 2, 8, th + 4, shade(mat, 0.8), 2);
    }
    if (era === 1 || era === 2) {
      // 활 팔(발리스타)
      p.arc(len * 0.55, 0, 16, -1.6, 1.6, era === 1 ? 0x8a5a2b : 0x5a606a, 3);
    }
    if (era === 3 && ti === 1) for (let i = 0; i < 3; i++) p.thin(4, -3 + i * 3, len + 4, -3 + i * 3, 0x22222a, 1.5);
    if (era === 4) {
      p.rect(0, -2, len - 4, 3, team.light, 1, false);
      p.glow(len + 2, 0, 5, team.light, 0.7);
    }
    if (era === 0 && ti !== 2) p.thin(6, -th / 2, 6, th / 2, 0xd9c9a0, 3);
    // 받침
    p.rect(-16, 4, 30, 14, shade(mat, 0.8), 4);
    p.rect(-12, 8, 22, 5, team.main, 2, false);
    p.circle(0, 2, 6, shade(mat, 1.2));
  });
}

function plateTexture(scene: Phaser.Scene, locked: boolean): string {
  return makeTexture(scene, locked ? 'plate_locked' : 'plate_open', 60, 30, 30, 8, (p) => {
    p.rect(-22, 10, 44, 10, locked ? 0x55555f : 0x6b5a44, 3);
    p.rect(-10, 18, 20, 8, locked ? 0x44444c : 0x5a4a38, 2);
    if (locked) {
      p.arc(0, 0, 6, Math.PI, 0, 0xc9c9d0, 3);
      p.rect(-8, 0, 16, 11, 0xc9c9d0, 2);
    }
  });
}

export function ensureTurretIcon(scene: Phaser.Scene, era: number, tier: TurretTier): string {
  const key = `icon_turret_${era}_${tier}`;
  if (scene.textures.exists(key)) return key;
  const img = applyOrigin(scene.make.image({ key: turretTexture(scene, era, tier, 0) }, false));
  img.setScale(1.3).setPosition(40, 52);
  const rt = scene.make.renderTexture({ width: 110, height: 84 }, false);
  rt.draw(img);
  rt.saveTexture(key);
  img.destroy();
  return key;
}

export class BaseView {
  private readonly img: Phaser.GameObjects.Image;
  private readonly turrets: Phaser.GameObjects.Image[] = [];
  private readonly plates: Phaser.GameObjects.Image[] = [];
  private readonly hpGfx: Phaser.GameObjects.Graphics;
  private readonly hpText: Phaser.GameObjects.Text;
  private era = -1;
  private readonly dir: 1 | -1;
  private readonly x: number;
  private smokeTimer = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly side: SideState) {
    this.dir = side.dir;
    this.x = side.base.x;
    this.img = scene.add.image(this.x, GROUND + 6, baseTexture(scene, 0, side.id)).setDepth(GROUND - 30);
    applyOrigin(this.img).setScale(this.dir, 1);
    for (let i = 0; i < TURRET_MOUNTS.length; i++) {
      const m = this.mount(i);
      const plate = applyOrigin(scene.add.image(m.x, m.y, plateTexture(scene, true))).setDepth(GROUND - 29).setScale(this.dir, 1);
      this.plates.push(plate);
      const t = scene.add.image(m.x, m.y, '__DEFAULT').setVisible(false).setDepth(GROUND - 28);
      this.turrets.push(t);
    }
    this.hpGfx = scene.add.graphics().setDepth(GROUND + 60);
    this.hpText = scene.add.text(0, 0, '', {
      fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ffffff', stroke: '#0b0d14', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(GROUND + 61);
    this.setEra(side.era, true);
  }

  mount(i: number): { x: number; y: number } {
    const m = TURRET_MOUNTS[i];
    return { x: this.x + this.dir * m.x, y: GROUND + m.y };
  }

  /** 포탑 포구 위치(월드) */
  muzzle(i: number): { x: number; y: number } {
    const t = this.turrets[i];
    const m = this.mount(i);
    const len = 34;
    return { x: m.x + Math.cos(t.rotation) * len * this.dir, y: m.y + Math.sin(t.rotation * this.dir) * len };
  }

  setEra(era: number, instant = false): void {
    if (era === this.era) return;
    this.era = era;
    const key = baseTexture(this.scene, era, this.side.id);
    if (instant) {
      this.img.setTexture(key);
      applyOrigin(this.img);
      return;
    }
    this.scene.tweens.add({
      targets: this.img,
      scaleY: 0.1,
      duration: 180,
      ease: 'Quad.In',
      onComplete: () => {
        this.img.setTexture(key);
        applyOrigin(this.img);
        this.scene.tweens.add({ targets: this.img, scaleY: 1, duration: 380, ease: 'Back.Out' });
      },
    });
  }

  hit(): void {
    this.img.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.img.clearTint());
    this.scene.tweens.add({ targets: this.img, x: this.x + 3, duration: 40, yoyo: true, repeat: 1, onComplete: () => this.img.setX(this.x) });
  }

  recoil(slot: number): void {
    const t = this.turrets[slot];
    const m = this.mount(slot);
    this.scene.tweens.add({ targets: t, x: m.x - this.dir * 5, duration: 50, yoyo: true, ease: 'Quad.Out', onComplete: () => t.setX(m.x) });
  }

  /** 매 프레임 갱신. smokeFn 은 저체력 연기 연출 */
  update(dt: number, units: readonly Unit[], smokeFn: (x: number, y: number) => void): void {
    const s = this.side;
    for (let i = 0; i < this.turrets.length; i++) {
      const t = s.turrets[i];
      const img = this.turrets[i];
      const plate = this.plates[i];
      const locked = i >= s.unlockedSlots;
      const pk = locked ? 'plate_locked' : 'plate_open';
      if (plate.texture.key !== pk) applyOrigin(plate.setTexture(plateTexture(this.scene, locked)));
      if (!t) {
        img.setVisible(false);
        continue;
      }
      const key = turretTexture(this.scene, t.era, t.tier, s.id);
      if (img.texture.key !== key) {
        applyOrigin(img.setTexture(key)).setScale(this.dir, 1).setVisible(true);
        img.setScale(0.1 * this.dir, 0.1);
        this.scene.tweens.add({ targets: img, scaleX: this.dir, scaleY: 1, duration: 260, ease: 'Back.Out' });
      }
      img.setVisible(true);
      // 대상 방향으로 포신 회전(아래쪽만)
      const target = t.targetId !== null ? units.find((u) => u.id === t.targetId) : undefined;
      let want = 0.12;
      if (target) {
        const m = this.mount(i);
        const dx = Math.abs(target.x - m.x);
        const dy = GROUND - 40 - m.y;
        want = Phaser.Math.Clamp(Math.atan2(dy, dx), -0.2, 0.9);
      }
      img.rotation += (want * this.dir - img.rotation) * Math.min(1, dt * 8);
    }

    // HP 바 (기지 바깥쪽 세로 바)
    const b = s.base;
    const r = Math.max(0, b.hp / b.maxHp);
    const bx = this.x - this.dir * 96;
    const top = GROUND - 250;
    const h = 200;
    const g = this.hpGfx;
    g.clear();
    g.fillStyle(0x0b0d14, 0.9).fillRoundedRect(bx - 11, top - 3, 22, h + 6, 6);
    g.fillStyle(0x2a2f3a).fillRoundedRect(bx - 8, top, 16, h, 4);
    const col = r > 0.5 ? 0x5ee37a : r > 0.25 ? 0xffc94a : 0xff5b5b;
    if (r > 0) g.fillStyle(col).fillRoundedRect(bx - 8, top + h * (1 - r), 16, h * r, 4);
    g.fillStyle(0xffffff, 0.25).fillRect(bx - 6, top + h * (1 - r) + 2, 4, Math.max(0, h * r - 4));
    g.fillStyle(TEAM[s.id].main).fillCircle(bx, top - 14, 7);
    this.hpText.setPosition(bx, top + h + 16).setText(`${Math.ceil(b.hp)}`);

    if (r < 0.35 && r > 0) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.25 + (r * 1.5);
        smokeFn(this.x + (Math.random() - 0.5) * 100, GROUND - 120 - Math.random() * 60);
      }
    }
  }

  get sprite(): Phaser.GameObjects.Image {
    return this.img;
  }
}
