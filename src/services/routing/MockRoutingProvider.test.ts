import { describe, expect, it } from 'vitest';
import { MockRoutingProvider } from './MockRoutingProvider';

describe('MockRoutingProvider', () => {
  const provider = new MockRoutingProvider();
  const seoul = { lat: 37.5665, lng: 126.978 };
  const gangnam = { lat: 37.4979, lng: 127.0276 };

  it('supports all travel modes', () => {
    expect(provider.supports('car')).toBe(true);
    expect(provider.supports('transit')).toBe(true);
    expect(provider.supports('walk')).toBe(true);
  });

  it('walk is slower than car for the same route', async () => {
    const car = await provider.getLeg(seoul, gangnam, 'car');
    const walk = await provider.getLeg(seoul, gangnam, 'walk');
    expect(walk.durationMin).toBeGreaterThan(car.durationMin);
  });

  it('computes multi-stop legs sequentially', async () => {
    const legs = await provider.getMultiStopCar([seoul, gangnam, seoul]);
    expect(legs).toHaveLength(2);
    expect(legs[0]?.mode).toBe('car');
  });
});
