// 몬스터 공통 이동 규칙 (2026-10-12 사용자 결정: 반복되던 거리 유지 코드를 한 곳으로, 숫자는 data/balance.js MONSTER_MOVE)
//   keep  거리 유지(상황형): near보다 가까우면 주인공을 보며 물러나고, far보다 멀면(어그로 안) 다가감, 그 사이면 공통 AI에 맡김
//   hide  수비형: flee 안이면 도망, 평소엔 seek 안 아군 무리의 가운데에서 주인공 반대쪽 behind만큼 뒤에 숨음, 근접 공격 안 함
//   Monster.update가 종류별 steer 다음에 부름 (특별한 움직임 - 영혼 곡선·도살자 돌진 등 - 은 종류별 행동이 먼저)
import { Body } from '../core/physics.js';
import { game } from '../state.js';

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
