// 악마 카우 종족 행동 훅 (관리자 페이지에만 - 2026-10-10) - behaviors.js의 behaviors에 합쳐짐 (훅 규칙은 behaviors.js 맨 위)
//   임프: 주인공 옆으로 순간이동해서 침 / 저주 카우: 거리를 두고 저주 + 지옥불 구슬 / 버서커: 예고 → 도약 내려찍기, 체력 절반 아래면 분노
//   악마 카우킹: 지옥문으로 임프 소환 + 지옥불 원 + 분노. 수치는 data/balance.js (IMP_/CURSER_/BERSERKER_/DKING_/HELLFIRE_)
import {
  IMP_BLINK_CD, IMP_BLINK_RANGE, IMP_BLINK_NEAR, CURSER_RANGE, CURSER_KITE, CURSER_CAST, CURSER_CURSE_CD, CURSER_ORB_CD, CURSER_ORB,
  BERSERKER_LEAP_MIN, BERSERKER_LEAP_MAX, BERSERKER_LEAP_CD, BERSERKER_TELEGRAPH, BERSERKER_LEAP_TIME, BERSERKER_SLAM_RADIUS, BERSERKER_SLAM_DAMAGE,
  BERSERKER_ENRAGE_HP, DEMON_ENRAGE_SPEED, DEMON_ENRAGE_DAMAGE, DEMON_ENRAGE_CD, DKING_SUMMON_CD, DKING_SUMMON_COUNT, DKING_MAX_IMPS,
  DKING_FIRE_CD, DKING_CAST, DKING_FIRE_COUNT, DKING_FIRE_SPREAD, DKING_ENRAGE_HP, CURSE_ORDER, CURSE_COLOR,
  DKING_NOVA_CD, DKING_NOVA_CAST, DKING_NOVA_RADIUS, DKING_NOVA_DAMAGE, DKING_NOVA_GAP, DKING_FIRE_COUNT_P2
} from '../data/balance.js';
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { killCow, hitPlayer } from '../systems/combat.js';
import { spawnHitParticles, spawnShockwave, floatText } from '../systems/fx.js';
import { spawnProjectile } from '../systems/projectiles.js';
import { applyCurse } from '../systems/curses.js';
import { spawnHellfire } from '../systems/demonSpells.js';
import { clampToPen } from '../world/arena.js';

const heroDist = (m) => Math.hypot(game.hero.x - m.x, game.hero.y - m.y);
const impsOf = (m) => game.cows.filter((c) => c.summoner === m && c.state !== 'dead').length + game.pendingSpawns.filter((p) => p.summoner === m).length;

// 분노 (버서커·킹): 체력이 ratio 이하가 되는 순간 한 번 - 이동·근접 피해 증가
function checkEnrage(m, ratio) {
  if (m.enraged || m.hp > m.maxHp * ratio) return;
  m.enraged = true;
  m.speed *= DEMON_ENRAGE_SPEED;
  m.dmg = Math.round(m.dmg * DEMON_ENRAGE_DAMAGE);
  floatText(m.x, m.y - 80 * m.scale, '분노!', '#ff3b30');
  spawnShockwave(m.x, m.y, 50 * m.scale, '#ff2d2d');
}

// 거리 유지 이동 (저주 카우): range 밖이면 다가가고 kite 안이면 물러남
function kite(m, dxP, dyP, distP, auraMult, range, near) {
  if (!game.hero.alive) return false;
  const sp = m.speed * auraMult / 60;
  if (distP > range && distP < m.aggroRange) { m.state = 'walk'; Body.setVelocity(m.body, { x: (dxP / distP) * sp, y: (dyP / distP) * sp }); if (Math.abs(dxP) > 1) m.facing = dxP > 0 ? 1 : -1; return true; }
  if (distP < near && distP > 0.001) { m.state = 'walk'; Body.setVelocity(m.body, { x: (-dxP / distP) * sp, y: (-dyP / distP) * sp }); m.facing = dxP > 0 ? -1 : 1; return true; }
  return false;
}

function castRing(ctx, m, t, p, color) { // 주문 중 발밑 원 (커지며 진해짐) + 도는 점
  const R = (18 + 22 * p) * Math.max(0.8, m.scale * 2.2);
  ctx.save();
  ctx.globalAlpha = 0.35 + p * 0.45;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(m.x, m.y + m.r * 0.5, R, R * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) { const a = -t * 4 + i * (Math.PI * 2 / 5); ctx.beginPath(); ctx.arc(m.x + Math.cos(a) * R, m.y + m.r * 0.5 + Math.sin(a) * R * 0.5, 2.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

export const demonBehaviors = {
  // 임프 카우 - 짧게 순간이동해 주인공 옆에 붙음 (그다음은 일반 근접)
  imp: {
    init(m) { m.blinkCd = 0.5 + Math.random() * 1.5; },
    update(m, dt) {
      m.blinkCd -= dt;
      const d = heroDist(m);
      if (m.blinkCd <= 0 && game.hero.alive && d < IMP_BLINK_RANGE && d > IMP_BLINK_NEAR + 30) {
        m.blinkCd = IMP_BLINK_CD * (0.7 + Math.random() * 0.6);
        const a = Math.random() * Math.PI * 2;
        const p = clampToPen(game.hero.x + Math.cos(a) * IMP_BLINK_NEAR, game.hero.y + Math.sin(a) * IMP_BLINK_NEAR, m.r + 6);
        spawnHitParticles(m.x, m.y - 20, '#b04dff', 8);
        Body.setPosition(m.body, p); Body.setVelocity(m.body, { x: 0, y: 0 });
        m.x = p.x; m.y = p.y;
        spawnHitParticles(p.x, p.y - 20, '#d98bff', 8);
      }
      return false;
    }
  },

  // 악마 저주 카우 - 거리를 두고 주문으로 저주(받는 피해↑ / 느려짐 / 스킬 대기↑ 중 하나), 사이사이 지옥불 구슬. 죽으면 그 저주가 풀림(systems/curses.js)
  demonCurser: {
    ranged: true,
    init(m) { m.curseCd = 1.5; m.orbCd = 1; },
    interrupt(m) { if (m.state === 'casting') m.curseCd = CURSER_CURSE_CD * 0.5; },
    update(m, dt) {
      m.curseCd -= dt; m.orbCd -= dt;
      if (m.state === 'casting') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (m.stateElapsed >= CURSER_CAST) {
          if (game.hero.alive && heroDist(m) <= CURSER_RANGE + 60) applyCurse(CURSE_ORDER[Math.floor(Math.random() * CURSE_ORDER.length)], m);
          m.setState('idle', 0.3);
        }
        return true;
      }
      if (!game.hero.alive) return false;
      const d = heroDist(m);
      if (m.curseCd <= 0 && d <= CURSER_RANGE) { m.curseCd = CURSER_CURSE_CD; m.setState('casting', 0); Body.setVelocity(m.body, { x: 0, y: 0 }); return true; }
      if (m.orbCd <= 0 && d <= CURSER_RANGE) {
        m.orbCd = CURSER_ORB_CD;
        const oy = m.y - 40 * m.scale, dd = Math.hypot(game.hero.x - m.x, game.hero.y - oy) || 1;
        spawnProjectile({ kind: 'hellorb', x: m.x, y: oy, dirX: (game.hero.x - m.x) / dd, dirY: (game.hero.y - oy) / dd, speed: CURSER_ORB.speed, range: CURSER_RANGE + 100, radius: CURSER_ORB.radius, packet: { fire: CURSER_ORB.damage }, color: CURSE_COLOR });
      }
      return false;
    },
    steer(m, dxP, dyP, distP, auraMult) { return kite(m, dxP, dyP, distP, auraMult, CURSER_RANGE, CURSER_KITE); },
    drawUnder(m, ctx, t) { if (m.state === 'casting') castRing(ctx, m, t, Math.min(1, m.stateElapsed / CURSER_CAST), CURSE_COLOR); }
  },

  // 악마 버서커 카우 - 떨어질 자리에 붉은 원(예고) → 도약해 내려찍기, 체력 절반 아래면 분노(빨라지고 세짐, 도약도 잦아짐)
  demonBerserker: {
    init(m) { m.leapCd = 1.5; },
    interrupt(m) { if (m.state === 'leapPrep' || m.state === 'leaping') m.leapCd = BERSERKER_LEAP_CD; },
    update(m, dt) {
      checkEnrage(m, BERSERKER_ENRAGE_HP);
      m.leapCd -= dt;
      if (m.state === 'leapPrep') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (m.stateElapsed >= BERSERKER_TELEGRAPH) { m.state = 'leaping'; m.stateElapsed = 0; m.leapFrom = { x: m.x, y: m.y }; }
        return true;
      }
      if (m.state === 'leaping') {
        m.stateElapsed += dt;
        const k = Math.min(1, m.stateElapsed / BERSERKER_LEAP_TIME);
        const nx = m.leapFrom.x + (m.leapTo.x - m.leapFrom.x) * k, ny = m.leapFrom.y + (m.leapTo.y - m.leapFrom.y) * k;
        Body.setPosition(m.body, { x: nx, y: ny }); Body.setVelocity(m.body, { x: 0, y: 0 });
        m.x = nx; m.y = ny;
        if (k >= 1) {
          spawnShockwave(m.x, m.y, BERSERKER_SLAM_RADIUS + 10, '#ff2d2d');
          spawnHitParticles(m.x, m.y, '#8a1414', 12);
          game.shake = Math.min(game.shake + 6, 12);
          if (game.hero.alive && Math.hypot(game.hero.x - m.x, game.hero.y - m.y) <= BERSERKER_SLAM_RADIUS + game.hero.r * 0.5) {
            hitPlayer(m.x, m.y, Math.round(BERSERKER_SLAM_DAMAGE * (m.enraged ? DEMON_ENRAGE_DAMAGE : 1)));
          }
          m.leapCd = BERSERKER_LEAP_CD * (m.enraged ? DEMON_ENRAGE_CD : 1);
          m.setState('idle', 0.35);
        }
        return true;
      }
      const d = heroDist(m);
      if (m.leapCd <= 0 && game.hero.alive && d >= BERSERKER_LEAP_MIN && d <= BERSERKER_LEAP_MAX) {
        m.leapTo = clampToPen(game.hero.x, game.hero.y, m.r + 6); // 예고 순간의 주인공 자리 (움직이면 피함)
        if (Math.abs(game.hero.x - m.x) > 1) m.facing = game.hero.x > m.x ? 1 : -1;
        m.setState('leapPrep', 0);
        Body.setVelocity(m.body, { x: 0, y: 0 });
        return true;
      }
      return false;
    },
    drawUnder(m, ctx, t) {
      ctx.save();
      if (m.state === 'leapPrep' || m.state === 'leaping') { // 떨어질 자리
        const p = m.state === 'leaping' ? 1 : Math.min(1, m.stateElapsed / BERSERKER_TELEGRAPH);
        ctx.globalAlpha = 0.2 + p * 0.3;
        ctx.fillStyle = '#ff2d2d';
        ctx.beginPath(); ctx.ellipse(m.leapTo.x, m.leapTo.y, BERSERKER_SLAM_RADIUS * p, BERSERKER_SLAM_RADIUS * p * 0.62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = '#ff8a75';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(m.leapTo.x, m.leapTo.y, BERSERKER_SLAM_RADIUS, BERSERKER_SLAM_RADIUS * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (m.enraged) { // 분노: 발밑 붉은 기운
        ctx.globalAlpha = 0.35 + Math.sin(t * 10) * 0.15;
        ctx.strokeStyle = '#ff2d2d';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(m.x, m.y + m.r * 0.4, m.r * 1.3, m.r * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
  },

  // 악마 카우킹 - 근접 + ① 지옥문(임프 소환) ② 지옥불 원(주인공 자리 + 주변) ③ 지옥 폭발(몸 둘레 큰 원 예고 → 주변 전체 화염)
  //   체력 절반 아래면 분노: 날개를 펴고 빨라짐, 마법이 잦아짐, 지옥불 원 5개, 지옥 폭발 2연속
  demonKing: {
    init(m) { m.summonCd = 2; m.fireCd = 3.5; m.novaCd = 6; },
    update(m, dt) {
      checkEnrage(m, DKING_ENRAGE_HP);
      const cdMul = m.enraged ? DEMON_ENRAGE_CD : 1;
      m.summonCd -= dt; m.fireCd -= dt; m.novaCd -= dt;
      if (m.state === 'nova') { // 지옥 폭발: 예고가 차면 터짐 (분노면 한 번 더)
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (m.stateElapsed >= DKING_NOVA_CAST) {
          spawnShockwave(m.x, m.y, DKING_NOVA_RADIUS, '#b04dff');
          spawnShockwave(m.x, m.y, DKING_NOVA_RADIUS * 0.7, '#ff5a1e');
          spawnHitParticles(m.x, m.y, '#d98bff', 18);
          game.shake = Math.min(game.shake + 9, 12);
          game.impactFlash = Math.max(game.impactFlash, 0.12);
          if (game.hero.alive && heroDist(m) <= DKING_NOVA_RADIUS + game.hero.r * 0.5) hitPlayer(m.x, m.y, { fire: DKING_NOVA_DAMAGE });
          m.novaLeft--;
          if (m.novaLeft > 0) m.stateElapsed = DKING_NOVA_CAST - DKING_NOVA_GAP; // 짧은 예고 뒤 한 번 더
          else m.setState('idle', 0.4);
        }
        return true;
      }
      if (m.state === 'casting') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (m.stateElapsed >= DKING_CAST) {
          const hx = game.hero.x, hy = game.hero.y;
          spawnHellfire(hx, hy);
          const count = m.enraged ? DKING_FIRE_COUNT_P2 : DKING_FIRE_COUNT;
          for (let i = 1; i < count; i++) {
            const a = Math.random() * Math.PI * 2, r = DKING_FIRE_SPREAD * (0.5 + Math.random() * 0.5);
            const p = clampToPen(hx + Math.cos(a) * r, hy + Math.sin(a) * r, 20);
            spawnHellfire(p.x, p.y);
          }
          m.setState('idle', 0.3);
        }
        return true;
      }
      if (!game.hero.alive) return false;
      const d = heroDist(m);
      if (m.summonCd <= 0 && d < m.aggroRange && impsOf(m) < DKING_MAX_IMPS) { // 지옥문 → 임프
        m.summonCd = DKING_SUMMON_CD * cdMul;
        const n = Math.min(DKING_SUMMON_COUNT, DKING_MAX_IMPS - impsOf(m));
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, r = m.r + 40 + Math.random() * 30;
          const x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r;
          game.pendingSpawns.push({ kind: 'imp', x, y, summoner: m });
          spawnShockwave(x, y, 30, '#b04dff'); // 지옥문이 열렸다 닫힘
          spawnHitParticles(x, y - 10, '#d98bff', 8);
        }
      }
      if (m.novaCd <= 0 && d < DKING_NOVA_RADIUS * 1.6) { m.novaCd = DKING_NOVA_CD * cdMul; m.novaLeft = m.enraged ? 2 : 1; m.setState('nova', 0); Body.setVelocity(m.body, { x: 0, y: 0 }); return true; }
      if (m.fireCd <= 0 && d < m.aggroRange) { m.fireCd = DKING_FIRE_CD * cdMul; m.setState('casting', 0); Body.setVelocity(m.body, { x: 0, y: 0 }); return true; }
      return false;
    },
    onDeath(m) {
      game.cows.forEach((c) => { if (c.summoner === m && c.state !== 'dead') killCow(c); }); // 부른 임프도 사라짐
      return false;
    },
    drawUnder(m, ctx, t) {
      if (m.state === 'casting') castRing(ctx, m, t, Math.min(1, m.stateElapsed / DKING_CAST), '#ff5ad8');
      if (m.state === 'nova') { // 지옥 폭발 예고: 안에서부터 차오르는 보라 원 + 깜빡이는 테두리
        const p = Math.min(1, m.stateElapsed / DKING_NOVA_CAST);
        ctx.save();
        ctx.globalAlpha = 0.15 + p * 0.3;
        ctx.fillStyle = '#7a1a8a';
        ctx.beginPath(); ctx.ellipse(m.x, m.y, DKING_NOVA_RADIUS * p, DKING_NOVA_RADIUS * p * 0.62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.6 + Math.sin(t * 24) * 0.3;
        ctx.strokeStyle = '#d98bff';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(m.x, m.y, DKING_NOVA_RADIUS, DKING_NOVA_RADIUS * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      if (m.enraged) {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(t * 8) * 0.12;
        ctx.strokeStyle = '#ff2d55';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(m.x, m.y + m.r * 0.4, m.r * 1.2, m.r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }
};
