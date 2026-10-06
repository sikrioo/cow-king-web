// 맵 정의 (지금은 목장 하나). 색 테마는 data/palette.js
// 맵은 화면 크기와 상관없는 고정 크기(px) - 화면은 카메라가 주인공을 따라감
export const MAPS = {
  ranch: {
    name: '목장',
    size: 1900,             // 정사각형 한 변(px). 2026-10-05: 화면 맞춤(PC 약 950) → 고정 1900(넓이 약 4배)
    wallThickness: 24,      // 울타리 벽 두께(px)
    spawnMarginRatio: 0.14, // 무작위 위치를 뽑을 때 가장자리에서 띄우는 비율
    // 바닥 무늬 (render/ground.js): 노이즈 얼룩 + 장식. 다른 지형(사막/지옥/얼음)은 이 묶음만 바꾸면 됨
    ground: {
      base: '#3a6b3f',
      shades: ['#34623a', '#3a6b3f', '#41753f', '#47803f'], // 풀 명암 (지형 값 낮음 → 높음)
      dirt: '#6e5b3c', dirtEdge: '#56603a',                 // 흙 얼룩과 그 가장자리
      dirtThreshold: 0.66,                                   // 지형 값이 이보다 크면 흙
      patchScale: 300,                                       // 큰 얼룩 크기(px)
      cell: 10,                                              // 얼룩을 찍는 칸(px)
      decor: [
        { type: 'tuft',   every: 30,  chance: 0.6,  size: 7,   colors: ['#2a5430', '#53904f', '#3f7a3c'] },
        { type: 'flower', every: 85,  chance: 0.35, size: 1.6, colors: ['#f2f0e6', '#ffe066', '#ff9bd0', '#b9a8ff'] },
        { type: 'stone',  every: 120, chance: 0.4,  size: 6,   colors: ['#7d7a70', '#6c6a62'], light: '#a29f93' },
        { type: 'speck',  every: 26,  chance: 0.7,  size: 1.6, colors: ['#5a4a30', '#857150', '#4b3d28'], onDirt: true },
        { type: 'stone',  every: 70,  chance: 0.35, size: 4,   colors: ['#8a8578'], light: '#aaa598', onDirt: true }
      ]
    }
  }
};
export const CURRENT_MAP = MAPS.ranch;
export const GROUND_CHUNK = 512; // 바닥 무늬 캐시 조각 크기(px)

// 카메라: 화면 짧은 변 기준으로 최소 이만큼(px)은 보이게 줌을 줄임(모바일). PC는 줌 1
export const CAMERA_MIN_VIEW = 700;
export const CAMERA_EDGE_MARGIN = 40; // 맵 끝에서 울타리 바깥이 이만큼 보일 때 카메라 멈춤

// 미니맵 (오른쪽 위, 마나 구슬 아래)
export const MINIMAP_SIZE = 130;
export const MINIMAP_SIZE_SMALL = 100; // 화면 짧은 변이 MINIMAP_SMALL_SCREEN 미만일 때
export const MINIMAP_SMALL_SCREEN = 600;
