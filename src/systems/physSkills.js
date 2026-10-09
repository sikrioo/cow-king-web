// 물리 계열 보조 스킬 (전사): 투지(잠깐 최대 체력 증가), 난타(제자리 연속 베기), 뇌진탕(앞을 내리쳐 오래 기절), 버서커(공격 강화·받는 피해 증가), 더미(미끼)
// 수치는 data/skills.js의 SKILL_STATS, 레벨 보너스는 SKILL_LEVEL_UP. 버서커 효과의 적용: 주는 피해 combat.heroHitDamage/skillDamageCow,
//   공격속도 util.attackSpeedMul, 받는 피해 elements.heroDamageTaken. 미끼를 노리는 몬스터: entities/monster.js (decoyFor/hitDecoy)
// 투지로 늘어난 체력은 hero.bonusMaxHp에 더했다가 끝나면 그만큼 뺌 (실제 최대 체력 = maxHp + bonusMaxHp + gearMaxHp)
import { SKILL_STATS } from '../data/skills.js';
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { castSpeedMul, skillBonus, skillMul } from '../util.js';
import { floatText, spawnHitParticles, spawnShockwave, spawnDamageNumber } from './fx.js';
import {
  canHit, getCowHitRadius, getWeaponRange, getAttackArc, heroHitDamage, rollWeaponDamage, skillDamageCow, physDamageTo, showCowDamage,
  killCow, registerComboHit
} from './combat.js';
import { weaponElementHit } from './elementCombat.js';
import { clampToPen } from '../world/arena.js';
import { applyKnockback } from '../entities/actor.js';

const effectiveMaxHp = (h) => h.maxHp + h.bonusMaxHp + h.gearMaxHp;
// 휠윈드/리프/러시/강타/난타 같은 동작 중엔 다른 동작 스킬을 못 씀
export const heroBusy = (h) => h.whirlwindTimer > 0 || h.leapTimer > 0 || h.rushTimer > 0 || h.smashTimer > 0 || h.flurryTimer > 0;

export function noManaWarn(h) {
  if (!(h.noManaWarn > 0)) { floatText(h.x, h.y - 40, '마나 부족', '#7fa8ff'); h.noManaWarn = 1; }
}

// 마나·대기시간 확인 후 소모 (시전속도 영향)
function pay(id) {
  const h = game.hero, s = SKILL_STATS[id];
  if (!h.alive || h.spellCd[id] > 0) return false;
  if (h.mana < s.mana) { noManaWarn(h); return false; }
  h.mana -= s.mana;
  h.spellCd[id] = s.cooldown * castSpeedMul(h);
  return true;
}

// 바라보는 앞쪽 부채꼴(반경 reach + 몸집, 각도 arc) 안의 적
function cowsInFront(reach, arc) {
  const h = game.hero;
  return game.cows.filter((c) => {
    if (c.state === 'dead' || !canHit(h, c)) return false;
    const dx = c.x - h.x, dy = c.y - h.y;
    if (Math.hypot(dx, dy) > reach + getCowHitRadius(c)) return false;
    let diff = Math.abs(Math.atan2(dy, dx) - h.facing);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    return diff < arc / 2;
  });
}

export function tryFortify() {
  const h = game.hero, s = SKILL_STATS.fortify;
  if (!pay('fortify')) return;
  // 이미 걸려 있으면 이전 몫을 빼고 새로 (겹쳐 쌓이지 않음)
  if (h.fortifyTimer > 0) h.bonusMaxHp = Math.max(0, h.bonusMaxHp - h.fortifyHp);
  const add = Math.max(1, Math.round((h.maxHp + h.gearMaxHp) * (s.life + skillBonus(h, 'fortify', 'life'))));
  h.fortifyHp = add;
  h.bonusMaxHp += add;
  h.hp = Math.min(effectiveMaxHp(h), h.hp + add);
  h.fortifyTimer = s.duration * skillMul(h, 'fortify', 'duration');
  h.fortifyMax = h.fortifyTimer;
  spawnShockwave(h.x, h.y, 70, '#ff6b6b');
  spawnHitParticles(h.x, h.y, '#ff8a80', 12);
  floatText(h.x, h.y - 50, `투지! 최대 체력 +${add}`, '#ff8a80');
  game.shake = Math.min(game.shake + 3, 12);
}

// 난타: 제자리에서 hits번 빠르게 앞을 벰 (하는 동안 이동 잠김 - hero.updatePlayer)
export function tryFlurry() {
  const h = game.hero, s = SKILL_STATS.flurry;
  if (heroBusy(h) || !pay('flurry')) return;
  h.flurryTimer = s.hits * s.interval;
  h.flurryHits = s.hits;
  h.flurryNext = 0;
  Body.setVelocity(h.body, { x: 0, y: 0 });
}

export function updateFlurry(dt) {
  const h = game.hero, s = SKILL_STATS.flurry;
  h.flurryTimer -= dt;
  h.flurryNext -= dt;
  Body.setVelocity(h.body, { x: 0, y: 0 });
  if (h.flurryNext <= 0 && h.flurryHits > 0) {
    h.flurryHits--;
    h.flurryNext += s.interval;
    h.currentAttackDuration = s.interval * 0.95;
    h.attackTimer = h.currentAttackDuration; // 휘두르는 동작 (기본 공격 그림 재사용)
    const ratio = s.ratio * skillMul(h, 'flurry', 'damage');
    cowsInFront(getWeaponRange(), getAttackArc()).forEach((c) => {
      const dmg = physDamageTo(c, Math.max(1, Math.round(heroHitDamage() * ratio)));
      c.flash = 0.08;
      applyKnockback(c.body, h.x, h.y, 2);
      showCowDamage(c, dmg);
      if (dmg > 0) {
        c.hp -= dmg;
        registerComboHit();
        if (c.hp <= 0 && c.state !== 'dead') killCow(c);
      }
      weaponElementHit(c);
    });
    if (h.flurryHits === 0) game.shake = Math.min(game.shake + 3, 12);
  }
  if (h.flurryTimer <= 0) { h.flurryTimer = 0; h.flurryHits = 0; }
}

// 뇌진탕: 앞쪽 적을 세게 내리쳐 피해 + 긴 기절
export function tryConcuss() {
  const h = game.hero, s = SKILL_STATS.concuss;
  if (heroBusy(h) || !pay('concuss')) return;
  h.currentAttackDuration = 0.3;
  h.attackTimer = 0.3;
  const stun = s.stun * skillMul(h, 'concuss', 'stun');
  const reach = getWeaponRange() + s.reach;
  const fx = h.x + Math.cos(h.facing) * reach * 0.6, fy = h.y + Math.sin(h.facing) * reach * 0.6;
  spawnShockwave(fx, fy, 40, '#ffe08a');
  game.shake = Math.min(game.shake + 5, 12);
  game.hitstop = Math.max(game.hitstop, 3);
  cowsInFront(reach, s.arc).forEach((c) => {
    skillDamageCow(c, Math.round((rollWeaponDamage() + s.bonus) * skillMul(h, 'concuss', 'damage')), 6, '#ffe08a');
    if (c.state !== 'dead') c.stunTimer = Math.max(c.stunTimer || 0, stun);
    weaponElementHit(c);
  });
}

// 버서커: duration초 동안 공격력·공격속도 증가, 받는 피해 증가
export function tryBerserk() {
  const h = game.hero, s = SKILL_STATS.berserk;
  if (!pay('berserk')) return;
  h.berserkTimer = s.duration * skillMul(h, 'berserk', 'duration');
  h.berserkMax = h.berserkTimer;
  h.berserkPower = s.power + skillBonus(h, 'berserk', 'power');
  spawnShockwave(h.x, h.y, 60, '#ff3b3b');
  spawnHitParticles(h.x, h.y, '#ff4d4d', 14);
  floatText(h.x, h.y - 50, '버서커!', '#ff5b52');
  game.shake = Math.min(game.shake + 4, 12);
}
// 더미: 바라보는 쪽에 나와 같은 모습의 미끼 - taunt 거리 안의 몬스터는 미끼를 쫓아가 공격
export function tryDecoy() {
  const h = game.hero, s = SKILL_STATS.decoy;
  if (!pay('decoy')) return;
  const p = clampToPen(h.x + Math.cos(h.facing) * s.distance, h.y + Math.sin(h.facing) * s.distance, h.r + 10);
  const hp = Math.max(1, Math.round(effectiveMaxHp(h) * (s.life + skillBonus(h, 'decoy', 'life'))));
  const time = s.duration * skillMul(h, 'decoy', 'duration');
  game.decoy = { x: p.x, y: p.y, facing: h.facing, hp, maxHp: hp, timer: time, maxTimer: time, flash: 0 };
  spawnHitParticles(p.x, p.y, '#d8d8e0', 14);
  spawnShockwave(p.x, p.y, 40, '#c9c9d6');
}

// 몬스터가 노릴 미끼 (없거나 멀면 null)
export function decoyFor(c) {
  const d = game.decoy;
  return d && Math.hypot(d.x - c.x, d.y - c.y) <= SKILL_STATS.decoy.taunt ? d : null;
}

// 몬스터 근접 공격이 미끼에 맞음 (dmg: 숫자 또는 피해 묶음)
export function hitDecoy(dmg) {
  const d = game.decoy;
  if (!d) return;
  const total = typeof dmg === 'number' ? dmg : Object.values(dmg).reduce((s, v) => s + (v || 0), 0);
  d.hp -= total;
  d.flash = 0.12;
  spawnDamageNumber(d.x, d.y - 34, `-${total}`, '#c9c9d6');
}

// 매 틱: 투지 끝(최대 체력 되돌림), 버서커·에너지 쉴드 시간, 미끼 시간/체력
export function updateSkillBuffs(dt) {
  const h = game.hero;
  if (h.fortifyTimer > 0) {
    h.fortifyTimer -= dt;
    if (h.fortifyTimer <= 0) {
      h.fortifyTimer = 0;
      h.bonusMaxHp = Math.max(0, h.bonusMaxHp - h.fortifyHp);
      h.fortifyHp = 0;
      h.hp = Math.min(h.hp, effectiveMaxHp(h));
    }
  }
  if (h.berserkTimer > 0) h.berserkTimer = Math.max(0, h.berserkTimer - dt);
  if (h.shieldTimer > 0) h.shieldTimer = Math.max(0, h.shieldTimer - dt);
  const d = game.decoy;
  if (d) {
    d.timer -= dt;
    if (d.flash > 0) d.flash -= dt;
    if (d.timer <= 0 || d.hp <= 0) {
      spawnHitParticles(d.x, d.y, '#d8d8e0', 16);
      spawnShockwave(d.x, d.y, 36, '#c9c9d6');
      game.decoy = null;
    }
  }
}
