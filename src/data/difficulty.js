// 파밍 맵 난이도 (맵 선택 화면에서 고름). 웨이브 모드(목장)는 난이도 없음 = normal 수치
//   hp/dmg: 몬스터 체력·공격력 배율, exp: 경험치 배율, gearDrop: 장비 드랍 확률 배율(최대 1),
//   rarity: 장비 등급 굴림에서 일반 외 등급 비중 배율, immunePack: 무리가 면역을 가질 확률, level: 권장 레벨(제한 아님)
export const DIFFICULTY_ORDER = ['normal', 'hard', 'extreme'];
export const DIFFICULTY = {
  normal:  { label: '보통',   color: '#c9d2c4', hp: 1,   dmg: 1,   exp: 1,   gearDrop: 1,   rarity: 1,   immunePack: 0,    level: 1 },
  hard:    { label: '어려움', color: '#6bb8ff', hp: 2.2, dmg: 1.6, exp: 1.8, gearDrop: 1.4, rarity: 1.6, immunePack: 0.25, level: 10 },
  extreme: { label: '극한',   color: '#ff8a4d', hp: 4,   dmg: 2.4, exp: 3,   gearDrop: 1.9, rarity: 2.4, immunePack: 0.5,  level: 20 }
};
