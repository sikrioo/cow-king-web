// 목장(아레나) 바닥/울타리 그리기
import { PALETTE } from '../data/palette.js';
import { ctx } from '../core/context.js';
import { PEN } from '../core/physics.js';

export function drawPen() {
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(PEN.x, PEN.y, PEN.size, PEN.size);

  ctx.strokeStyle = PALETTE.fence;
  ctx.lineWidth = 6;
  ctx.strokeRect(PEN.x, PEN.y, PEN.size, PEN.size);

  ctx.fillStyle = PALETTE.post;
  const gap = 44;
  for (let px = PEN.x; px <= PEN.x + PEN.size + 1; px += gap) {
    ctx.fillRect(px - 3, PEN.y - 9, 6, 18);
    ctx.fillRect(px - 3, PEN.y + PEN.size - 9, 6, 18);
  }
  for (let py = PEN.y; py <= PEN.y + PEN.size + 1; py += gap) {
    ctx.fillRect(PEN.x - 9, py - 3, 18, 6);
    ctx.fillRect(PEN.x + PEN.size - 9, py - 3, 18, 6);
  }
}
