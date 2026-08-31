import { useParams } from 'react-router-dom';

/** F1: 앱 없이 보는 공유 링크. 로그인 불필요, 탭바 없이 단독 렌더링됩니다. */
export function SharePage() {
  const { token } = useParams();
  return (
    <div style={{ padding: 24 }}>
      <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>공유 코스 {token} — Phase 3에서 구현됩니다.</p>
    </div>
  );
}
