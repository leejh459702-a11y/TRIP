import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useCoursesStore } from '../../store/coursesStore';
import { instantiateFromTemplate } from '../../domain/course';
import styles from './CourseListPage.module.css';

export function CourseListPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const courses = useCoursesStore((s) => s.courses);
  const subscribe = useCoursesStore((s) => s.subscribe);
  const createCourse = useCoursesStore((s) => s.createCourse);
  const createFromObject = useCoursesStore((s) => s.createFromObject);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [partySize, setPartySize] = useState(2);
  const [templateId, setTemplateId] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return subscribe(uid);
  }, [uid, subscribe]);

  const templates = courses.filter((c) => c.isTemplate);
  const normalCourses = courses.filter((c) => !c.isTemplate);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!uid || !title.trim()) return;
    setCreating(true);
    try {
      const template = templates.find((t) => t.id === templateId);
      const id = template
        ? await createFromObject(
            uid,
            instantiateFromTemplate(template, { title: title.trim(), startDate, partySize }),
          )
        : await createCourse(uid, { title: title.trim(), startDate, partySize });
      setTitle('');
      setTemplateId('');
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
        {templates.length > 0 && (
          <select
            className={styles.input}
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">템플릿 없이 시작</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        )}
        <button className={styles.createButton} type="submit" disabled={creating || !title.trim()}>
          코스 만들기
        </button>
      </form>

      {normalCourses.length === 0 && templates.length === 0 ? (
        <EmptyState
          title="만든 코스가 없습니다"
          description="저장한 장소로 첫 코스를 만들어 보세요"
        />
      ) : (
        <>
          {normalCourses.length === 0 ? (
            <EmptyState
              title="만든 코스가 없습니다"
              description="저장한 장소로 첫 코스를 만들어 보세요"
            />
          ) : (
            <div className={styles.list}>
              {normalCourses.map((c) => (
                <Link key={c.id} className={styles.item} to={`/course/${c.id}`}>
                  <div className={styles.itemTitle}>{c.title}</div>
                  <div className={styles.itemMeta}>
                    {c.startDate} · {c.partySize}인 ·{' '}
                    {c.days.reduce((n, d) => n + d.blocks.length, 0)}개 블록
                  </div>
                </Link>
              ))}
            </div>
          )}

          {templates.length > 0 && (
            <>
              <div className={styles.sectionTitle}>템플릿 {templates.length}개</div>
              <div className={styles.list}>
                {templates.map((t) => (
                  <Link key={t.id} className={styles.item} to={`/course/${t.id}`}>
                    <div className={styles.itemTitle}>{t.title}</div>
                    <div className={styles.itemMeta}>
                      {t.days.reduce((n, d) => n + d.blocks.length, 0)}개 블록 · 위 폼에서 이 템플릿으로 시작할 수 있어요
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
