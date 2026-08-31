import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KakaoMapView, type MapMarkerSpec } from '../../components/map/KakaoMapView';
import { SavedPlacesSection } from './SavedPlacesSection';
import { useAuthStore } from '../../store/authStore';
import { usePlacesStore } from '../../store/placesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { searchKeyword, type KeywordSearchResult } from '../../services/kakao/local';
import { CATEGORY_COLOR_VAR, CATEGORY_ICON, CATEGORY_LABEL, guessCategory } from '../../domain/category';
import styles from './MapPage.module.css';

export function MapPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const places = usePlacesStore((s) => s.places);
  const subscribe = usePlacesStore((s) => s.subscribe);
  const addFromSearch = usePlacesStore((s) => s.addFromSearch);
  const subscribeSettings = useSettingsStore((s) => s.subscribe);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KeywordSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribe(uid);
    const unsubSettings = subscribeSettings(uid);
    return () => {
      unsub();
      unsubSettings();
    };
  }, [uid, subscribe, subscribeSettings]);

  const savedKakaoIds = useMemo(
    () => new Set(places.map((p) => p.kakaoPlaceId).filter(Boolean)),
    [places],
  );

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await searchKeyword(query.trim());
      setResults(res);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  }

  async function handleSave(result: KeywordSearchResult) {
    if (!uid) return;
    setSavingId(result.kakaoPlaceId);
    try {
      await addFromSearch(uid, result);
    } finally {
      setSavingId(null);
    }
  }

  const showingResults = results.length > 0;
  const markers: MapMarkerSpec[] = showingResults
    ? results.map((r) => ({
        id: r.kakaoPlaceId,
        lat: r.lat,
        lng: r.lng,
        color: CATEGORY_COLOR_VAR[guessCategory(r.category)],
        label: '',
      }))
    : places.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        color: CATEGORY_COLOR_VAR[p.category],
        label: '',
      }));

  return (
    <div className={styles.page}>
      <PageHeader title="지도" />
      <form className={styles.searchBar} onSubmit={handleSearch}>
        <input
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 강릉 카페"
        />
        <button className={styles.button} type="submit" disabled={searching}>
          {searching ? '검색 중…' : '검색'}
        </button>
      </form>

      <div className={styles.mapWrap}>
        <KakaoMapView markers={markers} />
      </div>

      {searchError && (
        <div style={{ padding: 12, color: 'var(--warn)', fontSize: 13 }}>{searchError}</div>
      )}

      {showingResults ? (
        <div className={styles.results}>
          <div className={styles.sectionLabel}>검색 결과 {results.length}곳</div>
          {results.map((r) => {
            const category = guessCategory(r.category);
            const saved = savedKakaoIds.has(r.kakaoPlaceId);
            return (
              <div className={styles.row} key={r.kakaoPlaceId}>
                <span className={styles.dot} style={{ background: CATEGORY_COLOR_VAR[category] }}>
                  {CATEGORY_ICON[category]}
                </span>
                <div className={styles.rowMain}>
                  <div className={styles.rowName}>{r.name}</div>
                  <div className={styles.rowMeta}>
                    {CATEGORY_LABEL[category]} · {r.address}
                  </div>
                </div>
                <button
                  className={styles.saveButton}
                  disabled={saved || savingId === r.kakaoPlaceId}
                  onClick={() => handleSave(r)}
                >
                  {saved ? '저장됨' : savingId === r.kakaoPlaceId ? '저장 중…' : '저장'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <SavedPlacesSection uid={uid} places={places} />
      )}
    </div>
  );
}
