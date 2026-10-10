// 화면 오버레이 (타이틀/카운트다운/웨이브 배너/팁/일시정지)
import { weaponFor } from '../data/monsters.js';
import { RELEASE_VERSION } from '../config.js';
import { canvas, ctx } from '../core/context.js';
import { game, ui } from '../state.js';
import { drawCow } from '../render/monsterSprites.js';
import { PEN } from '../world/arena.js';
import { CLASSES, CLASS_ORDER } from '../data/classes.js';
import { viewSize } from '../world/camera.js';
import { MAPS } from '../data/maps.js';
import { DIFFICULTY } from '../data/difficulty.js';
import { ACTS, ACT_SCENE } from '../data/acts.js';
import { waveInfo } from '../util.js';

export function drawTitleScene(t) {
  const sorted = [...ui.titleCows].sort((a, b) => a.y - b.y);
  sorted.forEach((c) => drawCow(ctx, c.x, c.y, c.scale, 'walk', t + c.phase, c.facing, 0, null, weaponFor('normal', c.phase)));
  ctx.save();
  ctx.globalAlpha = 0.28;
  drawCow(ctx, PEN.x + PEN.size * 0.5, PEN.y + PEN.size * 0.5 - Math.min(viewSize().h, PEN.size) * 0.14, 0.74, 'idle', t, 1, 0,
    { hide: '#6a3f8a', horn: '#e8d4ff', snout: '#361a52', eye: '#ffe066' }, weaponFor('boss', 0));
  ctx.restore();
}

export function drawTitleOverlay(t) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const grad = ctx.createRadialGradient(cx, cy - 20, 40, cx, cy, Math.max(canvas.width, canvas.height) * 0.64);
  grad.addColorStop(0, 'rgba(5,12,7,0.30)');
  grad.addColorStop(1, 'rgba(2,7,3,0.83)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(cx, cy - 116);
  ctx.fillStyle = '#e6bd4f';
  ctx.beginPath();
  ctx.moveTo(-34, 14); ctx.lineTo(-28, -10); ctx.lineTo(-10, 4); ctx.lineTo(0, -20);
  ctx.lineTo(10, 4); ctx.lineTo(28, -10); ctx.lineTo(34, 14); ctx.closePath(); ctx.fill();
  ctx.fillRect(-34, 14, 68, 8);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,.65)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#f2e7c9';
  ctx.font = `900 ${Math.max(48, Math.min(82, canvas.width * 0.085))}px Georgia, serif`;
  ctx.fillText('COW KING', cx, cy - 45);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#d2ba82';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('카우방 액션 RPG 데모', cx, cy - 12);

  // 아래 묶음(캐릭터 카드 → 게임 시작 버튼 → 조작 안내): 화면이 낮으면 위로 당김
  const base = Math.min(cy, canvas.height - 240);
  drawClassCards(cx, base + 18);
  drawStartButton(cx, base + 136, t);
  ctx.textAlign = 'center';
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,.50)';
  ctx.fillText('클릭/WASD 이동 · Space/E 시전(길게) · Q/R 슬롯전환 · 1/2 물약 · I 장비', cx, base + 204);
  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(255,255,255,.36)';
  ctx.fillText(`BEST WAVE ${game.releaseMeta.bestWave}  ·  BEST KILLS ${game.releaseMeta.bestKills}  ·  CLEAR ${game.releaseMeta.clears}  ·  v${RELEASE_VERSION}`, cx, base + 226);
  ctx.textAlign = 'left';
}

// 게임 시작 버튼 (클릭 영역 ui.titleStartRect, 입력은 input.js / 키보드 Space·Enter는 game.handleKeyDown)
function drawStartButton(cx, y, t) {
  const w = 220, h = 44, x = cx - w / 2;
  ui.titleStartRect = { x, y, w, h };
  const pulse = 0.5 + Math.sin(t * 3.4) * 0.25;
  ctx.save();
  ctx.fillStyle = `rgba(255,224,102,${0.22 + pulse * 0.18})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6cf';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('게임 시작', cx, y + h / 2 - 1);
  ctx.textBaseline = 'alphabetic';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Space / Enter', cx, y + h + 14);
  ctx.restore();
}

// 캐릭터 고르기 카드 (클릭 영역은 ui.titleCardRects - 그릴 때마다 갱신, 입력은 input.js)
function drawClassCards(cx, top) {
  const gap = 14, ch = 84;
  const cw = Math.min(170, (canvas.width - 40 - gap) / 2);
  const left = cx - (cw * CLASS_ORDER.length + gap * (CLASS_ORDER.length - 1)) / 2;
  ui.titleCardRects = [];
  ctx.save();
  CLASS_ORDER.forEach((key, i) => {
    const cls = CLASSES[key];
    const x = left + i * (cw + gap), y = top;
    const sel = ui.selectedClass === key;
    ui.titleCardRects.push({ x, y, w: cw, h: ch, key });
    ctx.fillStyle = sel ? 'rgba(255,224,102,0.16)' : 'rgba(0,0,0,0.45)';
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = sel ? '#ffe066' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = sel ? 2.5 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
    // 몸 색 동그라미
    ctx.fillStyle = cls.look.body[0];
    ctx.beginPath(); ctx.arc(x + 22, y + 26, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = cls.look.trim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = sel ? '#ffe066' : '#f2e7c9';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(cls.label, x + 42, y + 31);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '11px sans-serif';
    ctx.fillText(cls.desc, x + 12, y + 56);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`체력 ${cls.hp} · 마나 ${cls.mana}`, x + 12, y + 73);
  });
  ctx.textAlign = 'center';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('카드를 누르거나 ←/→ 로 캐릭터 고르기', cx, top + ch + 16);
  ctx.restore();
}

export function drawStartCountdown() {
  if (game.gameState !== 'playing' || ui.showInventory || game.wave !== 0 || game.cows.length !== 0 || game.waveTransition <= 0) return;
  const remain = Math.max(0, game.waveTransition);
  const number = Math.ceil(remain);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(244,234,214,0.92)';
  ctx.font = '700 14px sans-serif';
  ctx.fillText('전투 준비', canvas.width / 2, canvas.height * 0.42 - 24);
  ctx.fillStyle = '#ffbe68';
  ctx.font = '900 42px sans-serif';
  ctx.fillText(number > 3 ? 'READY' : String(number), canvas.width / 2, canvas.height * 0.42 + 20);
  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawWavePresentation(t) {
  if (game.waveBannerTimer <= 0 || game.gameState !== 'playing' || ui.showInventory) return;
  const a = Math.min(1, game.waveBannerTimer * 2.2) * Math.min(1, (1.6 - game.waveBannerTimer) * 3.0 + 1);
  const info = waveInfo(game.wave), boss = info.isBoss && game.run.mode === 'wave';
  const farm = game.run.mode === 'farm';
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.textAlign = 'center';
  ctx.fillStyle = boss ? '#f1d06b' : '#f3ead6';
  ctx.shadowColor = 'rgba(0,0,0,.75)';
  ctx.shadowBlur = 12;
  ctx.font = boss ? '900 38px Georgia, serif' : '900 28px sans-serif';
  ctx.fillText(farm ? MAPS[game.run.mapId].name : boss ? info.def.bossName : `WAVE ${info.actWave}`, canvas.width / 2, canvas.height * 0.42);
  ctx.shadowBlur = 0;
  ctx.font = '12px monospace';
  ctx.fillStyle = boss ? '#ffe8a1' : 'rgba(255,255,255,.75)';
  ctx.fillText(farm ? `난이도 ${DIFFICULTY[game.run.difficulty].label} · ${game.hero.mapRuns[`${game.run.mapId}:${game.run.difficulty}`] || 1}번째 입장` : boss ? info.def.bossSub : info.def.name, canvas.width / 2, canvas.height * 0.42 + 24);
  ctx.restore();
}

// 막 전환 장면: 어두워졌다 밝아지며(가운데에서 바닥이 바뀜) 다음 막 이름 / 보스 처치 뒤엔 '다음 막까지 N초'
export function drawActScene() {
  if (game.gameState !== 'playing' || game.run.mode !== 'wave') return;
  ui.nextActRect = null;
  if (game.actClear > 0 && !ui.showInventory) { // 보스 처치 뒤: 상단 가운데 버튼 (클릭 영역은 그릴 때마다 등록 - input.js)
    const last = game.act >= ACTS.length - 1;
    const w = 200, h = 38, x = canvas.width / 2 - w / 2, y = 96;
    ui.nextActRect = { x, y, w, h };
    const pulse = 0.5 + Math.sin(performance.now() / 260) * 0.5;
    ctx.save();
    ctx.fillStyle = 'rgba(20,14,8,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = `rgba(255,214,102,${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(last ? '목장 완료 ▶' : '다음 막으로 ▶', canvas.width / 2, y + h / 2 - 1);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Enter', x + w - 22, y + h / 2);
    ctx.restore();
  }
  if (!(game.actScene > 0)) return;
  const k = 1 - game.actScene / ACT_SCENE;                 // 0 → 1
  const dark = k < 0.5 ? k * 2 : (1 - k) * 2;              // 0 → 1 → 0
  const next = ACTS[Math.min(ACTS.length - 1, k < 0.5 ? game.act + 1 : game.act)];
  ctx.save();
  ctx.globalAlpha = 0.88 * dark;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = Math.min(1, dark * 1.6);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1d06b';
  ctx.font = '900 34px Georgia, serif';
  ctx.fillText(next.name, canvas.width / 2, canvas.height * 0.45);
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(next.sub, canvas.width / 2, canvas.height * 0.45 + 26);
  ctx.restore();
}

export function drawDemoTip() {
  if (game.demoTipTimer <= 0 || game.gameState !== 'playing' || ui.showInventory) return;
  const alpha = Math.min(1, game.demoTipTimer) * Math.min(1, (5.0 - game.demoTipTimer) * 2 + 1);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  const w = Math.min(430, canvas.width - 40), h = 38;
  const x = (canvas.width - w) / 2, y = canvas.height - 62;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,220,150,.35)'; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#f4e6c6'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('슬롯: Space/E 길게 · Q/R 전환 · 1/2 물약 · I 장비', canvas.width / 2, y + 24);
  ctx.restore();
  ctx.textAlign = 'left';
}

export function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = 'rgba(4,7,9,.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2, cy = canvas.height / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1eadb';
  ctx.font = '900 38px sans-serif';
  ctx.fillText('PAUSED', cx, cy - 38);
  ctx.fillStyle = 'rgba(255,255,255,.74)';
  ctx.font = '14px sans-serif';
  ctx.fillText('P / ESC / 좌측 상단 버튼으로 계속', cx, cy + 2);
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,.50)';
  ctx.fillText(`WAVE ${game.wave}  ·  KILLS ${game.kills}  ·  v${RELEASE_VERSION}`, cx, cy + 34);
  ctx.restore();
}
