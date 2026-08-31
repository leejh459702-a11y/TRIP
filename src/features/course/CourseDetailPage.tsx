import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { differenceInMinutes } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { usePlacesStore } from '../../store/placesStore';
import { useCoursesStore } from '../../store/coursesStore';
import { useVisitsStore } from '../../store/visitsStore';
import type { Block, Course, RouteLeg } from '../../domain/types';
import {
  createFreeBlock,
  createPlaceBlock,
  removeBlockById,
  updateBlock as patchBlock,
} from '../../domain/course';
import { computeTimeline, type ResolvedBlock } from '../../domain/timeline';
import { getRoutingProvider } from '../../services/routing';
import { computeLegsForDay } from '../../services/legs';
import { BlockList } from './BlockList';
import { TimelineView } from './TimelineView';
import { CourseMapView } from './CourseMapView';
import { AddBlockPanel } from './AddBlockPanel';
import { ExternalMapButton } from './ExternalMapButton';
import { VisitEntrySheet, type VisitEntryValues } from './VisitEntrySheet';
import styles from './CourseDetailPage.module.css';

type ViewMode = 'block' | 'timeline' | 'map';

const VIEWS: { mode: ViewMode; label: string }[] = [
  { mode: 'block', label: '블록' },
  { mode: 'timeline', label: '타임라인' },
  { mode: 'map', label: '지도' },
];

export function CourseDetailPage() {
  const { courseId } = useParams();
  const uid = useAuthStore((s) => s.user?.uid);

  const places = usePlacesStore((s) => s.places);
  const subscribePlaces = usePlacesStore((s) => s.subscribe);
  const courses = useCoursesStore((s) => s.courses);
  const subscribeCourses = useCoursesStore((s) => s.subscribe);
  const saveCourse = useCoursesStore((s) => s.saveCourse);
  const visits = useVisitsStore((s) => s.visits);
  const subscribeVisits = useVisitsStore((s) => s.subscribe);
  const recordVisit = useVisitsStore((s) => s.recordVisit);

  const [view, setView] = useState<ViewMode>('block');
  const [legs, setLegs] = useState<Map<string, RouteLeg>>(new Map());
  const [checkoffBlockId, setCheckoffBlockId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubPlaces = subscribePlaces(uid);
    const unsubCourses = subscribeCourses(uid);
    const unsubVisits = subscribeVisits(uid);
    return () => {
      unsubPlaces();
      unsubCourses();
      unsubVisits();
    };
  }, [uid, subscribePlaces, subscribeCourses, subscribeVisits]);

  const course = courses.find((c) => c.id === courseId);
  const day = course?.days[0];
  const blocks = useMemo(() => day?.blocks ?? [], [day]);

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const resolvedBlocks: ResolvedBlock[] = useMemo(
    () =>
      blocks.map((b) => ({
        block: b,
        place: b.placeId ? placeById.get(b.placeId) : undefined,
      })),
    [blocks, placeById],
  );

  // H2 규칙 5: 드롭 완료 후 300ms 디바운스, 드래그 중에는 조회하지 않음.
  useEffect(() => {
    if (!uid || !day) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const provider = getRoutingProvider(uid);
      computeLegsForDay(resolvedBlocks, provider)
        .then(setLegs)
        .catch(() => setLegs(new Map()));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [uid, day, resolvedBlocks]);

  // E1: 장소별 가장 최근 방문 기록 (코스 무관, 전체 방문 이력 중 최신).
  const latestVisitByPlaceId = useMemo(() => {
    const map = new Map<string, (typeof visits)[number]>();
    for (const v of visits) {
      const existing = map.get(v.placeId);
      if (!existing || v.visitedAt > existing.visitedAt) map.set(v.placeId, v);
    }
    return map;
  }, [visits]);

  if (!course || !day) {
    return (
      <>
        <PageHeader title="코스" />
        <div style={{ padding: 16, color: 'var(--ink-muted)', fontSize: 13 }}>
          코스를 불러오는 중이거나 존재하지 않습니다.
        </div>
      </>
    );
  }

  function persistBlocks(nextBlocks: Block[]) {
    if (!uid || !course || !day) return;
    const nextCourse: Course = {
      ...course,
      days: course.days.map((d) => (d.id === day.id ? { ...d, blocks: nextBlocks } : d)),
    };
    void saveCourse(uid, nextCourse);
  }

  const usedPlaceIds = new Set(blocks.filter((b) => b.placeId).map((b) => b.placeId));
  const candidatePlaces = places.filter((p) => !usedPlaceIds.has(p.id));

  const timeline = computeTimeline(day, resolvedBlocks, legs);

  const recordedPlaceIds = new Set(
    visits.filter((v) => v.courseId === course.id).map((v) => v.placeId),
  );

  function handleCheckoff(blockId: string) {
    const nowIso = new Date().toISOString();
    persistBlocks(patchBlock(blocks, blockId, { done: true, doneAt: nowIso }));
    setCheckoffBlockId(blockId);
  }

  const checkoffBlock = blocks.find((b) => b.id === checkoffBlockId);
  const checkoffPlace = checkoffBlock?.placeId ? placeById.get(checkoffBlock.placeId) : undefined;

  function handleSaveVisit(values: VisitEntryValues) {
    if (!uid || !course || !checkoffBlock || !checkoffPlace || !checkoffBlock.doneAt) return;
    const idx = blocks.findIndex((b) => b.id === checkoffBlock.id);
    let stayMin: number | undefined;
    for (let i = idx - 1; i >= 0; i--) {
      const prev = blocks[i];
      if (prev?.done && prev.doneAt) {
        stayMin = differenceInMinutes(new Date(checkoffBlock.doneAt), new Date(prev.doneAt));
        break;
      }
    }
    void recordVisit(uid, {
      placeId: checkoffPlace.id,
      courseId: course.id,
      visitedAt: checkoffBlock.doneAt,
      revisit: values.revisit,
      companions: values.companions,
      memo: values.memo || undefined,
      stayMin,
      partySize: course.partySize,
    });
    setCheckoffBlockId(null);
  }

  return (
    <div className={styles.page}>
      <PageHeader title={course.title} />
      <div className={styles.segment}>
        {VIEWS.map((v) => (
          <button
            key={v.mode}
            className={`${styles.segmentButton} ${view === v.mode ? styles.segmentButtonActive : ''}`}
            onClick={() => setView(v.mode)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <ExternalMapButton blocks={blocks} places={places} />

      {view === 'block' && (
        <div className={styles.split}>
          <div className={styles.splitMapPane}>
            <CourseMapView blocks={blocks} places={places} />
          </div>
          <div className={styles.splitListPane}>
            <BlockList
              blocks={blocks}
              places={places}
              legs={legs}
              onReorder={persistBlocks}
              onUpdateBlock={(id, patch) => persistBlocks(patchBlock(blocks, id, patch))}
              onRemoveBlock={(id) => persistBlocks(removeBlockById(blocks, id))}
              onCheckoff={handleCheckoff}
              recordedPlaceIds={recordedPlaceIds}
              latestVisitByPlaceId={latestVisitByPlaceId}
            />
            <AddBlockPanel
              candidatePlaces={candidatePlaces}
              onAddPlace={(place) => persistBlocks([...blocks, createPlaceBlock(place)])}
              onAddFree={() => persistBlocks([...blocks, createFreeBlock('자유시간')])}
            />
          </div>
        </div>
      )}

      {view === 'timeline' && (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <TimelineView entries={timeline.entries} totals={timeline.totals} places={places} />
        </div>
      )}

      {view === 'map' && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <CourseMapView blocks={blocks} places={places} />
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
