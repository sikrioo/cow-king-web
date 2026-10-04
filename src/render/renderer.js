// 한 프레임 그리기 순서 (여기 순서가 곧 화면 겹침 순서)
import { canvas, ctx } from '../core/context.js';
import { game, ui } from '../state.js';
import { drawPen } from './arena.js';
import { drawParticles, drawHazards, drawLightningBolts, drawShockwaves, drawFloatTexts } from './fx.js';
import { drawPlayer } from './heroSprites.js';
import { drawComboCounter, drawHUD } from './hud.js';
import { drawItems } from './items.js';
import { drawMonster } from './monsterSprites.js';
import {
  drawTitleScene, drawTitleOverlay, drawStartCountdown, drawWavePresentation, drawDemoTip, drawPauseOverlay
} from '../ui/overlays.js';

// hooks: 아직 main.js에 있는 DOM 버튼 동기화/캔버스 메뉴 (Step 6에서 ui/dom, ui/menu로 옮기면 직접 import)
export function render(t, hooks) {
  ctx.fillStyle = '#0c1f10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const titleMode = game.gameState === 'title';
  document.body.classList.toggle('title-mode', titleMode);
  if (titleMode) {
    ctx.save();
    drawPen();
    drawTitleScene(t);
    drawParticles(ctx);
    ctx.restore();
    drawTitleOverlay(t);
    return;
  }

  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake * 2, (Math.random() - 0.5) * game.shake * 2);
  }
  drawPen();
  drawHazards(ctx);
  const drawables = game.cows.map((c) => ({ y: c.y, fn: () => drawMonster(c, ctx, t) }));
  drawables.push({ y: game.hero.y, fn: () => drawPlayer(ctx, t) });
  drawables.sort((a, b) => a.y - b.y).forEach((d) => d.fn());
  drawItems(ctx, t);
  drawParticles(ctx);
  drawShockwaves(ctx);
  drawLightningBolts(ctx);
  drawFloatTexts(ctx);
  drawComboCounter(ctx);
  drawStartCountdown();
  drawWavePresentation(t);
  drawDemoTip();
  ctx.restore();

  drawHUD();
  hooks.syncDomButtons();
  if (ui.showInventory) hooks.drawMenu(ctx);
  if (game.paused) drawPauseOverlay();

  if (game.impactFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.20, game.impactFlash);
    ctx.fillStyle = '#fff0bf';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}
