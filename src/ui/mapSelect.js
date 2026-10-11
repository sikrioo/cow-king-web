// 맵 선택 화면 (gameState 'hub'). 그리기만 - 고르기/입장은 session.js (키보드: game.handleKeyDown, 클릭: input.js → main.hubClick)
// 클릭 영역은 그릴 때마다 ui.hubRects에 { x, y, w, h, action, ... }로 다시 등록
import { canvas, ctx } from '../core/context.js';
import { game, ui } from '../state.js';
import { MAPS, MAP_ORDER } from '../data/maps.js';
import { DIFFICULTY } from '../data/difficulty.js';
import { CLASSES } from '../data/classes.js';
import { MAX_LEVEL } from '../data/balance.js';
import { runKey } from '../systems/mapRun.js';

const IMMUNE_NAME = { phys: '물리', fire: '화염', cold: '냉기', lightning: '번개', poison: '독' };

const rect = (x, y, w, h, extra) => { ui.hubRects.push({ x, y, w, h, ...extra }); };

function button(x, y, w, h, text, extra, style = {}) {
  rect(x, y, w, h, extra);
  ctx.fillStyle = style.fill || 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = style.stroke || 'rgba(255,255,255,0.45)';
  ctx.lineWidth = style.lineWidth || 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = style.color || '#fff';
  ctx.font = style.font || 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

// 이 맵·지금 옵션의 입장 횟수 (파밍 회차)
function runCount(id) {
  const def = MAPS[id];
  return (game.hero.mapRuns && game.hero.mapRuns[runKey(id, ui.hubDifficulty)]) || 0;
}

export function drawMapSelect(t) {
  ui.hubRects = [];
  const W = canvas.width, H = canvas.height;
  const pw = Math.min(560, W - 32);
  const x = (W - pw) / 2;
  const h = game.hero;
  ctx.save();
  ctx.fillStyle = 'rgba(4,10,6,0.62)';
  ctx.fillRect(0, 0, W, H);

  // 제목 + 캐릭터 요약
  let y = Math.max(24, H / 2 - 270);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2e7c9';
  ctx.font = '900 26px Georgia, serif';
  ctx.fillText('맵 선택', W / 2, y + 22);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#d2ba82';
  const expPct = h.level >= MAX_LEVEL ? 100 : Math.floor((h.exp / h.expToNext) * 100);
  ctx.fillText(`${CLASSES[h.classKey].label} Lv.${h.level} (${expPct}%) · 재료 ${h.materials} · 가방 ${h.inventory.length}칸`, W / 2, y + 44);
  y += 60;

  // 맵 카드
  MAP_ORDER.forEach((id) => {
    const def = MAPS[id];
    const sel = ui.hubMap === id;
    const ch = sel ? 132 : 64;
    rect(x, y, pw, ch, { action: 'map', map: id });
    ctx.fillStyle = sel ? 'rgba(40,60,42,0.92)' : 'rgba(22,33,26,0.85)';
    ctx.fillRect(x, y, pw, ch);
    ctx.strokeStyle = sel ? '#ffe066' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(x + 1, y + 1, pw - 2, ch - 2);
    ctx.fillStyle = def.ground.base; // 맵 색 띠
    ctx.fillRect(x, y, 8, ch);

    ctx.textAlign = 'left';
    ctx.fillStyle = def.mode === 'farm' ? '#ffb347' : '#9be39b';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(def.mode === 'farm' ? '파밍 · 아이템' : '레벨업 · 웨이브', x + 20, y + 20);
    ctx.fillStyle = '#f2ecd8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(def.name, x + 20, y + 44);
    ctx.textAlign = 'right';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`입장 ${runCount(id)}회`, x + pw - 14, y + 20);
    ctx.textAlign = 'left';
    if (sel) drawOptions(def, x, y + 52, pw);
    y += ch + 10;
  });

  // 버튼: 입장 / 장비 / 새 캐릭터
  const bw = Math.min(220, pw * 0.5), bh = 44;
  const pulse = 0.5 + Math.sin(t * 3.4) * 0.25;
  button((W - bw) / 2, y + 4, bw, bh, `${MAPS[ui.hubMap].name} 입장`, { action: 'enter' },
    { fill: `rgba(255,224,102,${0.22 + pulse * 0.18})`, stroke: '#ffe066', lineWidth: 2, color: '#fff6cf', font: 'bold 16px sans-serif' });
  ctx.textAlign = 'center';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('Space/Enter 입장 · ↑↓ 맵 · ←→ 난이도 · I 장비', W / 2, y + bh + 22);
  button(x + pw - 110, y + bh + 34, 110, 28, '새 캐릭터', { action: 'title' }, { font: '12px sans-serif', color: 'rgba(255,255,255,0.75)' });
  ctx.restore();
}

// 고른 맵의 옵션: 난이도(+ 효과 요약) - 목장·파밍 맵 공통
function drawOptions(def, x, y, w) {
  const d = DIFFICULTY[ui.hubDifficulty];
  const label = '난이도';
  const value = d.label;
  const color = d.color;
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(def.desc, x + 20, y + 12);
  const oy = y + 24;
  ctx.fillText(label, x + 20, oy + 17);
  button(x + 104, oy, 32, 26, '◀', { action: 'opt', dir: -1 });
  ctx.fillStyle = color;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value, x + 186, oy + 18);
  button(x + 236, oy, 32, 26, '▶', { action: 'opt', dir: 1 });
  ctx.textAlign = 'left';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(`권장 Lv.${d.level}`, x + 282, oy + 17);
  const immune = def.immune && d.immunePack > 0 ? ` · 면역 무리 ${Math.round(d.immunePack * 100)}% (${def.immune.map((k) => IMMUNE_NAME[k]).join('·')})` : '';
  const pen = d.resistPenalty ? ` · 내 저항 -${Math.round(d.resistPenalty * 100)}% · 내 방어력 -${Math.round(d.armorPenalty * 100)}%` : '';
  ctx.fillText(`체력 ×${d.hp} · 공격 ×${d.dmg} · 경험치 ×${d.exp} · 장비 ×${d.gearDrop} · 높은 등급 ×${d.rarity}${pen}${immune}`, x + 20, oy + 46, w - 34);
}
