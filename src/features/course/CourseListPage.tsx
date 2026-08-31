import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';

export function CourseListPage() {
  return (
    <>
      <PageHeader title="일정" />
      <EmptyState
        title="만든 코스가 없습니다"
        description="저장한 장소로 첫 코스를 만들어 보세요"
      />
    </>
  );
}
