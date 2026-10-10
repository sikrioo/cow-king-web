// 도살자 행동 훅 (도살자 카우·도살자 악마 - 2026-10-11 시안, 관리자 전용) - behaviors.js의 behaviors에 합쳐짐 (훅 규칙은 behaviors.js 맨 위)
//   멀리서 보면 빠르게 달려듦(BUTCHER_SPRINT_DIST보다 멀면 × BUTCHER_SPRINT) → 붙으면 짧은 연타(data/monsters.js hitAt·attackTime)
//   맞힐 때마다 세어 BUTCHER_STUN_EVERY번째마다 주인공 기절 BUTCHER_STUN초 (systems/curses.js stunHero)
import { BUTCHER_SPRINT, BUTCHER_SPRINT_DIST, BUTCHER_STUN_EVERY, BUTCHER_STUN } from '../data/balance.js';
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { stunHero } from '../systems/curses.js';
import { spawnHitParticles } from '../systems/fx.js';

function butcher() {
  return {
    // 달려듦: 근접 사거리 밖이면 직접 쫓음 (멀수록 빠르게)
    steer(m, dxP, dyP, distP, auraMult) {
      if (!game.hero.alive || distP <= m.meleeRange || distP > m.aggroRange) return false;
      const sp = m.speed * auraMult * (distP > BUTCHER_SPRINT_DIST ? BUTCHER_SPRINT : 1) / 60;
      m.state = 'walk';
      Body.setVelocity(m.body, { x: (dxP / distP) * sp, y: (dyP / distP) * sp });
      if (Math.abs(dxP) > 1) m.facing = dxP > 0 ? 1 : -1;
      return true;
    },
    // 근접으로 실제 피해를 줬을 때 (monster.js) - 세 번째마다 기절
    onMeleeHit(m, taken) {
      if (!(taken > 0)) return;
      m.comboN = (m.comboN || 0) + 1;
      if (m.comboN % BUTCHER_STUN_EVERY === 0) {
        stunHero(BUTCHER_STUN);
        spawnHitParticles(game.hero.x, game.hero.y - 20, '#ffe066', 8);
        game.shake = Math.min(game.shake + 5, 12);
      }
    }
  };
}

export const butcherBehaviors = {
  butcherCow: { ...butcher() },   // 도살자 카우 (고기 식칼)
  butcherDemon: { ...butcher() }  // 도살자 악마 (지옥 식칼, 화염)
};
