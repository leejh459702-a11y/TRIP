import type { Block, Place } from '../../domain/types';
import { type MapApp, openDeepLink } from '../../services/deeplink';

const APPS: { app: MapApp; label: string }[] = [
  { app: 'naver', label: '네이버지도로 열기' },
  { app: 'kakao', label: '카카오맵으로 열기' },
  { app: 'tmap', label: 'T맵으로 열기' },
];

interface ExternalMapButtonProps {
  blocks: Block[];
  places: Place[];
}

/** F: 외부 지도 앱으로 딥링크 (H1과 별개, 순수 URL 스킴). */
export function ExternalMapButton({ blocks, places }: ExternalMapButtonProps) {
  const placeById = new Map(places.map((p) => [p.id, p]));
  const points = blocks
    .map((b) => (b.placeId ? placeById.get(b.placeId) : undefined))
    .filter((p): p is Place => !!p)
    .map((p) => ({ name: p.name, lat: p.lat, lng: p.lng }));

  if (points.length < 2) return null;

  return (
    <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', flexWrap: 'wrap' }}>
      {APPS.map(({ app, label }) => (
        <button
          key={app}
          type="button"
          onClick={() => openDeepLink(app, points)}
          className="btn btn-secondary btn-sm"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
