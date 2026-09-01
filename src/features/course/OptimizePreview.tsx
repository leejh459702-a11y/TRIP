import type { Block, Place } from '../../domain/types';
import styles from './OptimizePreview.module.css';

function blockLabel(block: Block, placeById: ReadonlyMap<string, Place>): string {
  if (block.type === 'free') return block.label || '자유시간';
  if (!block.placeId) return '(빈 슬롯)';
  return placeById.get(block.placeId)?.name ?? '(삭제된 장소)';
}

function formatKm(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

interface OptimizePreviewProps {
  beforeBlocks: Block[];
  afterBlocks: Block[];
  placeById: ReadonlyMap<string, Place>;
  beforeDistanceM: number;
  afterDistanceM: number;
  onApply: () => void;
  onCancel: () => void;
}

/** B6: 자동 최적화 결과를 적용 전에 보여주는 미리보기 시트. */
export function OptimizePreview({
  beforeBlocks,
  afterBlocks,
  placeById,
  beforeDistanceM,
  afterDistanceM,
  onApply,
  onCancel,
}: OptimizePreviewProps) {
  const savedM = beforeDistanceM - afterDistanceM;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>이렇게 바뀝니다</div>

        {beforeDistanceM > 0 && (
          <div className={styles.distanceRow}>
            이동 거리 {formatKm(beforeDistanceM)}
            <span className={styles.distanceArrow}>→</span>
            {formatKm(afterDistanceM)}
            {savedM > 0 && ` (약 ${formatKm(savedM)} 절약)`}
          </div>
        )}

        <div className={styles.columns}>
          <div className={styles.column}>
            <div className={styles.columnLabel}>변경 전</div>
            {beforeBlocks.map((b, i) => (
              <div key={b.id} className={styles.step}>
                <span className={styles.stepIndex}>{i + 1}</span>
                <span className={styles.stepName}>{blockLabel(b, placeById)}</span>
              </div>
            ))}
          </div>
          <div className={styles.column}>
            <div className={styles.columnLabel}>변경 후</div>
            {afterBlocks.map((b, i) => {
              const moved = beforeBlocks[i]?.id !== b.id;
              return (
                <div key={b.id} className={`${styles.step} ${moved ? styles.stepMoved : ''}`}>
                  <span className={styles.stepIndex}>{i + 1}</span>
                  <span className={styles.stepName}>{blockLabel(b, placeById)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelButton} type="button" onClick={onCancel}>
            취소
          </button>
          <button className={styles.applyButton} type="button" onClick={onApply}>
            이 순서로 적용
          </button>
        </div>
      </div>
    </div>
  );
}
