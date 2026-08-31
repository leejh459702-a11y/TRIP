import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { useCoursesStore } from '../../store/coursesStore';
import { findCourseDayForDate } from '../../domain/course';

/** C1: 오늘 날짜의 코스가 있으면 라이브 뷰로, 없으면 지도 탭으로 보냅니다. */
export function LiveGate() {
  const uid = useAuthStore((s) => s.user?.uid);
  const courses = useCoursesStore((s) => s.courses);
  const loading = useCoursesStore((s) => s.loading);
  const subscribe = useCoursesStore((s) => s.subscribe);

  useEffect(() => {
    if (!uid) return;
    return subscribe(uid);
  }, [uid, subscribe]);

  if (!uid || loading) return null;

  const today = format(new Date(), 'yyyy-MM-dd');
  const hasToday = !!findCourseDayForDate(courses, today);

  return <Navigate to={hasToday ? '/live' : '/map'} replace />;
}
