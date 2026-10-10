// 레벨업 카드(뱀서식): 레벨이 오르면 카드 3장 중 하나를 고름 - 새 스킬 배우기 / 배운 스킬 레벨 +1 / 강화(능력치, 등급) / 마스터리(원소·무기, Lv) / (모자라면) 채우기 카드
// 고르는 동안 게임은 멈춤(game.cardOffer가 있으면 game.fixedUpdate가 전투를 건너뜀). 한 번에 여러 레벨이 오르면 차례로 고름
// 카드 뽑기는 게임 난수(Math.random) - systems에서만. 수치는 data/cards.js, data/skills.js / 화면은 ui/cardPick.js
import {
  CARD_CHOICES, CARD_REROLLS, CARD_WEIGHT, FILLER_CARDS, FILLER_ORDER, CARD_RARITY, CARD_RARITY_ORDER, UPGRADE_CARDS, UPGRADE_ORDER, UPGRADE_MAX_PICKS
} from '../data/cards.js';
import { SKILL_META, SKILL_UNLOCK_LEVEL, SKILL_MAX_LEVEL, COMMON_SKILLS, SPECIAL_MASTERY_LEVEL } from '../data/skills.js';
import { POTION_MAX } from '../data/balance.js';
import { MASTERIES, MASTERY_ORDER, MASTERY_MAX_LEVEL } from '../data/masteries.js';
import { CLASSES } from '../data/classes.js';
import { game, input } from '../state.js';
import { learnedLevel, specialUsable } from '../util.js';
import { floatText, spawnHitParticles } from './fx.js';
import { recalcGearStats } from './gear.js';

// 카드 강화 합계 (gear.recalcGearStats와 elementCombat이 읽음)
export function emptyCardBonus() {
  return { health: 0, mana: 0, manaRegen: 0, castSpeed: 0, atkSpeed: 0, moveSpeed: 0, atkPower: 0 };
}

// 새 게임: 시작 슬롯 2개만 Lv1
export function resetSkillLevels(cls) {
  const h = game.hero;
  h.skillLevels = Object.fromEntries(cls.slots.map((id) => [id, 1]));
  h.pendingCards = 0;
  h.cardRerolls = CARD_REROLLS;
  h.cardBonus = emptyCardBonus();
  h.cardPicks = {};
  h.masteries = {}; // 마스터리 레벨 (계산은 util.masteryBonus)
  game.cardOffer = null;
}

// 레벨업 한 번 = 고를 카드 한 번 (progression.gainExp가 부름)
export function queueLevelCard() {
  game.hero.pendingCards++;
  if (!game.cardOffer) openNextOffer();
}

function openNextOffer() {
  if (game.hero.pendingCards <= 0 || !game.hero.alive) { game.cardOffer = null; return; }
  game.hero.pendingCards--;
  game.cardOffer = { cards: rollCards() };
  // 고르는 동안 눌려 있던 시전/클릭 명령은 풀어 둠 (고른 뒤 혼자 움직이지 않게)
  input.holdSlot1 = false;
  input.holdSlot2 = false;
  input.moveTarget = null;
  input.mouseMoveHeld = false;
  input.attackTarget = null;
  input.attackHeld = false;
  input.standAttackHeld = false;
}

// 뽑을 수 있는 카드 전부 (비중 포함)
function skillCardPool() {
  const h = game.hero;
  const pool = [];
  [...(CLASSES[h.classKey] || CLASSES.warrior).skills, ...COMMON_SKILLS].forEach((id) => {
    const lv = learnedLevel(h, id); // 카드는 배운 레벨만 (장비 보너스 제외 - 최대 5)
    const needMastery = SKILL_META[id].mastery; // 무기 특수기: 그 마스터리가 SPECIAL_MASTERY_LEVEL 이상이어야 새로 배울 수 있음
    if (lv === 0 && needMastery && (h.masteries[needMastery] || 0) < SPECIAL_MASTERY_LEVEL) return;
    if (!specialUsable(h, id)) return; // 무기 특수기: 그 무기를 들었을 때만 카드에
    if (lv === 0 && h.level >= (SKILL_UNLOCK_LEVEL[id] || 1)) pool.push({ type: 'newSkill', id, from: 0, to: 1, weight: CARD_WEIGHT.newSkill });
    else if (lv > 0 && lv < SKILL_MAX_LEVEL) pool.push({ type: 'skillUp', id, from: lv, to: lv + 1, weight: CARD_WEIGHT.skillUp });
  });
  UPGRADE_ORDER.forEach((id) => {
    const u = UPGRADE_CARDS[id];
    if (u.classes && !u.classes.includes(h.classKey)) return;
    if ((h.cardPicks[id] || 0) >= UPGRADE_MAX_PICKS) return;
    pool.push({ type: 'upgrade', id, weight: CARD_WEIGHT.upgrade });
  });
  MASTERY_ORDER.forEach((id) => {
    const m = MASTERIES[id];
    if (m.classes && !m.classes.includes(h.classKey)) return;
    const lv = h.masteries[id] || 0;
    if (lv < MASTERY_MAX_LEVEL) pool.push({ type: 'mastery', id, from: lv, to: lv + 1, weight: CARD_WEIGHT.mastery });
  });
  return pool;
}

// 비중대로 겹치지 않게 CARD_CHOICES장, 모자라면 채우기 카드
export function rollCards() {
  const pool = skillCardPool();
  const cards = [];
  while (cards.length < CARD_CHOICES && pool.length) {
    const total = pool.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * total, i = 0;
    while (i < pool.length - 1 && r >= pool[i].weight) { r -= pool[i].weight; i++; }
    const { weight, ...card } = pool.splice(i, 1)[0];
    if (card.type === 'upgrade') rollRarity(card);
    cards.push(card);
  }
  for (let i = 0; cards.length < CARD_CHOICES && i < FILLER_ORDER.length; i++) cards.push({ type: 'filler', id: FILLER_ORDER[i] });
  return cards;
}

// 강화 카드 등급 굴림 → 수치 = 일반 수치 × 등급 배율
function rollRarity(card) {
  const total = CARD_RARITY_ORDER.reduce((s, k) => s + CARD_RARITY[k].weight, 0);
  let r = Math.random() * total;
  card.rarity = CARD_RARITY_ORDER.find((k) => (r -= CARD_RARITY[k].weight) < 0) || 'common';
  const u = UPGRADE_CARDS[card.id];
  const v = u.amount * CARD_RARITY[card.rarity].mult;
  card.amount = u.unit === 'int' ? Math.round(v) : v;
}

export function rerollCards() {
  if (!game.cardOffer || game.hero.cardRerolls <= 0) return false;
  game.hero.cardRerolls--;
  game.cardOffer.cards = rollCards();
  return true;
}

// i번째 카드 고르기 → 효과 적용 → 다음 고를 카드가 있으면 이어서
export function pickCard(i) {
  const offer = game.cardOffer;
  if (!offer || !offer.cards[i]) return false;
  applyCard(offer.cards[i]);
  game.cardOffer = null;
  openNextOffer();
  return true;
}

function applyCard(card) {
  const h = game.hero;
  const say = (text, color) => floatText(h.x, h.y - 60, text, color);
  if (card.type === 'newSkill' || card.type === 'skillUp') {
    h.skillLevels[card.id] = card.to;
    const label = SKILL_META[card.id].label;
    if (card.type === 'newSkill') say(`새 스킬: ${label} (Q/R로 슬롯에)`, '#9be39b');
    else say(`${label} Lv.${card.to}`, '#ffe066');
    spawnHitParticles(h.x, h.y, '#ffe066', 10);
    return;
  }
  if (card.type === 'mastery') {
    const m = MASTERIES[card.id];
    h.masteries[card.id] = card.to;
    recalcGearStats(); // 표시용 합계(공격속도 등)는 매번 계산되지만 장비 화면 갱신 겸
    say(`${m.label} Lv.${card.to}`, m.color);
    spawnHitParticles(h.x, h.y, m.color, 12);
    return;
  }
  if (card.type === 'upgrade') {
    const u = UPGRADE_CARDS[card.id];
    h.cardPicks[card.id] = (h.cardPicks[card.id] || 0) + 1;
    h.cardBonus[u.stat] += card.amount;
    if (u.stat === 'manaRegen') h.manaRegen += card.amount;
    else recalcGearStats(); // 체력/마나/속도/공격력 (원소 배율은 맞힐 때 읽음)
    say(`${u.label} (${CARD_RARITY[card.rarity].label})`, CARD_RARITY[card.rarity].color);
    spawnHitParticles(h.x, h.y, u.color, card.rarity === 'legendary' ? 20 : 10);
    if (card.rarity === 'legendary') game.shake = Math.min(game.shake + 4, 12);
    return;
  }
  const f = FILLER_CARDS[card.id];
  if (card.id === 'restore') {
    h.hp = h.maxHp + h.bonusMaxHp + h.gearMaxHp;
    h.mana = h.maxMana; // maxMana에 장비 마나 포함 (gear.recalcGearStats)
  } else {
    h.potions[card.id] = Math.min(POTION_MAX, (h.potions[card.id] || 0) + 1);
  }
  say(f.label, f.color);
}
