// 짐승 그림 (2026-10-13 사용자): 작은 악마 쥐(심플하되 쥐 같게), 박치기 뱀(몸이 지나온 자취를 따라 구불구불)
import { SNAKE } from '../data/balance.js';
// 상태는 읽기만 - 뱀 자취(m.trail)·머리 방향(m.heading)은 entities/beastBehaviors.js가 기록. 그라데이션·filter·난수 없음

// 기절 별 (작은 몸에 맞춘 크기 - monsterSprites.drawStunDots는 소 키 기준이라 따로)
function stunDots(ctx, x, y, animT, r) {
  ctx.fillStyle = '#e8dcc8';
  for (let i = 0; i < 3; i++) { const a = animT * 6 + (i * Math.PI * 2) / 3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 3, y + Math.sin(a) * r, r * 0.6, 0, Math.PI * 2); ctx.fill(); }
}

const WHITE = { body: '#ffffff', dark: '#ffffff', belly: '#ffffff', eye: '#ffffff' };
export const RAT_COLORS = { body: '#4a2a26', dark: '#2a1412', belly: '#7a4a40', ear: '#b0483a', eye: '#ff3b30', tail: '#8a5a50' };
export const SNAKE_COLORS = { body: '#4f7a2a', dark: '#2f4a18', belly: '#c8d890', eye: '#ffe066', tongue: '#ff3b5c' };

// 쥐: 옆모습 - 둥근 몸 + 뾰족한 주둥이 + 둥근 귀 + 가는 꼬리, 악마라 붉은 눈·작은 뿔. 걸을 때 종종걸음
export function drawRat(ctx, x, y, scale, animT, facing, state, flash = false) {
  const k = scale / 0.2, c = flash ? { ...RAT_COLORS, ...WHITE } : RAT_COLORS;
  const moving = state === 'walk' || state === 'attack';
  const bob = moving ? Math.abs(Math.sin(animT * 18)) * 2 * k : 0;
  const lunge = state === 'attack' ? 4 * k : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 0, 13 * k, 4 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.3;
  ctx.scale(facing, 1);
  ctx.translate(lunge, -bob);
  // 꼬리
  ctx.strokeStyle = c.tail; ctx.lineWidth = 1.6 * k; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-10 * k, -6 * k);
  ctx.quadraticCurveTo(-20 * k, -6 * k + Math.sin(animT * 10) * 4 * k, -24 * k, -14 * k); ctx.stroke();
  // 다리 (종종걸음)
  ctx.strokeStyle = c.dark; ctx.lineWidth = 2 * k;
  for (let i = 0; i < 2; i++) {
    const sw = moving ? Math.sin(animT * 18 + i * Math.PI) * 3 * k : 0;
    ctx.beginPath(); ctx.moveTo((i ? 5 : -5) * k, -4 * k); ctx.lineTo((i ? 5 : -5) * k + sw, 0); ctx.stroke();
  }
  // 몸
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(0, -8 * k, 12 * k, 7 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.belly;
  ctx.beginPath(); ctx.ellipse(1 * k, -5 * k, 8 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
  // 머리 + 주둥이
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.moveTo(8 * k, -14 * k); ctx.lineTo(20 * k, -8 * k); ctx.lineTo(8 * k, -4 * k); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(9 * k, -10 * k, 5.5 * k, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.dark; ctx.beginPath(); ctx.arc(20 * k, -8 * k, 1.5 * k, 0, Math.PI * 2); ctx.fill(); // 코
  // 귀 + 작은 뿔
  ctx.fillStyle = c.ear; ctx.beginPath(); ctx.arc(6 * k, -16 * k, 3.2 * k, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.dark; ctx.beginPath(); ctx.moveTo(10 * k, -15 * k); ctx.lineTo(12 * k, -20 * k); ctx.lineTo(13 * k, -14 * k); ctx.closePath(); ctx.fill();
  // 붉은 눈
  ctx.fillStyle = c.eye; ctx.beginPath(); ctx.arc(12 * k, -11 * k, 1.5 * k, 0, Math.PI * 2); ctx.fill();
  if (state === 'stunned') stunDots(ctx, 4 * k, -24 * k, animT, 3 * k);
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

// 뱀: 위에서 본 듯한 구불구불한 몸(마디 원) + 머리(눈·혀). 똬리 땐 머리를 치켜들고 뒤로 당김, 돌진 땐 몸이 쭉 펴짐
export function drawSnake(ctx, m, animT, flash = false) {
  const k = m.scale / 0.4, c = flash ? { ...SNAKE_COLORS, ...WHITE } : SNAKE_COLORS;
  const n = 12, spacing = 6.5 * k;
  const pts = segmentPoints(m, n, spacing);
  const head = m.heading || 0, px = -Math.sin(head), py = Math.cos(head);
  const coil = m.state === 'coil' ? Math.min(1, m.stateElapsed / SNAKE.coilTime) : 0;
  const wig = m.state === 'walk' ? 3.5 * k : m.state === 'turn' ? 2 * k : 0; // 기어갈 때 좌우 흔들
  ctx.save();
  // 그림자
  ctx.globalAlpha *= 0.25;
  ctx.fillStyle = '#000';
  pts.forEach((p, i) => { ctx.beginPath(); ctx.ellipse(p.x, p.y + 2 * k, (8 - i * 0.45) * k, 3.5 * k, 0, 0, Math.PI * 2); ctx.fill(); });
  ctx.globalAlpha /= 0.25;
  // 몸 (꼬리 → 목)
  for (let i = n - 1; i >= 1; i--) {
    const p = pts[i], w = Math.sin(animT * 9 - i * 0.9) * wig * Math.min(1, i / 3);
    const lift = 6 * k + coil * (n - i) * 0.4 * k;
    const x = p.x + px * w, y = p.y + py * w - lift, r = (7.5 - i * 0.42) * k;
    ctx.fillStyle = i % 3 === 0 ? c.dark : c.body;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.belly; ctx.globalAlpha *= 0.5;
    ctx.beginPath(); ctx.arc(x, y + r * 0.35, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha /= 0.5;
  }
  // 머리 (똬리: 치켜들고 뒤로 당김 / 돌진: 앞으로 쭉)
  const pull = coil * -7 * k + (m.state === 'strike' ? 5 * k : 0);
  const hx = m.x + Math.cos(head) * pull, hy = m.y + Math.sin(head) * pull - 7 * k - coil * 10 * k;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(head);
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(3 * k, 0, 10 * k, 7 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.dark;
  ctx.beginPath(); ctx.ellipse(1 * k, 0, 5 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.eye;
  ctx.beginPath(); ctx.arc(7 * k, -4 * k, 1.8 * k, 0, Math.PI * 2); ctx.arc(7 * k, 4 * k, 1.8 * k, 0, Math.PI * 2); ctx.fill();
  if (m.state === 'coil' || m.state === 'strike' || Math.sin(animT * 3) > 0.6) { // 혀 날름
    ctx.strokeStyle = c.tongue; ctx.lineWidth = 1.2 * k;
    ctx.beginPath(); ctx.moveTo(12 * k, 0); ctx.lineTo(18 * k, 0); ctx.lineTo(21 * k, -2 * k); ctx.moveTo(18 * k, 0); ctx.lineTo(21 * k, 2 * k); ctx.stroke();
  }
  ctx.restore();
  if (m.state === 'stunned') stunDots(ctx, hx, hy - 14 * k, animT, 3 * k);
  ctx.restore();
}
