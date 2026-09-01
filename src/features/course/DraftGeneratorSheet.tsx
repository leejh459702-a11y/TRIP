import { useState } from 'react';
import { format } from 'date-fns';
import { DRAFT_MIN_VISIT_COUNT, generateCourseDraft, hasEnoughVisitHistory } from '../../domain/draftGenerator';
import { TAG_GROUPS } from '../../domain/tags';
import type { CourseDay, Place } from '../../domain/types';
import styles from './DraftGeneratorSheet.module.css';

const COMPANION_TAGS = TAG_GROUPS['동행'] ?? [];

interface DraftGeneratorSheetProps {
  places: Place[];
  visitCount: number;
  onCreate: (input: { title: string; startDate: string; partySize: number; days: CourseDay[] }) => void;
  onClose: () => void;
}

/** G4: 저장 장소 + 방문 기록만으로 코스 초안을 만듭니다. 방문 30건 미만이면 안내만 보여줍니다. */
export function DraftGeneratorSheet({ places, visitCount, onCreate, onClose }: DraftGeneratorSheetProps) {
  const [sido, setSido] = useState('');
  const [companionTags, setCompanionTags] = useState<string[]>([]);
  const [partySize, setPartySize] = useState(2);
  const [days, setDays] = useState(1);
  const [budgetPerPerson, setBudgetPerPerson] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [draft, setDraft] = useState<ReturnType<typeof generateCourseDraft> | null>(null);

  const sidoOptions = Array.from(new Set(places.map((p) => p.region.sido).filter(Boolean))).sort();

  function toggleCompanion(tag: string) {
    setCompanionTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function handleGenerate() {
    const result = generateCourseDraft(places, {
      sido: sido || undefined,
      companionTags,
      partySize,
      days,
      budgetPerPerson: budgetPerPerson ? Number(budgetPerPerson) : undefined,
      startDate,
    });
    setDraft(result);
  }

  function handleConfirm() {
    if (!draft) return;
    onCreate({ title: `자동 생성 코스 초안`, startDate, partySize, days: draft.days });
  }

  if (!hasEnoughVisitHistory(visitCount)) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
          <div className={styles.title}>코스 초안 자동 생성</div>
          <div className={styles.gateWrap}>
            <div className={styles.gateCount}>
              {visitCount} / {DRAFT_MIN_VISIT_COUNT}
            </div>
            <div>기록이 더 필요합니다</div>
            <div style={{ fontSize: 12.5 }}>
              방문 기록이 {DRAFT_MIN_VISIT_COUNT}건 이상 쌓이면 검증된 저장 장소만으로 코스 초안을
              만들어 드려요. 외부 추천은 절대 섞지 않습니다.
            </div>
          </div>
          <button className={styles.cancelButton} type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>코스 초안 자동 생성</div>

        {!draft ? (
          <>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>지역</span>
              <select className={styles.select} value={sido} onChange={(e) => setSido(e.target.value)}>
                <option value="">전체 지역</option>
                {sidoOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>동행</span>
              <div className={styles.chips}>
                {COMPANION_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`${styles.chip} ${companionTags.includes(tag) ? styles.chipActive : ''}`}
                    onClick={() => toggleCompanion(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>인원</span>
                <input
                  type="number"
                  min={1}
                  className={styles.input}
                  value={partySize}
                  onChange={(e) => setPartySize(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>일수</span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  className={styles.input}
                  value={days}
                  onChange={(e) => setDays(Math.max(1, Math.min(14, Number(e.target.value))))}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>시작일</span>
                <input
                  type="date"
                  className={styles.input}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>1인당 예산대 (선택)</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="원"
                  className={styles.input}
                  value={budgetPerPerson}
                  onChange={(e) => setBudgetPerPerson(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.cancelButton} type="button" onClick={onClose}>
                취소
              </button>
              <button className={styles.primaryButton} type="button" onClick={handleGenerate}>
                초안 만들어보기
              </button>
            </div>
          </>
        ) : (
          <>
            {draft.warnings.map((w, i) => (
              <div key={i} className={styles.warning}>
                {w}
              </div>
            ))}

            {draft.days.map((d, i) => (
              <div key={d.id} className={styles.dayPreview}>
                <div className={styles.dayPreviewTitle}>
                  {i + 1}일차 · {d.date} · {d.blocks.length}곳
                </div>
                {d.blocks.map((b) => {
                  const p = b.placeId ? places.find((pl) => pl.id === b.placeId) : undefined;
                  return (
                    <div key={b.id} className={styles.previewStep}>
                      {p?.name ?? '(장소 없음)'}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className={styles.actions}>
              <button className={styles.cancelButton} type="button" onClick={() => setDraft(null)}>
                다시 설정
              </button>
              <button className={styles.primaryButton} type="button" onClick={handleConfirm}>
                이 초안으로 코스 만들기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
