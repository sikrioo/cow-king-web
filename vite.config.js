// 빌드: 게임(index.html) + 관리자 페이지(admin.html - 개발자 모드에서만 내용이 보임)
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html')
      }
    }
  }
});
