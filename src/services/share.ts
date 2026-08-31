import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { SharedSnapshot } from '../domain/share';

function sharedDoc(token: string) {
  return doc(db, 'shared', token);
}

export async function publishShareSnapshot(token: string, snapshot: SharedSnapshot): Promise<void> {
  await setDoc(sharedDoc(token), snapshot);
}

export async function revokeShareSnapshot(token: string): Promise<void> {
  await deleteDoc(sharedDoc(token));
}

export async function fetchSharedSnapshot(token: string): Promise<SharedSnapshot | null> {
  const snap = await getDoc(sharedDoc(token));
  if (!snap.exists()) return null;
  return snap.data() as SharedSnapshot;
}
