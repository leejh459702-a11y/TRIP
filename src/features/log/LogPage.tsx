import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';

export function LogPage() {
  return (
    <>
      <PageHeader title="기록" />
      <EmptyState
        title="기록이 비어 있습니다"
        description="코스를 실행하고 블록을 완료하면 방문 기록이 타임라인에 쌓입니다"
      />
    </>
  );
}
