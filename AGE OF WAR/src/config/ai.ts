/**
 * 적 AI 난이도 파라미터. EnemyAI 는 여기 값만 읽는다.
 */
import type { UnitRole } from './balance';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type SpecialPolicy = 'whenAny' | 'count' | 'cluster';

export interface AIParams {
  label: string;
  desc: string;
  /** 적 AI 가 받는 골드 배율(기본 수입·처치 골드) */
  incomeMult: number;
  /** 이 난이도에서 플레이어가 받는 골드 배율(기본 수입·처치 골드) */
  playerIncomeMult: number;
  /** 적 유닛 HP 배율(기본 모드 난이도 보정) */
  unitHpMult: number;
  /** 판단 주기(초) */
  thinkInterval: number;
  /** 판단 지연(초): 이 시간만큼 과거의 전장 상황을 보고 판단한다 */
  reactionDelay: number;
  /** 내 전력 < 적 전력 × ratio 이면 방어적 생산 */
  defensiveRatio: number;
  /** 방어적 생산 시 유닛 효율 = hp×atk/cost × 역할 가중치 */
  roleWeight: Record<UnitRole, number>;
  /** 첫 웨이브 구성(초반에 너무 오래 모으기만 하지 않도록 작게) */
  openingWave: Record<UnitRole, number>;
  /** 우세 시 모았다가 보내는 웨이브 구성 */
  wave: Record<UnitRole, number>;
  /** 웨이브 구성에 시대 수 만큼 추가되는 유닛 (후반 웨이브를 키움) */
  wavePerEra: Record<UnitRole, number>;
  /**
   * 이 골드(시대1 기준, 시대 비용 배율 적용) 이상이면 골드가 아닌 생산 시간이 병목이므로
   * 생산 시간 대비 전력이 가장 높은 중장 위주 웨이브로 전환
   */
  richGold: number;
  /** 이 골드(시대1 기준, 시대 비용 배율 적용) 이상 여유가 있으면 포탑 구매/교체 고려 */
  turretSpareGold: number;
  /** 웨이브를 모으는 중일 때 포탑 구매 전에 남겨둘 골드 = 웨이브 비용 × 이 비율 */
  waveReserveRatio: number;
  /** 포탑 우선도(클수록 임계치가 낮아짐) */
  turretPriority: number;
  /** 슬롯 해금 시 해금 비용 외에 남겨둘 골드 비율(해금비 대비) */
  slotReserveRatio: number;
  /** 사용할 최대 포탑 슬롯 수 */
  maxSlots: number;
  /** 구매할 최고 포탑 등급 (0=저가, 1=중가, 2=고가) */
  maxTurretTier: number;
  specialPolicy: SpecialPolicy;
  /** count/cluster 정책에서 필요한 적 유닛 수 */
  specialMinUnits: number;
  /** cluster 정책의 밀집 판정 폭(px) */
  clusterWidth: number;
}

export const AI_PARAMS: Record<Difficulty, AIParams> = {
  easy: {
    label: '쉬움',
    desc: '내 골드 +30% · 적 체력 −30%',
    incomeMult: 1,
    playerIncomeMult: 1.3,
    unitHpMult: 0.7,
    thinkInterval: 0.5,
    reactionDelay: 2,
    defensiveRatio: 0.8,
    roleWeight: { melee: 1, ranged: 2.5, heavy: 1 },
    openingWave: { melee: 3, ranged: 1, heavy: 0 },
    wave: { melee: 3, ranged: 2, heavy: 1 },
    wavePerEra: { melee: 0, ranged: 1, heavy: 0 },
    richGold: 1e9,
    turretSpareGold: 260,
    waveReserveRatio: 0.5,
    turretPriority: 0.7,
    slotReserveRatio: 0.6,
    maxSlots: 1,
    maxTurretTier: 1,
    specialPolicy: 'whenAny',
    specialMinUnits: 1,
    clusterWidth: 300,
  },
  normal: {
    label: '보통',
    desc: '기준 난이도',
    incomeMult: 1,
    playerIncomeMult: 1,
    unitHpMult: 1,
    thinkInterval: 0.5,
    reactionDelay: 0,
    defensiveRatio: 1.1,
    roleWeight: { melee: 1, ranged: 2.5, heavy: 1 },
    openingWave: { melee: 3, ranged: 2, heavy: 0 },
    wave: { melee: 2, ranged: 4, heavy: 3 },
    wavePerEra: { melee: 0, ranged: 1, heavy: 1 },
    richGold: 250,
    turretSpareGold: 200,
    waveReserveRatio: 0,
    turretPriority: 1,
    slotReserveRatio: 0.4,
    maxSlots: 2,
    maxTurretTier: 2,
    specialPolicy: 'count',
    specialMinUnits: 4,
    clusterWidth: 300,
  },
  hard: {
    label: '어려움',
    desc: '내 골드 −10% · 적 수입 +30%',
    incomeMult: 1.3,
    playerIncomeMult: 0.9,
    unitHpMult: 1,
    thinkInterval: 0.5,
    reactionDelay: 0,
    defensiveRatio: 1.15,
    roleWeight: { melee: 1, ranged: 2.8, heavy: 1.1 },
    openingWave: { melee: 4, ranged: 2, heavy: 0 },
    wave: { melee: 5, ranged: 3, heavy: 2 },
    wavePerEra: { melee: 1, ranged: 1, heavy: 0 },
    richGold: 0,
    turretSpareGold: 120,
    waveReserveRatio: 0,
    turretPriority: 1.8,
    slotReserveRatio: 0.2,
    maxSlots: 3,
    maxTurretTier: 2,
    specialPolicy: 'cluster',
    specialMinUnits: 5,
    clusterWidth: 280,
  },
};

export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
