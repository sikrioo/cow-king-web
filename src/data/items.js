// 아이템 콘텐츠 (이름/색/슬롯/변형/옵션/등급)

// --- 소모품
export const ITEM_STYLE = {
  heal:     { color: '#ff5b52', label: 'HP' },
  mana:     { color: '#4d6bff', label: 'MP' },
  vitality: { color: '#ffd34d', label: '체력' },
  speed:    { color: '#5be0c9', label: '속도' },
  attack:   { color: '#ff8a3d', label: '공격' },
  defense:  { color: '#6fb3ff', label: '블락' }
};
export const POTION_LABEL = { heal: '생명물약', mana: '마나물약', speed: '속도물약', attack: '공격물약', defense: '블락물약', vitality: '체력물약' };

// --- 장비 (갑옷/무기/각반/신발/장신구2)
export const GEAR_SLOTS = ['armor', 'weaponMain', 'weaponOff', 'greaves', 'boots', 'accessory1', 'accessory2'];
export const GEAR_SLOT_LABEL = {
  armor: '갑옷', weaponMain: '무기(주)', weaponOff: '무기(보조)',
  greaves: '각반', boots: '신발', accessory1: '장신구1', accessory2: '장신구2'
};
export const GEAR_CATEGORY_LABEL = { armor: '갑옷', weapon: '무기', greaves: '각반', boots: '신발', accessory: '장신구', shield: '방패' };
export const GEAR_VARIANT_LABEL = {
  sword: '검', axe: '도끼', mace: '메이스', dagger: '단검', spear: '창',
  amulet: '목걸이', ring: '반지', charm: '부적'
};
export const WEAPON_VARIANTS = ['sword', 'axe', 'mace', 'dagger', 'spear'];
export const ACCESSORY_VARIANTS = ['amulet', 'ring', 'charm'];
export const GEAR_CATEGORY_COLOR = { armor: '#c9a227', weapon: '#e05b4d', greaves: '#7fa8c9', boots: '#8fbf6b', accessory: '#c07fe0' };

// --- 옵션 범위
// flat: 고정 수치 옵션 - 굴릴 때/강화할 때 정수로 반올림 (나머지는 % 옵션이라 소수 그대로)
// defense = 블락률(피격 시 데미지를 통째로 막을 확률). 키 이름은 골든 호환 때문에 유지 - 피해 감소 방어력은 별도 키로 추가 예정
export const STAT_DEF = {
  atkSpeed:  { label: '공격속도', min: 0.05, max: 0.20, fmt: (v) => `+${Math.round(v * 100)}%` },
  atkPower:  { label: '공격력',   min: 10,   max: 30,   flat: true, fmt: (v) => `+${Math.round(v)}` },
  defense:   { label: '블락률', min: 0.05, max: 0.20, fmt: (v) => `+${Math.round(v * 100)}%` },
  evasion:   { label: '회피율',   min: 0.05, max: 0.15, fmt: (v) => `+${Math.round(v * 100)}%` },
  moveSpeed: { label: '이동속도', min: 0.05, max: 0.15, fmt: (v) => `+${Math.round(v * 100)}%` },
  health:    { label: '체력',     min: 10,   max: 30,   flat: true, fmt: (v) => `+${Math.round(v)}` },
  mana:      { label: '마나',     min: 5,    max: 15,   flat: true, fmt: (v) => `+${Math.round(v)}` }
};

// --- 등급
export const RARITY_DEF = {
  normal:    { label: '일반',   color: '#e8e8e8', weight: 55, statMin: 1, statMax: 1, mult: 1.0 },
  magic:     { label: '매직',   color: '#4d7fff', weight: 28, statMin: 1, statMax: 2, mult: 1.15 },
  rare:      { label: '레어',   color: '#ffd23f', weight: 13, statMin: 2, statMax: 3, mult: 1.35 },
  legendary: { label: '레전드', color: '#ff8c1a', weight: 4,  statMin: 3, statMax: 4, mult: 1.7 }
};
export const RARITY_TOTAL_WEIGHT = Object.values(RARITY_DEF).reduce((s, r) => s + r.weight, 0);
