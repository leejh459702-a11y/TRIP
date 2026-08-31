import { type Unsubscribe, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../services/firebase';
import type { PlaceFilter } from '../domain/filter';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface SavedFilterPreset extends PlaceFilter {
  name: string;
}

interface AppSettings {
  theme: ThemeMode;
  longTransferThresholdMin: number; // B2
  notifyBeforeDepartureMin: number; // C5
  notificationsEnabled: boolean; // C5
  savedFilterPresets: SavedFilterPreset[]; // G1
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  longTransferThresholdMin: 40,
  notifyBeforeDepartureMin: 10,
  notificationsEnabled: false,
  savedFilterPresets: [],
};

function settingsDoc(uid: string) {
  return doc(db, 'users', uid, 'settings', 'app');
}

interface SettingsState extends AppSettings {
  loaded: boolean;
  subscribe: (uid: string) => Unsubscribe;
  update: (uid: string, patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  subscribe: (uid) =>
    onSnapshot(settingsDoc(uid), (snap) => {
      if (snap.exists()) {
        set({ ...DEFAULT_SETTINGS, ...(snap.data() as Partial<AppSettings>), loaded: true });
      } else {
        set({ ...DEFAULT_SETTINGS, loaded: true });
      }
    }),

  update: async (uid, patch) => {
    const next = { ...get(), ...patch };
    await setDoc(settingsDoc(uid), {
      theme: next.theme,
      longTransferThresholdMin: next.longTransferThresholdMin,
      notifyBeforeDepartureMin: next.notifyBeforeDepartureMin,
      notificationsEnabled: next.notificationsEnabled,
      savedFilterPresets: next.savedFilterPresets,
    });
  },
}));
