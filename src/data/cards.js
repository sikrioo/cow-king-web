// 레벨업 카드(뱀서식): 레벨이 오를 때마다 카드 CARD_CHOICES장 중 하나를 고름. 동작은 systems/levelCards.js, 화면은 ui/cardPick.js
//   mastery:  마스터리(패시브) Lv+1 - 원소(마법사)·무기 종류별(전사), data/masteries.js
//   newSkill: 아직 안 배운 스킬 배우기 (주인공 레벨이 data/skills.js의 SKILL_UNLOCK_LEVEL 이상일 때만)
//   skillUp:  배운 스킬 레벨 +1 (SKILL_MAX_LEVEL까지)
//   upgrade:  강화 카드(일반 능력치) - 등급(CARD_RARITY)에 따라 수치가 커짐, 같은 카드는 UPGRADE_MAX_PICKS번까지
//   filler:   고를 카드가 모자랄 때 채우는 카드
export const CARD_CHOICES = 3;
export const CARD_REROLLS = 1; // 한 판에 다시 뽑기 횟수
export const CARD_WEIGHT = { newSkill: 1.3, skillUp: 1, upgrade: 0.3, mastery: 0.21 }; // 뽑힐 비중 (upgrade·mastery는 카드 한 장당, 마스터리는 강화 카드보다 30% 드묾)

// 강화 카드 등급: 뽑힐 비중, 수치 배율
export const CARD_RARITY_ORDER = ['common', 'rare', 'legendary'];
export const CARD_RARITY = {
  common:    { label: '일반', weight: 70, mult: 1,   color: '#c9d2c4' },
  rare:      { label: '희귀', weight: 25, mult: 1.6, color: '#6bb8ff' },
  legendary: { label: '전설', weight: 5,  mult: 2.5, color: '#ffb347' }
};
export const UPGRADE_MAX_PICKS = 5;

// 강화 카드 (amount = 일반 등급 수치, 등급 배율을 곱함)
//   stat: 주인공 cardBonus 키 - health/mana/atkPower(정수, ×10 스케일)·castSpeed/atkSpeed/moveSpeed(비율)는 gear.recalcGearStats가 합산, manaRegen(초당)
//   unit: 'pct' = %, 'int' = 정수, 'perSec' = 초당 / classes: 나오는 캐릭터 (없으면 전부)
export const UPGRADE_ORDER = ['vigor', 'spirit', 'focus', 'haste', 'frenzy', 'swift', 'might'];
export const UPGRADE_CARDS = {
  vigor:  { label: '강인함',     stat: 'health',    amount: 40,   unit: 'int',    statLabel: '최대 체력', color: '#ff6b6b' },
  spirit: { label: '깊은 샘',    stat: 'mana',      amount: 15,   unit: 'int',    statLabel: '최대 마나', color: '#6b9bff' },
  focus:  { label: '명상',       stat: 'manaRegen', amount: 1.5,  unit: 'perSec', statLabel: '마나 회복', color: '#8fb4ff' },
  haste:  { label: '빠른 주문',  stat: 'castSpeed', amount: 0.06, unit: 'pct',    statLabel: '시전속도', color: '#b8a4ff' },
  frenzy: { label: '광분',       stat: 'atkSpeed',  amount: 0.06, unit: 'pct',    statLabel: '공격속도', color: '#ffd36a' },
  swift:  { label: '날랜 발',    stat: 'moveSpeed', amount: 0.05, unit: 'pct',    statLabel: '이동속도', color: '#9be39b' },
  might:  { label: '완력',       stat: 'atkPower',  amount: 6,    unit: 'int',    statLabel: '공격력', color: '#ff9b63', classes: ['warrior'] }
};
// 원소 피해·화상·둔화 강화는 마스터리 카드(data/masteries.js)로 통일 (2026-10-09 사용자 결정)

export const FILLER_CARDS = {
  restore: { label: '재정비',       desc: '체력과 마나를 가득 채움',  color: '#9be39b' },
  heal:    { label: '생명 물약 +1', desc: '생명 물약을 하나 더 받음', color: '#ff6b6b' },
  mana:    { label: '마나 물약 +1', desc: '마나 물약을 하나 더 받음', color: '#6b9bff' }
};
export const FILLER_ORDER = ['restore', 'heal', 'mana'];
