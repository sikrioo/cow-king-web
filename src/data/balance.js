// 밸런스 수치 (튜닝용 숫자는 여기에만). 로직 없음 - expForLevel 같은 순수 파생 함수만 예외

// --- 기본 공격
export const ATTACK_DURATION = 0.22;
export const ATTACK_COOLDOWN = 0.40; // 맨손 공격 간격(초당 2.5회). 무기는 data/items.js WEAPON_BASE의 aps. 스윙 동작 시간은 ATTACK_DURATION × (간격/이 값)
// 공격속도: 속도 배율 = 1 + 장비/레벨 공격속도(상한) + 콤보 → "+20%"는 정말 20% 빨라짐. 전체 배율 상한 2배
export const ATTACK_SPEED_GEAR_CAP = 0.7;
export const ATTACK_SPEED_MAX_MULT = 2;
// 시전속도: 스킬(기본 공격 제외) 대기시간 × 1/(1 + 시전속도), 전체 상한 2배 (기본 공격은 공격속도)
export const CAST_SPEED_MAX_MULT = 2;
export const ATTACK_RANGE = 50; // 맨손/기본값
export const WEAPON_RANGE = { sword: 50, axe: 46, mace: 46, dagger: 38, spear: 88, greatsword: 78 }; // 창: 찌르기라 가장 김
export const WEAPON_ARC = { greatsword: Math.PI * 0.85, axe: Math.PI * 0.75, spear: Math.PI * 0.38 }; // 무기별 공격 각도 (없으면 아래 기본 - 대검은 크게 휩쓺, 창은 찌르기라 좁음)
export const ATTACK_ARC = Math.PI * 0.9; // 쌍수(양손 다 무기)일 때 - 두 칼날이 넓게 휩쓺
export const ATTACK_ARC_SINGLE = Math.PI * 0.62; // 한손무기+방패(또는 빈손)일 때 - 한 자루라 더 좁고 집중됨

// --- 스킬: 함성
export const WARCRY_RADIUS = 170;
export const WARCRY_COOLDOWN = 4.5;
export const WARCRY_MANA_COST = 15;

// --- 스킬: 휠윈드
export const WHIRLWIND_DURATION = 1.1;
export const WHIRLWIND_COOLDOWN = 3.5;
export const WHIRLWIND_RADIUS = 62;
export const WHIRLWIND_MANA_COST = 10;
export const WHIRLWIND_MANA_DRAIN = 9;
export const WHIRLWIND_TICK = 0.4; // 한 번 맞은 적은 이 시간 동안 다시 안 맞음 (예전엔 매 프레임 맞아서 초당 60번 타격 → 순식간에 전멸)

// --- 스킬: 리프
export const LEAP_DISTANCE = 150;
export const LEAP_DURATION = 0.32;
export const LEAP_COOLDOWN = 4.0;
export const LEAP_MANA_COST = 12;
export const LEAP_RADIUS = 55;

// --- 스킬: 러시
// 아래 두 스킬(러시/그라운드 스매시)과 관성 이동 상수는 같은 게임을 만든 다른 에이전트 버전에서 가져옴
export const RUSH_DISTANCE = 190;
export const RUSH_DURATION = 0.28;
export const RUSH_COOLDOWN = 3.2;
export const RUSH_MANA_COST = 8;
export const RUSH_HIT_RADIUS = 34;
export const RUSH_DAMAGE_BONUS = 30;

// --- 스킬: 강타
export const SMASH_DURATION = 0.52;
export const SMASH_IMPACT_TIME = 0.27;
export const SMASH_COOLDOWN = 4.2;
export const SMASH_MANA_COST = 16;
export const SMASH_RADIUS = 82;
export const SMASH_DAMAGE_BONUS = 60;

// --- 이동 관성
export const MOVE_START_ACCEL = 4.0;
export const MOVE_CRUISE_ACCEL = 9.2;
export const MOVE_TURN_ACCEL = 11.2;
export const MOVE_REVERSE_ACCEL = 15.0;
export const MOVE_BRAKE = 10.5;
export const MOVE_FACING_RESPONSE = 10.0;
export const MOVE_DUST_COLOR = '#bda98b';

// --- 플레이어 자원 (이동/마나/스태미나)
export const WALK_SPEED = 130;
export const RUN_SPEED = 215;
export const HERO_SLOW_MULT = 0.55; // 냉기 둔화 중 이동 속도 배율
export const MOVE_ARRIVE_RADIUS = 10; // 클릭 이동: 목표 지점에 이만큼 가까워지면 도착(멈춤)
// 자동 조준 (systems/aim.js): 사거리, 바라보는 쪽 가중치(각도 1라디안당 거리 +60%로 침), PC 커서 흡착 각도(라디안 ≈15°), 적이 없을 때 지점 스킬 거리
export const AUTO_AIM_RANGE = 420;
export const AUTO_AIM_FACING_WEIGHT = 0.6;
export const AIM_ASSIST_ANGLE = 0.26;
export const AIM_DEFAULT_DISTANCE = 200;
export const CLICK_PICK_PADDING = 10;  // 적 클릭 판정: 몸 반경 + 이만큼 (작은 적도 잘 찍히게)
export const CLICK_ATTACK_RANGE_SLACK = 6; // 클릭 공격: 사거리보다 이만큼 더 붙어서 휘두름 (헛치지 않게)
export const MAX_MANA = 100;
export const MANA_REGEN = 5;
export const MAX_STAMINA = 100;
export const STAMINA_DRAIN = 30;
export const STAMINA_REGEN = 18;

// --- 콤보
export const COMBO_WINDOW = 1.8;
export const COMBO_SPEED_PER_HIT = 0.015;
export const COMBO_SPEED_CAP = 0.3;

// --- 플레이어 기본 전투 수치
// ★ 전투 수치 스케일: 처음엔 체력/데미지가 1~3이라 +1만 올라도 한 방 → ×3, 이후 방어력/옵션을 정수로 세밀하게 다루려고 다시 ×10.
//   (체력·피해·스킬 보너스·체력/공격력 옵션을 함께 ×10 - 몇 대에 죽는지는 그대로. 마나와 % 수치는 그대로)
export const BASE_DAMAGE = 30; // 맨손 피해 (무기는 WEAPON_BASE)
export const HERO_BASE_HP = 150;
export const BASE_BLOCK = 0.05;
export const BASE_EVASION = 0.05;

// --- 버프 물약 지속시간
export const VITALITY_DURATION = 20;
export const SPEED_BUFF_DURATION = 15;
export const VITALITY_BONUS_HP = 60;   // 체력물약: 최대체력 +
export const ATTACK_BUFF_BONUS = 30;   // 공격물약: 공격력 +
export const ATTACK_BUFF_DURATION = 20;
export const DEFENSE_BUFF_DURATION = 20;

// --- 레벨업 & 스탯 분배
export const MAX_LEVEL = 30;
export const POINTS_PER_LEVEL = 5; // 레벨마다 고정 5포인트 (디아2와 같은 값 - 이전 10포인트는 몬스터 체력 대비 너무 빨리 강해졌음)
export function expForLevel(level) {
  return Math.round(130 * Math.pow(level, 1.6)); // Lv1→2 = 130, Lv2→3 = 394, Lv3→4 = 754 ... (예전보다 완만하게 느려짐)
}
// 스탯 1포인트당 실제 증가량 (장비 옵션과 동일한 계열로 합산됨)
// 포인트당 효과 - 기본 체력 5 / 몬스터 체력 2~3 기준이라 공격력·체력은 아주 작게 (이전엔 공격력 +1, 체력 +2씩이라 한 레벨에 몬스터가 다 한 방이었음)
export const LEVEL_STAT_PER_POINT = { atkPower: 2, defense: 0.01, evasion: 0.01, atkSpeed: 0.01, castSpeed: 0.03, moveSpeed: 0.01, health: 10, mana: 3 };
export const LEVEL_STAT_KEYS = { z: 'atkPower', x: 'defense', c: 'evasion', v: 'atkSpeed', b: 'moveSpeed', n: 'health', m: 'mana', ',': 'castSpeed' };

// --- 아이템 (가방/감정/강화/드랍)
export const INVENTORY_SIZE = 20;
export const IDENTIFY_DURATION = 0.8;
export const UPGRADE_SUCCESS_CHANCE = 0.65;
export const UPGRADE_STAT_MULT = 1.25; // 강화 성공: 옵션 하나 ×1.25, 방어구 기본 방어력도 강화 단계마다 ×1.25

// --- 방어력 (피해 감소). 피격 순서: 회피 → 블락 → 방어력 감소(최소 1)
// 감소율 = 방어력 / (방어력 + ARMOR_K), 최대 ARMOR_MAX_REDUCTION  (예: 100 → 20%, 400 → 50%)
export const ARMOR_K = 400;
export const ARMOR_MAX_REDUCTION = 0.6;

// --- 물약
export const POTION_MAX = 6;           // 종류별 보관 한도
export const POTION_COOLDOWN = 1.2;    // 물약 사이 대기시간 (연타 방지)
export const POTION_HEAL_RATIO = 0.5;  // 생명 물약: 최대 체력의 50% 회복
export const POTION_MANA_AMOUNT = 60;  // 마나 물약: 마나 60 회복

// --- 웨이브
export const FIRST_WAVE_DELAY = 4.0;
export const WAVE_GAP = 2.2;
export const BOSS_WAVE = 6;
// 웨이브 몬스터: 주인공 주변 링(거리 MIN~MAX)의 2~4곳에서 무리로 생겨 주인공 쪽으로 몰려옴 (넓은 맵)
export const WAVE_PACKS_MIN = 2;
export const WAVE_PACKS_MAX = 4;
export const WAVE_SPAWN_DIST_MIN = 550;
export const WAVE_SPAWN_DIST_MAX = 800;
export const WAVE_SPAWN_TOO_CLOSE = 400;  // 맵 끝에 걸려 이보다 가까워지면 다른 방향으로 다시 뽑음
export const WAVE_PACK_RADIUS = 70;       // 무리 안에서 흩어지는 반경
export const WAVE_SPAWN_EDGE_MARGIN = 60; // 맵 끝에서 띄우는 거리
export const HUNT_SPEED_MULT = 2.2;
export const HOME_WANDER_RADIUS = 110; // 파밍 맵 몬스터가 무리 자리에서 배회하는 반경(px)       // 주인공을 아직 못 본(어그로 밖) 웨이브 몬스터의 이동 속도 배율

// --- 몬스터 특수 행동 (보스/돌진/자폭/번개/광신 오라)
// 카우킹 기술 (entities/bossBehaviors.js): BOSS_PATTERN 차례로, 기술 사이 BOSS_SKILL_GAP초. 체력 BOSS_PHASE2_HP 이하면 2단계
export const BOSS_SKILL_GAP = 2.2;
export const BOSS_PATTERN = ['slam', 'charge', 'slam', 'herd'];
export const BOSS_PHASE2_HP = 0.5;
export const BOSS_SKILL_RANGE = 420; // 주인공이 이 안에 있으면 기술을 씀 (인식 범위와 따로)
//   ① 대지 강타: BOSS_SLAM_TELEGRAPH초 예고 → 고리 구역(바깥 반지름 BOSS_SLAM_ZONES)이 안쪽부터 BOSS_SLAM_ZONE_GAP초 간격으로 터짐 (1단계 2겹, 2단계 3겹)
export const BOSS_SLAM_DAMAGE = 60;
export const BOSS_SLAM_TELEGRAPH = 0.6;
export const BOSS_SLAM_ZONES = [90, 170, 250];
export const BOSS_SLAM_ZONE_GAP = 0.45;
//   ② 황소 돌진: 예고선 BOSS_CHARGE_TELEGRAPH초(2단계 두 번째는 ..2) → BOSS_CHARGE_TIME초에 BOSS_CHARGE_DIST까지, 맞으면 BOSS_CHARGE_DAMAGE + 크게 밀림
//      벽에서 멈추면 BOSS_DAZE초 멍함(공격할 틈)
export const BOSS_CHARGE_TELEGRAPH = 1.0;
export const BOSS_CHARGE_TELEGRAPH2 = 0.5;
export const BOSS_CHARGE_DIST = 420;
export const BOSS_CHARGE_TIME = 0.55;
export const BOSS_CHARGE_DAMAGE = 70;
export const BOSS_CHARGE_WIDTH = 40;
export const BOSS_CHARGE_KNOCK = 14;
export const BOSS_DAZE = 1.5;
//   ③ 무리의 함성: BOSS_HERD_CAST초 → 일반 카우 BOSS_HERD_COUNT마리(드랍 없음) + 반경 BOSS_HERD_RADIUS 카우는 BOSS_EXCITE_TIME초 흥분(광신 오라만큼 빨라짐)
export const BOSS_HERD_CAST = 0.6;
export const BOSS_HERD_COUNT = 4;
export const BOSS_HERD_RADIUS = 320;
export const BOSS_EXCITE_TIME = 5;
export const CHARGE_DAMAGE = 60;
export const EXPLODER_BLAST_DAMAGE = 60;
export const ZAP_DAMAGE = 60;
export const FIRE_HAZARD_DAMAGE = 30;   // 불바닥 0.6초마다 (화염 피해 → 화상)
// 독 카우: 주인공이 가까이 오면 주기적으로, 그리고 죽을 때 독 구름을 뿜음. 구름 안에 있으면 TICK마다 중독 갱신 (막기/회피 불가)
export const VENOM_CLOUD_TRIGGER_RANGE = 130;
export const VENOM_CLOUD_COOLDOWN = 4.5;
export const POISON_CLOUD_RADIUS = 70;
export const POISON_CLOUD_LIFE = 3.0;
export const POISON_CLOUD_TICK = 0.5;
export const POISON_CLOUD_DAMAGE = 60;  // 중독 총량(4초에 걸쳐)
// 화염술사 카우의 메테오: 시전(CAST) → 그 순간 주인공 자리에 경고 원 → DELAY초 뒤 착탄(마지막 FALL초 동안 불덩이가 떨어지는 모습)
export const METEOR_RANGE = 420;
export const METEOR_CAST_TIME = 0.6;
export const METEOR_COOLDOWN = 5.0;
export const METEOR_DELAY = 1.1;
export const METEOR_FALL_TIME = 0.45;
export const METEOR_RADIUS = 70;        // 폭발 범위
export const METEOR_DAMAGE = 70;        // 화염 피해 (→ 화상)
export const METEOR_FIRE_RADIUS = 58;   // 착탄 자리에 남는 불꽃 바닥
export const METEOR_FIRE_LIFE = 3.5;
export const PYRO_KITE_DISTANCE = 200;  // 이보다 가까우면 물러남
// 화염술사 마법 고르기: 거리 ≥ METEOR_MIN이면 메테오(쿨이면 파이어볼), ≤ WALL_MAX면 화염 벽(쿨이면 파이어볼), 그 사이 파이어볼
export const PYRO_CAST_GAP = 1.8;       // 마법 사이 최소 간격(초)
export const PYRO_METEOR_MIN_DIST = 300;
export const PYRO_WALL_MAX_DIST = 150;
// 파이어볼: 곧게 날아가는 투사체 (유도 없음)
export const FIREBALL_CAST_TIME = 0.35;
export const FIREBALL_SPEED = 260;      // px/초
export const FIREBALL_RANGE = 480;
export const FIREBALL_RADIUS = 10;      // 몸통 판정
export const FIREBALL_EXPLODE_RADIUS = 36;
export const FIREBALL_DAMAGE = 40;      // 화염 (→ 화상)
// 화염 벽: 시전자와 주인공 사이(시전자 쪽에서 POS 비율 지점)에 수직으로 불꽃 바닥 SEGMENTS개
export const FIRE_WALL_CAST_TIME = 0.5;
export const FIRE_WALL_COOLDOWN = 6.0;
export const FIRE_WALL_POS = 0.55;
export const FIRE_WALL_SEGMENTS = 7;
export const FIRE_WALL_SPACING = 26;
export const FIRE_WALL_RADIUS = 20;
export const FIRE_WALL_LIFE = 4.0;
export const SHAMAN_HEAL = 30;
export const CHARGE_RANGE = 240;
export const CHARGE_TELEGRAPH = 0.8;
export const CHARGE_DISTANCE = 260;
export const CHARGE_DURATION = 0.3;
export const CHARGE_RECOVER = 0.6;
export const CHARGE_COOLDOWN = 5.5;
export const CHARGE_WIDTH = 34;
export const EXPLODER_FUSE_TIME = 0.55;
export const EXPLODER_FUSE_RANGE = 54;
export const EXPLODER_BLAST_RADIUS = 60;
export const ZAP_RANGE = 260;
export const ZAP_TELEGRAPH = 0.55;
export const ZAP_COOLDOWN = 3.0;
export const ZAP_BEAM_LENGTH = 420; // 조준 지점을 지나 더 멀리까지 뻗어나감 - 유도미사일이 아니라 그냥 직선으로 지나가는 느낌
export const ZAP_BEAM_WIDTH = 24;
export const AURA_RADIUS = 170;
export const AURA_SPEED_MULT = 1.4;

// 군중 제어(CC, systems/cc.js): 높은 쪽이 걸려 있으면 낮은 쪽은 무시 (변이 > 기절 > 경직). 보스는 전부 면역, 둔화만 BOSS_SLOW_SCALE만큼(절반)
export const CC_RANK = { stagger: 1, stun: 2, poly: 3 };
export const BOSS_SLOW_SCALE = 0.5;
export const WARCRY_STUN = 1.0;  // 함성 기절(초, 스킬 레벨로 늘어남)
export const SMASH_STUN = 0.35;  // 강타 기절(초)

// 해골 카우 킹 (네크로맨서, 관리자 페이지에만): 거리를 두고(NECRO_KITE 안이면 물러남, NECRO_RANGE 밖이면 다가감)
//   NECRO_SUMMON_CD초마다 NECRO_CAST_TIME초 주문 → 곁에 해골 카우 NECRO_SUMMON_COUNT마리(살아 있는 부하 NECRO_MAX_MINIONS마리까지)
//   NECRO_BONE_CD초마다 뼈 창(물리 NECRO_BONE_DAMAGE, 곧게 날아감). 죽으면 부하도 같이 쓰러짐
export const NECRO_RANGE = 380;
export const NECRO_KITE = 200;
export const NECRO_SUMMON_CD = 7;
export const NECRO_CAST_TIME = 0.7;
export const NECRO_SUMMON_COUNT = 2;
export const NECRO_MAX_MINIONS = 5;
export const NECRO_BONE_CD = 2.8;
export const NECRO_BONE_DAMAGE = 35;
export const NECRO_BONE_SPEED = 300;
export const NECRO_BONE_RADIUS = 8;

// 궁수 카우·해골 궁수 카우 (관리자 페이지에만): ARCHER_RANGE 안이면 ARCHER_AIM초 조준(조준선이 보임, 그때 방향 고정) → 화살(곧게 - 옆으로 피할 수 있음)
//   ARCHER_KITE 안이면 물러남, 화살 사이 ARCHER_COOLDOWN초. 해골 궁수 화살은 ARCHER_SKELETON_DAMAGE
export const ARCHER_RANGE = 340;
export const ARCHER_KITE = 170;
export const ARCHER_AIM = 0.55;
export const ARCHER_COOLDOWN = 2.2;
export const ARROW_DAMAGE = 30;
export const ARCHER_SKELETON_DAMAGE = 25;
export const ARROW_SPEED = 430;
export const ARROW_RADIUS = 6;

// ── 악마 카우 종족 (관리자 페이지에만) ──
// 임프: IMP_BLINK_CD초마다 IMP_BLINK_RANGE 안이면 주인공 옆(IMP_BLINK_NEAR px)으로 순간이동
export const IMP_BLINK_CD = 3;
export const IMP_BLINK_RANGE = 300;
export const IMP_BLINK_NEAR = 60;
// 저주 카우: CURSER_RANGE 안에서 CURSER_CURSE_CD초마다 CURSER_CAST초 주문 → 저주(systems/curses.js), CURSER_ORB_CD초마다 지옥불 구슬. CURSER_KITE 안이면 물러남
export const CURSER_RANGE = 360;
export const CURSER_KITE = 190;
export const CURSER_CAST = 0.6;
export const CURSER_CURSE_CD = 6;
export const CURSER_ORB_CD = 2.6;
export const CURSER_ORB = { speed: 210, radius: 10, damage: 25 };
// 버서커: BERSERKER_LEAP_MIN~MAX 거리면 예고(BERSERKER_TELEGRAPH초, 떨어질 자리 원) → BERSERKER_LEAP_TIME초 도약 → 반경 BERSERKER_SLAM_RADIUS 피해
//   체력 BERSERKER_ENRAGE_HP 이하면 분노: 이동 ×ENRAGE_SPEED, 근접 피해 ×ENRAGE_DAMAGE, 도약 대기 ×ENRAGE_CD
export const BERSERKER_LEAP_MIN = 110;
export const BERSERKER_LEAP_MAX = 300;
export const BERSERKER_LEAP_CD = 4.5;
export const BERSERKER_TELEGRAPH = 0.5;
export const BERSERKER_LEAP_TIME = 0.35;
export const BERSERKER_SLAM_RADIUS = 60;
export const BERSERKER_SLAM_DAMAGE = 50;
export const BERSERKER_ENRAGE_HP = 0.5;
export const DEMON_ENRAGE_SPEED = 1.5;
export const DEMON_ENRAGE_DAMAGE = 1.3;
export const DEMON_ENRAGE_CD = 0.6;
// 악마 카우킹: DKING_SUMMON_CD초마다 지옥문을 열어 임프 DKING_SUMMON_COUNT마리(부하 DKING_MAX_IMPS까지), DKING_FIRE_CD초마다 DKING_CAST초 주문 → 지옥불 원 DKING_FIRE_COUNT개
//   체력 DKING_ENRAGE_HP 이하면 분노(날개를 펴고 이동 ×DEMON_ENRAGE_SPEED, 대기시간 ×DEMON_ENRAGE_CD)
export const DKING_SUMMON_CD = 9;
export const DKING_SUMMON_COUNT = 3;
export const DKING_MAX_IMPS = 6;
export const DKING_FIRE_CD = 5;
export const DKING_CAST = 0.6;
export const DKING_FIRE_COUNT = 3;
export const DKING_FIRE_SPREAD = 90;
export const DKING_ENRAGE_HP = 0.5;
// 지옥불 원 (systems/demonSpells.js): HELLFIRE_DELAY초 예고 뒤 반경 HELLFIRE_RADIUS 화염 HELLFIRE_DAMAGE
export const HELLFIRE_DELAY = 0.9;
export const HELLFIRE_RADIUS = 55;
export const HELLFIRE_DAMAGE = 45;
// 주인공 저주 (systems/curses.js): 하나만, CURSE_DURATION초. 저주를 건 몬스터가 죽으면 바로 풀림
//   weak: 받는 피해 ×mul / slow: 이동속도 ×mul / hex: 스킬 대기시간 ×mul
export const CURSE_DURATION = 6;
export const CURSES = {
  weak: { label: '약화 저주', desc: '받는 피해 +25%', mul: 1.25 },
  slow: { label: '둔화 저주', desc: '이동 -30%', mul: 0.7 },
  hex:  { label: '봉인 저주', desc: '스킬 대기시간 +30%', mul: 1.3 }
};
export const CURSE_ORDER = ['weak', 'slow', 'hex'];
export const CURSE_COLOR = '#b04dff';

// 해골 카우 킹 기술 추가 (2026-10-11): 소환은 근처 시체 자리(NECRO_CORPSE_RANGE)에서 먼저, 뼈 창 NECRO_BONE_FAN갈래(2단계 ..P2) 사이 NECRO_BONE_SPREAD 라디안
//   시체 폭발: NECRO_BLAST_CD초마다 주인공 NECRO_BLAST_PICK 안 부하 최대 NECRO_BLAST_MAX마리가 NECRO_BLOAT초 부풀다 터짐(반경 NECRO_BLAST_RADIUS, 물리 NECRO_BLAST_DAMAGE)
//   2단계(체력 NECRO_PHASE2_HP 이하): 부하 최대 NECRO_MAX_MINIONS_P2
export const NECRO_CORPSE_RANGE = 400;
export const CORPSE_LIFE = 20;          // 쓰러진 자리(시체)가 남는 시간(초) - game.corpses
export const CORPSE_MAX = 20;
export const NECRO_BONE_FAN = 3;
export const NECRO_BONE_FAN_P2 = 5;
export const NECRO_BONE_SPREAD = 0.22;
export const NECRO_BLAST_CD = 8;
export const NECRO_BLAST_PICK = 260;
export const NECRO_BLAST_MAX = 3;
export const NECRO_BLOAT = 0.8;
export const NECRO_BLAST_RADIUS = 70;
export const NECRO_BLAST_DAMAGE = 45;
export const NECRO_PHASE2_HP = 0.5;
export const NECRO_MAX_MINIONS_P2 = 8;
// 악마 카우킹 ③ 지옥 폭발 (2026-10-11, 지옥 사슬 대신 - 사용자: 단순하고 강하게): DKING_NOVA_CD초마다 DKING_NOVA_CAST초 동안 몸 둘레 원 예고 → 반경 DKING_NOVA_RADIUS 화염 DKING_NOVA_DAMAGE
//   2단계: DKING_NOVA_GAP초 뒤 한 번 더, 지옥불 원 DKING_FIRE_COUNT_P2개
export const DKING_NOVA_CD = 8;
export const DKING_NOVA_CAST = 1.0;
export const DKING_NOVA_RADIUS = 170;
export const DKING_NOVA_DAMAGE = 80;
export const DKING_NOVA_GAP = 0.7;
export const DKING_FIRE_COUNT_P2 = 5;

// 영혼 (버닝 소울·창백한 원혼): SOUL_RANGE 안에서 SOUL_SHOT_CD초마다 SOUL_CHARGE초 번쩍 → 탄 SOUL_BOLTS발 부채꼴(사이 SOUL_SPREAD 라디안, 원소는 몬스터 element)
//   SOUL_KITE~SOUL_RANGE 사이를 SOUL_TURN초마다 방향을 바꾸며 불규칙하게 떠다님
export const SOUL_RANGE = 280;
export const SOUL_KITE = 120;
export const SOUL_SHOT_CD = 1.8;
export const SOUL_CHARGE = 0.3;
export const SOUL_BOLTS = 3;
export const SOUL_SPREAD = 0.3;
export const SOUL_TURN = 0.45;
export const SOUL_BOLT = { speed: 260, radius: 6, damage: 18 };
