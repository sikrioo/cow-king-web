// 활 쏘는 몬스터 행동 훅 (궁수 카우·해골 궁수 카우) - behaviors.js의 behaviors에 합쳐짐 (훅 규칙은 behaviors.js 맨 위)
//   사거리 안이면 조준(aiming, 조준 시작 때 방향 고정 - 조준선이 보임) → 화살 한 발(곧게, 옆으로 움직이면 피함) → 대기. 가까우면 물러남
import { ARCHER_RANGE, ARCHER_KITE, ARCHER_AIM, ARCHER_COOLDOWN, ARROW_DAMAGE, ARCHER_SKELETON_DAMAGE, ARROW_SPEED, ARROW_RADIUS } from '../data/balance.js';
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { spawnProjectile } from '../systems/projectiles.js';

const AIM_HEIGHT = 34; // 화살이 나가는 높이 (활을 든 손)

function archer(damage, arrowColor) {
  return {
    ranged: true,
    init(m) { m.shootCd = 0.6 + Math.random() * 0.8; },
    interrupt(m) { if (m.state === 'aiming') m.shootCd = ARCHER_COOLDOWN; }, // 기절·경직이면 조준 취소
    update(m, dt) {
      if (m.shootCd > 0) m.shootCd -= dt;
      if (m.state === 'aiming') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (m.stateElapsed >= ARCHER_AIM) {
          const oy = m.y - AIM_HEIGHT * m.scale;
          spawnProjectile({ kind: 'arrow', x: m.x, y: oy, dirX: m.aimDirX, dirY: m.aimDirY, speed: ARROW_SPEED, range: ARCHER_RANGE + 120, radius: ARROW_RADIUS, packet: { phys: damage }, color: arrowColor });
          m.shootCd = ARCHER_COOLDOWN;
          m.setState('idle', 0.3);
        }
        return true;
      }
      if (m.shootCd <= 0 && game.hero.alive) {
        const oy = m.y - AIM_HEIGHT * m.scale;
        const dx = game.hero.x - m.x, dy = game.hero.y - oy, d = Math.hypot(dx, dy);
        if (d <= ARCHER_RANGE) {
          m.aimDirX = dx / d; m.aimDirY = dy / d;
          if (Math.abs(dx) > 1) m.facing = dx > 0 ? 1 : -1;
          m.setState('aiming', 0);
          Body.setVelocity(m.body, { x: 0, y: 0 });
          return true;
        }
      }
      return false;
    },
    steer(m, dxP, dyP, distP, auraMult) {
      if (game.hero.alive && distP > ARCHER_RANGE && distP < m.aggroRange) { // 사거리 밖이면 다가감
        m.state = 'walk';
        Body.setVelocity(m.body, { x: (dxP / distP) * m.speed * auraMult / 60, y: (dyP / distP) * m.speed * auraMult / 60 });
        if (Math.abs(dxP) > 1) m.facing = dxP > 0 ? 1 : -1;
        return true;
      }
      if (game.hero.alive && distP < ARCHER_KITE && distP > 0.001) { // 가까우면 물러나며 주인공을 봄
        m.state = 'walk';
        Body.setVelocity(m.body, { x: (-dxP / distP) * m.speed * auraMult / 60, y: (-dyP / distP) * m.speed * auraMult / 60 });
        m.facing = dxP > 0 ? -1 : 1;
        return true;
      }
      return false;
    },
    // 조준 중: 화살이 날아갈 방향으로 점점 진해지는 가는 선 (난수 없음)
    drawUnder(m, ctx) {
      if (m.state !== 'aiming') return;
      const k = Math.min(1, m.stateElapsed / ARCHER_AIM), oy = m.y - AIM_HEIGHT * m.scale, len = ARCHER_RANGE * 0.6;
      ctx.save();
      ctx.globalAlpha = 0.15 + k * 0.45;
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(m.x, oy); ctx.lineTo(m.x + m.aimDirX * len, oy + m.aimDirY * len); ctx.stroke();
      ctx.restore();
    }
  };
}

export const rangedBehaviors = {
  archer: { ...archer(ARROW_DAMAGE, '#ffd36a') },                     // 궁수 카우 (노란 화살)
  skeletonArcher: { ...archer(ARCHER_SKELETON_DAMAGE, '#7fffd4') }    // 해골 궁수 카우 (초록빛 화살)
};
