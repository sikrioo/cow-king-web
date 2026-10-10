// 몬스터 마법: 메테오(경고 원 → 하늘에서 불덩이 → 폭발 + 불꽃 바닥), 파이어볼(투사체), 화염 벽(불꽃 바닥 한 줄)
// 그리기는 render/fx.js, 수치는 data/balance.js의 METEOR_* / FIREBALL_* / FIRE_WALL_*
import {
  METEOR_DELAY, METEOR_FALL_TIME, METEOR_RADIUS, METEOR_DAMAGE, METEOR_FIRE_RADIUS, METEOR_FIRE_LIFE,
  FIREBALL_SPEED, FIREBALL_RANGE, FIREBALL_RADIUS, FIREBALL_DAMAGE, FIREBALL_EXPLODE_RADIUS,
  FIRE_WALL_POS, FIRE_WALL_SEGMENTS, FIRE_WALL_SPACING, FIRE_WALL_RADIUS, FIRE_WALL_LIFE
} from '../data/balance.js';
import { game } from '../state.js';
import { hitPlayer } from './combat.js';
import { spawnFireHazard, spawnShockwave, spawnHitParticles } from './fx.js';
import { spawnProjectile } from './projectiles.js';
import { clampToPen } from '../world/arena.js';

export function spawnMeteor(x, y) {
  game.meteors.push({ x, y, t: 0, delay: METEOR_DELAY, fall: METEOR_FALL_TIME, r: METEOR_RADIUS });
}

export function updateMeteors(dt) {
  for (let i = game.meteors.length - 1; i >= 0; i--) {
    const m = game.meteors[i];
    m.t += dt;
    if (m.t < m.delay) continue;
    // 착탄
    game.meteors.splice(i, 1);
    spawnShockwave(m.x, m.y, m.r * 1.3, '#ff7a1a');
    spawnHitParticles(m.x, m.y, '#ffb02e', 16);
    spawnHitParticles(m.x, m.y, '#ff4d1a', 10);
    game.shake = Math.min(game.shake + 6, 12);
    game.impactFlash = Math.max(game.impactFlash, 0.08);
    if (m.onImpact) { m.onImpact(m); continue; } // 주인공 메테오 (systems/groundSpells.js) - 몬스터를 맞힘
    if (game.hero.alive && Math.hypot(game.hero.x - m.x, game.hero.y - m.y) <= m.r + game.hero.r * 0.5) {
      hitPlayer(m.x, m.y, { fire: METEOR_DAMAGE });
    }
    spawnFireHazard(m.x, m.y, METEOR_FIRE_RADIUS, METEOR_FIRE_LIFE); // 착탄 자리에 불꽃이 남음
  }
}

// 파이어볼: (x, y)에서 (tx, ty) 쪽으로 곧게 (유도 없음 - 옆으로 움직이면 피함)
export function castFireball(x, y, tx, ty) {
  const dx = tx - x, dy = ty - y;
  const d = Math.hypot(dx, dy) || 1;
  spawnProjectile({
    kind: 'fireball', x, y, dirX: dx / d, dirY: dy / d,
    speed: FIREBALL_SPEED, range: FIREBALL_RANGE, radius: FIREBALL_RADIUS,
    packet: { fire: FIREBALL_DAMAGE }, explodeRadius: FIREBALL_EXPLODE_RADIUS, color: '#ff7a1a'
  });
}

// 화염 벽: 시전자(cx, cy)와 주인공(hx, hy) 사이에 둘을 잇는 선과 수직인 불길 한 줄 (불꽃 바닥 여러 개)
export function spawnFireWall(cx, cy, hx, hy) {
  const dx = hx - cx, dy = hy - cy;
  const d = Math.hypot(dx, dy) || 1;
  const mx = cx + dx * FIRE_WALL_POS, my = cy + dy * FIRE_WALL_POS;
  const px = -dy / d, py = dx / d; // 수직 방향
  const half = (FIRE_WALL_SEGMENTS - 1) / 2;
  for (let i = 0; i < FIRE_WALL_SEGMENTS; i++) {
    const o = (i - half) * FIRE_WALL_SPACING;
    const p = clampToPen(mx + px * o, my + py * o, FIRE_WALL_RADIUS);
    spawnFireHazard(p.x, p.y, FIRE_WALL_RADIUS, FIRE_WALL_LIFE);
  }
  spawnHitParticles(mx, my, '#ff7a1a', 8);
}
