import {
  type DocumentData,
  type FirestoreDataConverter,
  collection,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { RouteLeg } from '../../domain/types';
import type { LatLng, TravelMode } from './types';
import { roundCoord } from './haversine';

// TTL (ms) — 3절 쿼터 관리 규칙: 자동차는 실시간 교통 반영, 대중교통/도보는 잘 안 변함.
const TTL_MS: Record<TravelMode, number> = {
  car: 60 * 60 * 1000, // 1시간
  transit: 7 * 24 * 60 * 60 * 1000, // 7일
  walk: 7 * 24 * 60 * 60 * 1000, // 7일
};

/** 경로 캐시 키: 좌표 소수점 5자리 반올림 후 조합. */
export function legCacheKey(from: LatLng, to: LatLng, mode: TravelMode): string {
  const f = `${roundCoord(from.lat)},${roundCoord(from.lng)}`;
  const t = `${roundCoord(to.lat)},${roundCoord(to.lng)}`;
  return `${f}_${t}_${mode}`;
}

const legConverter: FirestoreDataConverter<RouteLeg> = {
  toFirestore: (leg: RouteLeg): DocumentData => ({ ...leg }),
  fromFirestore: (snapshot) => snapshot.data() as RouteLeg,
};

function legsCol(uid: string) {
  return collection(db, 'users', uid, 'legs').withConverter(legConverter);
}

/** 캐시에서 유효한(TTL 이내) leg를 찾습니다. 없거나 만료면 null. */
export async function getCachedLeg(
  uid: string,
  from: LatLng,
  to: LatLng,
  mode: TravelMode,
): Promise<RouteLeg | null> {
  const key = legCacheKey(from, to, mode);
  const snap = await getDoc(doc(legsCol(uid), key));
  if (!snap.exists()) return null;
  const leg = snap.data();
  const age = Date.now() - leg.fetchedAt;
  if (age > TTL_MS[mode]) return null;
  return leg;
}

/** 조회 결과를 캐시에 저장합니다. */
export async function putCachedLeg(
  uid: string,
  from: LatLng,
  to: LatLng,
  mode: TravelMode,
  leg: RouteLeg,
): Promise<void> {
  const key = legCacheKey(from, to, mode);
  await setDoc(doc(legsCol(uid), key), leg);
}
