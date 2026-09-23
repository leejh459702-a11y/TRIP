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

const BOOT = 0x3a2a1e;
const WOOD = 0x8a5a2b;

// ───────────────────────── 공통 파츠 ─────────────────────────

function torsoColor(era: number, pal: EraPalette, side: number): number {
  // 중세 이후에는 진영색 군복/서코트
  return era >= 2 ? TEAM[side].main : pal.cloth;
}

function drawHead(p: Pen, era: number, pal: EraPalette, side: number, look: HeadLook, x: number, y: number, beard = false): void {
  const team = TEAM[side];
  p.circle(x, y, 9, pal.skin);
  if (look !== 'visor' && look !== 'greatHelm') p.glow(x + 5, y - 1, 1.8, 0x1a1a24, 1);
  switch (look) {
    case 'hair':
      p.poly([x - 10, y - 1, x - 9, y - 9, x - 3, y - 12, x + 4, y - 12, x + 9, y - 7, x + 5, y - 7, x + 1, y - 5, x - 4, y - 4], 0x3b2413);
      if (beard) p.poly([x + 1, y + 3, x + 9, y + 2, x + 6, y + 10, x + 1, y + 9], 0x3b2413);
      break;
    case 'helmet':
      p.poly([x - 10, y + 1, x - 10, y - 5, x - 5, y - 11, x + 4, y - 11, x + 9, y - 6, x + 9, y - 2, x + 2, y - 3, x - 4, y + 1], pal.metal);
      p.poly([x - 6, y - 10, x - 2, y - 19, x + 6, y - 17, x + 3, y - 10], era === 1 ? team.main : shade(pal.metal, 0.8));
      break;
    case 'greatHelm':
      p.rect(x - 9, y - 11, 18, 21, pal.metal, 3);
      p.rect(x - 1, y - 3, 10, 3, 0x1a1a24, 0, false);
      p.poly([x - 3, y - 11, x - 1, y - 20, x + 5, y - 17, x + 3, y - 11], team.main);
      break;
    case 'tricorn':
      p.poly([x - 14, y - 5, x - 4, y - 16, x + 4, y - 16, x + 14, y - 5, x, y - 9], 0x22222a);
      p.glow(x + 6, y - 9, 3, team.main, 1);
      break;
    case 'visor':
      p.rect(x - 10, y - 11, 20, 21, 0x8a94ab, 6);
      p.rect(x - 2, y - 5, 12, 5, team.light, 2, false);
      p.glow(x + 4, y - 3, 7, team.light, 0.25);
      break;
  }
}

function drawTorso(p: Pen, era: number, pal: EraPalette, side: number, x = 0, y = 0): void {
  const team = TEAM[side];
  const c = torsoColor(era, pal, side);
  p.rect(x - 9, y - 46, 18, 26, c, 5);
  switch (era) {
    case 0:
      p.glow(x - 3, y - 38, 2.5, shade(c, 0.7), 1).glow(x + 4, y - 30, 2, shade(c, 0.7), 1);
      p.thin(x - 8, y - 44, x + 8, y - 24, team.main, 4);
      break;
    case 1:
      p.rect(x - 8, y - 45, 16, 12, pal.metal, 3);
      p.rect(x - 9, y - 26, 18, 6, team.main, 2);
      break;
    case 2:
      p.rect(x - 9, y - 30, 18, 4, shade(c, 0.6), 0, false);
      p.poly([x - 3, y - 42, x + 3, y - 42, x + 3, y - 36, x, y - 33, x - 3, y - 36], 0xf2d24a);
      break;
    case 3:
      p.thin(x - 8, y - 45, x + 8, y - 24, 0xf2f2f2, 3).thin(x + 8, y - 45, x - 8, y - 24, 0xf2f2f2, 3);
      p.rect(x - 9, y - 26, 18, 4, 0x2a2a2a, 0, false);
      break;
    case 4:
      p.rect(x - 9, y - 46, 18, 26, 0x7a849c, 5);
      p.thin(x - 6, y - 40, x + 6, y - 40, team.light, 3).thin(x, y - 40, x, y - 26, team.light, 2);
      break;
  }
}

function legTexture(scene: Phaser.Scene, key: string, era: number, pal: EraPalette, side: number): string {
  return makeTexture(scene, key, 20, 34, 9, 5, (p) => {
    const pants = era === 0 ? pal.skin : era === 4 ? 0x5a6278 : era >= 2 ? shade(TEAM[side].dark, 1) : pal.clothDark;
    p.rect(-4, -3, 9, 19, pants, 3);
    if (era === 0) p.rect(-4, 4, 9, 5, pal.cloth, 2);
    p.rect(-4, 13, 12, 8, era === 4 ? 0x9aa6bd : BOOT, 3);
  });
}

// ───────────────────────── 무기 ─────────────────────────

function weaponTexture(scene: Phaser.Scene, key: string, def: UnitDef, era: number, pal: EraPalette, side: number): string {
  const team = TEAM[side];
  const sleeve = era === 0 ? pal.skin : era === 4 ? 0x7a849c : torsoColor(era, pal, side);
  return makeTexture(scene, key, 130, 110, 50, 60, (p) => {
    const armDown = () => {
      p.line(0, 0, 6, 14, sleeve, 7);
      p.circle(8, 17, 4.5, pal.skin);
    };
    const armFwd = () => {
      p.line(0, 0, 12, 5, sleeve, 7);
      p.circle(14, 6, 4.5, pal.skin);
    };
    switch (def.weapon) {
      case 'club':
        p.line(8, 18, 20, -8, WOOD, 6);
        p.circle(22, -12, 7, shade(WOOD, 0.9));
        armDown();
        break;
      case 'spear':
        p.circle(-2, 8, 11, team.main).circle(-2, 8, 4, pal.metal);
        p.line(-8, 22, 40, 2, WOOD, 4);
        p.poly([40, -3, 52, 1, 40, 7], pal.metal);
        armDown();
        break;
      case 'sword':
        p.line(8, 18, 24, -12, 0xdde3ea, 5);
        p.line(3, 12, 13, 20, 0xc9a14a, 3);
        p.circle(6, 22, 3, 0xc9a14a);
        armDown();
        break;
      case 'musket':
        p.line(-10, 12, 34, 6, WOOD, 6);
        p.line(6, 8, 40, 4, 0x4a4a52, 3);
        p.line(40, 4, 54, 2, 0xdde3ea, 2);
        armFwd();
        break;
      case 'plasmaBlade':
        p.glow(20, -4, 14, team.light, 0.25);
        p.line(6, 16, 10, 10, 0x555a66, 5);
        p.line(10, 10, 26, -18, team.light, 6);
        p.thin(10, 10, 26, -18, 0xffffff, 2);
        armDown();
        break;
      case 'sling':
        armFwd();
        p.thin(14, 6, 6, -16, 0x6b4a2a, 2);
        p.circle(5, -18, 4, 0x9a8f80);
        break;
      case 'bow':
        p.arc(12, 6, 20, -1.25, 1.25, WOOD, 4);
        p.thin(18.3, -12.9, 18.3, 24.9, 0xf2f2f2, 1.5);
        armFwd();
        p.line(4, 6, 32, 6, 0xd9c9a0, 2, false);
        break;
      case 'crossbow':
        p.line(0, 7, 30, 5, WOOD, 6);
        p.line(26, -8, 26, 18, 0x6b7280, 3);
        armFwd();
        break;
      case 'rifle':
        p.line(-10, 10, 38, 4, WOOD, 6);
        p.line(10, 6, 50, 2, 0x3a3a42, 3);
        p.rect(14, -3, 14, 5, 0x22222a, 2);
        armFwd();
        break;
      case 'laserRifle':
        p.rect(-4, 0, 44, 10, 0x3a3f4f, 4);
        p.rect(4, 3, 26, 3, team.light, 1, false);
        p.rect(38, 2, 10, 6, 0x23262f, 2);
        p.glow(49, 5, 5, team.light, 0.6);
        armFwd();
        break;
      // 중장 탈것 무기
      case 'tusk': // 매머드 기수: 뼈 몽둥이
        p.line(8, 18, 22, -10, 0xefe6d0, 6);
        p.circle(24, -14, 7, 0xefe6d0);
        armDown();
        break;
      case 'chariot':
        p.line(-14, 20, 44, -2, WOOD, 4);
        p.poly([44, -7, 56, -3, 44, 3], pal.metal);
        armDown();
        break;
      case 'lance':
        p.line(-16, 6, 74, -2, team.main, 7);
        p.thin(4, 5, 30, 3, 0xffffff, 3);
        p.thin(40, 2, 60, 0, 0xffffff, 3);
        p.poly([-2, -6, 10, 2, -2, 14], pal.metal);
        armFwd();
        break;
      case 'cannon':
        p.rect(-18, -9, 60, 18, 0x3a3a42, 7);
        p.rect(36, -11, 8, 22, 0x2a2a30, 3);
        p.rect(-6, -10, 5, 20, 0xc9a14a, 1);
        p.rect(18, -10, 5, 20, 0xc9a14a, 1);
        break;
      case 'mechGun':
        p.rect(-8, -8, 22, 18, 0x5a6278, 5);
        p.rect(10, -5, 44, 12, 0x3a3f4f, 4);
        p.rect(18, -2, 26, 3, team.light, 1, false);
        p.glow(55, 1, 7, team.light, 0.6);
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
  const body = makeTexture(scene, `${base}_body`, 70, 90, 35, 84, (p) => {
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
    height: 70,
    stride: 0.5,
  };
}

function riderOn(p: Pen, era: number, pal: EraPalette, side: number, def: UnitDef, x: number, y: number): void {
  // 허리 위 기수 (y = 허리)
  const c = era === 4 ? 0x7a849c : torsoColor(era, pal, side);
  p.rect(x - 8, y - 22, 16, 22, c, 5);
  if (era === 3) p.thin(x - 7, y - 21, x + 7, y - 2, 0xf2f2f2, 3);
  drawHead(p, era, pal, side, def.head, x + 1, y - 30);
}

function heavyRig(scene: Phaser.Scene, base: string, def: UnitDef, era: number, pal: EraPalette, side: number): RigSpec {
  const team = TEAM[side];
  const wpn = weaponTexture(scene, `${base}_wpn`, def, era, pal, side);
  switch (def.mount) {
    case 'mammoth': {
      const fur = 0x7a4a2a;
      const body = makeTexture(scene, `${base}_body`, 150, 140, 75, 132, (p) => {
        p.ellipse(-6, -52, 92, 62, fur);
        p.thin(-40, -60, -34, -48, shade(fur, 0.7), 3).thin(-24, -72, -18, -60, shade(fur, 0.7), 3).thin(-8, -40, -2, -30, shade(fur, 0.7), 3);
        p.rect(-30, -90, 40, 14, team.main, 4);
        p.line(46, -52, 56, -26, fur, 11);
        p.line(56, -26, 50, -10, fur, 9);
        p.circle(36, -58, 23, fur);
        p.ellipse(26, -58, 18, 28, shade(fur, 0.8));
        p.glow(44, -64, 2.5, 0x1a1a24, 1);
        p.arc(46, -34, 16, -0.2, 1.6, 0xf4eedc, 5);
        riderOn(p, era, pal, side, def, -10, -86);
      });
      const leg = makeTexture(scene, `${base}_leg`, 26, 40, 11, 4, (p) => {
        p.rect(-8, -2, 16, 30, fur, 5);
        p.rect(-8, 24, 17, 8, 0x4a2c18, 3);
      });
      return {
        body,
        legs: [
          { key: leg, x: -26, y: -30, far: true, phase: Math.PI },
          { key: leg, x: 24, y: -30, far: true, phase: 0 },
          { key: leg, x: -32, y: -30, far: false, phase: 0 },
          { key: leg, x: 18, y: -30, far: false, phase: Math.PI },
        ],
        weapon: wpn, weaponX: -6, weaponY: -112, attack: 'swing', height: 140, stride: 0.35,
      };
    }
    case 'chariot': {
      const horse = 0x8a5a33;
      const body = makeTexture(scene, `${base}_body`, 160, 130, 70, 122, (p) => {
        p.line(-6, -38, 20, -44, WOOD, 4);
        p.ellipse(34, -50, 54, 26, horse);
        p.poly([48, -56, 58, -80, 70, -78, 72, -70, 60, -60, 56, -46], horse);
        p.poly([52, -64, 56, -82, 62, -82, 56, -64], 0x2a1a10, false);
        p.glow(64, -75, 2, 0x1a1a24, 1);
        p.rect(24, -60, 16, 8, team.main, 2);
        p.rect(-40, -58, 40, 26, WOOD, 4);
        p.rect(-34, -54, 14, 18, team.main, 3);
        riderOn(p, era, pal, side, def, -18, -58);
      });
      const leg = makeTexture(scene, `${base}_leg`, 16, 40, 7, 4, (p) => {
        p.rect(-4, -2, 8, 30, horse, 3);
        p.rect(-4, 26, 9, 6, 0x2a1a10, 2);
      });
      const wheel = makeTexture(scene, `${base}_wheel`, 44, 44, 22, 22, (p) => {
        p.circle(0, 0, 18, WOOD);
        p.circle(0, 0, 12, shade(WOOD, 0.75));
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 4;
          p.thin(Math.cos(a) * -16, Math.sin(a) * -16, Math.cos(a) * 16, Math.sin(a) * 16, 0x3a2410, 3);
        }
        p.circle(0, 0, 4, pal.metal);
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
        weapon: wpn, weaponX: -16, weaponY: -74, attack: 'thrust', height: 120, stride: 0.55,
      };
    }
    case 'horse': {
      const horse = 0xd8d0c0;
      const body = makeTexture(scene, `${base}_body`, 150, 140, 70, 132, (p) => {
        p.ellipse(0, -50, 70, 32, horse);
        p.poly([22, -58, 32, -86, 46, -84, 48, -74, 34, -62, 30, -46], horse);
        p.glow(40, -80, 2, 0x1a1a24, 1);
        p.poly([-34, -62, 26, -62, 28, -40, 16, -34, 4, -40, -8, -34, -20, -40, -34, -34], team.main);
        p.thin(-32, -58, 26, -58, 0xf2d24a, 3);
        p.poly([-34, -54, -46, -40, -40, -38, -32, -48], 0xb8b0a0);
        riderOn(p, era, pal, side, def, -4, -64);
      });
      const leg = makeTexture(scene, `${base}_leg`, 16, 42, 7, 4, (p) => {
        p.rect(-4, -2, 8, 32, horse, 3);
        p.rect(-4, 28, 9, 6, 0x3a3a42, 2);
      });
      return {
        body,
        legs: [
          { key: leg, x: -18, y: -40, far: true, phase: 0 },
          { key: leg, x: 22, y: -40, far: true, phase: Math.PI },
          { key: leg, x: -24, y: -40, far: false, phase: Math.PI },
          { key: leg, x: 16, y: -40, far: false, phase: 0 },
        ],
        weapon: wpn, weaponX: 2, weaponY: -80, attack: 'thrust', height: 128, stride: 0.55,
      };
    }
    case 'cannonCart': {
      const body = makeTexture(scene, `${base}_body`, 150, 110, 80, 102, (p) => {
        p.poly([-46, -4, -40, -12, 10, -34, 16, -26, -38, 0], WOOD);
        p.rect(-8, -40, 26, 14, shade(WOOD, 0.85), 3);
        drawTorso(p, era, pal, side, -40, 0);
        drawHead(p, era, pal, side, def.head, -39, -55);
        p.line(-34, -38, -20, -34, TEAM[side].main, 6);
        p.circle(-18, -34, 4, pal.skin);
      });
      const wheel = makeTexture(scene, `${base}_wheel`, 48, 48, 24, 24, (p) => {
        p.circle(0, 0, 20, 0x5a3a1c);
        p.circle(0, 0, 14, shade(WOOD, 0.8));
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 6;
          p.thin(Math.cos(a) * -18, Math.sin(a) * -18, Math.cos(a) * 18, Math.sin(a) * 18, 0x2a1a0c, 3);
        }
        p.circle(0, 0, 5, 0x3a3a42);
      });
      const leg = legTexture(scene, `${base}_leg`, era, pal, side);
      return {
        body,
        legs: [
          { key: leg, x: -42, y: -22, far: true, phase: Math.PI },
          { key: leg, x: -38, y: -22, far: false, phase: 0 },
          { key: wheel, x: 2, y: -20, far: false, phase: 0, wheel: true },
        ],
        weapon: wpn, weaponX: 4, weaponY: -44, attack: 'recoil', height: 90, stride: 0.45,
      };
    }
    case 'mech':
    default: {
      const body = makeTexture(scene, `${base}_body`, 130, 140, 65, 132, (p) => {
        p.rect(-8, -72, 16, 14, 0x2c303c, 3);
        p.rect(-28, -118, 54, 48, 0x8a94ab, 10);
        p.rect(-22, -112, 26, 18, 0x23262f, 5);
        p.rect(-18, -108, 18, 10, team.light, 3, false);
        p.glow(-9, -104, 12, team.light, 0.25);
        p.rect(-36, -122, 18, 20, 0x3a3f4f, 5);
        p.rect(-40, -96, 8, 16, 0x3a3f4f, 3);
        p.rect(-24, -80, 46, 6, team.main, 2);
      });
      const leg = makeTexture(scene, `${base}_leg`, 36, 76, 14, 6, (p) => {
        p.rect(-8, -4, 16, 30, 0x8a94ab, 5);
        p.circle(0, 28, 8, 0x3a3f4f);
        p.rect(-6, 28, 12, 28, 0x7a849c, 4);
        p.rect(-10, 54, 26, 10, 0x2c303c, 4);
      });
      return {
        body,
        legs: [
          { key: leg, x: -8, y: -66, far: true, phase: Math.PI },
          { key: leg, x: 8, y: -66, far: false, phase: 0 },
        ],
        weapon: wpn, weaponX: 22, weaponY: -94, attack: 'recoil', height: 140, stride: 0.35,
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
