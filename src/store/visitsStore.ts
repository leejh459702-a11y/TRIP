import {
  type DocumentData,
  type FirestoreDataConverter,
  type Unsubscribe,
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../services/firebase';
import { isDemoMode } from '../services/demoMode';
import { DEMO_VISITS } from '../services/demoData';
import type { Revisit, Visit } from '../domain/types';
import { computeVisitAuto } from '../domain/visitAuto';

const demo = isDemoMode();

const visitConverter: FirestoreDataConverter<Visit> = {
  toFirestore: (visit: Visit): DocumentData => {
    const { id: _id, ...rest } = visit;
    return rest;
  },
  fromFirestore: (snapshot) => ({ id: snapshot.id, ...(snapshot.data() as Omit<Visit, 'id'>) }),
};

function visitsCol(uid: string) {
  return collection(db, 'users', uid, 'visits').withConverter(visitConverter);
}

function placeDoc(uid: string, placeId: string) {
  return doc(db, 'users', uid, 'places', placeId);
}

export interface RecordVisitInput {
  placeId: string;
  courseId?: string;
  visitedAt: string; // ISO
  revisit: Revisit;
  companions: string[];
  memo?: string;
  cost?: number;
  stayMin?: number; // C4: doneAt 간격으로 산출된 실제 체류시간
  partySize?: number;
}

interface VisitsState {
  visits: Visit[];
  loading: boolean;
  error?: string;
  subscribe: (uid: string) => Unsubscribe;
  recordVisit: (uid: string, input: RecordVisitInput) => Promise<string>;
}

export const useVisitsStore = create<VisitsState>((set, get) => ({
  visits: [],
  loading: true,

  subscribe: (uid) => {
    if (demo) {
      set({ visits: DEMO_VISITS, loading: false });
      return () => {};
    }
    set({ loading: true });
    const q = query(visitsCol(uid), orderBy('visitedAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => set({ visits: snap.docs.map((d) => d.data()), loading: false }),
      (err) => set({ error: err.message, loading: false }),
    );
  },

  /** 방문 기록을 남기고, 장소의 방문 회차(E2)·최근 방문 캐시(E1)를 함께 갱신합니다. */
  recordVisit: async (uid, input) => {
    const visitedAtDate = new Date(input.visitedAt);
    const visit: Omit<Visit, 'id'> = {
      placeId: input.placeId,
      courseId: input.courseId,
      visitedAt: input.visitedAt,
      revisit: input.revisit,
      companions: input.companions,
      memo: input.memo,
      cost: input.cost,
      auto: computeVisitAuto(visitedAtDate, {
        stayMin: input.stayMin,
        partySize: input.partySize,
      }),
    };

    if (demo) {
      const id = `demo-new-${Date.now()}`;
      set({ visits: [{ ...visit, id }, ...get().visits] });
      // 체험 모드에서도 E1/E2가 동작하는 것처럼 보이도록 장소 스토어를 함께 갱신합니다.
      const { usePlacesStore } = await import('./placesStore');
      usePlacesStore.setState((s) => ({
        places: s.places.map((p) =>
          p.id === input.placeId
            ? {
                ...p,
                visitCount: p.visitCount + 1,
                lastVisitedAt: input.visitedAt,
                latestRevisit: input.revisit,
              }
            : p,
        ),
      }));
      return id;
    }

    const ref = await addDoc(visitsCol(uid), visit as Visit);

    await updateDoc(placeDoc(uid, input.placeId), {
      visitCount: increment(1),
      lastVisitedAt: input.visitedAt,
      latestRevisit: input.revisit,
      updatedAt: new Date().toISOString(),
    });

    return ref.id;
  },
}));
