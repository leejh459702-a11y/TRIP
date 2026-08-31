import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useCoursesStore } from '../../store/coursesStore';
import styles from './CourseListPage.module.css';

export function CourseListPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const courses = useCoursesStore((s) => s.courses);
  const subscribe = useCoursesStore((s) => s.subscribe);
  const createCourse = useCoursesStore((s) => s.createCourse);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [partySize, setPartySize] = useState(2);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return subscribe(uid);
  }, [uid, subscribe]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!uid || !title.trim()) return;
    setCreating(true);
    try {
      const id = await createCourse(uid, { title: title.trim(), startDate, partySize });
      setTitle('');
      navigate(`/course/${id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="일정" />
      <form className={styles.createBar} onSubmit={handleCreate}>
        <input
          className={`${styles.input} ${styles.titleInput}`}
          placeholder="코스 제목 (예: 강릉 1박2일)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="date"
          className={`${styles.input} ${styles.dateInput}`}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="number"
          min={1}
          className={`${styles.input} ${styles.partyInput}`}
          value={partySize}
          onChange={(e) => setPartySize(Math.max(1, Number(e.target.value)))}
        />
        <button className={styles.createButton} type="submit" disabled={creating || !title.trim()}>
          코스 만들기
        </button>
      </form>

      {courses.length === 0 ? (
        <EmptyState
          title="만든 코스가 없습니다"
          description="저장한 장소로 첫 코스를 만들어 보세요"
        />
      ) : (
        <div className={styles.list}>
          {courses.map((c) => (
            <Link key={c.id} className={styles.item} to={`/course/${c.id}`}>
              <div className={styles.itemTitle}>{c.title}</div>
              <div className={styles.itemMeta}>
                {c.startDate} · {c.partySize}인 · {c.days.reduce((n, d) => n + d.blocks.length, 0)}개 블록
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
