import { describe, expect, it } from 'vitest';
import { computeDensity, tooManyPlacesNotice } from './density';

describe('computeDensity', () => {
  const dayStart = new Date(2026, 8, 1, 9, 0);

  it('빈 하루는 여유(level 1)로 판정한다', () => {
    const result = computeDensity({ totalTravelMin: 0, totalStayMin: 0, placeCount: 0, totalEstCost: 0 }, dayStart);
    expect(result.level).toBe(1);
    expect(result.dots).toBe('●○○○○');
  });

  it('이동 비중이 높고 장소가 많으면 레벨이 올라간다', () => {
    const light = computeDensity(
      { totalTravelMin: 10, totalStayMin: 200, placeCount: 2, totalEstCost: 0 },
      dayStart,
    );
    const heavy = computeDensity(
      { totalTravelMin: 180, totalStayMin: 200, placeCount: 8, totalEstCost: 0 },
      dayStart,
    );
    expect(heavy.level).toBeGreaterThan(light.level);
  });

  it('여유분이 음수(하루 예산 초과)면 0.2가 가산된다', () => {
    // 자정까지 900분 남음(09:00 시작), 사용시간 1000분 -> 여유분 음수
    const overBudget = computeDensity(
      { totalTravelMin: 100, totalStayMin: 900, placeCount: 1, totalEstCost: 0 },
      dayStart,
    );
    const underBudget = computeDensity(
      { totalTravelMin: 100, totalStayMin: 100, placeCount: 1, totalEstCost: 0 },
      dayStart,
    );
    expect(overBudget.score).toBeGreaterThan(underBudget.score);
  });
});

describe('tooManyPlacesNotice', () => {
  it('5곳 이하면 null', () => {
    expect(tooManyPlacesNotice(5)).toBeNull();
  });

  it('5곳 초과면 안내 문구를 반환한다', () => {
    expect(tooManyPlacesNotice(6)).toBe('하루 5곳을 넘으면 대부분 못 지킵니다');
  });
});
