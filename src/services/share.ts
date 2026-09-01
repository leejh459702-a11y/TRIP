import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { isDemoMode } from './demoMode';
import type { SharedSnapshot } from '../domain/share';

function sharedDoc(token: string) {
  return doc(db, 'shared', token);
}

// 체험 모드는 Firestore를 쓰지 않으므로, 공유 스냅샷을 세션 메모리에만 담아 둡니다.
const demoShared = new Map<string, SharedSnapshot>();

export async function publishShareSnapshot(token: string, snapshot: SharedSnapshot): Promise<void> {
  if (isDemoMode()) {
    demoShared.set(token, snapshot);
    return;
  }
  await setDoc(sharedDoc(token), snapshot);
}

export async function revokeShareSnapshot(token: string): Promise<void> {
  if (isDemoMode()) {
    demoShared.delete(token);
    return;
  }
  await deleteDoc(sharedDoc(token));
}

export async function fetchSharedSnapshot(token: string): Promise<SharedSnapshot | null> {
  if (isDemoMode()) {
    return demoShared.get(token) ?? null;
  }
  const snap = await getDoc(sharedDoc(token));
  if (!snap.exists()) return null;
  return snap.data() as SharedSnapshot;
}
