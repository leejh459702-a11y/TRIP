import type { User } from 'firebase/auth';
import { create } from 'zustand';
import { ensureSignedIn } from '../services/firebase';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  init: async () => {
    if (get().status === 'loading' || get().status === 'ready') return;
    set({ status: 'loading' });
    try {
      const user = await ensureSignedIn();
      set({ user, status: 'ready' });
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  },
}));
