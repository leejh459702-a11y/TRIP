import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/authStore';

export function MyPage() {
  const { user, status } = useAuthStore();

  return (
    <>
      <PageHeader title="마이" />
      <div style={{ padding: 16, fontSize: 13, color: 'var(--ink-muted)' }}>
        {status === 'ready' && user ? `로그인 완료 · ${user.uid.slice(0, 8)}` : '로그인 준비 중…'}
      </div>
    </>
  );
}
