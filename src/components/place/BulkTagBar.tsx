import { useState } from 'react';
import { TAG_SUGGESTIONS } from '../../domain/tags';
import styles from './BulkTagBar.module.css';

type TagAction = 'add' | 'remove';

interface BulkTagBarProps {
  selectedCount: number;
  onApply: (tag: string, action: TagAction) => void;
  onDone: () => void;
}

/** A6: 다중 선택된 장소에 태그를 한 번에 추가/제거합니다. 지도·재방문 탭에서 공유합니다. */
export function BulkTagBar({ selectedCount, onApply, onDone }: BulkTagBarProps) {
  const [mode, setMode] = useState<TagAction>('add');
  const [custom, setCustom] = useState('');

  function applyCustom() {
    if (!custom.trim()) return;
    onApply(custom.trim(), mode);
    setCustom('');
  }

  return (
    <div className={styles.bar}>
      <div className={styles.topRow}>
        <span>{selectedCount}곳 선택됨</span>
        <div className={styles.modeButtons}>
          <button
            className={`${styles.modeButton} ${mode === 'add' ? styles.modeButtonActive : ''}`}
            onClick={() => setMode('add')}
          >
            추가
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'remove' ? styles.modeButtonActive : ''}`}
            onClick={() => setMode('remove')}
          >
            제거
          </button>
        </div>
        <button className={styles.doneButton} onClick={onDone}>
          완료
        </button>
      </div>
      <div className={styles.chips}>
        {TAG_SUGGESTIONS.map((tag) => (
          <button key={tag} className={styles.chip} onClick={() => onApply(tag, mode)}>
            {mode === 'add' ? '+' : '−'} {tag}
          </button>
        ))}
      </div>
      <div className={styles.customRow}>
        <input
          className={styles.customInput}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="직접 입력"
          onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
        />
        <button className={styles.applyButton} onClick={applyCustom}>
          적용
        </button>
      </div>
    </div>
  );
}
