import type { LatLng, RouteLeg, TravelMode } from '../../domain/types';

export type { LatLng, RouteLeg, TravelMode };

/**
 * 경로 조회 추상화 (명세서 H1).
 * 애플리케이션 코드는 이 인터페이스만 참조합니다.
 * dapi.kakao.com을 컴포넌트에서 직접 호출하지 마세요.
 */
export interface RoutingProvider {
  name: string;
  getLeg(from: LatLng, to: LatLng, mode: TravelMode): Promise<RouteLeg>;
  getMultiStopCar(points: LatLng[]): Promise<RouteLeg[]>;
  supports(mode: TravelMode): boolean;
}
