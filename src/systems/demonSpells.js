// 악마 마법 (몬스터 → 주인공): 지옥불 원 - HELLFIRE_DELAY초 예고(보라 원이 차오름) 뒤 반경 안이면 화염 피해. 그림은 render/demonFx.js
import { HELLFIRE_DELAY, HELLFIRE_RADIUS, HELLFIRE_DAMAGE } from '../data/balance.js';
import { game } from '../state.js';
import { hitPlayer } from './combat.js';
import { spawnShockwave, spawnHitParticles } from './fx.js';

export function spawnHellfire(x, y) {
  game.hellfires.push({ x, y, t: 0, delay: HELLFIRE_DELAY, r: HELLFIRE_RADIUS });
}

export function updateHellfires(dt) {
  for (let i = game.hellfires.length - 1; i >= 0; i--) {
    const f = game.hellfires[i];
    f.t += dt;
    if (f.t < f.delay) continue;
    game.hellfires.splice(i, 1);
    spawnShockwave(f.x, f.y, f.r * 1.2, '#b04dff');
    spawnHitParticles(f.x, f.y, '#d98bff', 10);
    spawnHitParticles(f.x, f.y, '#ff5a1e', 6);
    game.shake = Math.min(game.shake + 3, 12);
    if (game.hero.alive && Math.hypot(game.hero.x - f.x, game.hero.y - f.y) <= f.r + game.hero.r * 0.5) hitPlayer(f.x, f.y, { fire: HELLFIRE_DAMAGE });
  }
}
