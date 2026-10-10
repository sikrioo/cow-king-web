// 마법사의 지점·자기 강화 마법: 에너지 쉴드(피해 일부를 마나로 - 적용은 elements.heroDamageTaken), 눈보라, 화염기둥
// 지점 = 자동 조준이 정한 hero.aimX/aimY (systems/aim.js), 사거리(range)보다 멀면 시전 안 함('사거리 밖'). 수치는 data/skills.js SPELLS
// 화염 파도: 바라보는 쪽으로 퍼지는 부채꼴 불의 벽 (game.groundSpells kind 'firewave')
// 메테오: 지점에 잠시 뒤 불덩이 (낙하·그림은 몬스터 메테오와 같은 game.meteors - 착탄 처리만 meteorImpact) → 불타는 바닥 kind 'firefield'
// 볼 라이트닝: 지점에 전기 구체 설치 → 주변 적에게 번개, 사라지며 폭발 (kind 'balllightning', 다시 누르면 바로 폭발)
// 진행 중인 지점 마법은 game.groundSpells, 그림은 render/skillFx.js
import { SPELLS } from '../data/skills.js';
import { game } from '../state.js';
import { skillMul, skillBonus, skillLevel, easeOutCubic, masteryBonus } from '../util.js';
import { SPELL_LEVEL_SCALE } from '../data/skills.js';
import { applyCC } from './cc.js';
import { canHit, cowEdgeDist, getCowHitRadius, getCowBody } from './combat.js';
import { rollLightning } from './elements.js';
import { damageCowPacket } from './elementCombat.js';
import { spawnHitParticles, spawnShockwave, spawnLightningBolt, floatText } from './fx.js';
import { spawnProjectile } from './projectiles.js';
import { begin, spellDamage } from './sorcSkills.js';
import { clampToPen } from '../world/arena.js';

export function tryEnergyShield() {
  const h = game.hero, s = SPELLS.energyshield;
  if (!begin('energyshield')) return;
  h.shieldTimer = s.duration * skillMul(h, 'energyshield', 'duration');
  h.shieldMax = h.shieldTimer;
  h.shieldHpMax = Math.round(s.amount * (1 + SPELL_LEVEL_SCALE * (h.level - 1)) * skillMul(h, 'energyshield', 'amount')); // 흡수량 (elements.heroDamageTaken이 깎음)
  h.shieldHp = h.shieldHpMax;
  spawnShockwave(h.x, h.y, 46, '#7fa8ff');
  spawnHitParticles(h.x, h.y, '#9fc0ff', 12);
}

export function tryMeteor() {
  const s = SPELLS.meteor, h = game.hero;
  const p = targetPoint(s.range);
  if (!p || !begin('meteor')) return;
  game.meteors.push({ x: p.x, y: p.y, t: 0, delay: s.delay, fall: s.fall, r: s.radius * skillMul(h, 'meteor', 'radius'), dmg: spellDamage(s.damage, 'meteor'), onImpact: meteorImpact });
}
function meteorImpact(m) {
  const s = SPELLS.meteor, h = game.hero;
  game.cows.forEach((c) => {
    if (c.state === 'dead' || !canHit(h, c) || cowEdgeDist(c, m.x, m.y) > m.r) return;
    damageCowPacket(c, { fire: m.dmg }, { knock: 7, fromX: m.x, fromY: m.y });
  });
  game.hitstop = Math.max(game.hitstop, 3);
  game.groundSpells.push({ kind: 'firefield', x: m.x, y: m.y, age: 0, duration: s.fieldTime, tickT: s.fieldTick, radius: s.fieldRadius, dmg: Math.max(1, Math.round(s.fieldDamage * m.dmg / s.damage)) });
}

// 화염 토템: 지점에 토템(하나만) - 가까운 적에게 불덩이를 계속 쏨 (kind 'firetotem')
export function tryFireTotem() {
  const s = SPELLS.firetotem, h = game.hero;
  const p = targetPoint(s.range);
  if (!p || !begin('firetotem')) return;
  game.groundSpells = game.groundSpells.filter((g) => g.kind !== 'firetotem');
  game.groundSpells.push({ kind: 'firetotem', x: p.x, y: p.y, age: 0, fireT: 0.3, duration: s.duration * skillMul(h, 'firetotem', 'duration'), dmg: spellDamage(s.damage, 'firetotem') });
  spawnHitParticles(p.x, p.y, '#ffb347', 10);
}
function updateFireTotem(g, dt) {
  const s = SPELLS.firetotem, h = game.hero;
  g.fireT -= dt;
  if (g.fireT > 0) return;
  const c = game.cows.filter((k) => k.state !== 'dead' && canHit(h, k) && Math.hypot(k.x - g.x, k.y - g.y) <= s.seek)
    .sort((a, b) => Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y))[0];
  if (!c) { g.fireT = 0.15; return; } // 적이 없으면 자주 살핌
  g.fireT = s.fireEvery;
  const ox = g.x, oy = g.y - 42, at = getCowBody(c);
  const dx = at.x - ox, dy = at.y - oy, d = Math.hypot(dx, dy) || 1;
  spawnProjectile({ kind: 'fireball', team: 'hero', x: ox, y: oy, dirX: dx / d, dirY: dy / d, speed: s.speed, range: s.seek + 60, radius: s.radius, packet: { fire: g.dmg }, knock: 2, color: '#ff7a1a' });
}

// 냉기 장판: 내 발밑에 네모 (kind 'frostfield') - 안의 적에게 냉기 지속 피해(둔화)
export function tryFrostField() {
  const s = SPELLS.frostfield, h = game.hero;
  if (!begin('frostfield')) return;
  game.groundSpells.push({ kind: 'frostfield', x: h.x, y: h.y, age: 0, tickT: 0, w: s.width, h: s.height, duration: s.duration * skillMul(h, 'frostfield', 'duration'), dmg: spellDamage(s.damage, 'frostfield') });
  spawnHitParticles(h.x, h.y, '#dff3ff', 12);
}
function updateFrostField(g, dt) {
  const s = SPELLS.frostfield, h = game.hero;
  g.tickT -= dt;
  if (g.tickT > 0) return;
  g.tickT += s.tick;
  game.cows.forEach((c) => {
    if (c.state === 'dead' || !canHit(h, c)) return;
    const cr = getCowHitRadius(c);
    if (Math.abs(c.x - g.x) <= g.w / 2 + cr && Math.abs(c.y - g.y) <= g.h / 2 + cr * 0.6) damageCowPacket(c, { cold: g.dmg });
  });
}

// 전기충격: 적 하나에게 잠시 뒤 하늘에서 번개 (kind 'thunder', 대상을 따라감)
export function tryThunderStrike() {
  const s = SPELLS.thunderstrike, h = game.hero;
  const ax = h.aimX != null ? h.aimX : h.x + Math.cos(h.facing) * s.range * 0.5, ay = h.aimY != null ? h.aimY : h.y + Math.sin(h.facing) * s.range * 0.5;
  const target = game.cows.filter((c) => c.state !== 'dead' && canHit(h, c) && Math.hypot(c.x - h.x, c.y - h.y) <= s.range)
    .sort((a, b) => Math.hypot(a.x - ax, a.y - ay) - Math.hypot(b.x - ax, b.y - ay))[0];
  if (!target) { if (!(h.noManaWarn > 0)) { floatText(h.x, h.y - 40, '대상 없음', '#ffd36a'); h.noManaWarn = 1; } return; }
  if (!begin('thunderstrike')) return;
  game.groundSpells.push({ kind: 'thunder', target, x: target.x, y: target.y, age: 0, duration: s.delay + 0.3, struck: false, dmg: spellDamage(s.damage, 'thunderstrike') });
}
function updateThunder(g) {
  const s = SPELLS.thunderstrike, h = game.hero;
  if (g.target && g.target.state !== 'dead' && !g.struck) { g.x = g.target.x; g.y = g.target.y; }
  if (g.struck || g.age < s.delay) return;
  g.struck = true;
  const top = getCowBody(g.target);
  spawnLightningBolt(g.x + 30, g.y - 420, top.x, top.y);
  spawnLightningBolt(g.x - 20, g.y - 380, top.x, top.y);
  spawnShockwave(g.x, g.y, s.splash + 10, '#fff9b0');
  spawnHitParticles(g.x, g.y - 30, '#fff066', 12);
  game.impactFlash = Math.max(game.impactFlash, 0.1);
  game.shake = Math.min(game.shake + 4, 12);
  const lmin = masteryBonus(h, 'lightningMin');
  if (g.target.state !== 'dead') damageCowPacket(g.target, { lightning: rollLightning(g.dmg, lmin) }, { knock: 2, fromX: g.x, fromY: g.y - 1 });
  game.cows.forEach((c) => {
    if (c === g.target || c.state === 'dead' || !canHit(h, c) || cowEdgeDist(c, g.x, g.y) > s.splash) return;
    damageCowPacket(c, { lightning: rollLightning(Math.round(g.dmg * s.splashRatio), lmin) });
  });
}

// 방전: 전기 구체가 내 주위를 돎 (game.groundSpells kind 'discharge', 주인공을 따라감). 다시 쓰면 새로 (하나만)
export function tryDischarge() {
  const s = SPELLS.discharge, h = game.hero;
  if (!begin('discharge')) return;
  game.groundSpells = game.groundSpells.filter((g) => g.kind !== 'discharge');
  game.groundSpells.push({
    kind: 'discharge', x: h.x, y: h.y, age: 0, tickT: 0, hitOnce: new Set(),
    duration: s.duration * skillMul(h, 'discharge', 'duration'), radius: s.radius * skillMul(h, 'discharge', 'radius'), dmg: spellDamage(s.damage, 'discharge')
  });
  spawnShockwave(h.x, h.y, 50, '#8fe8ff');
}

// 구체 자리 (그림도 같은 식): 주인공 둘레를 spin 속도로 돎, 몸통 높이
export function dischargeOrbs(g) {
  const s = SPELLS.discharge;
  return Array.from({ length: s.orbs }, (_, i) => {
    const a = g.age * s.spin + (i / s.orbs) * Math.PI * 2;
    return { x: g.x + Math.cos(a) * s.orbit, y: g.y - 20 + Math.sin(a) * s.orbit * 0.62 };
  });
}

// 방전 한 틱: tick초마다 구체마다 반경 안 가까운 적 하나(구체끼리 겹치지 않게)에게 번개, 이번 시전에서 처음 맞은 적은 경직
function updateDischarge(g, dt) {
  const s = SPELLS.discharge, h = game.hero;
  if (!h.alive) { g.age = g.duration; return; }
  g.x = h.x; g.y = h.y;
  g.tickT -= dt;
  if (g.tickT > 0) return;
  g.tickT += s.tick;
  const taken = new Set();
  dischargeOrbs(g).forEach((o) => {
    const c = game.cows
      .filter((k) => k.state !== 'dead' && !taken.has(k) && canHit(h, k) && cowEdgeDist(k, h.x, h.y) <= g.radius)
      .sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y))[0];
    if (!c) return;
    taken.add(c);
    const at = getCowBody(c);
    spawnLightningBolt(o.x, o.y, at.x, at.y);
    damageCowPacket(c, { lightning: rollLightning(g.dmg, masteryBonus(h, 'lightningMin')) }, { knock: 1, fromX: h.x, fromY: h.y });
    if (!g.hitOnce.has(c)) { g.hitOnce.add(c); applyCC(c, 'stagger', s.stagger); }
  });
}

// 조준 지점 (목장 안). 사거리보다 멀면 null + '사거리 밖' (마나·대기시간 안 씀)
function targetPoint(range) {
  const h = game.hero;
  const x = h.aimX != null ? h.aimX : h.x + Math.cos(h.facing) * range * 0.6;
  const y = h.aimY != null ? h.aimY : h.y + Math.sin(h.facing) * range * 0.6;
  if (Math.hypot(x - h.x, y - h.y) > range) {
    if (!(h.noManaWarn > 0)) { floatText(h.x, h.y - 40, '사거리 밖', '#ffd36a'); h.noManaWarn = 1; } // 길게 누를 때 도배 안 되게
    return null;
  }
  return clampToPen(x, y, 20);
}

// 눈보라: delay초 동안 지역이 생기고(피해 없음), 그다음 duration초 동안 tick초마다 반경 안 모든 적에게 냉기 피해(→ 둔화)
export function tryBlizzard() {
  const s = SPELLS.blizzard, h = game.hero;
  const p = targetPoint(s.range);
  if (!p || !begin('blizzard')) return;
  game.groundSpells.push({
    kind: 'blizzard', x: p.x, y: p.y, age: 0, delay: s.delay, duration: s.delay + s.duration, tickT: 0, seed: game.groundSpells.length + Math.round(p.x),
    radius: s.radius * skillMul(h, 'blizzard', 'radius'), dmg: spellDamage(s.damage, 'blizzard')
  });
}

// 화염기둥: 예고 원이 뜨고 delay초 뒤부터 반경 안 곳곳에서 불기둥 count개가 interval초 간격으로 솟음 (기둥마다 화염 피해 → 화상)
//   기둥 자리는 시전 때 정함(게임 난수) - 가운데 하나 + 나머지는 반경 안 고르게 흩어짐
export function tryFlamePillar() {
  const s = SPELLS.flamepillar, h = game.hero;
  const p = targetPoint(s.range);
  if (!p || !begin('flamepillar')) return;
  const radius = s.radius * skillMul(h, 'flamepillar', 'radius');
  const pillars = [];
  for (let i = 0; i < s.count; i++) {
    const a = (i / s.count) * Math.PI * 2 + Math.random() * 0.8, r = i === 0 ? 0 : radius * (0.45 + Math.random() * 0.55);
    pillars.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.62, t: s.delay + i * s.interval, fired: false });
  }
  game.groundSpells.push({
    kind: 'flamepillar', x: p.x, y: p.y, age: 0, duration: s.delay + s.count * s.interval + 0.5, delay: s.delay,
    radius, pillars, dmg: spellDamage(s.damage, 'flamepillar')
  });
}

// 화염 파도: 주인공 자리에서 바라보는 쪽으로 곧은 불의 벽이 나아감 (이동 중에도 시전 때의 자리·방향 기준)
export function tryFireWave() {
  const s = SPELLS.firewave, h = game.hero;
  if (!begin('firewave')) return;
  game.groundSpells.push({
    kind: 'firewave', x: h.x, y: h.y, dir: h.facing, age: 0, front: 0, hit: new Set(), emberT: 0,
    range: s.range * skillMul(h, 'firewave', 'range'), duration: s.travel + s.linger,
    dmg: spellDamage(s.damage, 'firewave')
  });
  // 시전 순간: 앞에서 터지는 충격파 + 흔들림 + 짧은 번쩍임 (무게감)
  const ox = h.x + Math.cos(h.facing) * 24, oy = h.y + Math.sin(h.facing) * 24;
  spawnShockwave(ox, oy, 46, '#ff7a1a');
  spawnHitParticles(ox, oy, '#ffb347', 14);
  game.shake = Math.min(game.shake + 5, 12);
  game.impactFlash = Math.max(game.impactFlash, 0.08);
}

// 화염 파도 한 틱: 곧은 불의 벽(앞쪽 거리 front, 두께 thick, 폭 width - 시전 방향에 수직) 안에 들어온 적은 한 번씩 화염 피해
//   앞으로 나아가는 거리는 easeOut (처음에 확, 끝에서 느려지며 멈춤). 맞힌 틱엔 히트스톱·흔들림, 나아가는 동안 불씨가 튐
function updateFireWave(g, dt) {
  const s = SPELLS.firewave;
  if (g.age > s.travel) return; // 멈춘 뒤엔 그을린 자국만 (그림)
  g.front = g.range * easeOutCubic(Math.min(1, g.age / s.travel));
  const fx = Math.cos(g.dir), fy = Math.sin(g.dir);
  g.emberT -= dt;
  if (g.emberT <= 0) { // 불씨
    g.emberT += 0.05;
    const off = (Math.random() - 0.5) * s.width;
    spawnHitParticles(g.x + fx * g.front - fy * off, g.y + fy * g.front + fx * off, '#ffb347', 1);
  }
  let landed = false;
  game.cows.forEach((c) => {
    if (c.state === 'dead' || g.hit.has(c) || !canHit(game.hero, c)) return;
    const dx = c.x - g.x, dy = c.y - g.y, cr = getCowHitRadius(c);
    const along = dx * fx + dy * fy, across = Math.abs(-dx * fy + dy * fx); // 앞쪽 거리, 옆으로 벗어난 거리
    if (along > g.front + cr || along < g.front - s.thick - cr || across > s.width / 2 + cr) return;
    g.hit.add(c);
    damageCowPacket(c, { fire: g.dmg }, { knock: s.knock, fromX: c.x - fx * 30, fromY: c.y - fy * 30 }); // 벽이 나아가는 쪽으로 밀어냄
    landed = true;
  });
  if (landed) {
    game.hitstop = Math.max(game.hitstop, 2);
    game.shake = Math.min(game.shake + 3, 12);
  }
}

// 볼 라이트닝: 구체가 이미 최대 개수(스킬 레벨 twoAt부터 2개)이거나 대기시간 중이면 → 가장 오래된 구체를 바로 터뜨림
//   repeat(길게 눌러 반복 시전)일 땐 터뜨리지 않음 - 설치하자마자 터지지 않게
export function tryBallLightning(opts = {}) {
  const s = SPELLS.balllightning, h = game.hero;
  const mine = game.groundSpells.filter((g) => g.kind === 'balllightning' && !g.done);
  const max = skillLevel(h, 'balllightning') >= s.twoAt ? 2 : 1;
  if (mine.length && (mine.length >= max || h.spellCd.balllightning > 0)) {
    if (!opts.repeat) burstBall(mine[0]);
    return;
  }
  const p = targetPoint(s.range);
  if (!p || !begin('balllightning')) return;
  game.groundSpells.push({
    kind: 'balllightning', x: p.x, y: p.y, age: 0, duration: s.duration * skillMul(h, 'balllightning', 'duration'), arcT: s.arcEvery,
    targets: s.targets + Math.floor(skillBonus(h, 'balllightning', 'targets')), lastHit: new Set(), done: false,
    arcDmg: spellDamage(s.arcDamage, 'balllightning'), burstDmg: spellDamage(s.burst, 'balllightning'),
    radius: s.burstRadius * skillMul(h, 'balllightning', 'radius')
  });
  spawnHitParticles(p.x, p.y - 20, '#dff9ff', 8);
}

// 구체 한 틱: arcEvery초마다 arcRadius 안 가까운 적부터 targets명에게 번개. 바로 전 틱에 맞은 적은 다른 적이 모자랄 때만(순번)
function updateBall(g, dt) {
  const s = SPELLS.balllightning, h = game.hero;
  if (g.done) return;
  if (g.age >= g.duration) { burstBall(g); return; }
  g.arcT -= dt;
  if (g.arcT > 0) return;
  g.arcT += s.arcEvery;
  const near = game.cows
    .filter((c) => c.state !== 'dead' && canHit(h, c) && cowEdgeDist(c, g.x, g.y - 20) <= s.arcRadius)
    .sort((a, b) => (g.lastHit.has(a) - g.lastHit.has(b)) || (Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y)))
    .slice(0, g.targets);
  g.lastHit = new Set(near);
  near.forEach((c) => {
    const at = getCowBody(c);
    spawnLightningBolt(g.x, g.y - 20, at.x, at.y);
    damageCowPacket(c, { lightning: rollLightning(g.arcDmg, masteryBonus(h, 'lightningMin')) }, { knock: 1, fromX: g.x, fromY: g.y });
  });
}

// 구체 폭발: 반경 안 모든 적에게 번개 - 흰 고리. 터진 구체는 고리가 퍼지는 동안(짧게) 남았다가 사라짐
function burstBall(g) {
  const h = game.hero;
  g.done = true;
  g.duration = g.age + 0.25;
  spawnShockwave(g.x, g.y, g.radius, '#ffffff');
  spawnHitParticles(g.x, g.y - 20, '#dff9ff', 14);
  game.shake = Math.min(game.shake + 5, 12);
  game.cows.forEach((c) => {
    if (c.state === 'dead' || !canHit(h, c) || cowEdgeDist(c, g.x, g.y) > g.radius) return;
    damageCowPacket(c, { lightning: rollLightning(g.burstDmg, masteryBonus(h, 'lightningMin')) }, { knock: 4, fromX: g.x, fromY: g.y });
  });
}

function hitArea(g, packet, knock) {
  game.cows.forEach((c) => {
    if (c.state === 'dead' || !canHit(game.hero, c)) return;
    if (cowEdgeDist(c, g.x, g.y) <= g.radius) damageCowPacket(c, packet, { knock, fromX: g.x, fromY: g.y });
  });
}

export function updateGroundSpells(dt) {
  const s = SPELLS.blizzard;
  for (let i = game.groundSpells.length - 1; i >= 0; i--) {
    const g = game.groundSpells[i];
    g.age += dt;
    if (g.kind === 'firewave') updateFireWave(g, dt);
    else if (g.kind === 'balllightning') updateBall(g, dt);
    else if (g.kind === 'discharge') updateDischarge(g, dt);
    else if (g.kind === 'firetotem') updateFireTotem(g, dt);
    else if (g.kind === 'frostfield') updateFrostField(g, dt);
    else if (g.kind === 'thunder') updateThunder(g);
    else if (g.kind === 'firefield') { g.tickT -= dt; if (g.tickT <= 0) { g.tickT += SPELLS.meteor.fieldTick; hitArea(g, { fire: g.dmg }, 0); } } // 메테오 불타는 바닥
    else if (g.kind === 'blizzard') {
      if (g.age >= g.delay) { // 지역이 다 생긴 뒤부터
        g.tickT -= dt;
        if (g.tickT <= 0 && g.age < g.duration) { g.tickT += s.tick; hitArea(g, { cold: g.dmg }, 0); }
      }
    } else if (g.kind === 'flamepillar') {
      g.pillars.forEach((p) => {
        if (p.fired || g.age < p.t) return;
        p.fired = true;
        hitArea({ x: p.x, y: p.y, radius: SPELLS.flamepillar.pillarRadius }, { fire: g.dmg }, 3);
        spawnHitParticles(p.x, p.y, '#ffb347', 8);
        game.shake = Math.min(game.shake + 2, 12);
      });
    }
    if (g.age >= g.duration) game.groundSpells.splice(i, 1);
  }
}
