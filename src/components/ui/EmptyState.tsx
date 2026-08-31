import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** 빈 화면 = 행동 유도 (2절 카피 원칙). "없습니다"류 안내 대신 다음 행동을 제시합니다. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{title}</div>
      <p className={styles.desc}>{description}</p>
      {action}
    </div>
  );
}
