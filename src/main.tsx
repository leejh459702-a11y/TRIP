import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { isDemoMode, enableDemoMode } from './services/demoMode';
import './index.css';

const hasFirebaseConfig = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID,
);

const root = createRoot(document.getElementById('root')!);

if (!hasFirebaseConfig && !isDemoMode()) {
  // firebase.ts는 모듈 평가 시점에 getAuth()를 호출하므로, 설정이 비어 있으면
  // App을 아예 import하지 않고 안내만 보여줍니다 (전체 앱이 빈 화면으로 죽는 것 방지).
  // 체험 모드는 Firebase를 아예 건너뛰므로 키 없이도 바로 눌러볼 수 있습니다.
  root.render(
    <div style={{ padding: 24, fontFamily: 'sans-serif', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 18 }}>Firebase 설정이 필요합니다</h1>
      <p>
        .env 파일에 VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID 등 값을 채운 뒤
        다시 시작하세요. .env.example을 참고하세요.
      </p>
      <button
        type="button"
        onClick={enableDemoMode}
        style={{
          marginTop: 16,
          border: 'none',
          borderRadius: 999,
          padding: '11px 20px',
          background: '#14c9b5',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        ✨ 체험 모드로 둘러보기 (키 없이 목 데이터로 실행)
      </button>
    </div>,
  );
} else {
  const [{ default: App }, { BrowserRouter }] = await Promise.all([
    import('./App.tsx'),
    import('react-router-dom'),
  ]);
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}
