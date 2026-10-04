// 몬스터 종류별 수치/외형 - 종류 하나 = 항목 하나
// ★ 전투 수치 ×3 스케일: 체구 기준 밸런싱 - 작은(기본 체구) 카우는 2방, 큰(강화) 카우는 3방 (기본 데미지 3 기준). 보스는 별도 체계
//   hp: 체력, dmg: 근접 데미지, scaleMul: 체구 배율, speedMul: 이동속도 배율, aggroMul: 인식 범위 배율, exp: 처치 경험치
//   ring: 발밑 링/오라 색, colors: 몸 색(null이면 기본 카우 색)
export const MONSTERS = {
  normal:   { hp: 6,  dmg: 3, scaleMul: 1,   speedMul: 1,    aggroMul: 1,   exp: 10,  ring: null, colors: null },
  tough:    { hp: 9,  dmg: 6, scaleMul: 1.3, speedMul: 1,    aggroMul: 1,   exp: 25,  ring: '#ff5b4d', colors: { hide: '#a8402c', horn: '#f2c9a0', snout: '#6e2416', eye: '#ff3b30' } },
  fast:     { hp: 6,  dmg: 3, scaleMul: 1,   speedMul: 1.9,  aggroMul: 1.3, exp: 25,  ring: '#ffcf4d', colors: { hide: '#c99a2e', horn: '#fff0c2', snout: '#7a5c16', eye: '#ff3b30' } },
  cold:     { hp: 6,  dmg: 3, scaleMul: 1,   speedMul: 1,    aggroMul: 1,   exp: 25,  ring: '#7fd4ff', colors: { hide: '#4f7fa8', horn: '#dff3ff', snout: '#274a63', eye: '#8fe8ff' } },
  charger:  { hp: 6,  dmg: 6, scaleMul: 1,   speedMul: 1,    aggroMul: 1,   exp: 25,  ring: '#ffffff', colors: { hide: '#8a8a8a', horn: '#f5f5f5', snout: '#5c5c5c', eye: '#ff3b30' } },
  fanatic:  { hp: 6,  dmg: 6, scaleMul: 1,   speedMul: 1,    aggroMul: 1,   exp: 30,  ring: '#ff2d55', colors: { hide: '#7a1030', horn: '#ffb8c9', snout: '#4a0a1c', eye: '#ffe066' } },
  burning:  { hp: 6,  dmg: 3, scaleMul: 1,   speedMul: 0.85, aggroMul: 1,   exp: 28,  ring: '#ff7a1a', colors: { hide: '#8a2f12', horn: '#ffcf8a', snout: '#4a1608', eye: '#ffb02e' } },
  exploder: { hp: 3,  dmg: 3, scaleMul: 1,   speedMul: 1.7,  aggroMul: 1.6, exp: 22,  ring: '#ff2d2d', colors: { hide: '#5c1414', horn: '#ff9b9b', snout: '#2e0a0a', eye: '#fff066' } },
  shaman:   { hp: 6,  dmg: 3, scaleMul: 1,   speedMul: 0.9,  aggroMul: 1,   exp: 32,  ring: '#9f6bff', colors: { hide: '#3a2a5c', horn: '#d9c6ff', snout: '#241a3d', eye: '#7fffd4' } },
  shocker:  { hp: 6,  dmg: 3, scaleMul: 1,   speedMul: 0.9,  aggroMul: 1,   exp: 30,  ring: '#fff066', colors: { hide: '#8a7a2e', horn: '#fffde0', snout: '#4a4015', eye: '#fff9b0' } },
  boss:     { hp: 78, dmg: 3, scaleMul: 2.7, speedMul: 0.85, aggroMul: 1,   exp: 400, ring: '#c98bef', colors: { hide: '#6a3f8a', horn: '#e8d4ff', snout: '#361a52', eye: '#ffe066' } }
};
export const FLASH_COLORS = { hide: '#ffffff', horn: '#ffffff', snout: '#ffffff', eye: '#ffffff' };

// 엘리트 풀 - 웨이브 ELITE_MIN_WAVE부터 eliteChance = min(BASE + wave * PER_WAVE, MAX) 확률로 이 중 하나가 균등하게 뽑힘
export const ELITE_KINDS = ['tough', 'fast', 'cold', 'charger', 'fanatic', 'burning', 'exploder', 'shaman', 'shocker'];
export const ELITE_MIN_WAVE = 2;
export const ELITE_CHANCE_BASE = 0.16;
export const ELITE_CHANCE_PER_WAVE = 0.05;
export const ELITE_CHANCE_MAX = 0.45;
