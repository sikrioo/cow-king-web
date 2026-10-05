// 미니맵: 목장 전체 축소 + 주인공/몬스터/바닥 아이템 점 + 지금 보이는 영역 테두리
// (몬스터 40마리 이상 - 점은 fillRect만, 그라데이션/그림자 없음)
import { MINIMAP_SIZE, MINIMAP_SIZE_SMALL, MINIMAP_SMALL_SCREEN } from '../data/maps.js';
import { MONSTERS } from '../data/monsters.js';
import { canvas } from '../core/context.js';
import { game } from '../state.js';
import { PEN } from '../world/arena.js';
import { viewRect } from '../world/camera.js';

export function minimapSize() {
  return Math.min(canvas.width, canvas.height) < MINIMAP_SMALL_SCREEN ? MINIMAP_SIZE_SMALL : MINIMAP_SIZE;
}

// (x, y) = 미니맵 왼쪽 위
export function drawMinimap(ctx, x, y) {
  const size = minimapSize();
  const s = size / PEN.size;
  const mx = (wx) => x + (wx - PEN.x) * s;
  const my = (wy) => y + (wy - PEN.y) * s;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(201,180,138,0.75)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

  // 지금 화면에 보이는 영역
  const v = viewRect();
  const vx = Math.max(x, mx(v.x)), vy = Math.max(y, my(v.y));
  const vw = Math.min(x + size, mx(v.x + v.w)) - vx, vh = Math.min(y + size, my(v.y + v.h)) - vy;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1;
  if (vw > 0 && vh > 0) ctx.strokeRect(vx + 0.5, vy + 0.5, vw - 1, vh - 1);

  // 바닥 아이템
  ctx.fillStyle = '#ffe066';
  game.items.forEach((it) => ctx.fillRect(mx(it.x) - 1, my(it.y) - 1, 2, 2));

  // 몬스터: 일반 빨강, 엘리트 종류색, 보스 크게
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (c.kind === 'boss') { ctx.fillStyle = '#c07fe0'; ctx.fillRect(mx(c.x) - 3.5, my(c.y) - 3.5, 7, 7); return; }
    const def = MONSTERS[c.kind];
    const elite = c.kind !== 'normal' && def && def.ring;
    ctx.fillStyle = elite ? def.ring : '#ff5b52';
    const d = elite ? 4 : 3; // 엘리트는 조금 크게
    ctx.fillRect(mx(c.x) - d / 2, my(c.y) - d / 2, d, d);
  });

  // 주인공
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(mx(game.hero.x), my(game.hero.y), 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
