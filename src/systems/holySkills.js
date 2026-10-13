// 전사 신성 스킬 (2026-10-13 사용자: 전사에게 주는 약간의 마법 - 원소가 아닌 신성 피해, 마법이라 항상 맞음)
//   신성 망치: 시전한 자리에서 망치가 나선을 그리며 퍼져 나감 (game.groundSpells kind 'holyhammer') - 망치마다 같은 적은 한 번
//   천벌: 적 하나에만 하늘에서 신성한 번개 → 그 자리에서 빛의 구슬(빛줄기)이 사방으로 서서히 (kind 'heavenbolt') - 빛줄기마다 같은 적은 한 번, 맞은 대상은 빛줄기에 안 맞음
// 신성 피해 규칙(해골·영혼·악마에게 더 셈)은 elementCombat.damageCowPacket, 수치는 data/skills.js SPELLS, 그림은 render/holyFx.js
import { SPELLS } from '../data/skills.js';
import { game } from '../state.js';
import { skillMul } from '../util.js';
import { canHit, getCowHitRadius, getCowBody } from './combat.js';
import { damageCowPacket } from './elementCombat.js';
import { spawnHitParticles, spawnShockwave, spawnLightningBolt, floatText } from './fx.js';
import { begin, spellDamage } from './sorcSkills.js';
import { HOLY } from '../data/elements.js';
import { obstacleAt } from '../world/arena.js';

// 망치 자리 (그림도 같은 식): 시작 각도에서 spin(라디안/초)으로 돌며 반경이 growth(px/초)씩 커짐
export function hammerPos(g, age = g.age) {
  const s = SPELLS.holyhammer;
  const r = s.startRadius + s.growth * age * g.reach, a = g.a0 + s.spin * age;
  return { x: g.x + Math.cos(a) * r, y: g.y + Math.sin(a) * r };
}

export function tryHolyHammer() {
  const h = game.hero;
  if (!begin('holyhammer')) return;
  game.groundSpells.push({
    kind: 'holyhammer', x: h.x, y: h.y, a0: h.facing, age: 0, duration: SPELLS.holyhammer.duration, hits: new Set(),
    reach: skillMul(h, 'holyhammer', 'radius'), dmg: spellDamage(SPELLS.holyhammer.damage, 'holyhammer')
  });
}
function updateHammer(g) {
  const s = SPELLS.holyhammer, h = game.hero, p = hammerPos(g);
  if (obstacleAt(p.x, p.y, 4)) { spawnHitParticles(p.x, p.y - 20, HOLY.color, 6); g.duration = g.age; return; } // 구조물에 막힘
  game.cows.forEach((c) => {
    if (c.state === 'dead' || g.hits.has(c) || !canHit(h, c)) return;
    if (Math.hypot(c.x - p.x, c.y - p.y) > s.hitRadius + getCowHitRadius(c)) return;
    g.hits.add(c);
    damageCowPacket(c, { holy: g.dmg }, { knock: 2, fromX: p.x, fromY: p.y });
    spawnHitParticles(c.x, c.y - 20, HOLY.color, 5);
  });
}

export function tryHeavenBolt() {
  const s = SPELLS.heavenbolt, h = game.hero;
  const ax = h.aimX != null ? h.aimX : h.x + Math.cos(h.facing) * s.range * 0.5, ay = h.aimY != null ? h.aimY : h.y + Math.sin(h.facing) * s.range * 0.5;
  const target = game.cows.filter((c) => c.state !== 'dead' && canHit(h, c) && Math.hypot(c.x - h.x, c.y - h.y) <= s.range)
    .sort((a, b) => Math.hypot(a.x - ax, a.y - ay) - Math.hypot(b.x - ax, b.y - ay))[0];
  if (!target) { if (!(h.noManaWarn > 0)) { floatText(h.x, h.y - 40, '대상 없음', '#ffd36a'); h.noManaWarn = 1; } return; }
  if (!begin('heavenbolt')) return;
  game.groundSpells.push({
    kind: 'heavenbolt', target, x: target.x, y: target.y, age: 0, struck: false, bolts: [],
    duration: s.delay + s.boltRange / s.boltSpeed + 0.15,
    dmg: spellDamage(s.damage, 'heavenbolt'), boltDmg: spellDamage(s.boltDamage, 'heavenbolt')
  });
}
function updateHeavenBolt(g, dt) {
  const s = SPELLS.heavenbolt, h = game.hero;
  if (!g.struck && g.target && g.target.state !== 'dead') { g.x = g.target.x; g.y = g.target.y; }
  if (!g.struck && g.age >= s.delay) {
    g.struck = true;
    const top = getCowBody(g.target);
    spawnLightningBolt(g.x + 24, g.y - 430, top.x, top.y, HOLY.bolt);
    spawnLightningBolt(g.x - 16, g.y - 400, top.x, top.y, HOLY.bolt);
    spawnShockwave(g.x, g.y, 40, HOLY.color);
    spawnHitParticles(g.x, g.y - 30, HOLY.color, 14);
    game.impactFlash = Math.max(game.impactFlash, 0.1);
    game.shake = Math.min(game.shake + 4, 12);
    if (g.target.state !== 'dead') damageCowPacket(g.target, { holy: g.dmg }, { knock: 2, fromX: g.x, fromY: g.y - 1 });
    // 빛줄기: 대상 둘레에서 사방으로 (같은 간격, 시작 각도는 시전 방향)
    for (let i = 0; i < s.bolts; i++) {
      const a = h.facing + (i / s.bolts) * Math.PI * 2;
      g.bolts.push({ x: g.x, y: g.y, dx: Math.cos(a), dy: Math.sin(a), trav: 0, hits: new Set([g.target]) });
    }
    return;
  }
  g.bolts.forEach((b) => {
    if (b.trav >= s.boltRange) return;
    const step = s.boltSpeed * dt;
    b.x += b.dx * step; b.y += b.dy * step; b.trav += step;
    if (obstacleAt(b.x, b.y, 4)) { b.trav = s.boltRange; return; } // 구조물에 막힘
    game.cows.forEach((c) => {
      if (c.state === 'dead' || b.hits.has(c) || !canHit(h, c)) return;
      if (Math.hypot(c.x - b.x, c.y - b.y) > s.boltRadius + getCowHitRadius(c)) return;
      b.hits.add(c);
      damageCowPacket(c, { holy: g.boltDmg }, { knock: 1.5, fromX: g.x, fromY: g.y });
    });
  });
}

// groundSpells.updateGroundSpells가 kind로 부름
export const HOLY_UPDATE = { holyhammer: updateHammer, heavenbolt: updateHeavenBolt };
