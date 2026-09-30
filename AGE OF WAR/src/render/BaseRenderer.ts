import Phaser from 'phaser';
import { BALANCE, type TurretTier } from '../config/balance';
import type { Unit } from '../entities/Unit';
import type { SideState } from '../systems/types';
import { applyOrigin, makeTexture, type Pen, shade, TEAM } from './draw';
import { recolorToRed } from './recolor';

/**
 * 시대별 기지 그림(src/assets/bases/era{0-4}.webp, 원본 art/bases/)과 포탑.
 * 그림에 그려진 포탑 받침 3칸 위에 포탑을 올린다. 적(빨강)은 파란 계열을 붉게 회전하고 좌우 반전한다.
 */

const GROUND = BALANCE.world.groundY;
/** 원화 캔버스 크기(px) */
const ART_SIZE = 1254;
/** 원화 → 화면 배율 */
const BASE_SCALE = 0.17;
/** 포탑 표시 배율(받침 크기에 맞춤) */
export const TURRET_SCALE = 0.8;
/** 포탑 텍스처에서 관절(0,0)부터 받침 바닥까지 높이 */
const TURRET_FOOT = 18;

interface BaseArt {
  /** 기지 중심(base.x)에 맞출 원화 x */
  anchorX: number;
  /** 지면에 닿는 원화 y */
  bottom: number;
  /** 포탑 받침 윗면 중앙(원화 좌표). 0이 가장 높은 칸 */
  slots: [number, number][];
}

/** 원화 좌표는 1254×1254 원본 기준. 기지 앞(오른쪽) 가장자리가 base.x+85 근처에 오도록 anchorX를 잡음 */
const BASE_ART: BaseArt[] = [
  { anchorX: 722, bottom: 1128, slots: [[755, 328], [912, 540], [1110, 740]] }, // 동굴: 나무 받침대
  { anchorX: 739, bottom: 1146, slots: [[630, 234], [945, 424], [1075, 636]] }, // 신전: 원형 기단
  { anchorX: 720, bottom: 1176, slots: [[695, 238], [815, 505], [1085, 718]] }, // 성: 돌 기둥 받침
  { anchorX: 714, bottom: 1168, slots: [[652, 345], [930, 530], [1080, 686]] }, // 요새: 철판 포대, 3번은 아치 옆 돌턱
  { anchorX: 743, bottom: 1148, slots: [[990, 426], [1115, 655], [365, 925]] }, // 미래: 원형 포대
];

const baseUrls = import.meta.glob('../assets/bases/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function preloadBases(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(baseUrls)) {
    const name = path.split('/').pop()!.replace('.webp', '');
    scene.load.image(`basesrc_${name}`, url);
  }
}

const baseTextureKey = (era: number, side: number) => `base_${era}_${side}`;

/** 진영별 기지 텍스처(파랑 원본 / 빨강 변환) 등록. BootScene.create 에서 호출 */
export function prepareBaseTextures(scene: Phaser.Scene): void {
  for (let era = 0; era < BASE_ART.length; era++) {
    const src = `basesrc_era${era}`;
    if (!scene.textures.exists(src)) continue;
    const img = scene.textures.get(src).getSourceImage() as HTMLImageElement;
    if (!scene.textures.exists(baseTextureKey(era, 0))) {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d')!.drawImage(img, 0, 0);
      scene.textures.addCanvas(baseTextureKey(era, 0), c);
    }
    if (!scene.textures.exists(baseTextureKey(era, 1))) scene.textures.addCanvas(baseTextureKey(era, 1), recolorToRed(img));
  }
}

/** 기지 중심·지면 기준 포탑 관절 위치(오른쪽을 바라보는 기준) */
export function turretMountOffset(era: number, slot: number): { x: number; y: number } {
  const art = BASE_ART[era];
  const [sx, sy] = art.slots[slot];
  return {
    x: (sx - art.anchorX) * BASE_SCALE,
    y: (sy - art.bottom) * BASE_SCALE - TURRET_FOOT * TURRET_SCALE,
  };
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

/** 잠긴 포탑 칸 표시(자물쇠). 원점 = 받침 윗면 중앙 */
function lockTexture(scene: Phaser.Scene): string {
  return makeTexture(scene, 'slot_locked', 30, 30, 15, 26, (p) => {
    p.arc(0, -14, 6, Math.PI, 0, 0xc9c9d0, 3);
    p.rect(-8, -14, 16, 12, 0xc9c9d0, 2);
    p.circle(0, -8, 2, 0x44444c, false);
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
  /** 잠긴 칸 자물쇠 표시 */
  private readonly locks: Phaser.GameObjects.Image[] = [];
  private readonly hpGfx: Phaser.GameObjects.Graphics;
  private readonly hpText: Phaser.GameObjects.Text;
  private era = -1;
  private readonly dir: 1 | -1;
  private readonly x: number;
  private smokeTimer = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly side: SideState) {
    this.dir = side.dir;
    this.x = side.base.x;
    this.img = scene.add.image(this.x, GROUND + 6, baseTextureKey(0, side.id)).setDepth(GROUND - 30);
    for (let i = 0; i < BALANCE.turret.slotCount; i++) {
      this.locks.push(applyOrigin(scene.add.image(0, 0, lockTexture(scene))).setDepth(GROUND - 29).setVisible(false));
      this.turrets.push(scene.add.image(0, 0, '__DEFAULT').setVisible(false).setDepth(GROUND - 28));
    }
    this.hpGfx = scene.add.graphics().setDepth(GROUND + 60);
    this.hpText = scene.add.text(0, 0, '', {
      fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ffffff', stroke: '#0b0d14', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(GROUND + 61);
    this.setEra(side.era, true);
  }

  /** 포탑 관절 위치(월드). 현재 기지 그림의 받침 칸을 따른다 */
  mount(i: number): { x: number; y: number } {
    const m = turretMountOffset(Math.max(0, this.era), i);
    return { x: this.x + this.dir * m.x, y: GROUND + 6 + m.y };
  }

  /** 포탑 포구 위치(월드) */
  muzzle(i: number): { x: number; y: number } {
    const t = this.turrets[i];
    const m = this.mount(i);
    const len = 34 * TURRET_SCALE;
    return { x: m.x + Math.cos(t.rotation) * len * this.dir, y: m.y + Math.sin(t.rotation * this.dir) * len };
  }

  private applyArt(): void {
    const key = baseTextureKey(this.era, this.side.id);
    this.img.setTexture(key);
    const art = BASE_ART[this.era];
    const w = this.img.width;
    const k = w / ART_SIZE; // 원화 → 텍스처 배율
    const s = BASE_SCALE / k;
    this.img.setOrigin(art.anchorX / ART_SIZE, art.bottom / ART_SIZE).setScale(s * this.dir, s);
    // 받침 위치가 바뀌므로 포탑·자물쇠도 옮긴다
    for (let i = 0; i < this.turrets.length; i++) {
      const m = this.mount(i);
      this.turrets[i].setPosition(m.x, m.y);
      this.locks[i].setPosition(m.x, m.y + TURRET_FOOT * TURRET_SCALE);
    }
  }

  setEra(era: number, instant = false): void {
    if (era === this.era) return;
    this.era = era;
    if (instant) {
      this.applyArt();
      return;
    }
    this.scene.tweens.add({
      targets: this.img,
      scaleY: this.img.scaleY * 0.1,
      duration: 180,
      ease: 'Quad.In',
      onComplete: () => {
        this.applyArt();
        const ty = this.img.scaleY;
        this.img.setScale(this.img.scaleX, ty * 0.1);
        this.scene.tweens.add({ targets: this.img, scaleY: ty, duration: 380, ease: 'Back.Out' });
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
      this.locks[i].setVisible(i >= s.unlockedSlots);
      if (!t) {
        img.setVisible(false);
        continue;
      }
      const key = turretTexture(this.scene, t.era, t.tier, s.id);
      if (img.texture.key !== key) {
        applyOrigin(img.setTexture(key)).setVisible(true);
        img.setScale(0.1 * this.dir, 0.1);
        this.scene.tweens.add({ targets: img, scaleX: this.dir * TURRET_SCALE, scaleY: TURRET_SCALE, duration: 260, ease: 'Back.Out' });
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
    const bx = this.x - this.dir * 106;
    const top = GROUND - 230;
    const h = 180;
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
