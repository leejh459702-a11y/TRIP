import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { BulkTagBar } from '../../components/place/BulkTagBar';
import { useAuthStore } from '../../store/authStore';
import { usePlacesStore } from '../../store/placesStore';
import { useVisitsStore } from '../../store/visitsStore';
import { CATEGORY_COLOR_VAR } from '../../domain/category';
import { isOverdue, monthsSinceLastVisit, seasonalReminders } from '../../domain/reminders';
import type { Place, Visit } from '../../domain/types';
import styles from './RevisitPage.module.css';

type SortOrder = 'latest' | 'oldest';

export function RevisitPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const places = usePlacesStore((s) => s.places);
  const subscribePlaces = usePlacesStore((s) => s.subscribe);
  const visits = useVisitsStore((s) => s.visits);
  const subscribeVisits = useVisitsStore((s) => s.subscribe);
  const updatePlace = usePlacesStore((s) => s.updatePlace);
  const addTags = usePlacesStore((s) => s.addTags);
  const removeTags = usePlacesStore((s) => s.removeTags);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');

  const today = useMemo(() => new Date(), []);
  const reminders = useMemo(() => seasonalReminders(places, visits, today), [places, visits, today]);

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
    .sort((a, b) =>
      sortOrder === 'latest'
        ? (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? '')
        : (a.lastVisitedAt ?? '').localeCompare(b.lastVisitedAt ?? ''),
    );
  const maybePlaces = places
    .filter((p) => p.latestRevisit === 'maybe')
    .sort((a, b) => (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? ''));

  function toggleSelect(placeId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

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
      <PageHeader
        title="재방문"
        action={
          <button
            className={styles.selectToggle}
            onClick={() => {
              setSelectMode((v) => !v);
              setSelectedIds(new Set());
            }}
          >
            {selectMode ? '선택 취소' : '선택'}
          </button>
        }
      />

      {reminders.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>지금이 그 시즌</div>
          {reminders.map(({ place, lastMatchingVisit }) => (
            <div className={styles.reminderCard} key={place.id}>
              작년 이맘때 갔던 <strong>{place.name}</strong>, 지금이 그 시즌입니다
              {lastMatchingVisit.memo && (
                <div className={styles.roundMemo}>&ldquo;{lastMatchingVisit.memo}&rdquo;</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          또 감 {yesPlaces.length}곳
          <select
            className={styles.selectToggle}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            style={{ marginLeft: 'auto' }}
          >
            <option value="latest">최근 방문순</option>
            <option value="oldest">오래된 순</option>
          </select>
        </div>
        {yesPlaces.length === 0 ? (
          <EmptyState title="또 감으로 표시한 곳이 없습니다" description="방문 기록에서 '또 감'을 눌러보세요" />
        ) : (
          yesPlaces.map((place) => (
            <PlaceRoundsCard
              key={place.id}
              place={place}
              rounds={visitsByPlaceId.get(place.id) ?? []}
              selectMode={selectMode}
              selected={selectedIds.has(place.id)}
              onToggleSelect={() => toggleSelect(place.id)}
              today={today}
            />
          ))
        )}
      </div>

      {maybePlaces.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>보류함 {maybePlaces.length}곳</div>
          {maybePlaces.map((place) => (
            <div
              className={styles.card}
              key={place.id}
              onClick={selectMode ? () => toggleSelect(place.id) : undefined}
            >
              <div className={styles.cardHead}>
                {selectMode && (
                  <input type="checkbox" checked={selectedIds.has(place.id)} readOnly />
                )}
                <span className={styles.dot} style={{ background: CATEGORY_COLOR_VAR[place.category] }} />
                <span className={styles.cardTitle}>{place.name}</span>
              </div>
              {!selectMode && (
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
              )}
            </div>
          ))}
        </div>
      )}

      {selectMode && selectedIds.size > 0 && uid && (
        <BulkTagBar
          selectedCount={selectedIds.size}
          onApply={(tag, action) => {
            const ids = Array.from(selectedIds);
            void (action === 'add' ? addTags(uid, ids, [tag]) : removeTags(uid, ids, [tag]));
          }}
          onDone={() => {
            setSelectMode(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </>
  );
}

function PlaceRoundsCard({
  place,
  rounds,
  selectMode,
  selected,
  onToggleSelect,
  today,
}: {
  place: Place;
  rounds: Visit[];
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  today: Date;
}) {
  const ordered = [...rounds].reverse(); // 최신 회차가 위로
  const months = monthsSinceLastVisit(place, today);
  const overdue = isOverdue(place, today);
  return (
    <div className={styles.card} onClick={selectMode ? onToggleSelect : undefined}>
      <div className={styles.cardHead}>
        {selectMode && <input type="checkbox" checked={selected} readOnly />}
        <span className={styles.dot} style={{ background: CATEGORY_COLOR_VAR[place.category] }} />
        <span className={styles.cardTitle}>{place.name}</span>
        <span className={styles.cardCount}>방문 {place.visitCount}회</span>
      </div>
      {overdue && months != null && (
        <div className={styles.overdueBadge}>⏳ {months}개월 경과</div>
      )}
      {ordered.map((v, i) => {
        const expected =
          place.estCostPerPerson != null
            ? place.estCostPerPerson * (v.auto.partySize ?? 1)
            : undefined;
        return (
          <div className={styles.roundRow} key={v.id}>
            {ordered.length - i}차 · {format(new Date(v.visitedAt), 'yyyy.MM.dd')}
            {v.companions.length > 0 ? ` · ${v.companions.join(', ')}` : ''}
            {v.cost != null && (
              <span>
                {' '}
                · 실제 {v.cost.toLocaleString()}원
                {expected != null ? ` (예상 ${expected.toLocaleString()}원)` : ''}
              </span>
            )}
            {v.memo && <div className={styles.roundMemo}>&ldquo;{v.memo}&rdquo;</div>}
          </div>
        );
      })}
    </div>
  );
}
