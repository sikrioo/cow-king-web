// 캔버스 HUD (체력·마나 구슬, 스태미나, 스탯, 버프, 콤보)
import {
  COMBO_WINDOW, BASE_BLOCK, BASE_EVASION, VITALITY_DURATION, SPEED_BUFF_DURATION,
  ATTACK_BUFF_DURATION, DEFENSE_BUFF_DURATION, MAX_LEVEL
} from '../data/balance.js';
import { ITEM_STYLE } from '../data/items.js';
import { canvas, ctx } from '../core/context.js';
import { game } from '../state.js';
import { attacksPerSecond } from '../util.js';

export function drawComboCounter(ctx) {
  if (game.hero.combo < 2 || !game.hero.alive) return;
  const comboColor = game.hero.combo >= 20 ? '#ff3b30' : game.hero.combo >= 10 ? '#ff8c1a' : game.hero.combo >= 5 ? '#ffe066' : '#dfe9d8';
  const pulse = 1 + Math.min(game.hero.comboTimer / COMBO_WINDOW, 1) * 0.06 * Math.sin(performance.now() / 60);
  const size = Math.min(16 + game.hero.combo * 0.6, 34) * pulse;

  ctx.save();
  ctx.translate(game.hero.x, game.hero.y - game.hero.r - 34);
  ctx.textAlign = 'center';
  ctx.font = `bold ${size}px sans-serif`;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText(`${game.hero.combo} COMBO`, 0, 0);
  ctx.fillStyle = comboColor;
  ctx.fillText(`${game.hero.combo} COMBO`, 0, 0);

  // 콤보 유지 시간 게이지
  const gw = 46;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-gw / 2, 8, gw, 3);
  ctx.fillStyle = comboColor;
  ctx.fillRect(-gw / 2, 8, gw * Math.max(0, game.hero.comboTimer / COMBO_WINDOW), 3);
  ctx.restore();
  ctx.textAlign = 'left';
}

export function drawBuffIcons(ctx) {
  const buffs = [];
  if (game.hero.vitalityTimer > 0) buffs.push({ color: ITEM_STYLE.vitality.color, frac: game.hero.vitalityTimer / VITALITY_DURATION });
  if (game.hero.speedBuffTimer > 0) buffs.push({ color: ITEM_STYLE.speed.color, frac: game.hero.speedBuffTimer / SPEED_BUFF_DURATION });
  if (game.hero.attackBuffTimer > 0) buffs.push({ color: ITEM_STYLE.attack.color, frac: game.hero.attackBuffTimer / ATTACK_BUFF_DURATION });
  if (game.hero.defenseBuffTimer > 0) buffs.push({ color: ITEM_STYLE.defense.color, frac: game.hero.defenseBuffTimer / DEFENSE_BUFF_DURATION });
  if (!buffs.length) return;
  const size = 16, gap = 4;
  const startX = canvas.width / 2 - (buffs.length * (size + gap)) / 2;
  buffs.forEach((b, i) => {
    const x = startX + i * (size + gap), y = 58;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = b.color;
    const h = size * Math.max(0, Math.min(1, b.frac));
    ctx.fillRect(x, y + (size - h), size, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
  });
}

// 전투 스탯 카드 - 오른쪽, 마나 구슬 아래 (버프가 걸린 스탯은 값 옆에 ▲)
export function drawStatReadout(ctx) {
  const h = game.hero;
  // 공격력 = 무기 피해 범위(쌍수면 두 무기를 합친 범위) + 공격력 보너스
  const ws = h.weaponStats;
  const atkBonus = h.attackBonus + h.gearAtkPower;
  const atkMin = Math.min(ws.main.min, ws.off ? ws.off.min : Infinity) + atkBonus;
  const atkMax = Math.max(ws.main.max, ws.off ? ws.off.max : -Infinity) + atkBonus;
  const totalBlock = Math.min(BASE_BLOCK + h.defenseChance + h.gearDefense, 0.85);
  const totalEvasion = Math.min(BASE_EVASION + h.gearEvasion, 0.75);
  const totalSpeedPct = Math.round((h.gearSpeedMult * h.speedMult - 1) * 100);

  const stats = [
    { label: '공격력', value: `${atkMin}~${atkMax}`, color: '#ff8a3d', buffed: h.attackBuffTimer > 0 },
    { label: '초당 공격', value: `${attacksPerSecond(h).toFixed(1)}회`, color: '#ffb36b', buffed: h.combo > 0 && h.comboTimer > 0 },
    { label: '블락률', value: `${Math.round(totalBlock * 100)}%`, color: '#6fb3ff', buffed: h.defenseBuffTimer > 0 },
    { label: '방어력', value: `${h.gearArmor}·${Math.round(h.armorReduction * 100)}%`, color: '#c9b48a', buffed: false },
    { label: '회피율', value: `${Math.round(totalEvasion * 100)}%`, color: '#8fe8ff', buffed: false },
    { label: '이동속도', value: `${totalSpeedPct >= 0 ? '+' : ''}${totalSpeedPct}%`, color: '#5be0c9', buffed: h.speedBuffTimer > 0 }
  ];

  const w = 128, rowH = 19, pad = 8;
  const panelH = pad * 2 + rowH * stats.length - 4;
  const x = canvas.width - w - 10;
  const y = 14 + 38 * 2 + 14; // 마나 구슬(지름 76, 위 여백 14) 아래
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(x, y, w, panelH);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, panelH - 1);
  ctx.textBaseline = 'middle';
  stats.forEach((st, i) => {
    const cy = y + pad + i * rowH + 7;
    ctx.fillStyle = st.color;
    ctx.fillRect(x + pad, cy - 6, 3, 12);
    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#cfd8c8';
    ctx.fillText(st.label, x + pad + 9, cy);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = st.color;
    ctx.fillText(st.buffed ? `▲${st.value}` : st.value, x + w - pad, cy);
  });
  ctx.restore();
}

export function drawHUD() {
  const orbR = 38;
  const hpX = orbR + 14, hpY = orbR + 14;
  const manaX = canvas.width - orbR - 14, manaY = orbR + 14;

  drawResourceOrb(ctx, hpX, hpY, orbR, game.hero.hp / (game.hero.maxHp + game.hero.bonusMaxHp + game.hero.gearMaxHp), '#ff8a75', '#7a1d12');
  drawResourceOrb(ctx, manaX, manaY, orbR, game.hero.mana / game.hero.maxMana, '#8fd0ff', '#173a63');

  // 레벨 뱃지 (체력 오브 우하단)
  const lvR = 15;
  const lvX = hpX + orbR * 0.62, lvY = hpY + orbR * 0.62;
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(lvX, lvY, lvR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffe066';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${game.hero.level}`, lvX, lvY + 1);
  ctx.textBaseline = 'alphabetic';

  const barW = 180, barH = 12;
  const barX = canvas.width / 2 - barW / 2, barY = 16;
  drawStaminaBar(ctx, barX, barY, barW, barH, game.hero.stamina / game.hero.maxStamina);

  // 경험치 바
  const expY = barY + barH + 4;
  const expFrac = game.hero.level >= MAX_LEVEL ? 1 : game.hero.exp / game.hero.expToNext;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX, expY, barW, 5);
  ctx.fillStyle = '#ffe066';
  ctx.fillRect(barX, expY, barW * Math.max(0, Math.min(1, expFrac)), 5);

  drawBuffIcons(ctx);

  ctx.fillStyle = '#dfe9d8';
  ctx.font = '15px monospace';
  ctx.textAlign = 'center';
  const remaining = game.cows.filter((c) => c.state !== 'dead').length;
  ctx.fillText(`웨이브 ${game.wave}  ·  남은 카우 ${remaining}`, canvas.width / 2, expY + 30);
  ctx.textAlign = 'left';

  drawStatReadout(ctx);

  if (game.hero.statPoints > 0) {
    ctx.fillStyle = `rgba(255,224,102,${0.6 + Math.sin(performance.now() / 200) * 0.4})`;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`스탯 포인트 ${game.hero.statPoints}개 보유! (I 눌러서 분배)`, canvas.width / 2, expY + 52);
    ctx.textAlign = 'left';
  }

  if (game.cows.length === 0 && game.gameState === 'playing') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`웨이브 ${game.wave} 클리어! 다음 웨이브 준비 중...`, canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
  }

  if (game.gameState === 'gameover') overlay('GAME OVER', `${game.wave}웨이브까지 생존 - 클릭 또는 Space/R로 다시 시작`);
  if (game.gameState === 'victory') overlay('VICTORY!', '카우킹 처치! 클릭 또는 Space/R로 다시 시작');
}

export function drawResourceOrb(ctx, cx, cy, r, frac, colorTop, colorBottom) {
  frac = Math.max(0, Math.min(1, frac));
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.clip();
  const fillH = (r * 2 - 6) * frac;
  const grad = ctx.createLinearGradient(0, cy + r - 3 - fillH, 0, cy + r - 3);
  grad.addColorStop(0, colorTop);
  grad.addColorStop(1, colorBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy + r - 3 - fillH, r * 2, fillH);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

export function drawStaminaBar(ctx, x, y, w, h, frac) {
  frac = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = frac > 0.001 ? '#d8c24a' : '#5a4f22';
  ctx.fillRect(x, y, w * frac, h);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

export function overlay(title, sub) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 8);
  ctx.font = '16px sans-serif';
  ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 24);
  ctx.textAlign = 'left';
}
