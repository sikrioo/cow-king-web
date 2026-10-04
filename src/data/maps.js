// 맵 정의 (지금은 목장 하나). 색 테마는 data/palette.js
export const MAPS = {
  ranch: {
    name: '목장',
    padMin: 20,             // 화면 가장자리 최소 여백(px)
    padRatio: 0.05,         // 화면 짧은 변 대비 여백 비율
    wallThickness: 24,      // 울타리 벽 두께(px)
    spawnMarginRatio: 0.14  // 무작위 위치를 뽑을 때 가장자리에서 띄우는 비율
  }
};
export const CURRENT_MAP = MAPS.ranch;
