import type { LatLng, RouteLeg, RoutingProvider, TravelMode } from './types';

const REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY as string | undefined;
const MOBILITY_KEY = import.meta.env.VITE_KAKAO_MOBILITY_KEY as string | undefined;

const LOCAL_BASE = 'https://dapi.kakao.com/v2/routing';
const MOBILITY_BASE = 'https://apis-navi.kakaomobility.com/v1';

interface KakaoLegResponse {
  duration: number; // 초
  distance: number; // m
  fare?: { toll?: number };
  transitSummary?: string;
}

async function fetchJson(url: string, key: string | undefined): Promise<unknown> {
  if (!key) {
    throw new Error('카카오 REST/모빌리티 키가 설정되지 않았습니다 (.env 확인)');
  }
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
  });
  if (!res.ok) {
    throw new Error(`카카오 경로 API 오류: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function isKakaoLegResponse(value: unknown): value is KakaoLegResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { duration?: unknown }).duration === 'number' &&
    typeof (value as { distance?: unknown }).distance === 'number'
  );
}

function toRouteLeg(mode: TravelMode, raw: unknown): RouteLeg {
  if (!isKakaoLegResponse(raw)) {
    throw new Error('카카오 경로 API 응답 형식이 예상과 다릅니다');
  }
  return {
    durationMin: Math.round(raw.duration / 60),
    distanceM: raw.distance,
    mode,
    transitSummary: raw.transitSummary,
    tollFee: raw.fare?.toll,
    fetchedAt: Date.now(),
  };
}

/**
 * 카카오맵/카카오내비 REST API 기반 실제 경로 프로바이더 (H1, 3절).
 * car → transit → walk 순으로 실연결합니다. 컴포넌트에서 직접 호출 금지 —
 * 반드시 이 클래스(혹은 RoutingProvider 인터페이스)를 통해서만 사용하세요.
 */
export class KakaoRoutingProvider implements RoutingProvider {
  name = 'kakao';

  supports(mode: TravelMode): boolean {
    return mode === 'car' || mode === 'transit' || mode === 'walk';
  }

  async getLeg(from: LatLng, to: LatLng, mode: TravelMode): Promise<RouteLeg> {
    if (mode === 'car') return this.getCarLeg(from, to);
    if (mode === 'transit') return this.getTransitLeg(from, to);
    return this.getWalkLeg(from, to);
  }

  private async getCarLeg(from: LatLng, to: LatLng): Promise<RouteLeg> {
    const url =
      `${MOBILITY_BASE}/directions?` +
      `origin=${from.lng},${from.lat}&destination=${to.lng},${to.lat}`;
    const raw = await fetchJson(url, MOBILITY_KEY);
    return toRouteLeg('car', raw);
  }

  private async getTransitLeg(from: LatLng, to: LatLng): Promise<RouteLeg> {
    const url =
      `${LOCAL_BASE}/publictraffic?` +
      `origin=${from.lng},${from.lat}&destination=${to.lng},${to.lat}`;
    const raw = await fetchJson(url, REST_KEY);
    return toRouteLeg('transit', raw);
  }

  private async getWalkLeg(from: LatLng, to: LatLng): Promise<RouteLeg> {
    const url =
      `${LOCAL_BASE}/walk?` +
      `origin=${from.lng},${from.lat}&destination=${to.lng},${to.lat}`;
    const raw = await fetchJson(url, REST_KEY);
    return toRouteLeg('walk', raw);
  }

  /** 다중 경유지 자동차 길찾기 (카카오내비 waypoints/directions). */
  async getMultiStopCar(points: LatLng[]): Promise<RouteLeg[]> {
    if (points.length < 2) return [];
    const origin = points[0];
    const destination = points[points.length - 1];
    const waypoints = points.slice(1, -1);
    const params = new URLSearchParams({
      origin: `${origin.lng},${origin.lat}`,
      destination: `${destination.lng},${destination.lat}`,
    });
    if (waypoints.length > 0) {
      params.set('waypoints', waypoints.map((p) => `${p.lng},${p.lat}`).join('|'));
    }
    const raw = await fetchJson(
      `${MOBILITY_BASE}/waypoints/directions?${params.toString()}`,
      MOBILITY_KEY,
    );
    const legsRaw = (raw as { legs?: unknown[] }).legs;
    if (!Array.isArray(legsRaw)) {
      throw new Error('다중 경유지 응답에 legs가 없습니다');
    }
    return legsRaw.map((leg) => toRouteLeg('car', leg));
  }
}
