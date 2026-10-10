// 목장(웨이브 모드) 3막 구성 (2026-10-11 사용자 결정): 막마다 웨이브 수·나오는 몬스터·보스·바닥 분위기
//   웨이브 번호는 막을 이어서 셈(1막 1~6, 2막 7~10, 3막 11~14). 막의 마지막 웨이브 = 보스 + 호위 BOSS_ESCORTS마리
//   보스를 잡으면 전리품(bossDrops번, data/drops.js boss 등급 비중)을 떨구고 상단에 '다음 막으로' 버튼(Enter) → 누르면 다음 막(ACT_SCENE초 장면, 회복 없음)
//   마지막 막의 보스 = 승리. 흐름은 systems/acts.js, 웨이브 생성은 systems/waves.js
//   normals: 일반 몬스터 비중, elites: 엘리트로 나올 종류(없으면 data/monsters.js ELITE_KINDS), ground: 바닥 무늬(없으면 맵 기본 - render/ground.js)
import { ELITE_KINDS } from './monsters.js';
import { BOSS_WAVE } from './balance.js';

export const ACT_SCENE = 3;        // 막 전환 장면 (어두워졌다 밝아지며 바닥이 바뀜)
export const BOSS_ESCORTS = 4;
export const ACT_WAVE_SIZE = { base: 6, perWave: 4, perAct: 3 }; // 마리 수 = base + 막 안 웨이브 × perWave + 막 번호 × perAct

export const ACTS = [
  {
    id: 'ranch', name: '1막 · 왕의 목장', sub: 'SURVIVE THE PASTURE', waves: BOSS_WAVE,
    boss: 'boss', bossName: 'THE COW KING', bossSub: '왕의 목장에 입장했습니다', bossDrops: 4,
    normals: { normal: 1 }, elites: ELITE_KINDS, ground: null
  },
  {
    id: 'graveyard', name: '2막 · 저주받은 묘지', sub: '죽은 자들이 깨어난다', waves: 4,
    boss: 'skeletonKing', bossName: 'THE SKELETON KING', bossSub: '묘지의 주인이 일어섰습니다', bossDrops: 5,
    normals: { skeleton: 4, skeletonSpear: 2, skeletonArcher: 2, paleSoul: 1, normal: 2 }, elites: ['skeletonShield', 'skeletonBrute', 'tough', 'cold', 'fanatic', 'shaman', 'venom'],
    ground: {
      base: '#2c3330', shades: ['#29302d', '#2c3330', '#313a35', '#36403a'], dirt: '#3e3a33', dirtEdge: '#343530',
      dirtThreshold: 0.66, patchScale: 280, cell: 10,
      decor: [
        { type: 'tuft', every: 34, chance: 0.4, size: 6, colors: ['#3d463b', '#4a4f3a', '#353b33'] },
        { type: 'tomb', every: 150, chance: 0.34, size: 9, colors: ['#6b6f6a', '#5a5e59'], light: '#8a8e88' },
        { type: 'bone', every: 95, chance: 0.3, size: 6, colors: ['#cfc6b0', '#b9b09a'] },
        { type: 'speck', every: 26, chance: 0.5, size: 1.6, colors: ['#2a2622', '#4a443a'], onDirt: true },
        { type: 'bone', every: 80, chance: 0.25, size: 5, colors: ['#cfc6b0'], onDirt: true }
      ]
    }
  },
  {
    id: 'hell', name: '3막 · 지옥문', sub: '불타는 땅이 열린다', waves: 4,
    boss: 'demonKing', bossName: 'THE DEMON COW KING', bossSub: '지옥의 군주가 내려왔습니다', bossDrops: 6,
    normals: { imp: 5, burningSoul: 2, skeletonSpear: 1, skeletonArcher: 1 }, elites: ['demonCurser', 'demonBerserker', 'skeletonShield', 'skeletonBrute', 'pyro', 'burning'],
    ground: {
      base: '#3a1414', shades: ['#341212', '#3a1414', '#421616', '#4a1a16'], dirt: '#241010', dirtEdge: '#5a1a10',
      dirtThreshold: 0.64, patchScale: 260, cell: 10,
      decor: [
        { type: 'crack', every: 120, chance: 0.4, size: 16, colors: ['#ff5a1e', '#ff8a3d'] },
        { type: 'stone', every: 110, chance: 0.3, size: 6, colors: ['#2a1a1a', '#331f1c'], light: '#4a2c26' },
        { type: 'speck', every: 30, chance: 0.5, size: 1.4, colors: ['#ff7a1a', '#c0392b', '#5a1a10'] },
        { type: 'crack', every: 70, chance: 0.35, size: 10, colors: ['#ff7a1a'], onDirt: true },
        { type: 'speck', every: 22, chance: 0.5, size: 1.4, colors: ['#ff9b3d', '#7a2410'], onDirt: true }
      ]
    }
  }
];
