// 스킬 메타(이름/분류/슬롯 색/설명/새 스킬 카드 레벨), 스킬 레벨 보너스, 마법·기타 스킬 수치.
// aim: 'free' = 자동 조준이 적을 겨누지 않음(순간이동 - 도망칠 때 적 쪽으로 가면 안 됨)
// 분류(type): physical(물리 - 전사) / magic(마법 - 마법사) / common(공통 - 모든 캐릭터). 배운 스킬은 전부 슬롯1/2에 Q/R로 넣음 캐릭터별 스킬 목록·순서는 data/classes.js, 동작(try/쿨다운)은 systems/skills.js의 SKILLS
export const SKILL_ORDER = ['attack', 'warcry', 'whirlwind', 'leap', 'rush', 'smash']; // 전사 레거시 스킬 순서 (classes.warrior.skills 앞부분)
export const SKILL_TYPE_LABEL = { physical: '물리', magic: '마법', common: '공통' };
export const COMMON_SKILLS = ['teleport']; // 모든 캐릭터가 카드로 배울 수 있음 (Q/R 전환 목록 뒤쪽에 붙음)
export const SKILL_META = {
  attack:    { label: '공격',   type: 'physical', color: 'rgba(220,70,60,0.35)',   desc: '앞의 적을 무기로 벰' },
  warcry:    { label: '함성',   type: 'physical', color: 'rgba(232,163,61,0.40)',  desc: '주변 적을 밀쳐내고 기절시킴' },
  whirlwind: { label: '휠윈드', type: 'physical', color: 'rgba(127,212,224,0.40)', desc: '돌면서 주변 적을 계속 벰' },
  leap:      { label: '리프',   type: 'physical', color: 'rgba(201,180,138,0.40)', desc: '앞으로 뛰어올라 착지 지점을 내리찍음' },
  rush:      { label: '러시',   type: 'physical', color: 'rgba(255,138,77,0.40)',  desc: '앞으로 돌진하며 부딪힌 적에게 피해' },
  smash:     { label: '강타',   type: 'physical', color: 'rgba(255,200,87,0.40)',  desc: '땅을 내리쳐 주변에 큰 피해 + 잠깐 기절' },
  fortify:   { label: '투지',   type: 'physical', color: 'rgba(255,107,107,0.42)', desc: '잠깐 동안 최대 체력이 늘고 늘어난 만큼 회복' },
  // 마법사
  bolt:      { label: '마력탄', type: 'magic', color: 'rgba(180,150,255,0.40)', desc: '마나 없이 쏘는 마력 구슬' },
  fireball:  { label: '화염구', type: 'magic', color: 'rgba(255,122,26,0.42)',  desc: '터지는 불덩이 - 범위 화염 + 화상' },
  frostnova: { label: '서리노바', type: 'magic', color: 'rgba(127,212,255,0.42)', desc: '내 주변 전체에 냉기 - 둔화' },
  chain:     { label: '연쇄번개', type: 'magic', color: 'rgba(255,233,77,0.40)', desc: '앞의 적에서 근처 적들로 튀는 번개' },
  orb:       { label: '얼음보주', type: 'magic', color: 'rgba(191,234,255,0.45)', desc: '얼음 조각을 뿌리며 날아가다 터짐' },
  // 공통
  teleport:  { label: '순간이동', type: 'common', aim: 'free', color: 'rgba(160,140,255,0.45)', desc: '커서 쪽(모바일은 바라보는 쪽)으로 순간이동' }
};
// 새 스킬 카드가 나오기 시작하는 주인공 레벨. 스킬은 레벨업 카드로 배움(systems/levelCards.js) - 시작 슬롯 2개만 처음부터 Lv1
export const SKILL_UNLOCK_LEVEL = {
  attack: 1, warcry: 1, rush: 2, leap: 3, smash: 4, whirlwind: 5, fortify: 3,
  bolt: 1, fireball: 1, frostnova: 2, chain: 4, orb: 6,
  teleport: 3
};

// 스킬 레벨: 카드로 배우면 Lv1, 같은 스킬 카드를 또 고르면 +1 (최대 SKILL_MAX_LEVEL)
//   SKILL_LEVEL_UP: Lv1보다 레벨마다 더해지는 양 - damage/radius/stun은 배율(0.15 = +15%), jumps는 개수
export const SKILL_MAX_LEVEL = 5;
export const SKILL_LEVEL_UP = {
  attack:    { damage: 0.10 },
  warcry:    { radius: 0.08, stun: 0.20 },
  whirlwind: { damage: 0.12, radius: 0.06 },
  leap:      { damage: 0.15, radius: 0.08 },
  rush:      { damage: 0.15 },
  smash:     { damage: 0.15, radius: 0.08 },
  bolt:      { damage: 0.12 },
  fireball:  { damage: 0.15, radius: 0.08 },
  frostnova: { damage: 0.12, radius: 0.06 },
  chain:     { damage: 0.12, jumps: 1 },
  orb:       { damage: 0.15 },
  fortify:   { life: 0.06, duration: 0.10 }, // life: 늘어나는 비율에 더함 (Lv1 30% → Lv5 54%)
  teleport:  { range: 0.10, cdr: 0.08 }     // cdr: 대기시간 감소
};
// 카드에 쓰는 이름 (pct: 배율이면 %, 아니면 개수)
export const SKILL_LEVEL_STAT = {
  damage: { label: '피해', pct: true },
  radius: { label: '범위', pct: true },
  stun:   { label: '기절 시간', pct: true },
  jumps:  { label: '튕김', pct: false },
  life:     { label: '체력 증가', pct: true, add: true }, // add: 배율이 아니라 기본 비율에 그대로 더한 값 (%p)
  duration: { label: '지속 시간', pct: true },
  range:    { label: '거리', pct: true },
  cdr:      { label: '대기시간', pct: true, neg: true }
};

// 마법이 아닌 스킬 수치 (투지·순간이동). 대기시간은 시전속도 영향
//   fortify: life = 최대 체력(장비 포함)에 대한 비율, duration 초 / teleport: range px
export const SKILL_STATS = {
  fortify:  { mana: 20, cooldown: 18, life: 0.30, duration: 10 },
  teleport: { mana: 12, cooldown: 4,  range: 260 }
};

// 마법 수치 (피해는 ×10 스케일 정수, 주인공 레벨마다 SPELL_LEVEL_SCALE만큼 오름 + 스킬 레벨 보너스)
//   mana: 소모, cooldown: 초, speed/range/radius: 투사체(px), explode: 폭발 반경
export const SPELL_LEVEL_SCALE = 0.07;
export const SPELLS = {
  bolt:      { mana: 0,  cooldown: 0.42, damage: 22, speed: 430, range: 420, radius: 7 },                 // 기본 공격 (공격속도 영향)
  fireball:  { mana: 9,  cooldown: 0.75, damage: 38, speed: 330, range: 440, radius: 10, explode: 52 },   // 화염 → 화상
  frostnova: { mana: 14, cooldown: 3.0,  damage: 24, radius: 150 },                                         // 냉기 → 둔화, 주변 전체
  chain:     { mana: 13, cooldown: 1.1,  damage: 40, range: 340, cone: 0.7, jumpRange: 170, jumps: 4, falloff: 0.85 }, // 번개, 근처로 튐
  orb:       { mana: 18, cooldown: 2.2,  speed: 150, range: 420, radius: 12,                              // 얼음 보주: 날아가며 얼음 조각을 뿌리고 끝에서 터짐
               shardEvery: 0.07, shardSpin: 0.75, shardSpeed: 320, shardRange: 170, shardRadius: 5, shardDamage: 14, burst: 14 }
};
