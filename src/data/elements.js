// 원소 속성 4종 (화염/냉기/번개/독): 이름·색·저항 상한·상태 효과 수치
// 피해 묶음 { phys, fire, cold, lightning, poison } - 물리는 방어력, 원소는 저항(%)으로 줄어듦 (계산은 systems/elements.js)
export const ELEMENTS = ['fire', 'cold', 'lightning', 'poison'];
export const ELEMENT_DEF = {
  fire:      { label: '화염', short: '화', color: '#ff8a3d' },
  cold:      { label: '냉기', short: '냉', color: '#7fd4ff' },
  lightning: { label: '번개', short: '번', color: '#ffe94d' },
  poison:    { label: '독',   short: '독', color: '#7fe05a' }
};
export const PHYSICAL_COLOR = '#ff5b52'; // 물리 피해 숫자 색
export const RESIST_CAP = 0.75;          // 주인공 저항 상한

// 지속 피해(화상/중독) 틱 간격(초) - 무적시간/넉백 없이 체력만 깎음
export const DOT_TICK = 0.5;
// 화상: 받은 화염 피해의 BURN_RATIO만큼을 BURN_DURATION초에 걸쳐 추가로 (다시 맞으면 더 센 쪽으로 갱신)
export const BURN_RATIO = 0.5;
export const BURN_DURATION = 2.0;
// 중독: 받은 독 피해 전부(POISON_RATIO)를 POISON_DURATION초에 걸쳐 (겹치지 않음 - 더 센 쪽으로 갱신, 같거나 약하면 시간만)
export const POISON_RATIO = 1.0;
export const POISON_DURATION = 4.0;
// 둔화: 냉기 피해를 받으면 CHILL_DURATION초 (냉기 저항만큼 짧아짐). 이동은 balance.HERO_SLOW_MULT, 공격속도는 아래 배율
export const CHILL_DURATION = 2.0;
export const CHILL_ATTACK_SPEED_MULT = 0.8;
export const COLD_NOVA_CHILL_DURATION = 2.5; // 냉기 카우 사망 노바
// 몬스터가 냉기 피해를 받으면: MONSTER_CHILL_DURATION초 동안 이동 MONSTER_CHILL_MOVE_MULT배
export const MONSTER_CHILL_DURATION = 2.5;
export const MONSTER_CHILL_MOVE_MULT = 0.5;
// 번개: 피해가 기준값의 LIGHTNING_MIN~LIGHTNING_MAX배 사이에서 들쭉날쭉 (평균은 기준값)
export const LIGHTNING_MIN = 0.3;
export const LIGHTNING_MAX = 1.7;

// 출혈(물리 지속 피해) 숫자 색 - 무기 특수기 관통창, 나중에 무기 옵션 '출혈'도 같이 씀
export const BLEED_COLOR = '#e0475a';
