import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { usePlacesStore } from '../../store/placesStore';
import { CATEGORY_LABEL } from '../../domain/category';
import { BusinessHoursForm } from './BusinessHoursForm';
import type { BusinessHours } from '../../domain/types';
import styles from './PlaceDetailPage.module.css';

export function PlaceDetailPage() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const uid = useAuthStore((s) => s.user?.uid);
  const places = usePlacesStore((s) => s.places);
  const subscribe = usePlacesStore((s) => s.subscribe);
  const updatePlace = usePlacesStore((s) => s.updatePlace);

  useEffect(() => {
    if (!uid) return;
    return subscribe(uid);
  }, [uid, subscribe]);

  const place = places.find((p) => p.id === placeId);

  if (!place) {
    return (
      <>
        <PageHeader title="장소" />
        <div style={{ padding: 16, color: 'var(--ink-muted)', fontSize: 13 }}>
          장소를 불러오는 중이거나 존재하지 않습니다.
        </div>
      </>
    );
  }

  function handleSave(hours: BusinessHours) {
    if (!uid || !place) return;
    void updatePlace(uid, place.id, { businessHours: hours });
  }

  return (
    <>
      <PageHeader title={place.name} />
      <div className={styles.meta}>
        <div className={styles.sub}>
          {CATEGORY_LABEL[place.category]} · {place.region.sido} {place.region.sigungu}
        </div>
        <div className={styles.sub}>{place.address}</div>
        {place.placeUrl && (
          <a className={styles.link} href={place.placeUrl} target="_blank" rel="noreferrer">
            플레이스 페이지 열기 →
          </a>
        )}
        {!place.businessHours && <div className={styles.badge}>영업시간 미확인</div>}
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-muted)' }}>
          1인당 예상 비용{' '}
          <input
            type="number"
            min={0}
            step={1000}
            defaultValue={place.estCostPerPerson ?? ''}
            onBlur={(e) =>
              void updatePlace(uid ?? '', place.id, {
                estCostPerPerson: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            style={{
              width: 90,
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12,
              marginLeft: 4,
            }}
          />
          원
        </div>
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              marginTop: 12,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ← 뒤로
          </button>
        </div>
      </div>

      <div className={styles.sectionTitle}>영업시간</div>
      <BusinessHoursForm initial={place.businessHours} onSave={handleSave} />
    </>
  );
}
