// 캐릭터(직업): 시작 수치·스킬 목록·기본 슬롯·기본 공격·생김새. 시작 화면에서 고름(ui.selectedClass)
//   skills: 슬롯 전환(Q/R) 순서 = 이 캐릭터가 쓸 수 있는 스킬(공통 스킬은 data/skills.js COMMON_SKILLS → 공통 슬롯), slots: 시작 슬롯1/2, basic: 기본 공격(적 클릭/Shift+클릭)
//   armor: 직업 기본 방어력 (장비 방어력에 더함 - systems/gear.js recalcGearStats, 피해 감소 공식은 data/balance.js ARMOR_K)
//   look: heroSprites가 쓰는 색 (몸 그라데이션 3단, 테두리, 목도리 2색, 가슴 보석, 눈, 손)
import { MAX_MANA, MANA_REGEN } from './balance.js';

export const CLASS_ORDER = ['warrior', 'sorc'];
export const CLASSES = {
  warrior: {
    label: '전사', desc: '근접 무기 · 높은 체력 · 높은 방어력',
    hp: 230, mana: MAX_MANA, manaRegen: MANA_REGEN, armor: 100, // 2026-10-14 사용자: 전사는 답답하지만 단단하게 - 체력 150 → 230, 기본 방어력 100(물리 피해 약 20% 감소)
    skills: ['attack', 'warcry', 'whirlwind', 'leap', 'rush', 'smash', 'fortify', 'flurry', 'concuss', 'berserk', 'decoy', 'holyhammer', 'heavenbolt',
      'aurathorns', 'aurafire', 'aurafrost',
      'spinblade', 'skyfall', 'whirlaxe', 'shieldbounce', 'rollmace', 'piercespear', 'vitalthrow'], slots: ['attack', 'warcry'], // skills 뒤 7개 = 무기 특수기 (마스터리 Lv3부터 카드)
    basic: 'melee', starterGear: true, staff: false,
    look: { body: ['#7a8088', '#2e3137', '#101216'], trim: '#d5d0c4', scarf: ['#5a1721', '#862534'], gem: '#8a2331', eyes: '#ffb65c', hand: '#a3abb4' }
  },
  sorc: {
    label: '마법사', desc: '원소 마법 · 낮은 체력, 높은 마나',
    hp: 100, mana: 160, manaRegen: 9, armor: 0, // 몸은 약하지만 시원시원하게
    skills: ['bolt', 'fireball', 'frostnova', 'chain', 'orb', 'energyshield', 'flamepillar', 'firewave', 'blizzard', 'discharge', 'balllightning', 'polymorph', 'meteor', 'thunderstrike', 'frostfield', 'firetotem'], slots: ['bolt', 'fireball'],
    basic: 'bolt', starterGear: false, staff: true, // 무기를 안 들었으면 지팡이를 든 모습
    look: { body: ['#6a7cc8', '#2a2f6e', '#10122e'], trim: '#e8d9a8', scarf: ['#2a3f8a', '#4d6bff'], gem: '#7fd4ff', eyes: '#bfeaff', hand: '#c9c3e8' }
  }
};
