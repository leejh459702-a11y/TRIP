/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: '여행 코스 · 기록',
        short_name: '여행코스',
        description: '개인용 여행 코스 설계 + 방문 기록 앱',
        theme_color: '#EDEEEA',
        background_color: '#EDEEEA',
        display: 'standalone',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            // 카카오 지도 타일 런타임 캐시 (H4), 용량 제한
            urlPattern: /^https:\/\/map\d?\.daumcdn\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kakao-map-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
