import { initializeApp } from 'firebase/app';
import {
  type User,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth';
import {
  type Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { isDemoMode } from './demoMode';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 체험 모드에서는 유효한 키가 없어도 앱이 뜰 수 있어야 하므로 실제 Firebase 초기화 자체를
// 건너뜁니다(스토어들은 db/auth를 직접 쓰지 않고 이 모듈이 내보내는 값만 참조합니다).
const demo = isDemoMode();

export const app = demo ? undefined : initializeApp(firebaseConfig);
export const auth = demo ? undefined : getAuth(app!);
export const storage = demo ? undefined : getStorage(app!);

// C3/H4: 오프라인에서도 조회·쓰기가 가능하도록 Firestore persistence 활성화 (여러 탭 지원).
// ignoreUndefinedProperties: 앱 전반에서 선택적 필드를 `undefined`로 지우는 패턴을 쓰므로
// (예: F1 링크 해제 시 shareToken: undefined) Firestore가 이를 에러 대신 "필드 없음"으로 처리하게 합니다.
// 체험 모드에서는 아래 db를 실제로 호출하는 코드 경로 자체가 실행되지 않으므로(각 스토어의
// 체험 모드 분기가 먼저 리턴합니다), 타입만 맞춰 두는 더미 값으로 둡니다.
export const db: Firestore = demo
  ? ({} as Firestore)
  : initializeFirestore(app!, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    });

const DEMO_USER = { uid: 'demo-user' } as User;

/** 익명 로그인. 이미 로그인되어 있으면 재사용합니다. 체험 모드에서는 실제 로그인 없이 즉시 통과합니다. */
export function ensureSignedIn(): Promise<User> {
  if (demo) return Promise.resolve(DEMO_USER);
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth!,
      (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
          return;
        }
        signInAnonymously(auth!)
          .then((cred) => resolve(cred.user))
          .catch(reject);
      },
      reject,
    );
  });
}
