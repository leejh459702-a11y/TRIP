import type { Place } from '../../domain/types';
import { CATEGORY_COLOR_VAR } from '../../domain/category';
import styles from './AddBlockPanel.module.css';

interface AddBlockPanelProps {
  candidatePlaces: Place[];
  onAddPlace: (place: Place) => void;
  onAddFree: () => void;
}

export function AddBlockPanel({ candidatePlaces, onAddPlace, onAddFree }: AddBlockPanelProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.label}>이 자리에 넣을 장소</div>
      <div className={styles.chips}>
        {candidatePlaces.map((p) => (
          <button key={p.id} className={styles.chip} onClick={() => onAddPlace(p)}>
            <span className={styles.dot} style={{ background: CATEGORY_COLOR_VAR[p.category] }} />
            {p.name}
          </button>
        ))}
        {candidatePlaces.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            지도 탭에서 장소를 먼저 저장해 보세요
          </span>
        )}
      </div>
      <button className={styles.freeButton} onClick={onAddFree}>
        + 자유시간 블록 추가
      </button>
    </div>
  );
}
