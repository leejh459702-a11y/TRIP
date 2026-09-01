import { type Unsubscribe, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../services/firebase';
import { isDemoMode } from '../services/demoMode';
import type { PlaceFilter } from '../domain/filter';

const demo = isDemoMode();

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
  proximityAlertsEnabled: boolean; // G2, 기본 off
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  longTransferThresholdMin: 40,
  notifyBeforeDepartureMin: 10,
  notificationsEnabled: false,
  savedFilterPresets: [],
  proximityAlertsEnabled: false,
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

  subscribe: (uid) => {
    if (demo) {
      set({ ...DEFAULT_SETTINGS, loaded: true });
      return () => {};
    }
    return onSnapshot(settingsDoc(uid), (snap) => {
      if (snap.exists()) {
        set({ ...DEFAULT_SETTINGS, ...(snap.data() as Partial<AppSettings>), loaded: true });
      } else {
        set({ ...DEFAULT_SETTINGS, loaded: true });
      }
    });
  },

  update: async (uid, patch) => {
    if (demo) {
      set({ ...get(), ...patch });
      return;
    }
    const next = { ...get(), ...patch };
    await setDoc(settingsDoc(uid), {
      theme: next.theme,
      longTransferThresholdMin: next.longTransferThresholdMin,
      notifyBeforeDepartureMin: next.notifyBeforeDepartureMin,
      notificationsEnabled: next.notificationsEnabled,
      savedFilterPresets: next.savedFilterPresets,
      proximityAlertsEnabled: next.proximityAlertsEnabled,
    });
  },
}));
