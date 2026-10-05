// 캔버스 메뉴 공용 도우미 (클릭 영역 판정, 보고 있는 가방 칸, 글자 맞춤, 비교 대상 장비)
import { STAT_DEF, ARMOR_LABEL, WEAPON_DAMAGE_LABEL, WEAPON_SPEED_LABEL } from '../../data/items.js';
import { gearArmor, weaponStats } from '../../systems/gear.js';
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

// 장비 기본 속성(옵션이 아닌 것): 무기 피해/공격속도, 방어구 방어력
//   → [{ label, text(표시), value(비교용 수치), fmt(차이 표시), cmpLabel? }]
export function gearBaseParts(gear) {
  const parts = [];
  const ws = weaponStats(gear);
  if (ws) {
    parts.push({ label: WEAPON_DAMAGE_LABEL, cmpLabel: `${WEAPON_DAMAGE_LABEL}(평균)`, text: `${ws.min}~${ws.max}`, value: (ws.min + ws.max) / 2, fmt: (v) => `${+v.toFixed(1)}` });
    parts.push({ label: WEAPON_SPEED_LABEL, text: `${(1 / ws.interval).toFixed(1)}회/초`, value: 1 / ws.interval, fmt: (v) => `${v.toFixed(1)}회` });
  }
  const armor = gearArmor(gear);
  if (armor) parts.push({ label: ARMOR_LABEL, text: `${armor}`, value: armor, fmt: (v) => `${Math.round(v)}` });
  return parts;
}

// 기본 속성 + 옵션을 폭에 맞춰 여러 줄로
export function wrapStatLines(ctx, gear, maxW) {
  const lines = [];
  let line = '';
  const parts = [
    ...gearBaseParts(gear).map((p) => `${p.label} ${p.text}`),
    ...Object.entries(gear.stats).map(([k, v]) => `${STAT_DEF[k].label}${STAT_DEF[k].fmt(v)}`)
  ];
  parts.forEach((part) => {
    const test = line ? `${line}  ${part}` : part;
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = part; }
    else line = test;
  });
  if (line) lines.push(line);
  return lines;
}

// 비교 대상 목록 [{ gear, label }] - 한손 무기는 주무기와 보조무기(무기일 때) 둘 다
export function getCompareTargets(it) {
  if (!it || it === 'LOCKED') return [];
  const eq = game.hero.equipment;
  const valid = (g) => g && g !== 'LOCKED';
  if (it.category === 'weapon') {
    const list = [];
    if (valid(eq.weaponMain)) list.push({ gear: eq.weaponMain, label: '주무기' });
    if (it.handedness === 'one' && valid(eq.weaponOff) && eq.weaponOff.category === 'weapon') list.push({ gear: eq.weaponOff, label: '보조무기' });
    return list;
  }
  const g = getCompareItemForGear(it);
  return g ? [{ gear: g, label: '' }] : [];
}

export function getCompareItemForGear(it) {
  if (!it || it === 'LOCKED') return null;
  const eq = game.hero.equipment;
  if (it.category === 'weapon') return eq.weaponMain && eq.weaponMain !== 'LOCKED' ? eq.weaponMain : null;
  if (it.category === 'shield') return eq.weaponOff && eq.weaponOff !== 'LOCKED' && eq.weaponOff.category === 'shield' ? eq.weaponOff : null;
  if (it.category === 'accessory') return eq.accessory1 || eq.accessory2 || null;
  return eq[it.category] && eq[it.category] !== 'LOCKED' ? eq[it.category] : null;
}
