/**
 * 시대별 유닛 / 포탑 / 특수기 정의.
 * 스탯은 balance.ts 기준값 × 시대 배율로 계산한다(getUnitStats 등).
 * 여기에는 이름과 외형 키만 둔다.
 */
import { BALANCE, type TurretTier, type UnitBaseStats, type UnitRole } from './balance';

export type WeaponLook =
  | 'club' | 'sling' | 'tusk'
  | 'spear' | 'bow' | 'chariot'
  | 'sword' | 'crossbow' | 'lance'
  | 'musket' | 'rifle' | 'cannon'
  | 'plasmaBlade' | 'laserRifle' | 'mechGun';

export type MountLook = 'none' | 'mammoth' | 'chariot' | 'horse' | 'cannonCart' | 'mech';
export type HeadLook = 'hair' | 'helmet' | 'greatHelm' | 'tricorn' | 'visor';
export type ProjectileLook = 'stone' | 'arrow' | 'bolt' | 'bullet' | 'laser' | 'shell' | 'plasma';
export type SpecialLook = 'meteor' | 'arrowRain' | 'catapult' | 'barrage' | 'orbitalLaser';
export type BaseLook = 'cave' | 'stone' | 'castle' | 'fortress' | 'future';

export interface UnitDef {
  role: UnitRole;
  name: string;
  desc: string;
  weapon: WeaponLook;
  mount: MountLook;
  head: HeadLook;
  projectile?: ProjectileLook;
}

export interface TurretDef {
  tier: TurretTier;
  name: string;
  desc: string;
  projectile: ProjectileLook;
}

export interface EraPalette {
  skin: number;
  cloth: number;
  clothDark: number;
  metal: number;
  wood: number;
  accent: number;
  sky: [number, number];
  far: number;
  mid: number;
  ground: number;
  groundDark: number;
}

export interface EraDef {
  name: string;
  units: Record<UnitRole, UnitDef>;
  turrets: Record<TurretTier, TurretDef>;
  special: { name: string; desc: string; look: SpecialLook };
  base: { name: string; look: BaseLook };
  palette: EraPalette;
}

export const ERAS: EraDef[] = [
  {
    name: '원시 시대',
    units: {
      melee: { role: 'melee', name: '몽둥이꾼', desc: '값싼 근접 보병', weapon: 'club', mount: 'none', head: 'hair' },
      ranged: { role: 'ranged', name: '돌팔매꾼', desc: '아군 뒤에서 돌을 던진다', weapon: 'sling', mount: 'none', head: 'hair', projectile: 'stone' },
      heavy: { role: 'heavy', name: '매머드 기수', desc: '튼튼한 돌격 탈것', weapon: 'tusk', mount: 'mammoth', head: 'hair' },
    },
    turrets: {
      light: { tier: 'light', name: '돌 투척대', desc: '단일 대상 · 저가', projectile: 'stone' },
      medium: { tier: 'medium', name: '가시 발사대', desc: '단일 대상 · 고화력', projectile: 'arrow' },
      heavy: { tier: 'heavy', name: '바위 굴림대', desc: '범위 피해', projectile: 'shell' },
    },
    special: { name: '운석 낙하', desc: '적 진영에 운석을 떨어뜨린다', look: 'meteor' },
    base: { name: '동굴', look: 'cave' },
    palette: {
      skin: 0xe0a877, cloth: 0x8b5a2b, clothDark: 0x5e3b1a, metal: 0x9a8f80, wood: 0x7a4e24, accent: 0x3f8f4f,
      sky: [0xf2b56b, 0xfbe3b0], far: 0xb77a4f, mid: 0x6d8b3a, ground: 0x8f6b3e, groundDark: 0x5f4526,
    },
  },
  {
    name: '고대 시대',
    units: {
      melee: { role: 'melee', name: '창병', desc: '긴 창의 방패 보병', weapon: 'spear', mount: 'none', head: 'helmet' },
      ranged: { role: 'ranged', name: '궁수', desc: '곡사 화살', weapon: 'bow', mount: 'none', head: 'helmet', projectile: 'arrow' },
      heavy: { role: 'heavy', name: '전차병', desc: '말이 끄는 전차', weapon: 'chariot', mount: 'chariot', head: 'helmet' },
    },
    turrets: {
      light: { tier: 'light', name: '투창대', desc: '단일 대상 · 저가', projectile: 'arrow' },
      medium: { tier: 'medium', name: '대형 쇠뇌', desc: '단일 대상 · 고화력', projectile: 'bolt' },
      heavy: { tier: 'heavy', name: '화염 항아리', desc: '범위 피해', projectile: 'shell' },
    },
    special: { name: '화살비', desc: '하늘을 뒤덮는 화살 세례', look: 'arrowRain' },
    base: { name: '석조 신전', look: 'stone' },
    palette: {
      skin: 0xd9a06e, cloth: 0xe8dcc0, clothDark: 0xb0a07a, metal: 0xc9a14a, wood: 0x8a5a2e, accent: 0x2e6fb0,
      sky: [0x7ec4e8, 0xd8f0f7], far: 0xc9b58a, mid: 0x8fa35a, ground: 0xc4a86a, groundDark: 0x8c7442,
    },
  },
  {
    name: '중세 시대',
    units: {
      melee: { role: 'melee', name: '검사', desc: '갑옷 입은 검객', weapon: 'sword', mount: 'none', head: 'greatHelm' },
      ranged: { role: 'ranged', name: '석궁병', desc: '관통력 있는 볼트', weapon: 'crossbow', mount: 'none', head: 'helmet', projectile: 'bolt' },
      heavy: { role: 'heavy', name: '중기병', desc: '랜스 돌격 기사', weapon: 'lance', mount: 'horse', head: 'greatHelm' },
    },
    turrets: {
      light: { tier: 'light', name: '궁수탑', desc: '단일 대상 · 저가', projectile: 'arrow' },
      medium: { tier: 'medium', name: '발리스타', desc: '단일 대상 · 고화력', projectile: 'bolt' },
      heavy: { tier: 'heavy', name: '끓는 기름통', desc: '범위 피해', projectile: 'shell' },
    },
    special: { name: '투석 세례', desc: '투석기로 바위를 퍼붓는다', look: 'catapult' },
    base: { name: '성채', look: 'castle' },
    palette: {
      skin: 0xe6b48a, cloth: 0x4a5fa8, clothDark: 0x2f3d73, metal: 0xb8c0c8, wood: 0x6b4423, accent: 0xe0c040,
      sky: [0x6aa9d8, 0xc9e3f2], far: 0x7d8fa6, mid: 0x3f7a3a, ground: 0x6f8f43, groundDark: 0x4a6329,
    },
  },
  {
    name: '화약 시대',
    units: {
      melee: { role: 'melee', name: '머스킷병', desc: '총검 돌격 보병', weapon: 'musket', mount: 'none', head: 'tricorn' },
      ranged: { role: 'ranged', name: '저격병', desc: '장거리 소총', weapon: 'rifle', mount: 'none', head: 'tricorn', projectile: 'bullet' },
      heavy: { role: 'heavy', name: '대포 수레', desc: '근거리 산탄포', weapon: 'cannon', mount: 'cannonCart', head: 'tricorn' },
    },
    turrets: {
      light: { tier: 'light', name: '소총 거치대', desc: '단일 대상 · 저가', projectile: 'bullet' },
      medium: { tier: 'medium', name: '개틀링', desc: '단일 대상 · 고화력', projectile: 'bullet' },
      heavy: { tier: 'heavy', name: '박격포', desc: '범위 피해', projectile: 'shell' },
    },
    special: { name: '집중 포격', desc: '포병대의 일제 사격', look: 'barrage' },
    base: { name: '요새', look: 'fortress' },
    palette: {
      skin: 0xe8b890, cloth: 0x2f5f9e, clothDark: 0x1d3c66, metal: 0x5a5a60, wood: 0x6e4a2a, accent: 0xf2f2f2,
      sky: [0x9aa7b3, 0xdfe4e6], far: 0x7c8577, mid: 0x55653d, ground: 0x7a6a4a, groundDark: 0x4f4430,
    },
  },
  {
    name: '미래 시대',
    units: {
      melee: { role: 'melee', name: '사이버 병사', desc: '플라즈마 블레이드', weapon: 'plasmaBlade', mount: 'none', head: 'visor' },
      ranged: { role: 'ranged', name: '레이저 저격수', desc: '고출력 레이저', weapon: 'laserRifle', mount: 'none', head: 'visor', projectile: 'laser' },
      heavy: { role: 'heavy', name: '메크 워커', desc: '이족 보행 병기', weapon: 'mechGun', mount: 'mech', head: 'visor' },
    },
    turrets: {
      light: { tier: 'light', name: '펄스 터렛', desc: '단일 대상 · 저가', projectile: 'laser' },
      medium: { tier: 'medium', name: '레일건', desc: '단일 대상 · 고화력', projectile: 'laser' },
      heavy: { tier: 'heavy', name: '플라즈마 캐논', desc: '범위 피해', projectile: 'plasma' },
    },
    special: { name: '궤도 레이저', desc: '위성에서 레이저를 조사한다', look: 'orbitalLaser' },
    base: { name: '미래 기지', look: 'future' },
    palette: {
      skin: 0xe0b08a, cloth: 0x3a3f4f, clothDark: 0x23262f, metal: 0xa9b8c8, wood: 0x39404c, accent: 0x31e0e8,
      sky: [0x1b1f3a, 0x4a3b78], far: 0x3a3163, mid: 0x2a2f48, ground: 0x3e4252, groundDark: 0x262833,
    },
  },
];

export const ERA_COUNT = ERAS.length;
export const UNIT_ROLES: UnitRole[] = ['melee', 'ranged', 'heavy'];
export const TURRET_TIERS: TurretTier[] = ['light', 'medium', 'heavy'];

export interface UnitStats extends UnitBaseStats {
  role: UnitRole;
  era: number;
}

/** 시대 배율이 적용된 유닛 스탯 */
export function getUnitStats(role: UnitRole, era: number): UnitStats {
  const b = BALANCE.units[role];
  const s = BALANCE.eraMult.stat[era];
  const c = BALANCE.eraMult.cost[era];
  return {
    ...b,
    role,
    era,
    cost: Math.round(b.cost * c),
    hp: Math.round(b.hp * s),
    atk: Math.round(b.atk * s),
  };
}

export interface TurretStats {
  tier: TurretTier;
  era: number;
  cost: number;
  damage: number;
  cooldown: number;
  splashRadius: number;
  range: number;
}

/** 시대 배율이 적용된 포탑 스탯 */
export function getTurretStats(tier: TurretTier, era: number): TurretStats {
  const t = BALANCE.turret.tiers[tier];
  return {
    tier,
    era,
    cost: Math.round(t.cost * BALANCE.eraMult.cost[era]),
    damage: Math.round(t.dps * t.cooldown * BALANCE.eraMult.stat[era]),
    cooldown: t.cooldown,
    splashRadius: t.splashRadius,
    range: BALANCE.turret.rangeByEra[era] + BALANCE.turret.tierRangeBonus[tier],
  };
}

export function getSpecialDamage(era: number): number {
  return Math.round(BALANCE.special.damage * BALANCE.eraMult.stat[era]);
}
