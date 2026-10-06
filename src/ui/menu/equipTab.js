// 메뉴 - 장비 탭 (장착 슬롯 목록 + 장비 합산 옵션)
import { GEAR_SLOTS, GEAR_SLOT_LABEL } from '../../data/items.js';
import { ELEMENTS, ELEMENT_DEF, RESIST_CAP } from '../../data/elements.js';
import { game } from '../../state.js';
import { gearTitle, gearColor } from '../itemView.js';
import { fitText, wrapStatLines } from './common.js';

export function drawEquipTab(ctx, x, startRow, w) {
  let row = startRow;
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText('착용 장비', x + 16, row);
  row += 20;

  const textX = x + 92;
  const maxW = w - 92 - 16;
  GEAR_SLOTS.forEach((slot) => {
    const it = game.hero.equipment[slot];
    const label = (slot === 'weaponOff' && it && it !== 'LOCKED' && it.category === 'shield') ? '방패' : GEAR_SLOT_LABEL[slot];
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#a8b8a0';
    ctx.fillText(label, x + 16, row);
    if (it === 'LOCKED') {
      ctx.font = '11px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('(양손무기 사용 중)', textX, row);
      row += 20;
    } else if (!it) {
      ctx.font = '11px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText('비어 있음', textX, row);
      row += 20;
    } else {
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = gearColor(it);
      ctx.fillText(fitText(ctx, gearTitle(it), maxW), textX, row);
      row += 13;
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#cfd8c8';
      wrapStatLines(ctx, it, maxW).forEach((ln) => { ctx.fillText(ln, textX, row); row += 12; });
      row += 7;
    }
  });

  row += 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 16, row - 8); ctx.lineTo(x + w - 16, row - 8); ctx.stroke();
  row += 8;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText('능력치 보너스 (장비+레벨)', x + 16, row);
  row += 17;

  const bonus = [
    ['공격속도', `+${Math.round(game.hero.gearAtkSpeed * 100)}%`],
    ['공격력', `+${game.hero.gearAtkPower}`],
    ['블락률', `+${Math.round(game.hero.gearDefense * 100)}%`],
    ['회피율', `+${Math.round(game.hero.gearEvasion * 100)}%`],
    ['이동속도', `+${Math.round((game.hero.gearSpeedMult - 1) * 100)}%`],
    ['체력/마나', `+${game.hero.gearMaxHp}/+${game.hero.gearMaxMana}`],
    ['방어력', `${game.hero.gearArmor} (물리 -${Math.round(game.hero.armorReduction * 100)}%)`],
    ['저항', ELEMENTS.map((el) => `${ELEMENT_DEF[el].short}${Math.round(Math.min(game.hero.resist[el] || 0, RESIST_CAP) * 100)}`).join(' ')]
  ];
  const colW = (w - 32) / 2;
  ctx.font = '10px sans-serif';
  bonus.forEach(([label, value], i) => {
    const cx = x + 16 + (i % 2) * colW;
    const cy = row + Math.floor(i / 2) * 15;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a8b8a0';
    ctx.fillText(label, cx, cy);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#dfe9d8';
    ctx.fillText(value, cx + colW - 12, cy);
  });
  ctx.textAlign = 'left';
}
