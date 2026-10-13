// 구조물 (2026-10-14 사용자: 통과할 수 없음, 투사체도 전부 막음, 모든 맵) - 1막 목장 구조물부터
//   발밑 모양만 충돌: circle = 원(반지름 r), line = 가로로 긴 캡슐(길이 len, 두께 반지름 r). 그림 높이 height는 가림·반투명 판정용
//   배치 systems/obstacles.js, 충돌·밀어내기 world/arena.js, 그림 render/obstacleSprites.js
export const OBSTACLES = {
  hay:   { label: '건초더미', shape: 'circle', r: 30, height: 34 }, // 2026-10-14: 통나무처럼 보여 낮은 짚더미로
  fence: { label: '나무 울타리', shape: 'line', len: [140, 210], r: 8, height: 40 }
};

// 배치 규칙 (맵마다 개수는 data/maps.js obstacles): 맵 끝에서 edge만큼, 주인공 시작 자리에서 startClear만큼 비우고,
//   구조물끼리는 apart 이상 띄움(길이 막히지 않게). tries번 뽑아 보고 자리가 없으면 그 구조물은 건너뜀
export const OBSTACLE_RULES = { edge: 140, startClear: 280, apart: 170, tries: 40 };

// 몬스터 비켜 가기 (systems/obstacles.js steerAroundObstacles): 앞쪽 look px 안 구조물로 향하면 둘레를 따라 돌아감
export const OBSTACLE_AVOID = { look: 70, turn: 1.8 };

// 주인공이 구조물 뒤(그림에 가려지는 자리)에 있으면 구조물을 이만큼 투명하게 (그림만)
export const OBSTACLE_FADE_ALPHA = 0.45;
