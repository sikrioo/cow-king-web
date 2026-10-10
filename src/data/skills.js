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
  flurry:    { label: '난타',   type: 'physical', color: 'rgba(255,170,90,0.42)',  desc: '제자리에서 앞의 적을 빠르게 여러 번 벰' },
  concuss:   { label: '뇌진탕', type: 'physical', color: 'rgba(230,210,120,0.42)', desc: '앞의 적을 세게 내리쳐 오래 기절시킴' },
  berserk:   { label: '버서커', type: 'physical', color: 'rgba(220,40,40,0.45)',   desc: '잠깐 공격력·공격속도가 크게 오르지만 받는 피해도 늘어남' },
  decoy:     { label: '더미',   type: 'physical', color: 'rgba(200,200,210,0.40)', desc: '나와 같은 모습의 미끼 - 주변 몬스터가 미끼를 공격함' },
  // 무기 특수기 (전사): 그 무기의 마스터리가 SPECIAL_MASTERY_LEVEL 이상이면 카드에 나옴, 그 무기를 들었을 때만 씀 (weapon = 주무기 종류, offhand = 보조 칸)
  spinblade:    { label: '회전검',     type: 'physical', weapon: 'sword',      mastery: 'sword',      color: 'rgba(216,216,224,0.45)', desc: '검을 회전시켜 던짐 - 갔다가 돌아오며 지나가는 적을 여러 번 벰' },
  skyfall:      { label: '내려찍기',   type: 'physical', weapon: 'greatsword', mastery: 'greatsword', color: 'rgba(138,143,153,0.5)',  desc: '지정한 곳 위에 대검이 떠올라 커지다가 내리꽂힘 - 착지 피해 + 앞쪽 충격파' },
  whirlaxe:     { label: '회전도끼',   type: 'physical', weapon: 'axe',        mastery: 'axe',        color: 'rgba(224,91,77,0.45)',   desc: '도끼가 내 주위를 한 바퀴 돌고 돌아옴 - 맞은 적에서 번개가 튐' },
  shieldbounce: { label: '튕기는 방패', type: 'physical', offhand: 'shield',   mastery: 'shield',     color: 'rgba(185,162,122,0.5)',  desc: '방패를 던져 적 사이를 튕김 - 마지막 적은 기절' },
  rollmace:     { label: '굴러가는 메이스', type: 'physical', weapon: 'mace',  mastery: 'mace',       color: 'rgba(201,162,39,0.45)',  desc: '메이스를 던지면 떨어진 뒤 앞으로 굴러감 - 작은 카우는 밀어내고 큰 적에 부딪히면 멈추며 큰 피해' },
  piercespear:  { label: '관통창',     type: 'physical', weapon: 'spear',      mastery: 'spear',      color: 'rgba(127,168,201,0.45)', desc: '창을 곧게 던져 적을 꿰뚫음 - 출혈. 끝에서 잠깐 멈췄다가 돌아옴' },
  vitalthrow:   { label: '급소 투척',  type: 'physical', weapon: 'dagger',     mastery: 'dagger',     color: 'rgba(155,227,155,0.45)', desc: '적 하나의 급소에 단검을 꽂음 - 엘리트·보스에게 더 셈, 체력이 적으면 치명타' },
  // 마법사
  bolt:      { label: '마력탄', type: 'magic', color: 'rgba(180,150,255,0.40)', desc: '마나 없이 쏘는 마력 구슬' },
  fireball:  { label: '화염구', type: 'magic', color: 'rgba(255,122,26,0.42)',  desc: '터지는 불덩이 - 범위 화염 + 화상' },
  frostnova: { label: '서리노바', type: 'magic', color: 'rgba(127,212,255,0.42)', desc: '내 주변 전체에 냉기 - 둔화' },
  chain:     { label: '연쇄번개', type: 'magic', color: 'rgba(255,233,77,0.40)', desc: '앞의 적에서 근처 적들로 튀는 번개' },
  orb:       { label: '얼음보주', type: 'magic', color: 'rgba(191,234,255,0.45)', desc: '얼음 조각을 뿌리며 날아가다 터짐' },
  energyshield: { label: '에너지 쉴드', type: 'magic', aim: 'free', color: 'rgba(110,160,255,0.45)', desc: '일정 시간 동안 정해진 양까지 피해를 대신 막는 보호막 - 다 막으면 깨짐' },
  blizzard:  { label: '눈보라', type: 'magic', color: 'rgba(235,245,255,0.5)', desc: '지정한 곳에 눈보라 지역이 생기고 잠시 뒤 눈 결정이 쏟아짐 - 냉기 지속 피해 + 둔화' },
  firewave:  { label: '화염 파도', type: 'magic', color: 'rgba(255,110,40,0.45)', desc: '바라보는 쪽으로 곧은 불의 벽을 밀어 보냄 - 지나가는 적 모두 화염 + 화상' },
  flamepillar: { label: '화염기둥', type: 'magic', color: 'rgba(255,90,30,0.45)', desc: '지정한 곳 곳곳에서 불기둥이 연달아 솟음 - 화염 피해 + 화상' },
  discharge: { label: '방전', type: 'magic', aim: 'free', color: 'rgba(143,232,255,0.45)', desc: '내 주위를 도는 전기 구체 - 가까이 온 적에게 번개, 처음 맞으면 짧은 경직(돌진·충전·시전을 끊음)' },
  polymorph: { label: '대규모 변이', type: 'magic', aim: 'free', color: 'rgba(240,240,240,0.5)', desc: '내 주변 적을 전부 양으로 바꿈 - 공격·특수 행동을 못 하고 느리게 돌아다님(맞아도 안 풀림). 엘리트는 짧게, 보스는 면역' },
  balllightning: { label: '볼 라이트닝', type: 'magic', color: 'rgba(200,240,255,0.45)', desc: '지정한 곳에 전기 구체를 설치 - 주변 적에게 번개를 쏘다가 사라지며 폭발. 다시 누르면 바로 터짐' },
  // 공통
  teleport:  { label: '순간이동', type: 'common', aim: 'free', color: 'rgba(160,140,255,0.45)', desc: '커서 쪽(모바일은 바라보는 쪽)으로 순간이동' }
};
// 새 스킬 카드가 나오기 시작하는 주인공 레벨. 스킬은 레벨업 카드로 배움(systems/levelCards.js) - 시작 슬롯 2개만 처음부터 Lv1
export const SKILL_UNLOCK_LEVEL = {
  attack: 1, warcry: 1, rush: 2, leap: 3, smash: 4, whirlwind: 5, fortify: 3, flurry: 2, concuss: 4, berserk: 6, decoy: 7,
  bolt: 1, fireball: 1, frostnova: 2, chain: 4, orb: 6, energyshield: 3, flamepillar: 5, firewave: 7, blizzard: 8, discharge: 3, balllightning: 6, polymorph: 9,
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
  teleport:  { range: 0.10, cdr: 0.08 },    // cdr: 대기시간 감소
  flurry:    { damage: 0.10 },
  concuss:   { damage: 0.12, stun: 0.15 },
  berserk:   { duration: 0.10, power: 0.08 }, // power: 공격력 증가 비율에 더함
  decoy:     { duration: 0.15, life: 0.15 },  // life: 미끼 체력 비율에 더함
  energyshield: { duration: 0.10, amount: 0.15 }, // amount: 흡수량
  blizzard:  { damage: 0.12, radius: 0.06 },
  flamepillar: { damage: 0.15, radius: 0.08 },
  firewave:  { damage: 0.12, range: 0.08 },
  spinblade: { damage: 0.12 }, skyfall: { damage: 0.12, radius: 0.05 }, whirlaxe: { damage: 0.12 }, shieldbounce: { damage: 0.12 },
  rollmace: { damage: 0.12 }, piercespear: { damage: 0.12 }, vitalthrow: { damage: 0.12 },
  // 방전·볼 라이트닝: 기획서(v0.1) Lv1→10 수치를 Lv1→5에 맞춤 (2026-10-10 결정: 최대 레벨 5 유지)
  discharge: { damage: 0.2, radius: 0.08, duration: 0.1 },
  polymorph: { radius: 0.055, duration: 0.125, cdr: 0.042 }, // Lv5: 반경 220, 3초, 대기시간 15초 근처
  balllightning: { damage: 0.19, duration: 0.06, targets: 0.5, radius: 0.03 } // targets: 동시에 쏘는 대상 수에 더함(내림)
};
// 카드에 쓰는 이름 (pct: 배율이면 %, 아니면 개수)
export const SKILL_LEVEL_STAT = {
  damage: { label: '피해', pct: true },
  radius: { label: '범위', pct: true },
  stun:   { label: '기절 시간', pct: true },
  jumps:  { label: '튕김', pct: false },
  life:     { label: '체력', pct: true, add: true }, // add: 배율이 아니라 기본 비율에 그대로 더한 값 (%p)
  power:    { label: '공격력 증가', pct: true, add: true },
  absorb:   { label: '흡수율', pct: true, add: true },
  duration: { label: '지속 시간', pct: true },
  range:    { label: '거리', pct: true },
  cdr:      { label: '대기시간', pct: true, neg: true },
  targets:  { label: '대상 수', pct: false },
  amount:   { label: '흡수량', pct: true }
};

// 마법이 아닌 스킬 수치 (전사 보조·공통). 대기시간은 시전속도 영향
//   fortify: life = 최대 체력(장비 포함)에 대한 비율, duration 초 / teleport: range px
//   flurry: hits번을 interval초 간격으로, 한 번에 무기 피해 × ratio / concuss: 무기 피해 + bonus, 앞쪽 arc(라디안) 안, stun 초
//   berserk: power = 주는 피해 +, speed = 공격속도 +, taken = 받는 피해 + / decoy: life = 미끼 체력(내 최대 체력 대비), taunt = 몬스터를 끄는 거리
export const SKILL_STATS = {
  fortify:  { mana: 20, cooldown: 18, life: 0.30, duration: 10 },
  teleport: { mana: 12, cooldown: 4,  range: 260 },
  flurry:   { mana: 10, cooldown: 2.6, hits: 5, interval: 0.12, ratio: 0.7 },
  concuss:  { mana: 12, cooldown: 5,  bonus: 25, stun: 2.2, reach: 30, arc: 1.0 },
  berserk:  { mana: 15, cooldown: 16, duration: 6, power: 0.40, speed: 0.25, taken: 0.30 },
  decoy:    { mana: 18, cooldown: 14, duration: 8, life: 1.0, taunt: 320, distance: 70 },
  // 무기 특수기 (스킬 기획 정의서 v0.1): 피해 = 무기 한 타(heroHitDamage) × ratio. 무기가 손을 떠난 동안 기본 공격 못 함, 돌아오는 속도 returnSpeed
  //   회전검: speed로 range까지 갔다 돌아옴, 같은 적은 tick초마다 한 번, 갈 때·올 때 각 maxTicks번까지
  //   elem/elemRatio: 특수기마다 원소 피해가 더해짐 (무기 한 타 × 배율 × elemRatio) - 검·대검 화염, 도끼·창 번개, 단검 독, 방패·메이스 냉기 (2026-10-10 사용자 결정)
  spinblade:    { mana: 10, cooldown: 5,  elem: 'fire', elemRatio: 0.4, range: 280, speed: 640, ratio: 0.6, tick: 0.15, maxTicks: 3, radius: 30 },
  //   내려찍기: range 안 지점 위에서 charge초 동안 커지고 → hang초 동안 살짝 들렸다 멈칫(내려찍기 직전 딜레이) → fall초 만에 낙하 - 반경 radius ratio, 그 바깥 앞쪽(시전 방향) waveArc 부채꼴 waveRange까지 waveRatio
  skyfall:      { mana: 22, cooldown: 10, elem: 'fire', elemRatio: 0.4, range: 320, charge: 0.6, hang: 0.22, fall: 0.1, radius: 110, ratio: 2.5, waveRatio: 1.0, waveRange: 200, waveArc: 1.5708, stick: 0.35, height: 150 },
  //   회전도끼: 내 주위 orbit 반경을 time초에 한 바퀴, 같은 적은 한 번 - 물리 ratio + 번개, 맞은 적에서 chainRange 안 chain명에게 번개 chainRatio
  whirlaxe:     { mana: 18, cooldown: 8,  elem: 'lightning', elemRatio: 0.5, orbit: 150, time: 1.2, spread: 0.15, ratio: 1.0, chain: 2, chainRatio: 0.3, chainRange: 160, radius: 34 },
  //   튕기는 방패: first 안 가장 가까운 적 → seek 안 아직 안 맞은 적으로 bounces번까지, 한 번에 ratio / 마지막 lastRatio + 기절 stun
  shieldbounce: { mana: 14, cooldown: 7,  elem: 'cold', elemRatio: 0.4, first: 300, seek: 160, bounces: 6, speed: 620, ratio: 0.5, lastRatio: 1.5, stun: 0.8 },
  //   굴러가는 메이스: flight초 동안 포물선으로 throw만큼 → 착지 반경 landRadius landRatio → rollSpeed로 roll만큼 굴러감
  //   작은 카우(일반)는 rollRatio + 밀어냄, 그 밖(큰 카우·엘리트·보스)에 부딪히면 멈추며 stopRatio. 맞은 적 기절 stun(보스 제외)
  rollmace:     { mana: 16, cooldown: 8,  elem: 'cold', elemRatio: 0.4, throw: 200, flight: 0.45, arc: 60, landRadius: 55, landRatio: 0.5, roll: 240, rollSpeed: 190, rollRatio: 0.8, stopRatio: 1.5, knock: 9, stun: 0.5, radius: 26 },
  //   관통창: speed로 range까지 곧게 - 지나가는 적마다 ratio + 출혈(초당 무기 한 타 × bleed, bleedTime초, 겹치지 않고 갱신). 끝에서 pause초 멈췄다 돌아옴(돌아올 땐 안 맞음)
  piercespear:  { mana: 12, cooldown: 6,  elem: 'lightning', elemRatio: 0.4, range: 420, speed: 900, ratio: 1.0, bleed: 0.3, bleedTime: 3, pause: 0.3, radius: 24 },
  //   급소 투척: 커서 위 적(없으면 range 안 가까운 적) 하나 - charge초 뒤 speed로 날아가 ratio(엘리트·보스 ×(1+eliteBonus)), 대상 체력 execute 이하면 ×crit. 꽂힌 채 stick초 뒤 돌아옴
  vitalthrow:   { mana: 12, cooldown: 6,  elem: 'poison', elemRatio: 0.4, range: 350, charge: 0.3, speed: 1300, ratio: 4.0, eliteBonus: 0.5, execute: 0.3, crit: 2, stick: 0.5 }
};
export const SPECIAL_MASTERY_LEVEL = 3; // 무기 특수기 카드가 나오는 마스터리 레벨 (2026-10-10 사용자 아이디어)
export const THROW_RETURN_SPEED = 820;  // 던진 무기가 돌아오는 속도(px/초)
export const THROW_TRAIL = 7;           // 던진 무기 뒤 원소 꼬리 길이(지난 위치 개수, 그림용)

// 마법 수치 (피해는 ×10 스케일 정수, 주인공 레벨마다 SPELL_LEVEL_SCALE만큼 오름 + 스킬 레벨 보너스)
//   mana: 소모, cooldown: 초, speed/range/radius: 투사체(px), explode: 폭발 반경
export const SPELL_LEVEL_SCALE = 0.07;
export const SPELLS = {
  bolt:      { mana: 0,  cooldown: 0.42, damage: 22, speed: 430, range: 420, radius: 7 },                 // 기본 공격 (공격속도 영향)
  fireball:  { mana: 9,  cooldown: 0.75, damage: 38, speed: 330, range: 440, radius: 10, explode: 52 },   // 화염 → 화상
  frostnova: { mana: 14, cooldown: 3.0,  damage: 24, radius: 150 },                                         // 냉기 → 둔화, 주변 전체
  chain:     { mana: 13, cooldown: 1.1,  damage: 40, range: 340, cone: 0.7, jumpRange: 170, jumps: 4, falloff: 0.85 }, // 번개, 근처로 튐
  orb:       { mana: 18, cooldown: 2.2,  speed: 150, range: 420, radius: 12,                              // 얼음 보주: 날아가며 얼음 조각을 뿌리고 끝에서 터짐
               shardEvery: 0.07, shardSpin: 0.75, shardSpeed: 320, shardRange: 170, shardRadius: 5, shardDamage: 14, burst: 14 },
  // 에너지 쉴드: duration초 동안 받는 피해를 전부 먼저 막는 보호막 - 흡수량 amount(주인공 레벨마다 SPELL_LEVEL_SCALE만큼 늘어남)를 다 막으면 깨짐 (2026-10-10 사용자 콘셉트)
  energyshield: { mana: 18, cooldown: 12, duration: 10, amount: 120 },

  // 지점 스킬 (자동 조준 지점, range 밖이면 시전 안 함): 눈보라 = duration초 동안 tick초마다 반경 안 냉기 피해
  //   눈보라 = delay초 동안 지역이 생기고 그다음 duration초 동안 피해 / 화염기둥 = delay초 뒤부터 interval초마다 불기둥 count개가 반경(radius) 안 곳곳에서 솟음, 기둥마다 pillarRadius 안 화염 피해
  blizzard:  { mana: 22, cooldown: 5,   damage: 14, tick: 0.3, delay: 0.5, duration: 3, radius: 120, range: 380 }, // delay: 지역이 생기고 눈이 쏟아지기까지
  flamepillar: { mana: 16, cooldown: 2.5, damage: 32, delay: 0.4, count: 6, interval: 0.13, pillarRadius: 36, radius: 85, range: 380 },
  // 화염 파도: 주인공에서 바라보는 쪽으로 곧은 불의 벽(폭 width, 두께 thick)이 travel초 동안 range까지 - 처음에 확 터져 나갔다가 점점 느려지며 멈춤(무게감)
  //   지나가는 적은 한 번씩 맞고 벽이 나아가는 쪽으로 knock만큼 밀려남, 그을린 자국은 멈춘 뒤 linger초 동안 남음
  firewave:  { mana: 20, cooldown: 3.5, damage: 45, travel: 0.6, range: 170, width: 180, thick: 64, knock: 9, linger: 0.8 },
  // 방전: 전기 구체 orbs개가 duration초 동안 내 주위(orbit px)를 돎 - tick초마다 구체마다 radius 안 가까운 적 하나에게 번개 damage, 그 적이 이번 시전에서 처음 맞으면 stagger초 경직 (2026-10-10 사용자 콘셉트)
  discharge: { mana: 16, cooldown: 8, duration: 6, orbs: 3, orbit: 34, spin: 3, tick: 0.5, damage: 16, radius: 100, stagger: 0.4 },
  // 볼 라이트닝: range 안 지점에 구체 설치 → duration초 동안 arcEvery초마다 arcRadius 안 가까운 적 targets명에게 번개 arcDamage
  //   사라질 때(또는 다시 누르면 바로) burstRadius 안 번개 burst. 스킬 레벨 twoAt부터 동시에 2개, 사라지기 blink초 전부터 깜빡임
  // 대규모 변이: 내 주변 radius 안 적을 duration초 동안 양으로 (엘리트 ×eliteMul, 보스 면역). 같은 적에게 drWindow초 안에 다시 걸면 ×drMul, 세 번째는 면역
  //   양: 공격·특수 행동·오라 멈춤, 이동속도 ×wanderMul로 무작위 배회(wanderTurn초마다 방향 바꿈), 맞아도 안 풀림, 피해 증가 없음
  polymorph: { mana: 25, cooldown: 18, radius: 180, duration: 2, eliteMul: 0.5, drWindow: 8, drMul: 0.5, wanderMul: 0.6, wanderTurn: 0.7 },
  balllightning: { mana: 18, cooldown: 6, range: 300, duration: 4, arcDamage: 20, arcEvery: 0.5, arcRadius: 140, targets: 3,
                   burst: 60, burstRadius: 160, twoAt: 4, grow: 0.3, blink: 0.3 }
};
