// 드랍 테이블 - 지금 동작(dropLoot)을 그대로 옮긴 것. 나중에 트레저 클래스식으로 확장할 자리
// 몬스터 한 마리가 죽을 때 count번 굴리고, 매번 위에서부터 순서대로: 장비 → 재료 → 소모품. 처음 당첨된 것 하나만 떨어짐
//   normal: 일반 카우, guaranteed: 엘리트/보스 (장비 확률이 높고, 앞 단계가 다 빗나가면 소모품은 반드시 - 굴리지 않음)
export const GEAR_DROP_CHANCE = 0.10; // 일반 카우 기준 (난이도 조정으로 하향)
export const MATERIAL_DROP_CHANCE = 0.07; // 하향 조정
export const DROP_RATES = {
  normal:     { gear: GEAR_DROP_CHANCE, material: MATERIAL_DROP_CHANCE, consumable: 0.20 },
  guaranteed: { gear: 0.5, material: 0.35, consumable: 1 }
};
export const DROP_SCATTER = 18; // 죽은 자리에서 흩어지는 최대 거리(px)
export const DISCARD_ITEM_LIFE = 60; // 가방에서 버린 장비가 바닥에 남는 시간(초)

// 소모품 종류 가중치: 생명/마나는 '채우는' 물약. 최대체력을 올리는 체력(vitality) 물약은 의도와 달라서 드랍에서 뺌 (applyItem 코드는 남겨둠)
export const POTION_DROP_WEIGHTS = { heal: 3, mana: 2.5, speed: 1, attack: 1, defense: 1 };
