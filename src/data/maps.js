// 맵 정의. 색 테마는 data/palette.js. 맵은 화면 크기와 상관없는 고정 크기(px) - 화면은 카메라가 주인공을 따라감
//   mode: 'wave' = 레벨업 공간(웨이브가 계속 옴, 시작 웨이브 선택) / 'farm' = 파밍 공간(인스턴스 - 들어갈 때마다 무리를 새로 배치, 난이도 선택)
//   진행은 systems/mapRun.js, 맵 선택 화면은 ui/mapSelect.js
export const MAP_ORDER = ['ranch', 'barn'];
export const MAPS = {
  ranch: {
    name: '목장',
    mode: 'wave',
    desc: '웨이브가 계속 몰려오는 레벨업 장소',
    start: { x: 0.5, y: 0.5 }, // 주인공 시작 위치 (맵 크기 비율)
    size: 1900,             // 정사각형 한 변(px). 2026-10-05: 화면 맞춤(PC 약 950) → 고정 1900(넓이 약 4배)
    wallThickness: 24,      // 울타리 벽 두께(px)
    spawnMarginRatio: 0.14, // 무작위 위치를 뽑을 때 가장자리에서 띄우는 비율
    // 바닥 무늬 (render/ground.js): 노이즈 얼룩 + 장식. 다른 지형(사막/지옥/얼음)은 이 묶음만 바꾸면 됨
    ground: {
      base: '#3a6b3f',
      shades: ['#35643b', '#3a6b3f', '#40733f', '#447c3f'], // 풀 명암 (지형 값 낮음 → 높음). 10-06 대비 20% 줄임
      dirt: '#6e5b3c', dirtEdge: '#56603a',                 // 흙 얼룩과 그 가장자리
      dirtThreshold: 0.69,                                   // 지형 값이 이보다 크면 흙
      patchScale: 300,                                       // 큰 얼룩 크기(px)
      cell: 10,                                              // 얼룩을 찍는 칸(px)
      decor: [
        { type: 'tuft',   every: 30,  chance: 0.48,  size: 7,   colors: ['#2a5430', '#53904f', '#3f7a3c'] },
        { type: 'flower', every: 85,  chance: 0.28, size: 1.6, colors: ['#f2f0e6', '#ffe066', '#ff9bd0', '#b9a8ff'] },
        { type: 'stone',  every: 120, chance: 0.32,  size: 6,   colors: ['#7d7a70', '#6c6a62'], light: '#a29f93' },
        { type: 'speck',  every: 26,  chance: 0.56,  size: 1.6, colors: ['#5a4a30', '#857150', '#4b3d28'], onDirt: true },
        { type: 'stone',  every: 70,  chance: 0.28, size: 4,   colors: ['#8a8578'], light: '#aaa598', onDirt: true }
      ]
    }
  },
  // 첫 파밍 맵: 무리가 곳곳에 미리 있고(가만히 있다가 가까이 가면 덤빔), 맨 끝 무리에 우두머리. 다 잡으면 클리어
  barn: {
    name: '버려진 외양간',
    mode: 'farm',
    desc: '흙먼지 날리는 폐허 - 물리·화염 면역 무리가 섞여 나옴',
    size: 1700,
    wallThickness: 24,
    spawnMarginRatio: 0.1,
    start: { x: 0.5, y: 0.92 },   // 아래쪽 가운데에서 시작
    packs: 9,                     // 무리 수 (마지막 하나가 우두머리 무리)
    packSize: [4, 7],             // 무리당 마리 수 (최소, 최대)
    packRadius: 70,
    packMinDistFromStart: 380,    // 시작 지점에서 이만큼은 떨어져서 배치
    kinds: { normal: 6, tough: 2, fast: 2, charger: 1, burning: 1, exploder: 1, fanatic: 1 }, // 무리 몬스터 비중
    immune: ['phys', 'fire'],     // 이 맵에서 나오는 면역 종류 (무리 단위로 하나)
    boss: { kind: 'tough', scale: 0.62, hpMul: 5, drops: 3 }, // 우두머리: 장비 확정 드랍 횟수
    ground: {
      base: '#5a4a34',
      shades: ['#54452f', '#5a4a34', '#615038', '#68573d'],
      dirt: '#7a6a48', dirtEdge: '#5f5236',
      dirtThreshold: 0.62,
      patchScale: 260,
      cell: 10,
      decor: [
        { type: 'tuft',   every: 34,  chance: 0.30, size: 6,   colors: ['#8a7a4a', '#a8935a', '#6e6038'] }, // 마른 풀/짚
        { type: 'stone',  every: 90,  chance: 0.40, size: 7,   colors: ['#6c6658', '#5e594d'], light: '#8f887a' },
        { type: 'speck',  every: 22,  chance: 0.60, size: 1.8, colors: ['#3e3424', '#7d6b4a', '#2e271b'], onDirt: true },
        { type: 'stone',  every: 60,  chance: 0.30, size: 4,   colors: ['#7a7468'], light: '#9c9688', onDirt: true }
      ]
    }
  }
};
export const GROUND_CHUNK = 512; // 바닥 무늬 캐시 조각 크기(px)

// 카메라: 화면 짧은 변 기준으로 최소 이만큼(px)은 보이게 줌을 줄임(모바일). PC는 줌 1
export const CAMERA_MIN_VIEW = 700;
export const CAMERA_EDGE_MARGIN = 40; // 맵 끝에서 울타리 바깥이 이만큼 보일 때 카메라 멈춤

// 미니맵 (오른쪽 위, 마나 구슬 아래)
export const MINIMAP_SIZE = 130;
export const MINIMAP_SIZE_SMALL = 100; // 화면 짧은 변이 MINIMAP_SMALL_SCREEN 미만일 때
export const MINIMAP_SMALL_SCREEN = 600;
