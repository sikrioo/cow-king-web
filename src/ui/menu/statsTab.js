// 메뉴 - 스탯 탭 (스탯 포인트 투자, 스킬 해금 현황)
import { MAX_LEVEL, POINTS_PER_LEVEL, LEVEL_STAT_PER_POINT, LEVEL_STAT_KEYS } from '../../data/balance.js';
import { STAT_DEF } from '../../data/items.js';
import { SKILL_UNLOCK_LEVEL } from '../../data/skills.js';
import { game, ui } from '../../state.js';
import { showInvToast } from '../../systems/fx.js';
import { trySpendStatPoint, isSkillUnlocked } from '../../systems/progression.js';
import { SKILLS, classSkills } from '../../systems/skills.js';

export function drawStatsTab(ctx, x, startRow, w) {
  let row = startRow;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`Lv.${game.hero.level}  (EXP ${game.hero.exp}/${game.hero.level >= MAX_LEVEL ? 'MAX' : game.hero.expToNext})`, x + 16, row);
  row += 19;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = game.hero.statPoints > 0 ? '#ffe066' : '#8a9a8a';
  ctx.fillText(`여유 포인트: ${game.hero.statPoints}`, x + 16, row);
  row += 24;

  const statOrder = ['atkPower', 'defense', 'evasion', 'atkSpeed', 'moveSpeed', 'health', 'mana'];
  const keyByStat = {};
  Object.entries(LEVEL_STAT_KEYS).forEach(([k, v]) => { keyByStat[v] = k; });
  statOrder.forEach((sk) => {
    const pts = game.hero.levelStats[sk] || 0;
    const canSpend = game.hero.statPoints > 0;
    ctx.textAlign = 'left';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#dfe9d8';
    ctx.fillText(`[${keyByStat[sk].toUpperCase()}] ${STAT_DEF[sk].label}`, x + 16, row);

    const btn = { x: x + w - 16 - 36, y: row - 17, w: 36, h: 24 };
    ui.invButtons.push({ ...btn, fn: () => {
      if (game.hero.statPoints <= 0) { showInvToast('여유 포인트가 없어', '#ff8a80'); return; }
      trySpendStatPoint(sk);
      showInvToast(`${STAT_DEF[sk].label} +1`, '#ffe066');
    } });
    ctx.fillStyle = canSpend ? 'rgba(255,224,102,0.25)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = canSpend ? '#ffe066' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = canSpend ? '#ffe066' : '#777';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';

    ctx.textAlign = 'right';
    ctx.font = '11px sans-serif';
    ctx.fillStyle = pts > 0 ? '#ffe066' : '#777';
    const bonusTxt = STAT_DEF[sk].fmt(pts * LEVEL_STAT_PER_POINT[sk]);
    ctx.fillText(`${pts}포인트 (${bonusTxt})`, btn.x - 10, row);
    row += 32;
  });
  ctx.textAlign = 'left';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(`레벨업마다 ${POINTS_PER_LEVEL}포인트 · 키보드 Z X C V B N M 로도 투자할 수 있어`, x + 16, row + 4);

  let ry = row + 30;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText('스킬 해금', x + 16, ry);
  ry += 18;
  const skillColW = (w - 32) / 2;
  ctx.font = '11px sans-serif';
  [...classSkills()].sort((a, b) => SKILL_UNLOCK_LEVEL[a] - SKILL_UNLOCK_LEVEL[b]).forEach((id, i) => {
    const cx = x + 16 + (i % 2) * skillColW;
    const cy = ry + Math.floor(i / 2) * 17;
    const ok = isSkillUnlocked(id);
    ctx.textAlign = 'left';
    ctx.fillStyle = ok ? '#dfe9d8' : '#777';
    ctx.fillText(SKILLS[id].label, cx, cy);
    ctx.textAlign = 'right';
    ctx.fillStyle = ok ? '#9be39b' : '#a8905a';
    ctx.fillText(ok ? '해금됨' : `Lv.${SKILL_UNLOCK_LEVEL[id]}`, cx + skillColW - 12, cy);
  });
  ctx.textAlign = 'left';
}
