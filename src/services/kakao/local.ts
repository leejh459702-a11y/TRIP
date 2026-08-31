import type { RegionCode } from '../../domain/types';

const REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY as string | undefined;
const BASE = 'https://dapi.kakao.com/v2/local';

async function get(path: string, params: Record<string, string>): Promise<unknown> {
  if (!REST_KEY) {
    throw new Error('VITE_KAKAO_REST_KEY가 설정되지 않았습니다 (.env 확인)');
  }
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Authorization: `KakaoAK ${REST_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`카카오 로컬 API 오류: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export interface KeywordSearchResult {
  kakaoPlaceId: string;
  name: string;
  category: string; // 카카오 category_group_name (원본, 표시용)
  address: string;
  lat: number;
  lng: number;
  placeUrl: string;
  phone?: string;
}

interface KakaoKeywordDoc {
  id: string;
  place_name: string;
  category_group_name: string;
  road_address_name: string;
  address_name: string;
  x: string; // lng
  y: string; // lat
  place_url: string;
  phone?: string;
}

/** 키워드로 장소 검색 (dapi.kakao.com/v2/local/search/keyword). */
export async function searchKeyword(query: string): Promise<KeywordSearchResult[]> {
  if (!query.trim()) return [];
  const raw = await get('/search/keyword.json', { query, size: '15' });
  const docs = (raw as { documents?: KakaoKeywordDoc[] }).documents ?? [];
  return docs.map((d) => ({
    kakaoPlaceId: d.id,
    name: d.place_name,
    category: d.category_group_name,
    address: d.road_address_name || d.address_name,
    lat: Number(d.y),
    lng: Number(d.x),
    placeUrl: d.place_url,
    phone: d.phone || undefined,
  }));
}

interface KakaoRegionDoc {
  region_type: 'H' | 'B';
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
}

/** 좌표로 행정구역정보 변환 (coord2regioncode). 법정동(B) 기준으로 자동 분류합니다. */
export async function coord2regioncode(lat: number, lng: number): Promise<RegionCode> {
  const raw = await get('/geo/coord2regioncode.json', { x: String(lng), y: String(lat) });
  const docs = (raw as { documents?: KakaoRegionDoc[] }).documents ?? [];
  const region = docs.find((d) => d.region_type === 'B') ?? docs[0];
  if (!region) {
    return { sido: '', sigungu: '' };
  }
  return {
    sido: region.region_1depth_name,
    sigungu: region.region_2depth_name,
    dong: region.region_3depth_name || undefined,
  };
}

interface KakaoAddressDoc {
  address_name: string;
  road_address?: { address_name: string };
}

/** 좌표로 주소 변환 (coord2address). */
export async function coord2address(lat: number, lng: number): Promise<string> {
  const raw = await get('/geo/coord2address.json', { x: String(lng), y: String(lat) });
  const docs = (raw as { documents?: KakaoAddressDoc[] }).documents ?? [];
  const first = docs[0];
  if (!first) return '';
  return first.road_address?.address_name || first.address_name;
}
