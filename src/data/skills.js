// 스킬 메타(이름/슬롯 색/순서/해금 레벨). 동작(try/쿨다운 바인딩)은 main.js의 SKILLS
export const SKILL_ORDER = ['attack', 'warcry', 'whirlwind', 'leap', 'rush', 'smash'];
export const SKILL_META = {
  attack:    { label: '공격',   color: 'rgba(220,70,60,0.35)' },
  warcry:    { label: '함성',   color: 'rgba(232,163,61,0.40)' },
  whirlwind: { label: '휠윈드', color: 'rgba(127,212,224,0.40)' },
  leap:      { label: '리프',   color: 'rgba(201,180,138,0.40)' },
  rush:      { label: '러시',   color: 'rgba(255,138,77,0.40)' },
  smash:     { label: '강타',   color: 'rgba(255,200,87,0.40)' }
};
// 스킬 해금 레벨 - 나중에 스킬트리(스킬포인트)가 생기면 isSkillUnlocked 판정만 바꿔 끼우면 됨
export const SKILL_UNLOCK_LEVEL = { attack: 1, warcry: 1, rush: 2, leap: 3, smash: 4, whirlwind: 5 };
