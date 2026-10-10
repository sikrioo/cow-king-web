// 메뉴 - 가방 탭 (착용 중 장비 + 가방 칸 목록 + 선택 아이템 상세: 감정/장착/비교)
// 착용 중 칸은 ui.selectedEquipSlot/hoverEquipSlot(슬롯 이름), 가방 칸은 ui.selectedInvIndex/hoverInvIndex(인덱스)로 따로 고른다
import { INVENTORY_SIZE, IDENTIFY_DURATION } from '../../data/balance.js';
import { STAT_DEF, GEAR_SLOTS } from '../../data/items.js';
import { game, ui } from '../../state.js';
import { showInvToast } from '../../systems/fx.js';
import { tryIdentify, equipFromInventory, unequipSlot } from '../../systems/gear.js';
import { discardFromInventory } from '../../systems/loot.js';
import { gearDisplayName, gearTitle, unidentifiedTitle, gearColor, UNIDENTIFIED_COLOR, rollTag, optionText, statKeysInOrder } from '../itemView.js';
import { getInvViewIndex, fitText, getCompareTargets, gearBaseParts } from './common.js';

const WORN_COLOR = '#9be39b';

function wornGear() {
  return GEAR_SLOTS.map((slot) => ({ slot, g: game.hero.equipment[slot] })).filter(({ g }) => g && g !== 'LOCKED');
}

// 칸 하나 그리기 (가방/착용 중 공용)
function drawCell(ctx, r, text, color, { pinned, hovered, worn }) {
  if (worn) ctx.fillStyle = pinned ? 'rgba(155,227,155,0.26)' : hovered ? 'rgba(155,227,155,0.16)' : 'rgba(155,227,155,0.07)';
  else ctx.fillStyle = pinned ? 'rgba(255,224,102,0.22)' : hovered ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.05)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = pinned ? (worn ? WORN_COLOR : '#ffe066') : worn ? 'rgba(155,227,155,0.35)' : 'rgba(255,255,255,0.16)';
  ctx.lineWidth = pinned ? 1.8 : 1;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  let tx = r.x + 7;
  ctx.textBaseline = 'middle';
  if (worn) {
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = WORN_COLOR;
    ctx.fillText('E', tx, r.y + r.h / 2 + 1);
    tx += 12;
  }
  ctx.font = '11px sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(fitText(ctx, text, r.x + r.w - 7 - tx), tx, r.y + r.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

export function drawBagTab(ctx, x, startRow, w, bottom) {
  if (ui.selectedInvIndex !== null && !game.hero.inventory[ui.selectedInvIndex]) ui.selectedInvIndex = null;
  if (ui.hoverInvIndex !== null && !game.hero.inventory[ui.hoverInvIndex]) ui.hoverInvIndex = null;
  const eq = game.hero.equipment;
  if (ui.selectedEquipSlot && (!eq[ui.selectedEquipSlot] || eq[ui.selectedEquipSlot] === 'LOCKED')) ui.selectedEquipSlot = null;
  if (ui.hoverEquipSlot && (!eq[ui.hoverEquipSlot] || eq[ui.hoverEquipSlot] === 'LOCKED')) ui.hoverEquipSlot = null;

  const cols = 2, gapX = 6, gapY = 3;
  const colW = (w - 32 - gapX) / cols;

  // --- 착용 중
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = WORN_COLOR;
  ctx.fillText('착용 중', x + 16, startRow);
  ctx.textAlign = 'right';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('클릭하면 고정 · 올려두면 미리보기', x + w - 16, startRow);
  ctx.textAlign = 'left';

  const worn = wornGear();
  const wornRowH = 22;
  const wornTop = startRow + 8;
  worn.forEach(({ slot, g }, i) => {
    const r = { x: x + 16 + (i % cols) * (colW + gapX), y: wornTop + Math.floor(i / cols) * (wornRowH + gapY), w: colW, h: wornRowH };
    drawCell(ctx, r, gearTitle(g), gearColor(g), { pinned: slot === ui.selectedEquipSlot, hovered: slot === ui.hoverEquipSlot, worn: true });
    ui.invSlotRects.push({ ...r, slot });
  });
  const wornRows = Math.max(1, Math.ceil(worn.length / cols));
  if (worn.length === 0) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText('착용한 장비가 없어', x + 16, wornTop + 15);
  }

  // --- 가방
  const bagTitleY = wornTop + wornRows * (wornRowH + gapY) + 16;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`가방 (${game.hero.inventory.length}/${INVENTORY_SIZE})`, x + 16, bagTitleY);

  const rowH = 24;
  const listTop = bagTitleY + 8;
  const count = game.hero.inventory.length;
  const rows = Math.max(1, Math.ceil(count / cols));

  if (count === 0) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText('가방이 비어 있어', x + 16, listTop + 16);
  }
  game.hero.inventory.forEach((g, i) => {
    const r = { x: x + 16 + (i % cols) * (colW + gapX), y: listTop + Math.floor(i / cols) * (rowH + gapY), w: colW, h: rowH };
    const text = g.identified ? gearTitle(g) : unidentifiedTitle(g, ui.identifyingItem === g);
    drawCell(ctx, r, text, g.identified ? gearColor(g) : UNIDENTIFIED_COLOR, { pinned: i === ui.selectedInvIndex, hovered: i === ui.hoverInvIndex, worn: false });
    if (ui.identifyingItem === g) {
      const prog = 1 - Math.max(ui.identifyTimer, 0) / IDENTIFY_DURATION;
      ctx.fillStyle = 'rgba(255,224,102,0.85)';
      ctx.fillRect(r.x + 1, r.y + rowH - 3, (colW - 2) * prog, 2);
    }
    ui.invSlotRects.push({ ...r, index: i });
  });

  const detailTop = listTop + rows * (rowH + gapY) + 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 16, detailTop - 6); ctx.lineTo(x + w - 16, detailTop - 6); ctx.stroke();
  drawBagDetail(ctx, x, detailTop + 8, w, bottom);
}

// 기본 속성(무기 피해/공격속도/방어력) + 옵션 줄
function drawGearLines(ctx, gear, x, y) {
  ctx.font = '11px sans-serif';
  gearBaseParts(gear).forEach((p) => {
    ctx.fillStyle = '#c9b48a';
    ctx.fillText(`${p.label} ${p.text}`, x, y);
    y += 15;
  });
  statKeysInOrder(gear).forEach((k) => {
    const r = rollTag(gear, k);
    ctx.fillStyle = r && r.tag ? r.color : '#dfe9d8'; // 꽝은 흐리게, 최상은 금색
    ctx.fillText(optionText(gear, k, gear.stats[k], { detail: true }), x, y);
    y += 15;
  });
  if (gear.ilvl) { // 아이템 레벨 (붙을 수 있는 접사 티어를 정함)
    ctx.fillStyle = '#7f8a7c';
    ctx.fillText(`아이템 레벨 ${gear.ilvl}${gear.affixes && !gear.affixes.length ? ' · 옵션 없음' : ''}`, x, y);
    y += 15;
  }
  return y;
}

// 착용 중 장비 상세 (해제 버튼은 drawBagDetailBody가 아래 버튼 줄에 - 강화는 강화 탭)
function drawWornDetail(ctx, gear, x, y, w, bottom) {
  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = WORN_COLOR;
  ctx.fillText('착용 중', x + 16, y);
  y += 16;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = gearColor(gear);
  ctx.fillText(fitText(ctx, gearTitle(gear, { hand: true }), w - 32), x + 16, y);
  y += 19;
  drawGearLines(ctx, gear, x + 16, y);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('착용 중인 장비 · 강화는 강화 탭에서', x + 16, bottom - 4);
  return y;
}

// 상세: 내용은 버튼 줄 위 영역에만 그리고(넘치면 잘림), 버튼 줄은 항상 패널 맨 아래에 고정
const BTN_H = 32;
export function drawBagDetail(ctx, x, top, w, bottom) {
  const out = { buttons: [], hint: null };
  const contentBottom = bottom - BTN_H - 8;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, top - 14, w - 4, contentBottom - (top - 14));
  ctx.clip();
  drawBagDetailBody(ctx, x, top, w, contentBottom, out);
  ctx.restore();
  drawDetailFooter(ctx, x, w, bottom, out);
}

// 버튼 줄: 버리기는 오른쪽 좁은 버튼, 나머지(장착/감정)는 남은 폭을 나눔
function drawDetailFooter(ctx, x, w, bottom, out) {
  if (!out.buttons.length) {
    if (out.hint) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(out.hint, x + 16, bottom - 4);
    }
    return;
  }
  const gap = 6, discardW = 64, by = bottom - BTN_H;
  const mains = out.buttons.filter((b) => b.kind !== 'discard');
  const discards = out.buttons.filter((b) => b.kind === 'discard');
  const mainW = (w - 32 - discards.length * (discardW + gap) - gap * Math.max(0, mains.length - 1)) / Math.max(1, mains.length);
  let bx = x + 16;
  const draw = (b, bw) => {
    ui.invButtons.push({ x: bx, y: by, w: bw, h: BTN_H, fn: b.fn });
    const discard = b.kind === 'discard';
    const main = discard ? '#ff9b6b' : '#ffe066';
    ctx.fillStyle = b.enabled ? (discard ? 'rgba(255,155,107,0.16)' : 'rgba(255,224,102,0.25)') : 'rgba(255,255,255,0.08)';
    ctx.fillRect(bx, by, bw, BTN_H);
    ctx.strokeStyle = b.enabled ? main : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, BTN_H);
    ctx.fillStyle = b.enabled ? main : '#aaa';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitText(ctx, b.label, bw - 10), bx + bw / 2, by + BTN_H / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    bx += bw + gap;
  };
  mains.forEach((b) => draw(b, mainW));
  discards.forEach((b) => draw(b, discardW));
}

function drawBagDetailBody(ctx, x, top, w, bottom, out) {
  ctx.textAlign = 'left';
  // 착용 중 칸을 고정했거나(우선), 가방 칸 고정이 없을 때 착용 중 칸에 올려둔 경우
  const wornSlot = ui.selectedEquipSlot || (ui.selectedInvIndex === null ? ui.hoverEquipSlot : null);
  if (wornSlot) {
    const worn = game.hero.equipment[wornSlot];
    if (!worn || worn === 'LOCKED') return;
    drawWornDetail(ctx, worn, x, top + 10, w, bottom);
    out.buttons.push({ label: '착용 해제 (가방으로)', fn: () => { if (unequipSlot(wornSlot)) { ui.selectedEquipSlot = null; ui.hoverEquipSlot = null; } }, enabled: true, kind: 'main' });
    return;
  }
  const idx = getInvViewIndex();
  const pinned = idx !== null && idx === ui.selectedInvIndex;
  if (idx === null) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('아이템을 누르면 옵션이 여기에 고정돼.', x + 16, top + 8);
    return;
  }
  const sel = game.hero.inventory[idx];
  let y = top + 10;

  // 방금 감정된 아이템이면 등급색으로 잠깐 번쩍임
  if (ui.invReveal && ui.invReveal.item === sel && performance.now() < ui.invReveal.until) {
    const p = (ui.invReveal.until - performance.now()) / 1100;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p)) * 0.35;
    ctx.fillStyle = ui.invReveal.color;
    ctx.fillRect(x + 8, top - 6, w - 16, bottom - top + 6);
    ctx.restore();
  }

  // 버튼/안내는 모아 뒀다가 drawDetailFooter가 맨 아래에 그림
  const addButton = (label, fn, enabled = true, kind = 'main') => out.buttons.push({ label, fn, enabled, kind });
  const hintLine = (text) => { out.hint = text; };
  const addDiscard = () => addButton('버리기', () => {
    const g = game.hero.inventory[ui.selectedInvIndex];
    if (!g) return;
    const name = g.identified ? gearDisplayName(g) : unidentifiedTitle(g);
    discardFromInventory(ui.selectedInvIndex);
    ui.selectedInvIndex = null;
    ui.hoverInvIndex = null;
    showInvToast(`${name} 버림 (발밑)`, '#ff9b6b');
  }, true, 'discard');

  if (!sel.identified) {
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#c9c9c9';
    ctx.fillText(unidentifiedTitle(sel), x + 16, y);
    y += 20;
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('등급과 옵션은 감정해야 알 수 있어.', x + 16, y);
    y += 15;
    ctx.fillText('감정 전에는 장착할 수 없어.', x + 16, y);
    y += 15;
    if (pinned) {
      const identifying = ui.identifyingItem === sel;
      const dots = identifying ? '.'.repeat(1 + Math.floor((performance.now() / 300) % 3)) : '';
      addButton(identifying ? `감정 중${dots}` : '감정하기', () => tryIdentify(ui.selectedInvIndex), !identifying);
      addDiscard();
    } else {
      hintLine('클릭해서 고정하면 감정할 수 있어');
    }
    return;
  }

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = gearColor(sel);
  ctx.fillText(fitText(ctx, gearTitle(sel, { hand: true }), w - 32), x + 16, y);
  y += 19;
  y = drawGearLines(ctx, sel, x + 16, y);

  // 착용 중 장비와 비교 - 한손 무기는 주무기/보조무기 각각. 초록 테두리 상자로 따로 묶음 (고른 아이템과 헷갈리지 않게)
  getCompareTargets(sel).filter((t) => t.gear !== sel).forEach(({ gear: equipped, label: slotLabel }) => {
    // 비교 행: 기본 속성(같은 이름끼리) + 옵션
    const selBase = gearBaseParts(sel), eqBase = gearBaseParts(equipped);
    const baseLabels = Array.from(new Set([...selBase, ...eqBase].map((p) => p.label)));
    const rows = baseLabels.map((label) => {
      const a = selBase.find((p) => p.label === label), b = eqBase.find((p) => p.label === label);
      const ref = a || b;
      return { label: ref.cmpLabel || label, delta: +((a ? a.value : 0) - (b ? b.value : 0)).toFixed(4), fmt: ref.fmt };
    });
    const keys = Array.from(new Set([...Object.keys(sel.stats || {}), ...Object.keys(equipped.stats || {})]));
    keys.forEach((k) => rows.push({ label: STAT_DEF[k].label, delta: +((sel.stats[k] || 0) - (equipped.stats[k] || 0)).toFixed(4), fmt: STAT_DEF[k].fmt }));

    y += 6;
    const boxTop = y - 4;
    const boxH = 8 + 16 + rows.length * 14;
    ctx.fillStyle = 'rgba(155,227,155,0.06)';
    ctx.fillRect(x + 12, boxTop, w - 24, boxH);
    ctx.strokeStyle = 'rgba(155,227,155,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 12.5, boxTop + 0.5, w - 25, boxH - 1);
    y += 12;
    const tag = slotLabel ? `착용 중 · ${slotLabel}` : '착용 중';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = WORN_COLOR;
    ctx.fillText(tag, x + 20, y);
    const tagW = ctx.measureText(tag).width;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = gearColor(equipped);
    ctx.fillText(fitText(ctx, gearTitle(equipped, { upgrade: false }), w - 48 - tagW), x + 28 + tagW, y);
    y += 16;
    ctx.font = '11px sans-serif';
    rows.forEach(({ label, delta, fmt }) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#a8b8a0';
      ctx.fillText(`  ${label}`, x + 16, y);
      ctx.textAlign = 'right';
      // fmt 결과에 이미 '+'가 붙어 있으므로 떼고 부호를 직접 붙임 (그대로 쓰면 "++6"처럼 중복됨)
      const plain = (v) => fmt(v).replace(/^\+/, '');
      if (delta > 0) { ctx.fillStyle = '#7fe08a'; ctx.fillText(`▲ +${plain(delta)}`, x + w - 20, y); }
      else if (delta < 0) { ctx.fillStyle = '#ff6b6b'; ctx.fillText(`▼ -${plain(Math.abs(delta))}`, x + w - 20, y); }
      else { ctx.fillStyle = '#888'; ctx.fillText('동일', x + w - 20, y); }
      y += 14;
    });
    ctx.textAlign = 'left';
  });

  if (pinned) {
    const eq = game.hero.equipment;
    const equipAs = (slot) => () => {
      const g = game.hero.inventory[ui.selectedInvIndex];
      if (!g) return;
      const name = gearDisplayName(g);
      equipFromInventory(ui.selectedInvIndex, slot);
      ui.selectedInvIndex = null;
      ui.hoverInvIndex = null;
      showInvToast(`${name} 장착`, WORN_COLOR);
    };
    const main = eq.weaponMain && eq.weaponMain !== 'LOCKED' ? eq.weaponMain : null;
    if (sel.category === 'weapon' && sel.handedness === 'one' && main && main.handedness === 'one') {
      // 한손 무기 + 주무기가 이미 있음 → 어느 칸에 넣을지 선택
      const off = eq.weaponOff && eq.weaponOff !== 'LOCKED' ? eq.weaponOff : null;
      addButton('주무기로 장착', equipAs('weaponMain'));
      addButton(off && off.category === 'shield' ? '보조무기로 (방패 해제)' : '보조무기로 장착', equipAs('weaponOff'));
    } else {
      let label = sel.category === 'weapon' && sel.handedness === 'one' ? '주무기로 장착' : '장착하기';
      if (sel.category === 'weapon' && sel.handedness === 'two' && eq.weaponOff && eq.weaponOff !== 'LOCKED') label = '장착하기 (보조손 장비 해제)';
      if (sel.category === 'shield' && main && main.handedness === 'two') label = '장착하기 (양손무기 해제)';
      addButton(label, equipAs(null));
    }
    addDiscard();
  } else {
    hintLine('클릭해서 고정하면 장착할 수 있어');
  }
}
