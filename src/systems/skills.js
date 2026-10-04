// 스킬: 함성/휠윈드/리프/러시/강타의 시전(try*)과 진행(update*), 2슬롯 바인딩(SKILLS)·전환·길게 누르기 시전
// 이름/색/해금 레벨 같은 메타는 data/skills.js
import {
  ATTACK_COOLDOWN, WARCRY_RADIUS, WARCRY_COOLDOWN, WARCRY_MANA_COST, WHIRLWIND_DURATION, WHIRLWIND_COOLDOWN,
  WHIRLWIND_RADIUS, WHIRLWIND_MANA_COST, WHIRLWIND_TICK, LEAP_DISTANCE, LEAP_DURATION, LEAP_COOLDOWN,
  LEAP_MANA_COST, LEAP_RADIUS, RUSH_DISTANCE, RUSH_DURATION, RUSH_COOLDOWN, RUSH_MANA_COST, RUSH_HIT_RADIUS,
  RUSH_DAMAGE_BONUS, SMASH_DURATION, SMASH_IMPACT_TIME, SMASH_COOLDOWN, SMASH_MANA_COST, SMASH_RADIUS,
  SMASH_DAMAGE_BONUS, BASE_DAMAGE
} from '../data/balance.js';
import { PALETTE } from '../data/palette.js';
import { SKILL_ORDER, SKILL_META } from '../data/skills.js';
import { Body } from '../core/physics.js';
import { game, ui, input } from '../state.js';
import { applyKnockback } from '../entities/actor.js';
import { canHit, getCowHitRadius, registerComboHit, tryPlayerAttack, killCow, skillDamageCow } from './combat.js';
import { spawnHitParticles, emitMoveReaction, spawnShockwave, spawnDamageNumber } from './fx.js';
import { isSkillUnlocked } from './progression.js';
import { PEN, clampToPen } from '../world/arena.js';

export function tryWarCry() {
  if (!game.hero.alive || game.hero.warcryCooldown > 0 || game.hero.whirlwindTimer > 0 || game.hero.leapTimer > 0 || game.hero.rushTimer > 0 || game.hero.smashTimer > 0) return;
  if (game.hero.mana < WARCRY_MANA_COST) return;
  game.hero.mana -= WARCRY_MANA_COST;
  game.hero.warcryCooldown = WARCRY_COOLDOWN;
  spawnShockwave(game.hero.x, game.hero.y, WARCRY_RADIUS, '#e8a33d');
  game.shake = Math.min(game.shake + 7, 12);
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (!canHit(game.hero, c)) return;
    if (Math.hypot(c.x - game.hero.x, c.y - game.hero.y) <= WARCRY_RADIUS) warCryHitCow(c);
  });
}

export function warCryHitCow(c) {
  applyKnockback(c.body, game.hero.x, game.hero.y, 8);
  c.knockback = 0.25;
  c.stunTimer = 1.0;
  c.flash = 0.15;
  spawnHitParticles(c.x, c.y, '#e8dcc8', 4);
}

export function tryWhirlwind() {
  if (!game.hero.alive || game.hero.whirlwindCooldown > 0 || game.hero.whirlwindTimer > 0 || game.hero.leapTimer > 0 || game.hero.rushTimer > 0 || game.hero.smashTimer > 0) return;
  if (game.hero.mana < WHIRLWIND_MANA_COST) return;
  game.hero.mana -= WHIRLWIND_MANA_COST;
  game.cows.forEach((c) => { c.whirlHitCd = 0; });
  game.hero.whirlwindTimer = WHIRLWIND_DURATION;
  game.hero.whirlwindCooldown = WHIRLWIND_COOLDOWN + WHIRLWIND_DURATION;
  game.shake = Math.min(game.shake + 5, 12);
}

export function updateWhirlwind(dt) {
  game.hero.whirlAngle += dt * 26;
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (!canHit(game.hero, c)) return;
    if (c.whirlHitCd > 0) c.whirlHitCd -= dt;
    if (c.whirlHitCd <= 0 && Math.hypot(c.x - game.hero.x, c.y - game.hero.y) <= WHIRLWIND_RADIUS) {
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

  const dmg = BASE_DAMAGE + game.hero.attackBonus + game.hero.gearAtkPower;
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, '#fff');
  c.hp -= dmg;
  registerComboHit();
  if (c.hp <= 0 && c.state !== 'dead') {
    killCow(c);
  }
}

export function tryLeap() {
  if (!game.hero.alive || game.hero.leapCooldown > 0 || game.hero.whirlwindTimer > 0 || game.hero.leapTimer > 0 || game.hero.rushTimer > 0 || game.hero.smashTimer > 0) return;
  if (game.hero.mana < LEAP_MANA_COST) return;
  game.hero.mana -= LEAP_MANA_COST;
  game.hero.leapCooldown = LEAP_COOLDOWN;
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
  spawnShockwave(game.hero.x, game.hero.y, LEAP_RADIUS + 20, '#c9b48a');
  game.shake = Math.min(game.shake + 8, 12);
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (!canHit(game.hero, c)) return;
    if (Math.hypot(c.x - game.hero.x, c.y - game.hero.y) <= LEAP_RADIUS) leapHitCow(c);
  });
}

export function leapHitCow(c) {
  c.flash = 0.12;
  applyKnockback(c.body, game.hero.x, game.hero.y, 7);
  c.knockback = 0.2;
  spawnHitParticles(c.x, c.y, PALETTE.hide, 6);

  const dmg = BASE_DAMAGE + game.hero.attackBonus + game.hero.gearAtkPower;
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, '#fff');
  c.hp -= dmg;
  registerComboHit();
  if (c.hp <= 0 && c.state !== 'dead') {
    killCow(c);
  }
}

export function tryRush() {
  if (!game.hero.alive || game.hero.rushCooldown > 0 || game.hero.whirlwindTimer > 0 || game.hero.leapTimer > 0 || game.hero.smashTimer > 0) return;
  if (game.hero.mana < RUSH_MANA_COST) return;

  game.hero.mana -= RUSH_MANA_COST;
  game.hero.rushCooldown = RUSH_COOLDOWN;
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
      skillDamageCow(c, BASE_DAMAGE + RUSH_DAMAGE_BONUS, 8.5, '#ff9b63');
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
  game.hero.smashCooldown = SMASH_COOLDOWN;
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
    spawnShockwave(game.hero.x, game.hero.y, SMASH_RADIUS + 28, '#ffc857');
    spawnHitParticles(game.hero.x, game.hero.y + 8, '#e5d0a1', 18);
    game.shake = Math.min(game.shake + 10, 12);
    game.hitstop = Math.max(game.hitstop, 4);
    game.impactFlash = Math.max(game.impactFlash, 0.18);

    game.cows.forEach((c) => {
      if (c.state === 'dead') return;
      if (!canHit(game.hero, c)) return;
      if (Math.hypot(c.x - game.hero.x, c.y - game.hero.y) <= SMASH_RADIUS + getCowHitRadius(c)) {
        skillDamageCow(c, BASE_DAMAGE + SMASH_DAMAGE_BONUS, 11, '#ffd36a');
        c.stunTimer = Math.max(c.stunTimer || 0, 0.35);
      }
    });
  }

  if (game.hero.smashTimer <= 0) game.hero.smashTimer = 0;
}

export const SKILLS = {
  attack:    { ...SKILL_META.attack,    try: () => tryPlayerAttack(), cd: () => game.hero.attackCooldown,    cdMax: () => ATTACK_COOLDOWN },
  warcry:    { ...SKILL_META.warcry,    try: () => tryWarCry(),       cd: () => game.hero.warcryCooldown,    cdMax: () => WARCRY_COOLDOWN },
  whirlwind: { ...SKILL_META.whirlwind, try: () => tryWhirlwind(),    cd: () => game.hero.whirlwindCooldown, cdMax: () => WHIRLWIND_COOLDOWN + WHIRLWIND_DURATION },
  leap:      { ...SKILL_META.leap,      try: () => tryLeap(),         cd: () => game.hero.leapCooldown,      cdMax: () => LEAP_COOLDOWN },
  rush:      { ...SKILL_META.rush,      try: () => tryRush(),         cd: () => game.hero.rushCooldown,      cdMax: () => RUSH_COOLDOWN },
  smash:     { ...SKILL_META.smash,     try: () => tryGroundSmash(),  cd: () => game.hero.smashCooldown,     cdMax: () => SMASH_COOLDOWN }
};

export function cycleSkillSlot(slotNum) {
  const key = slotNum === 1 ? 'slot1' : 'slot2';
  const otherKey = slotNum === 1 ? 'slot2' : 'slot1';
  const cur = SKILL_ORDER.indexOf(game.hero[key]);
  for (let i = 1; i <= SKILL_ORDER.length; i++) {
    const next = SKILL_ORDER[(cur + i) % SKILL_ORDER.length];
    if (next !== game.hero[otherKey] && isSkillUnlocked(next)) { game.hero[key] = next; break; }
  }
  const slotEl = document.getElementById(key === 'slot1' ? 'slot1' : 'slot2');
  const labelEl = document.getElementById(`${key}-label`);
  if (labelEl) labelEl.textContent = SKILLS[game.hero[key]].label;
  if (slotEl) slotEl.style.background = SKILLS[game.hero[key]].color;
}

export function updateSkillSlots() {
  if (game.gameState !== 'playing' || game.paused || ui.showInventory) return;
  if (input.holdSlot1) SKILLS[game.hero.slot1].try();
  if (input.holdSlot2) SKILLS[game.hero.slot2].try();
}
