import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const hasFirebaseConfig = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID,
);

const root = createRoot(document.getElementById('root')!);

if (!hasFirebaseConfig) {
  // firebase.ts는 모듈 평가 시점에 getAuth()를 호출하므로, 설정이 비어 있으면
  // App을 아예 import하지 않고 안내만 보여줍니다 (전체 앱이 빈 화면으로 죽는 것 방지).
  root.render(
    <div style={{ padding: 24, fontFamily: 'sans-serif', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 18 }}>Firebase 설정이 필요합니다</h1>
      <p>
        .env 파일에 VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID 등 값을 채운 뒤
        다시 시작하세요. .env.example을 참고하세요.
      </p>
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
