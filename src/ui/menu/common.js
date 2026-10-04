// 캔버스 메뉴 공용 도우미 (클릭 영역 판정, 보고 있는 가방 칸, 글자 맞춤, 비교 대상 장비)
import { STAT_DEF } from '../../data/items.js';
import { game, ui } from '../../state.js';

export function pointInRect(px, py, r) {
  return r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// 가방에서 상세정보로 보여줄 칸: 클릭해서 고정한 것이 우선, 없으면 마우스가 올라가 있는 것
export function getInvViewIndex() {
  if (ui.selectedInvIndex !== null && game.hero.inventory[ui.selectedInvIndex]) return ui.selectedInvIndex;
  if (ui.hoverInvIndex !== null && game.hero.inventory[ui.hoverInvIndex]) return ui.hoverInvIndex;
  return null;
}

export function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

export function wrapStatLines(ctx, stats, maxW) {
  const lines = [];
  let line = '';
  Object.entries(stats).forEach(([k, v]) => {
    const part = `${STAT_DEF[k].label}${STAT_DEF[k].fmt(v)}`;
    const test = line ? `${line}  ${part}` : part;
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = part; }
    else line = test;
  });
  if (line) lines.push(line);
  return lines;
}

export function getCompareItemForGear(it) {
  if (!it || it === 'LOCKED') return null;
  const eq = game.hero.equipment;
  if (it.category === 'weapon') return eq.weaponMain && eq.weaponMain !== 'LOCKED' ? eq.weaponMain : null;
  if (it.category === 'shield') return eq.weaponOff && eq.weaponOff !== 'LOCKED' && eq.weaponOff.category === 'shield' ? eq.weaponOff : null;
  if (it.category === 'accessory') return eq.accessory1 || eq.accessory2 || null;
  return eq[it.category] && eq[it.category] !== 'LOCKED' ? eq[it.category] : null;
}
