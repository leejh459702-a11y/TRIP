# 여행 코스 · 기록

개인용 여행 코스 설계 + 방문 기록 앱. React 18 + TypeScript(strict) + Vite + Firebase + 카카오맵.

## 시작하기

```bash
npm install
cp .env.example .env   # 카카오/Firebase 키를 채워 넣습니다
npm run dev
```

`.env`의 `VITE_USE_MOCK_ROUTING=true`(기본값)이면 카카오 경로 API를 호출하지 않고
목 데이터로 동작합니다. 실제 경로를 확인하려면 `false`로 바꾸고 카카오 REST/모빌리티
키를 채우세요.

Firebase 프로젝트 설정 없이 앱을 실행하면 안내 화면만 표시됩니다 — `.env`에
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` 등을 채워야 로그인·저장이 동작합니다.

## 스크립트

- `npm run dev` — 개발 서버
- `npm run build` — 타입체크(tsc -b) + 프로덕션 빌드
- `npm run test` — vitest (도메인 로직 단위 테스트)
- `npm run lint` — oxlint

## 구조

- `src/domain/` — React와 무관한 순수 비즈니스 로직 (타임라인 계산, 코스 편집 등). vitest로 테스트합니다.
- `src/services/` — Firebase, 카카오 API, 경로 프로바이더(H1 추상화), 외부 지도 딥링크.
- `src/store/` — Zustand 스토어 (인증, 장소, 코스).
- `src/features/` — 화면 단위 컴포넌트 (지도/일정/재방문/기록/마이 5탭 + 공유).

## 문서
- `SPEC.md` — 원본 구현 명세서(원문 그대로)
- `HANDOFF.md` — 현재 구현 현황, 확인된 미구현 항목, 다음 작업자를 위한 인수인계 노트
