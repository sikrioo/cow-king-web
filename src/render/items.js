// 바닥 아이템 그리기
import { ITEM_STYLE, POTION_LABEL } from '../data/items.js';
import { game } from '../state.js';
import { groundLabelForGear } from '../ui/itemView.js';

export function drawItems(ctx, t) {
  game.items.forEach((it) => {
    const isGear = it.type === 'gear';
    const isMaterial = it.type === 'material';
    const label = isGear ? groundLabelForGear(it.gearData) : isMaterial ? '재료' : (POTION_LABEL[it.type] || '물약');
    const color = isGear ? '#cfcfcf' : isMaterial ? '#9fd6e0' : ITEM_STYLE[it.type].color;
    const bobY = Math.sin(t * 4 + it.bob) * 3;
    const pop = Math.max(it.spawnT, 0.01);
    const fade = it.life < 2 ? Math.max(it.life / 2, 0) : 1;

    ctx.save();
    ctx.translate(it.x, it.y + bobY);
    ctx.scale(pop, pop);
    ctx.font = 'bold 11px sans-serif';
    const bw = ctx.measureText(label).width + 14, bh = 18;

    ctx.globalAlpha = fade * 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, bh * 0.85, bw * 0.38, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(10,14,12,0.88)';
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 6);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
