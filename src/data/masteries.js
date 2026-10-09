// 마스터리(패시브): 레벨업 카드로 Lv1~MASTERY_MAX_LEVEL까지 올림 (systems/levelCards.js). 계산은 util.masteryBonus 한 곳
//   per: 레벨마다 더해지는 양 (전부 비율 - 0.10 = +10%)
//     fire/cold/lightning: 그 원소 피해 배율, burn: 화상 피해, chill: 몬스터 둔화 시간, lightningMin: 번개 피해 하한 올림(편차가 위로)
//     damage: 무기 피해(무기를 쓰는 공격·스킬), atkSpeed: 공격속도, stun: 기본 공격 적중 시 기절 확률, range: 무기 사거리
//   weapon: 무기 마스터리 - 주무기가 이 종류일 때만 효과 / classes: 나오는 직업
//   단위 표시용 label은 MASTERY_STAT
export const MASTERY_MAX_LEVEL = 5;
export const MASTERY_STUN_TIME = 0.4; // 메이스 마스터리 기절 시간(초)
export const MASTERY_ORDER = ['fire', 'cold', 'lightning', 'sword', 'axe', 'mace', 'dagger', 'spear', 'greatsword'];
export const MASTERIES = {
  // 원소 마스터리 (마법사)
  fire:      { label: '화염 마스터리', classes: ['sorc'], per: { fire: 0.10, burn: 0.12 },        color: '#ff8a3d' },
  cold:      { label: '냉기 마스터리', classes: ['sorc'], per: { cold: 0.10, chill: 0.12 },       color: '#7fd4ff' },
  lightning: { label: '번개 마스터리', classes: ['sorc'], per: { lightning: 0.10, lightningMin: 0.08 }, color: '#ffe94d' },
  // 무기 마스터리 (전사) - 무기마다 특색
  sword:     { label: '검 마스터리',   classes: ['warrior'], weapon: 'sword',  per: { damage: 0.08, atkSpeed: 0.03 }, color: '#d8d8e0' },
  axe:       { label: '도끼 마스터리', classes: ['warrior'], weapon: 'axe',    per: { damage: 0.12 },                 color: '#e05b4d' },
  mace:      { label: '메이스 마스터리', classes: ['warrior'], weapon: 'mace', per: { damage: 0.07, stun: 0.04 },     color: '#c9a227' },
  dagger:    { label: '단검 마스터리', classes: ['warrior'], weapon: 'dagger', per: { damage: 0.05, atkSpeed: 0.06 }, color: '#9be39b' },
  spear:     { label: '창 마스터리',   classes: ['warrior'], weapon: 'spear',  per: { damage: 0.07, range: 0.05 },    color: '#7fa8c9' },
  greatsword: { label: '대검 마스터리', classes: ['warrior'], weapon: 'greatsword', per: { damage: 0.10, stun: 0.02 }, color: '#8a8f99' }
};
export const MASTERY_STAT = {
  fire: '화염 피해', cold: '냉기 피해', lightning: '번개 피해', burn: '화상 피해', chill: '둔화 시간', lightningMin: '번개 최소 피해',
  damage: '무기 피해', atkSpeed: '공격속도', stun: '기절 확률', range: '사거리'
};
