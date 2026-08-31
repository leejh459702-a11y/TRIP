import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { CourseDay } from '../../domain/types';
import styles from './DayTabs.module.css';

interface DayTabsProps {
  days: CourseDay[];
  activeDayId: string;
  onSelectDay: (dayId: string) => void;
  onAddDay: () => void;
}

/** B9: 날짜 탭 전환. */
export function DayTabs({ days, activeDayId, onSelectDay, onAddDay }: DayTabsProps) {
  return (
    <div className={styles.wrap}>
      {days.map((d, i) => (
        <button
          key={d.id}
          className={`${styles.tab} ${d.id === activeDayId ? styles.tabActive : ''}`}
          onClick={() => onSelectDay(d.id)}
        >
          {i + 1}일차 · {format(parseISO(d.date), 'M/d(EEE)', { locale: ko })} · {d.blocks.length}곳
        </button>
      ))}
      <button className={styles.addButton} onClick={onAddDay}>
        + 날짜 추가
      </button>
    </div>
  );
}
