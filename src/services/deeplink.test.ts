import { describe, expect, it } from 'vitest';
import { buildKakaoMapUrl, buildNaverMapUrl, buildTmapUrl } from './deeplink';

describe('buildNaverMapUrl', () => {
  it('4개 지점을 출발지+경유지2+도착지로 조합한다', () => {
    const points = [
      { name: 'A', lat: 1, lng: 2 },
      { name: 'B', lat: 3, lng: 4 },
      { name: 'C', lat: 5, lng: 6 },
      { name: 'D', lat: 7, lng: 8 },
    ];
    const url = buildNaverMapUrl(points);
    expect(url).toContain('nmap://route/car?');
    expect(url).toContain('slat=1&slng=2&sname=A');
    expect(url).toContain('dlat=7&dlng=8&dname=D');
    expect(url).toContain('v1lat=3&v1lng=4&v1name=B');
    expect(url).toContain('v2lat=5&v2lng=6&v2name=C');
  });
});

describe('buildKakaoMapUrl', () => {
  it('출발/도착 첫 구간만 생성한다', () => {
    const url = buildKakaoMapUrl([
      { name: 'A', lat: 1, lng: 2 },
      { name: 'B', lat: 3, lng: 4 },
    ]);
    expect(url).toBe('kakaomap://route?sp=1,2&ep=3,4&by=CAR');
  });
});

describe('buildTmapUrl', () => {
  it('목적지만으로 생성한다', () => {
    const url = buildTmapUrl([
      { name: 'A', lat: 1, lng: 2 },
      { name: 'B', lat: 3, lng: 4 },
    ]);
    expect(url).toContain('rGoName=B');
  });
});
