import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { usePlacesStore } from '../../store/placesStore';
import { useCoursesStore } from '../../store/coursesStore';
import type { Block, Course, RouteLeg } from '../../domain/types';
import {
  createFreeBlock,
  createPlaceBlock,
  removeBlockById,
  updateBlock as patchBlock,
} from '../../domain/course';
import { computeTimeline } from '../../domain/timeline';
import { getRoutingProvider } from '../../services/routing';
import { computeLegsForDay, type ResolvedBlock } from '../../services/legs';
import { BlockList } from './BlockList';
import { TimelineView } from './TimelineView';
import { CourseMapView } from './CourseMapView';
import { AddBlockPanel } from './AddBlockPanel';
import { ExternalMapButton } from './ExternalMapButton';
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

  const [view, setView] = useState<ViewMode>('block');
  const [legs, setLegs] = useState<Map<string, RouteLeg>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubPlaces = subscribePlaces(uid);
    const unsubCourses = subscribeCourses(uid);
    return () => {
      unsubPlaces();
      unsubCourses();
    };
  }, [uid, subscribePlaces, subscribeCourses]);

  const course = courses.find((c) => c.id === courseId);
  const day = course?.days[0];
  const blocks = useMemo(() => day?.blocks ?? [], [day]);

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  // H2 규칙 5: 드롭 완료 후 300ms 디바운스, 드래그 중에는 조회하지 않음.
  useEffect(() => {
    if (!uid || !day) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const provider = getRoutingProvider(uid);
      const resolved: ResolvedBlock[] = blocks.map((b) => ({
        block: b,
        place: b.placeId ? placeById.get(b.placeId) : undefined,
      }));
      computeLegsForDay(resolved, provider)
        .then(setLegs)
        .catch(() => setLegs(new Map()));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [uid, day, blocks, placeById]);

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

  const timeline = computeTimeline(day, blocks, legs);

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
    </div>
  );
}
