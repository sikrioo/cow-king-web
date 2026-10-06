// 투사체: 곧게 날아가 주인공에 닿으면(또는 사거리 끝에서) 터짐. 지금은 몬스터 → 주인공만 (주인공 스킬은 원소 3단계에서 team으로 확장)
// 종류별 모양/폭발은 kind로 구분 (그리기는 render/fx.js의 drawProjectiles)
import { game } from '../state.js';
import { PEN } from '../world/arena.js';
import { hitPlayer } from './combat.js';
import { spawnHitParticles, spawnShockwave } from './fx.js';

// p: { kind, x, y, dirX, dirY(단위 벡터), speed(px/초), range(px), radius(몸통 판정), packet(피해 묶음), explodeRadius, color }
export function spawnProjectile(p) {
  game.projectiles.push({ ...p, traveled: 0 });
}

export function updateProjectiles(dt) {
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const p = game.projectiles[i];
    const step = p.speed * dt;
    p.x += p.dirX * step;
    p.y += p.dirY * step;
    p.traveled += step;
    const hitHero = game.hero.alive && Math.hypot(game.hero.x - p.x, game.hero.y - p.y) <= p.radius + game.hero.r;
    const outside = p.x < PEN.x || p.y < PEN.y || p.x > PEN.x + PEN.size || p.y > PEN.y + PEN.size;
    if (hitHero || p.traveled >= p.range || outside) {
      game.projectiles.splice(i, 1);
      explode(p, hitHero);
    }
  }
}

// 터짐: 몸통에 맞았거나 폭발 반경 안이면 피해 (사거리 끝/울타리에서 터져도 근처면 맞음)
function explode(p, direct) {
  spawnShockwave(p.x, p.y, p.explodeRadius, p.color);
  spawnHitParticles(p.x, p.y, p.color, 10);
  if (game.hero.alive && (direct || Math.hypot(game.hero.x - p.x, game.hero.y - p.y) <= p.explodeRadius + game.hero.r * 0.5)) {
    hitPlayer(p.x - p.dirX * 10, p.y - p.dirY * 10, p.packet);
  }
}
