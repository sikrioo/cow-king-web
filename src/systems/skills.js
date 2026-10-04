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
import { Body, PEN } from '../core/physics.js';
import { game, ui, input, player } from '../state.js';
import { applyKnockback } from '../entities/actor.js';
import { getCowHitRadius, registerComboHit, tryPlayerAttack, killCow, skillDamageCow } from './combat.js';
import { spawnHitParticles, emitMoveReaction, spawnShockwave, spawnDamageNumber } from './fx.js';
import { isSkillUnlocked } from './progression.js';
import { clampToPen } from '../world/arena.js';

export function tryWarCry() {
  if (!player.alive || player.warcryCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.rushTimer > 0 || player.smashTimer > 0) return;
  if (player.mana < WARCRY_MANA_COST) return;
  player.mana -= WARCRY_MANA_COST;
  player.warcryCooldown = WARCRY_COOLDOWN;
  spawnShockwave(player.x, player.y, WARCRY_RADIUS, '#e8a33d');
  game.shake = Math.min(game.shake + 7, 12);
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (Math.hypot(c.x - player.x, c.y - player.y) <= WARCRY_RADIUS) warCryHitCow(c);
  });
}

export function warCryHitCow(c) {
  applyKnockback(c.body, player.x, player.y, 8);
  c.knockback = 0.25;
  c.stunTimer = 1.0;
  c.flash = 0.15;
  spawnHitParticles(c.x, c.y, '#e8dcc8', 4);
}

export function tryWhirlwind() {
  if (!player.alive || player.whirlwindCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.rushTimer > 0 || player.smashTimer > 0) return;
  if (player.mana < WHIRLWIND_MANA_COST) return;
  player.mana -= WHIRLWIND_MANA_COST;
  game.cows.forEach((c) => { c.whirlHitCd = 0; });
  player.whirlwindTimer = WHIRLWIND_DURATION;
  player.whirlwindCooldown = WHIRLWIND_COOLDOWN + WHIRLWIND_DURATION;
  game.shake = Math.min(game.shake + 5, 12);
}

export function updateWhirlwind(dt) {
  player.whirlAngle += dt * 26;
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (c.whirlHitCd > 0) c.whirlHitCd -= dt;
    if (c.whirlHitCd <= 0 && Math.hypot(c.x - player.x, c.y - player.y) <= WHIRLWIND_RADIUS) {
      whirlwindHit(c);
      c.whirlHitCd = WHIRLWIND_TICK;
    }
  });
}

export function whirlwindHit(c) {
  c.flash = 0.1;
  applyKnockback(c.body, player.x, player.y, 5);
  c.knockback = 0.15;
  spawnHitParticles(c.x, c.y, PALETTE.hide, 5);

  const dmg = BASE_DAMAGE + player.attackBonus + player.gearAtkPower;
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, '#fff');
  c.hp -= dmg;
  registerComboHit();
  if (c.hp <= 0 && c.state !== 'dead') {
    killCow(c);
  }
}

export function tryLeap() {
  if (!player.alive || player.leapCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.rushTimer > 0 || player.smashTimer > 0) return;
  if (player.mana < LEAP_MANA_COST) return;
  player.mana -= LEAP_MANA_COST;
  player.leapCooldown = LEAP_COOLDOWN;
  player.leapTimer = LEAP_DURATION;
  player.leapFrom.x = player.x;
  player.leapFrom.y = player.y;

  const margin = player.r + 10;
  let tx = player.x + Math.cos(player.facing) * LEAP_DISTANCE;
  let ty = player.y + Math.sin(player.facing) * LEAP_DISTANCE;
  tx = Math.min(Math.max(tx, PEN.x + margin), PEN.x + PEN.size - margin);
  ty = Math.min(Math.max(ty, PEN.y + margin), PEN.y + PEN.size - margin);
  player.leapTo.x = tx;
  player.leapTo.y = ty;
  game.shake = Math.min(game.shake + 3, 12);
}

export function updateLeap(dt) {
  player.leapTimer -= dt;
  const t = 1 - Math.max(player.leapTimer, 0) / LEAP_DURATION;
  const ease = t * (2 - t);
  const nx = player.leapFrom.x + (player.leapTo.x - player.leapFrom.x) * ease;
  const ny = player.leapFrom.y + (player.leapTo.y - player.leapFrom.y) * ease;
  Body.setPosition(player.body, { x: nx, y: ny });
  Body.setVelocity(player.body, { x: 0, y: 0 });
  player.x = nx;
  player.y = ny;

  if (player.leapTimer <= 0) {
    player.leapTimer = 0;
    leapLand();
  }
}

export function leapLand() {
  spawnShockwave(player.x, player.y, LEAP_RADIUS + 20, '#c9b48a');
  game.shake = Math.min(game.shake + 8, 12);
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (Math.hypot(c.x - player.x, c.y - player.y) <= LEAP_RADIUS) leapHitCow(c);
  });
}

export function leapHitCow(c) {
  c.flash = 0.12;
  applyKnockback(c.body, player.x, player.y, 7);
  c.knockback = 0.2;
  spawnHitParticles(c.x, c.y, PALETTE.hide, 6);

  const dmg = BASE_DAMAGE + player.attackBonus + player.gearAtkPower;
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, '#fff');
  c.hp -= dmg;
  registerComboHit();
  if (c.hp <= 0 && c.state !== 'dead') {
    killCow(c);
  }
}

export function tryRush() {
  if (!player.alive || player.rushCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.smashTimer > 0) return;
  if (player.mana < RUSH_MANA_COST) return;

  player.mana -= RUSH_MANA_COST;
  player.rushCooldown = RUSH_COOLDOWN;
  player.rushTimer = RUSH_DURATION;
  player.rushFrom.x = player.x;
  player.rushFrom.y = player.y;
  player.rushHitSet = new Set();

  const margin = player.r + 10;
  const dx = Math.cos(player.facing), dy = Math.sin(player.facing);
  const end = clampToPen(player.x + dx * RUSH_DISTANCE, player.y + dy * RUSH_DISTANCE, margin);
  player.rushTo.x = end.x;
  player.rushTo.y = end.y;

  Body.setVelocity(player.body, { x: 0, y: 0 });
  emitMoveReaction(-dx, -dy, 1);
  spawnShockwave(player.x, player.y, 34, '#ff8a4d');
  game.impactFlash = Math.max(game.impactFlash, 0.08);
}

export function updateRush(dt) {
  player.rushTimer -= dt;
  const raw = 1 - Math.max(player.rushTimer, 0) / RUSH_DURATION;
  const t = 1 - Math.pow(1 - raw, 2.4);
  const nx = player.rushFrom.x + (player.rushTo.x - player.rushFrom.x) * t;
  const ny = player.rushFrom.y + (player.rushTo.y - player.rushFrom.y) * t;

  Body.setPosition(player.body, { x: nx, y: ny });
  Body.setVelocity(player.body, { x: 0, y: 0 });
  player.x = nx; player.y = ny;

  const fx = Math.cos(player.facing), fy = Math.sin(player.facing);
  if (Math.random() < 0.42) spawnHitParticles(nx - fx * 10, ny - fy * 10 + 8, '#d7b18c', 1);

  game.cows.forEach((c) => {
    if (c.state === 'dead' || player.rushHitSet.has(c)) return;
    if (Math.hypot(c.x - nx, c.y - ny) <= RUSH_HIT_RADIUS + getCowHitRadius(c)) {
      player.rushHitSet.add(c);
      skillDamageCow(c, BASE_DAMAGE + RUSH_DAMAGE_BONUS, 8.5, '#ff9b63');
    }
  });

  if (player.rushTimer <= 0) {
    player.rushTimer = 0;
    spawnShockwave(player.x, player.y, 46, '#ff8a4d');
    spawnHitParticles(player.x, player.y, '#e7c8a4', 7);
    game.shake = Math.min(game.shake + 4, 12);
    game.impactFlash = Math.max(game.impactFlash, 0.07);
  }
}

export function tryGroundSmash() {
  if (!player.alive || player.smashCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.rushTimer > 0) return;
  if (player.mana < SMASH_MANA_COST) return;

  player.mana -= SMASH_MANA_COST;
  player.smashCooldown = SMASH_COOLDOWN;
  player.smashTimer = SMASH_DURATION;
  player.smashHitDone = false;
  Body.setVelocity(player.body, { x: 0, y: 0 });
}

export function updateGroundSmash(dt) {
  const prev = player.smashTimer;
  player.smashTimer -= dt;
  Body.setVelocity(player.body, { x: 0, y: 0 });

  const elapsedPrev = SMASH_DURATION - prev;
  const elapsedNow = SMASH_DURATION - Math.max(player.smashTimer, 0);
  if (!player.smashHitDone && elapsedPrev < SMASH_IMPACT_TIME && elapsedNow >= SMASH_IMPACT_TIME) {
    player.smashHitDone = true;
    spawnShockwave(player.x, player.y, SMASH_RADIUS + 28, '#ffc857');
    spawnHitParticles(player.x, player.y + 8, '#e5d0a1', 18);
    game.shake = Math.min(game.shake + 10, 12);
    game.hitstop = Math.max(game.hitstop, 4);
    game.impactFlash = Math.max(game.impactFlash, 0.18);

    game.cows.forEach((c) => {
      if (c.state === 'dead') return;
      if (Math.hypot(c.x - player.x, c.y - player.y) <= SMASH_RADIUS + getCowHitRadius(c)) {
        skillDamageCow(c, BASE_DAMAGE + SMASH_DAMAGE_BONUS, 11, '#ffd36a');
        c.stunTimer = Math.max(c.stunTimer || 0, 0.35);
      }
    });
  }

  if (player.smashTimer <= 0) player.smashTimer = 0;
}

export const SKILLS = {
  attack:    { ...SKILL_META.attack,    try: () => tryPlayerAttack(), cd: () => player.attackCooldown,    cdMax: () => ATTACK_COOLDOWN },
  warcry:    { ...SKILL_META.warcry,    try: () => tryWarCry(),       cd: () => player.warcryCooldown,    cdMax: () => WARCRY_COOLDOWN },
  whirlwind: { ...SKILL_META.whirlwind, try: () => tryWhirlwind(),    cd: () => player.whirlwindCooldown, cdMax: () => WHIRLWIND_COOLDOWN + WHIRLWIND_DURATION },
  leap:      { ...SKILL_META.leap,      try: () => tryLeap(),         cd: () => player.leapCooldown,      cdMax: () => LEAP_COOLDOWN },
  rush:      { ...SKILL_META.rush,      try: () => tryRush(),         cd: () => player.rushCooldown,      cdMax: () => RUSH_COOLDOWN },
  smash:     { ...SKILL_META.smash,     try: () => tryGroundSmash(),  cd: () => player.smashCooldown,     cdMax: () => SMASH_COOLDOWN }
};

export function cycleSkillSlot(slotNum) {
  const key = slotNum === 1 ? 'slot1' : 'slot2';
  const otherKey = slotNum === 1 ? 'slot2' : 'slot1';
  const cur = SKILL_ORDER.indexOf(player[key]);
  for (let i = 1; i <= SKILL_ORDER.length; i++) {
    const next = SKILL_ORDER[(cur + i) % SKILL_ORDER.length];
    if (next !== player[otherKey] && isSkillUnlocked(next)) { player[key] = next; break; }
  }
  const slotEl = document.getElementById(key === 'slot1' ? 'slot1' : 'slot2');
  const labelEl = document.getElementById(`${key}-label`);
  if (labelEl) labelEl.textContent = SKILLS[player[key]].label;
  if (slotEl) slotEl.style.background = SKILLS[player[key]].color;
}

export function updateSkillSlots() {
  if (game.gameState !== 'playing' || game.paused || ui.showInventory) return;
  if (input.holdSlot1) SKILLS[player.slot1].try();
  if (input.holdSlot2) SKILLS[player.slot2].try();
}
