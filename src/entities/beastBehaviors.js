// 짐승 행동 훅 (2026-10-13 사용자: 다양성 - 소가 아닌 몬스터) - behaviors.js의 behaviors에 합쳐짐 (훅 규칙은 behaviors.js 맨 위)
//   쥐떼 카우(ratKeeper): 거리를 두고(MONSTER_MOVE) 주문 → 작은 악마 쥐 한 부대(rows × cols 대형)를 부름
//   악마 쥐(rat): 부대는 기준점(squad) 하나를 따라 대형을 지키며 행군 → 주인공에게 가까워지면(breakDist) 대형을 풀고 각자 덤빔(공통 AI)
//   박치기 뱀(snake): 똬리(coil) → 튕기듯 박치기 돌진 → 빗나가면 지나간 뒤 휘돌아(turn) 한 번 더 돌진 → 숨 고르기
// 수치는 data/balance.js RAT_SQUAD / SNAKE, 그림은 render/beastSprites.js
import { RAT_SQUAD, SNAKE } from '../data/balance.js';
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { hitPlayer } from '../systems/combat.js';
import { spawnHitParticles, spawnShockwave } from '../systems/fx.js';
import { clampToPen, obstacleAt } from '../world/arena.js';

const stop = (m) => Body.setVelocity(m.body, { x: 0, y: 0 });
const ratsOf = (m) => game.cows.filter((c) => c.kind === 'rat' && c.summoner === m && c.state !== 'dead').length;

// 부대 기준점 갱신 (살아 있는 첫 쥐가 틱마다 한 번): 주인공 쪽으로 행군, 가까워지거나 줄어들거나 오래되면 대형을 풂
function updateSquad(sq, leader, auraMult) {
  const alive = sq.members.filter((c) => c.state !== 'dead');
  if (alive[0] !== leader) return;
  sq.age += 1 / 60;
  const h = game.hero, dx = h.x - sq.x, dy = h.y - sq.y, d = Math.hypot(dx, dy) || 1;
  if (d < RAT_SQUAD.breakDist || alive.length <= RAT_SQUAD.breakBelow || sq.age > RAT_SQUAD.maxMarch || !h.alive) { sq.broken = true; return; }
  sq.dirX = dx / d; sq.dirY = dy / d;
  const step = leader.speed * auraMult * RAT_SQUAD.marchMul / 60;
  const p = clampToPen(sq.x + sq.dirX * step, sq.y + sq.dirY * step, 30);
  sq.x = p.x; sq.y = p.y;
}

export const beastBehaviors = {
  ratKeeper: {
    init(m) { m.summonCd = RAT_SQUAD.firstCd; },
    interrupt(m) { if (m.state === 'casting') m.summonCd = RAT_SQUAD.cooldown * 0.5; },
    update(m, dt) {
      m.summonCd -= dt;
      if (m.state === 'casting') {
        m.stateElapsed += dt;
        stop(m);
        if (m.stateElapsed >= RAT_SQUAD.castTime) {
          // 부대: 주인공 쪽을 보고 cols × rows 대형으로 내 앞에
          const h = game.hero, dx = h.x - m.x, dy = h.y - m.y, d = Math.hypot(dx, dy) || 1;
          const sq = { x: m.x + (dx / d) * RAT_SQUAD.ahead, y: m.y + (dy / d) * RAT_SQUAD.ahead, dirX: dx / d, dirY: dy / d, age: 0, broken: false, members: [] };
          for (let row = 0; row < RAT_SQUAD.rows; row++) {
            for (let col = 0; col < RAT_SQUAD.cols; col++) {
              const ox = (col - (RAT_SQUAD.cols - 1) / 2) * RAT_SQUAD.spacing, oy = row * RAT_SQUAD.spacing;
              const x = sq.x - sq.dirY * ox - sq.dirX * oy, y = sq.y + sq.dirX * ox - sq.dirY * oy;
              game.pendingSpawns.push({ kind: 'rat', x, y, summoner: m, squad: sq, props: { slot: { ox, oy } } });
            }
          }
          spawnShockwave(sq.x, sq.y, 50, '#b0483a');
          spawnHitParticles(sq.x, sq.y, '#5a2a24', 12);
          m.setState('idle', 0.3);
        }
        return true;
      }
      if (!game.hero.alive) return false;
      const dist = Math.hypot(game.hero.x - m.x, game.hero.y - m.y);
      if (m.summonCd <= 0 && dist < m.aggroRange && ratsOf(m) <= RAT_SQUAD.maxAlive - RAT_SQUAD.rows * RAT_SQUAD.cols) {
        m.summonCd = RAT_SQUAD.cooldown;
        m.setState('casting', 0);
        stop(m);
        return true;
      }
      return false;
    }
  },

  rat: {
    // 대형 행군: 기준점 + 내 자리(slot: 옆 ox, 뒤 oy)로 - 대형이 풀리면 공통 AI(쫓아가 물기)
    steer(m, dxP, dyP, distP, auraMult) {
      const sq = m.squad;
      if (!sq || sq.broken || !m.slot) return false;
      updateSquad(sq, m, auraMult);
      if (sq.broken) return false;
      const tx = sq.x - sq.dirY * m.slot.ox - sq.dirX * m.slot.oy, ty = sq.y + sq.dirX * m.slot.ox - sq.dirY * m.slot.oy;
      const vx = tx - m.x, vy = ty - m.y, d = Math.hypot(vx, vy);
      const max = m.speed * auraMult * RAT_SQUAD.catchUpMul / 60;
      const sp = Math.min(max, d * 0.25); // 자리에 가까우면 느리게 (덜 떨림)
      m.state = 'walk';
      Body.setVelocity(m.body, d > 1 ? { x: (vx / d) * sp, y: (vy / d) * sp } : { x: 0, y: 0 });
      if (Math.abs(sq.dirX) > 0.1) m.facing = sq.dirX > 0 ? 1 : -1;
      return true;
    }
  },

  snake: {
    init(m) { m.dashCd = SNAKE.firstCd + Math.random(); m.heading = m.facing > 0 ? 0 : Math.PI; m.trail = []; },
    interrupt(m) { if (['coil', 'strike', 'turn'].includes(m.state)) { m.dashCd = SNAKE.cooldown; stop(m); } },
    update(m, dt) {
      // 몸 자취 (그림이 따라 그림) + 기어갈 때 머리 방향
      const v = m.body.velocity;
      if (m.state === 'walk' && Math.hypot(v.x, v.y) > 0.3) { // 머리는 이동 방향으로 서서히
        let d = Math.atan2(v.y, v.x) - m.heading;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        m.heading += d * SNAKE.headTurn;
      }
      const last = m.trail[0];
      if (!last || Math.hypot(last.x - m.x, last.y - m.y) >= SNAKE.trailStep) { m.trail.unshift({ x: m.x, y: m.y }); if (m.trail.length > SNAKE.trailLen) m.trail.pop(); }
      if (m.dashCd > 0) m.dashCd -= dt;
      const h = game.hero;
      if (m.state === 'attack') { // 근접 공격 중엔 주인공 쪽으로 머리를 돌림
        let d = Math.atan2(h.y - m.y, h.x - m.x) - m.heading;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        m.heading += d * SNAKE.headTurn * 2;
      }

      if (m.state === 'coil') { // 똬리 - 멈춰서 주인공을 겨눔
        m.stateElapsed += dt;
        stop(m);
        m.heading = Math.atan2(h.y - m.y, h.x - m.x);
        if (m.stateElapsed >= SNAKE.coilTime) startStrike(m, 1);
        return true;
      }
      if (m.state === 'strike') { // 박치기 돌진
        m.stateElapsed += dt;
        const step = SNAKE.dashSpeed * dt;
        const wx = m.x + Math.cos(m.heading) * step, wy = m.y + Math.sin(m.heading) * step;
        const p = clampToPen(wx, wy, m.r + 4);
        const blocked = Math.hypot(p.x - wx, p.y - wy) > 1 || obstacleAt(wx, wy, m.r * 0.5); // 벽·구조물
        Body.setPosition(m.body, p); stop(m); m.x = p.x; m.y = p.y;
        m.dashLeft -= step;
        if (!m.dashHit && h.alive && Math.hypot(h.x - m.x, h.y - m.y) < SNAKE.hitWidth + m.r * 0.5) {
          m.dashHit = true;
          hitPlayer(m.x, m.y, Math.round(m.dmg * SNAKE.dmgMul));
          spawnHitParticles(h.x, h.y, '#9be35a', 8);
        }
        if (m.dashLeft <= 0 || blocked) {
          if (!m.dashHit && m.dashNo === 1 && !blocked) { m.setState('turn', 0); m.turnFrom = m.heading; }
          else { m.setState('recover', 0); m.dashCd = SNAKE.cooldown; }
        }
        return true;
      }
      if (m.state === 'turn') { // 빗나감 → 지나간 뒤 크게 휘돌아 다시 주인공을 겨눔 (돌면서 앞으로 미끄러짐)
        m.stateElapsed += dt;
        const k = Math.min(1, m.stateElapsed / SNAKE.turnTime);
        const want = Math.atan2(h.y - m.y, h.x - m.x);
        let diff = want - m.turnFrom;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        m.heading = m.turnFrom + diff * k;
        const step = SNAKE.turnSpeed * (1 - k) * dt;
        const p = clampToPen(m.x + Math.cos(m.heading) * step, m.y + Math.sin(m.heading) * step, m.r + 4);
        Body.setPosition(m.body, p); stop(m); m.x = p.x; m.y = p.y;
        if (k >= 1) startStrike(m, 2);
        return true;
      }
      if (m.state === 'recover') {
        m.stateElapsed += dt;
        stop(m);
        if (m.stateElapsed >= SNAKE.recover) m.setState('idle', 0.2);
        return true;
      }
      if (m.dashCd <= 0 && h.alive) {
        const d = Math.hypot(h.x - m.x, h.y - m.y);
        if (d <= SNAKE.range && d > SNAKE.minRange) { m.setState('coil', 0); stop(m); return true; }
      }
      return false;
    },
    drawUnder(m, ctx) {
      if (m.state !== 'coil') return;
      const k = Math.min(1, m.stateElapsed / SNAKE.coilTime); // 돌진 예고선
      ctx.save();
      ctx.globalAlpha = 0.25 + k * 0.35;
      ctx.strokeStyle = '#c6ff4d';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 7]);
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + Math.cos(m.heading) * SNAKE.dashDist, m.y + Math.sin(m.heading) * SNAKE.dashDist); ctx.stroke();
      ctx.restore();
    }
  }
};

function startStrike(m, no) {
  m.setState('strike', 0);
  m.dashNo = no;
  m.dashHit = false;
  m.dashLeft = no === 1 ? SNAKE.dashDist : SNAKE.dash2Dist;
  if (Math.abs(Math.cos(m.heading)) > 0.1) m.facing = Math.cos(m.heading) > 0 ? 1 : -1;
}
