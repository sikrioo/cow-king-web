// 개발자 패널 시나리오·소환 목록 (2026-10-14 사용자: 새 몬스터를 볼 때마다 조작이 귀찮음 - 버튼 하나로 그 상황을 만듦)
//   시나리오: 지금 몬스터를 치우고, 막(act - 바닥 분위기)을 맞추고, 웨이브를 멈춘 채 spawns를 주인공 둘레에 소환 (systems/dev.js devScenario)
//     spawns: { kind, n, dist(주인공에서 거리), spread(라디안 - 바라보는 방향 기준 펼침, 없으면 고르게 한 바퀴) }
//   웨이브는 '웨이브 재개'로 다시 (패널)
export const SCENARIOS = [
  { id: 'prison', label: '뼈 감옥', act: 1, spawns: [{ kind: 'skeletonJailer', n: 1, dist: 260, spread: 0 }, { kind: 'skeletonSpear', n: 3, dist: 380, spread: 1.2 }] },
  { id: 'rats', label: '쥐떼', act: 0, spawns: [{ kind: 'ratKeeper', n: 1, dist: 280, spread: 0 }] },
  { id: 'snake', label: '박치기 뱀', act: 0, spawns: [{ kind: 'snake', n: 2, dist: 260, spread: 1.0 }] },
  { id: 'souls', label: '영혼', act: 1, spawns: [{ kind: 'burningSoul', n: 1, dist: 280, spread: 0.6 }, { kind: 'paleSoul', n: 1, dist: 280, spread: -0.6 }] },
  { id: 'priest', label: '치유 카우 무리', act: 0, spawns: [{ kind: 'priest', n: 1, dist: 330, spread: 0 }, { kind: 'normal', n: 5, dist: 260, spread: 1.4 }] },
  { id: 'butcher', label: '도살자', act: 0, spawns: [{ kind: 'butcherCow', n: 1, dist: 320, spread: 0 }] },
  { id: 'demons', label: '악마 무리', act: 2, spawns: [{ kind: 'demonCurser', n: 1, dist: 320, spread: 0 }, { kind: 'demonBerserker', n: 1, dist: 300, spread: 0.8 }, { kind: 'imp', n: 4, dist: 260, spread: 1.6 }] },
  { id: 'ranged', label: '원거리 무리', act: 1, spawns: [{ kind: 'skeletonArcher', n: 3, dist: 340, spread: 1.0 }, { kind: 'pyro', n: 1, dist: 360, spread: 0 }] },
  { id: 'crowd', label: '40마리 (성능)', act: 0, spawns: [{ kind: 'normal', n: 40, dist: 420 }] }
];

// 소환 버튼 묶음 (몬스터 이름은 data/monsters.js MONSTER_LABEL). 새 몬스터를 넣으면 여기에도 (tests/devPanel.test.js가 빠진 것 검사)
export const DEV_SPAWN_GROUPS = [
  { label: '1막', kinds: ['normal', 'tough', 'fast', 'cold', 'charger', 'fanatic', 'burning', 'exploder', 'shaman', 'priest', 'shocker', 'venom', 'pyro', 'ratKeeper', 'rat', 'snake', 'archer'] },
  { label: '2막', kinds: ['skeleton', 'skeletonSpear', 'skeletonShield', 'skeletonBrute', 'skeletonArcher', 'skeletonJailer', 'paleSoul', 'burningSoul'] },
  { label: '3막', kinds: ['imp', 'demonCurser', 'demonBerserker', 'butcherCow', 'butcherDemon'] },
  { label: '보스', kinds: ['boss', 'skeletonKing', 'demonKing'] }
];
