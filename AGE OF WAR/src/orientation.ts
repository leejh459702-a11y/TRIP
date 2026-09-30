import type Phaser from 'phaser';

/**
 * 모바일 가로 모드.
 *
 * 1) 첫 터치에 전체 화면 + 가로 방향 고정을 시도한다(안드로이드 크롬 등).
 * 2) 고정이 안 되는 환경(iOS 사파리, 앱 내 브라우저, iframe)에서 세로로 들고 있으면
 *    게임 화면 자체를 90° 돌려 가로로 보여 준다. 폰을 옆으로 눕히면 바로 가로 게임이 된다.
 *
 * 크기 맞춤(FIT)과 가운데 정렬도 여기서 직접 한다. 캔버스는 항상 1280×720 CSS 크기로 두고,
 * 부모(#game)에 translate/rotate/scale 변환을 건 뒤, Phaser 의 포인터 좌표 변환을 같은 식으로 바꿔 끼운다.
 */

const W = 1280;
const H = 720;

interface Layout {
  rotated: boolean;
  scale: number;
  left: number;
  top: number;
}

let layout: Layout = { rotated: false, scale: 1, left: 0, top: 0 };

/** 터치가 주 입력인 기기(휴대폰·태블릿) */
function isTouchDevice(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  } catch {
    return false;
  }
}

/** 화면 크기 → 배치. 세로 화면의 터치 기기면 90° 회전 */
export function computeLayout(vw: number, vh: number, touch: boolean): Layout {
  const rotated = touch && vh > vw;
  const aw = rotated ? vh : vw;
  const ah = rotated ? vw : vh;
  const scale = Math.min(aw / W, ah / H);
  const cw = W * scale;
  const ch = H * scale;
  if (!rotated) return { rotated, scale, left: (vw - cw) / 2, top: (vh - ch) / 2 };
  // 왼쪽 위를 기준으로 시계 방향 90° 회전하면 요소는 x ∈ [left − ch, left], y ∈ [top, top + cw] 를 차지한다
  return { rotated, scale, left: (vw + ch) / 2, top: (vh - cw) / 2 };
}

/** 페이지 좌표 → 게임 좌표 */
export function pageToGame(l: Layout, px: number, py: number): { x: number; y: number } {
  if (!l.rotated) return { x: (px - l.left) / l.scale, y: (py - l.top) / l.scale };
  // 회전 전 요소 좌표 (u, v) 는 페이지에서 (left − v, top + u)
  return { x: (py - l.top) / l.scale, y: (l.left - px) / l.scale };
}

function apply(container: HTMLElement): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  layout = computeLayout(vw, vh, isTouchDevice());
  const { rotated, scale, left, top } = layout;
  Object.assign(container.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: `${W}px`,
    height: `${H}px`,
    transformOrigin: '0 0',
    transform: `translate(${left}px, ${top}px) rotate(${rotated ? 90 : 0}deg) scale(${scale})`,
  });
}

/** 전체 화면 + 가로 고정 시도(사용자 입력 안에서만 허용됨). 실패해도 회전 표시로 대체되므로 조용히 무시 */
async function tryLockLandscape(): Promise<void> {
  try {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    }
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o?.lock?.('landscape');
  } catch {
    // 지원하지 않거나 거부됨(iOS, iframe 등)
  }
}

/** Phaser 게임을 만든 직후 호출 */
export function setupOrientation(game: Phaser.Game, container: HTMLElement): void {
  apply(container);
  const relayout = () => {
    apply(container);
    game.scale.refresh();
  };
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', () => setTimeout(relayout, 150));
  screen.orientation?.addEventListener?.('change', relayout);

  // Phaser 포인터 좌표 변환을 우리 배치(회전 포함)에 맞춘다
  const input = game.input as unknown as {
    transformPointer: (pointer: Phaser.Input.Pointer, pageX: number, pageY: number, wasMove: boolean) => void;
  };
  input.transformPointer = (pointer, pageX, pageY, wasMove) => {
    const p0 = pointer.position;
    const p1 = pointer.prevPosition;
    p1.x = p0.x;
    p1.y = p0.y;
    const g = pageToGame(layout, pageX, pageY);
    const a = pointer.smoothFactor;
    if (!wasMove || a === 0) {
      p0.x = g.x;
      p0.y = g.y;
    } else {
      p0.x = g.x * a + p1.x * (1 - a);
      p0.y = g.y * a + p1.y * (1 - a);
    }
  };

  if (isTouchDevice()) {
    const once = () => {
      window.removeEventListener('pointerup', once, true);
      void tryLockLandscape();
    };
    window.addEventListener('pointerup', once, true);
  }
}
