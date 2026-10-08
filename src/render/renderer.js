// 한 프레임 그리기 순서 (여기 순서가 곧 화면 겹침 순서)
import { canvas, ctx } from '../core/context.js';
import { game, ui } from '../state.js';
import { drawPen } from './arena.js';
import { drawMoveMarker, drawAttackTargetMarker, drawHeroChill, drawHeroFortify, drawImmuneLabels, drawMeteorMarkers, drawMeteorBalls, drawProjectiles, drawParticles, drawHazards, drawLightningBolts, drawShockwaves, drawFloatTexts } from './fx.js';
import { drawPlayer } from './heroSprites.js';
import { drawComboCounter, drawHUD } from './hud.js';
import { drawItems } from './items.js';
import { drawIceRings } from './iceFx.js';
import { applyCamera, updateCamera, inView } from '../world/camera.js';
import { PEN } from '../world/arena.js';
import { drawMonster } from './monsterSprites.js';
import { updatePotionButtonsUI, updateSkillButtonsUI, syncTitleModeClass } from '../ui/dom.js';
import { drawInventoryPanel } from '../ui/menu/panel.js';
import { drawCardOffer } from '../ui/cardPick.js';
import {
  drawTitleScene, drawTitleOverlay, drawStartCountdown, drawWavePresentation, drawDemoTip, drawPauseOverlay
} from '../ui/overlays.js';

export function render(t) {
  ctx.fillStyle = '#0c1f10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const titleMode = game.gameState === 'title';
  syncTitleModeClass(titleMode);
  if (titleMode) {
    updateCamera(PEN.x + PEN.size / 2, PEN.y + PEN.size / 2); // 타이틀: 목장 가운데
    ctx.save();
    applyCamera(ctx);
    drawPen();
    drawTitleScene(t);
    drawParticles(ctx);
    ctx.restore();
    drawTitleOverlay(t);
    return;
  }

  updateCamera(game.hero.x, game.hero.y);
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake * 2, (Math.random() - 0.5) * game.shake * 2);
  }
  ctx.save();
  applyCamera(ctx); // 여기부터 월드 좌표
  drawPen();
  drawMoveMarker(ctx);
  drawAttackTargetMarker(ctx);
  drawHeroChill(ctx);
  drawHeroFortify(ctx, t);
  drawHazards(ctx);
  drawMeteorMarkers(ctx);
  // 화면 밖 몬스터는 안 그림 - 그래서 몬스터 그림 코드는 게임 난수(Math.random)를 쓰면 안 됨 (화면 크기에 따라 결과가 달라짐)
  const visibleCows = game.cows.filter((c) => inView(c.x, c.y, 160));
  const drawables = visibleCows.map((c) => ({ y: c.y, fn: () => drawMonster(c, ctx, t) }));
  drawables.push({ y: game.hero.y, fn: () => drawPlayer(ctx, t) });
  drawables.sort((a, b) => a.y - b.y).forEach((d) => d.fn());
  drawImmuneLabels(ctx, visibleCows);
  drawItems(ctx, t);
  drawProjectiles(ctx);
  drawMeteorBalls(ctx); // 불덩이는 몬스터/주인공 위로
  drawParticles(ctx);
  drawShockwaves(ctx);
  drawIceRings(ctx);
  drawLightningBolts(ctx);
  drawFloatTexts(ctx);
  drawComboCounter(ctx);
  ctx.restore(); // 월드 좌표 끝 - 아래는 화면 좌표
  drawStartCountdown();
  drawWavePresentation(t);
  drawDemoTip();
  ctx.restore();

  drawHUD();
  updateSkillButtonsUI();
  updatePotionButtonsUI();
  if (ui.showInventory) drawInventoryPanel(ctx);
  if (game.cardOffer) drawCardOffer(t);
  if (game.paused) drawPauseOverlay();

  if (game.impactFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.20, game.impactFlash);
    ctx.fillStyle = '#fff0bf';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}
