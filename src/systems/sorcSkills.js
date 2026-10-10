// 마법사 스킬: 마력탄(기본 공격), 화염구, 서리 노바, 방전, 연쇄 번개, 얼음 보주. 수치는 data/skills.js의 SPELLS
// 방향은 주인공이 바라보는 방향(PC는 시전 직전에 커서 쪽으로 돌아봄 - skills.aimAtCursor)
import { SPELLS, SPELL_LEVEL_SCALE, SKILL_STATS } from '../data/skills.js';
import { game } from '../state.js';
import { attackSpeedMul, castSpeedMul, skillMul, skillBonus, masteryBonus } from '../util.js';
import { canHit, cowEdgeDist, getCowBody } from './combat.js';
import { damageCowPacket } from './elementCombat.js';
import { rollLightning } from './elements.js';
import { spawnHitParticles, spawnIceRing, spawnLightningBolt, spawnShockwave, floatText } from './fx.js';
import { spawnProjectile } from './projectiles.js';
import { applyCC } from './cc.js';

// 주인공 레벨 + 스킬 레벨에 따라 오르는 주문 피해 (정수)
export function spellDamage(base, id) {
  return Math.round(base * (1 + SPELL_LEVEL_SCALE * (game.hero.level - 1)) * skillMul(game.hero, id, 'damage'));
}

// 스킬별 대기시간 (마법 + 투지·순간이동 같은 SKILL_STATS 스킬)
export function emptySpellCooldowns() {
  return Object.fromEntries([...Object.keys(SPELLS), ...Object.keys(SKILL_STATS)].map((k) => [k, 0]));
}

export function updateSpellCooldowns(dt) {
  const cd = game.hero.spellCd;
  if (game.hero.noManaWarn > 0) game.hero.noManaWarn -= dt;
  for (const k in cd) if (cd[k] > 0) cd[k] = Math.max(0, cd[k] - dt);
}

// 시전 가능하면 마나/대기시간을 쓰고 시전 자세를 잡음 (대기시간: 스킬 = 시전속도, 마력탄 = 공격속도)
export function begin(id, cooldown = SPELLS[id].cooldown * castSpeedMul(game.hero)) {
  const h = game.hero, s = SPELLS[id];
  if (!h.alive || h.spellCd[id] > 0) return false;
  if (h.mana < s.mana) {
    if (!(h.noManaWarn > 0)) { floatText(h.x, h.y - 40, '마나 부족', '#7fa8ff'); h.noManaWarn = 1; } // 길게 누를 때 도배되지 않게
    return false;
  }
  h.mana -= s.mana;
  h.spellCd[id] = cooldown;
  h.currentAttackDuration = 0.2;
  h.attackTimer = 0.2; // 손을 휘두르는 시전 자세 (기본 공격 동작 재사용)
  return true;
}

const facingDir = () => ({ x: Math.cos(game.hero.facing), y: Math.sin(game.hero.facing) });
const castPoint = (d) => ({ x: game.hero.x + d.x * game.hero.r, y: game.hero.y + d.y * game.hero.r - 6 });

// 마력탄: 마나 없이 쏘는 기본 공격 (공격속도 영향)
export function tryBolt() {
  const s = SPELLS.bolt;
  if (!begin('bolt', s.cooldown * attackSpeedMul(game.hero))) return;
  const d = facingDir(), o = castPoint(d);
  spawnProjectile({
    kind: 'bolt', team: 'hero', x: o.x, y: o.y, dirX: d.x, dirY: d.y, speed: s.speed, range: s.range, radius: s.radius,
    packet: { phys: spellDamage(s.damage, 'bolt') }, knock: 2, color: '#c9b8ff'
  });
}

export function tryFireballSpell() {
  const s = SPELLS.fireball;
  if (!begin('fireball')) return;
  const d = facingDir(), o = castPoint(d);
  spawnProjectile({
    kind: 'fireball', team: 'hero', x: o.x, y: o.y, dirX: d.x, dirY: d.y, speed: s.speed, range: s.range, radius: s.radius,
    packet: { fire: spellDamage(s.damage, 'fireball') }, explodeRadius: s.explode * skillMul(game.hero, 'fireball', 'radius'), knock: 4, color: '#ff7a1a'
  });
}

// 서리 노바: 내 주변 전체에 냉기 (둔화) - 몰렸을 때 빠져나가는 용도
export function tryFrostNova() {
  const s = SPELLS.frostnova, h = game.hero;
  if (!begin('frostnova')) return;
  const radius = s.radius * skillMul(h, 'frostnova', 'radius');
  spawnIceRing(h.x, h.y, radius); // 퍼지는 얼음 가시 고리
  spawnHitParticles(h.x, h.y, '#dff3ff', 10);
  spawnHitParticles(h.x, h.y, '#7fd4ff', 8);
  const dmg = spellDamage(s.damage, 'frostnova');
  game.cows.forEach((c) => {
    if (c.state === 'dead' || !canHit(h, c)) return;
    if (cowEdgeDist(c, h.x, h.y) <= radius) damageCowPacket(c, { cold: dmg }, { knock: 3, fromX: h.x, fromY: h.y });
  });
}

// 방전: 내 주변 전체에 번개 + 짧은 경직(돌진 예고·충전·시전을 끊음, 보스는 피해만) - 둘러싸였을 때 숨통 트기
//   연출: 하늘색 고리가 퍼지고 맞은 적마다 짧은 번개가 튐
export function tryDischarge() {
  const s = SPELLS.discharge, h = game.hero;
  if (!begin('discharge')) return;
  const radius = s.radius * skillMul(h, 'discharge', 'radius');
  spawnShockwave(h.x, h.y, radius, '#8fe8ff');
  spawnHitParticles(h.x, h.y, '#dff9ff', 10);
  game.shake = Math.min(game.shake + 3, 12);
  const dmg = spellDamage(s.damage, 'discharge');
  game.cows.forEach((c) => {
    if (c.state === 'dead' || !canHit(h, c) || cowEdgeDist(c, h.x, h.y) > radius) return;
    const at = getCowBody(c);
    spawnLightningBolt(h.x, h.y - 10, at.x, at.y);
    damageCowPacket(c, { lightning: rollLightning(dmg, masteryBonus(h, 'lightningMin')) }, { knock: 2, fromX: h.x, fromY: h.y });
    applyCC(c, 'stagger', s.stagger);
  });
}

// 연쇄 번개: 바라보는 방향(부채꼴)의 가장 가까운 적 → 근처의 아직 안 맞은 적으로 jumps번 튐 (튈 때마다 약해짐)
export function tryChain() {
  const s = SPELLS.chain, h = game.hero;
  const alive = game.cows.filter((c) => c.state !== 'dead' && canHit(h, c));
  let first = null, best = Infinity;
  alive.forEach((c) => {
    const dx = c.x - h.x, dy = c.y - h.y, d = Math.hypot(dx, dy);
    if (d > s.range) return;
    let diff = Math.abs(Math.atan2(dy, dx) - h.facing);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff <= s.cone && d < best) { best = d; first = c; }
  });
  if (!begin('chain')) return;
  const d = facingDir();
  if (!first) { // 허공 - 앞으로 번개만
    spawnLightningBolt(h.x, h.y, h.x + d.x * s.range * 0.6, h.y + d.y * s.range * 0.6);
    return;
  }
  const hit = new Set();
  let from = { x: h.x, y: h.y }, cur = first, dmg = spellDamage(s.damage, 'chain');
  const jumps = s.jumps + skillBonus(h, 'chain', 'jumps');
  for (let j = 0; j <= jumps && cur; j++) {
    const at = getCowBody(cur); // 번개는 몸통으로
    spawnLightningBolt(from.x, from.y, at.x, at.y);
    hit.add(cur);
    damageCowPacket(cur, { lightning: rollLightning(dmg, masteryBonus(h, 'lightningMin')) }, { knock: 2, fromX: from.x, fromY: from.y });
    dmg = Math.max(1, Math.round(dmg * s.falloff));
    from = at;
    let next = null, nd = Infinity;
    alive.forEach((c) => {
      if (hit.has(c) || c.state === 'dead') return;
      const dd = Math.hypot(getCowBody(c).x - at.x, getCowBody(c).y - at.y);
      if (dd <= s.jumpRange && dd < nd) { nd = dd; next = c; }
    });
    cur = next;
  }
}

// 얼음 보주: 천천히 날아가며 빙글빙글 얼음 조각을 뿌리고, 끝에서 사방으로 터짐 (조각 = 냉기 피해 + 둔화)
export function tryOrb() {
  const s = SPELLS.orb;
  if (!begin('orb')) return;
  const d = facingDir(), o = castPoint(d);
  const shardDmg = spellDamage(s.shardDamage, 'orb');
  const shard = (x, y, a) => spawnProjectile({
    kind: 'shard', team: 'hero', x, y, dirX: Math.cos(a), dirY: Math.sin(a), speed: s.shardSpeed, range: s.shardRange,
    radius: s.shardRadius, packet: { cold: shardDmg }, color: '#bfeaff'
  });
  spawnProjectile({
    kind: 'orb', team: 'hero', x: o.x, y: o.y, dirX: d.x, dirY: d.y, speed: s.speed, range: s.range, radius: s.radius,
    pierce: true, color: '#bfeaff', spin: game.hero.facing, shardT: 0,
    onTick(p, dt) {
      p.shardT -= dt;
      while (p.shardT <= 0) {
        p.shardT += s.shardEvery;
        p.spin += s.shardSpin;
        shard(p.x, p.y, p.spin);
      }
    },
    onEnd(p) {
      for (let i = 0; i < s.burst; i++) shard(p.x, p.y, (i / s.burst) * Math.PI * 2);
      spawnHitParticles(p.x, p.y, '#dff3ff', 12);
    }
  });
}
