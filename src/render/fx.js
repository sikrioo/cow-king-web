// 이펙트 그리기 (파티클/불바닥/번개/충격파/떠오르는 글자) - 생성·갱신은 main.js
import { hexToRgba } from '../util.js';
import { game } from '../state.js';

export function drawParticles(ctx) {
  game.particles.forEach((p) => {
    const a = Math.max(p.life / p.maxLife, 0);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 * a + 1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

export function drawHazards(ctx) {
  game.hazards.forEach((h) => {
    const alpha = Math.min(1, h.life / h.maxLife) * (0.35 + Math.sin(performance.now() / 90 + h.x) * 0.08);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
    grad.addColorStop(0, 'rgba(255,200,80,0.9)');
    grad.addColorStop(0.6, 'rgba(255,110,30,0.55)');
    grad.addColorStop(1, 'rgba(255,60,10,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

export function drawLightningBolts(ctx) {
  game.lightningBolts.forEach((b) => {
    const alpha = Math.max(0, b.life / b.maxLife);
    const dx = b.x2 - b.x1, dy = b.y2 - b.y1;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist, ny = dx / dist;
    const segs = 6;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#fff066';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const jitter = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * 14;
      const px = b.x1 + dx * t + nx * jitter;
      const py = b.y1 + dy * t + ny * jitter;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  });
}

export function drawShockwaves(ctx) {
  game.shockwaves.forEach((s) => {
    const t = s.age / s.duration;
    const r = Math.max(s.maxRadius * t, 1);
    const alpha = 1 - t;

    const grad = ctx.createRadialGradient(s.x, s.y, Math.max(r - 26, 0), s.x, s.y, r);
    grad.addColorStop(0, hexToRgba(s.color, 0));
    grad.addColorStop(0.75, hexToRgba(s.color, alpha * 0.5));
    grad.addColorStop(1, hexToRgba(s.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(s.color, Math.min(alpha * 1.4, 1));
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  });
}

export function drawFloatTexts(ctx) {
  ctx.textAlign = 'center';
  game.floatTexts.forEach((f) => {
    const t = 1 - f.life / f.maxLife;
    const pop = f.big ? (t < 0.2 ? 1 + Math.sin((t / 0.2) * Math.PI / 2) * 0.4 : 1) : 1;
    ctx.font = f.big ? `bold ${Math.round(17 * pop)}px sans-serif` : 'bold 14px sans-serif';
    ctx.globalAlpha = Math.max(f.life / f.maxLife, 0);
    ctx.fillStyle = f.color;
    if (f.big) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(f.text, f.x, f.y);
    }
    ctx.fillText(f.text, f.x, f.y);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
