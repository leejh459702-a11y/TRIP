import type { LatLng, RouteLeg, RoutingProvider, TravelMode } from './types';
import { getCachedLeg, putCachedLeg } from './cache';

/**
 * 다른 RoutingProvider를 감싸 Firestore leg 캐시를 적용하는 데코레이터 (H2).
 * 캐시 적중 시 실제 API를 호출하지 않습니다.
 */
export class CachingRoutingProvider implements RoutingProvider {
  name: string;
  private readonly inner: RoutingProvider;
  private readonly uid: string;

  constructor(inner: RoutingProvider, uid: string) {
    this.inner = inner;
    this.uid = uid;
    this.name = `cached(${inner.name})`;
  }

  supports(mode: TravelMode): boolean {
    return this.inner.supports(mode);
  }

  async getLeg(from: LatLng, to: LatLng, mode: TravelMode): Promise<RouteLeg> {
    const cached = await getCachedLeg(this.uid, from, to, mode);
    if (cached) return cached;
    const leg = await this.inner.getLeg(from, to, mode);
    await putCachedLeg(this.uid, from, to, mode, leg);
    return leg;
  }

  async getMultiStopCar(points: LatLng[]): Promise<RouteLeg[]> {
    // 경유지 조합별 캐시는 구간 단위 캐시보다 적중률이 낮으므로 그대로 위임합니다.
    // 구간별 재사용은 getLeg 캐시가 담당합니다 (블록 순서 변경 시 변경된 구간만 재조회, 3절 규칙 4).
    return this.inner.getMultiStopCar(points);
  }
}
