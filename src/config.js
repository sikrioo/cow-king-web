// 엔진/빌드 설정

export const RELEASE_VERSION = '1.2.0-merged';

// 개발자 모드: 개발 서버(npm run dev, 테스트 포함)에서는 항상, 배포본은 주소에 ?dev=1 을 붙였을 때만
export function isDevMode() {
  if (import.meta.env && import.meta.env.DEV) return true;
  try { return new URLSearchParams(location.search).has('dev'); } catch { return false; }
}
