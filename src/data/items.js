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
  sword: '검', axe: '도끼', mace: '메이스', dagger: '단검', spear: '창', greatsword: '대검',
  amulet: '목걸이', ring: '반지', charm: '부적'
};
export const WEAPON_VARIANTS = ['sword', 'axe', 'mace', 'dagger', 'spear', 'greatsword'];
// 양손으로만 나오는 무기 (대검 - 몸보다 큰 칼, 도끼 - 흉악한 큰 도끼)
export const TWO_HAND_ONLY = ['greatsword', 'axe'];
// 무거운 무기: 기본 공격이 맞을 때 넉백·화면 흔들림·히트스톱(프레임)을 더함
//   windup: 휘두르는 동작의 이 비율 지점에서 피해가 들어감 (등 뒤에서 들어 올렸다가 앞으로 내리치는 딜레이 - 그림은 render/heroSprites)
export const WEAPON_HEAVY = { greatsword: { knock: 13, shake: 3, hitstop: 3, windup: 0.45 }, axe: { knock: 7, shake: 2, hitstop: 1, windup: 0.35 } }; // 도끼도 등 뒤에서 내리침 (대검보다 짧은 딜레이)
export const ACCESSORY_VARIANTS = ['amulet', 'ring', 'charm'];
// 무기 기본 속성 (한손 기준): 피해 min~max, 초당 공격 횟수(aps). 초당 피해는 비슷하게, 느릴수록 한 방이 셈
// 등급 배율·강화(×1.25)는 피해에만 곱함. 양손은 피해 ×TWO_HAND_DAMAGE_MULT, 속도 ×TWO_HAND_SPEED_MULT
export const WEAPON_BASE = {
  dagger: { min: 18, max: 28, aps: 3.3 },
  sword:  { min: 24, max: 36, aps: 2.5 },
  spear:  { min: 26, max: 42, aps: 2.2 },
  axe:    { min: 43, max: 63, aps: 1.41 }, // 양손 전용 - 양손 배율까지 69~101, 초당 약 1.2회 (대검보다 빠르고 가벼움)
  mace:   { min: 30, max: 50, aps: 1.9 },
  greatsword: { min: 60, max: 95, aps: 0.98 } // 양손 전용 - 양손 배율까지 곱하면 96~152, 초당 약 0.83회 (가장 느리고 한 방이 가장 셈, 초당 피해는 다른 무기와 비슷)
};
export const TWO_HAND_DAMAGE_MULT = 1.6;
export const TWO_HAND_SPEED_MULT = 0.85;
export const WEAPON_DAMAGE_LABEL = '무기 피해';
export const WEAPON_SPEED_LABEL = '공격속도';

// 방어구 기본 방어력 (×등급 배율 ×강화). 무기/장신구는 없음
export const GEAR_BASE_ARMOR = { armor: 60, shield: 40, greaves: 30, boots: 20 };
export const ARMOR_LABEL = '방어력';
export const GEAR_CATEGORY_COLOR = { armor: '#c9a227', weapon: '#e05b4d', greaves: '#7fa8c9', boots: '#8fbf6b', accessory: '#c07fe0' };

// --- 능력치 정의 (장비 옵션이 올리는 능력치의 이름·표시·단위)
// 실제로 붙는 옵션과 수치는 접사 데이터(data/affixes.js)의 티어가 정함 - 여기 min/max는 레거시 기록(골든 비교용)이라 생성에는 안 씀
// flat: 고정 수치 옵션 - 굴릴 때/강화할 때 정수로 반올림 (나머지는 % 옵션이라 소수 그대로)
// defense = 블락률(피격 시 데미지를 통째로 막을 확률). 키 이름은 골든 호환 때문에 유지 - 피해 감소 방어력은 GEAR_BASE_ARMOR(옵션 아님)
export const STAT_DEF = {
  atkSpeed:  { label: '공격속도', min: 0.05, max: 0.20, fmt: (v) => `+${Math.round(v * 100)}%` },
  castSpeed: { label: '시전속도', min: 0.10, max: 0.25, fmt: (v) => `+${Math.round(v * 100)}%` }, // 스킬 대기시간 (기본 공격 제외)
  atkPower:  { label: '공격력',   min: 10,   max: 30,   flat: true, fmt: (v) => `+${Math.round(v)}` },
  defense:   { label: '블락률', min: 0.05, max: 0.20, fmt: (v) => `+${Math.round(v * 100)}%` },
  evasion:   { label: '회피율',   min: 0.05, max: 0.15, fmt: (v) => `+${Math.round(v * 100)}%` },
  moveSpeed: { label: '이동속도', min: 0.05, max: 0.15, fmt: (v) => `+${Math.round(v * 100)}%` },
  health:    { label: '체력',     min: 10,   max: 30,   flat: true, fmt: (v) => `+${Math.round(v)}` },
  mana:      { label: '마나',     min: 5,    max: 15,   flat: true, fmt: (v) => `+${Math.round(v)}` },
  // 무기 원소 피해 (타격마다 추가 원소 피해, ×10 정수) - 무기 접사로만 붙음 (data/affixes.js)
  fireDmg:      { label: '화염 피해', min: 15, max: 40, flat: true, element: 'fire', fmt: (v) => `+${Math.round(v)}` },
  coldDmg:      { label: '냉기 피해', min: 15, max: 40, flat: true, element: 'cold', fmt: (v) => `+${Math.round(v)}` },
  lightningDmg: { label: '번개 피해', min: 15, max: 40, flat: true, element: 'lightning', fmt: (v) => `+${Math.round(v)}` },
  poisonDmg:    { label: '독 피해',   min: 15, max: 40, flat: true, element: 'poison', fmt: (v) => `+${Math.round(v)}` }
};
// 옵션 수치 굴림: 접사 티어의 min~max 범위에서 r^OPTION_ROLL_SKEW 위치 (낮은 값이 조금 더 흔함 - 꽝이 있어야 대박이 빛남)
//   굴린 위치(0~1)를 아이템 접사 기록(affixes[].q)에 남겨서 표시 (ui/itemView.js rollTag)
export const OPTION_ROLL_SKEW = 1.4;
export const ROLL_QUALITY = { dud: 0.15, top: 0.92 }; // 이 이하 = 꽝, 이 이상 = 최상
// 개발자 모드 테스트 무기의 원소 피해 값
export const TEST_ELEMENT_WEAPON_DMG = 30;

// --- 등급: weight = 일반 카우 드랍의 등급 비중(출처별 비중은 data/drops.js quality), mult = 베이스 성능(무기 피해·방어력) 배율
//   붙는 접사 개수 규칙은 data/affixes.js AFFIX_RULES
export const RARITY_DEF = {
  normal:    { label: '일반',   color: '#e8e8e8', weight: 55, mult: 1.0 },
  magic:     { label: '매직',   color: '#4d7fff', weight: 28, mult: 1.15 },
  rare:      { label: '레어',   color: '#ffd23f', weight: 13, mult: 1.35 },
  legendary: { label: '레전드', color: '#ff8c1a', weight: 4,  mult: 1.7 }
};
