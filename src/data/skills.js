// 스킬 메타(이름/슬롯 색/해금 레벨)와 마법 수치. 캐릭터별 스킬 목록·순서는 data/classes.js, 동작(try/쿨다운)은 systems/skills.js의 SKILLS
export const SKILL_ORDER = ['attack', 'warcry', 'whirlwind', 'leap', 'rush', 'smash']; // 전사 (레거시 순서 - classes.warrior.skills와 같음)
export const SKILL_META = {
  attack:    { label: '공격',   color: 'rgba(220,70,60,0.35)' },
  warcry:    { label: '함성',   color: 'rgba(232,163,61,0.40)' },
  whirlwind: { label: '휠윈드', color: 'rgba(127,212,224,0.40)' },
  leap:      { label: '리프',   color: 'rgba(201,180,138,0.40)' },
  rush:      { label: '러시',   color: 'rgba(255,138,77,0.40)' },
  smash:     { label: '강타',   color: 'rgba(255,200,87,0.40)' },
  // 마법사
  bolt:      { label: '마력탄', color: 'rgba(180,150,255,0.40)' },
  fireball:  { label: '화염구', color: 'rgba(255,122,26,0.42)' },
  frostnova: { label: '서리노바', color: 'rgba(127,212,255,0.42)' },
  chain:     { label: '연쇄번개', color: 'rgba(255,233,77,0.40)' },
  orb:       { label: '얼음보주', color: 'rgba(191,234,255,0.45)' }
};
// 스킬 해금 레벨 - 나중에 스킬트리(스킬포인트)가 생기면 isSkillUnlocked 판정만 바꿔 끼우면 됨
export const SKILL_UNLOCK_LEVEL = {
  attack: 1, warcry: 1, rush: 2, leap: 3, smash: 4, whirlwind: 5,
  bolt: 1, fireball: 1, frostnova: 2, chain: 4, orb: 6
};

// 마법 수치 (피해는 ×10 스케일 정수, 레벨마다 SPELL_LEVEL_SCALE만큼 오름)
//   mana: 소모, cooldown: 초, speed/range/radius: 투사체(px), explode: 폭발 반경
export const SPELL_LEVEL_SCALE = 0.07;
export const SPELLS = {
  bolt:      { mana: 0,  cooldown: 0.42, damage: 22, speed: 430, range: 420, radius: 7 },                 // 기본 공격 (공격속도 영향)
  fireball:  { mana: 9,  cooldown: 0.75, damage: 38, speed: 330, range: 440, radius: 10, explode: 52 },   // 화염 → 화상
  frostnova: { mana: 14, cooldown: 3.0,  damage: 24, radius: 150 },                                         // 냉기 → 둔화, 주변 전체
  chain:     { mana: 13, cooldown: 1.1,  damage: 40, range: 340, cone: 0.7, jumpRange: 170, jumps: 4, falloff: 0.85 }, // 번개, 근처로 튐
  orb:       { mana: 22, cooldown: 2.2,  speed: 150, range: 420, radius: 12,                              // 얼음 보주: 날아가며 얼음 조각을 뿌리고 끝에서 터짐
               shardEvery: 0.07, shardSpin: 0.75, shardSpeed: 320, shardRange: 170, shardRadius: 5, shardDamage: 14, burst: 14 }
};
