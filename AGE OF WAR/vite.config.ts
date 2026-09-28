import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    // 유닛 스프라이트(수십 KB webp)를 번들에 인라인 → 단일 JS 로 배포 가능
    assetsInlineLimit: 256 * 1024,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
