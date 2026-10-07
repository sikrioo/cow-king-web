// 투사체: 곧게 날아가 대상에 닿거나 사거리 끝/울타리에서 터짐.
//   team 'monster'(기본): 주인공을 맞힘 / team 'hero': 몬스터를 맞힘 (원소 피해는 elementCombat.damageCowPacket)
//   pierce: 몸통 충돌 무시(얼음 보주처럼 지나가며 뭔가를 뿌리는 것), onTick(p, dt)/onEnd(p): 날아가는 동안/끝날 때 추가 동작
// 그리기는 render/fx.js의 drawProjectiles (kind로 모양 구분)
import { game } from '../state.js';
import { PEN } from '../world/arena.js';
import { hitPlayer, canHit, getCowHitRadius } from './combat.js';
import { damageCowPacket } from './elementCombat.js';
import { spawnHitParticles, spawnShockwave } from './fx.js';

// p: { kind, team, x, y, dirX, dirY(단위 벡터), speed(px/초), range(px), radius(몸통 판정), packet(피해 묶음),
//      explodeRadius(0이면 맞은 대상만), knock, color, pierce, onTick, onEnd }
export function spawnProjectile(p) {
  game.projectiles.push({ team: 'monster', explodeRadius: 0, knock: 0, ...p, traveled: 0 });
}

function cowHit(p) {
  for (const c of game.cows) {
    if (c.state === 'dead' || !canHit(game.hero, c)) continue;
    if (Math.hypot(c.x - p.x, c.y - p.y) <= p.radius + getCowHitRadius(c)) return c;
  }
  return null;
}

export function updateProjectiles(dt) {
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const p = game.projectiles[i];
    const step = p.speed * dt;
    p.x += p.dirX * step;
    p.y += p.dirY * step;
    p.traveled += step;
    if (p.onTick) p.onTick(p, dt);
    let target = null;
    if (!p.pierce) {
      if (p.team === 'hero') target = cowHit(p);
      else if (game.hero.alive && Math.hypot(game.hero.x - p.x, game.hero.y - p.y) <= p.radius + game.hero.r) target = game.hero;
    }
    const outside = p.x < PEN.x || p.y < PEN.y || p.x > PEN.x + PEN.size || p.y > PEN.y + PEN.size;
    if (target || p.traveled >= p.range || outside) {
      game.projectiles.splice(i, 1);
      if (p.onEnd) p.onEnd(p);
      if (p.packet) (p.team === 'hero' ? explodeOnCows(p, target) : explodeOnHero(p, !!target));
    }
  }
}

// 몬스터 투사체가 터짐: 몸통에 맞았거나 폭발 반경 안이면 피해 (사거리 끝/울타리에서 터져도 근처면 맞음)
function explodeOnHero(p, direct) {
  spawnShockwave(p.x, p.y, p.explodeRadius, p.color);
  spawnHitParticles(p.x, p.y, p.color, 10);
  if (game.hero.alive && (direct || Math.hypot(game.hero.x - p.x, game.hero.y - p.y) <= p.explodeRadius + game.hero.r * 0.5)) {
    hitPlayer(p.x - p.dirX * 10, p.y - p.dirY * 10, p.packet);
  }
}

// 주인공 투사체가 터짐: 폭발 반경이 있으면 반경 안 몬스터 전부, 없으면 맞은 몬스터만
function explodeOnCows(p, hit) {
  spawnHitParticles(p.x, p.y, p.color, p.explodeRadius ? 12 : 5);
  const opts = { knock: p.knock, fromX: p.x - p.dirX * 20, fromY: p.y - p.dirY * 20 };
  if (p.explodeRadius) {
    spawnShockwave(p.x, p.y, p.explodeRadius, p.color);
    game.cows.forEach((c) => {
      if (c.state === 'dead' || !canHit(game.hero, c)) return;
      if (Math.hypot(c.x - p.x, c.y - p.y) <= p.explodeRadius + getCowHitRadius(c)) damageCowPacket(c, p.packet, opts);
    });
  } else if (hit) {
    damageCowPacket(hit, p.packet, opts);
  }
}
