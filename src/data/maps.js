// 맵 정의 (지금은 목장 하나). 색 테마는 data/palette.js
// 맵은 화면 크기와 상관없는 고정 크기(px) - 화면은 카메라가 주인공을 따라감
export const MAPS = {
  ranch: {
    name: '목장',
    size: 1900,             // 정사각형 한 변(px). 2026-10-05: 화면 맞춤(PC 약 950) → 고정 1900(넓이 약 4배)
    wallThickness: 24,      // 울타리 벽 두께(px)
    spawnMarginRatio: 0.14  // 무작위 위치를 뽑을 때 가장자리에서 띄우는 비율
  }
};
export const CURRENT_MAP = MAPS.ranch;

// 카메라: 화면 짧은 변 기준으로 최소 이만큼(px)은 보이게 줌을 줄임(모바일). PC는 줌 1
export const CAMERA_MIN_VIEW = 700;
export const CAMERA_EDGE_MARGIN = 40; // 맵 끝에서 울타리 바깥이 이만큼 보일 때 카메라 멈춤

// 미니맵 (오른쪽 위, 마나 구슬 아래)
export const MINIMAP_SIZE = 130;
export const MINIMAP_SIZE_SMALL = 100; // 화면 짧은 변이 MINIMAP_SMALL_SCREEN 미만일 때
export const MINIMAP_SMALL_SCREEN = 600;
