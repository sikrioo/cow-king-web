// 마법사의 지점·자기 강화 마법: 에너지 쉴드(피해 일부를 마나로 - 적용은 elements.heroDamageTaken), 눈보라, 화염기둥
// 지점 = 자동 조준이 정한 hero.aimX/aimY (systems/aim.js), 사거리(range)보다 멀면 시전 안 함('사거리 밖'). 수치는 data/skills.js SPELLS
// 화염 파도: 바라보는 쪽으로 퍼지는 부채꼴 불의 벽 (game.groundSpells kind 'firewave')
// 진행 중인 지점 마법은 game.groundSpells, 그림은 render/skillFx.js
import { SPELLS } from '../data/skills.js';
import { game } from '../state.js';
import { skillMul, easeOutCubic } from '../util.js';
import { canHit, cowEdgeDist, getCowHitRadius } from './combat.js';
import { damageCowPacket } from './elementCombat.js';
import { spawnHitParticles, spawnShockwave, floatText } from './fx.js';
import { begin, spellDamage } from './sorcSkills.js';
import { clampToPen } from '../world/arena.js';

export function tryEnergyShield() {
  const h = game.hero, s = SPELLS.energyshield;
  if (!begin('energyshield')) return;
  h.shieldTimer = s.duration * skillMul(h, 'energyshield', 'duration');
  h.shieldMax = h.shieldTimer;
  spawnShockwave(h.x, h.y, 46, '#7fa8ff');
  spawnHitParticles(h.x, h.y, '#9fc0ff', 12);
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
