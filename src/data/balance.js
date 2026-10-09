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
export const WEAPON_ARC = { greatsword: Math.PI * 0.85, spear: Math.PI * 0.38 }; // 무기별 공격 각도 (없으면 아래 기본 - 대검은 크게 휩쓺, 창은 찌르기라 좁음)
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
export const BOSS_SLAM_COOLDOWN = 4.5;
export const BOSS_SLAM_RADIUS = 115;
export const BOSS_SLAM_DAMAGE = 60;
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
