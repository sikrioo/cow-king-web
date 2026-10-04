// 캔버스 HUD (체력·마나 구슬, 스태미나, 스탯, 버프, 콤보)
import {
  COMBO_WINDOW, BASE_DAMAGE, BASE_BLOCK, BASE_EVASION, VITALITY_DURATION, SPEED_BUFF_DURATION,
  ATTACK_BUFF_DURATION, DEFENSE_BUFF_DURATION, MAX_LEVEL
} from '../data/balance.js';
import { ITEM_STYLE } from '../data/items.js';
import { canvas, ctx } from '../core/context.js';
import { game, player } from '../state.js';

export function drawComboCounter(ctx) {
  if (player.combo < 2 || !player.alive) return;
  const comboColor = player.combo >= 20 ? '#ff3b30' : player.combo >= 10 ? '#ff8c1a' : player.combo >= 5 ? '#ffe066' : '#dfe9d8';
  const pulse = 1 + Math.min(player.comboTimer / COMBO_WINDOW, 1) * 0.06 * Math.sin(performance.now() / 60);
  const size = Math.min(16 + player.combo * 0.6, 34) * pulse;

  ctx.save();
  ctx.translate(player.x, player.y - player.r - 34);
  ctx.textAlign = 'center';
  ctx.font = `bold ${size}px sans-serif`;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText(`${player.combo} COMBO`, 0, 0);
  ctx.fillStyle = comboColor;
  ctx.fillText(`${player.combo} COMBO`, 0, 0);

  // 콤보 유지 시간 게이지
  const gw = 46;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-gw / 2, 8, gw, 3);
  ctx.fillStyle = comboColor;
  ctx.fillRect(-gw / 2, 8, gw * Math.max(0, player.comboTimer / COMBO_WINDOW), 3);
  ctx.restore();
  ctx.textAlign = 'left';
}

export function drawBuffIcons(ctx) {
  const buffs = [];
  if (player.vitalityTimer > 0) buffs.push({ color: ITEM_STYLE.vitality.color, frac: player.vitalityTimer / VITALITY_DURATION });
  if (player.speedBuffTimer > 0) buffs.push({ color: ITEM_STYLE.speed.color, frac: player.speedBuffTimer / SPEED_BUFF_DURATION });
  if (player.attackBuffTimer > 0) buffs.push({ color: ITEM_STYLE.attack.color, frac: player.attackBuffTimer / ATTACK_BUFF_DURATION });
  if (player.defenseBuffTimer > 0) buffs.push({ color: ITEM_STYLE.defense.color, frac: player.defenseBuffTimer / DEFENSE_BUFF_DURATION });
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

export function drawStatReadout(ctx, y) {
  const totalAtk = BASE_DAMAGE + player.attackBonus + player.gearAtkPower;
  const totalBlock = Math.min(BASE_BLOCK + player.defenseChance + player.gearDefense, 0.85);
  const totalEvasion = Math.min(BASE_EVASION + player.gearEvasion, 0.75);
  const totalSpeedPct = Math.round((player.gearSpeedMult * player.speedMult - 1) * 100);

  const stats = [
    { label: '공격력', value: `${totalAtk}`, color: '#ff8a3d' },
    { label: '블락률', value: `${Math.round(totalBlock * 100)}%`, color: '#6fb3ff' },
    { label: '회피율', value: `${Math.round(totalEvasion * 100)}%`, color: '#8fe8ff' },
    { label: '이동속도', value: `${totalSpeedPct >= 0 ? '+' : ''}${totalSpeedPct}%`, color: '#5be0c9' }
  ];

  ctx.font = 'bold 12px monospace';
  const gap = 20;
  const texts = stats.map((s) => `${s.label} ${s.value}`);
  const widths = texts.map((txt) => ctx.measureText(txt).width);
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (stats.length - 1);
  let x = canvas.width / 2 - totalW / 2;
  ctx.textAlign = 'left';
  stats.forEach((s, i) => {
    ctx.fillStyle = s.color;
    ctx.fillText(texts[i], x, y);
    x += widths[i] + gap;
  });
}

export function drawHUD() {
  const orbR = 38;
  const hpX = orbR + 14, hpY = orbR + 14;
  const manaX = canvas.width - orbR - 14, manaY = orbR + 14;

  drawResourceOrb(ctx, hpX, hpY, orbR, player.hp / (player.maxHp + player.bonusMaxHp + player.gearMaxHp), '#ff8a75', '#7a1d12');
  drawResourceOrb(ctx, manaX, manaY, orbR, player.mana / player.maxMana, '#8fd0ff', '#173a63');

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
  ctx.fillText(`${player.level}`, lvX, lvY + 1);
  ctx.textBaseline = 'alphabetic';

  const barW = 180, barH = 12;
  const barX = canvas.width / 2 - barW / 2, barY = 16;
  drawStaminaBar(ctx, barX, barY, barW, barH, player.stamina / player.maxStamina);

  // 경험치 바
  const expY = barY + barH + 4;
  const expFrac = player.level >= MAX_LEVEL ? 1 : player.exp / player.expToNext;
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

  drawStatReadout(ctx, expY + 50);

  if (player.statPoints > 0) {
    ctx.fillStyle = `rgba(255,224,102,${0.6 + Math.sin(performance.now() / 200) * 0.4})`;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`스탯 포인트 ${player.statPoints}개 보유! (I 눌러서 분배)`, canvas.width / 2, expY + 70);
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
