// 메뉴 - 강화 탭 (장착 장비 강화)
import { UPGRADE_SUCCESS_CHANCE } from '../../data/balance.js';
import { GEAR_SLOTS, GEAR_SLOT_LABEL } from '../../data/items.js';
import { game, ui } from '../../state.js';
import { showInvToast } from '../../systems/fx.js';
import { tryUpgradeSlot } from '../../systems/gear.js';
import { gearTitle, gearColor } from '../itemView.js';
import { fitText } from './common.js';

export function drawUpgradeTab(ctx, x, startRow, w) {
  let row = startRow;
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText('장비 강화', x + 16, row);
  row += 16;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(`재료 1개 · 성공률 ${Math.round(UPGRADE_SUCCESS_CHANCE * 100)}%`, x + 16, row);
  row += 13;
  ctx.fillText('성공하면 옵션 하나가 25% 강해지고, 실패하면 재료만 사라져.', x + 16, row);
  row += 22;

  GEAR_SLOTS.forEach((slot, i) => {
    const it = game.hero.equipment[slot];
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#a8b8a0';
    const label = (slot === 'weaponOff' && it && it !== 'LOCKED' && it.category === 'shield') ? '방패' : GEAR_SLOT_LABEL[slot];
    ctx.fillText(label, x + 16, row);
    ctx.font = '11px sans-serif';
    if (it === 'LOCKED') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText('(양손무기 사용 중)', x + 16, row + 14);
    } else if (!it) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText('비어 있음', x + 16, row + 14);
    } else {
      ctx.fillStyle = gearColor(it);
      ctx.fillText(fitText(ctx, gearTitle(it), w - 32 - 80), x + 16, row + 14);
      const canTry = game.hero.materials >= 1;
      const btn = { x: x + w - 16 - 66, y: row - 8, w: 66, h: 28 };
      ui.invButtons.push({ ...btn, fn: () => {
        const cur = game.hero.equipment[slot];
        if (!cur || cur === 'LOCKED') return;
        const before = cur.upgradeLevel || 0, mats = game.hero.materials;
        tryUpgradeSlot(i);
        if (game.hero.materials === mats) showInvToast('재료 부족', '#ff8a80');
        else if ((cur.upgradeLevel || 0) > before) showInvToast(`강화 성공! +${cur.upgradeLevel}`, gearColor(cur));
        else showInvToast('강화 실패…', '#bbb');
      } });
      ctx.fillStyle = canTry ? 'rgba(255,224,102,0.25)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.strokeStyle = canTry ? '#ffe066' : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
      ctx.fillStyle = canTry ? '#ffe066' : '#777';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('강화', btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
    row += 40;
  });
  ctx.textAlign = 'left';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('키보드 숫자키 1~7로도 강화할 수 있어', x + 16, row);
}
