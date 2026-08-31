import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { EmptyState } from '../../components/ui/EmptyState';
import { BulkTagBar } from '../../components/place/BulkTagBar';
import { FilterPanel } from './FilterPanel';
import { usePlacesStore } from '../../store/placesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { CATEGORY_COLOR_VAR, CATEGORY_ICON, CATEGORY_LABEL } from '../../domain/category';
import { filterPlaces, isEmptyFilter, type PlaceFilter } from '../../domain/filter';
import type { Place } from '../../domain/types';
import styles from './MapPage.module.css';

export function SavedPlacesSection({ uid, places }: { uid?: string; places: Place[] }) {
  const addTags = usePlacesStore((s) => s.addTags);
  const removeTags = usePlacesStore((s) => s.removeTags);
  const removePlace = usePlacesStore((s) => s.removePlace);
  const presets = useSettingsStore((s) => s.savedFilterPresets);
  const updateSettings = useSettingsStore((s) => s.update);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<PlaceFilter>({ tags: [] });
  const [unvisitedOnly, setUnvisitedOnly] = useState(false); // G3

  const sidoOptions = useMemo(
    () => Array.from(new Set(places.map((p) => p.region.sido).filter(Boolean))).sort(),
    [places],
  );
  const sigunguOptions = useMemo(
    () =>
      Array.from(
        new Set(
          places
            .filter((p) => !filter.sido || p.region.sido === filter.sido)
            .map((p) => p.region.sigungu)
            .filter(Boolean),
        ),
      ).sort(),
    [places, filter.sido],
  );

  const baseFiltered = useMemo(() => filterPlaces(places, filter), [places, filter]);
  const shownPlaces = useMemo(() => {
    if (!unvisitedOnly) return baseFiltered;
    // G3: 저장했지만 방문 기록이 없는 장소, 저장 후 경과일(오래된 순)
    return baseFiltered
      .filter((p) => p.visitCount === 0)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [baseFiltered, unvisitedOnly]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSavePreset(name: string) {
    if (!uid) return;
    void updateSettings(uid, { savedFilterPresets: [...presets, { ...filter, name }] });
  }

  async function handleCleanup() {
    if (!uid || selectedIds.size === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.size}곳을 삭제할까요?`)) return;
    await Promise.all(Array.from(selectedIds).map((id) => removePlace(uid, id)));
    setSelectedIds(new Set());
  }

  if (places.length === 0) {
    return (
      <EmptyState
        title="저장된 장소가 없습니다"
        description="지도에서 마음에 든 곳을 검색해서 저장해 보세요"
      />
    );
  }

  return (
    <>
      <FilterPanel
        filter={filter}
        onChange={setFilter}
        sidoOptions={sidoOptions}
        sigunguOptions={sigunguOptions}
        presets={presets}
        onSavePreset={handleSavePreset}
        hasActiveFilter={!isEmptyFilter(filter)}
      />

      <div className={styles.results}>
        <div className={styles.sectionLabel}>
          {unvisitedOnly ? '미방문' : '저장한 장소'} {shownPlaces.length}곳
          {!isEmptyFilter(filter) && ` / 전체 ${places.length}곳`}
          <button
            className={styles.selectToggle}
            onClick={() => setUnvisitedOnly((v) => !v)}
            style={{ marginLeft: 'auto', marginRight: 6 }}
          >
            {unvisitedOnly ? '전체 보기' : '미방문만'}
          </button>
          <button
            className={styles.selectToggle}
            onClick={() => {
              setSelectMode((v) => !v);
              setSelectedIds(new Set());
            }}
          >
            {selectMode ? '선택 취소' : '선택'}
          </button>
        </div>

        {shownPlaces.length === 0 && (
          <EmptyState
            title={unvisitedOnly ? '미방문 장소가 없습니다' : '조건에 맞는 장소가 없습니다'}
            description={unvisitedOnly ? '전부 다녀왔네요' : '필터를 조정해 보세요'}
          />
        )}

        {shownPlaces.map((p) => {
          const selected = selectedIds.has(p.id);
          const elapsedDays = differenceInDays(new Date(), new Date(p.createdAt));
          const row = (
            <>
              {selectMode && (
                <input type="checkbox" checked={selected} readOnly className={styles.checkbox} />
              )}
              <span className={styles.dot} style={{ background: CATEGORY_COLOR_VAR[p.category] }}>
                {CATEGORY_ICON[p.category]}
              </span>
              <div className={styles.rowMain}>
                <div className={styles.rowName}>{p.name}</div>
                <div className={styles.rowMeta}>
                  {CATEGORY_LABEL[p.category]} · {p.region.sido} {p.region.sigungu}
                  {unvisitedOnly ? ` · 저장 후 ${elapsedDays}일` : ''}
                  {!p.businessHours && ' · 영업시간 미확인'}
                </div>
              </div>
            </>
          );
          return selectMode ? (
            <button key={p.id} className={styles.row} onClick={() => toggleSelect(p.id)}>
              {row}
            </button>
          ) : (
            <Link className={styles.row} key={p.id} to={`/place/${p.id}`}>
              {row}
            </Link>
          );
        })}
      </div>

      {selectMode && selectedIds.size > 0 && uid && unvisitedOnly && (
        <div style={{ padding: '0 16px 16px' }}>
          <button onClick={handleCleanup} className="btn btn-sm btn-danger">
            선택한 {selectedIds.size}곳 이만 정리하기
          </button>
        </div>
      )}

      {selectMode && selectedIds.size > 0 && uid && !unvisitedOnly && (
        <BulkTagBar
          selectedCount={selectedIds.size}
          onApply={(tag, action) => {
            const ids = Array.from(selectedIds);
            void (action === 'add' ? addTags(uid, ids, [tag]) : removeTags(uid, ids, [tag]));
          }}
          onDone={() => {
            setSelectMode(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </>
  );
}
