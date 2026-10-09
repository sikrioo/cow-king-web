// 전투 규칙: 기본 공격 판정(사거리/각도/히트 반경), 데미지/처치, 피격, 콤보, 보스 슬램, 냉기 노바, 불바닥 피해
import {
  ATTACK_DURATION, ATTACK_COOLDOWN, ATTACK_RANGE, WEAPON_RANGE, ATTACK_ARC, ATTACK_ARC_SINGLE, COMBO_WINDOW,
  BASE_BLOCK, BASE_EVASION, BOSS_SLAM_RADIUS,
  BOSS_SLAM_DAMAGE, FIRE_HAZARD_DAMAGE, POISON_CLOUD_DAMAGE, POISON_CLOUD_TICK
} from '../data/balance.js';
import { MONSTERS } from '../data/monsters.js';
import { PALETTE } from '../data/palette.js';
import { World, world } from '../core/physics.js';
import { game, dev } from '../state.js';
import { applyKnockback } from '../entities/actor.js';
import { spawnHitParticles, spawnShockwave, spawnDamageNumber } from './fx.js';
import { dropLoot, dropSource } from './loot.js';
import { attackSpeedMul, skillMul, resistOf } from '../util.js';
import { COLD_NOVA_CHILL_DURATION } from '../data/elements.js';
import {
  toPacket, resolveHeroDamage, damageColor, applyHeroStatuses, applyChill, applyPoisonDirect, checkHeroDeath
} from './elements.js';
import { gainExp } from './progression.js';

// 피아 판정 - 지금 동작: 주인공은 몬스터만 침 (진영이 다르면 true)
export function canHit(attacker, target) {
  return attacker.team !== target.team;
}

export function getCowHitRadius(c) {
  if (c.kind === 'boss') return c.r * 0.95;
  return c.r * 0.58;
}

// 몬스터 몸통 = 그림의 동그란 몸 (render/monsterSprites.drawCow: 발(c.x, c.y)에서 위로 40*scale이 중심, 반지름 30*scale)
export function getCowBody(c) {
  return { x: c.x, y: c.y - 40 * c.scale, r: 30 * c.scale };
}

// 점(x, y)에서 몬스터 가장자리까지 거리 (몸통 원과 발밑 판정 원 중 가까운 쪽, 안쪽이면 0 이하)
// 투사체·폭발·클릭처럼 "그림에 닿았는지"가 중요한 판정에 씀
export function cowEdgeDist(c, x, y) {
  const b = getCowBody(c);
  return Math.min(Math.hypot(x - b.x, y - b.y) - b.r, Math.hypot(x - c.x, y - c.y) - getCowHitRadius(c));
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

// onHit(c): 맞은 몬스터마다 추가 효과 (무기 원소 피해 - 순환 import를 피하려고 skills.js가 넘김)
export function tryPlayerAttack(onHit) {
  if (!game.hero.alive || game.hero.attackCooldown > 0 || game.hero.whirlwindTimer > 0 || game.hero.leapTimer > 0 || game.hero.rushTimer > 0 || game.hero.smashTimer > 0) return;
  const ws = nextSwingWeapon();
  const spdMul = attackSpeedMul(game.hero);
  game.hero.currentAttackDuration = ATTACK_DURATION * (ws.interval / ATTACK_COOLDOWN) * spdMul; // 느린 무기는 스윙도 느림
  game.hero.attackTimer = game.hero.currentAttackDuration;
  game.hero.attackCooldown = ws.interval * spdMul;
  game.hero.attackCooldownMax = game.hero.attackCooldown;
  const dmg = Math.round(heroHitDamage(ws) * skillMul(game.hero, 'attack', 'damage')); // 한 번 휘두를 때 한 번 굴림 (맞은 몬스터 모두 같은 피해)

  let landed = false;
  const atkRange = getWeaponRange();
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (!canHit(game.hero, c)) return;
    // 특정 지점(오프셋) 대신 몸 중심 + 몸집 반경으로 판정 - 접근 방향과 무관하게 몸 전체가 피격 범위가 됨
    const dx = c.x - game.hero.x, dy = c.y - game.hero.y;
    const dist = Math.hypot(dx, dy);
    if (dist > atkRange + getCowHitRadius(c)) return;
    let diff = Math.abs(Math.atan2(dy, dx) - game.hero.facing);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < getAttackArc() / 2) { damageCow(c, dmg); if (onHit) onHit(c); landed = true; }
  });
  if (landed) registerComboHit();
}

export function killCow(c) {
  c.deadPos = { x: c.x, y: c.y };
  c.state = 'dead';
  c.deadTimer = 0.3;
  World.remove(world, c.body);
  game.kills++;
  const exp = (MONSTERS[c.kind] || MONSTERS.normal).exp;
  gainExp(game.run.expMul === 1 ? exp : Math.round(exp * game.run.expMul)); // 파밍 맵 난이도 배율
  spawnHitParticles(c.x, c.y, PALETTE.horn, c.kind === 'boss' ? 22 : 10);
  // 종류별 처치 효과 (냉기 노바/자폭/보스 승리) - behaviors[kind].onDeath. true면 자체 드랍을 했으므로 기본 드랍 생략
  const b = c.behavior;
  if (b && b.onDeath && b.onDeath(c)) return;
  dropLoot(c.x, c.y, dropSource(c), c.dropCount || 1, c.level); // 출처별 드랍 테이블(data/drops.js), 파밍 맵 우두머리는 여러 번
}

export function spawnColdNova(x, y) {
  spawnShockwave(x, y, 90, '#9fd8ff');
  if (game.hero.alive && Math.hypot(game.hero.x - x, game.hero.y - y) <= 90) {
    applyChill(COLD_NOVA_CHILL_DURATION);
  }
}

export function bossSlam(c) {
  spawnShockwave(c.x, c.y, BOSS_SLAM_RADIUS, '#b57bd6');
  game.shake = Math.min(game.shake + 6, 12);
  if (game.hero.alive && Math.hypot(game.hero.x - c.x, game.hero.y - c.y) <= BOSS_SLAM_RADIUS) {
    hitPlayer(c.x, c.y, BOSS_SLAM_DAMAGE);
  }
}

// 이번 기본 공격에 쓸 무기: 쌍수면 주무기/보조무기를 번갈아
function nextSwingWeapon() {
  const ws = game.hero.weaponStats;
  if (!ws.off) return ws.main;
  const w = game.hero.offHandNext ? ws.off : ws.main;
  game.hero.offHandNext = !game.hero.offHandNext;
  return w;
}

// 무기 피해 굴림 (min~max 정수)
export function rollWeaponDamage(ws = game.hero.weaponStats.main) {
  return ws.min + Math.floor(Math.random() * (ws.max - ws.min + 1));
}

// 주인공 한 타 피해 = 무기 굴림 + 공격력(장비/레벨) + 공격물약
export function heroHitDamage(ws = game.hero.weaponStats.main) {
  return rollWeaponDamage(ws) + game.hero.attackBonus + game.hero.gearAtkPower;
}

// 몬스터 저항 (phys/fire/cold/lightning/poison, 0~1 - 1이면 면역). 규칙은 util.resistOf
export function cowResist(c, key) {
  return resistOf(c, key);
}

// 주인공의 물리 피해 → 물리 저항 적용 (면역이면 0, 저항이 없으면 그대로)
export function physDamageTo(c, dmg) {
  const r = cowResist(c, 'phys');
  if (r <= 0) return dmg;
  if (r >= 1) return 0;
  return Math.max(1, Math.round(dmg * (1 - r)));
}

// 몬스터 위 피해 숫자 (0이면 회색 '면역')
export function showCowDamage(c, dmg, color = '#fff') {
  spawnDamageNumber(c.x, c.y - 40 * c.scale, dmg > 0 ? `-${dmg}` : '면역', dmg > 0 ? color : '#9a9a9a');
}

export function damageCow(c, dmg) {
  dmg = physDamageTo(c, dmg);
  c.flash = 0.12;
  applyKnockback(c.body, game.hero.x, game.hero.y, 7);
  c.knockback = 0.18;
  game.shake = Math.min(game.shake + 4, 10);
  game.hitstop = 4;
  spawnHitParticles(c.x, c.y, PALETTE.hide, 7);

  showCowDamage(c, dmg);
  c.hp -= dmg;
  if (c.hp <= 0 && c.state !== 'dead') {
    killCow(c);
    game.shake = Math.min(game.shake + 6, 12);
  }
}

// dmg: 숫자(물리) 또는 피해 묶음 { phys, fire, cold, lightning, poison } - 회피/블락은 공격 전체에 적용
export function hitPlayer(fromX, fromY, dmg) {
  if (!game.hero.alive || game.hero.invuln > 0 || dev.god) return;

  const totalEvasion = Math.min(BASE_EVASION + game.hero.gearEvasion, 0.75);
  if (Math.random() < totalEvasion) {
    spawnDamageNumber(game.hero.x, game.hero.y - 34, 'MISS', '#8fe8ff');
    game.hero.invuln = 0.25;
    return;
  }

  const totalBlock = Math.min(BASE_BLOCK + game.hero.defenseChance + game.hero.gearDefense, 0.85);
  const blocked = Math.random() < totalBlock;
  if (!blocked) {
    const r = resolveHeroDamage(toPacket(dmg)); // 물리 = 방어력, 원소 = 저항
    game.hero.hp -= r.total;
    spawnDamageNumber(game.hero.x, game.hero.y - 34, `-${r.total}`, damageColor(r.dominant));
    applyHeroStatuses(r.parts);
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

  checkHeroDeath();
}

export function updateHazards(dt) {
  for (let i = game.hazards.length - 1; i >= 0; i--) {
    const h = game.hazards[i];
    h.life -= dt;
    h.tickTimer -= dt;
    if (h.life <= 0) { game.hazards.splice(i, 1); continue; }
    if (game.hero.alive && h.tickTimer <= 0 && Math.hypot(game.hero.x - h.x, game.hero.y - h.y) <= h.r) {
      if (h.element === 'poison') {
        applyPoisonDirect(POISON_CLOUD_DAMAGE); // 독 구름: 막기/회피 없이 중독 갱신
        h.tickTimer = POISON_CLOUD_TICK;
      } else {
        hitPlayer(h.x, h.y, { fire: FIRE_HAZARD_DAMAGE });
        h.tickTimer = 0.6;
        if (Math.random() < 0.4) spawnHitParticles(game.hero.x, game.hero.y - 10, '#ff7a1a', 3);
      }
    }
  }
}

export function skillDamageCow(c, bonusDamage, knockForce, color) {
  if (!c || c.state === 'dead') return;
  c.flash = 0.13;
  applyKnockback(c.body, game.hero.x, game.hero.y, knockForce);
  c.knockback = Math.max(c.knockback || 0, 0.22);
  const dmg = physDamageTo(c, Math.max(1, bonusDamage + game.hero.attackBonus + game.hero.gearAtkPower));
  showCowDamage(c, dmg, color || '#fff');
  spawnHitParticles(c.x, c.y, color || PALETTE.hide, 8);
  if (dmg <= 0) return; // 물리 면역
  c.hp -= dmg;
  registerComboHit();
  if (c.hp <= 0 && c.state !== 'dead') killCow(c);
}
