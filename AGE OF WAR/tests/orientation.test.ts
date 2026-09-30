import { describe, expect, it } from 'vitest';
import { computeLayout, pageToGame } from '../src/orientation';

describe('화면 배치(모바일 가로 모드)', () => {
  it('데스크톱/가로 화면: 회전 없이 맞춤·가운데 정렬', () => {
    const l = computeLayout(1920, 1080, false);
    expect(l.rotated).toBe(false);
    expect(l.scale).toBeCloseTo(1.5);
    expect(pageToGame(l, 960, 540)).toEqual({ x: 640, y: 360 });
    expect(computeLayout(844, 390, true).rotated).toBe(false);
  });

  it('세로로 든 폰: 90° 회전하고 긴 변에 맞춘다', () => {
    const l = computeLayout(390, 844, true);
    expect(l.rotated).toBe(true);
    expect(l.scale).toBeCloseTo(Math.min(844 / 1280, 390 / 720));
    // 화면 중앙은 게임 중앙
    const c = pageToGame(l, 195, 422);
    expect(c.x).toBeCloseTo(640);
    expect(c.y).toBeCloseTo(360);
    // 게임 왼쪽 위(0,0)는 회전 후 화면 오른쪽 위 근처
    const tl = pageToGame(l, l.left, l.top);
    expect(tl.x).toBeCloseTo(0);
    expect(tl.y).toBeCloseTo(0);
  });

  it('세로 화면이어도 터치 기기가 아니면 회전하지 않는다', () => {
    expect(computeLayout(800, 1200, false).rotated).toBe(false);
  });
});
