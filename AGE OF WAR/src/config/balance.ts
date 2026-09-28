/**
 * 크로노 프론트 — 모든 게임 수치.
 * 로직 코드에는 수치를 하드코딩하지 않고 반드시 여기서 읽는다.
 * 수정 가이드는 README.md 의 "balance.ts 수정 가이드" 참고.
 */

export type UnitRole = 'melee' | 'ranged' | 'heavy';
export type TurretTier = 'light' | 'medium' | 'heavy';

export interface UnitBaseStats {
  cost: number;
  hp: number;
  atk: number;
  /** 공격 쿨다운(초) */
  cooldown: number;
  /** 사거리(px, 몸통 가장자리 기준 거리) */
  range: number;
  /** 이동 속도(px/s) */
  speed: number;
  /** 생산 시간(초) */
  trainTime: number;
  /** 충돌용 몸통 폭(px) */
  width: number;
}

export interface TurretBaseStats {
  cost: number;
  /** 초당 피해(시대1 기준) */
  dps: number;
  /** 발사 간격(초). 1발 피해 = dps × cooldown */
  cooldown: number;
  /** 0 이면 단일 대상, >0 이면 범위 피해 반경(px) */
  splashRadius: number;
}

export const BALANCE = {
  /** 월드(레인) 기하 */
  world: {
    width: 2000,
    height: 720,
    groundY: 580,
    /** 기지 중심 x [플레이어, 적] */
    baseX: [120, 1880] as const,
    baseWidth: 150,
    baseHeight: 190,
    /** 기지 앞 가장자리로부터 스폰 위치까지 거리 */
    spawnOffset: 8,
  },

  /** 시뮬레이션 */
  sim: {
    fixedDt: 1 / 60,
    /** 한 프레임에서 따라잡을 최대 실제 시간(초). 탭 전환 등 스파이크 방지 */
    maxFrameTime: 0.25,
    speedOptions: [1, 2] as const,
  },

  economy: {
    startGold: 175,
    /** 초당 기본 수입 */
    incomePerSec: 2,
    /**
     * 처치 시 골드 = cost × killGoldMult.
     * 기획 초안은 1.25였으나 이기는 쪽이 눈덩이처럼 커져 판이 ~6분에 끝나서 1.0으로 조정
     * (AI 대전 시뮬레이션 기준 보통 난이도 8~10분, 교착 없음)
     */
    killGoldMult: 1.0,
    /** 처치 시 EXP = cost × killExpMult */
    killExpMult: 2,
    /** 기지에 준 피해의 이 비율만큼 EXP 획득 */
    baseDamageExpRatio: 0.1,
  },

  /** 시대1 기준 유닛 스탯 */
  units: {
    melee: { cost: 15, hp: 60, atk: 12, cooldown: 1.0, range: 25, speed: 40, trainTime: 1.0, width: 26 },
    ranged: { cost: 25, hp: 40, atk: 8, cooldown: 1.2, range: 140, speed: 38, trainTime: 1.5, width: 24 },
    heavy: { cost: 100, hp: 220, atk: 35, cooldown: 1.6, range: 30, speed: 30, trainTime: 3.0, width: 52 },
  } satisfies Record<UnitRole, UnitBaseStats>,

  /** 같은 편 앞 유닛과 유지하는 최소 간격(px) */
  unitGap: 6,

  /** 시대 배율 (index = 시대 0..4) */
  eraMult: {
    /** hp / atk / 포탑 DPS / 특수기 피해 */
    stat: [1, 2.4, 5.5, 12, 26],
    /** 유닛·포탑 비용 */
    cost: [1, 2.5, 6, 14, 30],
  },

  era: {
    /** 다음 시대로 진화하는 데 필요한 누적 EXP (시대1→2, 2→3, 3→4, 4→5) */
    expToEvolve: [1000, 3500, 9000, 20000],
    /** 시대별 기지 최대 HP */
    baseMaxHp: [500, 1100, 2000, 3200, 5000],
  },

  production: {
    maxQueue: 5,
  },

  projectile: {
    /** 유닛 원거리 투사체 속도(px/s) */
    speed: 460,
    /** 포탑 투사체 속도(px/s) */
    turretSpeed: 560,
    /** 대상과 이 거리 이내면 명중 */
    hitDistance: 8,
  },

  turret: {
    /** 시대별 사거리(px, 기지 앞 가장자리 기준). 포탑을 구매한 시대의 값이 적용된다 */
    rangeByEra: [300, 325, 350, 375, 400],
    /** 등급별 추가 사거리(px). 최종 사거리 = rangeByEra[시대] + tierRangeBonus[등급] */
    tierRangeBonus: { light: 0, medium: 25, heavy: 50 } satisfies Record<TurretTier, number>,
    slotCount: 3,
    /** 슬롯 해금 비용 (1번은 기본 제공) */
    slotUnlockCost: [0, 1000, 3000],
    /** 판매 시 구매가 환급 비율 */
    sellRefund: 0.5,
    tiers: {
      light: { cost: 100, dps: 8, cooldown: 1.0, splashRadius: 0 },
      medium: { cost: 200, dps: 14, cooldown: 1.5, splashRadius: 0 },
      heavy: { cost: 350, dps: 10, cooldown: 2.5, splashRadius: 60 },
    } satisfies Record<TurretTier, TurretBaseStats>,
  },

  special: {
    cooldown: 60,
    /** 게임 시작 시 남은 쿨다운 */
    initialCooldown: 30,
    dropsMin: 20,
    dropsMax: 30,
    /** 낙하물 1개 피해(시대1). 시대 stat 배율 적용 */
    damage: 40,
    /** 착탄 판정 반경(px) */
    radius: 30,
    /** 낙하 시작 시각을 이 시간(초) 안에 분산 */
    spreadDuration: 2.2,
    /** 낙하 연출 시간(초) */
    fallTime: 0.9,
    /** 자기 기지 앞 가장자리에서 이만큼 떨어진 곳부터 적 기지 앞까지 낙하 */
    minDistanceFromOwnBase: 80,
  },
} as const;

export type Balance = typeof BALANCE;
