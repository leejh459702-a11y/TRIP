import { addDoc, collection, getDocs, type DocumentData, type FirestoreDataConverter } from 'firebase/firestore';
import { db } from './firebase';
import type { BlockReaction } from '../domain/reactions';

const reactionConverter: FirestoreDataConverter<BlockReaction> = {
  toFirestore: (r: BlockReaction): DocumentData => {
    const { id: _id, ...rest } = r;
    return rest;
  },
  fromFirestore: (snapshot) => ({ id: snapshot.id, ...(snapshot.data() as Omit<BlockReaction, 'id'>) }),
};

function reactionsCol(token: string) {
  return collection(db, 'shared', token, 'comments').withConverter(reactionConverter);
}

/** F4: 익명 반응을 추가합니다. 로그인 불필요. */
export async function addReaction(token: string, reaction: Omit<BlockReaction, 'id'>): Promise<void> {
  await addDoc(reactionsCol(token), reaction as BlockReaction);
}

/** F4: 원본 소유자만 조회할 수 있습니다(Firestore 규칙). */
export async function fetchReactions(token: string): Promise<BlockReaction[]> {
  const snap = await getDocs(reactionsCol(token));
  return snap.docs.map((d) => d.data());
}

const VISITOR_ID_KEY = 'trip-visitor-id';

/** F4: 로그인 없는 방문자를 브라우저 안에서만 구분하기 위한 익명 식별자. */
export function getOrCreateVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function reactedKey(token: string): string {
  return `trip-reacted-${token}`;
}

/** 이 브라우저에서 이미 반응을 남긴 블록 id 집합(같은 링크 재방문 시 폼을 다시 보여주지 않기 위함). */
export function getReactedBlockIds(token: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(reactedKey(token));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markBlockReacted(token: string, blockId: string): void {
  try {
    const ids = getReactedBlockIds(token);
    ids.add(blockId);
    window.localStorage.setItem(reactedKey(token), JSON.stringify(Array.from(ids)));
  } catch {
    // 저장 실패는 무시 — 다음 방문에 폼이 다시 보이는 정도의 영향만 있습니다.
  }
}
