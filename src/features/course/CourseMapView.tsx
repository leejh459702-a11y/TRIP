import { KakaoMapView, type MapMarkerSpec, type MapPolylineSpec } from '../../components/map/KakaoMapView';
import type { Block, Place } from '../../domain/types';
import { CATEGORY_COLOR_VAR } from '../../domain/category';

interface CourseMapViewProps {
  blocks: Block[];
  places: Place[];
}

/**
 * 순서 번호 핀 + 구간 연결선.
 * RouteLeg에는 실제 도로 경로 좌표가 없으므로(H1 인터페이스 참조), 지점 간 직선으로
 * 근사합니다 — 정확한 도로 동선이 아니라 순서와 대략적 방향을 보여주는 용도입니다.
 */
export function CourseMapView({ blocks, places }: CourseMapViewProps) {
  const placeById = new Map(places.map((p) => [p.id, p]));
  const placeBlocks = blocks
    .map((b) => (b.placeId ? placeById.get(b.placeId) : undefined))
    .filter((p): p is Place => !!p);

  const markers: MapMarkerSpec[] = placeBlocks.map((p, i) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    color: CATEGORY_COLOR_VAR[p.category],
    label: String(i + 1),
  }));

  const polylines: MapPolylineSpec[] =
    placeBlocks.length >= 2
      ? [
          {
            id: 'route',
            path: placeBlocks.map((p) => ({ lat: p.lat, lng: p.lng })),
            color: '#3D6B8C',
          },
        ]
      : [];

  return <KakaoMapView markers={markers} polylines={polylines} />;
}
