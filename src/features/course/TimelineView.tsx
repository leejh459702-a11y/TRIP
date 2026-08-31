import { format } from 'date-fns';
import type { Place, TimelineEntry, TravelMode } from '../../domain/types';
import type { TimelineTotals } from '../../domain/timeline';
import styles from './TimelineView.module.css';

const MODE_ICON: Record<TravelMode, string> = { car: '🚗', transit: '🚌', walk: '🚶' };
const CATEGORY_ICON: Record<Place['category'], string> = {
  food: '🍜',
  cafe: '☕',
  stay: '🏨',
  activity: '🏛',
  etc: '📍',
};

const MIN_BLOCK_HEIGHT = 44;
const PX_PER_MIN = 0.8;

interface TimelineViewProps {
  entries: TimelineEntry[];
  totals: TimelineTotals;
  places: Place[];
}

/** 읽기 전용 타임라인 뷰 (9절: 편집 불가가 존재 이유). */
export function TimelineView({ entries, totals, places }: TimelineViewProps) {
  const placeById = new Map(places.map((p) => [p.id, p]));

  return (
    <div className={styles.wrap}>
      {entries.map((entry, i) => {
        const place = entry.block.placeId ? placeById.get(entry.block.placeId) : undefined;
        const barHeight = Math.max(MIN_BLOCK_HEIGHT, entry.block.stayMin * PX_PER_MIN);
        const legHeight = entry.legToNext
          ? Math.max(16, entry.legToNext.durationMin * PX_PER_MIN)
          : 0;

        return (
          <div key={entry.block.id}>
            <div className={styles.row}>
              <div className={`${styles.timeCol} num`}>{format(entry.arriveAt, 'HH:mm')}</div>
              <div className={styles.trackCol}>
                <div
                  className={`${styles.stayBar} ${entry.block.type === 'free' ? styles.freeBar : ''}`}
                  style={{ height: barHeight }}
                />
              </div>
              <div className={styles.body}>
                <div className={styles.blockHeader}>
                  <span className={styles.icon}>
                    {entry.block.type === 'free' ? '☁︎' : place ? CATEGORY_ICON[place.category] : '📍'}
                  </span>
                  <span className={styles.name}>
                    {entry.block.type === 'free'
                      ? entry.block.label || '자유시간'
                      : (place?.name ?? '(삭제된 장소)')}
                  </span>
                  <span className={`${styles.stayLabel} num`}>{entry.block.stayMin}분</span>
                </div>
                {entry.warnings.map((w, wi) => (
                  <div key={wi} className={styles.warning}>
                    ⚠️ {w.detail}
                  </div>
                ))}
              </div>
            </div>

            {entry.legToNext && i < entries.length - 1 && (
              <div className={styles.row}>
                <div className={styles.timeCol} />
                <div className={styles.trackCol}>
                  <div className={styles.legBar} style={{ height: legHeight }} />
                </div>
                <div className={styles.body}>
                  <div className={styles.legLabel}>
                    {MODE_ICON[entry.legToNext.mode]}{' '}
                    <span className="num">{entry.legToNext.durationMin}분</span>
                    {entry.legToNext.transitSummary ? ` · ${entry.legToNext.transitSummary}` : ''}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className={styles.summary}>
        총 이동 <span className="num">{totals.totalTravelMin}</span>분 · 체류{' '}
        <span className="num">{totals.totalStayMin}</span>분 · {totals.placeCount}곳
      </div>
    </div>
  );
}
