// 마법사의 지점·자기 강화 마법: 에너지 쉴드(피해 일부를 마나로 - 적용은 elements.heroDamageTaken), 눈보라, 화염기둥
// 지점 = 자동 조준이 정한 hero.aimX/aimY (systems/aim.js), 사거리(range)보다 멀면 시전 안 함('사거리 밖'). 수치는 data/skills.js SPELLS
// 화염 파도: 바라보는 쪽으로 퍼지는 부채꼴 불의 벽 (game.groundSpells kind 'firewave')
// 진행 중인 지점 마법은 game.groundSpells, 그림은 render/skillFx.js
import { SPELLS } from '../data/skills.js';
import { game } from '../state.js';
import { skillMul } from '../util.js';
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

// 눈보라: duration초 동안 tick초마다 반경 안 모든 적에게 냉기 피해(→ 둔화)
export function tryBlizzard() {
  const s = SPELLS.blizzard, h = game.hero;
  const p = targetPoint(s.range);
  if (!p || !begin('blizzard')) return;
  game.groundSpells.push({
    kind: 'blizzard', x: p.x, y: p.y, age: 0, duration: s.duration, tickT: 0, seed: game.groundSpells.length + Math.round(p.x),
    radius: s.radius * skillMul(h, 'blizzard', 'radius'), dmg: spellDamage(s.damage, 'blizzard')
  });
}

// 화염기둥: 예고 원이 뜨고 delay초 뒤 불기둥 - 반경 안 큰 화염 피해(→ 화상)
export function tryFlamePillar() {
  const s = SPELLS.flamepillar, h = game.hero;
  const p = targetPoint(s.range);
  if (!p || !begin('flamepillar')) return;
  game.groundSpells.push({
    kind: 'flamepillar', x: p.x, y: p.y, age: 0, duration: s.delay + 0.5, delay: s.delay, fired: false,
    radius: s.radius * skillMul(h, 'flamepillar', 'radius'), dmg: spellDamage(s.damage, 'flamepillar')
  });
}

// 화염 파도: 주인공 자리에서 바라보는 쪽으로 퍼져 나감 (이동 중에도 시전 때의 자리·방향 기준)
export function tryFireWave() {
  const s = SPELLS.firewave, h = game.hero;
  if (!begin('firewave')) return;
  game.groundSpells.push({
    kind: 'firewave', x: h.x, y: h.y, dir: h.facing, age: 0, front: 0, hit: new Set(),
    range: s.range * skillMul(h, 'firewave', 'range'), duration: s.range * skillMul(h, 'firewave', 'range') / s.speed + 0.25,
    dmg: spellDamage(s.damage, 'firewave')
  });
  spawnHitParticles(h.x + Math.cos(h.facing) * 20, h.y + Math.sin(h.facing) * 20, '#ffb347', 10);
  game.shake = Math.min(game.shake + 3, 12);
}

// 화염 파도 한 틱: 불의 벽(앞쪽 반지름 front, 두께 thick, 부채꼴 arc) 안에 들어온 적은 한 번씩 화염 피해
function updateFireWave(g, dt) {
  const s = SPELLS.firewave;
  g.front = Math.min(g.range, g.front + s.speed * dt);
  game.cows.forEach((c) => {
    if (c.state === 'dead' || g.hit.has(c) || !canHit(game.hero, c)) return;
    const dx = c.x - g.x, dy = c.y - g.y, d = Math.hypot(dx, dy);
    if (d > g.front + getCowHitRadius(c) || d < g.front - s.thick - getCowHitRadius(c)) return;
    let diff = Math.abs(Math.atan2(dy, dx) - g.dir) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > s.arc / 2) return;
    g.hit.add(c);
    damageCowPacket(c, { fire: g.dmg }, { knock: 4, fromX: g.x, fromY: g.y });
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
    else if (g.kind === 'blizzard') {
      g.tickT -= dt;
      if (g.tickT <= 0 && g.age < g.duration) { g.tickT += s.tick; hitArea(g, { cold: g.dmg }, 0); }
    } else if (g.kind === 'flamepillar' && !g.fired && g.age >= g.delay) {
      g.fired = true;
      hitArea(g, { fire: g.dmg }, 5);
      spawnShockwave(g.x, g.y, g.radius + 10, '#ff7a1a');
      spawnHitParticles(g.x, g.y, '#ffb347', 16);
      game.shake = Math.min(game.shake + 5, 12);
    }
    if (g.age >= g.duration) game.groundSpells.splice(i, 1);
  }
}
