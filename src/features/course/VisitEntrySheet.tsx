import { useState } from 'react';
import type { Revisit } from '../../domain/types';
import styles from './VisitEntrySheet.module.css';

const REVISIT_OPTIONS: { value: Revisit; label: string }[] = [
  { value: 'yes', label: '또 감' },
  { value: 'maybe', label: '고민' },
  { value: 'no', label: '안 감' },
];

const COMPANION_SUGGESTIONS = ['부모님', '연인', '친구', '혼자', '아이동반'];

export interface VisitEntryValues {
  revisit: Revisit;
  companions: string[];
  memo: string;
  cost?: number;
}

interface VisitEntrySheetProps {
  placeName: string;
  estCost?: number; // B10: 예상 비용 — 실제 비용 입력란의 기본값
  onSave: (values: VisitEntryValues) => void;
  onSkip: () => void;
}

/** C4: 블록 완료 시 올라오는 방문 기록 입력 시트 — 재방문판정/동행/메모 3항목(+선택: 실제 비용). */
export function VisitEntrySheet({ placeName, estCost, onSave, onSkip }: VisitEntrySheetProps) {
  const [revisit, setRevisit] = useState<Revisit>('yes');
  const [companions, setCompanions] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [cost, setCost] = useState(estCost != null ? String(estCost) : '');

  function toggleCompanion(name: string) {
    setCompanions((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  }

  return (
    <div className={styles.overlay} onClick={onSkip}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>{placeName} — 방문 기록</div>

        <div>
          <div className={styles.sectionLabel}>다시 갈래요?</div>
          <div className={styles.revisitRow}>
            {REVISIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.revisitButton} ${revisit === opt.value ? styles.revisitActive : ''}`}
                onClick={() => setRevisit(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className={styles.sectionLabel}>누구와</div>
          <div className={styles.chipRow}>
            {COMPANION_SUGGESTIONS.map((name) => (
              <button
                key={name}
                type="button"
                className={`${styles.chip} ${companions.includes(name) ? styles.chipActive : ''}`}
                onClick={() => toggleCompanion(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className={styles.sectionLabel}>한 줄 메모</div>
          <input
            className={styles.memoInput}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 웨이팅 40분"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <div className={styles.sectionLabel}>실제 비용 (선택)</div>
          <input
            type="number"
            min={0}
            className={styles.memoInput}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="원"
            style={{ width: '100%' }}
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.skipButton} type="button" onClick={onSkip}>
            건너뛰기
          </button>
          <button
            className={styles.saveButton}
            type="button"
            onClick={() =>
              onSave({ revisit, companions, memo, cost: cost ? Number(cost) : undefined })
            }
          >
            기록 저장
          </button>
        </div>
      </div>
    </div>
  );
}
