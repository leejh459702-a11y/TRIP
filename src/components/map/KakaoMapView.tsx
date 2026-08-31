import { useEffect, useRef, useState } from 'react';
import {
  type KakaoCustomOverlay,
  type KakaoMap,
  type KakaoMapsSDK,
  type KakaoPolyline,
  loadKakaoMaps,
} from '../../services/kakao/loadKakaoMaps';
import styles from './KakaoMapView.module.css';

export interface MapMarkerSpec {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label?: string;
  onClick?: () => void;
}

export interface MapPolylineSpec {
  id: string;
  path: { lat: number; lng: number }[];
  color?: string;
}

interface KakaoMapViewProps {
  markers: MapMarkerSpec[];
  polylines?: MapPolylineSpec[];
  center?: { lat: number; lng: number };
  level?: number;
  fitToMarkers?: boolean;
  className?: string;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }; // 서울시청

export function KakaoMapView({
  markers,
  polylines = [],
  center,
  level = 6,
  fitToMarkers = true,
  className,
}: KakaoMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const sdkRef = useRef<KakaoMapsSDK | null>(null);
  const overlaysRef = useRef<KakaoCustomOverlay[]>([]);
  const polylinesRef = useRef<KakaoPolyline[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((sdk) => {
        if (cancelled || !containerRef.current) return;
        sdkRef.current = sdk;
        const initialCenter = center ?? DEFAULT_CENTER;
        mapRef.current = new sdk.Map(containerRef.current, {
          center: new sdk.LatLng(initialCenter.lat, initialCenter.lng),
          level,
        });
        setReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sdk = sdkRef.current;
    const map = mapRef.current;
    if (!sdk || !map || !ready) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = markers.map((m) => {
      const el = document.createElement('div');
      el.className = styles.marker;
      el.style.background = m.color;
      el.textContent = m.label ?? '';
      if (m.onClick) el.addEventListener('click', m.onClick);
      const overlay = new sdk.CustomOverlay({
        position: new sdk.LatLng(m.lat, m.lng),
        content: el,
        map,
        yAnchor: 0.5,
      });
      return overlay;
    });

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = polylines.map(
      (p) =>
        new sdk.Polyline({
          path: p.path.map((pt) => new sdk.LatLng(pt.lat, pt.lng)),
          strokeWeight: 4,
          strokeColor: p.color ?? '#3D6B8C',
          strokeOpacity: 0.8,
          strokeStyle: 'solid',
        }),
    );
    polylinesRef.current.forEach((p) => p.setMap(map));

    if (fitToMarkers && markers.length > 0) {
      const bounds = new sdk.LatLngBounds();
      markers.forEach((m) => bounds.extend(new sdk.LatLng(m.lat, m.lng)));
      if (!bounds.isEmpty()) map.setBounds(bounds);
    } else if (center) {
      map.setCenter(new sdk.LatLng(center.lat, center.lng));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, polylines, ready]);

  if (error) {
    return (
      <div className={`${styles.container} ${styles.error} ${className ?? ''}`}>
        지도를 불러올 수 없습니다: {error}
      </div>
    );
  }

  return <div ref={containerRef} className={`${styles.container} ${className ?? ''}`} />;
}
