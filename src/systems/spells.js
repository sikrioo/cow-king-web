// 몬스터 마법: 메테오 - 목표 지점에 경고 원 → 하늘에서 불덩이 낙하 → 폭발(화염 피해) + 불꽃 바닥
// 그리기는 render/fx.js (drawMeteorMarkers/drawMeteorBalls), 수치는 data/balance.js의 METEOR_*
import {
  METEOR_DELAY, METEOR_FALL_TIME, METEOR_RADIUS, METEOR_DAMAGE, METEOR_FIRE_RADIUS, METEOR_FIRE_LIFE
} from '../data/balance.js';
import { game } from '../state.js';
import { hitPlayer } from './combat.js';
import { spawnFireHazard, spawnShockwave, spawnHitParticles } from './fx.js';

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
    if (game.hero.alive && Math.hypot(game.hero.x - m.x, game.hero.y - m.y) <= m.r + game.hero.r * 0.5) {
      hitPlayer(m.x, m.y, { fire: METEOR_DAMAGE });
    }
    spawnFireHazard(m.x, m.y, METEOR_FIRE_RADIUS, METEOR_FIRE_LIFE); // 착탄 자리에 불꽃이 남음
  }
}
