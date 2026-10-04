// 메뉴 - 장비 탭 (장착 슬롯 목록 + 장비 합산 옵션)
import { GEAR_SLOTS, GEAR_SLOT_LABEL, RARITY_DEF } from '../../data/items.js';
import { game } from '../../state.js';
import { gearDisplayName } from '../../systems/gear.js';
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
      const rDef = RARITY_DEF[it.rarity];
      const upg = it.upgradeLevel > 0 ? ` +${it.upgradeLevel}` : '';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = rDef.color;
      ctx.fillText(fitText(ctx, `[${rDef.label}] ${gearDisplayName(it)}${upg}`, maxW), textX, row);
      row += 13;
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#cfd8c8';
      wrapStatLines(ctx, it.stats, maxW).forEach((ln) => { ctx.fillText(ln, textX, row); row += 12; });
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
    ['방어(블락)', `+${Math.round(game.hero.gearDefense * 100)}%`],
    ['회피율', `+${Math.round(game.hero.gearEvasion * 100)}%`],
    ['이동속도', `+${Math.round((game.hero.gearSpeedMult - 1) * 100)}%`],
    ['체력/마나', `+${game.hero.gearMaxHp}/+${game.hero.gearMaxMana}`]
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
