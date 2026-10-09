// 스킬: 함성/휠윈드/리프/러시/강타의 시전(try*)과 진행(update*), 2슬롯 바인딩(SKILLS)·전환·길게 누르기 시전
// 이름/색/해금 레벨 같은 메타는 data/skills.js
import {
  ATTACK_COOLDOWN, WARCRY_RADIUS, WARCRY_COOLDOWN, WARCRY_MANA_COST, WHIRLWIND_DURATION, WHIRLWIND_COOLDOWN,
  WHIRLWIND_RADIUS, WHIRLWIND_MANA_COST, WHIRLWIND_TICK, LEAP_DISTANCE, LEAP_DURATION, LEAP_COOLDOWN,
  LEAP_MANA_COST, LEAP_RADIUS, RUSH_DISTANCE, RUSH_DURATION, RUSH_COOLDOWN, RUSH_MANA_COST, RUSH_HIT_RADIUS,
  RUSH_DAMAGE_BONUS, SMASH_DURATION, SMASH_IMPACT_TIME, SMASH_COOLDOWN, SMASH_MANA_COST, SMASH_RADIUS,
  SMASH_DAMAGE_BONUS
} from '../data/balance.js';
import { PALETTE } from '../data/palette.js';
import { SKILL_META, SPELLS, SKILL_STATS, COMMON_SKILLS } from '../data/skills.js';
import { CLASSES } from '../data/classes.js';
import { CLICK_ATTACK_RANGE_SLACK } from '../data/balance.js';
import { Body } from '../core/physics.js';
import { game, ui, input } from '../state.js';
import { applyKnockback } from '../entities/actor.js';
import { canHit, getCowHitRadius, registerComboHit, tryPlayerAttack, killCow, skillDamageCow, heroHitDamage, rollWeaponDamage, getWeaponRange, physDamageTo, showCowDamage } from './combat.js';
import { tryBolt, tryFireballSpell, tryFrostNova, tryChain, tryOrb } from './sorcSkills.js';
import { tryFortify, tryFlurry, tryConcuss, tryBerserk, tryDecoy } from './physSkills.js';
import { tryEnergyShield, tryBlizzard, tryFlamePillar, tryFireWave } from './groundSpells.js';
import { weaponElementHit } from './elementCombat.js';
import { tryTeleport } from './commonSkills.js';
import { spawnHitParticles, emitMoveReaction, spawnShockwave, spawnDamageNumber } from './fx.js';
import { isSkillUnlocked } from './progression.js';
import { PEN, clampToPen } from '../world/arena.js';
import { castSpeedMul, attackSpeedMul, skillMul, skillBonus } from '../util.js';
import { aim } from './aim.js';

export function tryWarCry() {
  if (!game.hero.alive || game.hero.warcryCooldown > 0 || game.hero.whirlwindTimer > 0 || game.hero.leapTimer > 0 || game.hero.rushTimer > 0 || game.hero.smashTimer > 0) return;
  if (game.hero.mana < WARCRY_MANA_COST) return;
  game.hero.mana -= WARCRY_MANA_COST;
  game.hero.warcryCooldown = WARCRY_COOLDOWN * castSpeedMul(game.hero);
  const radius = WARCRY_RADIUS * skillMul(game.hero, 'warcry', 'radius');
  spawnShockwave(game.hero.x, game.hero.y, radius, '#e8a33d');
  game.shake = Math.min(game.shake + 7, 12);
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (!canHit(game.hero, c)) return;
    if (Math.hypot(c.x - game.hero.x, c.y - game.hero.y) <= radius) warCryHitCow(c);
  });
}

export function warCryHitCow(c) {
  applyKnockback(c.body, game.hero.x, game.hero.y, 8);
  c.knockback = 0.25;
  c.stunTimer = 1.0 * skillMul(game.hero, 'warcry', 'stun');
  c.flash = 0.15;
  spawnHitParticles(c.x, c.y, '#e8dcc8', 4);
}

export function tryWhirlwind() {
  if (!game.hero.alive || game.hero.whirlwindCooldown > 0 || game.hero.whirlwindTimer > 0 || game.hero.leapTimer > 0 || game.hero.rushTimer > 0 || game.hero.smashTimer > 0) return;
  if (game.hero.mana < WHIRLWIND_MANA_COST) return;
  game.hero.mana -= WHIRLWIND_MANA_COST;
  game.cows.forEach((c) => { c.whirlHitCd = 0; });
  game.hero.whirlwindTimer = WHIRLWIND_DURATION;
  game.hero.whirlwindCooldown = WHIRLWIND_COOLDOWN * castSpeedMul(game.hero) + WHIRLWIND_DURATION; // 지속 시간은 그대로, 대기시간만 줄어듦
  game.shake = Math.min(game.shake + 5, 12);
}

export function updateWhirlwind(dt) {
  game.hero.whirlAngle += dt * 26;
  const radius = WHIRLWIND_RADIUS * skillMul(game.hero, 'whirlwind', 'radius');
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (!canHit(game.hero, c)) return;
    if (c.whirlHitCd > 0) c.whirlHitCd -= dt;
    if (c.whirlHitCd <= 0 && Math.hypot(c.x - game.hero.x, c.y - game.hero.y) <= radius) {
      whirlwindHit(c);
      c.whirlHitCd = WHIRLWIND_TICK;
    }
  });
}

export function whirlwindHit(c) {
  c.flash = 0.1;
  applyKnockback(c.body, game.hero.x, game.hero.y, 5);
  c.knockback = 0.15;
  spawnHitParticles(c.x, c.y, PALETTE.hide, 5);

  const dmg = physDamageTo(c, Math.round(heroHitDamage() * skillMul(game.hero, 'whirlwind', 'damage')));
  showCowDamage(c, dmg);
  if (dmg > 0) { // 0 = 물리 면역
    c.hp -= dmg;
    registerComboHit();
    if (c.hp <= 0 && c.state !== 'dead') killCow(c);
  }
  weaponElementHit(c);
}

export function tryLeap() {
  if (!game.hero.alive || game.hero.leapCooldown > 0 || game.hero.whirlwindTimer > 0 || game.hero.leapTimer > 0 || game.hero.rushTimer > 0 || game.hero.smashTimer > 0) return;
  if (game.hero.mana < LEAP_MANA_COST) return;
  game.hero.mana -= LEAP_MANA_COST;
  game.hero.leapCooldown = LEAP_COOLDOWN * castSpeedMul(game.hero);
  game.hero.leapTimer = LEAP_DURATION;
  game.hero.leapFrom.x = game.hero.x;
  game.hero.leapFrom.y = game.hero.y;

  const margin = game.hero.r + 10;
  let tx = game.hero.x + Math.cos(game.hero.facing) * LEAP_DISTANCE;
  let ty = game.hero.y + Math.sin(game.hero.facing) * LEAP_DISTANCE;
  tx = Math.min(Math.max(tx, PEN.x + margin), PEN.x + PEN.size - margin);
  ty = Math.min(Math.max(ty, PEN.y + margin), PEN.y + PEN.size - margin);
  game.hero.leapTo.x = tx;
  game.hero.leapTo.y = ty;
  game.shake = Math.min(game.shake + 3, 12);
}

export function updateLeap(dt) {
  game.hero.leapTimer -= dt;
  const t = 1 - Math.max(game.hero.leapTimer, 0) / LEAP_DURATION;
  const ease = t * (2 - t);
  const nx = game.hero.leapFrom.x + (game.hero.leapTo.x - game.hero.leapFrom.x) * ease;
  const ny = game.hero.leapFrom.y + (game.hero.leapTo.y - game.hero.leapFrom.y) * ease;
  Body.setPosition(game.hero.body, { x: nx, y: ny });
  Body.setVelocity(game.hero.body, { x: 0, y: 0 });
  game.hero.x = nx;
  game.hero.y = ny;

  if (game.hero.leapTimer <= 0) {
    game.hero.leapTimer = 0;
    leapLand();
  }
}

export function leapLand() {
  const radius = LEAP_RADIUS * skillMul(game.hero, 'leap', 'radius');
  spawnShockwave(game.hero.x, game.hero.y, radius + 20, '#c9b48a');
  game.shake = Math.min(game.shake + 8, 12);
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (!canHit(game.hero, c)) return;
    if (Math.hypot(c.x - game.hero.x, c.y - game.hero.y) <= radius) leapHitCow(c);
  });
}

export function leapHitCow(c) {
  c.flash = 0.12;
  applyKnockback(c.body, game.hero.x, game.hero.y, 7);
  c.knockback = 0.2;
  spawnHitParticles(c.x, c.y, PALETTE.hide, 6);

  const dmg = physDamageTo(c, Math.round(heroHitDamage() * skillMul(game.hero, 'leap', 'damage')));
  showCowDamage(c, dmg);
  if (dmg > 0) { // 0 = 물리 면역
    c.hp -= dmg;
    registerComboHit();
    if (c.hp <= 0 && c.state !== 'dead') killCow(c);
  }
  weaponElementHit(c);
}

export function tryRush() {
  if (!game.hero.alive || game.hero.rushCooldown > 0 || game.hero.whirlwindTimer > 0 || game.hero.leapTimer > 0 || game.hero.smashTimer > 0) return;
  if (game.hero.mana < RUSH_MANA_COST) return;

  game.hero.mana -= RUSH_MANA_COST;
  game.hero.rushCooldown = RUSH_COOLDOWN * castSpeedMul(game.hero);
  game.hero.rushTimer = RUSH_DURATION;
  game.hero.rushFrom.x = game.hero.x;
  game.hero.rushFrom.y = game.hero.y;
  game.hero.rushHitSet = new Set();

  const margin = game.hero.r + 10;
  const dx = Math.cos(game.hero.facing), dy = Math.sin(game.hero.facing);
  const end = clampToPen(game.hero.x + dx * RUSH_DISTANCE, game.hero.y + dy * RUSH_DISTANCE, margin);
  game.hero.rushTo.x = end.x;
  game.hero.rushTo.y = end.y;

  Body.setVelocity(game.hero.body, { x: 0, y: 0 });
  emitMoveReaction(-dx, -dy, 1);
  spawnShockwave(game.hero.x, game.hero.y, 34, '#ff8a4d');
  game.impactFlash = Math.max(game.impactFlash, 0.08);
}

export function updateRush(dt) {
  game.hero.rushTimer -= dt;
  const raw = 1 - Math.max(game.hero.rushTimer, 0) / RUSH_DURATION;
  const t = 1 - Math.pow(1 - raw, 2.4);
  const nx = game.hero.rushFrom.x + (game.hero.rushTo.x - game.hero.rushFrom.x) * t;
  const ny = game.hero.rushFrom.y + (game.hero.rushTo.y - game.hero.rushFrom.y) * t;

  Body.setPosition(game.hero.body, { x: nx, y: ny });
  Body.setVelocity(game.hero.body, { x: 0, y: 0 });
  game.hero.x = nx; game.hero.y = ny;

  const fx = Math.cos(game.hero.facing), fy = Math.sin(game.hero.facing);
  if (Math.random() < 0.42) spawnHitParticles(nx - fx * 10, ny - fy * 10 + 8, '#d7b18c', 1);

  game.cows.forEach((c) => {
    if (c.state === 'dead' || game.hero.rushHitSet.has(c)) return;
    if (!canHit(game.hero, c)) return;
    if (Math.hypot(c.x - nx, c.y - ny) <= RUSH_HIT_RADIUS + getCowHitRadius(c)) {
      game.hero.rushHitSet.add(c);
      skillDamageCow(c, Math.round((rollWeaponDamage() + RUSH_DAMAGE_BONUS) * skillMul(game.hero, 'rush', 'damage')), 8.5, '#ff9b63');
      weaponElementHit(c);
    }
  });

  if (game.hero.rushTimer <= 0) {
    game.hero.rushTimer = 0;
    spawnShockwave(game.hero.x, game.hero.y, 46, '#ff8a4d');
    spawnHitParticles(game.hero.x, game.hero.y, '#e7c8a4', 7);
    game.shake = Math.min(game.shake + 4, 12);
    game.impactFlash = Math.max(game.impactFlash, 0.07);
  }
}

export function tryGroundSmash() {
  if (!game.hero.alive || game.hero.smashCooldown > 0 || game.hero.whirlwindTimer > 0 || game.hero.leapTimer > 0 || game.hero.rushTimer > 0) return;
  if (game.hero.mana < SMASH_MANA_COST) return;

  game.hero.mana -= SMASH_MANA_COST;
  game.hero.smashCooldown = SMASH_COOLDOWN * castSpeedMul(game.hero);
  game.hero.smashTimer = SMASH_DURATION;
  game.hero.smashHitDone = false;
  Body.setVelocity(game.hero.body, { x: 0, y: 0 });
}

export function updateGroundSmash(dt) {
  const prev = game.hero.smashTimer;
  game.hero.smashTimer -= dt;
  Body.setVelocity(game.hero.body, { x: 0, y: 0 });

  const elapsedPrev = SMASH_DURATION - prev;
  const elapsedNow = SMASH_DURATION - Math.max(game.hero.smashTimer, 0);
  if (!game.hero.smashHitDone && elapsedPrev < SMASH_IMPACT_TIME && elapsedNow >= SMASH_IMPACT_TIME) {
    game.hero.smashHitDone = true;
    const radius = SMASH_RADIUS * skillMul(game.hero, 'smash', 'radius');
    spawnShockwave(game.hero.x, game.hero.y, radius + 28, '#ffc857');
    spawnHitParticles(game.hero.x, game.hero.y + 8, '#e5d0a1', 18);
    game.shake = Math.min(game.shake + 10, 12);
    game.hitstop = Math.max(game.hitstop, 4);
    game.impactFlash = Math.max(game.impactFlash, 0.18);

    game.cows.forEach((c) => {
      if (c.state === 'dead') return;
      if (!canHit(game.hero, c)) return;
      if (Math.hypot(c.x - game.hero.x, c.y - game.hero.y) <= radius + getCowHitRadius(c)) {
        skillDamageCow(c, Math.round((rollWeaponDamage() + SMASH_DAMAGE_BONUS) * skillMul(game.hero, 'smash', 'damage')), 11, '#ffd36a');
        weaponElementHit(c);
        c.stunTimer = Math.max(c.stunTimer || 0, 0.35);
      }
    });
  }

  if (game.hero.smashTimer <= 0) game.hero.smashTimer = 0;
}

export const SKILLS = {
  attack:    { ...SKILL_META.attack,    try: () => tryPlayerAttack(weaponElementHit), cd: () => game.hero.attackCooldown,    cdMax: () => game.hero.attackCooldownMax || ATTACK_COOLDOWN },
  warcry:    { ...SKILL_META.warcry,    try: () => tryWarCry(),       cd: () => game.hero.warcryCooldown,    cdMax: () => WARCRY_COOLDOWN * castSpeedMul(game.hero) },
  whirlwind: { ...SKILL_META.whirlwind, try: () => tryWhirlwind(),    cd: () => game.hero.whirlwindCooldown, cdMax: () => WHIRLWIND_COOLDOWN * castSpeedMul(game.hero) + WHIRLWIND_DURATION },
  leap:      { ...SKILL_META.leap,      try: () => tryLeap(),         cd: () => game.hero.leapCooldown,      cdMax: () => LEAP_COOLDOWN * castSpeedMul(game.hero) },
  rush:      { ...SKILL_META.rush,      try: () => tryRush(),         cd: () => game.hero.rushCooldown,      cdMax: () => RUSH_COOLDOWN * castSpeedMul(game.hero) },
  smash:     { ...SKILL_META.smash,     try: () => tryGroundSmash(),  cd: () => game.hero.smashCooldown,     cdMax: () => SMASH_COOLDOWN * castSpeedMul(game.hero) },
  // 마법사 (systems/sorcSkills.js)
  bolt:      { ...SKILL_META.bolt,      try: () => tryBolt(),          cd: () => game.hero.spellCd.bolt,      cdMax: () => SPELLS.bolt.cooldown * attackSpeedMul(game.hero) },
  fireball:  { ...SKILL_META.fireball,  try: () => tryFireballSpell(), cd: () => game.hero.spellCd.fireball,  cdMax: () => SPELLS.fireball.cooldown * castSpeedMul(game.hero) },
  frostnova: { ...SKILL_META.frostnova, try: () => tryFrostNova(),     cd: () => game.hero.spellCd.frostnova, cdMax: () => SPELLS.frostnova.cooldown * castSpeedMul(game.hero) },
  chain:     { ...SKILL_META.chain,     try: () => tryChain(),         cd: () => game.hero.spellCd.chain,     cdMax: () => SPELLS.chain.cooldown * castSpeedMul(game.hero) },
  orb:       { ...SKILL_META.orb,       try: () => tryOrb(),           cd: () => game.hero.spellCd.orb,       cdMax: () => SPELLS.orb.cooldown * castSpeedMul(game.hero) },
  // 물리 보조 (systems/physSkills.js), 공통 (systems/commonSkills.js)
  fortify:   { ...SKILL_META.fortify,   try: () => tryFortify(),       cd: () => game.hero.spellCd.fortify,   cdMax: () => SKILL_STATS.fortify.cooldown * castSpeedMul(game.hero) },
  flurry:    { ...SKILL_META.flurry,    try: () => tryFlurry(),        cd: () => game.hero.spellCd.flurry,    cdMax: () => SKILL_STATS.flurry.cooldown * castSpeedMul(game.hero) },
  concuss:   { ...SKILL_META.concuss,   try: () => tryConcuss(),       cd: () => game.hero.spellCd.concuss,   cdMax: () => SKILL_STATS.concuss.cooldown * castSpeedMul(game.hero) },
  berserk:   { ...SKILL_META.berserk,   try: () => tryBerserk(),       cd: () => game.hero.spellCd.berserk,   cdMax: () => SKILL_STATS.berserk.cooldown * castSpeedMul(game.hero) },
  decoy:     { ...SKILL_META.decoy,     try: () => tryDecoy(),         cd: () => game.hero.spellCd.decoy,     cdMax: () => SKILL_STATS.decoy.cooldown * castSpeedMul(game.hero) },
  energyshield: { ...SKILL_META.energyshield, try: () => tryEnergyShield(), cd: () => game.hero.spellCd.energyshield, cdMax: () => SPELLS.energyshield.cooldown * castSpeedMul(game.hero) },
  firewave:  { ...SKILL_META.firewave,  try: () => tryFireWave(),      cd: () => game.hero.spellCd.firewave,  cdMax: () => SPELLS.firewave.cooldown * castSpeedMul(game.hero) },
  blizzard:  { ...SKILL_META.blizzard,  try: () => tryBlizzard(),      cd: () => game.hero.spellCd.blizzard,  cdMax: () => SPELLS.blizzard.cooldown * castSpeedMul(game.hero) },
  flamepillar: { ...SKILL_META.flamepillar, try: () => tryFlamePillar(), cd: () => game.hero.spellCd.flamepillar, cdMax: () => SPELLS.flamepillar.cooldown * castSpeedMul(game.hero) },
  teleport:  { ...SKILL_META.teleport,  try: () => tryTeleport(),      cd: () => game.hero.spellCd.teleport,  cdMax: () => SKILL_STATS.teleport.cooldown * (1 - skillBonus(game.hero, 'teleport', 'cdr')) * castSpeedMul(game.hero) }
};

// 지금 캐릭터의 스킬 목록
export function classSkills() {
  return (CLASSES[game.hero.classKey] || CLASSES.warrior).skills;
}
// 배울 수 있는 스킬 전부 = 캐릭터 스킬 + 공통 스킬 (슬롯1/2 Q/R 전환 순서)
export function learnableSkills() {
  return [...classSkills(), ...COMMON_SKILLS];
}

// 기본 공격 (적 클릭/Shift+클릭): 전사 = 근접 휘두르기, 마법사 = 마력탄
const isCaster = () => (CLASSES[game.hero.classKey] || CLASSES.warrior).basic === 'bolt';
export function tryBasicAttack() {
  if (isCaster()) tryBolt(); else tryPlayerAttack(weaponElementHit);
}
export function basicAttackReady() {
  return isCaster() ? game.hero.spellCd.bolt <= 0 : game.hero.attackCooldown <= 0;
}
// 적 c를 기본 공격하려면 이만큼 가까이 가야 함
export function basicAttackReach(c) {
  if (isCaster()) return SPELLS.bolt.range * 0.8;
  return getWeaponRange() + getCowHitRadius(c) - CLICK_ATTACK_RANGE_SLACK;
}

export function cycleSkillSlot(slotNum) {
  const key = slotNum === 1 ? 'slot1' : 'slot2';
  const otherKey = slotNum === 1 ? 'slot2' : 'slot1';
  const order = learnableSkills();
  const cur = order.indexOf(game.hero[key]);
  for (let i = 1; i <= order.length; i++) {
    const next = order[(cur + i) % order.length];
    if (next !== game.hero[otherKey] && isSkillUnlocked(next)) { game.hero[key] = next; break; }
  }
  const slotEl = document.getElementById(key === 'slot1' ? 'slot1' : 'slot2');
  const labelEl = document.getElementById(`${key}-label`);
  if (labelEl) labelEl.textContent = SKILLS[game.hero[key]].label;
  if (slotEl) slotEl.style.background = SKILLS[game.hero[key]].color;
}

// 시전 직전 조준 (자동 조준·커서 흡착 - systems/aim.js). 스킬 메타 aim: 'free'면 적 보정 없이
export function aimAtCursor(id) {
  const range = id && ((SPELLS[id] && SPELLS[id].range) || (SKILL_STATS[id] && SKILL_STATS[id].range));
  aim(id && SKILL_META[id] && SKILL_META[id].aim === 'free' ? 'free' : 'target', range || undefined);
}

// 슬롯 시전 (커서 조준 포함) - 키보드/마우스/버튼 모두 여기로
export function trySlot(n) {
  const id = n === 2 ? game.hero.slot2 : game.hero.slot1;
  aimAtCursor(id);
  SKILLS[id].try();
}

export function updateSkillSlots() {
  if (game.gameState !== 'playing' || game.paused || ui.showInventory) return;
  if (input.holdSlot1) trySlot(1);
  if (input.holdSlot2) trySlot(2);
  // Shift+좌클릭 제자리 공격 (캐릭터의 기본 공격)
  if (input.standAttackHeld && basicAttackReady()) { aimAtCursor(); tryBasicAttack(); }
}
