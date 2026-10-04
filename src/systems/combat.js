// 전투 규칙: 기본 공격 판정(사거리/각도/히트 반경), 데미지/처치, 피격, 콤보, 보스 슬램, 냉기 노바, 불바닥 피해
import {
  ATTACK_DURATION, ATTACK_COOLDOWN, ATTACK_RANGE, WEAPON_RANGE, ATTACK_ARC, ATTACK_ARC_SINGLE, COMBO_WINDOW,
  COMBO_SPEED_PER_HIT, COMBO_SPEED_CAP, BASE_DAMAGE, BASE_BLOCK, BASE_EVASION, BOSS_SLAM_RADIUS
} from '../data/balance.js';
import { MONSTERS } from '../data/monsters.js';
import { PALETTE } from '../data/palette.js';
import { World, Body, world } from '../core/physics.js';
import { game } from '../state.js';
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
  const w = game.hero.equipment.weaponMain;
  if (w && w !== 'LOCKED' && WEAPON_RANGE[w.variant] !== undefined) return WEAPON_RANGE[w.variant];
  return ATTACK_RANGE;
}

export function getAttackArc() {
  const off = game.hero.equipment.weaponOff;
  const dualWield = off && off !== 'LOCKED' && off.category === 'weapon';
  return dualWield ? ATTACK_ARC : ATTACK_ARC_SINGLE;
}

export function registerComboHit() {
  game.hero.combo++;
  game.hero.comboTimer = COMBO_WINDOW;
}

export function tryPlayerAttack() {
  if (!game.hero.alive || game.hero.attackCooldown > 0 || game.hero.whirlwindTimer > 0 || game.hero.leapTimer > 0 || game.hero.rushTimer > 0 || game.hero.smashTimer > 0) return;
  const comboBonus = Math.min(game.hero.combo * COMBO_SPEED_PER_HIT, COMBO_SPEED_CAP);
  const spdMul = Math.max(1 - Math.min(game.hero.gearAtkSpeed, 0.7) - comboBonus, 0.25);
  game.hero.currentAttackDuration = ATTACK_DURATION * spdMul;
  game.hero.attackTimer = game.hero.currentAttackDuration;
  game.hero.attackCooldown = ATTACK_COOLDOWN * spdMul;

  let landed = false;
  const atkRange = getWeaponRange();
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    // 특정 지점(오프셋) 대신 몸 중심 + 몸집 반경으로 판정 - 접근 방향과 무관하게 몸 전체가 피격 범위가 됨
    const dx = c.x - game.hero.x, dy = c.y - game.hero.y;
    const dist = Math.hypot(dx, dy);
    if (dist > atkRange + getCowHitRadius(c)) return;
    let diff = Math.abs(Math.atan2(dy, dx) - game.hero.facing);
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
  if (game.hero.alive && Math.hypot(game.hero.x - x, game.hero.y - y) <= 90) {
    game.hero.slowTimer = 2.5;
  }
}

export function bossSlam(c) {
  spawnShockwave(c.x, c.y, BOSS_SLAM_RADIUS, '#b57bd6');
  game.shake = Math.min(game.shake + 6, 12);
  if (game.hero.alive && Math.hypot(game.hero.x - c.x, game.hero.y - c.y) <= BOSS_SLAM_RADIUS) {
    hitPlayer(c.x, c.y, 6);
  }
}

export function damageCow(c) {
  c.flash = 0.12;
  applyKnockback(c.body, game.hero.x, game.hero.y, 7);
  c.knockback = 0.18;
  game.shake = Math.min(game.shake + 4, 10);
  game.hitstop = 4;
  spawnHitParticles(c.x, c.y, PALETTE.hide, 7);

  const dmg = BASE_DAMAGE + game.hero.attackBonus + game.hero.gearAtkPower;
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, '#fff');
  c.hp -= dmg;
  if (c.hp <= 0 && c.state !== 'dead') {
    killCow(c);
    game.shake = Math.min(game.shake + 6, 12);
  }
}

export function hitPlayer(fromX, fromY, dmg = 3) {
  if (!game.hero.alive || game.hero.invuln > 0) return;

  const totalEvasion = Math.min(BASE_EVASION + game.hero.gearEvasion, 0.75);
  if (Math.random() < totalEvasion) {
    spawnDamageNumber(game.hero.x, game.hero.y - 34, 'MISS', '#8fe8ff');
    game.hero.invuln = 0.25;
    return;
  }

  const totalBlock = Math.min(BASE_BLOCK + game.hero.defenseChance + game.hero.gearDefense, 0.85);
  const blocked = Math.random() < totalBlock;
  if (!blocked) {
    game.hero.hp -= dmg;
    spawnDamageNumber(game.hero.x, game.hero.y - 34, `-${dmg}`, '#ff5b52');
  } else {
    spawnDamageNumber(game.hero.x, game.hero.y - 34, 'BLOCK', '#8fd0ff');
  }

  game.hero.invuln = 0.55; // 기존 0.8 → 0.55, 여러 마리에게 둘러싸였을 때 실제로 더 아프게
  game.hero.flash = 0.14;
  applyKnockback(game.hero.body, fromX, fromY, blocked ? 3 : 6);
  game.hero.knockback = blocked ? 0.1 : 0.22;
  game.shake = Math.min(game.shake + (blocked ? 3 : 6), 12);
  game.hitstop = blocked ? 0 : 5;
  spawnHitParticles(game.hero.x, game.hero.y, PALETTE.eye, blocked ? 4 : 8);

  if (game.hero.hp <= 0) {
    game.hero.hp = 0;
    game.hero.alive = false;
    game.gameState = 'gameover';
    recordRun('gameover');
    Body.setVelocity(game.hero.body, { x: 0, y: 0 });
  }
}

export function updateHazards(dt) {
  for (let i = game.hazards.length - 1; i >= 0; i--) {
    const h = game.hazards[i];
    h.life -= dt;
    h.tickTimer -= dt;
    if (h.life <= 0) { game.hazards.splice(i, 1); continue; }
    if (game.hero.alive && h.tickTimer <= 0 && Math.hypot(game.hero.x - h.x, game.hero.y - h.y) <= h.r) {
      hitPlayer(h.x, h.y);
      h.tickTimer = 0.6;
      if (Math.random() < 0.4) spawnHitParticles(game.hero.x, game.hero.y - 10, '#ff7a1a', 3);
    }
  }
}

export function skillDamageCow(c, bonusDamage, knockForce, color) {
  if (!c || c.state === 'dead') return;
  c.flash = 0.13;
  applyKnockback(c.body, game.hero.x, game.hero.y, knockForce);
  c.knockback = Math.max(c.knockback || 0, 0.22);
  const dmg = Math.max(1, bonusDamage + game.hero.attackBonus + game.hero.gearAtkPower);
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, color || '#fff');
  spawnHitParticles(c.x, c.y, color || PALETTE.hide, 8);
  c.hp -= dmg;
  registerComboHit();
  if (c.hp <= 0 && c.state !== 'dead') killCow(c);
}
