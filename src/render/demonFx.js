// 악마 마법 그림: 지옥불 원 예고(바닥), 주인공 머리 위 저주 문양. 상태는 읽기만
import { game } from '../state.js';
import { CURSES, CURSE_COLOR } from '../data/balance.js';

// 지옥불 원: 보라 원이 안에서부터 차오르고 테두리가 깜빡임 (몬스터 아래)
export function drawHellfires(ctx, t) {
  game.hellfires.forEach((f) => {
    const p = Math.min(1, f.t / f.delay);
    ctx.save();
    ctx.globalAlpha = 0.15 + p * 0.3;
    ctx.fillStyle = '#7a1a8a';
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * p, f.r * p * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6 + Math.sin(t * 20) * 0.3;
    ctx.strokeStyle = '#d98bff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  });
}

// 주인공 저주: 머리 위에 도는 보라 문양 + 저주 이름 (남은 시간이 1초 아래면 깜빡임)
export function drawHeroCurse(ctx, t) {
  const h = game.hero, c = h.curse;
  if (!c || c.timer <= 0 || !h.alive) return;
  if (c.timer < 1 && Math.floor(t * 10) % 2) return;
  const x = h.x, y = h.y - h.r * 3.4;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = CURSE_COLOR;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(t * 2);
  ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 9, Math.sin(a) * 9); } ctx.closePath(); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8c8ff';
  ctx.fillText(CURSES[c.kind].label, x, y - 14);
  ctx.restore();
}
