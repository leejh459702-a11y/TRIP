import Phaser from 'phaser';
import type { UnitRole } from '../config/balance';
import { ERAS, type EraPalette, type HeadLook, type UnitDef } from '../config/eras';
import type { Unit } from '../entities/Unit';
import { applyOrigin, makeTexture, Pen, shade, TEAM } from './draw';

/**
 * 시대·유형별 벡터 유닛. 모든 유닛은 오른쪽을 바라보도록 그리고, 적은 좌우 반전한다.
 * 파츠(몸통/다리/바퀴/무기)를 개별 텍스처로 생성해 트윈으로 움직인다.
 */

type AttackStyle = 'swing' | 'thrust' | 'recoil' | 'throw';

interface LegSpec {
  key: string;
  x: number;
  y: number;
  far: boolean;
  /** 걷기 위상 오프셋(rad) */
  phase: number;
  wheel?: boolean;
}

interface RigSpec {
  body: string;
  legs: LegSpec[];
  weapon: string;
  weaponX: number;
  weaponY: number;
  attack: AttackStyle;
  /** 머리 높이(HP바 위치) */
  height: number;
  /** 걷기 모션 크기 */
  stride: number;
}

const WOOD = 0x8a5a2b;
const OUT = 0x1a1a24;
const GOLD = 0xe0b83c;
const STEEL = 0xc9d1da;

// ───────────────────────── 공통 파츠 ─────────────────────────

function torsoColor(era: number, pal: EraPalette, side: number): number {
  // 중세 이후에는 진영색 군복/서코트
  return era >= 2 ? TEAM[side].main : pal.cloth;
}

/** 시대별 손 색(맨손 / 가죽 장갑 / 금속 건틀릿) */
function handColor(era: number, pal: EraPalette): number {
  if (era === 2) return 0xaab3bd;
  if (era === 3) return 0xf2efe6;
  if (era === 4) return 0x5a6278;
  return pal.skin;
}

function sleeveColor(era: number, pal: EraPalette, side: number): number {
  if (era === 0) return pal.skin;
  if (era === 1) return pal.cloth;
  if (era === 2) return 0x9aa3ad; // 사슬 소매
  if (era === 4) return 0x7a849c;
  return torsoColor(era, pal, side);
}

/** 오른쪽 아래 음영 + 왼쪽 하이라이트 */
function shadeBox(p: Pen, x: number, y: number, w: number, h: number): void {
  p.poly([x + w * 0.6, y + 1, x + w - 1, y + 1, x + w - 1, y + h - 1, x + w * 0.45, y + h - 1], 0x000000, false, 0.16);
  p.poly([x + 2, y + 2, x + w * 0.22, y + 2, x + w * 0.18, y + h - 3, x + 2, y + h - 3], 0xffffff, false, 0.13);
}

function drawFace(p: Pen, pal: EraPalette, x: number, y: number): void {
  // 귀, 코, 눈, 눈썹, 입
  p.ellipse(x - 4.5, y + 2, 3.6, 4.4, shade(pal.skin, 0.82), false);
  p.poly([x + 8, y - 1, x + 11, y + 2.5, x + 8, y + 3.5], shade(pal.skin, 0.9), false);
  p.ellipse(x + 5, y - 1, 4.2, 4.8, 0xffffff, false);
  p.glow(x + 5.8, y - 0.8, 1.7, OUT, 1);
  p.thin(x + 2, y - 5, x + 7.5, y - 4.4, OUT, 1.6);
  p.thin(x + 4.5, y + 5, x + 7.5, y + 4.6, shade(pal.skin, 0.55), 1.4);
  // 볼 음영
  p.poly([x - 7, y + 2, x + 2, y + 8, x - 4, y + 8], 0x000000, false, 0.12);
}

function drawHead(p: Pen, _era: number, pal: EraPalette, side: number, look: HeadLook, x: number, y: number, beard = false): void {
  const team = TEAM[side];
  p.rect(x - 3, y + 6, 6, 5, shade(pal.skin, 0.85), 1, false);
  p.circle(x, y, 9, pal.skin);
  if (look !== 'visor' && look !== 'greatHelm') drawFace(p, pal, x, y);
  switch (look) {
    case 'hair': {
      const hair = 0x3b2413;
      p.poly([x - 10, y + 1, x - 11, y - 7, x - 6, y - 12, x - 1, y - 14, x + 5, y - 13, x + 10, y - 8, x + 6, y - 7, x + 3, y - 9, x, y - 6, x - 4, y - 7, x - 6, y - 2], hair);
      p.thin(x - 7, y - 10, x - 3, y - 12, shade(hair, 1.6), 1.5);
      // 뼈 머리핀 + 진영색 머리띠
      p.thin(x - 9, y - 6, x + 7, y - 8, team.main, 3);
      p.line(x - 8, y - 14, x - 3, y - 17, 0xf4eedc, 2);
      if (beard) {
        p.poly([x + 1, y + 3, x + 10, y + 2, x + 9, y + 8, x + 5, y + 12, x + 1, y + 9], hair);
        p.thin(x + 3, y + 6, x + 6, y + 9, shade(hair, 1.6), 1.2);
      }
      break;
    }
    case 'helmet': {
      // 청동 투구: 볼가리개 + 챙 + 말총 장식
      const m = pal.metal;
      p.poly([x - 10, y + 3, x - 11, y - 4, x - 6, y - 11, x + 3, y - 12, x + 9, y - 7, x + 10, y - 3, x + 2, y - 3, x + 1, y + 5, x - 4, y + 7], m);
      p.thin(x - 10, y - 4, x + 10, y - 4, shade(m, 0.7), 2);
      p.poly([x - 6, y - 10, x - 3, y - 12, x - 6, y - 4, x - 9, y - 4], 0xffffff, false, 0.3);
      p.rect(x - 3, y - 20, 6, 9, shade(m, 0.8), 1);
      p.poly([x - 12, y - 20, x - 4, y - 25, x + 8, y - 24, x + 12, y - 17, x + 2, y - 18, x - 8, y - 15], team.main);
      for (let i = 0; i < 4; i++) p.thin(x - 8 + i * 5, y - 22, x - 10 + i * 5, y - 16, shade(team.main, 0.7), 1.2);
      break;
    }
    case 'greatHelm': {
      const m = pal.metal;
      p.rect(x - 10, y - 12, 20, 23, m, 4);
      p.rect(x - 1, y - 4, 11, 3, OUT, 0, false);
      p.thin(x + 3, y - 12, x + 3, y + 10, shade(m, 0.7), 1.5);
      for (let i = 0; i < 3; i++) p.glow(x + 6, y + 2 + i * 3, 0.9, OUT, 1);
      for (let i = 0; i < 4; i++) p.glow(x - 8, y - 9 + i * 6, 1, shade(m, 0.6), 1);
      p.poly([x - 8, y - 11, x - 4, y - 11, x - 5, y + 8, x - 8, y + 8], 0xffffff, false, 0.25);
      // 깃털 장식
      p.poly([x - 4, y - 12, x - 10, y - 24, x - 2, y - 30, x + 6, y - 26, x + 4, y - 12], team.main);
      p.thin(x - 6, y - 22, x + 2, y - 14, shade(team.main, 1.4), 1.5);
      break;
    }
    case 'tricorn': {
      p.poly([x - 15, y - 5, x - 5, y - 17, x + 5, y - 17, x + 15, y - 5, x, y - 10], 0x22222a);
      p.thin(x - 15, y - 5, x, y - 10, GOLD, 1.6).thin(x, y - 10, x + 15, y - 5, GOLD, 1.6);
      p.circle(x + 6, y - 11, 3.2, team.main);
      p.glow(x + 6, y - 11, 1.2, 0xffffff, 1);
      // 뒤로 묶은 머리
      p.poly([x - 9, y - 1, x - 13, y + 4, x - 11, y + 7, x - 8, y + 3], 0xe8e4d8);
      break;
    }
    case 'visor': {
      const m = 0x8a94ab;
      p.rect(x - 10, y - 12, 21, 22, m, 7);
      p.thin(x - 10, y + 2, x + 10, y + 2, shade(m, 0.7), 1.5);
      p.rect(x - 1, y - 6, 12, 6, OUT, 2, false);
      p.rect(x, y - 5, 10, 3, team.light, 1, false);
      p.glow(x + 5, y - 3.5, 8, team.light, 0.22);
      p.poly([x - 8, y - 10, x - 4, y - 11, x - 6, y, x - 9, y], 0xffffff, false, 0.3);
      p.line(x - 6, y - 12, x - 9, y - 22, 0x5a6278, 2);
      p.glow(x - 9, y - 22, 2.4, team.light, 1);
      break;
    }
  }
}

function drawBackArm(p: Pen, era: number, pal: EraPalette, side: number, x = 0, y = 0): void {
  const sleeve = shade(sleeveColor(era, pal, side), 0.72);
  p.line(x - 4, y - 41, x - 9, y - 27, sleeve, 6);
  p.circle(x - 9.5, y - 25, 4, shade(handColor(era, pal), 0.78));
}

function drawTorso(p: Pen, era: number, pal: EraPalette, side: number, x = 0, y = 0): void {
  const team = TEAM[side];
  const c = torsoColor(era, pal, side);
  switch (era) {
    case 0: {
      p.rect(x - 9, y - 46, 18, 24, c, 5);
      // 한쪽 어깨 노출
      p.poly([x - 8, y - 45, x - 1, y - 45, x - 8, y - 37], pal.skin, false);
      // 들쭉날쭉한 털 밑단
      p.poly([x - 10, y - 27, x + 10, y - 27, x + 10, y - 21, x + 7, y - 24, x + 4, y - 19, x + 1, y - 23, x - 2, y - 19, x - 5, y - 23, x - 8, y - 19, x - 10, y - 22], shade(c, 0.82));
      p.glow(x - 3, y - 36, 2.4, shade(c, 0.65), 1).glow(x + 4, y - 31, 2, shade(c, 0.65), 1).glow(x + 3, y - 41, 1.6, shade(c, 0.65), 1);
      p.thin(x + 7, y - 45, x - 7, y - 28, team.main, 4);
      for (let i = -2; i <= 2; i++) p.poly([x + i * 3 - 1.2, y - 45, x + i * 3 + 1.2, y - 45, x + i * 3, y - 41.5], 0xf4eedc, false);
      shadeBox(p, x - 9, y - 46, 18, 24);
      break;
    }
    case 1: {
      // 망토 → 튜닉 → 청동 흉갑 → 가죽 띠 치마
      p.poly([x - 8, y - 45, x - 15, y - 22, x - 7, y - 25], team.dark);
      p.rect(x - 9, y - 46, 18, 24, c, 5);
      for (let i = 0; i < 5; i++) p.rect(x - 9.5 + i * 3.8, y - 28, 3.3, 9, i % 2 ? team.main : shade(team.main, 0.8), 1);
      const m = pal.metal;
      p.rect(x - 8, y - 46, 16, 18, m, 5);
      p.arc(x - 2, y - 40, 4, 0.2, 2.6, shade(m, 0.65), 1.5, false);
      p.arc(x + 4, y - 40, 4, 0.5, 2.9, shade(m, 0.65), 1.5, false);
      p.thin(x + 1, y - 36, x + 1, y - 29, shade(m, 0.65), 1.5);
      p.poly([x - 6, y - 44, x - 3, y - 44, x - 4, y - 30, x - 6, y - 30], 0xffffff, false, 0.35);
      p.rect(x - 9, y - 30, 18, 3, 0x6b4423, 1, false);
      shadeBox(p, x - 9, y - 46, 18, 18);
      break;
    }
    case 2: {
      // 사슬갑옷 위 진영색 서코트 + 문장 + 어깨 판금
      p.rect(x - 9, y - 46, 18, 26, 0x9aa3ad, 5);
      for (let r = 0; r < 6; r++) for (let k = 0; k < 4; k++) p.glow(x - 7 + k * 4.5 + (r % 2) * 2, y - 44 + r * 4, 0.8, 0x6b7480, 1);
      p.poly([x - 7, y - 44, x + 8, y - 44, x + 9, y - 21, x + 1, y - 18, x - 8, y - 21], c);
      p.rect(x - 1.5, y - 41, 3, 13, GOLD, 0, false);
      p.rect(x - 5, y - 37, 10, 3, GOLD, 0, false);
      p.rect(x - 9, y - 26, 18, 3.5, 0x5a3a1c, 1);
      p.rect(x - 1.5, y - 26.5, 4, 4.5, GOLD, 1);
      p.ellipse(x - 3, y - 44, 13, 8, pal.metal);
      p.thin(x - 8, y - 45, x + 2, y - 45, 0xffffff, 1.2, 0.6);
      shadeBox(p, x - 9, y - 46, 18, 26);
      break;
    }
    case 3: {
      // 군복 코트: 흰 라펠, 금단추, 교차 탄띠, 탄약통, 견장
      p.rect(x - 9, y - 46, 18, 27, c, 5);
      p.poly([x + 2, y - 45, x + 8, y - 45, x + 8, y - 30, x + 3, y - 33], 0xf2efe6, false);
      for (let i = 0; i < 4; i++) p.glow(x + 5.5, y - 42 + i * 4, 1.2, GOLD, 1);
      p.thin(x - 8, y - 45, x + 8, y - 24, 0xf2f2f2, 3.2).thin(x + 8, y - 45, x - 8, y - 24, 0xf2f2f2, 3.2);
      p.glow(x, y - 34.5, 1.8, GOLD, 1);
      p.rect(x - 10, y - 25, 7, 5, 0x1a1a22, 1);
      p.rect(x - 4, y - 47, 9, 3, 0xd8322a, 1, false);
      p.ellipse(x - 5, y - 45, 10, 5, GOLD);
      for (let i = 0; i < 4; i++) p.thin(x - 9 + i * 2.4, y - 43, x - 9 + i * 2.4, y - 40, GOLD, 1);
      shadeBox(p, x - 9, y - 46, 18, 27);
      break;
    }
    case 4:
    default: {
      // 전투 슈트: 흉판, 에너지 코어, 이음새, 어깨 패드
      p.rect(x - 9, y - 46, 18, 26, 0x7a849c, 5);
      p.poly([x - 7, y - 44, x + 8, y - 44, x + 7, y - 33, x, y - 30, x - 7, y - 33], 0x9aa6bd);
      p.glow(x + 1, y - 38, 6, team.light, 0.25);
      p.circle(x + 1, y - 38, 2.8, team.light);
      p.glow(x + 0.3, y - 38.7, 1, 0xffffff, 1);
      for (let i = 0; i < 3; i++) p.rect(x - 6, y - 29 + i * 3, 12, 2, 0x5a6278, 1, false);
      p.rect(x - 11, y - 47, 9, 8, 0x5a6278, 3);
      p.thin(x - 10, y - 43, x - 3, y - 43, team.light, 1.5);
      p.rect(x - 9, y - 22, 18, 3, 0x2c303c, 1, false);
      p.rect(x - 2, y - 22, 4, 3, team.light, 0, false);
      shadeBox(p, x - 9, y - 46, 18, 26);
      break;
    }
  }
}

function legTexture(scene: Phaser.Scene, key: string, era: number, pal: EraPalette, side: number): string {
  return makeTexture(scene, key, 22, 34, 9, 5, (p) => {
    switch (era) {
      case 0:
        p.rect(-4, -3, 9, 18, pal.skin, 3);
        p.rect(-5, 7, 11, 6, pal.cloth, 2);
        p.thin(-5, 9, 6, 11, shade(pal.cloth, 0.6), 1.2);
        p.rect(-4, 14, 12, 6, shade(pal.skin, 0.9), 3);
        p.thin(-3, 17, 7, 17, 0x6b4a2a, 1.5);
        break;
      case 1:
        p.rect(-4, -3, 9, 18, pal.skin, 3);
        p.rect(-4, 3, 9, 10, pal.metal, 3);
        p.thin(-2, 4, -2, 12, 0xffffff, 1.2, 0.5);
        p.thin(-4, 14, 5, 12, 0x6b4423, 1.5).thin(-4, 12, 5, 15, 0x6b4423, 1.5);
        p.rect(-4, 16, 12, 4, 0x6b4423, 2);
        break;
      case 2:
        p.rect(-4, -3, 9, 18, 0x9aa3ad, 3);
        for (let r = 0; r < 3; r++) p.glow(-1 + (r % 2) * 3, r * 4, 0.8, 0x6b7480, 1);
        p.rect(-4, 5, 9, 10, pal.metal, 3);
        p.circle(0.5, 5, 3.4, pal.metal);
        p.poly([-4, 14, 6, 14, 11, 19, 11, 21, -4, 21], shade(pal.metal, 0.85));
        break;
      case 3:
        p.rect(-4, -3, 9, 11, 0xe8e4d8, 3);
        p.rect(-4, 6, 9, 10, 0x2a2a30, 2);
        for (let i = 0; i < 3; i++) p.glow(4, 8 + i * 3, 0.9, GOLD, 1);
        p.rect(-4, 15, 12, 6, 0x1a1a22, 3);
        p.rect(2, 15, 3, 3, GOLD, 0, false);
        break;
      case 4:
      default:
        p.rect(-4, -3, 9, 11, 0x5a6278, 3);
        p.circle(0.5, 7, 4.5, 0x8a94ab);
        p.rect(-4, 9, 9, 7, 0x7a849c, 2);
        p.rect(-4, 14, 12, 7, 0x9aa6bd, 3);
        p.rect(-3, 18, 10, 1.5, TEAM[side].light, 0, false);
        break;
    }
    p.poly([1.5, -2, 4.5, -2, 4.5, 14, 1.5, 14], 0x000000, false, 0.14);
  });
}

// ───────────────────────── 무기 ─────────────────────────

function weaponTexture(scene: Phaser.Scene, key: string, def: UnitDef, era: number, pal: EraPalette, side: number): string {
  const team = TEAM[side];
  const sleeve = sleeveColor(era, pal, side);
  const hand = handColor(era, pal);
  return makeTexture(scene, key, 130, 110, 50, 60, (p) => {
    const armDown = () => {
      p.line(0, 0, 6, 14, sleeve, 7);
      if (era === 3) p.line(5, 12, 7, 15, 0xf2efe6, 4);
      p.circle(8, 17, 4.5, hand);
    };
    const armFwd = () => {
      p.line(0, 0, 12, 5, sleeve, 7);
      if (era === 3) p.line(10, 4, 12, 5, 0xf2efe6, 4);
      p.circle(14, 6, 4.5, hand);
    };
    switch (def.weapon) {
      case 'club':
        p.line(8, 18, 20, -8, WOOD, 6);
        p.circle(22, -12, 7.5, shade(WOOD, 0.9));
        p.poly([26, -18, 31, -20, 28, -14], 0xd8d0c0).poly([15, -15, 14, -21, 19, -17], 0xd8d0c0);
        p.thin(18, -14, 24, -8, 0x000000, 2, 0.2);
        p.thin(10, 12, 13, 8, 0x5a3a1c, 3);
        armDown();
        break;
      case 'spear':
        p.circle(-2, 8, 12, team.main);
        p.arc(-2, 8, 9, 0, Math.PI * 2, shade(team.main, 0.7), 1.5, false);
        p.circle(-2, 8, 4, GOLD);
        for (let i = 0; i < 6; i++) p.glow(-2 + Math.cos(i) * 10, 8 + Math.sin(i) * 10, 1, GOLD, 1);
        p.line(-8, 22, 40, 2, WOOD, 4);
        p.poly([39, -3, 55, 1, 39, 7, 42, 2], pal.metal);
        p.thin(40, 1, 52, 1.4, 0xffffff, 1.2, 0.6);
        armDown();
        break;
      case 'sword':
        p.line(8, 18, 26, -14, 0xdde3ea, 5);
        p.thin(10, 14, 25, -12, 0x9aa3ad, 1.4);
        p.line(2, 12, 14, 22, GOLD, 3);
        p.line(5, 22, 8, 18, 0x5a3a1c, 3);
        p.circle(4, 24, 2.6, GOLD);
        armDown();
        break;
      case 'musket':
        p.line(-12, 13, 30, 7, WOOD, 6);
        p.thin(-10, 11, 26, 6, shade(WOOD, 1.3), 1.5);
        p.line(6, 8, 42, 4, 0x4a4a52, 3);
        p.rect(18, 3, 5, 5, GOLD, 1).rect(30, 2, 3, 5, GOLD, 1);
        p.rect(4, 8, 6, 4, 0x3a3a42, 1);
        p.line(42, 4, 57, 2, 0xdde3ea, 2);
        armFwd();
        break;
      case 'plasmaBlade':
        p.glow(20, -4, 16, team.light, 0.22);
        p.line(6, 18, 11, 10, 0x555a66, 5);
        p.rect(8, 8, 7, 4, 0x8a94ab, 1);
        p.line(11, 9, 28, -20, team.light, 7);
        p.thin(11, 9, 27, -19, 0xffffff, 2.5);
        armDown();
        break;
      case 'sling':
        armFwd();
        p.thin(14, 6, 6, -16, 0x6b4a2a, 2);
        p.thin(14, 6, 10, -15, 0x6b4a2a, 1.5);
        p.ellipse(7, -17, 8, 6, 0x6b4a2a);
        p.circle(7, -19, 3.6, 0x9a8f80);
        p.rect(-6, 10, 8, 7, 0x6b4a2a, 2);
        break;
      case 'bow':
        p.arc(12, 6, 20, -1.25, 1.25, WOOD, 4);
        p.rect(15, 3, 6, 6, 0x5a3a1c, 1);
        p.thin(18.3, -12.9, 10, 6, 0xf2f2f2, 1.2).thin(10, 6, 18.3, 24.9, 0xf2f2f2, 1.2);
        p.line(8, 6, 36, 6, 0xd9c9a0, 2, false);
        p.poly([36, 3, 41, 6, 36, 9], pal.metal, false);
        p.poly([8, 6, 4, 2, 2, 3, 6, 6, 2, 9, 4, 10], team.main, false);
        armFwd();
        p.rect(-12, -4, 7, 16, 0x6b4a2a, 2);
        p.thin(-9, -6, -9, -2, 0xd9c9a0, 1.2).thin(-7, -6, -7, -2, 0xd9c9a0, 1.2);
        break;
      case 'crossbow':
        p.line(-2, 8, 30, 5, WOOD, 6);
        p.thin(0, 6, 28, 4, shade(WOOD, 1.3), 1.5);
        p.arc(27, 5, 12, -1.4, 1.4, 0x6b7280, 3);
        p.thin(29.2, -6.8, 22, 5, 0xf2f2f2, 1).thin(22, 5, 29.2, 16.8, 0xf2f2f2, 1);
        p.line(20, 4, 36, 4, 0x5a4030, 2, false);
        p.rect(4, 9, 4, 5, 0x3a3a42, 1);
        armFwd();
        break;
      case 'rifle':
        p.line(-12, 11, 34, 5, WOOD, 6);
        p.thin(-10, 9, 30, 4, shade(WOOD, 1.3), 1.5);
        p.line(10, 6, 54, 2, 0x3a3a42, 3);
        p.rect(12, -4, 16, 5, 0x22222a, 2);
        p.circle(28, -1.5, 2.6, 0x7ec4e8);
        p.rect(20, 7, 2, 6, 0x22222a, 0, false);
        armFwd();
        break;
      case 'laserRifle':
        p.rect(-6, -1, 46, 11, 0x3a3f4f, 4);
        p.rect(-6, 5, 12, 5, 0x23262f, 2, false);
        p.rect(4, 2, 28, 3, team.light, 1, false);
        for (let i = 0; i < 4; i++) p.rect(8 + i * 6, 7, 3, 2, 0x5a6278, 0, false);
        p.rect(38, 1, 12, 7, 0x23262f, 2);
        p.glow(51, 4.5, 6, team.light, 0.55);
        p.rect(10, -6, 12, 5, 0x5a6278, 2);
        armFwd();
        break;
      // 중장 탈것 무기
      case 'tusk': // 매머드 기수: 뼈 몽둥이
        p.line(8, 18, 22, -10, 0xefe6d0, 6);
        p.circle(24, -14, 7.5, 0xefe6d0);
        p.glow(22, -16, 2, 0xffffff, 0.8);
        p.thin(12, 10, 15, 4, 0x6b4a2a, 3);
        armDown();
        break;
      case 'chariot':
        p.line(-14, 20, 44, -2, WOOD, 4);
        p.poly([43, -7, 58, -3, 43, 3, 46, -2], pal.metal);
        p.poly([30, 0, 36, -6, 36, 4], team.main, false);
        armDown();
        break;
      case 'lance':
        p.line(-16, 6, 74, -2, team.main, 7);
        for (let i = 0; i < 4; i++) p.thin(8 + i * 16, 5 - i * 1.4, 14 + i * 16, 4.4 - i * 1.4, 0xffffff, 5);
        p.poly([74, -5, 84, -2, 74, 1], STEEL);
        p.poly([-2, -8, 12, 2, -2, 16], pal.metal);
        p.thin(0, -4, 8, 2, 0xffffff, 1.2, 0.5);
        armFwd();
        break;
      case 'cannon':
        p.rect(-18, -10, 60, 20, 0x3a3a42, 8);
        p.poly([-16, -8, 38, -8, 38, -4, -16, -4], 0xffffff, false, 0.18);
        p.rect(36, -12, 9, 24, 0x2a2a30, 3);
        p.circle(45, 0, 4, OUT, false);
        for (const bx of [-8, 8, 24]) p.rect(bx, -11, 4, 22, GOLD, 1);
        p.circle(-19, 0, 5, 0x2a2a30);
        break;
      case 'mechGun':
        p.rect(-8, -9, 24, 20, 0x5a6278, 5);
        p.circle(2, 1, 4, 0x3a3f4f);
        p.rect(12, -6, 46, 14, 0x3a3f4f, 4);
        p.rect(14, -9, 36, 4, 0x5a6278, 2);
        p.rect(20, -2, 26, 3, team.light, 1, false);
        for (let i = 0; i < 3; i++) p.rect(26 + i * 7, 5, 4, 2, 0x23262f, 0, false);
        p.glow(59, 1, 8, team.light, 0.55);
        p.circle(58, 1, 3, 0xffffff, false);
        break;
      default:
        armDown();
    }
  });
}

function attackStyle(def: UnitDef): AttackStyle {
  switch (def.weapon) {
    case 'spear': case 'musket': case 'lance': case 'chariot': return 'thrust';
    case 'sling': return 'throw';
    case 'bow': case 'crossbow': case 'rifle': case 'laserRifle': case 'cannon': case 'mechGun': return 'recoil';
    default: return 'swing';
  }
}

// ───────────────────────── 조립 사양 ─────────────────────────

function bipedRig(scene: Phaser.Scene, base: string, def: UnitDef, era: number, pal: EraPalette, side: number): RigSpec {
  const body = makeTexture(scene, `${base}_body`, 80, 100, 40, 94, (p) => {
    drawBackArm(p, era, pal, side);
    drawTorso(p, era, pal, side);
    drawHead(p, era, pal, side, def.head, 1, -55, def.role === 'melee');
  });
  const leg = legTexture(scene, `${base}_leg`, era, pal, side);
  return {
    body,
    legs: [
      { key: leg, x: -2, y: -22, far: true, phase: Math.PI },
      { key: leg, x: 2, y: -22, far: false, phase: 0 },
    ],
    weapon: weaponTexture(scene, `${base}_wpn`, def, era, pal, side),
    weaponX: 2,
    weaponY: -40,
    attack: attackStyle(def),
    height: 72,
    stride: 0.5,
  };
}

function riderOn(p: Pen, era: number, pal: EraPalette, side: number, def: UnitDef, x: number, y: number): void {
  // 허리 위 기수 (y = 허리): 상체 드로잉을 24px 올려서 재사용
  drawBackArm(p, era, pal, side, x, y + 20);
  drawTorso(p, era, pal, side, x, y + 20);
  drawHead(p, era, pal, side, def.head, x + 1, y - 35);
}

function hoof(p: Pen, x: number, y: number, color: number): void {
  p.rect(x - 4.5, y, 10, 6, color, 2);
}

function heavyRig(scene: Phaser.Scene, base: string, def: UnitDef, era: number, pal: EraPalette, side: number): RigSpec {
  const team = TEAM[side];
  const wpn = weaponTexture(scene, `${base}_wpn`, def, era, pal, side);
  switch (def.mount) {
    case 'mammoth': {
      const fur = 0x7a4a2a;
      const furD = shade(fur, 0.7);
      const body = makeTexture(scene, `${base}_body`, 160, 160, 80, 150, (p) => {
        // 덥수룩한 몸통(들쭉날쭉한 아랫단) + 등 혹
        p.poly([-50, -44, -48, -66, -36, -82, -12, -90, 14, -86, 34, -72, 42, -52, 40, -30, 34, -24, 28, -30, 20, -22, 12, -30, 4, -22, -6, -30, -14, -22, -22, -30, -30, -22, -38, -30, -46, -26], fur);
        for (const [sx, sy] of [[-40, -62], [-28, -74], [-16, -52], [-2, -66], [10, -46], [22, -60], [-34, -40], [0, -38]]) {
          p.thin(sx, sy, sx + 5, sy + 12, furD, 2.4);
          p.thin(sx + 3, sy - 2, sx + 8, sy + 9, shade(fur, 1.3), 1.4);
        }
        p.poly([-44, -64, -30, -80, -12, -86, -24, -72, -40, -56], 0xffffff, false, 0.12);
        p.poly([10, -30, 40, -34, 40, -26, 34, -24, 28, -30, 20, -22, 12, -30], 0x000000, false, 0.18);
        // 안장 담요 + 로프 + 뼈 장식 + 진영 깃발
        p.poly([-34, -86, 12, -88, 16, -70, -4, -64, -30, -68], team.main);
        p.thin(-32, -76, 14, -78, GOLD, 2);
        for (let i = 0; i < 4; i++) p.poly([-26 + i * 11, -66, -22 + i * 11, -66, -24 + i * 11, -59], 0xf4eedc);
        p.line(-30, -86, -32, -128, 0x6b4a2a, 3);
        p.poly([-31, -128, -8, -122, -31, -114], team.main);
        // 머리 · 귀 · 코 · 상아
        p.ellipse(28, -58, 20, 30, shade(fur, 0.8));
        p.circle(40, -60, 24, fur);
        p.thin(30, -76, 36, -68, furD, 2).thin(40, -80, 44, -70, furD, 2);
        p.line(54, -52, 62, -28, fur, 12);
        p.line(62, -28, 56, -10, fur, 10);
        p.line(56, -10, 50, -8, fur, 8);
        for (let i = 0; i < 5; i++) p.thin(55 + i * 1.4, -46 + i * 7, 63 + i * 0.6, -44 + i * 7, furD, 1.4);
        p.ellipse(49, -65, 7, 8, 0xffffff, false);
        p.glow(50, -65, 2.4, OUT, 1);
        p.thin(45, -71, 53, -70, OUT, 1.6);
        p.arc(52, -36, 18, -0.3, 1.7, 0xf4eedc, 6);
        p.arc(52, -36, 18, -0.2, 0.6, 0xffffff, 2, false);
        riderOn(p, era, pal, side, def, -10, -88);
      });
      const leg = makeTexture(scene, `${base}_leg`, 30, 42, 13, 4, (p) => {
        p.poly([-9, -2, 9, -2, 10, 20, 8, 26, 4, 22, 0, 27, -4, 22, -8, 26, -10, 20], fur);
        p.thin(-5, 2, -3, 14, furD, 2).thin(3, 4, 5, 16, furD, 2);
        p.rect(-9, 25, 19, 8, 0x4a2c18, 3);
        for (let i = 0; i < 3; i++) p.rect(-7 + i * 6, 29, 4, 4, 0xe8dcc0, 1, false);
      });
      return {
        body,
        legs: [
          { key: leg, x: -26, y: -30, far: true, phase: Math.PI },
          { key: leg, x: 24, y: -30, far: true, phase: 0 },
          { key: leg, x: -32, y: -30, far: false, phase: 0 },
          { key: leg, x: 18, y: -30, far: false, phase: Math.PI },
        ],
        weapon: wpn, weaponX: -6, weaponY: -108, attack: 'swing', height: 144, stride: 0.35,
      };
    }
    case 'chariot': {
      const horse = 0x8a5a33;
      const mane = 0x2a1a10;
      const body = makeTexture(scene, `${base}_body`, 170, 140, 74, 132, (p) => {
        // 멍에 막대
        p.line(-6, -38, 20, -46, WOOD, 4);
        // 말: 꼬리, 몸, 목, 머리, 갈기, 굴레, 깃털 장식
        p.poly([8, -52, -2, -44, 0, -30, 6, -42], mane);
        p.ellipse(34, -50, 58, 28, horse);
        p.poly([22, -58, 38, -64, 44, -52, 32, -46], 0xffffff, false, 0.1);
        p.poly([48, -58, 56, -82, 70, -82, 76, -74, 72, -66, 62, -62, 58, -46], horse);
        p.poly([48, -58, 50, -80, 56, -88, 58, -80, 54, -60], mane);
        p.ellipse(66, -75, 5, 5, 0xffffff, false);
        p.glow(67, -75, 1.6, OUT, 1);
        p.glow(74, -70, 1.3, OUT, 1);
        p.thin(56, -80, 74, -68, 0x5a3a1c, 2).thin(62, -66, 58, -52, 0x5a3a1c, 2);
        p.poly([58, -84, 54, -100, 62, -96, 62, -84], team.main);
        p.rect(20, -62, 20, 9, team.main, 2);
        p.thin(20, -58, 40, -58, GOLD, 1.5);
        // 수레: 청동 장식, 방패 문양
        p.poly([-44, -60, 2, -60, 4, -34, -40, -30], WOOD);
        p.rect(-44, -62, 48, 6, GOLD, 2);
        p.rect(-36, -54, 18, 18, team.main, 4);
        p.circle(-27, -45, 5, GOLD);
        p.thin(-42, -50, 0, -52, shade(WOOD, 0.6), 1.5);
        riderOn(p, era, pal, side, def, -18, -58);
      });
      const leg = makeTexture(scene, `${base}_leg`, 18, 42, 8, 4, (p) => {
        p.rect(-4, -2, 8, 22, horse, 3);
        p.rect(-3.5, 18, 7, 12, shade(horse, 0.9), 2);
        hoof(p, 0, 28, mane);
      });
      const wheel = makeTexture(scene, `${base}_wheel`, 48, 48, 24, 24, (p) => {
        p.circle(0, 0, 20, WOOD);
        p.arc(0, 0, 18.5, 0, Math.PI * 2, GOLD, 2, false);
        p.circle(0, 0, 13, shade(WOOD, 0.7));
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 6;
          p.thin(Math.cos(a) * -17, Math.sin(a) * -17, Math.cos(a) * 17, Math.sin(a) * 17, 0x3a2410, 3);
        }
        p.circle(0, 0, 5, GOLD);
        p.glow(-1, -1, 1.5, 0xffffff, 0.8);
      });
      return {
        body,
        legs: [
          { key: leg, x: 22, y: -36, far: true, phase: Math.PI },
          { key: leg, x: 46, y: -36, far: true, phase: 0 },
          { key: leg, x: 18, y: -36, far: false, phase: 0 },
          { key: leg, x: 42, y: -36, far: false, phase: Math.PI },
          { key: wheel, x: -20, y: -18, far: false, phase: 0, wheel: true },
        ],
        weapon: wpn, weaponX: -16, weaponY: -78, attack: 'thrust', height: 124, stride: 0.55,
      };
    }
    case 'horse': {
      const horse = 0xd8d0c0;
      const body = makeTexture(scene, `${base}_body`, 160, 150, 74, 140, (p) => {
        // 꼬리
        p.poly([-32, -56, -46, -50, -50, -30, -40, -38], 0x8a7a64);
        p.ellipse(0, -50, 72, 34, horse);
        // 목 + 머리(샹프론 판금) + 갈기 + 깃털
        p.poly([22, -58, 32, -88, 48, -86, 52, -74, 36, -62, 30, -44], horse);
        p.poly([24, -60, 26, -84, 32, -92, 32, -80, 28, -62], 0x8a7a64);
        p.poly([34, -88, 48, -87, 52, -75, 42, -76], pal.metal);
        p.thin(36, -86, 48, -82, 0xffffff, 1.2, 0.6);
        p.ellipse(42, -80, 5, 5, 0xffffff, false);
        p.glow(43, -80, 1.6, OUT, 1);
        p.poly([34, -90, 30, -104, 38, -100, 38, -90], team.main);
        p.thin(40, -74, 20, -66, 0x5a3a1c, 1.6);
        // 마갑(진영색 + 금테 + 문장)
        p.poly([-36, -64, 28, -64, 30, -40, 20, -32, 10, -40, 0, -32, -10, -40, -20, -32, -30, -40, -38, -34], team.main);
        p.thin(-36, -62, 28, -62, GOLD, 3);
        p.poly([-2, -58, 6, -58, 6, -48, 2, -44, -2, -48], GOLD);
        p.poly([-34, -60, -20, -60, -24, -40, -34, -40], 0xffffff, false, 0.12);
        p.poly([10, -60, 28, -60, 28, -42, 12, -40], 0x000000, false, 0.14);
        riderOn(p, era, pal, side, def, -4, -64);
      });
      const leg = makeTexture(scene, `${base}_leg`, 18, 44, 8, 4, (p) => {
        p.rect(-4, -2, 8, 30, horse, 3);
        p.poly([-5, 22, 5, 22, 6, 29, -6, 29], 0xefe8dc, false);
        hoof(p, 0, 28, 0x3a3a42);
      });
      return {
        body,
        legs: [
          { key: leg, x: -18, y: -40, far: true, phase: 0 },
          { key: leg, x: 22, y: -40, far: true, phase: Math.PI },
          { key: leg, x: -24, y: -40, far: false, phase: Math.PI },
          { key: leg, x: 16, y: -40, far: false, phase: 0 },
        ],
        weapon: wpn, weaponX: 2, weaponY: -84, attack: 'thrust', height: 132, stride: 0.55,
      };
    }
    case 'cannonCart': {
      const body = makeTexture(scene, `${base}_body`, 160, 120, 86, 110, (p) => {
        // 포가(꼬리), 쇠장식, 탄약상자, 포탄 더미, 포수
        p.poly([-50, -4, -44, -14, 10, -36, 16, -28, -42, 0], WOOD);
        p.thin(-40, -10, 8, -30, shade(WOOD, 0.6), 1.5);
        for (const bx of [-30, -12]) p.rect(bx, -24 + (bx + 30) * -0.4, 4, 8, 0x3a3a42, 1, false);
        p.rect(-8, -42, 28, 16, shade(WOOD, 0.85), 3);
        p.rect(-8, -42, 28, 4, 0x3a3a42, 1, false);
        for (const [cx, cy] of [[-56, -4], [-48, -4], [-52, -11]]) p.circle(cx, cy, 4.5, 0x2a2a30);
        drawBackArm(p, era, pal, side, -40, 0);
        drawTorso(p, era, pal, side, -40, 0);
        drawHead(p, era, pal, side, def.head, -39, -55);
        p.line(-34, -38, -20, -34, TEAM[side].main, 6);
        p.circle(-18, -34, 4, handColor(era, pal));
        p.line(-18, -34, -8, -60, WOOD, 3);
        p.rect(-11, -66, 6, 8, 0x3a3a42, 2);
      });
      const wheel = makeTexture(scene, `${base}_wheel`, 52, 52, 26, 26, (p) => {
        p.circle(0, 0, 21, 0x5a3a1c);
        p.arc(0, 0, 20, 0, Math.PI * 2, 0x3a3a42, 3, false);
        p.circle(0, 0, 14, shade(WOOD, 0.8));
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 6;
          p.thin(Math.cos(a) * -19, Math.sin(a) * -19, Math.cos(a) * 19, Math.sin(a) * 19, 0x2a1a0c, 3);
        }
        p.circle(0, 0, 5.5, 0x3a3a42);
        p.glow(-1.5, -1.5, 1.6, 0xffffff, 0.7);
      });
      const leg = legTexture(scene, `${base}_leg`, era, pal, side);
      return {
        body,
        legs: [
          { key: leg, x: -42, y: -22, far: true, phase: Math.PI },
          { key: leg, x: -38, y: -22, far: false, phase: 0 },
          { key: wheel, x: 2, y: -20, far: false, phase: 0, wheel: true },
        ],
        weapon: wpn, weaponX: 4, weaponY: -44, attack: 'recoil', height: 92, stride: 0.45,
      };
    }
    case 'mech':
    default: {
      const hull = 0x8a94ab;
      const body = makeTexture(scene, `${base}_body`, 140, 150, 70, 142, (p) => {
        // 허리 관절, 백팩 추진기, 동체, 조종석, 미사일 포드, 경고 줄무늬
        p.rect(-9, -74, 18, 16, 0x2c303c, 3);
        p.rect(-40, -116, 14, 34, 0x5a6278, 4);
        p.rect(-42, -86, 18, 6, 0x3a3f4f, 2);
        p.glow(-33, -78, 5, team.light, 0.5);
        p.poly([-30, -120, 24, -120, 30, -108, 28, -74, -28, -74, -32, -90], hull);
        p.thin(-30, -96, 28, -96, shade(hull, 0.7), 1.6);
        p.thin(0, -96, 0, -74, shade(hull, 0.7), 1.6);
        for (const [bx, by] of [[-26, -116], [20, -116], [-24, -78], [24, -78]]) p.glow(bx, by, 1.4, shade(hull, 0.55), 1);
        p.poly([-24, -118, 4, -118, 0, -100, -24, -100], 0xffffff, false, 0.14);
        p.rect(-22, -114, 28, 16, OUT, 6);
        p.rect(-20, -112, 24, 12, team.light, 5, false);
        p.glow(-8, -106, 12, team.light, 0.2);
        p.circle(-10, -106, 4, 0x2c303c, false);
        p.poly([-16, -111, -10, -111, -18, -102, -20, -104], 0xffffff, false, 0.5);
        p.rect(-40, -132, 22, 16, 0x5a6278, 4);
        for (let i = 0; i < 3; i++) p.circle(-34 + i * 7, -124, 2.4, OUT, false);
        for (let i = 0; i < 5; i++) p.poly([-26 + i * 11, -84, -20 + i * 11, -84, -24 + i * 11, -78, -30 + i * 11, -78], i % 2 ? 0xf2c230 : team.main, false);
        p.line(18, -120, 22, -134, 0x5a6278, 2);
        p.glow(22, -135, 2.4, team.light, 1);
        p.poly([10, -116, 28, -116, 28, -78, 12, -78], 0x000000, false, 0.14);
      });
      const leg = makeTexture(scene, `${base}_leg`, 40, 80, 16, 6, (p) => {
        p.rect(-9, -4, 18, 30, hull, 5);
        p.thin(-5, 0, -5, 22, 0xffffff, 1.5, 0.3);
        p.line(6, 4, 6, 44, 0x9aa6bd, 3);
        p.circle(0, 28, 8.5, 0x3a3f4f);
        p.circle(0, 28, 3, TEAM[side].light, false);
        p.rect(-7, 28, 14, 28, 0x7a849c, 4);
        p.rect(-8, 30, 16, 6, 0x5a6278, 2);
        p.poly([-12, 54, 14, 54, 20, 62, 20, 64, -12, 64], 0x2c303c);
        p.poly([14, 58, 22, 62, 14, 64], 0x5a6278, false);
      });
      return {
        body,
        legs: [
          { key: leg, x: -8, y: -66, far: true, phase: Math.PI },
          { key: leg, x: 8, y: -66, far: false, phase: 0 },
        ],
        weapon: wpn, weaponX: 22, weaponY: -96, attack: 'recoil', height: 144, stride: 0.35,
      };
    }
  }
}

const rigCache = new Map<string, RigSpec>();

/** (시대, 유형, 진영) 텍스처를 준비하고 조립 사양을 반환 */
export function ensureUnitRig(scene: Phaser.Scene, era: number, role: UnitRole, side: number): RigSpec {
  const base = `u${era}_${role}_${side}`;
  const cached = rigCache.get(base);
  if (cached && scene.textures.exists(cached.body)) return cached;
  const def = ERAS[era].units[role];
  const pal = ERAS[era].palette;
  const rig = def.mount === 'none' ? bipedRig(scene, base, def, era, pal, side) : heavyRig(scene, base, def, era, pal, side);
  rigCache.set(base, rig);
  return rig;
}

/** UI 아이콘(플레이어 색) 생성 */
export function ensureUnitIcon(scene: Phaser.Scene, era: number, role: UnitRole): string {
  const key = `icon_unit_${era}_${role}`;
  if (scene.textures.exists(key)) return key;
  const rig = ensureUnitRig(scene, era, role, 0);
  const c = scene.make.container({}, false);
  for (const l of rig.legs) {
    const img = applyOrigin(scene.make.image({ key: l.key }, false)).setPosition(l.x, l.y);
    if (l.far) img.setTint(0x9a9aa8);
    c.add(img);
  }
  c.add(applyOrigin(scene.make.image({ key: rig.body }, false)));
  c.add(applyOrigin(scene.make.image({ key: rig.weapon }, false)).setPosition(rig.weaponX, rig.weaponY));
  const size = 96;
  const scale = Math.min(1, 84 / (rig.height + 10));
  c.setScale(scale).setPosition(size / 2 - 4, size - 6);
  const rt = scene.make.renderTexture({ width: size, height: size }, false);
  rt.draw(c);
  rt.saveTexture(key);
  c.destroy(true);
  return key;
}

// ───────────────────────── 뷰 ─────────────────────────

/** 필드 유닛 1기의 표시 객체. 걷기/공격/피격/사망 트윈을 담당 */
export class UnitView {
  readonly root: Phaser.GameObjects.Container;
  private readonly rig: Phaser.GameObjects.Container;
  private readonly spec: RigSpec;
  private readonly legs: { img: Phaser.GameObjects.Image; spec: LegSpec }[] = [];
  private readonly weapon: Phaser.GameObjects.Image;
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly walkTween: Phaser.Tweens.Tween;
  /** 걷기 위상(트윈으로 0→2π 반복) */
  walkPhase = 0;
  private attackTween: Phaser.Tweens.Tween | null = null;
  dying = false;
  readonly yOffset: number;

  constructor(private readonly scene: Phaser.Scene, readonly unit: Unit, groundY: number) {
    this.spec = ensureUnitRig(scene, unit.era, unit.role, unit.side);
    this.yOffset = (unit.id % 4) * 3;
    const y = groundY + this.yOffset;
    this.shadow = scene.add.ellipse(unit.x, y + 2, unit.width * 1.3, 10, 0x000000, 0.25);
    this.rig = scene.add.container(0, 0);
    this.root = scene.add.container(unit.x, y, [this.rig]);
    this.root.setScale(unit.dir, 1);

    const far = this.spec.legs.filter((l) => l.far);
    const near = this.spec.legs.filter((l) => !l.far);
    for (const l of far) this.addLeg(l);
    const body = applyOrigin(scene.add.image(0, 0, this.spec.body));
    this.rig.add(body);
    this.images.push(body);
    for (const l of near) this.addLeg(l);
    this.weapon = applyOrigin(scene.add.image(this.spec.weaponX, this.spec.weaponY, this.spec.weapon));
    this.rig.add(this.weapon);
    this.images.push(this.weapon);

    const depth = y + (unit.role === 'heavy' ? 0 : 0.5);
    this.root.setDepth(depth);
    this.shadow.setDepth(depth - 20);

    this.walkTween = scene.tweens.add({
      targets: this,
      walkPhase: Math.PI * 2,
      duration: 700 * (40 / unit.stats.speed),
      repeat: -1,
      paused: true,
    });

    // 스폰 연출
    this.rig.setScale(0.6).setAlpha(0);
    scene.tweens.add({ targets: this.rig, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
  }

  private addLeg(l: LegSpec): void {
    const img = applyOrigin(this.scene.add.image(l.x, l.y, l.key));
    if (l.far) img.setTint(0x9a9aa8);
    this.rig.add(img);
    this.images.push(img);
    this.legs.push({ img, spec: l });
  }

  get headY(): number {
    return this.root.y - this.spec.height;
  }

  /** 투사체 발사 위치(월드) */
  get muzzle(): { x: number; y: number } {
    return { x: this.root.x + this.unit.dir * (this.spec.weaponX + 30), y: this.root.y + this.spec.weaponY + 4 };
  }

  update(): void {
    if (this.dying) return;
    const u = this.unit;
    this.root.x = u.x;
    this.shadow.x = u.x;
    const walking = u.state === 'walk';
    if (walking && this.walkTween.isPaused()) this.walkTween.resume();
    else if (!walking && !this.walkTween.isPaused()) this.walkTween.pause();

    const ph = this.walkPhase;
    const amp = walking ? this.spec.stride : 0;
    for (const { img, spec } of this.legs) {
      if (spec.wheel) img.rotation = ph * 2;
      else img.rotation = Math.sin(ph + spec.phase) * amp;
    }
    this.rig.y = walking ? -Math.abs(Math.sin(ph)) * 2.5 : 0;
  }

  attack(): void {
    if (this.dying) return;
    this.attackTween?.stop();
    this.weapon.setRotation(0).setX(this.spec.weaponX);
    const w = this.weapon;
    const x0 = this.spec.weaponX;
    switch (this.spec.attack) {
      case 'swing':
        this.attackTween = this.scene.tweens.chain({
          targets: w,
          tweens: [
            { rotation: -1.1, duration: 110, ease: 'Quad.Out' },
            { rotation: 0.7, duration: 90, ease: 'Quad.In' },
            { rotation: 0, duration: 160, ease: 'Quad.Out' },
          ],
        }) as unknown as Phaser.Tweens.Tween;
        break;
      case 'thrust':
        this.attackTween = this.scene.tweens.chain({
          targets: w,
          tweens: [
            { x: x0 - 6, duration: 100, ease: 'Quad.Out' },
            { x: x0 + 14, duration: 70, ease: 'Quad.In' },
            { x: x0, duration: 180, ease: 'Quad.Out' },
          ],
        }) as unknown as Phaser.Tweens.Tween;
        break;
      case 'throw':
        this.attackTween = this.scene.tweens.chain({
          targets: w,
          tweens: [
            { rotation: -2.4, duration: 150, ease: 'Sine.InOut' },
            { rotation: 0.4, duration: 90 },
            { rotation: 0, duration: 140 },
          ],
        }) as unknown as Phaser.Tweens.Tween;
        break;
      case 'recoil':
        this.attackTween = this.scene.tweens.chain({
          targets: w,
          tweens: [
            { x: x0 - 7, rotation: -0.18, duration: 60, ease: 'Quad.Out' },
            { x: x0, rotation: 0, duration: 220, ease: 'Quad.InOut' },
          ],
        }) as unknown as Phaser.Tweens.Tween;
        break;
    }
    if (this.unit.role === 'heavy') {
      this.scene.tweens.add({ targets: this.rig, x: 6, duration: 90, yoyo: true, ease: 'Quad.Out' });
    }
  }

  /** 피격 흰색 플래시 */
  flash(): void {
    if (this.dying) return;
    for (const img of this.images) img.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (this.dying) return;
      for (const { img, spec } of this.legs) {
        if (spec.far) img.setTint(0x9a9aa8);
        else img.clearTint();
      }
      for (const img of this.images) if (!this.legs.some((l) => l.img === img)) img.clearTint();
    });
  }

  /** 사망: 뒤로 쓰러지며 페이드 */
  die(onDone: () => void): void {
    if (this.dying) return;
    this.dying = true;
    this.walkTween.stop();
    this.attackTween?.stop();
    for (const img of this.images) img.clearTint();
    this.scene.tweens.add({
      targets: this.rig,
      rotation: -1.45,
      x: -10,
      duration: 380,
      ease: 'Quad.In',
    });
    this.scene.tweens.add({
      targets: [this.root, this.shadow],
      alpha: 0,
      delay: 420,
      duration: 450,
      onComplete: () => {
        this.destroy();
        onDone();
      },
    });
  }

  destroy(): void {
    this.walkTween.remove();
    this.root.destroy(true);
    this.shadow.destroy();
  }
}
