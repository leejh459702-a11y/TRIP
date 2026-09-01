import { type DocumentData, collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { isDemoMode } from './demoMode';
import type { Course, Place, Visit } from '../domain/types';

export interface BackupData {
  version: 1;
  exportedAt: string;
  places: Place[];
  visits: Visit[];
  courses: Course[];
}

async function fetchAll<T>(uid: string, sub: string): Promise<T[]> {
  const snap = await getDocs(collection(db, 'users', uid, sub));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) }) as T);
}

/** H3: 장소·방문·코스 전체를 한 번에 읽어옵니다. 체험 모드에서는 메모리 위 스토어 상태를 그대로 씁니다. */
export async function exportAllData(uid: string): Promise<BackupData> {
  if (isDemoMode()) {
    const [{ usePlacesStore }, { useCoursesStore }, { useVisitsStore }] = await Promise.all([
      import('../store/placesStore'),
      import('../store/coursesStore'),
      import('../store/visitsStore'),
    ]);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      places: usePlacesStore.getState().places,
      visits: useVisitsStore.getState().visits,
      courses: useCoursesStore.getState().courses,
    };
  }
  const [places, visits, courses] = await Promise.all([
    fetchAll<Place>(uid, 'places'),
    fetchAll<Visit>(uid, 'visits'),
    fetchAll<Course>(uid, 'courses'),
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), places, visits, courses };
}

/** H3: 내보낸 JSON을 그대로 다시 씁니다(id 유지) — 왕복(export → import)이 되어야 합니다. */
export async function importAllData(uid: string, data: BackupData): Promise<void> {
  if (isDemoMode()) {
    const [{ usePlacesStore }, { useCoursesStore }, { useVisitsStore }] = await Promise.all([
      import('../store/placesStore'),
      import('../store/coursesStore'),
      import('../store/visitsStore'),
    ]);
    usePlacesStore.setState({ places: data.places });
    useVisitsStore.setState({ visits: data.visits });
    useCoursesStore.setState({ courses: data.courses });
    return;
  }
  const collections: { name: string; rows: { id: string }[] }[] = [
    { name: 'places', rows: data.places },
    { name: 'visits', rows: data.visits },
    { name: 'courses', rows: data.courses },
  ];

  for (const { name, rows } of collections) {
    const col = collection(db, 'users', uid, name);
    // Firestore 배치는 500건 제한이 있어 청크로 나눠 씁니다.
    for (let i = 0; i < rows.length; i += 400) {
      const batch = writeBatch(db);
      for (const row of rows.slice(i, i + 400)) {
        const { id, ...rest } = row as { id: string } & DocumentData;
        batch.set(doc(col, id), rest);
      }
      await batch.commit();
    }
  }
}

export function downloadTextFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
