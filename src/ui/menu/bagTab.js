// 메뉴 - 가방 탭 (칸 목록 + 선택 아이템 상세: 감정/장착)
import { INVENTORY_SIZE, IDENTIFY_DURATION } from '../../data/balance.js';
import { STAT_DEF, ARMOR_LABEL } from '../../data/items.js';
import { game, ui } from '../../state.js';
import { showInvToast } from '../../systems/fx.js';
import { tryIdentify, equipFromInventory, gearArmor } from '../../systems/gear.js';
import { gearDisplayName, gearTitle, unidentifiedTitle, gearColor, UNIDENTIFIED_COLOR } from '../itemView.js';
import { getInvViewIndex, fitText, getCompareItemForGear } from './common.js';

export function drawBagTab(ctx, x, startRow, w, bottom) {
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`가방 (${game.hero.inventory.length}/${INVENTORY_SIZE})`, x + 16, startRow);
  ctx.textAlign = 'right';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('클릭하면 고정 · 올려두면 미리보기', x + w - 16, startRow);
  ctx.textAlign = 'left';

  if (ui.selectedInvIndex !== null && !game.hero.inventory[ui.selectedInvIndex]) ui.selectedInvIndex = null;
  if (ui.hoverInvIndex !== null && !game.hero.inventory[ui.hoverInvIndex]) ui.hoverInvIndex = null;

  const cols = 2, gapX = 6, gapY = 3, rowH = 24;
  const colW = (w - 32 - gapX) / cols;
  const listTop = startRow + 10;
  const count = game.hero.inventory.length;
  const rows = Math.max(1, Math.ceil(count / cols));

  if (count === 0) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText('가방이 비어 있어', x + 16, listTop + 16);
  }
  game.hero.inventory.forEach((g, i) => {
    const cx = x + 16 + (i % cols) * (colW + gapX);
    const cy = listTop + Math.floor(i / cols) * (rowH + gapY);
    const pinned = i === ui.selectedInvIndex;
    const hovered = i === ui.hoverInvIndex;
    ctx.fillStyle = pinned ? 'rgba(255,224,102,0.22)' : hovered ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(cx, cy, colW, rowH);
    ctx.strokeStyle = pinned ? '#ffe066' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = pinned ? 1.8 : 1;
    ctx.strokeRect(cx, cy, colW, rowH);

    let text, color;
    if (g.identified) {
      text = gearTitle(g);
      color = gearColor(g);
    } else {
      text = unidentifiedTitle(g, ui.identifyingItem === g);
      color = UNIDENTIFIED_COLOR;
    }
    ctx.font = '11px sans-serif';
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(fitText(ctx, text, colW - 14), cx + 7, cy + rowH / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    if (ui.identifyingItem === g) {
      const prog = 1 - Math.max(ui.identifyTimer, 0) / IDENTIFY_DURATION;
      ctx.fillStyle = 'rgba(255,224,102,0.85)';
      ctx.fillRect(cx + 1, cy + rowH - 3, (colW - 2) * prog, 2);
    }
    ui.invSlotRects.push({ x: cx, y: cy, w: colW, h: rowH, index: i });
  });

  const detailTop = listTop + rows * (rowH + gapY) + 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 16, detailTop - 6); ctx.lineTo(x + w - 16, detailTop - 6); ctx.stroke();
  drawBagDetail(ctx, x, detailTop + 8, w, bottom);
}

export function drawBagDetail(ctx, x, top, w, bottom) {
  const idx = getInvViewIndex();
  const pinned = idx !== null && idx === ui.selectedInvIndex;
  ctx.textAlign = 'left';
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

  const btnH = 32;
  const addButton = (label, fn, enabled = true) => {
    const bx = x + 16, bw = w - 32;
    const by = Math.max(bottom - btnH, y + 6);
    ui.invButtons.push({ x: bx, y: by, w: bw, h: btnH, fn });
    ctx.fillStyle = enabled ? 'rgba(255,224,102,0.25)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(bx, by, bw, btnH);
    ctx.strokeStyle = enabled ? '#ffe066' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, btnH);
    ctx.fillStyle = enabled ? '#ffe066' : '#aaa';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + bw / 2, by + btnH / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  };
  const hintLine = (text) => {
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(text, x + 16, bottom - 4);
  };

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
    } else {
      hintLine('클릭해서 고정하면 감정할 수 있어');
    }
    return;
  }

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = gearColor(sel);
  ctx.fillText(fitText(ctx, gearTitle(sel, { hand: true }), w - 32), x + 16, y);
  y += 19;

  ctx.font = '11px sans-serif';
  const selArmor = gearArmor(sel);
  if (selArmor) {
    ctx.fillStyle = '#c9b48a';
    ctx.fillText(`${ARMOR_LABEL} ${selArmor}`, x + 16, y);
    y += 15;
  }
  Object.entries(sel.stats).forEach(([k, v]) => {
    ctx.fillStyle = '#dfe9d8';
    ctx.fillText(`${STAT_DEF[k].label} ${STAT_DEF[k].fmt(v)}`, x + 16, y);
    y += 15;
  });

  const equipped = getCompareItemForGear(sel);
  if (equipped && equipped !== sel) {
    y += 5;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = gearColor(equipped);
    ctx.fillText(fitText(ctx, `현재 장착: ${gearTitle(equipped, { upgrade: false })}`, w - 32), x + 16, y);
    y += 15;
    ctx.font = '11px sans-serif';
    const keys = Array.from(new Set([...Object.keys(sel.stats || {}), ...Object.keys(equipped.stats || {})]));
    // 방어력(기본값)도 비교 줄에 포함 - 둘 다 0이면 생략
    const rows = keys.map((k) => ({ label: STAT_DEF[k].label, delta: +((sel.stats[k] || 0) - (equipped.stats[k] || 0)).toFixed(4), fmt: STAT_DEF[k].fmt }));
    const eqArmor = gearArmor(equipped);
    if (selArmor || eqArmor) rows.unshift({ label: ARMOR_LABEL, delta: selArmor - eqArmor, fmt: (v) => `${Math.round(v)}` });
    rows.forEach(({ label, delta, fmt }) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#a8b8a0';
      ctx.fillText(`  ${label}`, x + 16, y);
      ctx.textAlign = 'right';
      // fmt 결과에 이미 '+'가 붙어 있으므로 떼고 부호를 직접 붙임 (그대로 쓰면 "++6"처럼 중복됨)
      const plain = (v) => fmt(v).replace(/^\+/, '');
      if (delta > 0) { ctx.fillStyle = '#7fe08a'; ctx.fillText(`▲ +${plain(delta)}`, x + w - 16, y); }
      else if (delta < 0) { ctx.fillStyle = '#ff6b6b'; ctx.fillText(`▼ -${plain(Math.abs(delta))}`, x + w - 16, y); }
      else { ctx.fillStyle = '#888'; ctx.fillText('동일', x + w - 16, y); }
      y += 14;
    });
    ctx.textAlign = 'left';
  }

  if (pinned) {
    const eq = game.hero.equipment;
    let label = '장착하기';
    if (sel.category === 'weapon' && sel.handedness === 'two' && eq.weaponOff && eq.weaponOff !== 'LOCKED') label = '장착하기 (보조손 장비 해제)';
    if (sel.category === 'shield' && eq.weaponMain && eq.weaponMain !== 'LOCKED' && eq.weaponMain.handedness === 'two') label = '장착하기 (양손무기 해제)';
    addButton(label, () => {
      const g = game.hero.inventory[ui.selectedInvIndex];
      if (!g) return;
      const name = gearDisplayName(g);
      equipFromInventory(ui.selectedInvIndex);
      ui.selectedInvIndex = null;
      ui.hoverInvIndex = null;
      showInvToast(`${name} 장착`, '#9be39b');
    });
  } else {
    hintLine('클릭해서 고정하면 장착할 수 있어');
  }
}
