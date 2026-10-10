// 몬스터 종류별 수치/외형 - 종류 하나 = 항목 하나
// ★ 전투 수치 스케일(×3 → ×10): 체구 기준 밸런싱 - 작은(기본 체구) 카우는 2방, 큰(강화) 카우는 3방 (기본 데미지 3 기준). 보스는 별도 체계
//   hp: 체력, dmg: 근접 데미지, scaleMul: 체구 배율, speedMul: 이동속도 배율, aggroMul: 인식 범위 배율, exp: 처치 경험치
//   ring: 발밑 링/오라 색, colors: 몸 색(null이면 기본 카우 색), element: 근접 공격 원소(없으면 물리, data/elements.js), resist: 저항(phys 물리 + 원소, 0~1, 없으면 0 - 1이면 면역: 피해 0, "면역" 표시)
export const MONSTERS = {
  normal:   { hp: 60, dmg: 30, scaleMul: 1,   speedMul: 1,    aggroMul: 1,   exp: 10,  ring: null, colors: null },
  tough:    { hp: 90, dmg: 60, scaleMul: 1.3, speedMul: 1,    aggroMul: 1,   exp: 25,  ring: '#ff5b4d', colors: { hide: '#a8402c', horn: '#f2c9a0', snout: '#6e2416', eye: '#ff3b30' } },
  fast:     { hp: 60, dmg: 30, scaleMul: 1,   speedMul: 1.9,  aggroMul: 1.3, exp: 25,  ring: '#ffcf4d', colors: { hide: '#c99a2e', horn: '#fff0c2', snout: '#7a5c16', eye: '#ff3b30' } },
  cold:     { hp: 60, dmg: 30, scaleMul: 1,   speedMul: 1,    aggroMul: 1,   exp: 25,  element: 'cold', resist: { cold: 0.5 }, ring: '#7fd4ff', colors: { hide: '#4f7fa8', horn: '#dff3ff', snout: '#274a63', eye: '#8fe8ff' } },
  charger:  { hp: 60, dmg: 60, scaleMul: 1,   speedMul: 1,    aggroMul: 1,   exp: 25,  ring: '#ffffff', colors: { hide: '#8a8a8a', horn: '#f5f5f5', snout: '#5c5c5c', eye: '#ff3b30' } },
  fanatic:  { hp: 60, dmg: 60, scaleMul: 1,   speedMul: 1,    aggroMul: 1,   exp: 30,  ring: '#ff2d55', colors: { hide: '#7a1030', horn: '#ffb8c9', snout: '#4a0a1c', eye: '#ffe066' } },
  burning:  { hp: 60, dmg: 30, scaleMul: 1,   speedMul: 0.85, aggroMul: 1,   exp: 28,  element: 'fire', resist: { fire: 0.5 }, ring: '#ff7a1a', colors: { hide: '#8a2f12', horn: '#ffcf8a', snout: '#4a1608', eye: '#ffb02e' } },
  exploder: { hp: 30, dmg: 30, scaleMul: 1,   speedMul: 1.7,  aggroMul: 1.6, exp: 22,  ring: '#ff2d2d', colors: { hide: '#5c1414', horn: '#ff9b9b', snout: '#2e0a0a', eye: '#fff066' } },
  shaman:   { hp: 60, dmg: 30, scaleMul: 1,   speedMul: 0.9,  aggroMul: 1,   exp: 32,  ring: '#9f6bff', colors: { hide: '#3a2a5c', horn: '#d9c6ff', snout: '#241a3d', eye: '#7fffd4' } },
  shocker:  { hp: 60, dmg: 30, scaleMul: 1,   speedMul: 0.9,  aggroMul: 1,   exp: 30,  element: 'lightning', resist: { lightning: 0.5 }, ring: '#fff066', colors: { hide: '#8a7a2e', horn: '#fffde0', snout: '#4a4015', eye: '#fff9b0' } },
  pyro:     { hp: 50, dmg: 30, scaleMul: 1,   speedMul: 0.85, aggroMul: 2.8, exp: 35,  element: 'fire', resist: { fire: 0.6 }, ring: '#ff4d1a', colors: { hide: '#5a1f1a', horn: '#ffb36b', snout: '#2e0f0c', eye: '#ffd34d' } },
  venom:    { hp: 60, dmg: 30, scaleMul: 1,   speedMul: 0.95, aggroMul: 1,   exp: 28,  element: 'poison', resist: { poison: 0.5 }, ring: '#7fe05a', colors: { hide: '#3f6e2a', horn: '#d8f5b0', snout: '#1f3a14', eye: '#c6ff4d' } },
  // 해골 카우 (2026-10-10) - 2026-10-11부터 목장 2·3막에 나옴(data/acts.js). skeleton: 해골 그림, boss: 보스 취급(CC 면역), shield: 방패를 든 그림
  skeletonBrute:  { hp: 110, dmg: 60, scaleMul: 1.2, speedMul: 0.85, aggroMul: 1.2, exp: 34, skeleton: true, reach: 18, hitAt: 0.45, attackTime: 1.0, resist: { poison: 0.75 }, ring: '#d8d2c0', colors: { hide: '#e8e2d0', horn: '#cfc6b0', snout: '#bdb39a', eye: '#7fffd4' } }, // 해골 전사: 대검·도끼 - 등 뒤에서 머리 위로 내리침, hitAt초에 맞음(묵직)
  skeletonSpear:  { hp: 55, dmg: 35, scaleMul: 1, speedMul: 1, aggroMul: 1.2, exp: 24, skeleton: true, reach: 30, resist: { poison: 0.75 }, ring: '#d8d2c0', colors: { hide: '#e8e2d0', horn: '#cfc6b0', snout: '#bdb39a', eye: '#7fffd4' } }, // 해골 창병: 창으로 멀리서 찌름(근접 사거리 + reach)
  // 영혼 (2026-10-11, 사용자 참고 그림): 불꽃 기둥 같은 영혼 - soul: 그림 색(render/soulSprites.js), 행동 entities/rangedBehaviors.js (불규칙하게 떠다니다 긴 번개)
  burningSoul: { hp: 40, dmg: 15, scaleMul: 1, speedMul: 1.5, aggroMul: 2, exp: 26, soul: 'fire',  element: 'lightning', resist: { lightning: 0.75, fire: 0.5 }, ring: null, colors: null },
  paleSoul:    { hp: 40, dmg: 15, scaleMul: 1, speedMul: 1.5, aggroMul: 2, exp: 26, soul: 'ghost', element: 'lightning', resist: { lightning: 0.75, cold: 0.5, poison: 0.5 }, ring: null, colors: null },
  skeletonShield: { hp: 90, dmg: 30, scaleMul: 1.15, speedMul: 0.8, aggroMul: 1.2, exp: 30, skeleton: true, shield: true, resist: { phys: 0.5, poison: 0.75 }, ring: '#c9c1aa', colors: { hide: '#e8e2d0', horn: '#cfc6b0', snout: '#bdb39a', eye: '#7fffd4' } }, // 해골 방패병: 단단함(물리 절반), 느림
  skeleton:     { hp: 50,  dmg: 30, scaleMul: 1,   speedMul: 1.05, aggroMul: 1.1, exp: 20,  skeleton: true, resist: { poison: 0.75 }, ring: '#d8d2c0', colors: { hide: '#e8e2d0', horn: '#cfc6b0', snout: '#bdb39a', eye: '#7fffd4' } },
  skeletonKing: { hp: 600, dmg: 40, scaleMul: 2.2, speedMul: 0.8,  aggroMul: 2.4, exp: 300, skeleton: true, boss: true, resist: { poison: 0.75, cold: 0.3 }, ring: '#7fffd4', colors: { hide: '#d6cfba', horn: '#b9ae92', snout: '#a99f86', eye: '#7fffd4' } },
  // 궁수 (2026-10-10, 궁수 카우는 관리자 페이지에만 / 해골 궁수는 목장 2·3막): 거리를 두고 조준(조준선) → 화살 (entities/rangedBehaviors.js). 해골 궁수는 해골 그림
  archer:         { hp: 50, dmg: 20, scaleMul: 1, speedMul: 1,    aggroMul: 1.6, exp: 25, adminOnly: true, ring: '#9be35a', colors: { hide: '#6b5a3a', horn: '#e8d8b0', snout: '#3e3322', eye: '#ffe066' } },
  skeletonArcher: { hp: 40, dmg: 20, scaleMul: 1, speedMul: 1.05, aggroMul: 1.6, exp: 22, skeleton: true, resist: { poison: 0.75 }, ring: '#d8d2c0', colors: { hide: '#e8e2d0', horn: '#cfc6b0', snout: '#bdb39a', eye: '#7fffd4' } },
  // 악마 카우 종족 (2026-10-10, 목장 3막 - data/acts.js): 화염 저항 50%·냉기에 약함(저항 -25% = 더 아픔), 검붉은 몸 + 보랏빛 (demon: 악마 꾸밈 그림)
  //   행동은 entities/demonBehaviors.js, 저주는 systems/curses.js, 지옥불 원은 systems/demonSpells.js
  imp:           { hp: 35,  dmg: 20, scaleMul: 0.8,  speedMul: 1.6,  aggroMul: 1.5, exp: 15,  demon: 'imp', resist: { fire: 0.5, cold: -0.25 }, ring: '#b04dff', colors: { hide: '#7a1a1a', horn: '#2a0a0a', snout: '#4a0d0d', eye: '#ffd34d' } },
  demonCurser:   { hp: 55,  dmg: 20, scaleMul: 1,    speedMul: 0.9,  aggroMul: 2.2, exp: 30,  demon: 'curser', resist: { fire: 0.5, cold: -0.25 }, ring: '#b04dff', colors: { hide: '#4a1030', horn: '#1a0a14', snout: '#2e0a1e', eye: '#d98bff' } },
  demonBerserker: { hp: 110, dmg: 45, scaleMul: 1.25, speedMul: 1.0,  aggroMul: 1.4, exp: 35,  demon: 'berserker', resist: { fire: 0.5, cold: -0.25 }, ring: '#ff2d2d', colors: { hide: '#8a1414', horn: '#1a0606', snout: '#520a0a', eye: '#ffef5a' } },
  demonKing:     { hp: 900, dmg: 50, scaleMul: 2.6,  speedMul: 0.85, aggroMul: 2.4, exp: 500, demon: 'king', boss: true, hitAt: 0.35, attackTime: 0.9, resist: { fire: 0.5, cold: -0.15, lightning: 0.2, poison: 0.2 }, ring: '#b04dff', colors: { hide: '#5a0f14', horn: '#14060a', snout: '#3a0a0e', eye: '#ff5ad8' } },
  boss:     { hp: 780, dmg: 30, scaleMul: 2.0, speedMul: 0.85, aggroMul: 1,   exp: 400, hitAt: 0.35, attackTime: 0.9, resist: { fire: 0.2, cold: 0.2, lightning: 0.2, poison: 0.2 }, ring: '#c98bef', colors: { hide: '#6a3f8a', horn: '#e8d4ff', snout: '#361a52', eye: '#ffe066' } } // hitAt: 큰 도끼가 내려오는 순간 (2026-10-11)
};
// 종류별로 들 수 있는 무기 (그림은 render/monsterWeapons.js). 같은 종류 안에서는 개체마다 이 중 하나
export const MONSTER_WEAPONS = {
  normal:   ['halberd', 'pitchfork', 'club', 'axe', 'spear'],
  tough:    ['hammer', 'axe'],
  fast:     ['cleaver', 'spear'],
  cold:     ['spear', 'halberd'],
  charger:  ['spear'],
  fanatic:  ['cleaver', 'axe'],
  burning:  ['torch'],
  exploder: ['club'],
  shaman:   ['staff'],
  shocker:  ['rod'],
  venom:    ['pitchfork', 'cleaver'],
  pyro:     ['firestaff'],
  boss:     ['battleaxe'],   // 카우킹: 양손 도끼 (2026-10-11 사용자)
  skeleton: ['club', 'spear'],
  skeletonKing: ['staff'],
  skeletonShield: ['cleaver'],
  skeletonSpear: ['spear'],
  skeletonBrute: ['greatsword', 'battleaxe'],
  burningSoul: ['rod'],   // 그림에 무기 없음 (목록만)
  paleSoul: ['rod'],
  archer: ['bow'],
  skeletonArcher: ['bow'],
  imp: ['pitchfork'],
  demonCurser: ['staff'],
  demonBerserker: ['cleaver', 'axe'],
  demonKing: ['demonblade']  // 악마 카우킹: 악마 대검 (2026-10-11 사용자 - 검붉은 톱니 날, render/monsterWeapons.js)
};
// 개체별 무기 고르기 - 게임 난수(Math.random)를 소비하지 않도록 개체가 이미 가진 값(애니메이션 위상 등)으로 정함
export function weaponFor(kind, seed) {
  const list = MONSTER_WEAPONS[kind] || MONSTER_WEAPONS.normal;
  return list[Math.floor(Math.abs(seed) * 7919) % list.length];
}

// 영혼 몬스터 색 (render/soulSprites.js) - glow 빛 기둥, outer/inner 불꽃 혀 바깥/안, tip 가운데 심지, base 바닥 소용돌이
export const SOUL_PALETTES = {
  fire:  { glow: '#ff2a3a', outer: '#c0182a', inner: '#ff5a6a', tip: '#ffd0d6', base: '#7aff8a' },
  ghost: { glow: '#9fb4ff', outer: '#7a6ad8', inner: '#c8d4ff', tip: '#ffffff', base: '#b8a8ff' }
}

// 몬스터가 든 무기 크기 배율 (없으면 1) - 2026-10-11 사용자: 카우킹 2배, 악마 카우킹 1.6배, 해골 카우 킹 1배
export const WEAPON_SCALE = { boss: 2, demonKing: 1.6, skeletonKing: 1 };
export const weaponScaleOf = (kind) => WEAPON_SCALE[kind] || 1;

// 몬스터 이름 (관리자 페이지·안내 문구용)
export const MONSTER_LABEL = {
  normal: '카우', tough: '근육 카우', fast: '날쌘 카우', cold: '냉기 카우', charger: '돌진 카우', fanatic: '광신 카우',
  burning: '버닝 카우', exploder: '자폭 카우', shaman: '주술사 카우', shocker: '전기 카우', pyro: '화염술사 카우',
  venom: '독 카우', boss: '카우킹', skeleton: '해골 카우', skeletonKing: '해골 카우 킹', skeletonShield: '해골 방패병', skeletonSpear: '해골 창병', skeletonBrute: '해골 전사', burningSoul: '버닝 소울', paleSoul: '창백한 원혼', archer: '궁수 카우', skeletonArcher: '해골 궁수 카우',
  imp: '임프 카우', demonCurser: '악마 저주 카우', demonBerserker: '악마 버서커 카우', demonKing: '악마 카우킹'
};

export const FLASH_COLORS = { hide: '#ffffff', horn: '#ffffff', snout: '#ffffff', eye: '#ffffff' };

// 엘리트 풀 - 웨이브 ELITE_MIN_WAVE부터 eliteChance = min(BASE + wave * PER_WAVE, MAX) 확률로 이 중 하나가 균등하게 뽑힘
export const ELITE_KINDS = ['tough', 'fast', 'cold', 'charger', 'fanatic', 'burning', 'exploder', 'shaman', 'shocker', 'venom', 'pyro'];
export const ELITE_MIN_WAVE = 2;
export const ELITE_CHANCE_BASE = 0.16;
export const ELITE_CHANCE_PER_WAVE = 0.05;
export const ELITE_CHANCE_MAX = 0.45;
