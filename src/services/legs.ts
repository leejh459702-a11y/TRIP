import type { Block, LatLng, Place, RouteLeg } from '../domain/types';
import type { RoutingProvider } from './routing';

export interface ResolvedBlock {
  block: Block;
  place?: Place; // type === 'place'일 때만 존재
}

/**
 * 하루치 블록 순서를 받아 실제 이동 구간(leg)을 계산합니다.
 * 자유시간 블록(B4)은 좌표가 없으므로 건너뛰고, 앞뒤 place 블록을 직접 연결합니다.
 * 반환 맵의 키는 "출발 블록 id" — computeTimeline의 legs 입력과 동일한 형태입니다.
 */
export async function computeLegsForDay(
  blocks: readonly ResolvedBlock[],
  provider: RoutingProvider,
): Promise<Map<string, RouteLeg>> {
  const legs = new Map<string, RouteLeg>();

  const anchors = blocks.filter(
    (b): b is ResolvedBlock & { place: Place } => b.block.type === 'place' && !!b.place,
  );

  for (let i = 0; i < anchors.length - 1; i++) {
    const from = anchors[i];
    const to = anchors[i + 1];
    if (!from || !to) continue;
    const mode = from.block.modeToNext ?? 'car';
    const fromLatLng: LatLng = { lat: from.place.lat, lng: from.place.lng };
    const toLatLng: LatLng = { lat: to.place.lat, lng: to.place.lng };
    const leg = await provider.getLeg(fromLatLng, toLatLng, mode);
    legs.set(from.block.id, leg);
  }

  return legs;
}
