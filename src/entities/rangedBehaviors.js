// 활 쏘는 몬스터 행동 훅 (궁수 카우·해골 궁수 카우) - behaviors.js의 behaviors에 합쳐짐 (훅 규칙은 behaviors.js 맨 위)
//   사거리 안이면 조준(aiming, 조준 시작 때 방향 고정 - 조준선이 보임) → 화살 한 발(곧게, 옆으로 움직이면 피함) → 대기. 가까우면 물러남
import { ARCHER_RANGE, ARCHER_KITE, ARCHER_AIM, ARCHER_COOLDOWN, ARROW_DAMAGE, ARCHER_SKELETON_DAMAGE, ARROW_SPEED, ARROW_RADIUS } from '../data/balance.js';
import { SOUL_RANGE, SOUL_KITE, SOUL_SHOT_CD, SOUL_CHARGE, SOUL_TURN, SOUL_BEAM_LENGTH, SOUL_BEAM_WIDTH, SOUL_ZAP_DAMAGE, SOUL_BRANCHES } from '../data/balance.js';
import { hitPlayer } from '../systems/combat.js';
import { rollLightning } from '../systems/elements.js';
import { spawnLightningBolt, spawnHitParticles } from '../systems/fx.js';
import { distToSegment } from '../util.js';
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

// 영혼 (버닝 소울·창백한 원혼): 불규칙하게 떠다니며(SOUL_KITE~SOUL_RANGE) 번개를 모음(charging, 그때 방향 고정) → 화면을 가로지르는 긴 하얀 번개
function soul() {
  return {
    ranged: true,
    init(m) { m.shootCd = 0.8 + Math.random() * 1.0; m.driftT = 0; m.driftA = Math.random() * Math.PI * 2; },
    interrupt(m) { if (m.state === 'charging') m.shootCd = SOUL_SHOT_CD; },
    update(m, dt) {
      if (m.shootCd > 0) m.shootCd -= dt;
      if (m.state === 'charging') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (m.stateElapsed >= SOUL_CHARGE) {
          const ox = m.x, oy = m.y - 50 * m.scale;
          const ex = ox + m.zapDirX * SOUL_BEAM_LENGTH, ey = oy + m.zapDirY * SOUL_BEAM_LENGTH;
          spawnLightningBolt(ox, oy, ex, ey); // 굵게 보이도록 두 번
          spawnLightningBolt(ox, oy, ex, ey);
          for (let i = 1; i <= SOUL_BRANCHES; i++) { // 곁가지 (그림만)
            const k = i / (SOUL_BRANCHES + 1), bx = ox + (ex - ox) * k, by = oy + (ey - oy) * k;
            const a = Math.atan2(m.zapDirY, m.zapDirX) + (i % 2 ? 0.7 : -0.7);
            spawnLightningBolt(bx, by, bx + Math.cos(a) * 70, by + Math.sin(a) * 70);
          }
          spawnHitParticles(ox, oy, '#ffffff', 6);
          if (game.hero.alive && distToSegment(game.hero.x, game.hero.y, ox, oy, ex, ey) <= SOUL_BEAM_WIDTH + game.hero.r * 0.5) {
            hitPlayer(ox, oy, { lightning: rollLightning(SOUL_ZAP_DAMAGE) });
          }
          m.shootCd = SOUL_SHOT_CD;
          m.setState('idle', 0.2);
        }
        return true;
      }
      if (m.shootCd <= 0 && game.hero.alive && Math.hypot(game.hero.x - m.x, game.hero.y - m.y) <= SOUL_RANGE) {
        const oy = m.y - 50 * m.scale, d = Math.hypot(game.hero.x - m.x, game.hero.y - oy) || 1;
        m.zapDirX = (game.hero.x - m.x) / d; m.zapDirY = (game.hero.y - oy) / d; // 모으기 시작할 때 방향 고정
        m.setState('charging', 0);
        Body.setVelocity(m.body, { x: 0, y: 0 });
        return true;
      }
      return false;
    },
    // 늘 직접 움직임: 너무 가까우면 물러나고, 멀면 다가가고, 그 사이에선 이리저리 (SOUL_TURN초마다 방향 바꿈 - 게임 난수)
    steer(m, dxP, dyP, distP, auraMult) {
      if (!game.hero.alive || distP > m.aggroRange) return false;
      m.driftT -= 1 / 60;
      if (m.driftT <= 0) { m.driftT = SOUL_TURN * (0.6 + Math.random() * 0.8); m.driftA = Math.random() * Math.PI * 2; }
      const sp = m.speed * auraMult / 60;
      let vx = Math.cos(m.driftA), vy = Math.sin(m.driftA);
      if (distP < SOUL_KITE) { vx = -dxP / distP + vx * 0.4; vy = -dyP / distP + vy * 0.4; }
      else if (distP > SOUL_RANGE) { vx = dxP / distP + vx * 0.4; vy = dyP / distP + vy * 0.4; }
      const l = Math.hypot(vx, vy) || 1;
      m.state = 'walk';
      Body.setVelocity(m.body, { x: (vx / l) * sp, y: (vy / l) * sp });
      if (Math.abs(dxP) > 1) m.facing = dxP > 0 ? 1 : -1;
      return true;
    },
    drawUnder(m, ctx, t) {
      if (m.state !== 'charging') return;
      const k = Math.min(1, m.stateElapsed / SOUL_CHARGE), oy = m.y - 50 * m.scale;
      ctx.save();
      ctx.globalAlpha = 0.12 + k * 0.25;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.moveTo(m.x, oy); ctx.lineTo(m.x + m.zapDirX * SOUL_BEAM_LENGTH * 0.5, oy + m.zapDirY * SOUL_BEAM_LENGTH * 0.5); ctx.stroke();
      ctx.restore();
    }
  };
}

export const rangedBehaviors = {
  burningSoul: { ...soul() }, // 버닝 소울 (진홍 불꽃 기둥, 하얀 번개)
  paleSoul: { ...soul() },    // 창백한 원혼 (푸른 너울, 하얀 번개)
  archer: { ...archer(ARROW_DAMAGE, '#ffd36a') },                     // 궁수 카우 (노란 화살)
  skeletonArcher: { ...archer(ARCHER_SKELETON_DAMAGE, '#7fffd4') }    // 해골 궁수 카우 (초록빛 화살)
};
