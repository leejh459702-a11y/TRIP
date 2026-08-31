import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';

export function RevisitPage() {
  return (
    <>
      <PageHeader title="재방문" />
      <EmptyState
        title="아직 방문 기록이 없습니다"
        description="코스를 실행하고 블록을 완료하면 여기에 또감 · 보류 · 재방문 리마인드가 쌓입니다"
      />
    </>
  );
}
