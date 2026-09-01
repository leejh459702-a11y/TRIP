# 인수인계 — 다음 작업자(코덱스)에게

이 프로젝트는 Claude Code가 `SPEC.md`(원본 명세서, 이 문서와 같은 디렉토리에 원문 그대로 보존)를
바탕으로 Phase 0~5를 진행한 결과물입니다. **먼저 이 문서를 읽고, 필요하면 `SPEC.md`에서
해당 항목의 원문 스펙을 확인한 뒤 작업하세요.**

- 브랜치: `claude/travel-course-log-app-tu65uz`
- 최신 커밋: `0aa209f` (작성 시점 기준)
- 저장소: https://github.com/leejh459702-a11y/TRIP

---

## 1. 지금 뭐가 되어 있는가

`SPEC.md`의 Phase 0~5가 전부 구현되어 있고, 그 위에 두 가지가 추가되었습니다.

1. **디자인 리디자인** — 원래 SPEC 2절은 "채도 낮고 그림자 없는" 절제된 디자인을 지시했지만,
   사용자가 도중에 "배민(배달의민족) 스타일로 바꿔달라"고 요청해 민트 브랜드 컬러 + 큰 라운드 +
   소프트 섀도우 + 필 버튼 기반으로 전면 리디자인했습니다. `src/styles/tokens.css`가 새 디자인
   토큰의 출발점입니다. **SPEC.md의 2절 디자인 토큰 값은 더 이상 실제 코드와 일치하지 않습니다** —
   실제 값은 `tokens.css`를 참고하세요.
2. **체험 모드 (`src/services/demoMode.ts`)** — Firebase/카카오 키 없이도 `npm run dev`만으로
   앱 전체를 눌러볼 수 있게 하는 기능입니다. SPEC.md에는 없는, 이번 세션에서 사용자 요청으로
   추가한 기능입니다. 아래 4절에서 자세히 설명합니다.

### 완료된 Phase 요약
- **Phase 0**: 프로젝트 셋업, 데이터 모델, H1(경로 API 추상화) + Mock Provider, H2 캐싱, 5탭 셸, Firebase 익명 인증
- **Phase 1**: 카카오 지도/검색/저장, coord2regioncode 자동 분류, 코스 빌더 D&D, 타임라인 계산 + 단위테스트, 3단 뷰(블록/타임라인/지도), KakaoRoutingProvider 실연결, 외부 지도 딥링크
- **Phase 2**: B1 영업시간(폼+충돌검증), B2 이동 이상 감지, B5 빡빡함 게이지, C4 체크오프→방문기록, D4 자동 메타, E1~E3 재방문(소환/회차/보류함)
- **Phase 3**: B9 다일정, C1 라이브 뷰, C2 지연 반영, C3+H4 오프라인 PWA, B3 Plan B, F1 공유 링크, F5 캘린더 내보내기(.ics)
- **Phase 4**: H5 다크모드, A6 일괄 태그, G1 상황 검색, G3 미방문 리스트, B8 템플릿, B10 예산 추정, E4/E5 리마인드, H3 백업 내보내기/가져오기
- **Phase 5**: B6 순서 자동 최적화(미리보기+되돌리기), G4 코스 초안 자동 생성(30건 게이트), G2 주변 알림(Geolocation watch), F4 동행자 코멘트(공유 링크 익명 반응)

전부 `npm run build`(tsc -b + vite build), `npm run lint`(oxlint), `npm run test`(vitest, 103개) 통과 확인됨.

---

## 2. ⚠️ 확인된 미구현 항목 (우선순위 순)

SPEC.md와 실제 코드를 대조 검증한 결과입니다. 커밋 로그나 이전 작업 요약만으로는 "Phase 4 완료"라고
되어 있어도 실제로는 빠진 항목이 있었습니다 — 아래는 코드베이스를 직접 grep해서 확인한 것입니다.

### 🔴 가장 시급 — D2 기록 타임라인 (기록 탭이 빈 스텁)
`src/features/log/LogPage.tsx`가 **EmptyState만 렌더링하는 빈 화면**입니다:
```tsx
export function LogPage() {
  return (
    <>
      <PageHeader title="기록" />
      <EmptyState title="기록이 비어 있습니다" description="..." />
    </>
  );
}
```
5개 탭 중 하나(`/log`)가 통째로 미구현 상태입니다. `Visit` 데이터는 Phase 2부터 계속 쌓여왔고
(`useVisitsStore`), `RevisitPage`가 재방문 판정 목록만 보여줄 뿐 **전체 방문 이력을 시간순으로
보여주는 화면이 없습니다**. SPEC.md 366~372행 "D2 — 기록 타임라인" 참고:
- 시간순: `2026년 3월 › 강릉 1박2일 › 6곳`
- 장소순: 한 장소의 모든 방문 이력
- 지역순: 시도 › 시군구 트리

`src/domain/`에 이 3가지 정렬을 위한 순수 함수부터 작성하고 단위테스트를 붙인 뒤, `LogPage.tsx`를
실제 구현으로 교체하는 것을 권장합니다. `useVisitsStore`, `usePlacesStore`(장소 이름 조인용)를
그대로 쓰면 됩니다.

### 🟡 그 다음 우선순위
- **C5 알림** (SPEC.md 292행 근처) — `settingsStore.ts`에 `notifyBeforeDepartureMin`,
  `notificationsEnabled` 필드가 있지만 **어디서도 읽지 않는 죽은 필드**입니다. 실제 "출발 몇 분 전
  알림" 로직이 전혀 없습니다. `src/features/my/MyPage.tsx`에 토글 UI도 없습니다.
- **B7 날씨 연동** (Open-Meteo, 무료·키 불필요) — `domain/types.ts`의 `weather?: string` 필드만
  존재하고 실제 API 호출·경고 배지·"실내 대안 보기"는 없습니다.
- **F2 카카오톡 공유 카드** — F1(링크 공유)만 있고 카카오톡 공유 API 연동은 없습니다.
- **F3 코스 이미지 저장** — 타임라인을 이미지로 렌더링하는 기능 없음. D5와 렌더러를 공유하도록
  설계하라고 스펙에 명시되어 있습니다.
- **D1 방문 히트맵** — 전국 지도 위 방문 밀도 시각화 없음.
- **D5 연간 리포트** — 연말 요약 카드 없음.
- **D6 음성 메모** — `Visit.voiceMemoUrl?: string` 필드만 존재, 녹음/업로드 UI 없음.
- **G5 지도 클러스터링** — `loadKakaoMaps.ts`가 카카오 SDK를 `libraries=services,clusterer`로
  로드하고 `MarkerClusterer` 타입까지 정의해 뒀지만, `KakaoMapView.tsx`에서 실제로 쓰지 않습니다.
  장소가 많아지면(특히 체험 모드가 아닌 실사용) 지도가 마커로 뒤덮입니다.

### 🟢 Phase 5(B6/G2/G4/F4)는 최근 완료 — 검증 얕을 수 있음
Phase 5 네 기능은 도메인 로직 단위테스트는 탄탄하지만(22개), UI 통합은 이 세션에서 Playwright로
클릭 테스트만 했고 실제 사용자 피드백은 없습니다. 특히:
- G2(주변 알림)는 `navigator.geolocation.watchPosition` 브라우저 API에 의존하는데, 실제 기기에서
  권한 프롬프트·백그라운드 동작을 검증한 적이 없습니다.
- B6(순서 최적화)는 항상 거리를 줄이지는 않습니다 — 숙소/식사 고정 제약이 거리보다 우선하도록
  의도된 설계입니다(`domain/optimize.ts` 상단 주석 참고). 버그처럼 보일 수 있으니 "고치지" 말고
  먼저 의도인지 확인하세요.

---

## 3. 디렉토리 구조

```
src/
  domain/     React와 무관한 순수 함수. vitest 단위테스트가 붙어 있음(18개 파일, 103 테스트).
              타임라인 계산·영업시간·최적화·초안생성 등 앱의 "진짜 로직"이 전부 여기 있음.
  services/   Firebase, 카카오 API, 경로 프로바이더(H1 추상화), 딥링크, 체험 모드.
  store/      Zustand 스토어. 전부 체험 모드 분기(`isDemoMode()`)를 가지고 있음 — 새 스토어를
              만들거나 기존 스토어에 메서드를 추가할 때 이 분기를 잊지 말 것(4절 참고).
  features/   화면 단위 컴포넌트. 폴더명이 탭 이름과 대응: map/course/revisit/log/my + share(공개 링크)
  components/ 여러 화면이 공유하는 UI(PageHeader, EmptyState, TabBar, KakaoMapView, BulkTagBar)
```

라우팅은 `src/App.tsx`(직접 확인 권장), 데이터 모델은 `src/domain/types.ts`가 단일 소스입니다.

---

## 4. 체험 모드 — 새 기능/스토어 만들 때 반드시 챙길 것

`src/services/demoMode.ts`의 `isDemoMode()`가 `true`면, 모든 Firestore/카카오 API 호출을 건너뛰고
메모리 내 시드 데이터(`src/services/demoData.ts`)만 읽고 씁니다. sessionStorage 플래그로 켜지고
새로고침 시 리셋됩니다.

**분기가 되어 있는 곳**: `firebase.ts`(초기화 자체를 건너뜀), 4개 스토어(`placesStore`,
`coursesStore`, `visitsStore`, `settingsStore`), `routing/index.ts`(항상 MockRoutingProvider),
`services/share.ts`, `services/reactions.ts`, `services/backup.ts`, `kakao/local.ts`(검색 목 데이터).

**새로 Firestore를 호출하는 코드를 추가하면** (예: D2 기록 타임라인에서 새 쿼리를 짠다면),
반드시 그 서비스/스토어 함수 맨 위에 `if (isDemoMode()) { ...메모리 로직...; return; }` 분기를
추가하세요. 안 하면 체험 모드에서 그 기능을 눌렀을 때 `db`가 더미 객체라 런타임 에러가 납니다
(타입은 `Firestore`로 캐스팅되어 있어 tsc는 통과하지만 실행 시 깨집니다 — 이게 유일하게 tsc가
못 잡아주는 위험 지점입니다).

체험 모드 진입 버튼은 `src/main.tsx`(Firebase 키 없을 때 뜨는 게이트 화면), 종료 버튼은
`src/features/my/MyPage.tsx`에 있습니다.

---

## 5. 실행 방법

```bash
npm install
cp .env.example .env   # 실제 키를 쓸 거라면 채우기. 체험 모드만 쓸 거면 비워둬도 됨.
npm run dev
```

`.env`가 비어 있으면 게이트 화면에 "체험 모드로 둘러보기" 버튼이 뜹니다. 실제 기능(카카오 지도
타일, 실제 검색, Firestore 저장)을 확인하려면 진짜 Firebase 프로젝트 + 카카오 앱 키가 필요합니다.

```bash
npm run build   # tsc -b + vite build. 이게 통과해야 배포 가능.
npm run test    # vitest run — 도메인 로직 단위테스트만. UI 테스트는 없음(수동/Playwright로 확인해옴).
npm run lint    # oxlint
```

---

## 6. 코딩 규칙 (SPEC.md 8절 요약 — 원문이 우선)

- TypeScript strict, `any` 금지. 불가피하면 `unknown` + 타입 가드
- 비즈니스 로직은 `src/domain/`에 순수 함수로, **단위테스트 필수**(특히 타임라인 계산·영업시간
  검증은 "이 두 개가 틀리면 앱 전체가 거짓말을 합니다")
- 시간 계산은 전부 `date-fns`. 직접 `Date` 산술 금지
- 좌표 비교는 소수점 5자리 반올림 후 비교 (`domain/geo.ts`의 `roundCoord`)
- 컴포넌트 파일 200줄 넘으면 분리
- 커밋 메시지: `feat(B1): 브레이크타임 충돌 검증 추가` 형식

## 7. 하지 말 것 (SPEC.md 9절 요약 — 원문이 우선)

- `localStorage`/`sessionStorage`를 **앱 데이터** 저장소로 쓰지 말 것(Firestore + Zustand 사용).
  단, 익명 방문자 식별자(F4)나 체험 모드 플래그처럼 성격이 다른 건 예외로 이미 쓰고 있음 — 새로
  뭔가를 로컬 저장소에 넣기 전에 이게 "앱 데이터"인지 "일시적 클라이언트 상태"인지 구분할 것
- 컴포넌트에서 `dapi.kakao.com`을 직접 호출하지 말 것 — `services/kakao/`를 거칠 것
- 드래그 중에 경로 API를 호출하지 말 것(H2 규칙: 드롭 후 300ms 디바운스)
- 영업시간을 크롤링하지 말 것 — 수동 입력만
- 타임라인 뷰(`TimelineView.tsx`)를 편집 가능하게 만들지 말 것 — 읽기 전용이 존재 이유
- 5개 탭을 늘리지 말 것 (지도/일정/재방문/기록/마이)

---

## 8. 검증 이력

이번 세션 마지막에 tsc/lint/test/build 전부 통과 확인 + Playwright로 13개 이상의 화면·상호작용
(다크모드, 재방문 선택모드, 체류시간 수정, Plan B, 체크오프→방문기록, 타임라인/지도 뷰, 라이브 뷰,
장소 상세, 코스 목록)을 자동 클릭해 콘솔 에러 0건 확인했습니다. 다만 이건 체험 모드(목 데이터)
기준이고, 실제 Firebase/카카오 연동 상태에서의 동작은 검증되지 않았습니다.
