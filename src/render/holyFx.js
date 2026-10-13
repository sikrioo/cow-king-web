// 전사 신성 스킬 그림 (systems/holySkills.js): 신성 망치(나선을 그리며 도는 빛나는 망치 + 꼬리), 천벌(떨어질 자리 고리 + 빛줄기)
// 상태는 읽기만, 그라데이션·filter 없이 반투명 도형만 (성능)
import { SPELLS } from '../data/skills.js';
import { HOLY } from '../data/elements.js';
import { hammerPos } from '../systems/holySkills.js';

const HAMMER_LIFT = 30; // 망치·빛줄기를 그리는 높이 (몸통 높이)

// 바닥(몬스터 아래)
export function drawHolyUnder(ctx, g) {
  if (g.kind !== 'heavenbolt' || g.struck) return;
  const k = Math.min(1, g.age / SPELLS.heavenbolt.delay); // 떨어질 자리 - 좁아지는 금빛 고리
  const r = 36 * (1.6 - k * 0.6);
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = HOLY.color;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(g.x, g.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.3;
  ctx.beginPath(); ctx.ellipse(g.x, g.y, r * 0.55, r * 0.34, 0, 0, Math.PI * 2); ctx.stroke();
}

function drawHammer(ctx, x, y, spin, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.globalAlpha = alpha * 0.28; // 은은한 빛 (반투명 원)
  ctx.fillStyle = HOLY.color;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = HOLY.core; // 자루
  ctx.fillRect(-2, -4, 4, 20);
  ctx.fillStyle = HOLY.color; // 머리
  ctx.fillRect(-11, -12, 22, 10);
  ctx.fillStyle = HOLY.core;
  ctx.fillRect(-9, -10, 18, 3);
  ctx.restore();
}

// 위(몬스터 위)
export function drawHolyOver(ctx, g, t) {
  if (g.kind === 'holyhammer') {
    const fade = Math.min(1, g.age * 8, (g.duration - g.age) * 5);
    for (let k = 4; k >= 1; k--) { // 꼬리: 조금 전 자리들
      const age = g.age - k * 0.035;
      if (age < 0) continue;
      const p = hammerPos(g, age);
      ctx.globalAlpha = fade * (0.32 - k * 0.06);
      ctx.fillStyle = HOLY.color;
      ctx.beginPath(); ctx.arc(p.x, p.y - HAMMER_LIFT, 9 - k, 0, Math.PI * 2); ctx.fill();
    }
    const p = hammerPos(g);
    drawHammer(ctx, p.x, p.y - HAMMER_LIFT, g.age * 13, fade);
    return;
  }
  if (g.kind === 'heavenbolt' && g.struck) {
    const s = SPELLS.heavenbolt;
    ctx.lineCap = 'round';
    g.bolts.forEach((b) => {
      if (b.trav >= s.boltRange) return;
      const fade = Math.min(1, (s.boltRange - b.trav) / 60);
      const x = b.x, y = b.y - HAMMER_LIFT, tx = x - b.dx * 30, ty = y - b.dy * 30;
      ctx.globalAlpha = 0.45 * fade;
      ctx.strokeStyle = HOLY.color;
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = HOLY.core;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
    });
  }
}
