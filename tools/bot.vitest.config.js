// 봇 보고서 전용 설정 (npm run bot:report) - 일반 테스트(npm test)와 따로
import { defineConfig } from 'vite';
export default defineConfig({ test: { include: ['tools/bot-report.js'], testTimeout: 0 } });
