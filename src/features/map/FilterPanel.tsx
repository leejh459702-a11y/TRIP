import { useState } from 'react';
import { TAG_SUGGESTIONS } from '../../domain/tags';
import type { PlaceFilter } from '../../domain/filter';
import type { SavedFilterPreset } from '../../store/settingsStore';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
  filter: PlaceFilter;
  onChange: (filter: PlaceFilter) => void;
  sidoOptions: string[];
  sigunguOptions: string[];
  presets: SavedFilterPreset[];
  onSavePreset: (name: string) => void;
  hasActiveFilter: boolean;
}

/** G1: 태그(AND) + 지역 조합 필터, 자주 쓰는 조합 저장. */
export function FilterPanel({
  filter,
  onChange,
  sidoOptions,
  sigunguOptions,
  presets,
  onSavePreset,
  hasActiveFilter,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  function toggleTag(tag: string) {
    const tags = filter.tags.includes(tag)
      ? filter.tags.filter((t) => t !== tag)
      : [...filter.tags, tag];
    onChange({ ...filter, tags });
  }

  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.toggle} ${hasActiveFilter ? styles.toggleActive : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        {hasActiveFilter ? `필터 적용됨 (${filter.tags.length + (filter.sido ? 1 : 0)})` : '상황 필터'}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.regionRow}>
            <select
              className={styles.select}
              value={filter.sido ?? ''}
              onChange={(e) => onChange({ ...filter, sido: e.target.value || undefined, sigungu: undefined })}
            >
              <option value="">전체 지역</option>
              {sidoOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {filter.sido && (
              <select
                className={styles.select}
                value={filter.sigungu ?? ''}
                onChange={(e) => onChange({ ...filter, sigungu: e.target.value || undefined })}
              >
                <option value="">전체 시군구</option>
                {sigunguOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className={styles.chips}>
            {TAG_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                className={`${styles.chip} ${filter.tags.includes(tag) ? styles.chipActive : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className={styles.presetRow}>
            <span className={styles.presetLabel}>저장된 조합</span>
            {presets.map((p) => (
              <button
                key={p.name}
                className={styles.chip}
                onClick={() => onChange({ tags: p.tags, sido: p.sido, sigungu: p.sigungu })}
              >
                {p.name}
              </button>
            ))}
            {hasActiveFilter && (
              <button
                className={styles.saveButton}
                onClick={() => {
                  const name = window.prompt('이 조합을 어떤 이름으로 저장할까요?');
                  if (name?.trim()) onSavePreset(name.trim());
                }}
              >
                이 조합 저장
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
