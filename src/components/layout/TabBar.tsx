import { NavLink } from 'react-router-dom';
import styles from './TabBar.module.css';

const TABS = [
  { to: '/map', label: '지도', icon: '🗺' },
  { to: '/course', label: '일정', icon: '📋' },
  { to: '/revisit', label: '재방문', icon: '🔄' },
  { to: '/log', label: '기록', icon: '📖' },
  { to: '/my', label: '마이', icon: '👤' },
] as const;

export function TabBar() {
  return (
    <nav className={styles.bar}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon} aria-hidden="true">
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
