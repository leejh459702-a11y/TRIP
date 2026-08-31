import type { Category } from './types';

export const CATEGORY_LABEL: Record<Category, string> = {
  food: '식사',
  cafe: '카페',
  stay: '숙소',
  activity: '액티비티',
  etc: '기타',
};

/** 카테고리별 기본 체류시간(분). 장소 저장 시 초기값으로 사용, 이후 블록별 조정 가능. */
export const CATEGORY_DEFAULT_STAY_MIN: Record<Category, number> = {
  food: 80,
  cafe: 60,
  stay: 0,
  activity: 120,
  etc: 60,
};

/** 카테고리 색 CSS 변수. 지도 핀 · 블록 카드 · 타임라인에서 동일하게 사용 (2절 원칙). */
export const CATEGORY_COLOR_VAR: Record<Category, string> = {
  food: 'var(--cat-food)',
  cafe: 'var(--cat-cafe)',
  stay: 'var(--cat-stay)',
  activity: 'var(--cat-activity)',
  etc: 'var(--cat-etc)',
};

/** 카카오 category_group_name 원본 문자열을 앱 Category로 매핑합니다. */
export function guessCategory(kakaoCategoryGroupName: string): Category {
  if (kakaoCategoryGroupName.includes('음식')) return 'food';
  if (kakaoCategoryGroupName.includes('카페')) return 'cafe';
  if (kakaoCategoryGroupName.includes('숙박')) return 'stay';
  if (
    kakaoCategoryGroupName.includes('관광') ||
    kakaoCategoryGroupName.includes('문화') ||
    kakaoCategoryGroupName.includes('레저')
  ) {
    return 'activity';
  }
  return 'etc';
}
