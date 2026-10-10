// 마법 쓰는 몬스터의 행동 훅 - behaviors.js의 behaviors에 합쳐짐 (훅 규칙은 behaviors.js 맨 위 설명)
import {
  METEOR_RANGE, METEOR_CAST_TIME, METEOR_COOLDOWN, PYRO_KITE_DISTANCE, PYRO_CAST_GAP, PYRO_METEOR_MIN_DIST,
  PYRO_WALL_MAX_DIST, FIREBALL_CAST_TIME, FIRE_WALL_CAST_TIME, FIRE_WALL_COOLDOWN
} from '../data/balance.js';
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { spawnHitParticles } from '../systems/fx.js';
import { spawnMeteor, castFireball, spawnFireWall } from '../systems/spells.js';

const CAST_TIME = { meteor: METEOR_CAST_TIME, fireball: FIREBALL_CAST_TIME, wall: FIRE_WALL_CAST_TIME };

// 거리별 마법 고르기: 멀면 메테오(드물게), 가까우면 화염 벽(길 막기), 그 외 파이어볼
function pickSpell(m, dist) {
  if (dist >= PYRO_METEOR_MIN_DIST && m.meteorCooldown <= 0) return 'meteor';
  if (dist <= PYRO_WALL_MAX_DIST && m.wallCooldown <= 0) return 'wall';
  return 'fireball';
}

function release(m) {
  const h = game.hero;
  if (m.castSpell === 'meteor') {
    spawnMeteor(m.castX, m.castY); // 시전 시작 순간 위치에 떨어짐 (경고 원 보고 피함)
    m.meteorCooldown = METEOR_COOLDOWN;
  } else if (m.castSpell === 'wall') {
    spawnFireWall(m.x, m.y, h.x, h.y);
    m.wallCooldown = FIRE_WALL_COOLDOWN;
  } else {
    castFireball(m.x, m.y - 10 * m.scale, h.x, h.y); // 놓는 순간의 주인공 쪽으로 곧게
  }
  m.castCooldown = PYRO_CAST_GAP;
}

export const spellBehaviors = {
  // 화염술사 카우 - 거리를 두고 마법: 멀면 메테오, 중간이면 파이어볼, 가까우면 화염 벽으로 길을 막고 물러남
  pyro: {
    ranged: true,
    init(m) {
      m.castCooldown = 1.2 + Math.random() * 1.2;
      m.meteorCooldown = 1 + Math.random() * 2;
      m.wallCooldown = 0;
    },
    interrupt(m) { if (m.state === 'casting') m.castCooldown = PYRO_CAST_GAP; }, // 시전 취소
    update(m, dt) {
      if (m.castCooldown > 0) m.castCooldown -= dt;
      if (m.meteorCooldown > 0) m.meteorCooldown -= dt;
      if (m.wallCooldown > 0) m.wallCooldown -= dt;
      if (m.state === 'casting') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (Math.abs(game.hero.x - m.x) > 1) m.facing = game.hero.x > m.x ? 1 : -1;
        if (m.stateElapsed >= CAST_TIME[m.castSpell]) {
          release(m);
          m.setState('idle', 0.4);
        }
        return true;
      }
      const dist = Math.hypot(game.hero.x - m.x, game.hero.y - m.y);
      if (m.castCooldown <= 0 && m.stunTimer <= 0 && m.knockback <= 0 && game.hero.alive && dist <= METEOR_RANGE) {
        m.castSpell = pickSpell(m, dist);
        m.castX = game.hero.x;
        m.castY = game.hero.y;
        m.setState('casting', 0);
        Body.setVelocity(m.body, { x: 0, y: 0 });
        spawnHitParticles(m.x, m.y - 30 * m.scale, '#ffb02e', 4);
        return true;
      }
      return false;
    },
    steer(m, dxP, dyP, distP, auraMult) {
      // 사정거리 밖이면 다가가고, 너무 가까우면 물러남 (원거리 마법형)
      if (game.hero.alive && distP > METEOR_RANGE && distP < m.aggroRange) {
        m.state = 'walk';
        Body.setVelocity(m.body, { x: (dxP / distP) * m.speed * auraMult / 60, y: (dyP / distP) * m.speed * auraMult / 60 });
        if (Math.abs(dxP) > 1) m.facing = dxP > 0 ? 1 : -1;
        return true;
      }
      if (game.hero.alive && distP < PYRO_KITE_DISTANCE && distP > 0.001) {
        m.state = 'walk';
        Body.setVelocity(m.body, { x: (-dxP / distP) * m.speed * auraMult / 60, y: (-dyP / distP) * m.speed * auraMult / 60 });
        m.facing = dxP > 0 ? -1 : 1;
        return true;
      }
      return false;
    },
    // 시전 중: 발밑에 커지는 주문 원 + 회전하는 불씨 (난수 없음)
    drawUnder(m, ctx, t) {
      if (m.state !== 'casting') return;
      const p = Math.min(1, m.stateElapsed / (CAST_TIME[m.castSpell] || METEOR_CAST_TIME));
      const R = (18 + 22 * p) * Math.max(0.8, m.scale * 2.2);
      ctx.save();
      ctx.globalAlpha = 0.35 + p * 0.4;
      ctx.strokeStyle = '#ff7a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y + m.r * 0.5, R, R * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd34d';
      for (let i = 0; i < 5; i++) {
        const a = t * 4 + i * (Math.PI * 2 / 5);
        ctx.beginPath();
        ctx.arc(m.x + Math.cos(a) * R, m.y + m.r * 0.5 + Math.sin(a) * R * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
};
