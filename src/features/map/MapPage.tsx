import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';

export function MapPage() {
  return (
    <>
      <PageHeader title="지도" />
      <EmptyState
        title="저장된 장소가 없습니다"
        description="지도에서 마음에 든 곳을 검색해서 저장해 보세요"
      />
    </>
  );
}
