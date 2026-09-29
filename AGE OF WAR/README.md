# 크로노 프론트 (Chrono Front)

원시 시대부터 미래 시대까지, **한 줄의 전선**에서 기지를 지키고 적 기지를 무너뜨리는 브라우저용 2D 횡스크롤 디펜스/러시 게임입니다.
유닛 15종은 컨셉아트(`art/unit-concepts.webp`)에서 잘라낸 스프라이트를, 시대별 배경은 배경 그림 5장(`src/assets/backgrounds/`), 기지는 기지 그림 5장(`src/assets/bases/`)을 씁니다. 포탑·이펙트는 Phaser Graphics로 코드 드로잉한 벡터 카툰 스타일이고, 효과음은 모두 WebAudio로 합성합니다(사운드 파일 없음).

- 기술 스택: Vite 7 + TypeScript 5 + Phaser 3.90, 테스트는 Vitest 3
- 해상도: 1280×720 기준, `Scale.FIT` 반응형, 터치 지원

## 실행법

```bash
cd "AGE OF WAR"
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 타입 체크 + 프로덕션 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기
npm test           # 전투/경제/생산/진화/포탑/타겟팅/AI 단위 테스트
npm run sim -- normal normal 6       # 헤드리스 AI vs AI 밸런스 시뮬레이션
npm run matchup -- hardP,easyP       # AI 파라미터 변형끼리 10판 대전 비교
```

흐름: **메뉴(난이도 선택) → 게임 → 결과(플레이 시간 / 처치 수 / 도달 시대) → 다시 하기 또는 메뉴**

## 조작법

| 입력 | 동작 |
| --- | --- |
| `1` / `2` / `3` | 근접 / 원거리 / 중장 유닛 생산 (포탑·판매 탭이 열려 있으면 해당 탭의 1~3번 버튼) |
| `Space` | 특수기 (쿨다운 60초) |
| `E` | 진화 |
| `P` 또는 `Esc` | 일시정지 |
| `F` | 배속 전환 (1x ↔ 2x) |
| `M` | 음소거 토글 |
| `←` `→` / `A` `D`, 마우스 휠, 전장 드래그 | 화면 좌우 이동 |
| 하단 미니맵 클릭·드래그 | 해당 위치로 화면 이동 |
| `` ` `` (개발 모드만) | 밸런스 디버그 패널 (골드/EXP 추가, AI 전력·모드 표시) |

터치 기기에서는 버튼을 탭하면 실행되고 툴팁이 잠시 표시됩니다. 전장은 드래그해서 스크롤합니다.

### HUD
- **좌상단**: 현재 시대, 골드, EXP, 진화 진행 게이지와 진화 버튼 (진화 가능 시 반짝임)
- **상단 중앙**: 생산 대기열 5칸 아이콘과 현재 생산 진행 바 (스폰 지점이 막히면 주황색 "스폰 대기 중")
- **우상단**: 탭 메뉴 `[유닛 / 포탑 / 슬롯 추가 / 포탑 판매 / 진화]`. 버튼마다 비용과 툴팁을 표시하고, 골드가 부족하면 비활성
- **우하단**: 원형 쿨다운 특수기 버튼
- **양 기지 바깥쪽**: 세로 HP 바와 수치

## 게임 규칙 요약

- 양측은 완전히 같은 규칙을 따르고, 방향과 소유자만 다릅니다. 플레이어 UI와 적 AI는 모두 `GameWorld`의 같은 명령 API(`train / evolve / buyTurret / sellTurret / unlockSlot / useSpecial`)만 호출합니다.
- 시작 골드는 175, 기본 수입은 초당 2골드입니다.
- 처치 보상: 골드 = cost×1.0, EXP = cost×2. (골드 배율은 기획 초안의 1.25에서 조정. 아래 '밸런스 조정 내역' 참고) 기지에 준 피해의 10%도 EXP로 들어옵니다.
- 5시대 × 3유닛, 시대당 3종 포탑, 슬롯 3개(1번 기본, 2번 1000G, 3번 3000G), 판매 시 구매가의 50% 환급
- 진화하면 기지 최대 HP가 새 시대 값으로 바뀌고 현재 HP 비율은 유지됩니다. 이미 필드에 있는 유닛·포탑의 스탯은 그대로입니다.
- 특수기: 적 진영 쪽에 20~30개를 낙하시키며, 개당 피해는 40×시대 배율, 착탄 반경은 30px입니다. 적 기지에는 피해가 없습니다.

| 시대 | 근접 | 원거리 | 중장 | 특수기 | 기지 |
| --- | --- | --- | --- | --- | --- |
| 원시 | 몽둥이꾼 | 돌팔매꾼 | 매머드 기수 | 운석 낙하 | 동굴 |
| 고대 | 창병 | 궁수 | 전차병 | 화살비 | 석조 신전 |
| 중세 | 검사 | 석궁병 | 중기병 | 투석 세례 | 성채 |
| 화약 | 머스킷병 | 저격병 | 대포 수레 | 집중 포격 | 요새 |
| 미래 | 사이버 병사 | 레이저 저격수 | 메크 워커 | 궤도 레이저 | 미래 기지 |

## 폴더 구조

```
src/
  main.ts
  config/   balance.ts (모든 수치) · eras.ts (시대별 이름/외형 + 스탯 계산) · ai.ts (난이도)
  scenes/   BootScene(텍스처 생성) · MenuScene · GameScene · UIScene(HUD) · ResultScene · ui/(Button, DebugPanel, theme)
  entities/ Unit · Turret · Base · Projectile        ← 순수 데이터
  systems/  GameWorld(명령 API/스텝) · CombatSystem · EconomySystem · ProductionQueue
            EraSystem · SpecialAbility · EnemyAI · rng · types   ← Phaser 비의존 순수 TS
  render/   UnitRenderer(스프라이트 로드·적 색 변환·모션) · unitSprites(자동 생성 매니페스트)
            Background(배경 그림 원경 패럴랙스 + 지면 띠) · BaseRenderer(기지/포탑) · Effects · draw(펜/팔레트)
  assets/units/  유닛 스프라이트 15종(webp, 표시 크기의 2배 해상도)
  assets/backgrounds/  시대별 배경 그림 era0~4(webp, 1672×941)
  assets/bases/  시대별 기지 그림 era0~4(webp 440px, 원본 1254px은 art/bases/)
art/        unit-concepts.webp (유닛 컨셉아트 원본)
  audio/    Sfx.ts (WebAudio 합성)
tests/      Vitest 단위 테스트
scripts/    sim.ts · matchup.ts (헤드리스 밸런스 도구) · extract-units.py (컨셉아트 → 유닛 스프라이트)
```

`systems/`는 Phaser를 import하지 않습니다. `GameScene`은 `GameWorld.step(1/60)`을 고정 스텝으로 호출하고, `drainEvents()`로 받은 이벤트(`spawn`, `shoot`, `death`, `evolve` …)로 애니메이션, 이펙트, 사운드를 재생합니다.

## 유닛 그림 교체하기

1. `art/unit-concepts.webp`를 새 컨셉아트로 바꿉니다(투명 배경, 플레이어 파랑 기준, 오른쪽을 보는 자세).
2. 배치가 달라졌다면 `scripts/extract-units.py`의 유닛별 영역(연결 성분 좌표·분할 다각형)을 맞춥니다. 다른 유닛에 가려진 부분은 `COMPLETE` 표(채울 영역·외곽선 두께·채색 방법)로 복원합니다.
3. `pip install pillow numpy scipy opencv-python-headless` 후 `python3 scripts/extract-units.py` 실행 → `src/assets/units/*.webp`와 `src/render/unitSprites.ts`(크기·발 기준점·총구 위치)가 다시 만들어집니다.
4. 적(빨강) 색은 게임이 불러올 때 파란 계열 색상을 붉게 회전해 자동으로 만듭니다.
5. 걷기·공격 모션의 세기는 `src/render/UnitRenderer.ts`의 `MOTION` 표(흔들림·기울기·걸음 주기·공격 방식)에서 유닛별로 조정합니다.

## 배경 그림 교체하기

1. `src/assets/backgrounds/era{0-4}.webp`(0 원시 ~ 4 미래)를 바꿉니다. 16:9, 아래쪽에 좌우로 균일한 땅 띠가 있는 그림을 권장합니다.
2. `src/render/Background.ts`의 `ART_LINES`에서 그림별 기준선(원화 픽셀 y)을 맞춥니다.
   - `walk`: 유닛 발이 닿을 높이(게임의 지면선 `groundY`에 맞춰짐)
   - `band`: 지면 띠가 시작하는 높이. 여기부터 아래를 잘라 좌우 반전으로 이어 붙여 전장 전체에 깝니다.
3. 원경은 `ART_SCALE`(기본 0.85) 배율로 그려지며, 카메라 이동 범위를 딱 덮도록 느리게 스크롤됩니다.

## 기지 그림 교체하기

1. 원본(1254×1254, 투명 배경, 오른쪽을 보는 기지, 포탑 받침 3칸)을 `art/bases/era{0-4}.webp`에 두고, 440px로 줄인 사본을 `src/assets/bases/`에 넣습니다.
2. `src/render/BaseRenderer.ts`의 `BASE_ART`에 원본 좌표로 기준점을 적습니다.
   - `anchorX`: 기지 중심(base.x)에 올 x. 기지 앞 가장자리가 base.x+85 근처에 오도록 잡습니다.
   - `bottom`: 지면에 닿는 y
   - `slots`: 포탑 받침 윗면 중앙 3곳(위 칸부터). 포탑은 이 점 위에 `TURRET_SCALE` 배율로 놓입니다.
3. 적 기지는 파란 계열 색을 빨강으로 바꾸고 좌우 반전해 자동으로 만듭니다.

## balance.ts 수정 가이드

모든 게임 수치는 `src/config/balance.ts`의 `BALANCE` 객체에 있습니다. 코드에 하드코딩된 수치는 없으므로 이 파일만 고치면 됩니다. 수정한 뒤에는 `npm test`와 `npm run sim`으로 영향을 확인하세요.

| 항목 | 위치 | 설명 |
| --- | --- | --- |
| 시작 골드 / 기본 수입 | `economy.startGold`, `economy.incomePerSec` | |
| 처치 보상 | `economy.killGoldMult`, `economy.killExpMult` | 골드 = cost×mult, EXP = cost×mult |
| 기지 피해 EXP | `economy.baseDamageExpRatio` | 0.1 = 피해량의 10% |
| 유닛 기준 스탯 | `units.melee / ranged / heavy` | 시대1 기준 cost·hp·atk·cooldown·range·speed·trainTime, `width`는 충돌 폭 |
| 시대 배율 | `eraMult.stat`, `eraMult.cost` | `stat`은 유닛 hp/atk, 포탑 DPS, 특수기 피해에 적용. `cost`는 유닛·포탑 가격에 적용 |
| 진화 | `era.expToEvolve`, `era.baseMaxHp` | 필요 누적 EXP (4개), 시대별 기지 최대 HP (5개) |
| 대기열 | `production.maxQueue` | |
| 포탑 | `turret.rangeByEra`(시대별 사거리), `turret.tierRangeBonus`(등급별 추가 사거리), `turret.slotUnlockCost`, `turret.sellRefund`, `turret.tiers.*` | `dps × cooldown`이 1발 피해. `splashRadius > 0`이면 범위 피해 |
| 특수기 | `special.*` | 쿨다운, 낙하물 수, 피해, 반경, 낙하 연출 시간 |
| 전장 | `world.*`, `unitGap` | 레인 길이, 기지 위치, 스폰 간격, 유닛 간 최소 간격 |
| 시뮬레이션 | `sim.*` | 고정 스텝, 배속 옵션 |

- **시대를 추가하려면** `eras.ts`의 `ERAS` 배열에 항목을 추가하고, `eraMult.stat / cost`와 `era.baseMaxHp`에 값을 하나씩, `era.expToEvolve`에도 하나를 추가합니다.
- **AI 난이도**는 `src/config/ai.ts`에서 조정합니다. 수입 배율, 판단 지연, 방어 전환 비율, 오프닝/본 웨이브 구성, 포탑 우선도·슬롯 한도, 특수기 사용 정책 등이 있습니다.
- **밸런스 검증 흐름**
  1. `npm test`: 규칙 단위 테스트 (기준 스탯 값도 검증하므로 값을 바꾸면 해당 기대값도 함께 수정)
  2. `npm run sim -- normal normal 8`: 경기 시간과 시대별 도달 시각 확인
  3. `npm run matchup -- hardP,easyP,normalP`: 난이도 서열 확인 (normal 기준 승/패/시간초과)
  4. `npm run dev` 후 `` ` `` 키로 디버그 패널을 열어 실제 플레이 중 AI 전력과 모드 확인

## 적 AI

`src/systems/EnemyAI.ts`는 `AIWorld` 인터페이스(읽기 전용 조회 + 플레이어와 동일한 명령 API)만 받아서, 골드/EXP를 직접 수정하는 치트 경로가 타입 수준에서 막혀 있습니다.

- 0.5초마다 판단합니다. 전력 = 필드 유닛의 Σ(hp×atk)이며, 과잉 생산을 막기 위해 생산 대기열의 전력도 포함합니다.
- **열세면 방어**: 가용 골드 안에서 효율(hp×atk/cost × 역할 가중치)이 가장 높은 유닛을 생산합니다.
- **대등하거나 우세하면** 골드를 모았다가 웨이브를 보냅니다. 첫 웨이브는 작은 오프닝 구성이고, 골드가 넘칠 때는 생산 시간 대비 전력이 높은 중장 위주로 편성합니다.
- EXP가 충족되면 즉시 진화합니다. 여유 골드가 임계치 이상이면 포탑을 구매/교체하고 슬롯을 해금합니다.
- 난이도
  - 쉬움: 플레이어 골드 ×1.3, 적 수입 ×0.8, 적 판단 2초 지연
  - 보통: 기준 (양측 ×1.0)
  - 어려움: 플레이어 골드 ×0.9, 적 수입 ×1.3, 포탑 우선, 적이 밀집하면 특수기 사용
  - 골드 배율은 기본 수입과 처치 골드에 적용됩니다(`config/ai.ts`의 `playerIncomeMult`, `incomeMult`).

## 밸런스 조정 내역

- **처치 골드 1.25 → 1.0**: 1.25에서는 교전에서 이긴 쪽이 골드를 계속 불려 나가고, 진 쪽은 골드가 거의 0이 됩니다. 그러면 기지가 첫 피해 후 10~20초 만에 무너져 보통 난이도 판이 약 6분에 끝났습니다. 1.0에서는 AI 대전 기준 보통 대 보통 평균 약 10분이 됐습니다(`npm run matchup` 측정).
- **양측 동시 처리**: 유닛 처리 순서 때문에 오른쪽(적) 진영이 교전마다 한 프레임 먼저 공격하는 편향이 있어 같은 AI끼리 오른쪽이 약 65% 이겼습니다. 대상 선택 → 공격 → 이동을 양측 동시에 처리하도록 고쳐 좌우 승률이 50:50 근처가 됐습니다(300판 기준 135승 대 126승).
- 기지 최대 HP를 2~3배로 올리는 방법도 측정했지만 경기 시간은 거의 늘지 않았습니다(시대가 오를수록 유닛 공격력이 ×26까지 커지기 때문).

## 알려진 한계

- AI끼리 대전하면 후반에 중앙 교착으로 25분 안에 승부가 나지 않는 판이 있습니다(보통 대 보통 약 10~15%, 어려움 대 보통 10판 중 4판). 양측 생산 속도(대기열 5칸 순차 생산)가 같고, 어려움 AI는 포탑을 많이 사서 수비가 단단하기 때문입니다. 플레이어는 중장 집중, 특수기 타이밍, 포탑 조합으로 돌파할 수 있습니다.
- 경기 시간은 AI 대전으로 추정한 값입니다. 실제 사람이 하는 판의 길이는 플레이 스타일에 따라 다릅니다.
