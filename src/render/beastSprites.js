// 짐승 그림 (2026-10-13 사용자): 작은 악마 쥐, 박치기 뱀 - 둘 다 심플한 실루엣 (몸이 지나온 자취를 따라 구불구불)
import { SNAKE } from '../data/balance.js';
// 상태는 읽기만 - 뱀 자취(m.trail)·머리 방향(m.heading)은 entities/beastBehaviors.js가 기록. 그라데이션·filter·난수 없음

// 기절 별 (작은 몸에 맞춘 크기 - monsterSprites.drawStunDots는 소 키 기준이라 따로)
function stunDots(ctx, x, y, animT, r) {
  ctx.fillStyle = '#e8dcc8';
  for (let i = 0; i < 3; i++) { const a = animT * 6 + (i * Math.PI * 2) / 3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 3, y + Math.sin(a) * r, r * 0.6, 0, Math.PI * 2); ctx.fill(); }
}

const WHITE = { body: '#ffffff', ear: '#ffffff', eye: '#ffffff' };
export const RAT_COLORS = { body: '#4a2a26', ear: '#9a4a3e', eye: '#ff3b30' };
export const SNAKE_COLORS = { body: '#4f7a2a', eye: '#ffe066', tongue: '#ff3b5c' };

// 쥐 (2026-10-13 사용자: 더 심플하게): 한 덩어리 실루엣(몸 + 뾰족한 주둥이) + 귀 하나 + 붉은 눈 + 꼬리 선. 걸을 땐 통통 튐
export function drawRat(ctx, x, y, scale, animT, facing, state, flash = false) {
  const k = scale / 0.2, c = flash ? { ...RAT_COLORS, ...WHITE } : RAT_COLORS;
  const moving = state === 'walk' || state === 'attack';
  const bob = moving ? Math.abs(Math.sin(animT * 16)) * 2 * k : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 0, 12 * k, 3.5 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.25;
  ctx.scale(facing, 1);
  ctx.translate(state === 'attack' ? 4 * k : 0, -bob);
  ctx.strokeStyle = c.body; ctx.lineWidth = 1.8 * k; ctx.lineCap = 'round'; // 꼬리
  ctx.beginPath(); ctx.moveTo(-10 * k, -5 * k); ctx.quadraticCurveTo(-18 * k, -3 * k, -22 * k, -10 * k); ctx.stroke();
  ctx.fillStyle = c.body; // 몸 + 주둥이 (눈물방울 모양 하나)
  ctx.beginPath();
  ctx.moveTo(17 * k, -6 * k);
  ctx.quadraticCurveTo(6 * k, -16 * k, -6 * k, -14 * k);
  ctx.quadraticCurveTo(-14 * k, -12 * k, -12 * k, -2 * k);
  ctx.lineTo(10 * k, -2 * k);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = c.ear; ctx.beginPath(); ctx.arc(5 * k, -14 * k, 3 * k, 0, Math.PI * 2); ctx.fill(); // 귀
  ctx.fillStyle = c.eye; ctx.beginPath(); ctx.arc(10 * k, -9 * k, 1.4 * k, 0, Math.PI * 2); ctx.fill(); // 붉은 눈
  if (state === 'stunned') stunDots(ctx, 2 * k, -22 * k, animT, 3 * k);
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

// 뱀 (2026-10-13 사용자: 더 심플하게): 자취를 따라 굵기가 줄어드는 매끈한 선 한 줄 + 둥근 머리 + 눈 두 점. 똬리 땐 머리를 들고, 돌진 땐 혀
export function drawSnake(ctx, m, animT, flash = false) {
  const k = m.scale / 0.4, c = flash ? { ...SNAKE_COLORS, ...WHITE } : SNAKE_COLORS;
  const n = 10, pts = segmentPoints(m, n, 7 * k);
  const head = m.heading || 0, px = -Math.sin(head), py = Math.cos(head);
  const coil = m.state === 'coil' ? Math.min(1, m.stateElapsed / SNAKE.coilTime) : 0;
  const wig = m.state === 'walk' ? 3 * k : 0; // 기어갈 때 살짝 좌우로
  const at = (i) => { const p = pts[i], w = Math.sin(animT * 8 - i * 0.9) * wig * Math.min(1, i / 3); return { x: p.x + px * w, y: p.y + py * w - 5 * k }; };
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) { // 0 = 그림자, 1 = 몸
    ctx.strokeStyle = pass ? c.body : 'rgba(0,0,0,0.22)';
    for (let i = n - 1; i >= 1; i--) {
      const a = at(i), b = at(i - 1);
      ctx.lineWidth = (4 + (n - i) * 0.9) * k;
      ctx.beginPath(); ctx.moveTo(a.x, a.y + (pass ? 0 : 5 * k)); ctx.lineTo(b.x, b.y + (pass ? 0 : 5 * k)); ctx.stroke();
    }
  }
  const pull = coil * -6 * k + (m.state === 'strike' ? 4 * k : 0);
  const hx = m.x + Math.cos(head) * pull, hy = m.y + Math.sin(head) * pull - 6 * k - coil * 9 * k;
  ctx.translate(hx, hy);
  ctx.rotate(head);
  if (m.state === 'coil' || m.state === 'strike') { // 혀
    ctx.strokeStyle = c.tongue; ctx.lineWidth = 1.2 * k;
    ctx.beginPath(); ctx.moveTo(9 * k, 0); ctx.lineTo(15 * k, 0); ctx.stroke();
  }
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(2 * k, 0, 9 * k, 6.5 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.eye;
  ctx.beginPath(); ctx.arc(5 * k, -3.5 * k, 1.5 * k, 0, Math.PI * 2); ctx.arc(5 * k, 3.5 * k, 1.5 * k, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (m.state === 'stunned') stunDots(ctx, hx, hy - 12 * k, animT, 3 * k);
}
