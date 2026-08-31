import { format } from 'date-fns';
import type { Place, TimelineEntry, TravelMode } from '../../domain/types';
import type { TimelineTotals } from '../../domain/timeline';
import { computeDensity, tooManyPlacesNotice } from '../../domain/density';
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
  /** C2: 지연 때문에 새로 발생한 경고가 있는 블록 id (강조 표시용). */
  delayWarningBlockIds?: ReadonlySet<string>;
}

/** 읽기 전용 타임라인 뷰 (9절: 편집 불가가 존재 이유). */
export function TimelineView({ entries, totals, places, delayWarningBlockIds }: TimelineViewProps) {
  const placeById = new Map(places.map((p) => [p.id, p]));

  return (
    <div className={styles.wrap}>
      {entries.map((entry, i) => {
        const place = entry.block.placeId ? placeById.get(entry.block.placeId) : undefined;
        const barHeight = Math.max(MIN_BLOCK_HEIGHT, entry.block.stayMin * PX_PER_MIN);
        const legHeight = entry.legToNext
          ? Math.max(16, entry.legToNext.durationMin * PX_PER_MIN)
          : 0;
        const legIsLong = entry.warnings.some((w) => w.kind === 'longTransfer');
        const causedByDelay = delayWarningBlockIds?.has(entry.block.id);

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
                {entry.block.delayMin != null && entry.block.delayMin !== 0 && (
                  <div className={styles.memo}>
                    ⏳ 지연 {entry.block.delayMin > 0 ? '+' : ''}
                    {entry.block.delayMin}분 반영됨
                  </div>
                )}
                {entry.block.type === 'place' && place && !place.businessHours && (
                  <div className={styles.memo}>⏱ 영업시간 미확인</div>
                )}
                {entry.warnings
                  .filter((w) => w.kind !== 'longTransfer')
                  .map((w, wi) => (
                    <div
                      key={wi}
                      className={`${styles.warning} ${causedByDelay ? styles.warningDelay : ''}`}
                    >
                      ⚠️ {w.detail}
                      {causedByDelay ? ' · 지연으로 새로 발생' : ''}
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
                  <div className={`${styles.legLabel} ${legIsLong ? styles.legLabelWarn : ''}`}>
                    {MODE_ICON[entry.legToNext.mode]}{' '}
                    <span className="num">{entry.legToNext.durationMin}분</span>
                    {entry.legToNext.transitSummary ? ` · ${entry.legToNext.transitSummary}` : ''}
                    {legIsLong ? ' · 이동 김' : ''}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <TimelineSummary entries={entries} totals={totals} />
    </div>
  );
}

function TimelineSummary({ entries, totals }: Pick<TimelineViewProps, 'entries' | 'totals'>) {
  const density = entries[0] ? computeDensity(totals, entries[0].arriveAt) : null;
  const notice = tooManyPlacesNotice(totals.placeCount);
  const travelHeavier = totals.totalStayMin > 0 && totals.totalTravelMin > totals.totalStayMin;

  return (
    <div className={styles.summary}>
      총 이동 <span className="num">{totals.totalTravelMin}</span>분 · 체류{' '}
      <span className="num">{totals.totalStayMin}</span>분 · {totals.placeCount}곳
      {totals.totalEstCost > 0 && (
        <>
          {' '}
          · 예상 <span className="num">{totals.totalEstCost.toLocaleString()}</span>원
        </>
      )}
      {density && (
        <div className={styles.densityRow}>
          빡빡함: {density.dots} {density.label}
        </div>
      )}
      {notice && (
        <div className={styles.densityRow} style={{ color: 'var(--warn)' }}>
          {notice}
        </div>
      )}
      {travelHeavier && (
        <div className={styles.densityRow} style={{ color: 'var(--warn)' }}>
          ⚠️ 오늘은 이동 시간이 체류 시간보다 깁니다
        </div>
      )}
    </div>
  );
}
