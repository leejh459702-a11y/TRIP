import Phaser from 'phaser';
import { BALANCE, type TurretTier } from '../config/balance';
import { ERAS } from '../config/eras';
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

const WOOD_T = 0x8a5a2b;
const GOLD_T = 0xe0b83c;
const STEEL_T = 0xc9d1da;
const OUT_T = 0x1a1a24;

/** 포탑 받침(시대별 재질) */
function turretMount(p: Pen, era: number, side: number): void {
  const team = TEAM[side];
  switch (era) {
    case 0:
      p.rect(-18, 6, 34, 9, WOOD_T, 4);
      p.rect(-14, 12, 26, 8, shade(WOOD_T, 0.8), 3);
      p.thin(-10, 6, -6, 15, 0xd9c9a0, 2).thin(6, 6, 10, 15, 0xd9c9a0, 2);
      break;
    case 1:
      p.rect(-18, 6, 34, 12, WOOD_T, 3);
      p.rect(-18, 6, 34, 3, GOLD_T, 1);
      p.circle(-12, 14, 2, GOLD_T).circle(10, 14, 2, GOLD_T);
      break;
    case 2:
      p.rect(-18, 6, 34, 12, 0x6b4423, 3);
      for (const bx of [-12, 0, 10]) p.rect(bx, 6, 3, 12, 0x5a606a, 0, false);
      break;
    case 3:
      for (const [x, y] of [[-12, 14], [2, 14], [-5, 7], [9, 7]]) p.ellipse(x, y, 16, 9, 0xc9b98a);
      break;
    case 4:
    default:
      p.poly([-18, 18, -14, 6, 14, 6, 18, 18], 0x3a3f4f);
      p.rect(-10, 10, 20, 3, team.light, 1, false);
      p.glow(0, 11, 12, team.light, 0.12);
      break;
  }
  p.rect(-10, 15, 20, 3, team.main, 1, false);
}

/** 포탑 텍스처: 관절(0,0) 기준 오른쪽을 향함 */
export function turretTexture(scene: Phaser.Scene, era: number, tier: TurretTier, side: number): string {
  return makeTexture(scene, `tur_${era}_${tier}_${side}`, 120, 80, 38, 44, (p) => {
    const team = TEAM[side];
    const key = `${era}_${tier}`;
    turretMount(p, era, side);
    switch (key) {
      // ── 원시 ──
      case '0_light': // 돌 투척대: 장대 끝 바구니
        p.line(-6, 2, 26, -16, WOOD_T, 4);
        p.ellipse(29, -18, 14, 9, 0x6b4a2a);
        p.circle(29, -21, 5, 0x9a8f80);
        p.glow(27, -23, 1.5, 0xffffff, 0.6);
        p.thin(-2, 0, 2, 4, 0xd9c9a0, 2);
        break;
      case '0_medium': // 가시 발사대: 뾰족 말뚝 묶음
        p.rect(-12, -10, 30, 14, WOOD_T, 3);
        for (let i = 0; i < 3; i++) {
          const y = -8 + i * 5;
          p.line(-4, y, 34, y - 1, shade(WOOD_T, 1.15), 3);
          p.poly([34, y - 3, 42, y - 1, 34, y + 1.5], 0xd9c9a0);
        }
        p.thin(4, -12, 4, 6, 0xd9c9a0, 2).thin(14, -12, 14, 6, 0xd9c9a0, 2);
        break;
      case '0_heavy': // 바위 굴림대: 요람 위 큰 바위
        p.line(-10, 2, 22, -6, WOOD_T, 5);
        p.arc(18, -10, 14, 0.1, Math.PI - 0.1, shade(WOOD_T, 0.9), 4);
        p.circle(18, -14, 13, 0x8c8f99);
        p.poly([10, -20, 16, -24, 14, -16], 0xb8bcc4, false);
        p.glow(22, -10, 3, 0x6b6e78, 1);
        break;
      // ── 고대 ──
      case '1_light': // 투창대: 투창 3자루 거치
        p.rect(-12, -6, 22, 10, WOOD_T, 2);
        p.rect(-12, -6, 22, 2, GOLD_T, 0, false);
        for (let i = 0; i < 3; i++) {
          const y = -12 + i * 5;
          p.line(-10, y + 2, 34, y - 2, 0xa07040, 2.5);
          p.poly([34, y - 5, 44, y - 2.5, 34, y + 1], GOLD_T);
        }
        break;
      case '1_medium': // 대형 쇠뇌(스코르피오)
        p.rect(-10, -4, 50, 8, WOOD_T, 3);
        p.arc(22, 0, 16, -1.5, -0.35, GOLD_T, 3);
        p.arc(22, 0, 16, 0.35, 1.5, GOLD_T, 3);
        p.thin(23, -16, 8, 0, 0xf2f2f2, 1).thin(8, 0, 23, 16, 0xf2f2f2, 1);
        p.line(8, 0, 44, 0, 0x5a4030, 2, false);
        p.poly([44, -3, 52, 0, 44, 3], GOLD_T);
        p.rect(-6, -7, 8, 14, GOLD_T, 2);
        break;
      case '1_heavy': // 화염 항아리 투석기
        p.line(-8, 4, 22, -18, WOOD_T, 5);
        p.ellipse(26, -22, 16, 10, shade(WOOD_T, 0.8));
        p.circle(26, -26, 7, 0xb5643a);
        p.rect(23, -34, 6, 4, 0x8a4a2a, 1);
        p.glow(26, -38, 6, 0xff9a2a, 0.55);
        p.glow(26, -40, 3, 0xffe066, 1);
        break;
      // ── 중세 ──
      case '2_light': // 궁수탑: 총안이 있는 목조 망루 + 궁수
        p.rect(-14, -26, 30, 30, 0x8c929c, 2);
        for (let i = 0; i < 3; i++) p.rect(-14 + i * 11, -32, 8, 7, 0x8c929c, 1);
        p.rect(4, -18, 4, 12, OUT_T, 0, false);
        p.circle(-2, -30, 5, 0xe6b48a);
        p.rect(-7, -38, 10, 5, team.main, 2);
        p.arc(12, -26, 8, -1.2, 1.2, WOOD_T, 2.5);
        p.line(-6, -26, 16, -26, 0xd9c9a0, 1.5, false);
        break;
      case '2_medium': // 발리스타(철제)
        p.rect(-12, -5, 58, 10, 0x6b4423, 3);
        p.arc(26, 0, 20, -1.5, -0.35, 0x5a606a, 4);
        p.arc(26, 0, 20, 0.35, 1.5, 0x5a606a, 4);
        p.thin(27, -20, 8, 0, 0xf2f2f2, 1.2).thin(8, 0, 27, 20, 0xf2f2f2, 1.2);
        p.line(8, 0, 52, 0, 0x5a4030, 3, false);
        p.poly([52, -4, 62, 0, 52, 4], STEEL_T);
        p.circle(-6, 0, 5, 0x5a606a);
        p.thin(-9, -3, -3, 3, OUT_T, 1.5).thin(-9, 3, -3, -3, OUT_T, 1.5);
        break;
      case '2_heavy': // 끓는 기름통: 가마솥 + 증기
        p.line(-10, 4, 20, -10, 0x6b4423, 5);
        p.poly([12, -22, 34, -22, 32, -6, 14, -6], 0x3a3a42);
        p.rect(10, -24, 26, 4, 0x5a606a, 2);
        p.poly([34, -20, 42, -16, 34, -14], 0x3a3a42);
        p.ellipse(23, -22, 20, 4, 0x8a6a1a, false);
        p.glow(20, -30, 4, 0xffffff, 0.35).glow(26, -35, 5, 0xffffff, 0.25);
        p.glow(22, -4, 5, 0xff7a1a, 0.6);
        break;
      // ── 화약 ──
      case '3_light': // 소총 거치대: 양각대 위 소총
        p.line(-12, 2, 30, -4, 0x6e4a2a, 5);
        p.line(4, -2, 46, -6, 0x3a3a42, 3);
        p.rect(12, -11, 14, 5, 0x22222a, 2);
        p.line(20, -4, 14, 8, 0x3a3a42, 2).line(20, -4, 26, 8, 0x3a3a42, 2);
        break;
      case '3_medium': // 개틀링: 다연장 총열 + 탄창 + 크랭크
        p.rect(-10, -9, 22, 18, 0x3a3a42, 4);
        for (let i = 0; i < 4; i++) p.line(8, -6 + i * 4, 48, -6 + i * 4, i % 2 ? 0x2a2a30 : 0x5a5a62, 2.5, false);
        p.rect(20, -9, 4, 18, GOLD_T, 1).rect(40, -9, 4, 18, GOLD_T, 1);
        p.circle(48, 0, 4, OUT_T, false);
        p.circle(-2, -14, 7, 0x5a5a62);
        p.line(-12, 0, -18, 6, 0x5a5a62, 2);
        p.circle(-18, 6, 2.5, 0xb03a2a);
        break;
      case '3_heavy': // 박격포: 짧고 굵은 포신(위로 45°)
        p.poly([-8, 2, 20, -26, 32, -14, 4, 12], 0x3a3a42);
        p.poly([18, -28, 24, -34, 38, -20, 32, -14], 0x2a2a30);
        p.poly([-4, 0, 16, -20, 18, -18, -2, 2], 0xffffff, false, 0.18);
        p.rect(-2, -8, 16, 4, GOLD_T, 1);
        p.rect(-14, 8, 30, 5, 0x5a606a, 2);
        break;
      // ── 미래 ──
      case '4_light': // 펄스 터렛: 돔 + 쌍발 방사구
        p.ellipse(4, -6, 28, 22, 0x8a94ab);
        p.poly([-6, -14, 6, -16, 2, -6, -8, -6], 0xffffff, false, 0.25);
        p.rect(12, -12, 20, 5, 0x3a3f4f, 2).rect(12, -3, 20, 5, 0x3a3f4f, 2);
        p.glow(33, -9.5, 4, team.light, 0.8).glow(33, -0.5, 4, team.light, 0.8);
        p.rect(-2, -8, 8, 3, team.light, 1, false);
        break;
      case '4_medium': // 레일건: 긴 쌍레일 + 코일
        p.rect(-12, -9, 24, 18, 0x5a6278, 5);
        p.rect(8, -8, 54, 4, 0x8a94ab, 1).rect(8, 4, 54, 4, 0x8a94ab, 1);
        for (let i = 0; i < 4; i++) p.rect(16 + i * 11, -9, 5, 18, 0x3a3f4f, 2);
        p.rect(10, -2, 50, 4, team.light, 1, false);
        p.glow(62, 0, 7, team.light, 0.6);
        break;
      case '4_heavy': // 플라즈마 캐논: 굵은 동체 + 발광 구체
      default:
        p.rect(-14, -14, 36, 26, 0x5a6278, 8);
        p.poly([-10, -12, 10, -12, 6, -4, -10, -4], 0xffffff, false, 0.2);
        p.rect(18, -10, 22, 20, 0x3a3f4f, 6);
        p.glow(8, -1, 12, team.light, 0.3);
        p.circle(8, -1, 6, team.light);
        p.glow(6, -3, 2, 0xffffff, 1);
        p.glow(42, 0, 8, team.light, 0.6);
        for (let i = 0; i < 3; i++) p.rect(22 + i * 6, -12, 3, 24, 0x23262f, 0, false);
        break;
    }
    // 회전 관절
    p.circle(0, 3, 4.5, era >= 3 ? 0x5a606a : shade(WOOD_T, 1.2));
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
