import type { LatLng, RouteLeg, RoutingProvider, TravelMode } from './types';
import { haversineM } from './haversine';

// 대략적인 평균 이동 속도 (m/min). 개발/테스트용 목 데이터 산출 기준.
const SPEED_M_PER_MIN: Record<TravelMode, number> = {
  car: 500, // 30km/h
  transit: 350, // 환승 대기 포함 21km/h
  walk: 67, // 4km/h
};

/**
 * 실제 카카오 API를 호출하지 않는 목 라우팅 프로바이더.
 * VITE_USE_MOCK_ROUTING=true 일 때 사용 (H2, 9절 쿼터 보호).
 */
export class MockRoutingProvider implements RoutingProvider {
  name = 'mock';

  supports(_mode: TravelMode): boolean {
    return true;
  }

  async getLeg(from: LatLng, to: LatLng, mode: TravelMode): Promise<RouteLeg> {
    const distanceM = Math.round(haversineM(from, to) * 1.3); // 직선거리 보정
    const durationMin = Math.max(1, Math.round(distanceM / SPEED_M_PER_MIN[mode]));
    return {
      durationMin,
      distanceM,
      mode,
      transitSummary: mode === 'transit' ? '버스 → 도보 (목 데이터)' : undefined,
      tollFee: mode === 'car' && distanceM > 20000 ? 2000 : undefined,
      fetchedAt: Date.now(),
    };
  }

  async getMultiStopCar(points: LatLng[]): Promise<RouteLeg[]> {
    const legs: RouteLeg[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      legs.push(await this.getLeg(points[i], points[i + 1], 'car'));
    }
    return legs;
  }
}
