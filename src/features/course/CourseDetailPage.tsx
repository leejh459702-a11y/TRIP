import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { addDays, differenceInMinutes, format } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { usePlacesStore } from '../../store/placesStore';
import { useCoursesStore } from '../../store/coursesStore';
import { useVisitsStore } from '../../store/visitsStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { Block, Course, CourseDay, RouteLeg } from '../../domain/types';
import {
  createDay,
  createFreeBlock,
  createPlaceBlock,
  createTemplateFrom,
  fillSlot,
  removeBlockById,
  swapBlockPlace,
  updateBlock as patchBlock,
} from '../../domain/course';
import { computeTimeline, newWarningBlockIds, withoutDelay, type ResolvedBlock } from '../../domain/timeline';
import { buildSharedSnapshot, generateShareToken } from '../../domain/share';
import { generateIcs } from '../../domain/ics';
import { getRoutingProvider } from '../../services/routing';
import { computeLegsForDay } from '../../services/legs';
import { publishShareSnapshot, revokeShareSnapshot } from '../../services/share';
import { BlockList } from './BlockList';
import { TimelineView } from './TimelineView';
import { CourseMapView } from './CourseMapView';
import { AddBlockPanel } from './AddBlockPanel';
import { ExternalMapButton } from './ExternalMapButton';
import { VisitEntrySheet, type VisitEntryValues } from './VisitEntrySheet';
import { DayTabs } from './DayTabs';
import { SharePanel } from './SharePanel';
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
  const createFromObject = useCoursesStore((s) => s.createFromObject);
  const visits = useVisitsStore((s) => s.visits);
  const subscribeVisits = useVisitsStore((s) => s.subscribe);
  const recordVisit = useVisitsStore((s) => s.recordVisit);
  const longTransferThresholdMin = useSettingsStore((s) => s.longTransferThresholdMin);
  const subscribeSettings = useSettingsStore((s) => s.subscribe);

  const [view, setView] = useState<ViewMode>('block');
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [legsByDay, setLegsByDay] = useState<Map<string, Map<string, RouteLeg>>>(new Map());
  const [checkoffBlockId, setCheckoffBlockId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubPlaces = subscribePlaces(uid);
    const unsubCourses = subscribeCourses(uid);
    const unsubVisits = subscribeVisits(uid);
    const unsubSettings = subscribeSettings(uid);
    return () => {
      unsubPlaces();
      unsubCourses();
      unsubVisits();
      unsubSettings();
    };
  }, [uid, subscribePlaces, subscribeCourses, subscribeVisits, subscribeSettings]);

  const course = courses.find((c) => c.id === courseId);
  const day = course?.days.find((d) => d.id === activeDayId) ?? course?.days[0];
  const blocks = useMemo(() => day?.blocks ?? [], [day]);
  const legs = (day && legsByDay.get(day.id)) || new Map<string, RouteLeg>();

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const resolvedBlocks: ResolvedBlock[] = useMemo(
    () =>
      blocks.map((b) => ({
        block: b,
        place: b.placeId ? placeById.get(b.placeId) : undefined,
      })),
    [blocks, placeById],
  );

  // B9: 모든 날짜의 구간을 계산해 두어야 날짜별 요약(이동/체류/장소수)이 정확합니다.
  // H2 규칙 5: 드롭 완료 후 300ms 디바운스, 드래그 중에는 조회하지 않음.
  useEffect(() => {
    if (!uid || !course) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const provider = getRoutingProvider(uid);
      Promise.all(
        course.days.map(async (d) => {
          const resolved: ResolvedBlock[] = d.blocks.map((b) => ({
            block: b,
            place: b.placeId ? placeById.get(b.placeId) : undefined,
          }));
          const dayLegs = await computeLegsForDay(resolved, provider).catch(
            () => new Map<string, RouteLeg>(),
          );
          return [d.id, dayLegs] as const;
        }),
      ).then((entries) => setLegsByDay(new Map(entries)));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [uid, course, placeById]);

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

  function patchDay(patch: Partial<CourseDay>) {
    if (!uid || !course || !day) return;
    const nextCourse: Course = {
      ...course,
      days: course.days.map((d) => (d.id === day.id ? { ...d, ...patch } : d)),
    };
    void saveCourse(uid, nextCourse);
  }

  function handleAddDay() {
    if (!uid || !course) return;
    const lastDay = course.days[course.days.length - 1];
    const nextDate = lastDay ? format(addDays(new Date(lastDay.date), 1), 'yyyy-MM-dd') : course.startDate;
    const newDay = createDay(nextDate);
    void saveCourse(uid, { ...course, days: [...course.days, newDay] });
    setActiveDayId(newDay.id);
  }

  function handleMoveBlockToDay(blockId: string, targetDayId: string) {
    if (!uid || !course || !day || targetDayId === day.id) return;
    const moving = blocks.find((b) => b.id === blockId);
    if (!moving) return;
    const nextCourse: Course = {
      ...course,
      days: course.days.map((d) => {
        if (d.id === day.id) return { ...d, blocks: removeBlockById(d.blocks, blockId) };
        if (d.id === targetDayId) return { ...d, blocks: [...d.blocks, moving] };
        return d;
      }),
    };
    void saveCourse(uid, nextCourse);
  }

  async function handleCreateShareLink() {
    if (!uid || !course) return;
    const token = generateShareToken();
    const snapshot = buildSharedSnapshot(uid, course, legsByDay, (d) =>
      d.blocks.map((b) => ({ block: b, place: b.placeId ? placeById.get(b.placeId) : undefined })),
    );
    await publishShareSnapshot(token, snapshot);
    await saveCourse(uid, { ...course, shareToken: token });
  }

  async function handleRevokeShareLink() {
    if (!uid || !course?.shareToken) return;
    await revokeShareSnapshot(course.shareToken);
    await saveCourse(uid, { ...course, shareToken: undefined });
  }

  function handleExportIcs() {
    if (!course) return;
    const days = course.days.map((d) => {
      const resolved: ResolvedBlock[] = d.blocks.map((b) => ({
        block: b,
        place: b.placeId ? placeById.get(b.placeId) : undefined,
      }));
      const dayLegs = legsByDay.get(d.id) ?? new Map();
      const { entries } = computeTimeline(d, resolved, dayLegs);
      return { entries, resolved };
    });
    const ics = generateIcs(course.title, days);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course.title}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSaveAsTemplate() {
    if (!uid || !course) return;
    const name = window.prompt('템플릿 이름을 입력하세요', `${course.title} 템플릿`);
    if (!name?.trim()) return;
    await createFromObject(uid, createTemplateFrom(course, name.trim()));
    window.alert('템플릿으로 저장했습니다. 일정 탭에서 확인할 수 있어요.');
  }

  const usedPlaceIds = new Set(blocks.filter((b) => b.placeId).map((b) => b.placeId));
  const candidatePlaces = places.filter((p) => !usedPlaceIds.has(p.id));

  const timelineOptions = { longTransferThresholdMin };
  const timeline = computeTimeline(day, resolvedBlocks, legs, timelineOptions);
  // C2: 지연 때문에 새로 생긴 경고를 강조하기 위해 지연 없는 버전과 비교합니다.
  const timelineNoDelay = computeTimeline(day, withoutDelay(resolvedBlocks), legs, timelineOptions);
  const delayWarningBlockIds = newWarningBlockIds(timeline.entries, timelineNoDelay.entries);

  const recordedPlaceIds = new Set(
    visits.filter((v) => v.courseId === course.id).map((v) => v.placeId),
  );

  // B10: 전체 코스(모든 날짜) 예상 예산 합계.
  const totalCourseEstCost = course.days.reduce(
    (sum, d) => sum + d.blocks.reduce((s, b) => s + (b.estCost ?? 0), 0),
    0,
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
      cost: values.cost,
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

      <DayTabs
        days={course.days}
        activeDayId={day.id}
        onSelectDay={setActiveDayId}
        onAddDay={handleAddDay}
      />

      {totalCourseEstCost > 0 && (
        <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'var(--ink-muted)' }}>
          전체 예상 예산 <span className="num">{totalCourseEstCost.toLocaleString()}</span>원
        </div>
      )}

      <div className={styles.anchorRow}>
        <span>숙소</span>
        <select
          value={day.anchorPlaceId ?? ''}
          onChange={(e) => patchDay({ anchorPlaceId: e.target.value || undefined })}
        >
          <option value="">지정 안 함</option>
          {places
            .filter((p) => p.category === 'stay')
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </div>

      <ExternalMapButton blocks={blocks} places={places} />
      <SharePanel
        shareToken={course.shareToken}
        onCreate={handleCreateShareLink}
        onRevoke={handleRevokeShareLink}
      />
      <div style={{ padding: '0 16px 12px' }}>
        <button
          type="button"
          onClick={handleExportIcs}
          style={{
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          캘린더로 내보내기 (.ics)
        </button>
        <button
          type="button"
          onClick={handleSaveAsTemplate}
          style={{
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
            marginLeft: 6,
          }}
        >
          템플릿으로 저장
        </button>
      </div>

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
              otherDays={course.days.filter((d) => d.id !== day.id)}
              onMoveToDay={handleMoveBlockToDay}
              onSwapPlace={(blockId, replacement) =>
                persistBlocks(swapBlockPlace(blocks, blockId, replacement))
              }
              onFillSlot={(blockId, replacement) =>
                persistBlocks(fillSlot(blocks, blockId, replacement))
              }
            />
            <AddBlockPanel
              candidatePlaces={candidatePlaces}
              onAddPlace={(place) =>
                persistBlocks([...blocks, createPlaceBlock(place, course.partySize)])
              }
              onAddFree={() => persistBlocks([...blocks, createFreeBlock('자유시간')])}
            />
          </div>
        </div>
      )}

      {view === 'timeline' && (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <TimelineView
            entries={timeline.entries}
            totals={timeline.totals}
            places={places}
            delayWarningBlockIds={delayWarningBlockIds}
          />
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
          estCost={checkoffBlock.estCost}
          onSave={handleSaveVisit}
          onSkip={() => setCheckoffBlockId(null)}
        />
      )}
    </div>
  );
}
