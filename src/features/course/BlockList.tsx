import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { useState } from 'react';
import type { Block, CourseDay, Place, RouteLeg, TravelMode, Visit } from '../../domain/types';
import { CATEGORY_COLOR_VAR } from '../../domain/category';
import { nearestPlaces } from '../../domain/course';
import styles from './BlockList.module.css';

const MODE_LABEL: Record<TravelMode, string> = { car: '자동차', transit: '대중교통', walk: '도보' };
const MODE_ICON: Record<TravelMode, string> = { car: '🚗', transit: '🚌', walk: '🚶' };

interface BlockListProps {
  blocks: Block[];
  places: Place[];
  legs: ReadonlyMap<string, RouteLeg>;
  onReorder: (nextBlocks: Block[]) => void;
  onUpdateBlock: (blockId: string, patch: Partial<Block>) => void;
  onRemoveBlock: (blockId: string) => void;
  onCheckoff?: (blockId: string) => void;
  recordedPlaceIds?: ReadonlySet<string>;
  latestVisitByPlaceId?: ReadonlyMap<string, Visit>;
  otherDays?: CourseDay[];
  onMoveToDay?: (blockId: string, targetDayId: string) => void;
  onSwapPlace?: (blockId: string, replacement: Place) => void;
}

export function BlockList({
  blocks,
  places,
  legs,
  onReorder,
  onUpdateBlock,
  onRemoveBlock,
  onCheckoff,
  recordedPlaceIds,
  latestVisitByPlaceId,
  otherDays,
  onMoveToDay,
  onSwapPlace,
}: BlockListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(blocks, oldIndex, newIndex));
  }

  const placeById = new Map(places.map((p) => [p.id, p]));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className={styles.list}>
          {blocks.map((block, i) => (
            <div key={block.id}>
              <SortableBlockCard
                block={block}
                place={block.placeId ? placeById.get(block.placeId) : undefined}
                onUpdate={(patch) => onUpdateBlock(block.id, patch)}
                onRemove={() => onRemoveBlock(block.id)}
                onCheckoff={onCheckoff ? () => onCheckoff(block.id) : undefined}
                recorded={block.placeId ? recordedPlaceIds?.has(block.placeId) : undefined}
                latestVisit={block.placeId ? latestVisitByPlaceId?.get(block.placeId) : undefined}
                otherDays={otherDays}
                onMoveToDay={onMoveToDay ? (dayId) => onMoveToDay(block.id, dayId) : undefined}
                allPlaces={places}
                onSwapPlace={onSwapPlace ? (replacement) => onSwapPlace(block.id, replacement) : undefined}
              />
              {i < blocks.length - 1 && <LegRow leg={legs.get(block.id)} mode={block.modeToNext} />}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/** E1: 코스에 장소를 추가하면 그 장소의 마지막 방문 기록을 블록 카드에 자동 표시합니다. */
function RevisitNote({ visit }: { visit: Visit }) {
  const parts = [format(new Date(visit.visitedAt), 'yyyy.MM')];
  if (visit.companions.length > 0) parts.push(visit.companions.join(', '));
  if (visit.auto.stayMin != null) parts.push(`체류 ${visit.auto.stayMin}분`);
  return (
    <div className={styles.revisitNote}>
      <div>ⓘ 지난 방문 {parts.join(' · ')}</div>
      {visit.memo && <div>&ldquo;{visit.memo}&rdquo;</div>}
    </div>
  );
}

function LegRow({ leg, mode }: { leg?: RouteLeg; mode?: TravelMode }) {
  if (!mode) return null;
  return (
    <div className={styles.legRow}>
      <span>{MODE_ICON[mode]}</span>
      <span className="num">{leg ? `${leg.durationMin}분` : '계산 중…'}</span>
      {leg?.transitSummary && <span>· {leg.transitSummary}</span>}
    </div>
  );
}

interface SortableBlockCardProps {
  block: Block;
  place?: Place;
  onUpdate: (patch: Partial<Block>) => void;
  onRemove: () => void;
  onCheckoff?: () => void;
  recorded?: boolean;
  latestVisit?: Visit;
  otherDays?: CourseDay[];
  onMoveToDay?: (dayId: string) => void;
  allPlaces: Place[];
  onSwapPlace?: (replacement: Place) => void;
}

function SortableBlockCard({
  block,
  place,
  onUpdate,
  onRemove,
  onCheckoff,
  recorded,
  latestVisit,
  otherDays,
  onMoveToDay,
  allPlaces,
  onSwapPlace,
}: SortableBlockCardProps) {
  const [showPlanB, setShowPlanB] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
    >
      <span className={styles.handle} {...attributes} {...listeners}>
        ⠿
      </span>
      <span
        className={styles.dot}
        style={{ background: place ? CATEGORY_COLOR_VAR[place.category] : 'var(--free)' }}
      />
      <div className={styles.main}>
        {block.type === 'place' ? (
          <div className={styles.name}>{place?.name ?? '(삭제된 장소)'}</div>
        ) : null}
        {block.type === 'place' && latestVisit && <RevisitNote visit={latestVisit} />}
        {block.type === 'free' && (
          <input
            className={styles.freeLabelInput}
            value={block.label ?? ''}
            placeholder="자유시간 라벨"
            onChange={(e) => onUpdate({ label: e.target.value })}
          />
        )}
        <div className={styles.row}>
          <span>체류</span>
          <input
            type="number"
            className={`${styles.stayInput} num`}
            value={block.stayMin}
            min={0}
            step={5}
            onChange={(e) => onUpdate({ stayMin: Math.max(0, Number(e.target.value)) })}
          />
          <span>분</span>
          {block.type === 'place' && (
            <div className={styles.modeButtons}>
              {(['car', 'transit', 'walk'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.modeButton} ${block.modeToNext === m ? styles.modeButtonActive : ''}`}
                  onClick={() => onUpdate({ modeToNext: m })}
                >
                  {MODE_ICON[m]} {MODE_LABEL[m]}
                </button>
              ))}
            </div>
          )}
        </div>
        {block.type === 'place' && onCheckoff && (
          <div className={styles.row}>
            <button
              type="button"
              className={`${styles.modeButton} ${block.done ? styles.modeButtonActive : ''}`}
              onClick={onCheckoff}
            >
              {block.done ? '완료됨' : '여기 완료'}
            </button>
            {block.done && recorded === false && (
              <span style={{ color: 'var(--warn)' }}>· 미기록</span>
            )}
          </div>
        )}
        {block.type === 'place' && place && onSwapPlace && (
          <>
            <button
              type="button"
              className={styles.planBToggle}
              onClick={() => setShowPlanB((v) => !v)}
            >
              {showPlanB ? '대체 후보 닫기' : 'Plan B 대체 후보'}
            </button>
            {showPlanB && (
              <div className={styles.planBList}>
                {nearestPlaces(place, allPlaces, 3).map((candidate) => (
                  <div className={styles.planBRow} key={candidate.id}>
                    <span
                      className={styles.dot}
                      style={{ background: CATEGORY_COLOR_VAR[candidate.category] }}
                    />
                    <span className={styles.planBName}>{candidate.name}</span>
                    <button
                      type="button"
                      className={styles.planBSwap}
                      onClick={() => {
                        onSwapPlace(candidate);
                        setShowPlanB(false);
                      }}
                    >
                      여기로 교체
                    </button>
                  </div>
                ))}
                {nearestPlaces(place, allPlaces, 3).length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    대체할 만한 저장된 장소가 없습니다
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {otherDays && otherDays.length > 0 && onMoveToDay && (
          <select
            className={styles.stayInput}
            value=""
            onChange={(e) => e.target.value && onMoveToDay(e.target.value)}
            style={{ width: 'auto', marginTop: 6 }}
          >
            <option value="">다른 날로 이동…</option>
            {otherDays.map((d) => (
              <option key={d.id} value={d.id}>
                {d.date}
              </option>
            ))}
          </select>
        )}
      </div>
      <button className={styles.removeButton} onClick={onRemove} aria-label="블록 삭제">
        ✕
      </button>
    </div>
  );
}
