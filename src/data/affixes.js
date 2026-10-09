// 접사(옵션 묶음) 데이터 - 디아블로식 접두/접미 + 티어 + 그룹 구조만 빌림 (이름은 안 씀: 장비 이름은 지금처럼 '검', '방패'…)
// 생성 규칙은 systems/itemGen.js, 표시는 ui/itemView.js
//
//   side: 'prefix' | 'suffix' - 생성 칸 구분 (레어는 각 방향 최대 3개). 능력치 성격과는 무관
//   group: 같은 아이템의 같은 방향에선 같은 그룹 하나만 (티어끼리 중복 불가). 다른 그룹이면 같은 능력치여도 함께 붙을 수 있음
//   types: 붙을 수 있는 장비 분류 (data/items.js의 category)
//   tiers: [최소 접사 레벨(alvl), 수치 범위, 가중치, 'magicOnly'?]
//     수치 범위: 능력치 하나면 [min, max], 여럿(하이브리드)이면 { 능력치: [min, max], ... } - 접사 하나가 옵션 여러 줄
//     magicOnly: 매직에서만 나오는 최상위 티어 (매직이 레어의 하위 호환이 되지 않게)
//   flat 능력치(공격력/체력/마나/원소 피해)는 ×10 정수, 그 밖은 비율
//   수치는 우리 게임 밸런스 값 (원작 데이터 아님)
const W = ['weapon'];
const ACC = ['accessory'];
const DEF_ALL = ['armor', 'greaves', 'boots', 'shield', 'accessory'];

const FAMILIES = [
  // ── 접두사: 공격/생존 ──
  { id: 'power', side: 'prefix', group: 'power', stat: 'atkPower', types: [...W, ...ACC, 'greaves'],
    tiers: [[1, [5, 10], 12], [8, [11, 18], 8], [16, [19, 28], 4], [24, [29, 40], 2], [18, [41, 55], 1, 'magicOnly']] },
  { id: 'fire', side: 'prefix', group: 'fireDmg', stat: 'fireDmg', types: W,
    tiers: [[1, [8, 15], 10], [8, [16, 26], 7], [16, [27, 40], 4], [24, [41, 58], 2]] },
  { id: 'cold', side: 'prefix', group: 'coldDmg', stat: 'coldDmg', types: W,
    tiers: [[1, [8, 15], 10], [8, [16, 26], 7], [16, [27, 40], 4], [24, [41, 58], 2]] },
  { id: 'lightning', side: 'prefix', group: 'lightningDmg', stat: 'lightningDmg', types: W,
    tiers: [[1, [6, 18], 10], [8, [12, 32], 7], [16, [20, 48], 4], [24, [30, 70], 2]] },
  { id: 'poison', side: 'prefix', group: 'poisonDmg', stat: 'poisonDmg', types: W,
    tiers: [[1, [8, 15], 10], [8, [16, 26], 7], [16, [27, 40], 4], [24, [41, 58], 2]] },
  { id: 'life', side: 'prefix', group: 'life', stat: 'health', types: DEF_ALL,
    tiers: [[1, [8, 15], 12], [8, [16, 25], 8], [16, [26, 38], 4], [24, [39, 55], 2], [18, [56, 70], 1, 'magicOnly']] },
  { id: 'spirit', side: 'prefix', group: 'mana', stat: 'mana', types: [...W, ...ACC, 'armor'],
    tiers: [[1, [5, 9], 10], [8, [10, 15], 7], [16, [16, 24], 3]] },
  { id: 'warlord', side: 'prefix', group: 'warlord', types: [...W, ...ACC], // 하이브리드: 공격력 + 체력
    tiers: [[10, { atkPower: [8, 14], health: [10, 18] }, 4], [20, { atkPower: [15, 22], health: [19, 30] }, 2]] },
  // ── 접미사: 속도/방어 ──
  { id: 'haste', side: 'suffix', group: 'atkSpeed', stat: 'atkSpeed', types: [...W, ...ACC],
    tiers: [[1, [0.04, 0.07], 10], [10, [0.08, 0.12], 6], [20, [0.13, 0.18], 2], [16, [0.19, 0.25], 1, 'magicOnly']] },
  { id: 'focus', side: 'suffix', group: 'castSpeed', stat: 'castSpeed', types: [...W, ...ACC, 'shield'],
    tiers: [[1, [0.06, 0.10], 10], [10, [0.11, 0.16], 6], [20, [0.17, 0.24], 2], [16, [0.25, 0.32], 1, 'magicOnly']] },
  { id: 'swift', side: 'suffix', group: 'moveSpeed', stat: 'moveSpeed', types: ['boots', 'greaves'],
    tiers: [[1, [0.04, 0.07], 10], [10, [0.08, 0.12], 6], [20, [0.13, 0.18], 2]] },
  { id: 'guard', side: 'suffix', group: 'block', stat: 'defense', types: ['shield', 'armor'],
    tiers: [[1, [0.04, 0.07], 10], [10, [0.08, 0.12], 6], [20, [0.13, 0.18], 2]] },
  { id: 'evade', side: 'suffix', group: 'evasion', stat: 'evasion', types: ['boots', 'armor', 'greaves', 'accessory'],
    tiers: [[1, [0.03, 0.05], 10], [10, [0.06, 0.09], 6], [20, [0.10, 0.13], 2]] },
  { id: 'stamina', side: 'suffix', group: 'stamina', stat: 'health', types: DEF_ALL, // 접두사 life와 다른 그룹 → 함께 붙을 수 있음
    tiers: [[1, [5, 9], 8], [12, [10, 16], 4]] },
  { id: 'gale', side: 'suffix', group: 'gale', types: ACC, // 하이브리드: 공격속도 + 이동속도
    tiers: [[14, { atkSpeed: [0.04, 0.07], moveSpeed: [0.03, 0.05] }, 3]] }
];

// 티어마다 접사 한 개 (id 예: 'power_3') - 순수 파생
export const AFFIXES = FAMILIES.flatMap((f) => f.tiers.map(([alvl, range, weight, flag], i) => ({
  id: `${f.id}_${i + 1}`, family: f.id, tier: i + 1, side: f.side, group: f.group, types: f.types, alvl, weight,
  magicOnly: flag === 'magicOnly',
  mods: Array.isArray(range) ? { [f.stat]: range } : range // { 능력치: [min, max] }
})));

// 등급별 접사 규칙
//   magic: 구성(접두만/접미만/둘 다) 비중, rare/legendary: 접사 개수 비중 + 방향당 최대
//   alvlBonus: 접사 레벨 = 아이템 레벨 + 보너스 (레전드는 더 높은 티어가 후보에 듦)
//   후보가 모자라면(낮은 레벨·좁은 부위) 붙을 수 있는 만큼만 붙음
export const AFFIX_RULES = {
  normal:    { count: { 0: 1 } },
  magic:     { compose: { prefix: 25, suffix: 50, both: 25 }, magicOnlyAllowed: true },
  rare:      { count: { 3: 25, 4: 25, 5: 25, 6: 25 }, maxPerSide: 3 },
  legendary: { count: { 5: 50, 6: 50 }, maxPerSide: 3, alvlBonus: 6 }
};
export const MAX_ITEM_LEVEL = 30; // 아이템/접사 레벨 상한 (주인공 최대 레벨과 같음)
