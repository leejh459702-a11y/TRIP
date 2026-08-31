import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addMinutes, differenceInMinutes, format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { usePlacesStore } from '../../store/placesStore';
import { useCoursesStore } from '../../store/coursesStore';
import { useVisitsStore } from '../../store/visitsStore';
import { findCourseDayForDate, updateBlock as patchBlock } from '../../domain/course';
import { computeTimeline, type ResolvedBlock } from '../../domain/timeline';
import { determineLiveState } from '../../domain/liveState';
import { getRoutingProvider } from '../../services/routing';
import { computeLegsForDay } from '../../services/legs';
import { buildNaverPlaceUrl } from '../../services/deeplink';
import { VisitEntrySheet, type VisitEntryValues } from '../course/VisitEntrySheet';
import type { Course, Place, RouteLeg } from '../../domain/types';
import styles from './LiveCoursePage.module.css';

export function LiveCoursePage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const places = usePlacesStore((s) => s.places);
  const subscribePlaces = usePlacesStore((s) => s.subscribe);
  const courses = useCoursesStore((s) => s.courses);
  const subscribeCourses = useCoursesStore((s) => s.subscribe);
  const saveCourse = useCoursesStore((s) => s.saveCourse);
  const recordVisit = useVisitsStore((s) => s.recordVisit);
  const subscribeVisits = useVisitsStore((s) => s.subscribe);

  const [now, setNow] = useState(new Date());
  const [legs, setLegs] = useState<Map<string, RouteLeg>>(new Map());
  const [checkoffBlockId, setCheckoffBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubP = subscribePlaces(uid);
    const unsubC = subscribeCourses(uid);
    const unsubV = subscribeVisits(uid);
    return () => {
      unsubP();
      unsubC();
      unsubV();
    };
  }, [uid, subscribePlaces, subscribeCourses, subscribeVisits]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const today = format(now, 'yyyy-MM-dd');
  const found = findCourseDayForDate(courses, today);

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const resolvedBlocks: ResolvedBlock[] = useMemo(
    () =>
      (found?.day.blocks ?? []).map((b) => ({
        block: b,
        place: b.placeId ? placeById.get(b.placeId) : undefined,
      })),
    [found?.day.blocks, placeById],
  );

  useEffect(() => {
    if (!uid || !found) return;
    const provider = getRoutingProvider(uid);
    computeLegsForDay(resolvedBlocks, provider)
      .then(setLegs)
      .catch(() => setLegs(new Map()));
  }, [uid, found, resolvedBlocks]);

  if (!found) {
    return (
      <div className={styles.page}>
        <div className={styles.doneCard}>
          <div className={styles.nowName}>오늘 일정이 없습니다</div>
          <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
            코스를 만들고 오늘 날짜에 배정해 보세요
          </p>
          <Link
            to="/course"
            style={{ marginTop: 12, color: 'var(--cat-stay)', fontSize: 13, textDecoration: 'underline' }}
          >
            일정 탭으로 이동
          </Link>
        </div>
      </div>
    );
  }

  const { course, day } = found;
  const timeline = computeTimeline(day, resolvedBlocks, legs);
  const liveState = determineLiveState(timeline.entries, now);

  function persistBlocks(nextBlocks: typeof day.blocks) {
    if (!uid) return;
    const nextCourse: Course = {
      ...course,
      days: course.days.map((d) => (d.id === day.id ? { ...d, blocks: nextBlocks } : d)),
    };
    void saveCourse(uid, nextCourse);
  }

  function handleSetDelay(blockId: string, delayMin: number) {
    persistBlocks(patchBlock(day.blocks, blockId, { delayMin }));
  }

  function handleCheckoff(blockId: string) {
    const nowIso = new Date().toISOString();
    persistBlocks(patchBlock(day.blocks, blockId, { done: true, doneAt: nowIso }));
    setCheckoffBlockId(blockId);
  }

  const checkoffBlock = day.blocks.find((b) => b.id === checkoffBlockId);
  const checkoffPlace = checkoffBlock?.placeId ? placeById.get(checkoffBlock.placeId) : undefined;

  function handleSaveVisit(values: VisitEntryValues) {
    if (!uid || !checkoffBlock || !checkoffPlace || !checkoffBlock.doneAt) return;
    void recordVisit(uid, {
      placeId: checkoffPlace.id,
      courseId: course.id,
      visitedAt: checkoffBlock.doneAt,
      revisit: values.revisit,
      companions: values.companions,
      memo: values.memo || undefined,
      partySize: course.partySize,
    });
    setCheckoffBlockId(null);
  }

  function openDirections(place?: Place) {
    if (!place) return;
    window.location.href = buildNaverPlaceUrl({ name: place.name, lat: place.lat, lng: place.lng });
  }

  return (
    <div className={styles.page}>
      <div className={styles.eyebrow}>{course.title}</div>

      {liveState.kind === 'before' && (
        <>
          <div className={styles.nowLabel}>오늘 첫 일정까지</div>
          <div className={styles.countdown}>{liveState.minutesUntilStart}분 남음</div>
          <div className={styles.nextCard}>
            <div className={styles.nextLabel}>첫 장소</div>
            <div className={styles.nextName}>
              {placeById.get(liveState.first.block.placeId ?? '')?.name ?? '-'}
            </div>
          </div>
        </>
      )}

      {liveState.kind === 'at' && (
        <>
          <div className={styles.nowLabel}>지금 여기</div>
          <div className={styles.nowName}>
            {placeById.get(liveState.entry.block.placeId ?? '')?.name ?? '-'}
          </div>
          <div className={styles.countdown}>{liveState.minutesUntilLeave}분 후 출발</div>
          <DelayStepper
            delayMin={liveState.entry.block.delayMin ?? 0}
            plannedArriveAt={
              // 원래 계획 도착 시각 = 현재 delayMin을 제거한 시각
              addMinutes(liveState.entry.arriveAt, -(liveState.entry.block.delayMin ?? 0))
            }
            onChange={(delayMin) => handleSetDelay(liveState.entry.block.id, delayMin)}
          />
          {liveState.next && (
            <div className={styles.nextCard}>
              <div className={styles.nextLabel}>다음</div>
              <div className={styles.nextName}>
                {placeById.get(liveState.next.block.placeId ?? '')?.name ?? '-'}
              </div>
            </div>
          )}
          <div className={styles.spacer} />
          <div className={styles.buttonRow}>
            <button
              className={styles.primaryButton}
              onClick={() => handleCheckoff(liveState.entry.block.id)}
            >
              여기 완료
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() =>
                openDirections(
                  liveState.next?.block.placeId ? placeById.get(liveState.next.block.placeId) : undefined,
                )
              }
            >
              길찾기
            </button>
          </div>
        </>
      )}

      {liveState.kind === 'traveling' && (
        <>
          <div className={styles.nowLabel}>이동 중 · 다음 장소</div>
          <div className={styles.nowName}>
            {placeById.get(liveState.to.block.placeId ?? '')?.name ?? '-'}
          </div>
          <div className={styles.countdown}>{liveState.minutesUntilArrival}분 후 도착</div>
          <div className={styles.spacer} />
          <div className={styles.buttonRow}>
            <button
              className={styles.primaryButton}
              onClick={() =>
                openDirections(
                  liveState.to.block.placeId ? placeById.get(liveState.to.block.placeId) : undefined,
                )
              }
            >
              길찾기
            </button>
          </div>
        </>
      )}

      {liveState.kind === 'done' && (
        <div className={styles.doneCard}>
          <div className={styles.nowName}>오늘 일정 완료</div>
          <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>수고하셨습니다</p>
        </div>
      )}

      {checkoffBlock && checkoffPlace && (
        <VisitEntrySheet
          placeName={checkoffPlace.name}
          onSave={handleSaveVisit}
          onSkip={() => setCheckoffBlockId(null)}
        />
      )}
    </div>
  );
}

/** C2: 지연 분 입력. ±5분 스텝퍼 또는 현재 시각 기준 자동 계산. */
function DelayStepper({
  delayMin,
  plannedArriveAt,
  onChange,
}: {
  delayMin: number;
  plannedArriveAt: Date;
  onChange: (delayMin: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ color: 'var(--ink-muted)' }}>지연</span>
      <button
        type="button"
        onClick={() => onChange(delayMin - 5)}
        style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '4px 10px' }}
      >
        −5분
      </button>
      <span className="num" style={{ minWidth: 40, textAlign: 'center' }}>
        {delayMin}분
      </span>
      <button
        type="button"
        onClick={() => onChange(delayMin + 5)}
        style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '4px 10px' }}
      >
        +5분
      </button>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, differenceInMinutes(new Date(), plannedArriveAt)))}
        style={{
          border: '1px solid var(--line)',
          borderRadius: 6,
          padding: '4px 10px',
          color: 'var(--ink-muted)',
        }}
      >
        지금 기준
      </button>
    </div>
  );
}
