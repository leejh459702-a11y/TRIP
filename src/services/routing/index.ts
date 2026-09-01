import { CachingRoutingProvider } from './CachingRoutingProvider';
import { KakaoRoutingProvider } from './KakaoRoutingProvider';
import { MockRoutingProvider } from './MockRoutingProvider';
import { isDemoMode } from '../demoMode';
import type { RoutingProvider } from './types';

export type { RoutingProvider, LatLng, RouteLeg, TravelMode } from './types';
export { legCacheKey } from './cache';
export { haversineM, roundCoord } from './haversine';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_ROUTING === 'true';

let cached: RoutingProvider | null = null;

/**
 * 앱 전체에서 쓸 RoutingProvider를 가져옵니다.
 * VITE_USE_MOCK_ROUTING=true면 목 데이터, 아니면 캐싱이 적용된 카카오 프로바이더.
 * 체험 모드에서는 .env 설정과 무관하게 항상 목 데이터를 씁니다(카카오 키가 없을 수 있으므로).
 * uid가 없으면(로그인 전) 캐시 없이 카카오 프로바이더를 반환합니다.
 */
export function getRoutingProvider(uid?: string): RoutingProvider {
  if (USE_MOCK || isDemoMode()) {
    cached ??= new MockRoutingProvider();
    return cached;
  }
  const kakao = new KakaoRoutingProvider();
  if (!uid) return kakao;
  return new CachingRoutingProvider(kakao, uid);
}
