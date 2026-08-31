import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';

export function CourseDetailPage() {
  const { courseId } = useParams();
  return (
    <>
      <PageHeader title="코스" />
      <div style={{ padding: 16, color: 'var(--ink-muted)', fontSize: 13 }}>
        코스 {courseId} — 블록 / 타임라인 / 지도 뷰는 Phase 1에서 구현됩니다.
      </div>
    </>
  );
}
