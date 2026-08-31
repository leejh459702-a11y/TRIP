/** G1 상황 태그 체계 초기값. 사용자가 자유 입력으로 더 추가할 수 있습니다. */
export const TAG_GROUPS: Record<string, string[]> = {
  동행: ['부모님', '연인', '친구', '혼자', '아이동반'],
  상황: ['비오는날', '주차편함', '조용함', '사진잘나옴', '웨이팅있음', '예약필수'],
  검증: ['가봄', '가보고싶음', '추천받음'],
};

export const TAG_SUGGESTIONS = Object.values(TAG_GROUPS).flat();
