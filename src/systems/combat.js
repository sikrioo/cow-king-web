// 전투 규칙: 기본 공격 판정(사거리/각도/히트 반경), 데미지/처치, 피격, 콤보, 보스 슬램, 냉기 노바, 불바닥 피해
import {
  ATTACK_DURATION, ATTACK_COOLDOWN, ATTACK_RANGE, WEAPON_RANGE, ATTACK_ARC, ATTACK_ARC_SINGLE, COMBO_WINDOW,
  COMBO_SPEED_PER_HIT, COMBO_SPEED_CAP, BASE_DAMAGE, BASE_BLOCK, BASE_EVASION, BOSS_SLAM_RADIUS
} from '../data/balance.js';
import { MONSTERS } from '../data/monsters.js';
import { PALETTE } from '../data/palette.js';
import { World, Body, world } from '../core/physics.js';
import { game, player } from '../state.js';
import { applyKnockback } from '../entities/actor.js';
import { recordRun } from '../save.js';
import { spawnHitParticles, spawnShockwave, spawnDamageNumber } from './fx.js';
import { dropLoot } from './loot.js';
import { gainExp } from './progression.js';

export function getCowHitRadius(c) {
  if (c.kind === 'boss') return c.r * 0.95;
  return c.r * 0.58;
}

export function getWeaponRange() {
  const w = player.equipment.weaponMain;
  if (w && w !== 'LOCKED' && WEAPON_RANGE[w.variant] !== undefined) return WEAPON_RANGE[w.variant];
  return ATTACK_RANGE;
}

export function getAttackArc() {
  const off = player.equipment.weaponOff;
  const dualWield = off && off !== 'LOCKED' && off.category === 'weapon';
  return dualWield ? ATTACK_ARC : ATTACK_ARC_SINGLE;
}

export function registerComboHit() {
  player.combo++;
  player.comboTimer = COMBO_WINDOW;
}

export function tryPlayerAttack() {
  if (!player.alive || player.attackCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.rushTimer > 0 || player.smashTimer > 0) return;
  const comboBonus = Math.min(player.combo * COMBO_SPEED_PER_HIT, COMBO_SPEED_CAP);
  const spdMul = Math.max(1 - Math.min(player.gearAtkSpeed, 0.7) - comboBonus, 0.25);
  player.currentAttackDuration = ATTACK_DURATION * spdMul;
  player.attackTimer = player.currentAttackDuration;
  player.attackCooldown = ATTACK_COOLDOWN * spdMul;

  let landed = false;
  const atkRange = getWeaponRange();
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    // 특정 지점(오프셋) 대신 몸 중심 + 몸집 반경으로 판정 - 접근 방향과 무관하게 몸 전체가 피격 범위가 됨
    const dx = c.x - player.x, dy = c.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > atkRange + getCowHitRadius(c)) return;
    let diff = Math.abs(Math.atan2(dy, dx) - player.facing);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < getAttackArc() / 2) { damageCow(c); landed = true; }
  });
  if (landed) registerComboHit();
}

export function killCow(c) {
  c.deadPos = { x: c.x, y: c.y };
  c.state = 'dead';
  c.deadTimer = 0.3;
  World.remove(world, c.body);
  game.kills++;
  gainExp((MONSTERS[c.kind] || MONSTERS.normal).exp);
  spawnHitParticles(c.x, c.y, PALETTE.horn, c.kind === 'boss' ? 22 : 10);
  // 종류별 처치 효과 (냉기 노바/자폭/보스 승리) - behaviors[kind].onDeath. true면 자체 드랍을 했으므로 기본 드랍 생략
  const b = c.behavior;
  if (b && b.onDeath && b.onDeath(c)) return;
  dropLoot(c.x, c.y, c.kind !== 'normal', 1); // 엘리트는 장비 드랍 보장
}

export function spawnColdNova(x, y) {
  spawnShockwave(x, y, 90, '#9fd8ff');
  if (player.alive && Math.hypot(player.x - x, player.y - y) <= 90) {
    player.slowTimer = 2.5;
  }
}

export function bossSlam(c) {
  spawnShockwave(c.x, c.y, BOSS_SLAM_RADIUS, '#b57bd6');
  game.shake = Math.min(game.shake + 6, 12);
  if (player.alive && Math.hypot(player.x - c.x, player.y - c.y) <= BOSS_SLAM_RADIUS) {
    hitPlayer(c.x, c.y, 6);
  }
}

export function damageCow(c) {
  c.flash = 0.12;
  applyKnockback(c.body, player.x, player.y, 7);
  c.knockback = 0.18;
  game.shake = Math.min(game.shake + 4, 10);
  game.hitstop = 4;
  spawnHitParticles(c.x, c.y, PALETTE.hide, 7);

  const dmg = BASE_DAMAGE + player.attackBonus + player.gearAtkPower;
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, '#fff');
  c.hp -= dmg;
  if (c.hp <= 0 && c.state !== 'dead') {
    killCow(c);
    game.shake = Math.min(game.shake + 6, 12);
  }
}

export function hitPlayer(fromX, fromY, dmg = 3) {
  if (!player.alive || player.invuln > 0) return;

  const totalEvasion = Math.min(BASE_EVASION + player.gearEvasion, 0.75);
  if (Math.random() < totalEvasion) {
    spawnDamageNumber(player.x, player.y - 34, 'MISS', '#8fe8ff');
    player.invuln = 0.25;
    return;
  }

  const totalBlock = Math.min(BASE_BLOCK + player.defenseChance + player.gearDefense, 0.85);
  const blocked = Math.random() < totalBlock;
  if (!blocked) {
    player.hp -= dmg;
    spawnDamageNumber(player.x, player.y - 34, `-${dmg}`, '#ff5b52');
  } else {
    spawnDamageNumber(player.x, player.y - 34, 'BLOCK', '#8fd0ff');
  }

  player.invuln = 0.55; // 기존 0.8 → 0.55, 여러 마리에게 둘러싸였을 때 실제로 더 아프게
  player.flash = 0.14;
  applyKnockback(player.body, fromX, fromY, blocked ? 3 : 6);
  player.knockback = blocked ? 0.1 : 0.22;
  game.shake = Math.min(game.shake + (blocked ? 3 : 6), 12);
  game.hitstop = blocked ? 0 : 5;
  spawnHitParticles(player.x, player.y, PALETTE.eye, blocked ? 4 : 8);

  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    game.gameState = 'gameover';
    recordRun('gameover');
    Body.setVelocity(player.body, { x: 0, y: 0 });
  }
}

export function updateHazards(dt) {
  for (let i = game.hazards.length - 1; i >= 0; i--) {
    const h = game.hazards[i];
    h.life -= dt;
    h.tickTimer -= dt;
    if (h.life <= 0) { game.hazards.splice(i, 1); continue; }
    if (player.alive && h.tickTimer <= 0 && Math.hypot(player.x - h.x, player.y - h.y) <= h.r) {
      hitPlayer(h.x, h.y);
      h.tickTimer = 0.6;
      if (Math.random() < 0.4) spawnHitParticles(player.x, player.y - 10, '#ff7a1a', 3);
    }
  }
}

export function skillDamageCow(c, bonusDamage, knockForce, color) {
  if (!c || c.state === 'dead') return;
  c.flash = 0.13;
  applyKnockback(c.body, player.x, player.y, knockForce);
  c.knockback = Math.max(c.knockback || 0, 0.22);
  const dmg = Math.max(1, bonusDamage + player.attackBonus + player.gearAtkPower);
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, color || '#fff');
  spawnHitParticles(c.x, c.y, color || PALETTE.hide, 8);
  c.hp -= dmg;
  registerComboHit();
  if (c.hp <= 0 && c.state !== 'dead') killCow(c);
}
