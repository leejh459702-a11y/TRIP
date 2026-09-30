import { BALANCE, type UnitRole } from '../config/balance';
import { getUnitStats } from '../config/eras';

export interface QueueItem {
  role: UnitRole;
  /** 주문 시점 시대(해당 시대 스탯으로 생산됨) */
  era: number;
  cost: number;
  trainTime: number;
}

/**
 * 순차 생산 대기열. 골드 처리는 하지 않는 순수 자료구조이며,
 * 골드 검사/차감은 GameWorld.train → tryEnqueue 에서 한다.
 */
export class ProductionQueue {
  readonly items: QueueItem[] = [];
  /** 맨 앞 항목의 진행 시간(초) */
  progress = 0;

  constructor(readonly maxSize: number = BALANCE.production.maxQueue) {}

  get isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  get length(): number {
    return this.items.length;
  }

  get current(): QueueItem | undefined {
    return this.items[0];
  }

  /** 0..1 현재 생산 진행률 */
  get ratio(): number {
    const cur = this.items[0];
    return cur ? Math.min(1, this.progress / cur.trainTime) : 0;
  }

  push(item: QueueItem): boolean {
    if (this.isFull) return false;
    this.items.push(item);
    return true;
  }

  /** 시간 진행. 맨 앞 항목이 완성되면 그 항목을 반환(스폰될 때까지 대기열에 남음) */
  update(dt: number): QueueItem | null {
    const cur = this.items[0];
    if (!cur) {
      this.progress = 0;
      return null;
    }
    this.progress = Math.min(cur.trainTime, this.progress + dt);
    return this.progress >= cur.trainTime ? cur : null;
  }

  /** 스폰 성공 후 맨 앞 항목 제거 */
  shift(): QueueItem | undefined {
    const item = this.items.shift();
    this.progress = 0;
    return item;
  }
}

/** 골드가 충분하고 대기열에 자리가 있으면 차감 후 추가 */
export function tryEnqueue(
  wallet: { gold: number },
  queue: ProductionQueue,
  role: UnitRole,
  era: number,
): { ok: true; item: QueueItem } | { ok: false; reason: string } {
  const stats = getUnitStats(role, era);
  if (queue.isFull) return { ok: false, reason: '대기열이 가득 찼습니다' };
  if (wallet.gold < stats.cost) return { ok: false, reason: '골드가 부족합니다' };
  const item: QueueItem = { role, era, cost: stats.cost, trainTime: stats.trainTime };
  queue.push(item);
  wallet.gold -= stats.cost;
  return { ok: true, item };
}
