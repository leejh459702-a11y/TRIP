import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { usePlacesStore } from '../../store/placesStore';
import { useVisitsStore } from '../../store/visitsStore';
import { CATEGORY_COLOR_VAR } from '../../domain/category';
import type { Place, Visit } from '../../domain/types';
import styles from './RevisitPage.module.css';

export function RevisitPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const places = usePlacesStore((s) => s.places);
  const subscribePlaces = usePlacesStore((s) => s.subscribe);
  const visits = useVisitsStore((s) => s.visits);
  const subscribeVisits = useVisitsStore((s) => s.subscribe);
  const updatePlace = usePlacesStore((s) => s.updatePlace);

  useEffect(() => {
    if (!uid) return;
    const unsubPlaces = subscribePlaces(uid);
    const unsubVisits = subscribeVisits(uid);
    return () => {
      unsubPlaces();
      unsubVisits();
    };
  }, [uid, subscribePlaces, subscribeVisits]);

  // E2: 장소별 방문 회차 (오래된 순으로 저장해두고 표시할 땐 최신이 위로 오도록 뒤집습니다)
  const visitsByPlaceId = useMemo(() => {
    const map = new Map<string, Visit[]>();
    for (const v of visits) {
      const list = map.get(v.placeId) ?? [];
      list.push(v);
      map.set(v.placeId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.visitedAt.localeCompare(b.visitedAt));
    }
    return map;
  }, [visits]);

  const yesPlaces = places
    .filter((p) => p.latestRevisit === 'yes')
    .sort((a, b) => (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? ''));
  const maybePlaces = places
    .filter((p) => p.latestRevisit === 'maybe')
    .sort((a, b) => (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? ''));

  if (yesPlaces.length === 0 && maybePlaces.length === 0) {
    return (
      <>
        <PageHeader title="재방문" />
        <EmptyState
          title="아직 방문 기록이 없습니다"
          description="코스를 실행하고 블록을 완료하면 여기에 또감 · 보류 · 재방문 리마인드가 쌓입니다"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="재방문" />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>또 감 {yesPlaces.length}곳</div>
        {yesPlaces.length === 0 ? (
          <EmptyState title="또 감으로 표시한 곳이 없습니다" description="방문 기록에서 '또 감'을 눌러보세요" />
        ) : (
          yesPlaces.map((place) => (
            <PlaceRoundsCard key={place.id} place={place} rounds={visitsByPlaceId.get(place.id) ?? []} />
          ))
        )}
      </div>

      {maybePlaces.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>보류함 {maybePlaces.length}곳</div>
          {maybePlaces.map((place) => (
            <div className={styles.card} key={place.id}>
              <div className={styles.cardHead}>
                <span className={styles.dot} style={{ background: CATEGORY_COLOR_VAR[place.category] }} />
                <span className={styles.cardTitle}>{place.name}</span>
              </div>
              <div className={styles.maybeActions}>
                <button
                  className={styles.actionButton}
                  onClick={() => uid && void updatePlace(uid, place.id, { latestRevisit: 'yes' })}
                >
                  또 감으로
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => uid && void updatePlace(uid, place.id, { latestRevisit: 'no' })}
                >
                  안 감으로
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PlaceRoundsCard({ place, rounds }: { place: Place; rounds: Visit[] }) {
  const ordered = [...rounds].reverse(); // 최신 회차가 위로
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.dot} style={{ background: CATEGORY_COLOR_VAR[place.category] }} />
        <span className={styles.cardTitle}>{place.name}</span>
        <span className={styles.cardCount}>방문 {place.visitCount}회</span>
      </div>
      {ordered.map((v, i) => (
        <div className={styles.roundRow} key={v.id}>
          {ordered.length - i}차 · {format(new Date(v.visitedAt), 'yyyy.MM.dd')}
          {v.companions.length > 0 ? ` · ${v.companions.join(', ')}` : ''}
          {v.memo && <div className={styles.roundMemo}>&ldquo;{v.memo}&rdquo;</div>}
        </div>
      ))}
    </div>
  );
}
