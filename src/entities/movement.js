// 몬스터 공통 이동 규칙 (2026-10-12 사용자 결정: 반복되던 거리 유지 코드를 한 곳으로, 숫자는 data/balance.js MONSTER_MOVE)
//   keep  거리 유지(상황형): near보다 가까우면 주인공을 보며 물러나고, far보다 멀면(어그로 안) 다가감, 그 사이면 공통 AI에 맡김
//   hide  수비형: flee 안이면 도망, 평소엔 seek 안 아군 무리의 가운데에서 주인공 반대쪽 behind만큼 뒤에 숨음, 근접 공격 안 함
//   Monster.update가 종류별 steer 다음에 부름 (특별한 움직임 - 영혼 곡선·도살자 돌진 등 - 은 종류별 행동이 먼저)
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { MELEE_SOCKETS, MONSTER_MOVE } from '../data/balance.js';
import { MONSTERS } from '../data/monsters.js';
import { PEN, obstacleAt } from '../world/arena.js';

const go = (m, vx, vy, sp) => { m.state = 'walk'; Body.setVelocity(m.body, { x: vx * sp, y: vy * sp }); };

// 반환: 이번 틱 이동을 정했는지
export function moveByRule(m, rule, dxP, dyP, distP, auraMult) {
  if (!game.hero.alive) return false;
  const sp = m.speed * auraMult / 60;
  if (rule.type === 'keep') {
    if (distP > rule.far && distP < m.aggroRange) { // 사거리 밖이면 다가감
      go(m, dxP / distP, dyP / distP, sp);
      if (Math.abs(dxP) > 1) m.facing = dxP > 0 ? 1 : -1;
      return true;
    }
    if (distP < rule.near && distP > 0.001) { // 너무 가까우면 물러남
      go(m, -dxP / distP, -dyP / distP, sp);
      m.facing = dxP > 0 ? -1 : 1;
      return true;
    }
    return false;
  }
  if (rule.type === 'hide') {
    let vx = 0, vy = 0;
    if (distP < rule.flee && distP > 0.001) { vx -= dxP / distP; vy -= dyP / distP; }
    const allies = game.cows.filter((c) => c !== m && c.state !== 'dead' && Math.hypot(c.x - m.x, c.y - m.y) <= rule.seek);
    if (allies.length) {
      const cx = allies.reduce((s, c) => s + c.x, 0) / allies.length, cy = allies.reduce((s, c) => s + c.y, 0) / allies.length;
      const hx = cx - game.hero.x, hy = cy - game.hero.y, hd = Math.hypot(hx, hy) || 1;
      const tx = cx + (hx / hd) * rule.behind - m.x, ty = cy + (hy / hd) * rule.behind - m.y, td = Math.hypot(tx, ty);
      if (td > 24) { vx += (tx / td) * 0.8; vy += (ty / td) * 0.8; }
    }
    const l = Math.hypot(vx, vy);
    if (l < 0.01) { Body.setVelocity(m.body, { x: 0, y: 0 }); m.state = 'idle'; return true; }
    go(m, vx / l, vy / l, sp);
    if (Math.abs(dxP) > 1) m.facing = dxP > 0 ? 1 : -1; // 주인공을 보며 물러남
    return true;
  }
  return false;
}

// 둘러싸기 자리(소켓) (2026-10-15 사용자: 적이 주인공 앞으로만 몰려옴 → 둘레 자리 중 가까운 빈자리로)
//   틱마다 한 번(game.js, 몬스터 갱신 전): 주인공 가까이(engage) 쫓아오는 근접 몬스터를 가까운 순서로, 각자 지금 방향에서 가장 가까운 빈자리에
//   안쪽 inner개(근접 거리) - 다 차면 바깥 outer개(대기, outerMul배 거리). 지금 자리면 keepBias만큼 유리(자리가 매 틱 바뀌지 않게)
//   대상: 근접으로 싸우는 몬스터만 (원거리·이동 규칙·보스·물체 제외). Monster.update는 미끼를 노릴 땐 안 씀
export function socketAngle(i) {
  const S = MELEE_SOCKETS;
  return i < S.inner ? (i / S.inner) * Math.PI * 2 : ((i - S.inner) / S.outer) * Math.PI * 2 + Math.PI / S.outer;
}
export function assignSockets(cows) {
  const S = MELEE_SOCKETS, h = game.hero;
  const cands = [];
  cows.forEach((c) => {
    c.socketIdx = null;
    if (!h.alive || c.state === 'dead') return;
    const def = MONSTERS[c.kind] || {};
    if (def.prop || def.boss || c.kind === 'boss' || MONSTER_MOVE[c.kind] || (c.behavior && c.behavior.ranged)) return;
    const d = Math.hypot(c.x - h.x, c.y - h.y);
    if (d < S.engage) cands.push({ c, d, a: Math.atan2(c.y - h.y, c.x - h.x) });
  });
  cands.sort((p, q) => p.d - q.d);
  const taken = new Array(S.inner + S.outer).fill(false);
  const diff = (a, b) => { let x = Math.abs(a - b) % (Math.PI * 2); return x > Math.PI ? Math.PI * 2 - x : x; };
  // 벽 밖·구조물 안인 자리는 못 감 (주인공이 맵 구석에 있을 때 - 2026-10-15 봇 보고서로 발견: 못 가는 자리를 받은 몬스터가 공격도 안 하고 맴돎)
  const reachable = (c, i) => {
    const r = c.meleeRange * (i < S.inner ? S.innerMul : S.outerMul), a = socketAngle(i);
    const x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r, m = c.r + 2;
    return x > PEN.x + m && y > PEN.y + m && x < PEN.x + PEN.size - m && y < PEN.y + PEN.size - m && !obstacleAt(x, y, c.r);
  };
  cands.forEach(({ c, a }) => {
    let best = -1, bestCost = Infinity;
    for (let ring = 0; ring < 2 && best < 0; ring++) {
      const from = ring ? S.inner : 0, to = ring ? S.inner + S.outer : S.inner;
      for (let i = from; i < to; i++) {
        if (taken[i] || !reachable(c, i)) continue;
        const cost = diff(a, socketAngle(i)) - (c.prevSocket === i ? S.keepBias : 0);
        if (cost < bestCost) { bestCost = cost; best = i; }
      }
    }
    if (best < 0) return;
    taken[best] = true;
    c.socketIdx = best; c.prevSocket = best;
  });
}
