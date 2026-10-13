// 짐승 그림 (2026-10-13 사용자): 작은 악마 쥐, 박치기 뱀 - 둘 다 심플한 실루엣 (몸이 지나온 자취를 따라 구불구불)
import { SNAKE } from '../data/balance.js';
// 상태는 읽기만 - 뱀 자취(m.trail)·머리 방향(m.heading)은 entities/beastBehaviors.js가 기록. 그라데이션·filter·난수 없음

// 기절 별 (작은 몸에 맞춘 크기 - monsterSprites.drawStunDots는 소 키 기준이라 따로)
function stunDots(ctx, x, y, animT, r) {
  ctx.fillStyle = '#e8dcc8';
  for (let i = 0; i < 3; i++) { const a = animT * 6 + (i * Math.PI * 2) / 3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 3, y + Math.sin(a) * r, r * 0.6, 0, Math.PI * 2); ctx.fill(); }
}

const WHITE = { body: '#ffffff', shine: '#ffffff', ear: '#ffffff', tail: '#ffffff', eye: '#ffffff' };
// 검은 몸 + 붉은 눈 (2026-10-13 사용자) - 흰 테두리는 주인공과 헷갈려서 빼고, 어두운 바닥에서 보이게 옅은 회색 윤기만
export const RAT_COLORS = { body: '#161618', shine: '#5a5a62', ear: '#3a3a40', tail: '#4a4a52', eye: '#ff2a2a' };
export const SNAKE_COLORS = { body: '#161618', shine: '#5a5a62', eye: '#ff2a2a' };

// 쥐 (2026-10-13 사용자: 너무 단순하지 않게, 흰 테두리 없이 - 주인공과 헷갈림): 검은 실루엣 + 등의 옅은 윤기 + 귀 + 꼬리 + 붉은 눈, 스르륵 미끄러짐
export function drawRat(ctx, x, y, scale, animT, facing, state, flash = false) {
  const k = scale / 0.2, c = flash ? { ...RAT_COLORS, ...WHITE } : RAT_COLORS;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= 0.25; // 그림자
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 0, 12 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.25;
  ctx.scale(facing, 1);
  if (state === 'attack') ctx.translate(4 * k, 0);
  ctx.lineCap = 'round';
  ctx.strokeStyle = c.tail; ctx.lineWidth = 1.5 * k; // 꼬리 (살랑)
  ctx.beginPath(); ctx.moveTo(-11 * k, -4 * k); ctx.quadraticCurveTo(-18 * k, -2 * k + Math.sin(animT * 6) * 2 * k, -22 * k, -8 * k); ctx.stroke();
  ctx.fillStyle = c.body; // 몸 + 주둥이
  ctx.beginPath();
  ctx.moveTo(16 * k, -5 * k);
  ctx.quadraticCurveTo(4 * k, -15 * k, -7 * k, -12 * k);
  ctx.quadraticCurveTo(-14 * k, -9 * k, -11 * k, -1 * k);
  ctx.lineTo(9 * k, -1 * k);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c.shine; ctx.lineWidth = 1.6 * k; // 등의 윤기
  ctx.beginPath(); ctx.moveTo(-8 * k, -10 * k); ctx.quadraticCurveTo(0, -13 * k, 6 * k, -11 * k); ctx.stroke();
  ctx.fillStyle = c.ear; ctx.beginPath(); ctx.arc(4 * k, -13 * k, 2.8 * k, 0, Math.PI * 2); ctx.fill(); // 귀
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

// 뱀 (2026-10-13 사용자: 너무 단순하지 않게, 흰 테두리 없이): 자취를 따라 가늘어지는 검은 몸 + 등줄기 윤기 + 그림자 + 머리(붉은 눈, 똬리·돌진 땐 혀)
export function drawSnake(ctx, m, animT, flash = false) {
  const k = m.scale / 0.4, c = flash ? { ...SNAKE_COLORS, ...WHITE } : SNAKE_COLORS;
  const n = 10, pts = segmentPoints(m, n, 7 * k);
  const head = m.heading || 0, px = -Math.sin(head), py = Math.cos(head);
  const coil = m.state === 'coil' ? Math.min(1, m.stateElapsed / SNAKE.coilTime) : 0;
  const wig = m.state === 'walk' ? 2.5 * k : 0; // 기어갈 때 살짝 좌우로
  const at = (i) => { const p = pts[i], w = Math.sin(animT * 8 - i * 0.9) * wig * Math.min(1, i / 3); return { x: p.x + px * w, y: p.y + py * w - 5 * k }; };
  const widthAt = (i) => (4 + (n - i) * 0.9) * k;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let pass = 0; pass < 3; pass++) { // 0 = 그림자, 1 = 몸, 2 = 등줄기 윤기
    ctx.strokeStyle = pass === 0 ? 'rgba(0,0,0,0.22)' : pass === 1 ? c.body : c.shine;
    for (let i = n - 1; i >= 1; i--) {
      const a = at(i), b = at(i - 1), dy = pass === 0 ? 5 * k : pass === 2 ? -widthAt(i) * 0.18 : 0;
      ctx.lineWidth = pass === 2 ? widthAt(i) * 0.22 : widthAt(i);
      ctx.beginPath(); ctx.moveTo(a.x, a.y + dy); ctx.lineTo(b.x, b.y + dy); ctx.stroke();
    }
  }
  const pull = coil * -6 * k + (m.state === 'strike' ? 4 * k : 0);
  const hx = m.x + Math.cos(head) * pull, hy = m.y + Math.sin(head) * pull - 6 * k - coil * 9 * k;
  ctx.translate(hx, hy);
  ctx.rotate(head);
  if (m.state === 'coil' || m.state === 'strike') { // 혀
    ctx.strokeStyle = c.eye; ctx.lineWidth = 1.1 * k;
    ctx.beginPath(); ctx.moveTo(9 * k, 0); ctx.lineTo(15 * k, 0); ctx.lineTo(17 * k, -1.8 * k); ctx.moveTo(15 * k, 0); ctx.lineTo(17 * k, 1.8 * k); ctx.stroke();
  }
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(2 * k, 0, 9 * k, 6.5 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.shine;
  ctx.beginPath(); ctx.ellipse(1 * k, 0, 4 * k, 1.6 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.eye;
  ctx.beginPath(); ctx.arc(5 * k, -3.5 * k, 1.5 * k, 0, Math.PI * 2); ctx.arc(5 * k, 3.5 * k, 1.5 * k, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (m.state === 'stunned') stunDots(ctx, hx, hy - 12 * k, animT, 3 * k);
}
