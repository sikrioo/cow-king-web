// 도살자 행동 훅 (도살자 카우·도살자 악마 - 2026-10-11 시안, 관리자 전용) - behaviors.js의 behaviors에 합쳐짐 (훅 규칙은 behaviors.js 맨 위)
//   ① 돌진: BUTCHER_CHARGE_MIN~MAX 거리면 붉은 예고선(BUTCHER_CHARGE_TELEGRAPH초) → 직선 돌진, 맞으면 밀려나며 기절, 벽에 박히면 BUTCHER_DAZE초 멍함
//      도살자 악마는 지나간 자리에 불길 (BUTCHER_FIRE_STEP px마다)
//   ② 버서커: 체력 BUTCHER_BERSERK_HP 이하에서 한 번 - 공격속도 × BUTCHER_BERSERK_SPEED, 피해 × ..DAMAGE, 받는 피해 + ..TAKEN(저항을 낮춤)
//   붙으면 짧은 연타(data/monsters.js hitAt·attackTime), 맞힐 때마다 세어 BUTCHER_STUN_EVERY번째마다 기절 (2026-10-11 사용자: 돌진·세 번째 타격 둘 다)
import {
  BUTCHER_STUN_EVERY, BUTCHER_STUN, BUTCHER_CHARGE_MIN, BUTCHER_CHARGE_MAX, BUTCHER_CHARGE_CD, BUTCHER_CHARGE_TELEGRAPH, BUTCHER_CHARGE_SPEED,
  BUTCHER_CHARGE_DIST, BUTCHER_CHARGE_WIDTH, BUTCHER_CHARGE_DAMAGE, BUTCHER_CHARGE_KNOCK, BUTCHER_CHARGE_STUN, BUTCHER_DAZE, BUTCHER_FIRE_STEP,
  BUTCHER_BERSERK_HP, BUTCHER_BERSERK_SPEED, BUTCHER_BERSERK_DAMAGE, BUTCHER_BERSERK_TAKEN
} from '../data/balance.js';
import { MONSTERS } from '../data/monsters.js';
import { ELEMENTS } from '../data/elements.js';
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { hitPlayer } from '../systems/combat.js';
import { stunHero } from '../systems/curses.js';
import { spawnHitParticles, spawnShockwave, spawnFireHazard, floatText } from '../systems/fx.js';
import { applyKnockback } from './actor.js';
import { clampToPen } from '../world/arena.js';

const stop = (m) => Body.setVelocity(m.body, { x: 0, y: 0 });

// 버서커: 한 번만 - 빨라지고 세지는 대신 저항이 낮아짐(받는 피해 증가)
function goBerserk(m) {
  m.berserk = true;
  m.hitAt /= BUTCHER_BERSERK_SPEED;
  m.attackTime /= BUTCHER_BERSERK_SPEED;
  m.dmg = Math.round(m.dmg * BUTCHER_BERSERK_DAMAGE);
  const base = MONSTERS[m.kind].resist || {};
  m.resist = Object.fromEntries(['phys', ...ELEMENTS].map((k) => [k, (base[k] || 0) - BUTCHER_BERSERK_TAKEN]));
  floatText(m.x, m.y - 80 * m.scale, '광폭!', '#ff3b30');
  spawnShockwave(m.x, m.y, 50 * m.scale, '#ff2d2d');
  game.shake = Math.min(game.shake + 4, 12);
}

function butcher() {
  return {
    init(m) { m.chargeCd = 1.5; },
    interrupt(m) { if (m.state === 'chargePrep' || m.state === 'butcherCharge') m.chargeCd = BUTCHER_CHARGE_CD; },
    update(m, dt) {
      if (!m.berserk && m.hp <= m.maxHp * BUTCHER_BERSERK_HP) goBerserk(m);
      m.chargeCd -= dt;
      if (m.state === 'dazed') { stop(m); m.stateElapsed += dt; if (m.stateElapsed >= BUTCHER_DAZE) m.setState('idle', 0.2); return true; }
      if (m.state === 'chargePrep') {
        stop(m); m.stateElapsed += dt;
        if (m.stateElapsed >= BUTCHER_CHARGE_TELEGRAPH) { m.state = 'butcherCharge'; m.stateElapsed = 0; m.chargeLeft = BUTCHER_CHARGE_DIST; m.chargeHit = false; m.fireStep = 0; }
        return true;
      }
      if (m.state === 'butcherCharge') {
        const step = Math.min(m.chargeLeft, BUTCHER_CHARGE_SPEED * dt);
        const want = { x: m.x + m.chargeDirX * step, y: m.y + m.chargeDirY * step };
        const p = clampToPen(want.x, want.y, m.r + 6);
        const wall = Math.hypot(p.x - want.x, p.y - want.y) > 1;
        Body.setPosition(m.body, p); stop(m);
        m.x = p.x; m.y = p.y; m.chargeLeft -= step;
        if (MONSTERS[m.kind].element === 'fire') { // 도살자 악마: 지나간 자리 불길
          m.fireStep += step;
          if (m.fireStep >= BUTCHER_FIRE_STEP) { m.fireStep = 0; spawnFireHazard(m.x, m.y); }
        }
        if (!m.chargeHit && game.hero.alive && Math.hypot(game.hero.x - m.x, game.hero.y - m.y) < BUTCHER_CHARGE_WIDTH + m.r * 0.5) {
          m.chargeHit = true;
          const taken = hitPlayer(m.x, m.y, Math.round(BUTCHER_CHARGE_DAMAGE * (m.berserk ? BUTCHER_BERSERK_DAMAGE : 1)));
          if (taken > 0) { applyKnockback(game.hero.body, m.x, m.y, BUTCHER_CHARGE_KNOCK); stunHero(BUTCHER_CHARGE_STUN); }
        }
        if (wall) { // 벽에 박힘 → 멍함 (공격할 틈)
          spawnShockwave(m.x, m.y, 40 * m.scale, '#ffffff');
          floatText(m.x, m.y - 80 * m.scale, '쿵!', '#ffffff');
          game.shake = Math.min(game.shake + 6, 12);
          m.chargeCd = BUTCHER_CHARGE_CD;
          m.setState('dazed', 0);
        } else if (m.chargeLeft <= 0) { m.chargeCd = BUTCHER_CHARGE_CD; m.setState('idle', 0.2); }
        return true;
      }
      if (m.chargeCd <= 0 && game.hero.alive) {
        const dx = game.hero.x - m.x, dy = game.hero.y - m.y, d = Math.hypot(dx, dy);
        if (d >= BUTCHER_CHARGE_MIN && d <= BUTCHER_CHARGE_MAX) {
          m.chargeDirX = dx / d; m.chargeDirY = dy / d; // 예고 순간 방향 고정 (옆으로 피할 수 있음)
          if (Math.abs(dx) > 1) m.facing = dx > 0 ? 1 : -1;
          m.setState('chargePrep', 0);
          stop(m);
          return true;
        }
      }
      return false;
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
    },
    // 돌진 예고선(붉은 띠) / 광폭: 발밑 붉은 기운 (난수 없음)
    drawUnder(m, ctx, t) {
      ctx.save();
      if (m.state === 'chargePrep') {
        const len = BUTCHER_CHARGE_DIST, k = Math.min(1, m.stateElapsed / BUTCHER_CHARGE_TELEGRAPH);
        ctx.translate(m.x, m.y);
        ctx.rotate(Math.atan2(m.chargeDirY, m.chargeDirX));
        ctx.globalAlpha = 0.2 + k * 0.25 + Math.sin(t * 22) * 0.08;
        ctx.fillStyle = '#ff2d2d';
        ctx.fillRect(0, -BUTCHER_CHARGE_WIDTH, len, BUTCHER_CHARGE_WIDTH * 2);
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = '#ff8a75';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, -BUTCHER_CHARGE_WIDTH, len, BUTCHER_CHARGE_WIDTH * 2);
      }
      ctx.restore();
      if (m.berserk) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(t * 12) * 0.15;
        ctx.strokeStyle = '#ff2d2d';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(m.x, m.y + m.r * 0.4, m.r * 1.3, m.r * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  };
}

export const butcherBehaviors = {
  butcherCow: { ...butcher() },   // 도살자 카우 (고기 식칼)
  butcherDemon: { ...butcher() }  // 도살자 악마 (지옥 식칼, 화염, 돌진 자리에 불길)
};
