// 카우킹(게임 최종 보스) 행동 훅 - behaviors.js의 behaviors에 합쳐짐 (훅 규칙은 behaviors.js 맨 위)
//   기술 3개를 차례로(BOSS_PATTERN, 사이 BOSS_SKILL_GAP초): ① 대지 강타(안쪽부터 고리 구역이 차례로 터짐 - 터진 안쪽으로 들어가면 피함)
//   ② 황소 돌진(예고선 → 돌진, 맞으면 크게 밀려남, 벽에 부딪히면 카우킹이 잠깐 멍해짐 = 공격할 틈) ③ 무리의 함성(일반 카우 소환 + 주변 카우 흥분)
//   체력 BOSS_PHASE2_HP 이하면 2단계: 강타 구역 3겹, 돌진 2연속. 보스라 CC 면역 (systems/cc.js). 수치는 data/balance.js BOSS_*
import {
  BOSS_SKILL_GAP, BOSS_PATTERN, BOSS_PHASE2_HP, BOSS_SKILL_RANGE, BOSS_SLAM_DAMAGE, BOSS_SLAM_TELEGRAPH, BOSS_SLAM_ZONES, BOSS_SLAM_ZONE_GAP,
  BOSS_CHARGE_TELEGRAPH, BOSS_CHARGE_TELEGRAPH2, BOSS_CHARGE_DIST, BOSS_CHARGE_TIME, BOSS_CHARGE_DAMAGE, BOSS_CHARGE_WIDTH, BOSS_CHARGE_KNOCK,
  BOSS_DAZE, BOSS_HERD_CAST, BOSS_HERD_COUNT, BOSS_HERD_RADIUS, BOSS_EXCITE_TIME
} from '../data/balance.js';
import { getHitPoint } from '../util.js';
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { recordRun } from '../save.js';
import { hitPlayer } from '../systems/combat.js';
import { spawnHitParticles, spawnShockwave, floatText } from '../systems/fx.js';
import { dropLoot } from '../systems/loot.js';
import { applyKnockback } from './actor.js';
import { clampToPen } from '../world/arena.js';

const zoneCount = (m) => (m.phase2 ? BOSS_SLAM_ZONES.length : BOSS_SLAM_ZONES.length - 1);
const stop = (m) => Body.setVelocity(m.body, { x: 0, y: 0 });

function startCharge(m, telegraph) {
  const ang = Math.atan2(game.hero.y - m.y, game.hero.x - m.x);
  const want = { x: m.x + Math.cos(ang) * BOSS_CHARGE_DIST, y: m.y + Math.sin(ang) * BOSS_CHARGE_DIST };
  m.chargeTarget = clampToPen(want.x, want.y, m.r + 6);
  m.chargeWall = Math.hypot(m.chargeTarget.x - want.x, m.chargeTarget.y - want.y) > 4; // 벽에서 멈춤 → 멍해짐
  m.chargeTelegraph = telegraph;
  m.facing = Math.cos(ang) >= 0 ? 1 : -1;
  m.setState('chargePrep', 0);
  stop(m);
}

export const bossBehaviors = {
  boss: {
    init(m) { m.skillGap = 2.5; m.patternI = 0; m.phase2 = false; },
    update(m, dt) {
      if (!m.phase2 && m.hp <= m.maxHp * BOSS_PHASE2_HP) { // 2단계
        m.phase2 = true;
        floatText(m.x, m.y - 90 * m.scale, '분노!', '#ff3b30');
        spawnShockwave(m.x, m.y, 60 * m.scale, '#ff2d55');
        game.shake = Math.min(game.shake + 6, 12);
      }
      if (m.state === 'dazed') { // 벽에 부딪혀 멍함 - 공격할 틈
        stop(m); m.stateElapsed += dt;
        if (m.stateElapsed >= BOSS_DAZE) m.setState('idle', 0.2);
        return true;
      }
      if (m.state === 'slamPrep') { // 대지 강타: 안쪽 구역부터 차례로 터짐
        stop(m); m.stateElapsed += dt;
        for (let i = 0; i < zoneCount(m); i++) {
          if (m.slamBurst[i] || m.stateElapsed < BOSS_SLAM_TELEGRAPH + i * BOSS_SLAM_ZONE_GAP) continue;
          m.slamBurst[i] = true;
          const inner = i ? BOSS_SLAM_ZONES[i - 1] : 0, outer = BOSS_SLAM_ZONES[i];
          spawnShockwave(m.x, m.y, outer, '#b57bd6');
          game.shake = Math.min(game.shake + 5, 12);
          const d = Math.hypot(game.hero.x - m.x, game.hero.y - m.y), hr = game.hero.r * 0.5;
          if (game.hero.alive && d >= inner - hr && d <= outer + hr) hitPlayer(m.x, m.y, BOSS_SLAM_DAMAGE);
        }
        if (m.stateElapsed >= BOSS_SLAM_TELEGRAPH + (zoneCount(m) - 1) * BOSS_SLAM_ZONE_GAP + 0.25) { m.setState('idle', 0.2); m.skillGap = BOSS_SKILL_GAP; }
        return true;
      }
      if (m.state === 'chargePrep') {
        stop(m); m.stateElapsed += dt;
        if (m.stateElapsed >= m.chargeTelegraph) { m.state = 'bossCharging'; m.stateElapsed = 0; m.chargeFrom = { x: m.x, y: m.y }; m.chargeHit = false; }
        return true;
      }
      if (m.state === 'bossCharging') {
        m.stateElapsed += dt;
        const k = Math.min(1, m.stateElapsed / BOSS_CHARGE_TIME);
        const nx = m.chargeFrom.x + (m.chargeTarget.x - m.chargeFrom.x) * k, ny = m.chargeFrom.y + (m.chargeTarget.y - m.chargeFrom.y) * k;
        Body.setPosition(m.body, { x: nx, y: ny }); stop(m);
        m.x = nx; m.y = ny;
        if (!m.chargeHit && game.hero.alive && Math.hypot(game.hero.x - nx, game.hero.y - ny) < BOSS_CHARGE_WIDTH + m.r * 0.5) {
          m.chargeHit = true;
          hitPlayer(nx, ny, BOSS_CHARGE_DAMAGE);
          applyKnockback(game.hero.body, nx, ny, BOSS_CHARGE_KNOCK); // 크게 밀려남
        }
        if (k >= 1) {
          if (m.chargeWall) {
            spawnShockwave(m.x, m.y, 50 * m.scale, '#ffffff');
            spawnHitParticles(m.x, m.y, '#c9b48a', 14);
            game.shake = Math.min(game.shake + 8, 12);
            floatText(m.x, m.y - 80 * m.scale, '쿵!', '#ffffff');
            m.setState('dazed', 0);
            m.skillGap = BOSS_SKILL_GAP;
          } else if (m.phase2 && !m.secondCharge) { // 2단계: 한 번 더
            m.secondCharge = true;
            startCharge(m, BOSS_CHARGE_TELEGRAPH2);
          } else { m.setState('idle', 0.3); m.skillGap = BOSS_SKILL_GAP; }
        }
        return true;
      }
      if (m.state === 'roar') { // 무리의 함성
        stop(m); m.stateElapsed += dt;
        if (m.stateElapsed >= BOSS_HERD_CAST) {
          spawnShockwave(m.x, m.y, BOSS_HERD_RADIUS, '#ff5b4d');
          game.shake = Math.min(game.shake + 5, 12);
          for (let i = 0; i < BOSS_HERD_COUNT; i++) {
            const a = (i / BOSS_HERD_COUNT) * Math.PI * 2 + Math.random() * 0.6, r = m.r + 50 + Math.random() * 40;
            game.pendingSpawns.push({ kind: 'normal', x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r, summoner: m });
          }
          game.cows.forEach((c) => { if (c !== m && c.state !== 'dead' && Math.hypot(c.x - m.x, c.y - m.y) <= BOSS_HERD_RADIUS) c.excitedTimer = BOSS_EXCITE_TIME; });
          m.setState('idle', 0.3);
          m.skillGap = BOSS_SKILL_GAP;
        }
        return true;
      }
      m.skillGap -= dt;
      if (m.skillGap <= 0 && game.hero.alive && Math.hypot(game.hero.x - m.x, game.hero.y - m.y) < BOSS_SKILL_RANGE) {
        const sk = BOSS_PATTERN[m.patternI++ % BOSS_PATTERN.length];
        if (sk === 'slam') { m.slamBurst = []; m.setState('slamPrep', 0); }
        else if (sk === 'charge') { m.secondCharge = false; startCharge(m, BOSS_CHARGE_TELEGRAPH); }
        else { m.setState('roar', 0); floatText(m.x, m.y - 90 * m.scale, '음머어어!', '#ff8a75'); }
        stop(m);
        return true;
      }
      return false;
    },
    onDeath(m) {
      game.gameState = 'victory';
      recordRun('victory');
      game.shake = Math.min(game.shake + 12, 12);
      spawnShockwave(m.x, m.y, 220, '#c98bef');
      dropLoot(m.x, m.y, 'boss', 4, m.level);
      return true;
    },
    // 예고: 강타 = 아직 안 터진 구역(보라 띠, 다음 차례가 더 진함) / 돌진 = 흰 예고선 / 함성 = 커지는 붉은 고리 (난수 없음)
    drawUnder(m, ctx, t) {
      ctx.save();
      if (m.state === 'slamPrep') {
        for (let i = 0; i < zoneCount(m); i++) {
          if (m.slamBurst[i]) continue;
          const inner = i ? BOSS_SLAM_ZONES[i - 1] : 0, outer = BOSS_SLAM_ZONES[i];
          const next = i === m.slamBurst.filter(Boolean).length; // 다음에 터질 구역
          ctx.globalAlpha = (next ? 0.32 : 0.14) + Math.sin(t * 16) * 0.05;
          ctx.fillStyle = '#9b4dd6';
          ctx.beginPath();
          ctx.ellipse(m.x, m.y, outer, outer * 0.62, 0, 0, Math.PI * 2);
          if (inner) ctx.ellipse(m.x, m.y, inner, inner * 0.62, 0, 0, Math.PI * 2, true);
          ctx.fill('evenodd');
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = '#e0b8ff';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(m.x, m.y, outer, outer * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (m.state === 'chargePrep') {
        const dx = m.chargeTarget.x - m.x, dy = m.chargeTarget.y - m.y;
        ctx.translate(m.x, m.y);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.globalAlpha = 0.3 + Math.sin(t * 22) * 0.15;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -BOSS_CHARGE_WIDTH, Math.hypot(dx, dy), BOSS_CHARGE_WIDTH * 2);
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, -BOSS_CHARGE_WIDTH, Math.hypot(dx, dy), BOSS_CHARGE_WIDTH * 2);
      } else if (m.state === 'roar') {
        const p = Math.min(1, m.stateElapsed / BOSS_HERD_CAST);
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#ff5b4d';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(m.x, m.y, BOSS_HERD_RADIUS * p, BOSS_HERD_RADIUS * p * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (m.phase2) { // 2단계: 발밑 붉은 기운
        ctx.restore(); ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(t * 8) * 0.12;
        ctx.strokeStyle = '#ff2d55';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(m.x, m.y + m.r * 0.4, m.r * 1.2, m.r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    },
    drawOver(m, ctx, t, style) {
      const wp = getHitPoint(m);
      const gemR = 9 + Math.sin(t * 5) * 2;

      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(t * 5) * 0.08;
      ctx.fillStyle = '#4dfff0';
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, gemR * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(wp.x, wp.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#4dfff0';
      ctx.fillRect(-gemR, -gemR, gemR * 2, gemR * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-gemR, -gemR, gemR * 2, gemR * 2);
      ctx.restore();

      const w = 74;
      const barY = m.y - 34 * m.scale - 96;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(m.x - w / 2, barY, w, 8);
      ctx.fillStyle = style.ring;
      ctx.fillRect(m.x - w / 2, barY, w * (m.hp / m.maxHp), 8);
    }
  }
};
