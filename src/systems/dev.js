// 개발자 모드 동작 (테스트 편의). 켜는 조건은 config.isDevMode(), 화면은 ui/devPanel.js
// 일반 플레이에는 영향 없음 - 패널 버튼과 dev 플래그(무적/마나 무한/대기시간 0)로만 동작
import { MAX_LEVEL, POTION_MAX, INVENTORY_SIZE } from '../data/balance.js';
import { SKILL_MAX_LEVEL, COMMON_SKILLS } from '../data/skills.js';
import { CLASSES } from '../data/classes.js';
import { World, world } from '../core/physics.js';
import { game, dev } from '../state.js';
import { Monster } from '../entities/monster.js';
import { floatText } from './fx.js';
import { rollGearItem } from './gear.js';
import { gainExp } from './progression.js';
import { clampToPen } from '../world/arena.js';

const say = (text, color = '#7fe0ff') => floatText(game.hero.x, game.hero.y - 50, text, color);

export function devLevelUp(n = 1) {
  for (let i = 0; i < n && game.hero.level < MAX_LEVEL; i++) gainExp(Math.max(1, game.hero.expToNext - game.hero.exp));
  say(`레벨 ${game.hero.level}`);
}

// 최대 레벨 + 이 캐릭터 스킬 전부 최대 (레벨업 카드는 건너뜀)
export function devMaxLevel() {
  devLevelUp(MAX_LEVEL);
  [...CLASSES[game.hero.classKey].skills, ...COMMON_SKILLS].forEach((id) => { game.hero.skillLevels[id] = SKILL_MAX_LEVEL; });
  if (!game.hero.slot3) game.hero.slot3 = COMMON_SKILLS[0];
  devSkipCards();
}

// 쌓인 레벨업 카드를 고르지 않고 닫음
export function devSkipCards() {
  game.hero.pendingCards = 0;
  game.cardOffer = null;
}

export function devStatPoints(n = 5) {
  game.hero.statPoints += n;
  say(`스탯 포인트 +${n}`);
}

export function devFill() {
  const h = game.hero;
  h.hp = h.maxHp + h.bonusMaxHp + h.gearMaxHp;
  h.mana = h.maxMana;
  h.stamina = h.maxStamina;
  say('체력·마나 가득');
}

export function devToggle(flag) {
  dev[flag] = !dev[flag];
  return dev[flag];
}

// 몬스터를 경험치/드랍 없이 치움
function clearCows() {
  game.cows.forEach((c) => { if (c.body) World.remove(world, c.body); });
  game.cows = [];
}

export function devKillAll() {
  clearCows();
  game.waveTransition = Math.min(game.waveTransition, 1);
  say('몬스터 제거');
}

// n번째 웨이브로 (지금 몬스터는 치우고 곧바로 시작)
export function devJumpWave(n) {
  clearCows();
  game.wave = n - 1;
  game.waveTransition = 0.3;
  say(`웨이브 ${n}로`);
}

export function devSpawn(kind) {
  const a = game.hero.facing;
  const p = clampToPen(game.hero.x + Math.cos(a) * 170, game.hero.y + Math.sin(a) * 170, 40);
  const scale = kind === 'boss' ? 1.0 : (1.05 + Math.random() * 0.5) * 0.3;
  game.cows.push(new Monster(scale, kind, { pos: p, hunt: true }));
}

export function devGiveGear(rarity) {
  if (game.hero.inventory.length >= INVENTORY_SIZE) { say('가방 가득!', '#ff5b52'); return; }
  game.hero.inventory.push(rollGearItem({ rarity, identified: true }));
  say(`${rarity} 장비 지급`);
}

export function devMaterials(n = 10) {
  game.hero.materials += n;
  say(`재료 +${n}`);
}

export function devPotions() {
  game.hero.potions = { heal: POTION_MAX, mana: POTION_MAX };
  say('물약 가득');
}

// 매 틱: 마나 무한/대기시간 0
export function updateDev() {
  const h = game.hero;
  if (dev.infiniteMana) h.mana = h.maxMana;
  if (dev.noCooldown) {
    h.warcryCooldown = 0; h.whirlwindCooldown = 0; h.leapCooldown = 0; h.rushCooldown = 0; h.smashCooldown = 0;
    for (const k in h.spellCd) h.spellCd[k] = 0;
  }
}
