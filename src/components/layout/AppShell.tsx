import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { TabBar } from './TabBar';
import styles from './AppShell.module.css';

export function AppShell() {
  const uid = useAuthStore((s) => s.user?.uid);
  const init = useAuthStore((s) => s.init);
  const theme = useSettingsStore((s) => s.theme);
  const subscribeSettings = useSettingsStore((s) => s.subscribe);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!uid) return;
    return subscribeSettings(uid);
  }, [uid, subscribeSettings]);

  // H5: 수동 토글 값을 <html data-theme>에 반영. 'system'이면 속성을 지워 OS 설정을 따릅니다.
  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <div className={styles.shell}>
      <div className={styles.content}>
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}
