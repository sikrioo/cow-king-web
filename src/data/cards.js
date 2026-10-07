// 레벨업 카드(뱀서식): 레벨이 오를 때마다 카드 CARD_CHOICES장 중 하나를 고름. 동작은 systems/levelCards.js, 화면은 ui/cardPick.js
//   newSkill: 아직 안 배운 스킬 배우기 (주인공 레벨이 data/skills.js의 SKILL_UNLOCK_LEVEL 이상일 때만)
//   skillUp:  배운 스킬 레벨 +1 (SKILL_MAX_LEVEL까지)
//   filler:   고를 스킬 카드가 모자랄 때 채우는 카드
export const CARD_CHOICES = 3;
export const CARD_REROLLS = 1; // 한 판에 다시 뽑기 횟수
export const CARD_WEIGHT = { newSkill: 1.3, skillUp: 1 }; // 뽑힐 비중
export const FILLER_CARDS = {
  restore: { label: '재정비',       desc: '체력과 마나를 가득 채움',  color: '#9be39b' },
  heal:    { label: '생명 물약 +1', desc: '생명 물약을 하나 더 받음', color: '#ff6b6b' },
  mana:    { label: '마나 물약 +1', desc: '마나 물약을 하나 더 받음', color: '#6b9bff' }
};
export const FILLER_ORDER = ['restore', 'heal', 'mana'];
