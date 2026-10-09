// 마법사의 지점·자기 강화 마법: 에너지 쉴드(피해 일부를 마나로 - 적용은 elements.heroDamageTaken), 눈보라, 화염기둥
// 지점 = 자동 조준이 정한 hero.aimX/aimY (systems/aim.js), 사거리(range)보다 멀면 사거리까지. 수치는 data/skills.js SPELLS
// 진행 중인 지점 마법은 game.groundSpells, 그림은 render/skillFx.js
import { SPELLS } from '../data/skills.js';
import { game } from '../state.js';
import { skillMul } from '../util.js';
import { canHit, cowEdgeDist } from './combat.js';
import { damageCowPacket } from './elementCombat.js';
import { spawnHitParticles, spawnShockwave } from './fx.js';
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

// 조준 지점 (사거리까지, 목장 안)
function targetPoint(range) {
  const h = game.hero;
  let x = h.aimX != null ? h.aimX : h.x + Math.cos(h.facing) * range * 0.6;
  let y = h.aimY != null ? h.aimY : h.y + Math.sin(h.facing) * range * 0.6;
  const d = Math.hypot(x - h.x, y - h.y);
  if (d > range) { x = h.x + ((x - h.x) / d) * range; y = h.y + ((y - h.y) / d) * range; }
  return clampToPen(x, y, 20);
}

// 눈보라: duration초 동안 tick초마다 반경 안 모든 적에게 냉기 피해(→ 둔화)
export function tryBlizzard() {
  const s = SPELLS.blizzard, h = game.hero;
  if (!begin('blizzard')) return;
  const p = targetPoint(s.range);
  game.groundSpells.push({
    kind: 'blizzard', x: p.x, y: p.y, age: 0, duration: s.duration, tickT: 0, seed: game.groundSpells.length + Math.round(p.x),
    radius: s.radius * skillMul(h, 'blizzard', 'radius'), dmg: spellDamage(s.damage, 'blizzard')
  });
}

// 화염기둥: 예고 원이 뜨고 delay초 뒤 불기둥 - 반경 안 큰 화염 피해(→ 화상)
export function tryFlamePillar() {
  const s = SPELLS.flamepillar, h = game.hero;
  if (!begin('flamepillar')) return;
  const p = targetPoint(s.range);
  game.groundSpells.push({
    kind: 'flamepillar', x: p.x, y: p.y, age: 0, duration: s.delay + 0.5, delay: s.delay, fired: false,
    radius: s.radius * skillMul(h, 'flamepillar', 'radius'), dmg: spellDamage(s.damage, 'flamepillar')
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
    if (g.kind === 'blizzard') {
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
