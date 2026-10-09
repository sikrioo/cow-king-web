// 맵 난이도 (맵 선택 화면에서 고름, 목장·파밍 맵 공통). 면역 무리는 맵에 immune 종류가 있을 때만 (목장은 없음)
//   hp/dmg: 몬스터 체력·공격력 배율, exp: 경험치 배율, gearDrop: 장비 드랍 확률 배율(최대 1),
//   rarity: 장비 등급 굴림에서 일반 외 등급 비중 배율, immunePack: 무리가 면역을 가질 확률, level: 권장 레벨(제한 아님)
//   mlvl: 몬스터 기본 레벨 → 떨군 장비의 아이템 레벨(= 붙을 수 있는 접사 티어, data/affixes.js). 높은 티어는 높은 난이도에서
export const DIFFICULTY_ORDER = ['normal', 'hard', 'extreme'];
export const DIFFICULTY = {
  normal:  { label: '보통',   color: '#c9d2c4', hp: 1,   dmg: 1,   exp: 1,   gearDrop: 1,   rarity: 1,   immunePack: 0,    level: 1,  mlvl: 1 },
  hard:    { label: '어려움', color: '#6bb8ff', hp: 2.2, dmg: 1.6, exp: 1.8, gearDrop: 1.4, rarity: 1.6, immunePack: 0.25, level: 10, mlvl: 11 },
  extreme: { label: '극한',   color: '#ff8a4d', hp: 4,   dmg: 2.4, exp: 3,   gearDrop: 1.9, rarity: 2.4, immunePack: 0.5,  level: 20, mlvl: 21 }
};
// 몬스터 레벨 = 난이도 mlvl + 맵(목장: 웨이브마다 WAVE_MLVL_STEP / 파밍 맵: 맵의 mlvl) + 종류 보너스, 상한 data/affixes.js MAX_ITEM_LEVEL
export const WAVE_MLVL_STEP = 1;
export const MLVL_BONUS = { elite: 2, boss: 4, mapBoss: 3 };
