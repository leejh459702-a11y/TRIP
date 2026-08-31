import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { MapPage } from './features/map/MapPage';
import { CourseListPage } from './features/course/CourseListPage';
import { CourseDetailPage } from './features/course/CourseDetailPage';
import { RevisitPage } from './features/revisit/RevisitPage';
import { LogPage } from './features/log/LogPage';
import { MyPage } from './features/my/MyPage';
import { SharePage } from './features/share/SharePage';

export default function App() {
  return (
    <Routes>
      {/* F1: 공유 링크는 탭바 없는 단독 화면입니다 */}
      <Route path="/s/:token" element={<SharePage />} />

      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/map" replace />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/course" element={<CourseListPage />} />
        <Route path="/course/:courseId" element={<CourseDetailPage />} />
        <Route path="/revisit" element={<RevisitPage />} />
        <Route path="/log" element={<LogPage />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Route>
    </Routes>
  );
}
