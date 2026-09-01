import {
  type DocumentData,
  type FirestoreDataConverter,
  type Unsubscribe,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../services/firebase';
import { isDemoMode } from '../services/demoMode';
import { DEMO_PLACES } from '../services/demoData';
import type { Place } from '../domain/types';
import { CATEGORY_DEFAULT_STAY_MIN, guessCategory } from '../domain/category';
import type { KeywordSearchResult } from '../services/kakao/local';
import { coord2regioncode } from '../services/kakao/local';

const demo = isDemoMode();

const placeConverter: FirestoreDataConverter<Place> = {
  toFirestore: (place: Place): DocumentData => {
    const { id: _id, ...rest } = place;
    return rest;
  },
  fromFirestore: (snapshot) => ({ id: snapshot.id, ...(snapshot.data() as Omit<Place, 'id'>) }),
};

function placesCol(uid: string) {
  return collection(db, 'users', uid, 'places').withConverter(placeConverter);
}

interface PlacesState {
  places: Place[];
  loading: boolean;
  error?: string;
  subscribe: (uid: string) => Unsubscribe;
  addFromSearch: (uid: string, result: KeywordSearchResult) => Promise<string>;
  removePlace: (uid: string, placeId: string) => Promise<void>;
  addTags: (uid: string, placeIds: string[], tags: string[]) => Promise<void>;
  removeTags: (uid: string, placeIds: string[], tags: string[]) => Promise<void>;
  updatePlace: (uid: string, placeId: string, patch: Partial<Place>) => Promise<void>;
}

export const usePlacesStore = create<PlacesState>((set, get) => ({
  places: [],
  loading: true,

  subscribe: (uid) => {
    if (demo) {
      set({ places: DEMO_PLACES, loading: false });
      return () => {};
    }
    set({ loading: true });
    const q = query(placesCol(uid), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => set({ places: snap.docs.map((d) => d.data()), loading: false }),
      (err) => set({ error: err.message, loading: false }),
    );
  },

  addFromSearch: async (uid, result) => {
    const category = guessCategory(result.category);
    const now = new Date().toISOString();
    if (demo) {
      const id = `demo-new-${Date.now()}`;
      const newPlace: Place = {
        id,
        name: result.name,
        category,
        lat: result.lat,
        lng: result.lng,
        address: result.address,
        kakaoPlaceId: result.kakaoPlaceId,
        placeUrl: result.placeUrl,
        region: { sido: '강원특별자치도', sigungu: '강릉시' },
        tags: [],
        defaultStayMin: CATEGORY_DEFAULT_STAY_MIN[category],
        visitCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      set({ places: [newPlace, ...get().places] });
      return id;
    }
    const region = await coord2regioncode(result.lat, result.lng).catch(() => ({
      sido: '',
      sigungu: '',
    }));
    const newPlace: Omit<Place, 'id'> = {
      name: result.name,
      category,
      lat: result.lat,
      lng: result.lng,
      address: result.address,
      kakaoPlaceId: result.kakaoPlaceId,
      placeUrl: result.placeUrl,
      region,
      tags: [],
      defaultStayMin: CATEGORY_DEFAULT_STAY_MIN[category],
      visitCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(placesCol(uid), newPlace as Place);
    return docRef.id;
  },

  removePlace: async (uid, placeId) => {
    if (demo) {
      set({ places: get().places.filter((p) => p.id !== placeId) });
      return;
    }
    await deleteDoc(doc(placesCol(uid), placeId));
  },

  addTags: async (uid, placeIds, tags) => {
    const { places } = get();
    if (demo) {
      set({
        places: places.map((p) =>
          placeIds.includes(p.id) ? { ...p, tags: Array.from(new Set([...p.tags, ...tags])) } : p,
        ),
      });
      return;
    }
    await Promise.all(
      placeIds.map((id) => {
        const place = places.find((p) => p.id === id);
        const merged = Array.from(new Set([...(place?.tags ?? []), ...tags]));
        return updateDoc(doc(placesCol(uid), id), {
          tags: merged,
          updatedAt: new Date().toISOString(),
        });
      }),
    );
  },

  removeTags: async (uid, placeIds, tags) => {
    const { places } = get();
    if (demo) {
      set({
        places: places.map((p) =>
          placeIds.includes(p.id) ? { ...p, tags: p.tags.filter((t) => !tags.includes(t)) } : p,
        ),
      });
      return;
    }
    await Promise.all(
      placeIds.map((id) => {
        const place = places.find((p) => p.id === id);
        const filtered = (place?.tags ?? []).filter((t) => !tags.includes(t));
        return updateDoc(doc(placesCol(uid), id), {
          tags: filtered,
          updatedAt: new Date().toISOString(),
        });
      }),
    );
  },

  updatePlace: async (uid, placeId, patch) => {
    if (demo) {
      set({
        places: get().places.map((p) => (p.id === placeId ? { ...p, ...patch } : p)),
      });
      return;
    }
    await updateDoc(doc(placesCol(uid), placeId), {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  },
}));
