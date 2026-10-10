// 빌드: 게임(index.html) + 관리자 페이지(admin.html - 개발자 모드에서만 내용이 보임)
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // 테스트마다 게임 전체를 부팅해서 병렬 실행 중엔 5초(기본)를 넘기기도 함 - 느린 것은 실패가 아님
  test: { testTimeout: 20000 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html')
      }
    }
  }
});
