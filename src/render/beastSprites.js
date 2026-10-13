// 짐승 그림 (2026-10-13 사용자): 작은 악마 쥐, 박치기 뱀 - 둘 다 심플한 실루엣 (몸이 지나온 자취를 따라 구불구불)
import { SNAKE } from '../data/balance.js';
// 상태는 읽기만 - 뱀 자취(m.trail)·머리 방향(m.heading)은 entities/beastBehaviors.js가 기록. 그라데이션·filter·난수 없음

// 기절 별 (작은 몸에 맞춘 크기 - monsterSprites.drawStunDots는 소 키 기준이라 따로)
function stunDots(ctx, x, y, animT, r) {
  ctx.fillStyle = '#e8dcc8';
  for (let i = 0; i < 3; i++) { const a = animT * 6 + (i * Math.PI * 2) / 3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 3, y + Math.sin(a) * r, r * 0.6, 0, Math.PI * 2); ctx.fill(); }
}

const WHITE = { body: '#ffffff', line: '#ffffff', eye: '#ffffff' };
// 검은 몸 + 흰 테두리(어두운 바닥에서도 보이게) + 붉은 눈 (2026-10-13 사용자)
export const RAT_COLORS = { body: '#141414', line: '#f2f2f2', eye: '#ff2a2a' };
export const SNAKE_COLORS = { body: '#141414', line: '#f2f2f2', eye: '#ff2a2a' };

// 쥐 (2026-10-13 사용자: 더 단순하게, 검은 몸·흰 테두리·붉은 눈, 콩콩 대신 스르륵): 눈물방울 실루엣 하나 + 꼬리 선 + 눈
export function drawRat(ctx, x, y, scale, animT, facing, state, flash = false) {
  const k = scale / 0.2, c = flash ? { ...RAT_COLORS, ...WHITE } : RAT_COLORS;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  if (state === 'attack') ctx.translate(4 * k, 0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = c.line; ctx.lineWidth = 1.5 * k; // 꼬리
  ctx.beginPath(); ctx.moveTo(-11 * k, -4 * k); ctx.quadraticCurveTo(-18 * k, -2 * k, -22 * k, -8 * k); ctx.stroke();
  ctx.fillStyle = c.body; // 몸 + 주둥이
  ctx.beginPath();
  ctx.moveTo(16 * k, -5 * k);
  ctx.quadraticCurveTo(4 * k, -15 * k, -7 * k, -12 * k);
  ctx.quadraticCurveTo(-14 * k, -9 * k, -11 * k, -1 * k);
  ctx.lineTo(9 * k, -1 * k);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.eye; ctx.beginPath(); ctx.arc(9 * k, -8 * k, 1.5 * k, 0, Math.PI * 2); ctx.fill();
  if (state === 'stunned') stunDots(ctx, 2 * k, -20 * k, animT, 3 * k);
  ctx.restore();
}

// 뱀 몸 마디 자리: 머리(m)에서 자취를 따라 뒤로 spacing씩 (자취가 짧으면 머리 반대쪽으로 곧게)
function segmentPoints(m, n, spacing) {
  const pts = [{ x: m.x, y: m.y }];
  const trail = m.trail || [];
  let prev = pts[0], ti = 0, need = spacing;
  while (pts.length < n) {
    const tp = trail[ti];
    if (!tp) { const a = (m.heading || 0) + Math.PI; prev = { x: prev.x + Math.cos(a) * spacing, y: prev.y + Math.sin(a) * spacing }; pts.push(prev); continue; }
    const d = Math.hypot(tp.x - prev.x, tp.y - prev.y);
    if (d >= need) { const f = need / d; prev = { x: prev.x + (tp.x - prev.x) * f, y: prev.y + (tp.y - prev.y) * f }; pts.push(prev); need = spacing; }
    else { need -= d; prev = tp; ti++; }
  }
  return pts;
}

// 뱀 (2026-10-13 사용자: 더 단순하게, 검은 몸·흰 테두리·붉은 눈): 자취를 따라 가늘어지는 선 한 줄 + 둥근 머리 + 눈 두 점
export function drawSnake(ctx, m, animT, flash = false) {
  const k = m.scale / 0.4, c = flash ? { ...SNAKE_COLORS, ...WHITE } : SNAKE_COLORS;
  const n = 10, pts = segmentPoints(m, n, 7 * k);
  const head = m.heading || 0;
  const coil = m.state === 'coil' ? Math.min(1, m.stateElapsed / SNAKE.coilTime) : 0;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) { // 0 = 흰 테두리(조금 굵게), 1 = 검은 몸
    ctx.strokeStyle = pass ? c.body : c.line;
    for (let i = n - 1; i >= 1; i--) {
      const a = pts[i], b = pts[i - 1];
      ctx.lineWidth = (4 + (n - i) * 0.9) * k + (pass ? 0 : 2.4 * k);
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 5 * k); ctx.lineTo(b.x, b.y - 5 * k); ctx.stroke();
    }
  }
  const pull = coil * -6 * k + (m.state === 'strike' ? 4 * k : 0);
  const hx = m.x + Math.cos(head) * pull, hy = m.y + Math.sin(head) * pull - 6 * k - coil * 9 * k;
  ctx.translate(hx, hy);
  ctx.rotate(head);
  ctx.fillStyle = c.body; ctx.strokeStyle = c.line; ctx.lineWidth = 1.2 * k;
  ctx.beginPath(); ctx.ellipse(2 * k, 0, 9 * k, 6.5 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.eye;
  ctx.beginPath(); ctx.arc(5 * k, -3.5 * k, 1.5 * k, 0, Math.PI * 2); ctx.arc(5 * k, 3.5 * k, 1.5 * k, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (m.state === 'stunned') stunDots(ctx, hx, hy - 12 * k, animT, 3 * k);
}
