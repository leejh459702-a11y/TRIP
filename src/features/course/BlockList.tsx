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
import type { Block, Place, RouteLeg, TravelMode } from '../../domain/types';
import { CATEGORY_COLOR_VAR } from '../../domain/category';
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
}

export function BlockList({
  blocks,
  places,
  legs,
  onReorder,
  onUpdateBlock,
  onRemoveBlock,
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
              />
              {i < blocks.length - 1 && <LegRow leg={legs.get(block.id)} mode={block.modeToNext} />}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
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
}

function SortableBlockCard({ block, place, onUpdate, onRemove }: SortableBlockCardProps) {
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
        ) : (
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
      </div>
      <button className={styles.removeButton} onClick={onRemove} aria-label="블록 삭제">
        ✕
      </button>
    </div>
  );
}
