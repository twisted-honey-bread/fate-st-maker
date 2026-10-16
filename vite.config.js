import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * 메이커마다 하위 경로 하나 (예: /lostbelt/)
 * 새 메이커는 폴더/index.html 을 만들고 아래 input 에 추가 — 기존 페이지 주소는 바뀌지 않음
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        lostbelt: resolve(__dirname, 'lostbelt/index.html'),
      },
    },
  },
});
