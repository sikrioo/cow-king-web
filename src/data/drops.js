// 드랍 테이블 (디아블로의 트레저 클래스를 단순화): 드랍 출처마다 '무엇이 떨어지나'와 '장비 등급 비중'
// 몬스터 한 마리가 죽을 때 picks번 굴리고, 매번 위에서부터 순서대로: 장비 → 재료 → 소모품. 처음 당첨된 것 하나만 떨어짐
//   출처: normal(일반 카우) / elite(엘리트) / boss(카우킹) / mapBoss(파밍 맵 우두머리) - systems/loot.js dropSource
//   consumable 1 = 앞 단계가 다 빗나가면 소모품은 반드시 (굴리지 않음)
//   quality: 장비 등급 비중 (일반 외 등급은 난이도 rarity 배율을 더 곱함). 장비에 붙는 옵션은 data/affixes.js
//   gear 확률엔 난이도 gearDrop 배율(최대 1), 장비의 아이템 레벨 = 죽은 몬스터 레벨
export const GEAR_DROP_CHANCE = 0.10; // 일반 카우 기준 (난이도 조정으로 하향)
export const MATERIAL_DROP_CHANCE = 0.07; // 하향 조정
export const DROP_RATES = {
  normal:  { gear: GEAR_DROP_CHANCE, material: MATERIAL_DROP_CHANCE, consumable: 0.20, quality: { normal: 55, magic: 28, rare: 13, legendary: 4 } },
  elite:   { gear: 0.5, material: 0.35, consumable: 1, quality: { normal: 40, magic: 35, rare: 19, legendary: 6 } },
  boss:    { gear: 0.8, material: 0.5,  consumable: 1, quality: { normal: 10, magic: 40, rare: 35, legendary: 15 } },
  mapBoss: { gear: 0.7, material: 0.4,  consumable: 1, quality: { normal: 15, magic: 40, rare: 32, legendary: 13 } }
};
// 장비 분류 비중 (드랍 장비가 무엇인지)
export const GEAR_CATEGORY_WEIGHTS = { armor: 1, weapon: 1, greaves: 1, boots: 1, accessory: 1, shield: 1 };
export const DROP_SCATTER = 18; // 죽은 자리에서 흩어지는 최대 거리(px)
export const DISCARD_ITEM_LIFE = 60; // 가방에서 버린 장비가 바닥에 남는 시간(초)

// 소모품 종류 가중치: 생명/마나는 '채우는' 물약. 최대체력을 올리는 체력(vitality) 물약은 의도와 달라서 드랍에서 뺌 (applyItem 코드는 남겨둠)
export const POTION_DROP_WEIGHTS = { heal: 3, mana: 2.5, speed: 1, attack: 1, defense: 1 };
