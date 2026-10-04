import Matter from 'matter-js';
import {
  ATTACK_DURATION, ATTACK_COOLDOWN, ATTACK_RANGE, WEAPON_RANGE, ATTACK_ARC, ATTACK_ARC_SINGLE, WARCRY_RADIUS,
  WARCRY_COOLDOWN, WARCRY_MANA_COST, WHIRLWIND_DURATION, WHIRLWIND_COOLDOWN, WHIRLWIND_RADIUS,
  WHIRLWIND_MANA_COST, WHIRLWIND_MANA_DRAIN, WHIRLWIND_TICK, LEAP_DISTANCE, LEAP_DURATION, LEAP_COOLDOWN,
  LEAP_MANA_COST, LEAP_RADIUS, RUSH_DISTANCE, RUSH_DURATION, RUSH_COOLDOWN, RUSH_MANA_COST, RUSH_HIT_RADIUS,
  RUSH_DAMAGE_BONUS, SMASH_DURATION, SMASH_IMPACT_TIME, SMASH_COOLDOWN, SMASH_MANA_COST, SMASH_RADIUS,
  SMASH_DAMAGE_BONUS, MOVE_START_ACCEL, MOVE_CRUISE_ACCEL, MOVE_TURN_ACCEL, MOVE_REVERSE_ACCEL, MOVE_BRAKE,
  MOVE_FACING_RESPONSE, MOVE_DUST_COLOR, WALK_SPEED, RUN_SPEED, MAX_MANA, MANA_REGEN, STAMINA_DRAIN,
  STAMINA_REGEN, COMBO_WINDOW, COMBO_SPEED_PER_HIT, COMBO_SPEED_CAP, BASE_DAMAGE, BASE_BLOCK, BASE_EVASION,
  VITALITY_DURATION, SPEED_BUFF_DURATION, ATTACK_BUFF_DURATION, DEFENSE_BUFF_DURATION, MAX_LEVEL,
  POINTS_PER_LEVEL, expForLevel, LEVEL_STAT_PER_POINT, LEVEL_STAT_KEYS, INVENTORY_SIZE, IDENTIFY_DURATION,
  UPGRADE_SUCCESS_CHANCE, GEAR_DROP_CHANCE, MATERIAL_DROP_CHANCE, POTION_MAX, POTION_COOLDOWN, POTION_HEAL_RATIO,
  POTION_MANA_AMOUNT, POTION_DROP_WEIGHTS, FIRST_WAVE_DELAY, WAVE_GAP, BOSS_WAVE, BOSS_SLAM_COOLDOWN,
  BOSS_SLAM_RADIUS, CHARGE_RANGE, CHARGE_TELEGRAPH, CHARGE_DISTANCE, CHARGE_DURATION, CHARGE_RECOVER,
  CHARGE_COOLDOWN, CHARGE_WIDTH, EXPLODER_FUSE_TIME, EXPLODER_FUSE_RANGE, EXPLODER_BLAST_RADIUS, ZAP_RANGE,
  ZAP_TELEGRAPH, ZAP_COOLDOWN, ZAP_BEAM_LENGTH, ZAP_BEAM_WIDTH, AURA_RADIUS, AURA_SPEED_MULT
} from './data/balance.js';
import {
  ITEM_STYLE, POTION_LABEL, GEAR_SLOTS, GEAR_SLOT_LABEL, GEAR_CATEGORY_LABEL, GEAR_VARIANT_LABEL,
  WEAPON_VARIANTS, ACCESSORY_VARIANTS, STAT_DEF, RARITY_DEF, RARITY_TOTAL_WEIGHT
} from './data/items.js';
import {
  MONSTERS, FLASH_COLORS, ELITE_KINDS, ELITE_MIN_WAVE, ELITE_CHANCE_BASE, ELITE_CHANCE_PER_WAVE,
  ELITE_CHANCE_MAX
} from './data/monsters.js';
import { PALETTE } from './data/palette.js';
import { SKILL_ORDER, SKILL_META, SKILL_UNLOCK_LEVEL } from './data/skills.js';
import { RELEASE_VERSION } from './config.js';
import { clamp01, lerpAngle, easeOutCubic, moveToward2D, distToSegment, getHitPoint, hexToRgba } from './util.js';
import { canvas, ctx, resize } from './core/context.js';
import { STEP_MS, startLoop } from './core/loop.js';
import { engine, world, PEN } from './core/physics.js';
import { game, ui, input, player } from './state.js';
const { Engine, World, Bodies, Body } = Matter;

// ===========================================================
// 카우 드로잉 (뿔/헬버드 - 기존과 동일)
// ===========================================================
function drawCow(ctx, x, y, scale, state, animT, facing = 1, stateElapsed = 0, colors = null) {
  const hideColor  = colors ? colors.hide  : PALETTE.hide;
  const hornColor  = colors ? colors.horn  : PALETTE.horn;
  const snoutColor = colors ? colors.snout : PALETTE.snout;
  const eyeColor   = colors ? colors.eye   : PALETTE.eye;

  const bob   = state === 'walk'    ? Math.abs(Math.sin(animT * 8)) * 8
              : state === 'idle'   ? Math.abs(Math.sin(animT * 2.2)) * 2
              : 0;
  const shake = state === 'stunned' ? Math.sin(animT * 45) * 3 : 0;
  const poke  = state === 'attack'  ? Math.sin(Math.min(stateElapsed * 10, Math.PI)) : 0;

  ctx.save();
  ctx.translate(x + shake, y - bob);
  ctx.scale(scale * facing, scale);

  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  drawHalberd(ctx, 18 + poke * 16, -38, poke);

  ctx.fillStyle = hideColor;
  ctx.beginPath();
  ctx.arc(0, -40, 30, 0, Math.PI * 2);
  ctx.fill();

  drawHorn(ctx, -1, hornColor);
  drawHorn(ctx, 1, hornColor);

  ctx.fillStyle = snoutColor;
  ctx.beginPath();
  ctx.ellipse(0, -20, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.dark;
  ctx.beginPath();
  ctx.ellipse(-4, -19, 1.5, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(4, -19, 1.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.ellipse(-12, -46, 3.6, 2.6, -0.15, 0, Math.PI * 2);
  ctx.ellipse(12, -46, 3.6, 2.6, 0.15, 0, Math.PI * 2);
  ctx.fill();

  if (state === 'stunned') drawStunDots(ctx, animT);

  ctx.restore();
}

function drawStunDots(ctx, animT) {
  const n = 3;
  for (let i = 0; i < n; i++) {
    const a = animT * 6 + (i * Math.PI * 2) / n;
    ctx.fillStyle = '#e8dcc8';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 14, -88 + Math.sin(a) * 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHorn(ctx, side, color) {
  ctx.save();
  ctx.strokeStyle = color || PALETTE.horn;
  ctx.lineCap = 'round';

  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(side * 14, -46);
  ctx.quadraticCurveTo(side * 34, -58, side * 34, -80);
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(side * 34, -80);
  ctx.quadraticCurveTo(side * 34, -92, side * 19, -96);
  ctx.stroke();

  ctx.restore();
}

function drawHalberd(ctx, x, y, poke = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4 + poke * (Math.PI / 4));

  ctx.strokeStyle = PALETTE.shaft;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-42, 0);
  ctx.lineTo(58, 0);
  ctx.stroke();

  ctx.fillStyle = PALETTE.blade;
  ctx.beginPath();
  ctx.moveTo(66, 0);
  ctx.lineTo(48, 14);
  ctx.lineTo(38, 0);
  ctx.lineTo(48, -14);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ===========================================================
// 펜(사각형 목장) + 울타리
// ===========================================================
function drawPen() {
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(PEN.x, PEN.y, PEN.size, PEN.size);

  ctx.strokeStyle = PALETTE.fence;
  ctx.lineWidth = 6;
  ctx.strokeRect(PEN.x, PEN.y, PEN.size, PEN.size);

  ctx.fillStyle = PALETTE.post;
  const gap = 44;
  for (let px = PEN.x; px <= PEN.x + PEN.size + 1; px += gap) {
    ctx.fillRect(px - 3, PEN.y - 9, 6, 18);
    ctx.fillRect(px - 3, PEN.y + PEN.size - 9, 6, 18);
  }
  for (let py = PEN.y; py <= PEN.y + PEN.size + 1; py += gap) {
    ctx.fillRect(PEN.x - 9, py - 3, 18, 6);
    ctx.fillRect(PEN.x + PEN.size - 9, py - 3, 18, 6);
  }
}

function randomPointInPen(marginRatio = 0.14) {
  const m = PEN.size * marginRatio;
  return {
    x: PEN.x + m + Math.random() * (PEN.size - m * 2),
    y: PEN.y + m + Math.random() * (PEN.size - m * 2)
  };
}

function clampToPen(x, y, margin) {
  return {
    x: Math.min(Math.max(x, PEN.x + margin), PEN.x + PEN.size - margin),
    y: Math.min(Math.max(y, PEN.y + margin), PEN.y + PEN.size - margin)
  };
}

function getCowHitRadius(c) {
  if (c.kind === 'boss') return c.r * 0.95;
  return c.r * 0.58;
}

function getAuraSpeedMult(cow) {
  if (cow.kind === 'fanatic') return AURA_SPEED_MULT;
  for (const other of game.cows) {
    if (other === cow || other.kind !== 'fanatic' || other.state === 'dead') continue;
    if (Math.hypot(other.x - cow.x, other.y - cow.y) <= AURA_RADIUS) return AURA_SPEED_MULT;
  }
  return 1;
}

// ===========================================================
// 타격감: 파티클 / 화면 흔들림 / 히트스탑
// ===========================================================

// ===========================================================
// 타이틀 화면 / 일시정지 / 로컬 기록 - 다른 에이전트의 릴리즈 버전에서 이식
// ===========================================================
const SAVE_KEY = 'cowking_release_meta_v1';
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (saved && typeof saved === 'object') game.releaseMeta = { ...game.releaseMeta, ...saved };
} catch (_) {}
function saveReleaseMeta() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game.releaseMeta)); } catch (_) {}
}
function recordRun(kind) {
  if (game.runRecorded) return;
  game.runRecorded = true;
  game.releaseMeta.runs += 1;
  game.releaseMeta.bestWave = Math.max(game.releaseMeta.bestWave || 0, game.wave || 0);
  game.releaseMeta.bestKills = Math.max(game.releaseMeta.bestKills || 0, game.kills || 0);
  if (kind === 'victory') game.releaseMeta.clears += 1;
  saveReleaseMeta();
}
function setPaused(v) {
  if (game.gameState !== 'playing') { game.paused = false; return; }
  game.paused = !!v;
  const pb = document.getElementById('btn-pause');
  if (pb) pb.textContent = game.paused ? '▶' : 'Ⅱ';
}
async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch (_) {}
}


function initTitleScene() {
  ui.titleCows = [];
  const count = Math.max(7, Math.min(12, Math.round(PEN.size / 70)));
  for (let i = 0; i < count; i++) {
    const p = randomPointInPen(0.10);
    const a = Math.random() * Math.PI * 2;
    ui.titleCows.push({
      x: p.x, y: p.y,
      vx: Math.cos(a) * (10 + Math.random() * 14),
      vy: Math.sin(a) * (8 + Math.random() * 12),
      scale: 0.23 + Math.random() * 0.12,
      phase: Math.random() * 8,
      facing: Math.cos(a) >= 0 ? 1 : -1
    });
  }
}
function updateTitleScene(dt) {
  ui.titleTime += dt;
  if (!ui.titleCows.length) initTitleScene();
  const minX = PEN.x + 34, maxX = PEN.x + PEN.size - 34;
  const minY = PEN.y + 40, maxY = PEN.y + PEN.size - 32;
  ui.titleCows.forEach((c, i) => {
    c.vx += Math.sin(ui.titleTime * 0.7 + c.phase + i) * 2.2 * dt;
    c.vy += Math.cos(ui.titleTime * 0.6 + c.phase * 1.3) * 1.8 * dt;
    const sp = Math.hypot(c.vx, c.vy) || 1;
    const maxSp = 24;
    if (sp > maxSp) { c.vx = c.vx / sp * maxSp; c.vy = c.vy / sp * maxSp; }
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (c.x < minX || c.x > maxX) { c.vx *= -1; c.x = Math.max(minX, Math.min(maxX, c.x)); }
    if (c.y < minY || c.y > maxY) { c.vy *= -1; c.y = Math.max(minY, Math.min(maxY, c.y)); }
    if (Math.abs(c.vx) > 0.2) c.facing = c.vx > 0 ? 1 : -1;
  });
}
function drawTitleScene(t) {
  const sorted = [...ui.titleCows].sort((a, b) => a.y - b.y);
  sorted.forEach((c) => drawCow(ctx, c.x, c.y, c.scale, 'walk', t + c.phase, c.facing, 0));
  ctx.save();
  ctx.globalAlpha = 0.28;
  drawCow(ctx, canvas.width * 0.5, PEN.y + PEN.size * 0.36, 0.74, 'idle', t, 1, 0,
    { hide: '#6a3f8a', horn: '#e8d4ff', snout: '#361a52', eye: '#ffe066' });
  ctx.restore();
}
function drawTitleOverlay(t) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const grad = ctx.createRadialGradient(cx, cy - 20, 40, cx, cy, Math.max(canvas.width, canvas.height) * 0.64);
  grad.addColorStop(0, 'rgba(5,12,7,0.30)');
  grad.addColorStop(1, 'rgba(2,7,3,0.83)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(cx, cy - 116);
  ctx.fillStyle = '#e6bd4f';
  ctx.beginPath();
  ctx.moveTo(-34, 14); ctx.lineTo(-28, -10); ctx.lineTo(-10, 4); ctx.lineTo(0, -20);
  ctx.lineTo(10, 4); ctx.lineTo(28, -10); ctx.lineTo(34, 14); ctx.closePath(); ctx.fill();
  ctx.fillRect(-34, 14, 68, 8);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,.65)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#f2e7c9';
  ctx.font = `900 ${Math.max(48, Math.min(82, canvas.width * 0.085))}px Georgia, serif`;
  ctx.fillText('COW KING', cx, cy - 45);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#d2ba82';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('카우방 액션 RPG 데모', cx, cy - 12);

  const pulse = 0.60 + Math.sin(t * 3.4) * 0.28;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PRESS START', cx, cy + 54);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,.68)';
  ctx.font = '13px sans-serif';
  ctx.fillText('Space / 클릭 / 탭', cx, cy + 80);
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,.50)';
  ctx.fillText('WASD 이동 · Space/E 시전(길게) · Q/R 슬롯전환 · 1/2 물약 · I 장비', cx, cy + 116);
  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(255,255,255,.36)';
  ctx.fillText(`BEST WAVE ${game.releaseMeta.bestWave}  ·  BEST KILLS ${game.releaseMeta.bestKills}  ·  CLEAR ${game.releaseMeta.clears}  ·  v${RELEASE_VERSION}`, cx, cy + 142);
  ctx.textAlign = 'left';
}
function drawStartCountdown() {
  if (game.gameState !== 'playing' || ui.showInventory || game.wave !== 0 || game.cows.length !== 0 || game.waveTransition <= 0) return;
  const remain = Math.max(0, game.waveTransition);
  const number = Math.ceil(remain);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(244,234,214,0.92)';
  ctx.font = '700 14px sans-serif';
  ctx.fillText('전투 준비', canvas.width / 2, canvas.height * 0.42 - 24);
  ctx.fillStyle = '#ffbe68';
  ctx.font = '900 42px sans-serif';
  ctx.fillText(number > 3 ? 'READY' : String(number), canvas.width / 2, canvas.height * 0.42 + 20);
  ctx.shadowBlur = 0;
  ctx.restore();
}
function drawWavePresentation(t) {
  if (game.waveBannerTimer <= 0 || game.gameState !== 'playing' || ui.showInventory) return;
  const a = Math.min(1, game.waveBannerTimer * 2.2) * Math.min(1, (1.6 - game.waveBannerTimer) * 3.0 + 1);
  const boss = game.wave === BOSS_WAVE;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.textAlign = 'center';
  ctx.fillStyle = boss ? '#f1d06b' : '#f3ead6';
  ctx.shadowColor = 'rgba(0,0,0,.75)';
  ctx.shadowBlur = 12;
  ctx.font = boss ? '900 38px Georgia, serif' : '900 28px sans-serif';
  ctx.fillText(boss ? 'THE COW KING' : `WAVE ${game.wave}`, canvas.width / 2, canvas.height * 0.42);
  ctx.shadowBlur = 0;
  ctx.font = '12px monospace';
  ctx.fillStyle = boss ? '#ffe8a1' : 'rgba(255,255,255,.75)';
  ctx.fillText(boss ? '왕의 목장에 입장했습니다' : 'SURVIVE THE PASTURE', canvas.width / 2, canvas.height * 0.42 + 24);
  ctx.restore();
}
function drawDemoTip() {
  if (game.demoTipTimer <= 0 || game.gameState !== 'playing' || ui.showInventory) return;
  const alpha = Math.min(1, game.demoTipTimer) * Math.min(1, (5.0 - game.demoTipTimer) * 2 + 1);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  const w = Math.min(430, canvas.width - 40), h = 38;
  const x = (canvas.width - w) / 2, y = canvas.height - 62;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,220,150,.35)'; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#f4e6c6'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('슬롯: Space/E 길게 · Q/R 전환 · 1/2 물약 · I 장비', canvas.width / 2, y + 24);
  ctx.restore();
  ctx.textAlign = 'left';
}
function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = 'rgba(4,7,9,.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2, cy = canvas.height / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1eadb';
  ctx.font = '900 38px sans-serif';
  ctx.fillText('PAUSED', cx, cy - 38);
  ctx.fillStyle = 'rgba(255,255,255,.74)';
  ctx.font = '14px sans-serif';
  ctx.fillText('P / ESC / 좌측 상단 버튼으로 계속', cx, cy + 2);
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,.50)';
  ctx.fillText(`WAVE ${game.wave}  ·  KILLS ${game.kills}  ·  v${RELEASE_VERSION}`, cx, cy + 34);
  ctx.restore();
}

function spawnHitParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 100;
    game.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35, maxLife: 0.35, color });
  }
}
function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.life -= dt;
    if (p.life <= 0) { game.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.9;
    p.vy *= 0.9;
  }
}
function drawParticles(ctx) {
  game.particles.forEach((p) => {
    const a = Math.max(p.life / p.maxLife, 0);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 * a + 1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function applyKnockback(body, fromX, fromY, force) {
  const dx = body.position.x - fromX;
  const dy = body.position.y - fromY;
  const dist = Math.hypot(dx, dy) || 1;
  Body.setVelocity(body, { x: (dx / dist) * force, y: (dy / dist) * force });
}

// ===========================================================
// 플레이어
// ===========================================================
function getWeaponRange() {
  const w = player.equipment.weaponMain;
  if (w && w !== 'LOCKED' && WEAPON_RANGE[w.variant] !== undefined) return WEAPON_RANGE[w.variant];
  return ATTACK_RANGE;
}
function getAttackArc() {
  const off = player.equipment.weaponOff;
  const dualWield = off && off !== 'LOCKED' && off.category === 'weapon';
  return dualWield ? ATTACK_ARC : ATTACK_ARC_SINGLE;
}

// ===========================================================
// 장비 시스템 (갑옷/무기/각반/신발/장신구2)
// ===========================================================
function gearDisplayName(gear) {
  return GEAR_VARIANT_LABEL[gear.variant] || GEAR_CATEGORY_LABEL[gear.category];
}

// ===========================================================
// 레벨업 & 스탯 분배
// ===========================================================

// 장비창 UI 상호작용 상태 (탭/선택/히트박스) - 마우스 호버와 모바일 탭을 동일하게 처리

// ===========================================================
// 아이템 감정(식별) 시스템 - 드랍된 장비는 전부 미감정 상태로 시작
// ===========================================================

function tryIdentify(index) {
  if (ui.identifyingItem !== null) return; // 이미 감정 중이면 중복 시작 방지
  const gear = player.inventory[index];
  if (!gear || gear.identified) return;
  ui.identifyingItem = gear;
  ui.identifyTimer = IDENTIFY_DURATION;
}

function updateIdentify(dt) {
  if (ui.identifyingItem === null) return;
  if (!player.inventory.includes(ui.identifyingItem)) { ui.identifyingItem = null; return; } // 중간에 사라진 경우
  ui.identifyTimer -= dt;
  if (ui.identifyTimer <= 0) {
    ui.identifyingItem.identified = true;
    revealIdentifiedGear(ui.identifyingItem);
    ui.identifyingItem = null;
  }
}

function revealIdentifiedGear(gear) {
  const rDef = RARITY_DEF[gear.rarity];
  // 등급이 높을수록 연출을 크게 - "감정의 기쁨"을 등급에 비례해서 전달
  const intensity = { normal: 1, magic: 2, rare: 3, legendary: 5 }[gear.rarity] || 1;
  game.shake = Math.min(game.shake + intensity * 2, 12);
  game.impactFlash = Math.max(game.impactFlash, Math.min(0.06 * intensity, 0.22));
  spawnHitParticles(player.x, player.y - 30, rDef.color, 4 + intensity * 4);
  if (gear.rarity === 'legendary') {
    spawnShockwave(player.x, player.y, 70, rDef.color);
    floatText(player.x, player.y - 60, '전설 등급 발견!', rDef.color);
  } else {
    floatText(player.x, player.y - 50, `[${rDef.label}] 감정 완료`, rDef.color);
  }
  // 메뉴가 월드를 덮고 있어서 월드 연출은 안 보이니, 메뉴 안에서도 등급색 번쩍임 + 안내를 보여줌
  showInvToast(gear.rarity === 'legendary' ? '전설 등급 발견!' : `[${rDef.label}] 감정 완료`, rDef.color);
  ui.invReveal = { item: gear, color: rDef.color, until: performance.now() + 1100 };
}

function rollRarity() {
  let roll = Math.random() * RARITY_TOTAL_WEIGHT;
  for (const key of Object.keys(RARITY_DEF)) {
    roll -= RARITY_DEF[key].weight;
    if (roll <= 0) return key;
  }
  return 'normal';
}


function setInventoryOpen(open) {
  ui.showInventory = open;
  if (!open) { ui.selectedInvIndex = null; ui.hoverInvIndex = null; }
  const dim = open ? '0.15' : '1';
  const pe = open ? 'none' : 'auto';
  ['joystick-base', 'action-buttons', 'potion-buttons'].forEach((id) => {
    const el = document.getElementById(id);
    el.style.opacity = dim;
    el.style.pointerEvents = pe;
  });
}
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  input.keys[k] = true;
  if (k === 'escape') {
    e.preventDefault();
    if (ui.showInventory) { setInventoryOpen(false); return; }
    if (game.gameState === 'playing') { setPaused(!game.paused); return; }
  }
  if (k === 'p' && game.gameState === 'playing') { e.preventDefault(); setPaused(!game.paused); return; }
  if (game.paused) return;
  if (k === 'l' && game.gameState === 'playing') gainExp(Math.max(1, player.expToNext - player.exp)); // 테스트용: L = 한 레벨 업 (밸런스/스킬 해금 확인용)
  if (!ui.showInventory && game.gameState === 'playing') {
    if (k === '1') tryDrinkPotion('heal');
    if (k === '2') tryDrinkPotion('mana');
  }
  // 슬롯1 = Space(길게 누르면 계속 시전), 슬롯2 = E(길게)
  if (k === ' ') {
    e.preventDefault();
    if (game.gameState !== 'playing') { resetGame(); }
    else if (!input.holdSlot1) { input.holdSlot1 = true; SKILLS[player.slot1].try(); }
  }
  if (k === 'e') {
    if (game.gameState !== 'playing') { resetGame(); }
    else if (!input.holdSlot2) { input.holdSlot2 = true; SKILLS[player.slot2].try(); }
  }
  // Q/R = 슬롯1/슬롯2에 배정된 스킬을 다음 스킬로 전환(탭)
  if (k === 'q') { if (game.gameState !== 'playing') resetGame(); else cycleSkillSlot(1); }
  if (k === 'r') { if (game.gameState !== 'playing') resetGame(); else cycleSkillSlot(2); }
  if (k === 'i') setInventoryOpen(!ui.showInventory);
  if (ui.showInventory && k >= '1' && k <= '7') {
    tryUpgradeSlot(k.charCodeAt(0) - '1'.charCodeAt(0));
  }
  if (ui.showInventory && LEVEL_STAT_KEYS[k]) {
    trySpendStatPoint(LEVEL_STAT_KEYS[k]);
  }
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  input.keys[k] = false;
  if (k === ' ') input.holdSlot1 = false;
  if (k === 'e') input.holdSlot2 = false;
});

// 좌클릭(또는 터치) = 슬롯1 길게 누르기, 우클릭 = 슬롯2 길게 누르기
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  if (ui.showInventory) return; // 인벤토리 열려있을 땐 별도 핸들러가 처리
  if (game.gameState !== 'playing') { resetGame(); return; }
  if (game.paused) return;
  if (e.button === 2) { if (!input.holdSlot2) { input.holdSlot2 = true; SKILLS[player.slot2].try(); } }
  else { if (!input.holdSlot1) { input.holdSlot1 = true; SKILLS[player.slot1].try(); } }
});
window.addEventListener('pointerup', (e) => {
  if (e.button === 2) input.holdSlot2 = false;
  else input.holdSlot1 = false;
});
canvas.addEventListener('pointerleave', () => { input.holdSlot1 = false; input.holdSlot2 = false; ui.hoverInvIndex = null; });

function pointInRect(px, py, r) {
  return r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function invPanelHandlePoint(mx, my) {
  for (const tab of INV_TABS) {
    const r = ui.invTabRects[tab.key];
    if (r && pointInRect(mx, my, r)) { ui.invPanelTab = tab.key; ui.hoverInvIndex = null; return; }
  }
  for (const b of ui.invButtons) {
    if (pointInRect(mx, my, b)) { b.fn(); return; }
  }
  if (ui.invPanelTab === 'bag') {
    const hit = ui.invSlotRects.find((r) => pointInRect(mx, my, r));
    // 클릭하면 그 칸을 고정, 같은 칸을 다시 누르면 고정 해제 - 마우스를 옮겨도 선택이 바뀌지 않음
    if (hit) ui.selectedInvIndex = (ui.selectedInvIndex === hit.index) ? null : hit.index;
  }
}

canvas.addEventListener('pointermove', (e) => {
  if (!ui.showInventory) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  if (ui.invPanelTab === 'bag') {
    const hit = ui.invSlotRects.find((r) => pointInRect(mx, my, r));
    ui.hoverInvIndex = hit ? hit.index : null; // 올려두기만 하면 미리보기 - 고정(selectedInvIndex)은 건드리지 않음
  } else {
    ui.hoverInvIndex = null;
  }
});
canvas.addEventListener('pointerdown', (e) => {
  if (!ui.showInventory) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  invPanelHandlePoint(mx, my);
});

function pressAction(fn) {
  if (game.gameState !== 'playing') { resetGame(); return; }
  if (game.paused) return;
  fn();
}

// ===========================================================
// 모바일 터치 컨트롤: 가상 조이스틱 + 액션 버튼
// ===========================================================
const JOY_RADIUS = 42;
const joyBase = document.getElementById('joystick-base');
const joyKnob = document.getElementById('joystick-knob');

function joyMove(clientX, clientY) {
  const dx = clientX - input.joystick.baseX;
  const dy = clientY - input.joystick.baseY;
  const dist = Math.hypot(dx, dy);
  const clamped = Math.min(dist, JOY_RADIUS);
  const angle = Math.atan2(dy, dx);
  input.joystick.dx = Math.cos(angle) * clamped;
  input.joystick.dy = Math.sin(angle) * clamped;
  input.joystick.magnitude = clamped / JOY_RADIUS;
  joyKnob.style.transform = `translate(${input.joystick.dx}px, ${input.joystick.dy}px)`;
}
function joyEnd() {
  input.joystick.active = false;
  input.joystick.id = null;
  input.joystick.dx = 0; input.joystick.dy = 0; input.joystick.magnitude = 0;
  joyKnob.style.transform = 'translate(0px, 0px)';
}
joyBase.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  joyBase.setPointerCapture(e.pointerId);
  input.joystick.active = true;
  input.joystick.id = e.pointerId;
  const rect = joyBase.getBoundingClientRect();
  input.joystick.baseX = rect.left + rect.width / 2;
  input.joystick.baseY = rect.top + rect.height / 2;
  joyMove(e.clientX, e.clientY);
});
joyBase.addEventListener('pointermove', (e) => {
  if (input.joystick.active && e.pointerId === input.joystick.id) { e.preventDefault(); joyMove(e.clientX, e.clientY); }
});
joyBase.addEventListener('pointerup', (e) => { if (e.pointerId === input.joystick.id) joyEnd(); });
joyBase.addEventListener('pointercancel', (e) => { if (e.pointerId === input.joystick.id) joyEnd(); });

function bindHoldSlot(slotId, slotNum) {
  const el = document.getElementById(slotId);
  const setHold = slotNum === 1 ? (v) => { input.holdSlot1 = v; } : (v) => { input.holdSlot2 = v; };
  const skillKey = () => (slotNum === 1 ? player.slot1 : player.slot2);
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (game.gameState !== 'playing') { resetGame(); return; }
    if (game.paused) return;
    setHold(true);
    SKILLS[skillKey()].try();
  });
  const release = (e) => { e.preventDefault(); setHold(false); };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', release);
}
bindHoldSlot('slot1', 1);
bindHoldSlot('slot2', 2);
function bindCycle(id, slotNum) {
  document.getElementById(id).addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (game.gameState !== 'playing') { resetGame(); return; }
    if (game.paused) return;
    cycleSkillSlot(slotNum);
  });
}
bindCycle('slot1-cycle', 1);
bindCycle('slot2-cycle', 2);
['heal', 'mana'].forEach((kind) => {
  document.getElementById(`pot-${kind}`).addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    pressAction(() => tryDrinkPotion(kind));
  });
});
document.getElementById('btn-pause').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); setPaused(!game.paused); });
document.getElementById('btn-full').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); toggleFullscreen(); });
document.getElementById('btn-inv').addEventListener('pointerdown', (e) => { e.preventDefault(); setInventoryOpen(!ui.showInventory); });

function updatePlayer(dt) {
  player.x = player.body.position.x;
  player.y = player.body.position.y;

  if (player.flash > 0) player.flash -= dt;
  if (player.invuln > 0) player.invuln -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.attackTimer > 0) player.attackTimer -= dt;
  if (player.comboTimer > 0) {
    player.comboTimer -= dt;
    if (player.comboTimer <= 0) player.combo = 0;
  }
  if (player.warcryCooldown > 0) player.warcryCooldown -= dt;
  if (player.whirlwindCooldown > 0) player.whirlwindCooldown -= dt;
  if (player.leapCooldown > 0) player.leapCooldown -= dt;
  if (player.rushCooldown > 0) player.rushCooldown -= dt;
  if (player.smashCooldown > 0) player.smashCooldown -= dt;
  if (player.potionCd.heal > 0) player.potionCd.heal -= dt;
  if (player.potionCd.mana > 0) player.potionCd.mana -= dt;
  if (player.slowTimer > 0) player.slowTimer -= dt;
  if (player.vitalityTimer > 0) {
    player.vitalityTimer -= dt;
    if (player.vitalityTimer <= 0) {
      player.bonusMaxHp = 0;
      player.hp = Math.min(player.hp, player.maxHp + player.gearMaxHp);
    }
  }
  if (player.speedBuffTimer > 0) { player.speedBuffTimer -= dt; if (player.speedBuffTimer <= 0) player.speedMult = 1; }
  if (player.attackBuffTimer > 0) { player.attackBuffTimer -= dt; if (player.attackBuffTimer <= 0) player.attackBonus = 0; }
  if (player.defenseBuffTimer > 0) { player.defenseBuffTimer -= dt; if (player.defenseBuffTimer <= 0) player.defenseChance = 0; }
  if (player.moveFxCooldown > 0) player.moveFxCooldown -= dt;
  if (player.moveReaction > 0) player.moveReaction = Math.max(0, player.moveReaction - dt * 4.2);
  player.renderBreath += dt * (player.moveSpeedN > 0.08 ? 4.0 : 1.35);
  player.mana = Math.min(player.maxMana, player.mana + MANA_REGEN * dt);

  if (!player.alive) {
    Body.setVelocity(player.body, { x: 0, y: 0 });
    updatePlayerMotionReaction(dt, 0, 0);
    return;
  }

  if (player.leapTimer > 0) {
    updatePlayerMotionReaction(dt, 0, 0);
    updateLeap(dt);
    return; // 도약 중엔 일반 조작 불가
  }

  if (player.rushTimer > 0) {
    updatePlayerMotionReaction(dt, 0, 0);
    updateRush(dt);
    return; // 돌진 중엔 일반 조작 불가
  }

  if (player.smashTimer > 0) {
    updatePlayerMotionReaction(dt, 0, 0);
    updateGroundSmash(dt);
    return; // 강타 중엔 이동을 잠깐 잠금
  }

  if (player.whirlwindTimer > 0) {
    player.whirlwindTimer -= dt;
    player.mana -= WHIRLWIND_MANA_DRAIN * dt;
    if (player.mana <= 0) { player.mana = 0; player.whirlwindTimer = 0; }
    else updateWhirlwind(dt);
  }

  if (player.knockback > 0) {
    player.knockback -= dt;
    updatePlayerMotionReaction(dt, 0, 0);
    return; // 넉백 중엔 조작이 물리 속도를 덮어쓰지 않음
  }

  let dx = 0, dy = 0, moving, wantsRun;
  if (input.joystick.active && input.joystick.magnitude > 0.08) {
    const len = Math.hypot(input.joystick.dx, input.joystick.dy) || 1;
    dx = input.joystick.dx / len;
    dy = input.joystick.dy / len;
    moving = true;
    wantsRun = input.joystick.magnitude > 0.72; // 조이스틱을 크게 기울이면 달리기
  } else {
    if (input.keys['arrowleft'] || input.keys['a']) dx -= 1;
    if (input.keys['arrowright'] || input.keys['d']) dx += 1;
    if (input.keys['arrowup'] || input.keys['w']) dy -= 1;
    if (input.keys['arrowdown'] || input.keys['s']) dy += 1;
    moving = !!(dx || dy);
    wantsRun = !!input.keys['shift'];
  }

  if (moving && wantsRun && player.stamina > 0) {
    player.running = true;
    player.stamina = Math.max(0, player.stamina - STAMINA_DRAIN * dt);
  } else {
    player.running = false;
    player.stamina = Math.min(player.maxStamina, player.stamina + STAMINA_REGEN * dt);
  }

  // -----------------------------------------------------------
  // 관성 이동 (다른 에이전트 버전에서 이식 - 즉시 최고속도 대신 가감속)
  // -----------------------------------------------------------
  if (moving) {
    const inputLen = Math.hypot(dx, dy) || 1;
    dx /= inputLen;
    dy /= inputLen;
  }

  const slowMul = player.slowTimer > 0 ? 0.55 : 1;
  const speedPxPerSec = (player.running ? RUN_SPEED : WALK_SPEED) *
    slowMul * player.speedMult * player.gearSpeedMult;
  const targetSpeed = moving ? speedPxPerSec / 60 : 0;

  const curVX = player.body.velocity.x;
  const curVY = player.body.velocity.y;
  const curSpeed = Math.hypot(curVX, curVY);

  let nextVX = curVX;
  let nextVY = curVY;
  let align = 1;
  let turnAmount = 0;

  if (moving) {
    const targetVX = dx * targetSpeed;
    const targetVY = dy * targetSpeed;

    if (curSpeed > 0.04) {
      const cvx = curVX / curSpeed;
      const cvy = curVY / curSpeed;
      align = cvx * dx + cvy * dy;
      turnAmount = Math.abs(cvx * dy - cvy * dx);
    }

    let accel;
    if (curSpeed < 0.04) {
      accel = MOVE_START_ACCEL;
    } else if (align < -0.25) {
      accel = MOVE_REVERSE_ACCEL;
    } else if (turnAmount > 0.15) {
      accel = MOVE_TURN_ACCEL + turnAmount * 2.0;
    } else {
      const progress = clamp01(curSpeed / Math.max(targetSpeed, 0.001));
      accel = MOVE_START_ACCEL + (MOVE_CRUISE_ACCEL - MOVE_START_ACCEL) * Math.pow(progress, 0.7);
    }

    if (player.running) accel *= 0.94;

    const moved = moveToward2D(curVX, curVY, targetVX, targetVY, accel * dt);
    nextVX = moved.x;
    nextVY = moved.y;

    const nextSpeed = Math.hypot(nextVX, nextVY);
    if (nextSpeed > 0.05) {
      const targetFacing = Math.atan2(nextVY, nextVX);
      player.facing = lerpAngle(player.facing, targetFacing, 1 - Math.exp(-MOVE_FACING_RESPONSE * dt));
    }

    if (curSpeed > RUN_SPEED / 60 * 0.42 && (align < 0.35 || turnAmount > 0.72)) {
      const d = curSpeed > 0.001 ? { x: curVX / curSpeed, y: curVY / curSpeed } : { x: dx, y: dy };
      emitMoveReaction(d.x, d.y, align < -0.15 ? 1.0 : 0.72);
    }
  } else {
    const released = player.moveInputActive;
    const moved = moveToward2D(curVX, curVY, 0, 0, MOVE_BRAKE * dt);
    nextVX = moved.x;
    nextVY = moved.y;

    if (released && curSpeed > WALK_SPEED / 60 * 0.55) {
      const d = { x: curVX / curSpeed, y: curVY / curSpeed };
      emitMoveReaction(d.x, d.y, Math.min(1, curSpeed / (RUN_SPEED / 60)));
    }
  }

  Body.setVelocity(player.body, { x: nextVX, y: nextVY });

  const accelX = (nextVX - curVX) / Math.max(dt, 0.0001);
  const accelY = (nextVY - curVY) / Math.max(dt, 0.0001);
  updatePlayerMotionReaction(dt, accelX, accelY);

  const effectiveMax = Math.max((player.running ? RUN_SPEED : WALK_SPEED) / 60, 0.001);
  const visualSpeed = Math.hypot(nextVX, nextVY);
  player.moveSpeedN += (clamp01(visualSpeed / effectiveMax) - player.moveSpeedN) * (1 - Math.exp(-8 * dt));
  player.moveStep += visualSpeed * dt * 16;

  player.moveInputActive = moving;
}

function registerComboHit() {
  player.combo++;
  player.comboTimer = COMBO_WINDOW;
}

function tryPlayerAttack() {
  if (!player.alive || player.attackCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.rushTimer > 0 || player.smashTimer > 0) return;
  const comboBonus = Math.min(player.combo * COMBO_SPEED_PER_HIT, COMBO_SPEED_CAP);
  const spdMul = Math.max(1 - Math.min(player.gearAtkSpeed, 0.7) - comboBonus, 0.25);
  player.currentAttackDuration = ATTACK_DURATION * spdMul;
  player.attackTimer = player.currentAttackDuration;
  player.attackCooldown = ATTACK_COOLDOWN * spdMul;

  let landed = false;
  const atkRange = getWeaponRange();
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    // 특정 지점(오프셋) 대신 몸 중심 + 몸집 반경으로 판정 - 접근 방향과 무관하게 몸 전체가 피격 범위가 됨
    const dx = c.x - player.x, dy = c.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > atkRange + getCowHitRadius(c)) return;
    let diff = Math.abs(Math.atan2(dy, dx) - player.facing);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < getAttackArc() / 2) { damageCow(c); landed = true; }
  });
  if (landed) registerComboHit();
}

function killCow(c) {
  c.deadPos = { x: c.x, y: c.y };
  c.state = 'dead';
  c.deadTimer = 0.3;
  World.remove(world, c.body);
  game.kills++;
  gainExp((MONSTERS[c.kind] || MONSTERS.normal).exp);
  spawnHitParticles(c.x, c.y, PALETTE.horn, c.kind === 'boss' ? 22 : 10);
  if (c.kind === 'cold') spawnColdNova(c.x, c.y);
  if (c.kind === 'exploder') {
    spawnShockwave(c.x, c.y, EXPLODER_BLAST_RADIUS, '#ff5b3d');
    spawnHitParticles(c.x, c.y, '#ff8a3d', 14);
    game.shake = Math.min(game.shake + 7, 12);
    game.impactFlash = Math.max(game.impactFlash, 0.10);
    if (player.alive && Math.hypot(player.x - c.x, player.y - c.y) <= EXPLODER_BLAST_RADIUS) {
      hitPlayer(c.x, c.y, 6);
    }
  }
  if (c.kind === 'boss') {
    game.gameState = 'victory';
    recordRun('victory');
    game.shake = Math.min(game.shake + 12, 12);
    spawnShockwave(c.x, c.y, 220, '#c98bef');
    dropLoot(c.x, c.y, true, 4);
  } else if (c.kind !== 'normal') {
    dropLoot(c.x, c.y, true, 1);
  } else {
    dropLoot(c.x, c.y, false, 1);
  }
}

function gainExp(amount) {
  if (player.level >= MAX_LEVEL) return;
  player.exp += amount;
  while (player.level < MAX_LEVEL && player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    player.level++;
    player.statPoints += POINTS_PER_LEVEL;
    player.expToNext = expForLevel(player.level);
    floatText(player.x, player.y - 54, `LEVEL UP! Lv.${player.level}`, '#ffe066');
    Object.keys(SKILL_UNLOCK_LEVEL).forEach((id) => {
      if (SKILL_UNLOCK_LEVEL[id] === player.level) floatText(player.x, player.y - 74, `새 스킬 해금: ${SKILLS[id].label}`, '#9be39b');
    });
    game.shake = Math.min(game.shake + 5, 12);
  }
  if (player.level >= MAX_LEVEL) player.exp = Math.min(player.exp, player.expToNext);
}

function trySpendStatPoint(statKey) {
  if (player.statPoints <= 0) return;
  player.statPoints -= 1;
  player.levelStats[statKey] = (player.levelStats[statKey] || 0) + 1;
  recalcGearStats();
  floatText(player.x, player.y - 40, `${STAT_DEF[statKey].label} +1 (Lv)`, '#ffe066');
}

function spawnColdNova(x, y) {
  spawnShockwave(x, y, 90, '#9fd8ff');
  if (player.alive && Math.hypot(player.x - x, player.y - y) <= 90) {
    player.slowTimer = 2.5;
  }
}

function bossSlam(c) {
  spawnShockwave(c.x, c.y, BOSS_SLAM_RADIUS, '#b57bd6');
  game.shake = Math.min(game.shake + 6, 12);
  if (player.alive && Math.hypot(player.x - c.x, player.y - c.y) <= BOSS_SLAM_RADIUS) {
    hitPlayer(c.x, c.y, 6);
  }
}

function damageCow(c) {
  c.flash = 0.12;
  applyKnockback(c.body, player.x, player.y, 7);
  c.knockback = 0.18;
  game.shake = Math.min(game.shake + 4, 10);
  game.hitstop = 4;
  spawnHitParticles(c.x, c.y, PALETTE.hide, 7);

  const dmg = BASE_DAMAGE + player.attackBonus + player.gearAtkPower;
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, '#fff');
  c.hp -= dmg;
  if (c.hp <= 0 && c.state !== 'dead') {
    killCow(c);
    game.shake = Math.min(game.shake + 6, 12);
  }
}

function hitPlayer(fromX, fromY, dmg = 3) {
  if (!player.alive || player.invuln > 0) return;

  const totalEvasion = Math.min(BASE_EVASION + player.gearEvasion, 0.75);
  if (Math.random() < totalEvasion) {
    spawnDamageNumber(player.x, player.y - 34, 'MISS', '#8fe8ff');
    player.invuln = 0.25;
    return;
  }

  const totalBlock = Math.min(BASE_BLOCK + player.defenseChance + player.gearDefense, 0.85);
  const blocked = Math.random() < totalBlock;
  if (!blocked) {
    player.hp -= dmg;
    spawnDamageNumber(player.x, player.y - 34, `-${dmg}`, '#ff5b52');
  } else {
    spawnDamageNumber(player.x, player.y - 34, 'BLOCK', '#8fd0ff');
  }

  player.invuln = 0.55; // 기존 0.8 → 0.55, 여러 마리에게 둘러싸였을 때 실제로 더 아프게
  player.flash = 0.14;
  applyKnockback(player.body, fromX, fromY, blocked ? 3 : 6);
  player.knockback = blocked ? 0.1 : 0.22;
  game.shake = Math.min(game.shake + (blocked ? 3 : 6), 12);
  game.hitstop = blocked ? 0 : 5;
  spawnHitParticles(player.x, player.y, PALETTE.eye, blocked ? 4 : 8);

  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    game.gameState = 'gameover';
    recordRun('gameover');
    Body.setVelocity(player.body, { x: 0, y: 0 });
  }
}

function tryWarCry() {
  if (!player.alive || player.warcryCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.rushTimer > 0 || player.smashTimer > 0) return;
  if (player.mana < WARCRY_MANA_COST) return;
  player.mana -= WARCRY_MANA_COST;
  player.warcryCooldown = WARCRY_COOLDOWN;
  spawnShockwave(player.x, player.y, WARCRY_RADIUS, '#e8a33d');
  game.shake = Math.min(game.shake + 7, 12);
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (Math.hypot(c.x - player.x, c.y - player.y) <= WARCRY_RADIUS) warCryHitCow(c);
  });
}

function warCryHitCow(c) {
  applyKnockback(c.body, player.x, player.y, 8);
  c.knockback = 0.25;
  c.stunTimer = 1.0;
  c.flash = 0.15;
  spawnHitParticles(c.x, c.y, '#e8dcc8', 4);
}

function tryWhirlwind() {
  if (!player.alive || player.whirlwindCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.rushTimer > 0 || player.smashTimer > 0) return;
  if (player.mana < WHIRLWIND_MANA_COST) return;
  player.mana -= WHIRLWIND_MANA_COST;
  game.cows.forEach((c) => { c.whirlHitCd = 0; });
  player.whirlwindTimer = WHIRLWIND_DURATION;
  player.whirlwindCooldown = WHIRLWIND_COOLDOWN + WHIRLWIND_DURATION;
  game.shake = Math.min(game.shake + 5, 12);
}

function updateWhirlwind(dt) {
  player.whirlAngle += dt * 26;
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (c.whirlHitCd > 0) c.whirlHitCd -= dt;
    if (c.whirlHitCd <= 0 && Math.hypot(c.x - player.x, c.y - player.y) <= WHIRLWIND_RADIUS) {
      whirlwindHit(c);
      c.whirlHitCd = WHIRLWIND_TICK;
    }
  });
}

function whirlwindHit(c) {
  c.flash = 0.1;
  applyKnockback(c.body, player.x, player.y, 5);
  c.knockback = 0.15;
  spawnHitParticles(c.x, c.y, PALETTE.hide, 5);

  const dmg = BASE_DAMAGE + player.attackBonus + player.gearAtkPower;
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, '#fff');
  c.hp -= dmg;
  registerComboHit();
  if (c.hp <= 0 && c.state !== 'dead') {
    killCow(c);
  }
}

// ===========================================================
// 리프 어택 (도약 강타) - 바바리안 대표 스킬
// ===========================================================
function tryLeap() {
  if (!player.alive || player.leapCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.rushTimer > 0 || player.smashTimer > 0) return;
  if (player.mana < LEAP_MANA_COST) return;
  player.mana -= LEAP_MANA_COST;
  player.leapCooldown = LEAP_COOLDOWN;
  player.leapTimer = LEAP_DURATION;
  player.leapFrom.x = player.x;
  player.leapFrom.y = player.y;

  const margin = player.r + 10;
  let tx = player.x + Math.cos(player.facing) * LEAP_DISTANCE;
  let ty = player.y + Math.sin(player.facing) * LEAP_DISTANCE;
  tx = Math.min(Math.max(tx, PEN.x + margin), PEN.x + PEN.size - margin);
  ty = Math.min(Math.max(ty, PEN.y + margin), PEN.y + PEN.size - margin);
  player.leapTo.x = tx;
  player.leapTo.y = ty;
  game.shake = Math.min(game.shake + 3, 12);
}

function updateLeap(dt) {
  player.leapTimer -= dt;
  const t = 1 - Math.max(player.leapTimer, 0) / LEAP_DURATION;
  const ease = t * (2 - t);
  const nx = player.leapFrom.x + (player.leapTo.x - player.leapFrom.x) * ease;
  const ny = player.leapFrom.y + (player.leapTo.y - player.leapFrom.y) * ease;
  Body.setPosition(player.body, { x: nx, y: ny });
  Body.setVelocity(player.body, { x: 0, y: 0 });
  player.x = nx;
  player.y = ny;

  if (player.leapTimer <= 0) {
    player.leapTimer = 0;
    leapLand();
  }
}

function leapLand() {
  spawnShockwave(player.x, player.y, LEAP_RADIUS + 20, '#c9b48a');
  game.shake = Math.min(game.shake + 8, 12);
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (Math.hypot(c.x - player.x, c.y - player.y) <= LEAP_RADIUS) leapHitCow(c);
  });
}

function leapHitCow(c) {
  c.flash = 0.12;
  applyKnockback(c.body, player.x, player.y, 7);
  c.knockback = 0.2;
  spawnHitParticles(c.x, c.y, PALETTE.hide, 6);

  const dmg = BASE_DAMAGE + player.attackBonus + player.gearAtkPower;
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, '#fff');
  c.hp -= dmg;
  registerComboHit();
  if (c.hp <= 0 && c.state !== 'dead') {
    killCow(c);
  }
}

// ===========================================================
// 함성 충격파 시각 효과
// ===========================================================
// 버닝소울이 지나간 자리에 남기는 불바닥 - 밟고 있으면 주기적으로 피해
function spawnFireHazard(x, y) {
  game.hazards.push({ x, y, r: 24, life: 2.2, maxLife: 2.2, tickTimer: 0 });
}
function updateHazards(dt) {
  for (let i = game.hazards.length - 1; i >= 0; i--) {
    const h = game.hazards[i];
    h.life -= dt;
    h.tickTimer -= dt;
    if (h.life <= 0) { game.hazards.splice(i, 1); continue; }
    if (player.alive && h.tickTimer <= 0 && Math.hypot(player.x - h.x, player.y - h.y) <= h.r) {
      hitPlayer(h.x, h.y);
      h.tickTimer = 0.6;
      if (Math.random() < 0.4) spawnHitParticles(player.x, player.y - 10, '#ff7a1a', 3);
    }
  }
}
function drawHazards(ctx) {
  game.hazards.forEach((h) => {
    const alpha = Math.min(1, h.life / h.maxLife) * (0.35 + Math.sin(performance.now() / 90 + h.x) * 0.08);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
    grad.addColorStop(0, 'rgba(255,200,80,0.9)');
    grad.addColorStop(0.6, 'rgba(255,110,30,0.55)');
    grad.addColorStop(1, 'rgba(255,60,10,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// 번개카우가 쏘는 전기 줄기 - 아주 짧게 번쩍이는 시각 효과
function spawnLightningBolt(x1, y1, x2, y2) {
  game.lightningBolts.push({ x1, y1, x2, y2, life: 0.18, maxLife: 0.18 });
}
function updateLightningBolts(dt) {
  for (let i = game.lightningBolts.length - 1; i >= 0; i--) {
    game.lightningBolts[i].life -= dt;
    if (game.lightningBolts[i].life <= 0) game.lightningBolts.splice(i, 1);
  }
}
function drawLightningBolts(ctx) {
  game.lightningBolts.forEach((b) => {
    const alpha = Math.max(0, b.life / b.maxLife);
    const dx = b.x2 - b.x1, dy = b.y2 - b.y1;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist, ny = dx / dist;
    const segs = 6;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#fff066';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const jitter = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * 14;
      const px = b.x1 + dx * t + nx * jitter;
      const py = b.y1 + dy * t + ny * jitter;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  });
}

function spawnShockwave(x, y, maxRadius, color) {
  game.shockwaves.push({ x, y, maxRadius, age: 0, duration: 0.45, color });
}
function updateShockwaves(dt) {
  for (let i = game.shockwaves.length - 1; i >= 0; i--) {
    game.shockwaves[i].age += dt;
    if (game.shockwaves[i].age >= game.shockwaves[i].duration) game.shockwaves.splice(i, 1);
  }
}
function drawShockwaves(ctx) {
  game.shockwaves.forEach((s) => {
    const t = s.age / s.duration;
    const r = Math.max(s.maxRadius * t, 1);
    const alpha = 1 - t;

    const grad = ctx.createRadialGradient(s.x, s.y, Math.max(r - 26, 0), s.x, s.y, r);
    grad.addColorStop(0, hexToRgba(s.color, 0));
    grad.addColorStop(0.75, hexToRgba(s.color, alpha * 0.5));
    grad.addColorStop(1, hexToRgba(s.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(s.color, Math.min(alpha * 1.4, 1));
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawSkillIcon(ctx, x, y, label, color, cooldownFrac) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (cooldownFrac > 0) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + cooldownFrac * Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 1);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ===========================================================
// 소비 아이템 드롭/픽업 시스템
// ===========================================================

class Item {
  constructor(x, y, type, gearData = null) {
    this.x = x;
    this.y = y;
    this.type = type; // 'heal'|'vitality'|'speed'|'attack'|'defense'|'gear'
    this.gearData = gearData;
    this.life = 14;
    this.bob = Math.random() * 10;
    this.spawnT = 0;
  }
}

function dropLoot(x, y, guaranteed, count) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * 18;
    const px = x + Math.cos(ang) * dist, py = y + Math.sin(ang) * dist;

    if (Math.random() < (guaranteed ? 0.5 : GEAR_DROP_CHANCE)) {
      game.items.push(new Item(px, py, 'gear', rollGearItem()));
      continue;
    }
    if (Math.random() < (guaranteed ? 0.35 : MATERIAL_DROP_CHANCE)) {
      game.items.push(new Item(px, py, 'material'));
      continue;
    }
    if (!guaranteed && Math.random() > 0.20) continue;
    game.items.push(new Item(px, py, rollConsumableType()));
  }
}

function rollGearItem(opts = {}) {
  const categories = ['armor', 'weapon', 'greaves', 'boots', 'accessory', 'shield'];
  const category = opts.category || categories[Math.floor(Math.random() * categories.length)];
  const handedness = category === 'weapon' ? (opts.handedness || (Math.random() < 0.5 ? 'two' : 'one')) : null;
  const rarity = opts.rarity || rollRarity();
  const rDef = RARITY_DEF[rarity];

  const statKeys = Object.keys(STAT_DEF);
  const numStats = rDef.statMin + Math.floor(Math.random() * (rDef.statMax - rDef.statMin + 1));
  const chosen = [];
  while (chosen.length < numStats) {
    const k = statKeys[Math.floor(Math.random() * statKeys.length)];
    if (!chosen.includes(k)) chosen.push(k);
  }
  const stats = {};
  chosen.forEach((k) => {
    const d = STAT_DEF[k];
    stats[k] = (d.min + Math.random() * (d.max - d.min)) * rDef.mult;
  });
  let variant = opts.variant || null;
  if (!variant) {
    if (category === 'weapon') variant = WEAPON_VARIANTS[Math.floor(Math.random() * WEAPON_VARIANTS.length)];
    else if (category === 'accessory') variant = ACCESSORY_VARIANTS[Math.floor(Math.random() * ACCESSORY_VARIANTS.length)];
  }
  return { category, handedness, rarity, stats, upgradeLevel: 0, identified: !!opts.identified, variant };
}

function equipItem(gear, opts = {}) {
  let slot;
  const replaced = [];
  if (gear.category === 'weapon') {
    if (gear.handedness === 'two') {
      if (player.equipment.weaponMain && player.equipment.weaponMain !== 'LOCKED') replaced.push(player.equipment.weaponMain);
      if (player.equipment.weaponOff && player.equipment.weaponOff !== 'LOCKED') replaced.push(player.equipment.weaponOff);
      player.equipment.weaponMain = gear;
      player.equipment.weaponOff = 'LOCKED';
      slot = 'weaponMain';
    } else {
      const mainIsTwoHand = player.equipment.weaponMain && player.equipment.weaponMain !== 'LOCKED' && player.equipment.weaponMain.handedness === 'two';
      if (mainIsTwoHand) {
        replaced.push(player.equipment.weaponMain);
        player.equipment.weaponMain = gear;
        player.equipment.weaponOff = null;
        slot = 'weaponMain';
      } else if (!player.equipment.weaponMain) {
        slot = 'weaponMain';
        player.equipment[slot] = gear;
      } else if (!player.equipment.weaponOff) {
        slot = 'weaponOff';
        player.equipment[slot] = gear;
      } else {
        replaced.push(player.equipment.weaponMain);
        slot = 'weaponMain';
        player.equipment[slot] = gear;
      }
    }
  } else if (gear.category === 'shield') {
    const mainIsTwoHand = player.equipment.weaponMain && player.equipment.weaponMain !== 'LOCKED' && player.equipment.weaponMain.handedness === 'two';
    if (mainIsTwoHand) {
      replaced.push(player.equipment.weaponMain);
      player.equipment.weaponMain = null;
    }
    if (player.equipment.weaponOff && player.equipment.weaponOff !== 'LOCKED') replaced.push(player.equipment.weaponOff);
    player.equipment.weaponOff = gear;
    slot = 'weaponOff';
  } else if (gear.category === 'accessory') {
    if (!player.equipment.accessory1) {
      slot = 'accessory1';
    } else if (!player.equipment.accessory2) {
      slot = 'accessory2';
    } else {
      replaced.push(player.equipment.accessory1);
      slot = 'accessory1';
    }
    player.equipment[slot] = gear;
  } else {
    slot = gear.category;
    if (player.equipment[slot]) replaced.push(player.equipment[slot]);
    player.equipment[slot] = gear;
  }
  recalcGearStats();
  if (!opts.silent) {
    floatText(player.x, player.y - 44, `[${RARITY_DEF[gear.rarity].label}] ${GEAR_SLOT_LABEL[slot]} 장착!`, RARITY_DEF[gear.rarity].color);
  }
  return replaced;
}

// 시작할 때 맨손 대신 기본 장비를 쥐어줌 - 한손검+방패 또는 도끼+방패 중 랜덤
function giveStarterGear() {
  const weaponVariant = Math.random() < 0.5 ? 'sword' : 'axe';
  const weapon = rollGearItem({ category: 'weapon', handedness: 'one', rarity: 'normal', variant: weaponVariant, identified: true });
  const shield = rollGearItem({ category: 'shield', rarity: 'normal', identified: true });
  equipItem(weapon, { silent: true });
  equipItem(shield, { silent: true });
}

// 장비를 바꿔가며 테스트할 수 있도록 가방에 종류별로 하나씩 넣어줌 (전부 감정된 일반 등급)
// 데모/테스트 편의 기능 - 나중에 진짜 파밍만으로 얻게 하고 싶으면 resetGame에서 이 호출만 지우면 됨
function giveTestStash() {
  WEAPON_VARIANTS.forEach((v) => {
    player.inventory.push(rollGearItem({ category: 'weapon', handedness: 'one', rarity: 'normal', variant: v, identified: true }));
  });
  player.inventory.push(rollGearItem({ category: 'weapon', handedness: 'two', rarity: 'normal', variant: 'sword', identified: true }));
  player.inventory.push(rollGearItem({ category: 'shield', rarity: 'normal', identified: true }));
}

function equipFromInventory(index) {
  const gear = player.inventory[index];
  if (!gear || !gear.identified) return; // 미감정 장비는 장착 불가
  const replaced = equipItem(gear);
  player.inventory.splice(index, 1);
  replaced.forEach((old) => {
    if (old && old !== 'LOCKED' && player.inventory.length < INVENTORY_SIZE) player.inventory.push(old);
  });
  ui.selectedInvIndex = null;
}

function tryUpgradeSlot(slotIndex) {
  const slot = GEAR_SLOTS[slotIndex];
  if (!slot) return;
  const it = player.equipment[slot];
  if (!it || it === 'LOCKED') return;
  if (player.materials < 1) {
    floatText(player.x, player.y - 40, '재료 부족', '#999');
    return;
  }
  player.materials -= 1;
  if (Math.random() < UPGRADE_SUCCESS_CHANCE) {
    const statKeys = Object.keys(it.stats);
    const k = statKeys[Math.floor(Math.random() * statKeys.length)];
    it.stats[k] *= 1.25;
    it.upgradeLevel = (it.upgradeLevel || 0) + 1;
    recalcGearStats();
    floatText(player.x, player.y - 40, `${GEAR_SLOT_LABEL[slot]} 업그레이드 성공 +${it.upgradeLevel}`, RARITY_DEF[it.rarity].color);
  } else {
    floatText(player.x, player.y - 40, '업그레이드 실패...', '#999');
  }
}

function recalcGearStats() {
  let atkSpeed = 0, atkPower = 0, defense = 0, evasion = 0, moveSpeed = 0, health = 0, mana = 0;
  GEAR_SLOTS.forEach((slot) => {
    const it = player.equipment[slot];
    if (!it || it === 'LOCKED') return;
    if (it.stats.atkSpeed) atkSpeed += it.stats.atkSpeed;
    if (it.stats.atkPower) atkPower += it.stats.atkPower;
    if (it.stats.defense) defense += it.stats.defense;
    if (it.stats.evasion) evasion += it.stats.evasion;
    if (it.stats.moveSpeed) moveSpeed += it.stats.moveSpeed;
    if (it.stats.health) health += it.stats.health;
    if (it.stats.mana) mana += it.stats.mana;
  });

  // 레벨업으로 분배한 포인트도 같은 합계에 더함(아래 gearXXX 필드는 "장비+레벨" 합산치)
  atkSpeed += (player.levelStats.atkSpeed || 0) * LEVEL_STAT_PER_POINT.atkSpeed;
  atkPower += (player.levelStats.atkPower || 0) * LEVEL_STAT_PER_POINT.atkPower;
  defense += (player.levelStats.defense || 0) * LEVEL_STAT_PER_POINT.defense;
  evasion += (player.levelStats.evasion || 0) * LEVEL_STAT_PER_POINT.evasion;
  moveSpeed += (player.levelStats.moveSpeed || 0) * LEVEL_STAT_PER_POINT.moveSpeed;
  health += (player.levelStats.health || 0) * LEVEL_STAT_PER_POINT.health;
  mana += (player.levelStats.mana || 0) * LEVEL_STAT_PER_POINT.mana;

  const oldEffectiveMax = player.maxHp + player.bonusMaxHp + player.gearMaxHp;
  player.gearAtkSpeed = atkSpeed;
  player.gearAtkPower = Math.round(atkPower);
  player.gearDefense = defense;
  player.gearEvasion = evasion;
  player.gearSpeedMult = 1 + moveSpeed;
  player.gearMaxHp = Math.round(health);
  player.gearMaxMana = Math.round(mana);

  const newEffectiveMax = player.maxHp + player.bonusMaxHp + player.gearMaxHp;
  if (newEffectiveMax > oldEffectiveMax) player.hp += (newEffectiveMax - oldEffectiveMax);
  player.hp = Math.min(player.hp, newEffectiveMax);
  player.maxMana = MAX_MANA + player.gearMaxMana;
  player.mana = Math.min(player.mana, player.maxMana);
}

function updateItems(dt) {
  for (let i = game.items.length - 1; i >= 0; i--) {
    const it = game.items[i];
    if (it.spawnT < 1) it.spawnT = Math.min(it.spawnT + dt * 6, 1);
    it.life -= dt;
    if (it.warnCd > 0) it.warnCd -= dt;
    if (it.life <= 0) { game.items.splice(i, 1); continue; }
    if (player.alive) {
      const d = Math.hypot(player.x - it.x, player.y - it.y);
      if (d <= player.r + 16) {
        if (it.type === 'gear') {
          if (player.inventory.length >= INVENTORY_SIZE) {
            if (!(it.warnCd > 0)) { floatText(player.x, player.y - 40, '인벤토리 가득!', '#ff5b52'); it.warnCd = 1.5; } // 매 프레임 도배되지 않게 간격 둠
            continue; // 바닥에 그대로 둠
          }
          player.inventory.push(it.gearData);
          // 미감정 상태로 줍는 것이므로 등급은 아직 알려주지 않음 (감정해야 공개됨)
          floatText(it.x, it.y - 30, `미감정 ${gearDisplayName(it.gearData)} 획득`, '#c9c9c9');
          spawnHitParticles(it.x, it.y, '#9a9a9a', 8);
        } else if (it.type === 'material') {
          player.materials++;
          floatText(it.x, it.y - 30, `재료 +1 (보유 ${player.materials})`, '#c9c9c9');
          spawnHitParticles(it.x, it.y, '#c9c9c9', 6);
        } else if (it.type === 'heal' || it.type === 'mana') {
          if (player.potions[it.type] >= POTION_MAX) {
            if (!(it.warnCd > 0)) { floatText(player.x, player.y - 40, '물약 가득!', '#ff5b52'); it.warnCd = 1.5; }
            continue; // 바닥에 그대로 둠
          }
          player.potions[it.type] += 1;
          floatText(it.x, it.y - 30, `${it.type === 'heal' ? '생명' : '마나'} 물약 +1 (${player.potions[it.type]})`, ITEM_STYLE[it.type].color);
          spawnHitParticles(it.x, it.y, ITEM_STYLE[it.type].color, 8);
        } else {
          applyItem(it.type);
          spawnHitParticles(it.x, it.y, ITEM_STYLE[it.type].color, 8);
        }
        game.shake = Math.min(game.shake + 2, 12);
        game.items.splice(i, 1);
      }
    }
  }
}

function rollConsumableType() {
  const entries = Object.entries(POTION_DROP_WEIGHTS);
  let r = Math.random() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [type, w] of entries) { r -= w; if (r <= 0) return type; }
  return 'heal';
}

function tryDrinkPotion(kind) {
  if (!player.alive || player.potionCd[kind] > 0) return;
  const label = kind === 'heal' ? '생명' : '마나';
  if ((player.potions[kind] || 0) <= 0) {
    floatText(player.x, player.y - 40, `${label} 물약 없음`, '#999');
    return;
  }
  const color = ITEM_STYLE[kind].color;
  if (kind === 'heal') {
    const maxHp = player.maxHp + player.bonusMaxHp + player.gearMaxHp;
    if (player.hp >= maxHp) { floatText(player.x, player.y - 40, '체력이 가득 차 있어', '#999'); return; }
    const amount = Math.max(1, Math.ceil(maxHp * POTION_HEAL_RATIO));
    player.hp = Math.min(maxHp, player.hp + amount);
    floatText(player.x, player.y - 40, `+${amount} HP`, color);
  } else {
    if (player.mana >= player.maxMana) { floatText(player.x, player.y - 40, '마나가 가득 차 있어', '#999'); return; }
    player.mana = Math.min(player.maxMana, player.mana + POTION_MANA_AMOUNT);
    floatText(player.x, player.y - 40, `+${POTION_MANA_AMOUNT} MP`, color);
  }
  player.potions[kind] -= 1;
  player.potionCd[kind] = POTION_COOLDOWN;
  spawnHitParticles(player.x, player.y, color, 8);
}

function applyItem(type) {
  // 생명/마나 물약은 줍는 즉시 쓰지 않고 보관함 - tryDrinkPotion으로 마심 (여기는 즉시 효과형 버프 물약만)
  if (type === 'vitality') {
    player.bonusMaxHp = 6;
    player.vitalityTimer = VITALITY_DURATION;
    player.hp = Math.min(player.hp + 6, player.maxHp + player.bonusMaxHp + player.gearMaxHp);
    floatText(player.x, player.y - 40, '최대체력 +6', ITEM_STYLE.vitality.color);
  } else if (type === 'speed') {
    player.speedMult = 1.35;
    player.speedBuffTimer = SPEED_BUFF_DURATION;
    floatText(player.x, player.y - 40, '이동속도 UP', ITEM_STYLE.speed.color);
  } else if (type === 'attack') {
    player.attackBonus = 3;
    player.attackBuffTimer = ATTACK_BUFF_DURATION;
    floatText(player.x, player.y - 40, '공격력 UP', ITEM_STYLE.attack.color);
  } else if (type === 'defense') {
    player.defenseChance = 0.5;
    player.defenseBuffTimer = DEFENSE_BUFF_DURATION;
    floatText(player.x, player.y - 40, '방어력 UP', ITEM_STYLE.defense.color);
  }
}

// 바닥 아이템은 아이콘 대신 글자 칩으로 표시 - 장비는 미감정이라 회색, 물약/재료는 색으로 구분
function groundLabelForGear(gear) {
  if (gear.category === 'weapon') return '무기';
  if (gear.category === 'accessory') return '장신구';
  return '방어구'; // 갑옷/각반/신발/방패
}

function drawItems(ctx, t) {
  game.items.forEach((it) => {
    const isGear = it.type === 'gear';
    const isMaterial = it.type === 'material';
    const label = isGear ? groundLabelForGear(it.gearData) : isMaterial ? '재료' : (POTION_LABEL[it.type] || '물약');
    const color = isGear ? '#cfcfcf' : isMaterial ? '#9fd6e0' : ITEM_STYLE[it.type].color;
    const bobY = Math.sin(t * 4 + it.bob) * 3;
    const pop = Math.max(it.spawnT, 0.01);
    const fade = it.life < 2 ? Math.max(it.life / 2, 0) : 1;

    ctx.save();
    ctx.translate(it.x, it.y + bobY);
    ctx.scale(pop, pop);
    ctx.font = 'bold 11px sans-serif';
    const bw = ctx.measureText(label).width + 14, bh = 18;

    ctx.globalAlpha = fade * 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, bh * 0.85, bw * 0.38, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(10,14,12,0.88)';
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 6);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function floatText(x, y, text, color) {
  game.floatTexts.push({ x, y, text, color, life: 0.8, maxLife: 0.8, big: false });
}
function spawnDamageNumber(x, y, text, color) {
  game.floatTexts.push({
    x: x + (Math.random() - 0.5) * 16, y, text, color,
    life: 0.65, maxLife: 0.65, big: true
  });
}
function updateFloatTexts(dt) {
  for (let i = game.floatTexts.length - 1; i >= 0; i--) {
    game.floatTexts[i].life -= dt;
    game.floatTexts[i].y -= dt * (game.floatTexts[i].big ? 36 : 28);
    if (game.floatTexts[i].life <= 0) game.floatTexts.splice(i, 1);
  }
}
function drawFloatTexts(ctx) {
  ctx.textAlign = 'center';
  game.floatTexts.forEach((f) => {
    const t = 1 - f.life / f.maxLife;
    const pop = f.big ? (t < 0.2 ? 1 + Math.sin((t / 0.2) * Math.PI / 2) * 0.4 : 1) : 1;
    ctx.font = f.big ? `bold ${Math.round(17 * pop)}px sans-serif` : 'bold 14px sans-serif';
    ctx.globalAlpha = Math.max(f.life / f.maxLife, 0);
    ctx.fillStyle = f.color;
    if (f.big) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(f.text, f.x, f.y);
    }
    ctx.fillText(f.text, f.x, f.y);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawComboCounter(ctx) {
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

function drawBuffIcons(ctx) {
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

// ===========================================================
// 플레이어 렌더링 - 같은 게임을 만든 다른 에이전트 버전에서 이식
// (추상적인 "조약돌+가면" 몸체 + 분리된 손/칼 표현, 스킬별 포즈 전환)
// ===========================================================
function drawPlayer(ctx, t = 0) {
  if (!player.alive) return;
  const flashBlink = player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0;

  let jumpHeight = 0;
  if (player.leapTimer > 0) {
    const jt = 1 - player.leapTimer / LEAP_DURATION;
    jumpHeight = Math.sin(jt * Math.PI) * 40;
  }

  const speedN = player.moveSpeedN;
  const fx = Math.cos(player.facing);
  const fy = Math.sin(player.facing);
  const sx = -fy;
  const sy = fx;
  const idle = Math.sin(t * 2.0) * 0.35;
  const rigidBob = Math.abs(Math.sin(player.moveStep)) * speedN * 0.7 + idle;
  const pose = getAbstractHeroPose(t, speedN);

  ctx.save();
  ctx.globalAlpha = flashBlink ? 0.35 : 1;
  if (player.flash > 0) ctx.filter = 'brightness(2.15) saturate(0.45)';
  ctx.translate(player.x, player.y);

  const shadowScale = 1 - Math.min(jumpHeight / 60, 0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(0, player.r * 0.90, player.r * (0.95 + speedN * 0.12) * shadowScale,
    player.r * (0.33 - speedN * 0.02) * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.moveReaction > 0 && jumpHeight <= 0) {
    ctx.save();
    ctx.globalAlpha = player.moveReaction * 0.16;
    ctx.strokeStyle = '#efe3ca';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, player.r * 0.83,
      player.r * (1.08 + player.moveReaction * 0.50),
      player.r * (0.35 + player.moveReaction * 0.09), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.translate(0, -jumpHeight + rigidBob * 0.2);
  if (player.leapTimer <= 0) {
    ctx.translate(player.moveOffsetX * 0.72, player.moveOffsetY * 0.72);
    ctx.rotate(player.moveLean * 0.75 + pose.bodyTwist);
  }

  drawAbstractScarf(ctx, fx, fy, sx, sy, player.r, speedN, t);

  const leftBase = { x: -sx * player.r * 0.67, y: -sy * player.r * 0.67 };
  const rightBase = { x: sx * player.r * 0.67, y: sy * player.r * 0.67 };
  const leftDepth = (-sy > 0 ? 1 : 0);
  const rightDepth = (sy > 0 ? 1 : 0);

  // 오른손 = 주무기, 왼손 = 보조무기 또는 방패 (실제 장착한 것을 그대로 반영)
  const mainGear = player.equipment.weaponMain;
  const offGear = player.equipment.weaponOff;
  const rightHeld = mainGear && mainGear !== 'LOCKED' ? { kind: 'weapon', variant: mainGear.variant || 'sword' } : { kind: 'none', variant: null };
  const leftHeld = offGear && offGear !== 'LOCKED'
    ? (offGear.category === 'shield' ? { kind: 'shield', variant: null } : { kind: 'weapon', variant: offGear.variant || 'sword' })
    : { kind: 'none', variant: null };

  if (leftDepth < rightDepth) drawFloatingHandAndBlade(ctx, leftBase, pose.left, player.r, 0.86, leftHeld.kind, leftHeld.variant);
  else drawFloatingHandAndBlade(ctx, rightBase, pose.right, player.r, 0.86, rightHeld.kind, rightHeld.variant);

  drawAbstractHeroBody(ctx, fx, fy, sx, sy, player.r, speedN, t);

  if (leftDepth >= rightDepth) drawFloatingHandAndBlade(ctx, leftBase, pose.left, player.r, 1, leftHeld.kind, leftHeld.variant);
  else drawFloatingHandAndBlade(ctx, rightBase, pose.right, player.r, 1, rightHeld.kind, rightHeld.variant);

  if (player.rushTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#ffd27a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-fx * player.r * 1.35, -fy * player.r * 1.35);
    ctx.lineTo(fx * player.r * 1.75, fy * player.r * 1.75);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function getAbstractHeroPose(t, speedN) {
  // 왼손(보조)에 실제로 무기가 들려있을 때만 "쌍수"로 보고 양손 다 휘두름 - 방패/빈손이면 주무기 쪽만 동작
  const offGear = player.equipment.weaponOff;
  const dualWield = !!(offGear && offGear !== 'LOCKED' && offGear.category === 'weapon');
  const drift = Math.sin(player.moveStep) * speedN * 0.08;
  const pose = {
    bodyTwist: Math.sin(t * 1.4) * 0.008,
    left:  { handAngle: player.facing - 1.02 + drift, handDist: player.r * 0.40, bladeAngle: player.facing - 0.62 + drift, bladeScale: 0.95, trail: null },
    right: { handAngle: player.facing + 1.02 - drift, handDist: player.r * 0.40, bladeAngle: player.facing + 0.62 - drift, bladeScale: 0.95, trail: null }
  };

  if (player.leapTimer > 0) {
    pose.left  = { handAngle: player.facing - 0.24, handDist: player.r * 0.62, bladeAngle: player.facing - 0.10, bladeScale: 1.05, trail: null };
    pose.right = { handAngle: player.facing + 0.24, handDist: player.r * 0.62, bladeAngle: player.facing + 0.10, bladeScale: 1.05, trail: null };
  } else if (player.rushTimer > 0) {
    pose.bodyTwist = 0;
    pose.left  = { handAngle: player.facing - 0.20, handDist: player.r * 0.74, bladeAngle: player.facing - 0.08, bladeScale: 1.08, trail: null };
    pose.right = { handAngle: player.facing + 0.20, handDist: player.r * 0.74, bladeAngle: player.facing + 0.08, bladeScale: 1.08, trail: null };
  } else if (player.smashTimer > 0) {
    const elapsed = SMASH_DURATION - player.smashTimer;
    const p = Math.min(elapsed / SMASH_IMPACT_TIME, 1);
    const open = (1 - p) * 1.20 + 0.22;
    pose.bodyTwist = (1 - p) * -0.08;
    pose.left  = { handAngle: player.facing - open, handDist: player.r * (0.44 + p * 0.28), bladeAngle: player.facing - open * 0.82, bladeScale: 1.02, trail: null };
    pose.right = { handAngle: player.facing + open, handDist: player.r * (0.44 + p * 0.28), bladeAngle: player.facing + open * 0.82, bladeScale: 1.02, trail: null };
  } else if (player.whirlwindTimer > 0) {
    const a = player.whirlAngle;
    pose.bodyTwist = Math.sin(a * 2) * 0.045;
    if (dualWield) {
      pose.left  = { handAngle: a, handDist: player.r * 0.75, bladeAngle: a + 0.15, bladeScale: 1.02, trail: { from: a - 0.55, to: a + 0.14, alpha: 0.18 } };
    } else {
      // 한손무기 + 방패(또는 빈손) - 왼손은 회전시키지 않고 몸 앞에 붙여서 버팀
      pose.left = { handAngle: player.facing - Math.PI * 0.6, handDist: player.r * 0.40, bladeAngle: player.facing - Math.PI * 0.6, bladeScale: 1.0, trail: null };
    }
    pose.right = { handAngle: a + Math.PI, handDist: player.r * 0.75, bladeAngle: a + Math.PI + 0.15, bladeScale: 1.02, trail: { from: a + Math.PI - 0.55, to: a + Math.PI + 0.14, alpha: 0.18 } };
  } else if (player.attackTimer > 0) {
    // player.currentAttackDuration은 콤보로 빨라진 실제 스윙 시간(공격속도 스탯 반영) - 기존 ATTACK_DURATION 대신 사용
    const at = 1 - player.attackTimer / player.currentAttackDuration;
    const wind = easeOutCubic(clamp01(at / 0.18));
    const hit = easeOutCubic(clamp01((at - 0.18) / 0.72));
    const settle = easeOutCubic(clamp01((at - 0.82) / 0.18));

    const l0 = player.facing - 1.55 - wind * 0.16;
    const l1 = player.facing + 0.58;
    const r0 = player.facing + 1.55 + wind * 0.16;
    const r1 = player.facing - 0.58;
    const ra = lerpAngle(r0, r1, hit);
    const ext = player.r * (0.50 + hit * 0.28 - settle * 0.10);

    pose.bodyTwist = -0.09 + hit * 0.18 - settle * 0.09;
    if (dualWield) {
      const la = lerpAngle(l0, l1, hit);
      pose.left = {
        handAngle: la - 0.15,
        handDist: ext,
        bladeAngle: la,
        bladeScale: 1.04,
        trail: { from: la - 0.55, to: la - 0.06, alpha: Math.min(0.30, hit * 0.34) }
      };
    } else {
      // 한손무기 + 방패(또는 빈손) - 왼손은 휘두르지 않고 몸 앞으로 살짝 당겨 막는 자세만
      const braceAngle = player.facing - Math.PI * 0.62;
      pose.left = {
        handAngle: braceAngle,
        handDist: player.r * (0.42 + hit * 0.06),
        bladeAngle: braceAngle,
        bladeScale: 1.0,
        trail: null
      };
    }
    pose.right = {
      handAngle: ra + 0.15,
      handDist: ext,
      bladeAngle: ra,
      bladeScale: 1.04,
      trail: { from: ra + 0.55, to: ra + 0.06, alpha: Math.min(0.30, hit * 0.34) }
    };
  }

  return pose;
}

function drawAbstractScarf(ctx, fx, fy, sx, sy, r, speedN, t) {
  const sway = Math.sin(t * 4.0 + player.moveStep * 0.35) * r * (0.06 + speedN * 0.08);
  const backX = -fx * r * 0.56;
  const backY = -fy * r * 0.56;
  const tailX = -fx * r * (1.25 + speedN * 0.32) + sx * sway;
  const tailY = -fy * r * (1.25 + speedN * 0.32) + sy * sway;
  ctx.save();
  ctx.strokeStyle = '#5a1721';
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(backX, backY);
  ctx.quadraticCurveTo(-fx * r * 0.92 + sx * sway * 0.4, -fy * r * 0.92 + sy * sway * 0.4, tailX, tailY);
  ctx.stroke();
  ctx.fillStyle = '#862534';
  ctx.beginPath();
  ctx.moveTo(tailX + sx * r * 0.10, tailY + sy * r * 0.10);
  ctx.lineTo(tailX - fx * r * 0.28, tailY - fy * r * 0.28);
  ctx.lineTo(tailX - sx * r * 0.10, tailY - sy * r * 0.10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFloatingHandAndBlade(ctx, base, handPose, r, alpha = 1, heldKind = 'weapon', heldVariant = 'sword') {
  const hx = base.x + Math.cos(handPose.handAngle) * handPose.handDist;
  const hy = base.y + Math.sin(handPose.handAngle) * handPose.handDist;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (handPose.trail && heldKind === 'weapon') {
    drawAbstractSlashTrail(ctx, hx, hy, r * 2.25, handPose.trail.from, handPose.trail.to, handPose.trail.alpha * alpha);
  }

  ctx.fillStyle = '#a3abb4';
  ctx.strokeStyle = '#e2ddd1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx, hy, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 실제 장착한 장비(무기 종류 / 방패)에 맞춰 그림 - 빈손이면 아무것도 쥐지 않음
  if (heldKind === 'shield') {
    drawHeldShield(ctx, hx, hy, handPose.bladeAngle, r * handPose.bladeScale, alpha);
  } else if (heldKind === 'weapon') {
    drawAbstractSword(ctx, hx, hy, handPose.bladeAngle, r * handPose.bladeScale, alpha, heldVariant);
  }
  ctx.restore();
}

function drawAbstractHeroBody(ctx, fx, fy, sx, sy, r, speedN, t) {
  ctx.save();

  ctx.beginPath();
  ctx.moveTo(-r * 0.58, -r * 0.72);
  ctx.quadraticCurveTo(0, -r * 1.00, r * 0.58, -r * 0.72);
  ctx.quadraticCurveTo(r * 0.96, -r * 0.22, r * 0.82, r * 0.48);
  ctx.quadraticCurveTo(r * 0.48, r * 0.94, 0, r * 0.96);
  ctx.quadraticCurveTo(-r * 0.48, r * 0.94, -r * 0.82, r * 0.48);
  ctx.quadraticCurveTo(-r * 0.96, -r * 0.22, -r * 0.58, -r * 0.72);
  ctx.closePath();

  const g = ctx.createLinearGradient(-r * 0.75, -r, r * 0.75, r);
  g.addColorStop(0, '#7a8088');
  g.addColorStop(0.50, '#2e3137');
  g.addColorStop(1, '#101216');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#d5d0c4';
  ctx.lineWidth = 2.6;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.16, -r * 0.70);
  ctx.lineTo(0, -r * 0.54);
  ctx.lineTo(r * 0.16, -r * 0.70);
  ctx.stroke();

  const vx = fx * r * 0.19;
  const vy = fy * r * 0.19 - r * 0.10;
  ctx.save();
  ctx.translate(vx, vy);
  ctx.rotate(player.facing);
  ctx.fillStyle = '#12161b';
  ctx.beginPath();
  ctx.roundRect(-r * 0.40, -r * 0.16, r * 0.80, r * 0.32, r * 0.15);
  ctx.fill();

  ctx.fillStyle = '#ffb65c';
  ctx.beginPath();
  ctx.ellipse(-r * 0.16, 0, r * 0.075, r * 0.052, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.16, 0, r * 0.075, r * 0.052, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#8a2331';
  ctx.beginPath();
  ctx.moveTo(fx * r * 0.08 - sx * r * 0.10, fy * r * 0.08 - sy * r * 0.10 + r * 0.25);
  ctx.lineTo(fx * r * 0.08 + sx * r * 0.10, fy * r * 0.08 + sy * r * 0.10 + r * 0.25);
  ctx.lineTo(fx * r * 0.20, fy * r * 0.20 + r * 0.38);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.11;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-r * 0.30, -r * 0.42, r * 0.20, r * 0.11, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAbstractSword(ctx, x, y, angle, r, alpha = 1, variant = 'sword') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  if (variant === 'axe') {
    ctx.strokeStyle = '#8d623e';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.10, 0);
    ctx.lineTo(r * 0.80, 0);
    ctx.stroke();
    ctx.fillStyle = '#c7cdd4';
    ctx.beginPath();
    ctx.moveTo(r * 0.42, -r * 0.04);
    ctx.quadraticCurveTo(r * 1.08, -r * 0.56, r * 0.98, -r * 0.02);
    ctx.quadraticCurveTo(r * 1.02, r * 0.48, r * 0.48, r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  } else if (variant === 'mace') {
    ctx.strokeStyle = '#8d623e';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.10, 0);
    ctx.lineTo(r * 0.92, 0);
    ctx.stroke();
    ctx.fillStyle = '#9aa1a8';
    ctx.beginPath();
    ctx.arc(r * 1.08, 0, r * 0.30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5f656b';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(r * 1.08 + Math.cos(a) * r * 0.30, Math.sin(a) * r * 0.30, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (variant === 'dagger') {
    ctx.strokeStyle = '#373d46';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, 0);
    ctx.lineTo(r * 0.14, 0);
    ctx.stroke();
    ctx.strokeStyle = '#c78b34';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.13, -r * 0.11);
    ctx.lineTo(r * 0.13, r * 0.11);
    ctx.stroke();
    ctx.fillStyle = '#d7dde2';
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.16, -r * 0.07);
    ctx.lineTo(r * 0.62, -r * 0.045);
    ctx.lineTo(r * 0.76, 0);
    ctx.lineTo(r * 0.62, r * 0.045);
    ctx.lineTo(r * 0.16, r * 0.07);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (variant === 'spear') {
    ctx.strokeStyle = '#8d623e';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, 0);
    ctx.lineTo(r * 1.05, 0);
    ctx.stroke();
    ctx.fillStyle = '#d7dde2';
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.98, -r * 0.09);
    ctx.lineTo(r * 1.42, 0);
    ctx.lineTo(r * 0.98, r * 0.09);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // 기본값(검)
    ctx.strokeStyle = '#373d46';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.10, 0);
    ctx.lineTo(r * 0.34, 0);
    ctx.stroke();

    ctx.strokeStyle = '#c78b34';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.31, -r * 0.20);
    ctx.lineTo(r * 0.31, r * 0.20);
    ctx.stroke();

    ctx.fillStyle = '#d7dde2';
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.38, -r * 0.15);
    ctx.lineTo(r * 1.36, -r * 0.11);
    ctx.lineTo(r * 1.66, 0);
    ctx.lineTo(r * 1.36, r * 0.11);
    ctx.lineTo(r * 0.38, r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

// 보조손에 방패가 장착된 경우 전용 드로잉 - 칼날 대신 몸 앞을 막아선 방패 모양
function drawHeldShield(ctx, x, y, angle, r, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * 0.3); // 방패는 칼날만큼 크게 회전하지 않게 완화
  ctx.globalAlpha = alpha;
  const s = r * 1.25;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.46);
  ctx.lineTo(s * 0.34, -s * 0.30);
  ctx.lineTo(s * 0.30, s * 0.10);
  ctx.quadraticCurveTo(s * 0.24, s * 0.38, 0, s * 0.50);
  ctx.quadraticCurveTo(-s * 0.24, s * 0.38, -s * 0.30, s * 0.10);
  ctx.lineTo(-s * 0.34, -s * 0.30);
  ctx.closePath();
  ctx.fillStyle = '#8a6a44';
  ctx.fill();
  ctx.strokeStyle = '#3d2c1a';
  ctx.lineWidth = r * 0.09;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.30);
  ctx.lineTo(0, s * 0.26);
  ctx.stroke();
  ctx.fillStyle = '#d7a14c';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAbstractSlashTrail(ctx, cx, cy, radius, angleFrom, angleTo, alpha) {
  ctx.save();
  ctx.strokeStyle = `rgba(255,230,170,${alpha})`;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.70, angleFrom, angleTo);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.55})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.78, angleFrom, angleTo);
  ctx.stroke();
  ctx.restore();
}

function updatePlayerMotionReaction(dt, accelX, accelY) {
  const force = 28;
  const spring = 105;
  const damping = 17;

  player.moveOffsetVX += (-accelX * force - player.moveOffsetX * spring - player.moveOffsetVX * damping) * dt;
  player.moveOffsetVY += (-accelY * force - player.moveOffsetY * spring - player.moveOffsetVY * damping) * dt;
  player.moveOffsetX += player.moveOffsetVX * dt;
  player.moveOffsetY += player.moveOffsetVY * dt;

  const offsetLen = Math.hypot(player.moveOffsetX, player.moveOffsetY);
  if (offsetLen > 7) {
    player.moveOffsetX = player.moveOffsetX / offsetLen * 7;
    player.moveOffsetY = player.moveOffsetY / offsetLen * 7;
  }

  const fx = Math.cos(player.facing);
  const fy = Math.sin(player.facing);
  const lateralAccel = fx * accelY - fy * accelX;
  const leanTarget = Math.max(-0.16, Math.min(0.16, -lateralAccel * 0.012));

  const leanSpring = 95;
  const leanDamping = 16;
  player.moveLeanV += ((leanTarget - player.moveLean) * leanSpring - player.moveLeanV * leanDamping) * dt;
  player.moveLean += player.moveLeanV * dt;
}

function emitMoveReaction(dirX, dirY, strength = 1) {
  if (player.moveFxCooldown > 0) return;
  const px = player.x - dirX * player.r * 0.35;
  const py = player.y - dirY * player.r * 0.20 + player.r * 0.55;
  spawnHitParticles(px, py, MOVE_DUST_COLOR, strength > 0.8 ? 5 : 3);
  player.moveReaction = Math.max(player.moveReaction, strength);
  player.moveFxCooldown = strength > 0.8 ? 0.11 : 0.16;
  game.shake = Math.min(game.shake + 0.55 * strength, 12);
}

// ===========================================================
// 러시 / 그라운드 스매시 스킬 - 같은 게임을 만든 다른 에이전트 버전에서 이식
// ===========================================================
function skillDamageCow(c, bonusDamage, knockForce, color) {
  if (!c || c.state === 'dead') return;
  c.flash = 0.13;
  applyKnockback(c.body, player.x, player.y, knockForce);
  c.knockback = Math.max(c.knockback || 0, 0.22);
  const dmg = Math.max(1, bonusDamage + player.attackBonus + player.gearAtkPower);
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, color || '#fff');
  spawnHitParticles(c.x, c.y, color || PALETTE.hide, 8);
  c.hp -= dmg;
  registerComboHit();
  if (c.hp <= 0 && c.state !== 'dead') killCow(c);
}

function tryRush() {
  if (!player.alive || player.rushCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.smashTimer > 0) return;
  if (player.mana < RUSH_MANA_COST) return;

  player.mana -= RUSH_MANA_COST;
  player.rushCooldown = RUSH_COOLDOWN;
  player.rushTimer = RUSH_DURATION;
  player.rushFrom.x = player.x;
  player.rushFrom.y = player.y;
  player.rushHitSet = new Set();

  const margin = player.r + 10;
  const dx = Math.cos(player.facing), dy = Math.sin(player.facing);
  const end = clampToPen(player.x + dx * RUSH_DISTANCE, player.y + dy * RUSH_DISTANCE, margin);
  player.rushTo.x = end.x;
  player.rushTo.y = end.y;

  Body.setVelocity(player.body, { x: 0, y: 0 });
  emitMoveReaction(-dx, -dy, 1);
  spawnShockwave(player.x, player.y, 34, '#ff8a4d');
  game.impactFlash = Math.max(game.impactFlash, 0.08);
}

function updateRush(dt) {
  player.rushTimer -= dt;
  const raw = 1 - Math.max(player.rushTimer, 0) / RUSH_DURATION;
  const t = 1 - Math.pow(1 - raw, 2.4);
  const nx = player.rushFrom.x + (player.rushTo.x - player.rushFrom.x) * t;
  const ny = player.rushFrom.y + (player.rushTo.y - player.rushFrom.y) * t;

  Body.setPosition(player.body, { x: nx, y: ny });
  Body.setVelocity(player.body, { x: 0, y: 0 });
  player.x = nx; player.y = ny;

  const fx = Math.cos(player.facing), fy = Math.sin(player.facing);
  if (Math.random() < 0.42) spawnHitParticles(nx - fx * 10, ny - fy * 10 + 8, '#d7b18c', 1);

  game.cows.forEach((c) => {
    if (c.state === 'dead' || player.rushHitSet.has(c)) return;
    if (Math.hypot(c.x - nx, c.y - ny) <= RUSH_HIT_RADIUS + getCowHitRadius(c)) {
      player.rushHitSet.add(c);
      skillDamageCow(c, BASE_DAMAGE + RUSH_DAMAGE_BONUS, 8.5, '#ff9b63');
    }
  });

  if (player.rushTimer <= 0) {
    player.rushTimer = 0;
    spawnShockwave(player.x, player.y, 46, '#ff8a4d');
    spawnHitParticles(player.x, player.y, '#e7c8a4', 7);
    game.shake = Math.min(game.shake + 4, 12);
    game.impactFlash = Math.max(game.impactFlash, 0.07);
  }
}

function tryGroundSmash() {
  if (!player.alive || player.smashCooldown > 0 || player.whirlwindTimer > 0 || player.leapTimer > 0 || player.rushTimer > 0) return;
  if (player.mana < SMASH_MANA_COST) return;

  player.mana -= SMASH_MANA_COST;
  player.smashCooldown = SMASH_COOLDOWN;
  player.smashTimer = SMASH_DURATION;
  player.smashHitDone = false;
  Body.setVelocity(player.body, { x: 0, y: 0 });
}

function updateGroundSmash(dt) {
  const prev = player.smashTimer;
  player.smashTimer -= dt;
  Body.setVelocity(player.body, { x: 0, y: 0 });

  const elapsedPrev = SMASH_DURATION - prev;
  const elapsedNow = SMASH_DURATION - Math.max(player.smashTimer, 0);
  if (!player.smashHitDone && elapsedPrev < SMASH_IMPACT_TIME && elapsedNow >= SMASH_IMPACT_TIME) {
    player.smashHitDone = true;
    spawnShockwave(player.x, player.y, SMASH_RADIUS + 28, '#ffc857');
    spawnHitParticles(player.x, player.y + 8, '#e5d0a1', 18);
    game.shake = Math.min(game.shake + 10, 12);
    game.hitstop = Math.max(game.hitstop, 4);
    game.impactFlash = Math.max(game.impactFlash, 0.18);

    game.cows.forEach((c) => {
      if (c.state === 'dead') return;
      if (Math.hypot(c.x - player.x, c.y - player.y) <= SMASH_RADIUS + getCowHitRadius(c)) {
        skillDamageCow(c, BASE_DAMAGE + SMASH_DAMAGE_BONUS, 11, '#ffd36a');
        c.stunTimer = Math.max(c.stunTimer || 0, 0.35);
      }
    });
  }

  if (player.smashTimer <= 0) player.smashTimer = 0;
}

// ===========================================================
// 디아블로식 2슬롯 스킬 시스템 - 슬롯에 스킬을 배정하고 누르고 있으면 시전
// (각 스킬의 try* 함수가 자체 쿨다운/마나 체크를 하므로 매 프레임 호출해도 안전함)
// ===========================================================
const SKILLS = {
  attack:    { ...SKILL_META.attack,    try: () => tryPlayerAttack(), cd: () => player.attackCooldown,    cdMax: () => ATTACK_COOLDOWN },
  warcry:    { ...SKILL_META.warcry,    try: () => tryWarCry(),       cd: () => player.warcryCooldown,    cdMax: () => WARCRY_COOLDOWN },
  whirlwind: { ...SKILL_META.whirlwind, try: () => tryWhirlwind(),    cd: () => player.whirlwindCooldown, cdMax: () => WHIRLWIND_COOLDOWN + WHIRLWIND_DURATION },
  leap:      { ...SKILL_META.leap,      try: () => tryLeap(),         cd: () => player.leapCooldown,      cdMax: () => LEAP_COOLDOWN },
  rush:      { ...SKILL_META.rush,      try: () => tryRush(),         cd: () => player.rushCooldown,      cdMax: () => RUSH_COOLDOWN },
  smash:     { ...SKILL_META.smash,     try: () => tryGroundSmash(),  cd: () => player.smashCooldown,     cdMax: () => SMASH_COOLDOWN }
};


function isSkillUnlocked(id) {
  return player.level >= (SKILL_UNLOCK_LEVEL[id] || 1);
}

function cycleSkillSlot(slotNum) {
  const key = slotNum === 1 ? 'slot1' : 'slot2';
  const otherKey = slotNum === 1 ? 'slot2' : 'slot1';
  const cur = SKILL_ORDER.indexOf(player[key]);
  for (let i = 1; i <= SKILL_ORDER.length; i++) {
    const next = SKILL_ORDER[(cur + i) % SKILL_ORDER.length];
    if (next !== player[otherKey] && isSkillUnlocked(next)) { player[key] = next; break; }
  }
  const slotEl = document.getElementById(key === 'slot1' ? 'slot1' : 'slot2');
  const labelEl = document.getElementById(`${key}-label`);
  if (labelEl) labelEl.textContent = SKILLS[player[key]].label;
  if (slotEl) slotEl.style.background = SKILLS[player[key]].color;
}

function updateSkillSlots() {
  if (game.gameState !== 'playing' || game.paused || ui.showInventory) return;
  if (input.holdSlot1) SKILLS[player.slot1].try();
  if (input.holdSlot2) SKILLS[player.slot2].try();
}

// ===========================================================
// 카우 AI + 물리 바디
// ===========================================================
class Cow {
  constructor(scale, kind = 'normal') {
    this.kind = kind;

    // 종류별 수치는 data/monsters.js (모르는 종류는 normal 수치)
    const def = MONSTERS[kind] || MONSTERS.normal;
    const { hp, speedMul, aggroMul, scaleMul } = def;

    this.scale = scale * scaleMul;
    const p = randomPointInPen();
    const r = 22 * this.scale + 6;
    this.r = r;
    this.body = Bodies.circle(p.x, p.y, r, { frictionAir: 0.25, friction: 0, restitution: 0.1, label: 'cow' });
    Body.setInertia(this.body, Infinity);
    World.add(world, this.body);

    this.x = p.x; this.y = p.y;
    this.target = randomPointInPen();
    this.state = 'idle';
    this.timer = 0.5 + Math.random() * 1.5;
    this.stateElapsed = 0;
    this.facing = 1;
    this.phase = Math.random() * 10;
    this.speed = (34 + Math.random() * 18) * speedMul;
    this.hp = hp;
    this.maxHp = hp;
    this.deadTimer = 0;
    this.deadPos = null;
    this.attackHit = false;
    this.attackingPlayer = false;
    this.flash = 0;
    this.knockback = 0;
    this.stunTimer = 0;
    this.aggroRange = 150 * aggroMul;
    this.meleeRange = 46 * this.scale + 16;
    this.specialTimer = kind === 'boss' ? BOSS_SLAM_COOLDOWN : Infinity;
    this.chargeCooldownTimer = kind === 'charger' ? 1 + Math.random() * 2 : Infinity;
    this.chargeDir = { x: 1, y: 0 };
    this.chargeTarget = { x: 0, y: 0 };
    this.chargeStart = { x: 0, y: 0 };
    this.chargeHitDone = false;
    this.fireDropTimer = kind === 'burning' ? 0.5 + Math.random() * 0.4 : Infinity;
    this.fuseTimer = Infinity; // exploder 전용 - 점화되면 카운트다운 시작
    this.healCooldown = kind === 'shaman' ? 1 + Math.random() * 1.5 : Infinity;
    this.zapCooldown = kind === 'shocker' ? 0.8 + Math.random() * 1.2 : Infinity;
    this.zapTargetX = 0;
    this.zapTargetY = 0;
    this.dmg = def.dmg;
    this.whirlHitCd = 0;
  }

  setState(state, duration) {
    this.state = state;
    this.timer = duration;
    this.stateElapsed = 0;
  }

  update(dt) {
    if (this.flash > 0) this.flash -= dt;

    if (this.state === 'dead') {
      this.deadTimer -= dt;
      return;
    }

    this.x = this.body.position.x;
    this.y = this.body.position.y;

    if (this.kind === 'boss') {
      this.specialTimer -= dt;
      if (this.specialTimer <= 0) {
        this.specialTimer = BOSS_SLAM_COOLDOWN;
        bossSlam(this);
      }
    }

    // 버닝소울 - 돌아다니는 동안 주기적으로 발밑에 불바닥을 남김
    if (this.kind === 'burning' && this.state !== 'stunned') {
      this.fireDropTimer -= dt;
      if (this.fireDropTimer <= 0) {
        this.fireDropTimer = 0.55;
        spawnFireHazard(this.x, this.y);
      }
    }

    // 주술사 - 근처에서 가장 많이 다친 아군에게 주기적으로 소량 치유를 걸어줌 (우선 처치 대상으로 만드는 용도)
    if (this.kind === 'shaman') {
      this.healCooldown -= dt;
      if (this.healCooldown <= 0) {
        let target = null, worstRatio = 1;
        game.cows.forEach((c) => {
          if (c === this || c.state === 'dead') return;
          if (Math.hypot(c.x - this.x, c.y - this.y) > 170) return;
          const ratio = c.hp / c.maxHp;
          if (c.hp < c.maxHp && ratio < worstRatio) { worstRatio = ratio; target = c; }
        });
        if (target) {
          target.hp = Math.min(target.maxHp, target.hp + 3);
          spawnShockwave(target.x, target.y, 36, '#9f6bff');
          spawnHitParticles(target.x, target.y, '#c9a8ff', 5);
          this.healCooldown = 3.2;
        } else {
          this.healCooldown = 1.2; // 치유할 대상이 없으면 금방 다시 체크
        }
      }
    }

    // 번개카우 - 사정거리 안에 들어오면 잠깐 충전한 뒤 번개를 쏨 (충전 중 플레이어가 피하면 빗나감)
    if (this.kind === 'shocker') {
      if (this.zapCooldown > 0) this.zapCooldown -= dt;
      if (this.state === 'zapping') {
        this.stateElapsed += dt;
        Body.setVelocity(this.body, { x: 0, y: 0 });
        if (Math.abs(this.zapTargetX - this.x) > 1) this.facing = this.zapTargetX > this.x ? 1 : -1;
        if (this.stateElapsed >= ZAP_TELEGRAPH) {
          // 충전 시작 시점에 고정된 방향으로 긴 직선 빔을 쏨 - 유도가 아니라 그 방향으로 쭉 지나감
          const aimAngle = Math.atan2(this.zapTargetY - this.y, this.zapTargetX - this.x);
          const boltEndX = this.x + Math.cos(aimAngle) * ZAP_BEAM_LENGTH;
          const boltEndY = this.y + Math.sin(aimAngle) * ZAP_BEAM_LENGTH;
          spawnLightningBolt(this.x, this.y, boltEndX, boltEndY);
          spawnHitParticles(this.x, this.y, '#fff066', 5);
          if (player.alive && distToSegment(player.x, player.y, this.x, this.y, boltEndX, boltEndY) <= ZAP_BEAM_WIDTH) {
            hitPlayer(this.x, this.y, 6);
          }
          this.zapCooldown = ZAP_COOLDOWN;
          this.setState('idle', 0.4);
        }
        return;
      }
      if (this.zapCooldown <= 0 && player.alive && Math.hypot(player.x - this.x, player.y - this.y) <= ZAP_RANGE) {
        this.zapTargetX = player.x;
        this.zapTargetY = player.y;
        this.setState('zapping', 0);
        Body.setVelocity(this.body, { x: 0, y: 0 });
        return;
      }
    }

    // 자폭잼민이 - 플레이어에게 바짝 붙으면 점화되어 잠시 후 폭발
    if (this.kind === 'exploder') {
      if (this.state === 'fusing') {
        this.stateElapsed += dt;
        Body.setVelocity(this.body, { x: 0, y: 0 });
        if (this.stateElapsed >= EXPLODER_FUSE_TIME) {
          killCow(this);
        }
        return; // 터지기 전까지는 매 프레임 여기서 끝 - 아래 일반 AI가 상태를 덮어쓰지 않게 함
      } else if (player.alive && Math.hypot(player.x - this.x, player.y - this.y) <= EXPLODER_FUSE_RANGE) {
        this.setState('fusing', 0);
        Body.setVelocity(this.body, { x: 0, y: 0 });
        return;
      }
    }

    if (this.kind === 'charger') {
      if (this.chargeCooldownTimer > 0) this.chargeCooldownTimer -= dt;

      if (this.state === 'telegraph') {
        this.stateElapsed += dt;
        Body.setVelocity(this.body, { x: 0, y: 0 });
        if (this.stateElapsed >= CHARGE_TELEGRAPH) {
          this.state = 'charging';
          this.stateElapsed = 0;
          this.chargeStart = { x: this.x, y: this.y };
          this.chargeHitDone = false;
        }
        return; // 예고 중엔 제자리에 멈춰서 경고만 함
      }

      if (this.state === 'charging') {
        this.stateElapsed += dt;
        const t = Math.min(this.stateElapsed / CHARGE_DURATION, 1);
        const nx = this.chargeStart.x + (this.chargeTarget.x - this.chargeStart.x) * t;
        const ny = this.chargeStart.y + (this.chargeTarget.y - this.chargeStart.y) * t;
        Body.setPosition(this.body, { x: nx, y: ny });
        Body.setVelocity(this.body, { x: 0, y: 0 });
        this.x = nx; this.y = ny;

        if (!this.chargeHitDone && player.alive && Math.hypot(player.x - nx, player.y - ny) < CHARGE_WIDTH) {
          hitPlayer(nx, ny, 6);
          this.chargeHitDone = true;
        }

        if (t >= 1) {
          this.state = 'recover';
          this.stateElapsed = 0;
          this.chargeCooldownTimer = CHARGE_COOLDOWN;
        }
        return;
      }

      if (this.state === 'recover') {
        this.stateElapsed += dt;
        Body.setVelocity(this.body, { x: 0, y: 0 });
        if (this.stateElapsed >= CHARGE_RECOVER) this.setState('idle', 0.3);
        return;
      }

      if (this.chargeCooldownTimer <= 0 && player.alive) {
        const dToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        if (dToPlayer <= CHARGE_RANGE && dToPlayer > 40) {
          const ang = Math.atan2(player.y - this.y, player.x - this.x);
          this.chargeDir = { x: Math.cos(ang), y: Math.sin(ang) };
          this.chargeTarget = clampToPen(this.x + this.chargeDir.x * CHARGE_DISTANCE, this.y + this.chargeDir.y * CHARGE_DISTANCE, this.r + 6);
          this.facing = this.chargeDir.x >= 0 ? 1 : -1;
          this.setState('telegraph', 0);
          Body.setVelocity(this.body, { x: 0, y: 0 });
          return;
        }
      }
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.state = 'stunned';
      this.stateElapsed += dt;
      if (this.knockback > 0) this.knockback -= dt;
      else Body.setVelocity(this.body, { x: 0, y: 0 });
      return; // 기절 중엔 배회/추격/공격 불가
    }

    if (this.knockback > 0) {
      this.knockback -= dt;
      this.stateElapsed += dt;
      return; // 넉백 중엔 AI가 속도를 덮어쓰지 않음
    }

    this.stateElapsed += dt;
    const auraMult = getAuraSpeedMult(this);

    const dxP = player.x - this.x, dyP = player.y - this.y;
    const distP = Math.hypot(dxP, dyP);
    const playerNear = player.alive && distP < this.aggroRange;

    // 번개카우는 사정거리 밖이면 들어올 때까지 접근함 (너무 멀면 영영 못 쏘니까)
    if (this.kind === 'shocker' && player.alive && distP > ZAP_RANGE && distP < this.aggroRange) {
      this.state = 'walk';
      Body.setVelocity(this.body, { x: (dxP / distP) * this.speed * auraMult / 60, y: (dyP / distP) * this.speed * auraMult / 60 });
      if (Math.abs(dxP) > 1) this.facing = dxP > 0 ? 1 : -1;
      return;
    }

    // 주술사/번개카우는 근접하지 않고 플레이어가 가까이 오면 뒷걸음질쳐서 거리를 유지 (후방 지원/원거리형)
    const isRangedKiter = this.kind === 'shaman' || this.kind === 'shocker';
    const kiteDistance = this.kind === 'shocker' ? 170 : 130;
    if (isRangedKiter && player.alive && distP < kiteDistance && distP > 0.001) {
      this.state = 'walk';
      Body.setVelocity(this.body, { x: (-dxP / distP) * this.speed * auraMult / 60, y: (-dyP / distP) * this.speed * auraMult / 60 });
      this.facing = dxP > 0 ? -1 : 1; // 물러나면서도 플레이어 쪽을 바라봄
      return;
    }

    if (playerNear && distP > this.meleeRange && !isRangedKiter) {
      this.state = 'walk';
      Body.setVelocity(this.body, { x: (dxP / distP) * this.speed * auraMult / 60, y: (dyP / distP) * this.speed * auraMult / 60 });
      if (Math.abs(dxP) > 1) this.facing = dxP > 0 ? 1 : -1;
      return;
    }

    if (playerNear && distP <= this.meleeRange && !isRangedKiter) {
      Body.setVelocity(this.body, { x: 0, y: 0 });
      if (this.state !== 'attack') { this.setState('attack', 0.6); this.attackHit = false; this.attackingPlayer = true; }
      if (Math.abs(dxP) > 1) this.facing = dxP > 0 ? 1 : -1;
      if (!this.attackHit && this.stateElapsed > 0.12 && this.stateElapsed < 0.22) {
        if (distP <= this.meleeRange + 10) { hitPlayer(this.x, this.y, this.dmg); this.attackHit = true; }
      }
      this.timer -= dt;
      if (this.timer <= 0) this.setState('idle', auraMult > 1 ? 0.08 : 0.18);
      return;
    }

    if (this.state === 'idle') {
      Body.setVelocity(this.body, { x: 0, y: 0 });
      this.timer -= dt;
      if (this.timer <= 0) {
        if (Math.random() < 0.3) {
          this.setState('attack', 0.6);
          this.attackingPlayer = false;
        } else {
          this.target = randomPointInPen();
          this.setState('walk', 999);
        }
      }
    } else if (this.state === 'walk') {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        Body.setVelocity(this.body, { x: 0, y: 0 });
        this.setState('idle', 0.6 + Math.random() * 1.6);
      } else {
        Body.setVelocity(this.body, { x: (dx / dist) * this.speed * auraMult / 60, y: (dy / dist) * this.speed * auraMult / 60 });
        if (Math.abs(dx) > 1) this.facing = dx > 0 ? 1 : -1;
      }
    } else if (this.state === 'attack') {
      Body.setVelocity(this.body, { x: 0, y: 0 });
      this.timer -= dt;
      if (this.timer <= 0) this.setState('idle', 0.6 + Math.random() * 1.4);
    }
  }
}

// 몬스터 그리기 (예전 Cow.draw - this → c)
function drawMonster(c, ctx, t) {
  if (c.state === 'dead') {
    const prog = 1 - Math.max(c.deadTimer, 0) / 0.3; // 0→1
    const pop = prog < 0.25 ? 1 + Math.sin((prog / 0.25) * Math.PI / 2) * 0.22
                            : Math.max(0, 1.22 * (1 - (prog - 0.25) / 0.75));
    const fade = prog < 0.25 ? 1 : Math.max(0, 1 - (prog - 0.25) / 0.75);
    const p = c.deadPos;
    ctx.save();
    ctx.globalAlpha = fade;
    drawCow(ctx, p.x, p.y, c.scale * pop, 'idle', t + c.phase, c.facing, 0);
    ctx.restore();
    return;
  }

  const style = MONSTERS[c.kind];

  if (c.kind === 'fanatic') {
    ctx.save();
    ctx.globalAlpha = 0.12 + Math.sin(t * 3) * 0.05;
    ctx.fillStyle = style.ring;
    ctx.beginPath();
    ctx.arc(c.x, c.y, AURA_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (c.kind === 'shaman') {
    ctx.save();
    ctx.globalAlpha = 0.10 + Math.sin(t * 2.2) * 0.04;
    ctx.fillStyle = style.ring;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (c.state === 'telegraph') {
    const dx = c.chargeTarget.x - c.x, dy = c.chargeTarget.y - c.y;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const pulse = 0.3 + Math.sin(t * 22) * 0.15;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(ang);
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.fillRect(0, -CHARGE_WIDTH / 2, dist, CHARGE_WIDTH);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -CHARGE_WIDTH / 2, dist, CHARGE_WIDTH);
    ctx.restore();
  }

  if (c.state === 'fusing') {
    const pulse = Math.sin((c.stateElapsed / EXPLODER_FUSE_TIME) * Math.PI * 7) * 0.5 + 0.5;
    ctx.save();
    ctx.globalAlpha = 0.25 + pulse * 0.45;
    ctx.fillStyle = '#ff2d2d';
    ctx.beginPath();
    ctx.arc(c.x, c.y, EXPLODER_BLAST_RADIUS * (0.3 + c.stateElapsed / EXPLODER_FUSE_TIME * 0.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (c.state === 'zapping' && Math.random() < 0.6) {
    // 번개카우 충전 중 - 뿔 끝에서 지지직거리는 스파크
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.random() * 0.4;
    ctx.strokeStyle = '#fff9b0';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      const ang = Math.random() * Math.PI * 2;
      const len = 10 + Math.random() * 14;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 22 * c.scale);
      ctx.lineTo(c.x + Math.cos(ang) * len, c.y - 22 * c.scale + Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (style.ring) {
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(t * 4) * 0.25;
    ctx.strokeStyle = style.ring;
    ctx.lineWidth = c.kind === 'boss' ? 3 : 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, (c.kind === 'boss' ? 34 : 20) * c.scale + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const visualState = c.state === 'charging' ? 'attack'
                     : (c.state === 'telegraph' || c.state === 'recover' || c.state === 'fusing' || c.state === 'zapping') ? 'idle'
                     : c.state;
  const visualElapsed = c.state === 'charging' ? 0.16 : c.stateElapsed;

  ctx.save();
  const colors = c.flash > 0 ? FLASH_COLORS : style.colors;
  drawCow(ctx, c.x, c.y, c.scale, visualState, t + c.phase, c.facing, visualElapsed, colors);
  ctx.restore();

  if (c.state === 'attack' && c.attackingPlayer && c.stateElapsed < 0.16) {
    const warnScale = 1 + Math.sin((c.stateElapsed / 0.16) * Math.PI) * 0.5;
    ctx.save();
    ctx.translate(c.x, c.y - 78 * c.scale);
    ctx.font = `bold ${Math.round(20 * warnScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText('!', 0, 0);
    ctx.fillStyle = '#ff3b30';
    ctx.fillText('!', 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  if (c.kind === 'boss') {
    const wp = getHitPoint(c);
    const gemR = 9 + Math.sin(t * 5) * 2;

    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(t * 5) * 0.08;
    ctx.fillStyle = '#4dfff0';
    ctx.beginPath();
    ctx.arc(wp.x, wp.y, gemR * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(wp.x, wp.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#4dfff0';
    ctx.fillRect(-gemR, -gemR, gemR * 2, gemR * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-gemR, -gemR, gemR * 2, gemR * 2);
    ctx.restore();

    const w = 74;
    const barY = c.y - 34 * c.scale - 96;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(c.x - w / 2, barY, w, 8);
    ctx.fillStyle = style.ring;
    ctx.fillRect(c.x - w / 2, barY, w * (c.hp / c.maxHp), 8);
  } else if (c.maxHp > 1) {
    const w = 26 * c.scale;
    const barY = c.y - 96 * c.scale - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(c.x - w / 2, barY, w, 4);
    ctx.fillStyle = style.ring || '#e05b4d';
    ctx.fillRect(c.x - w / 2, barY, w * (c.hp / c.maxHp), 4);
  }
}

// ===========================================================
// HUD
// ===========================================================
function drawStatReadout(ctx, y) {
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

function drawHUD() {
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

function drawResourceOrb(ctx, cx, cy, r, frac, colorTop, colorBottom) {
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

function drawStaminaBar(ctx, x, y, w, h, frac) {
  frac = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = frac > 0.001 ? '#d8c24a' : '#5a4f22';
  ctx.fillRect(x, y, w * frac, h);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function overlay(title, sub) {
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

// ===========================================================
// 게임 상태 초기화
// ===========================================================

function pickCowKind() {
  if (game.wave < ELITE_MIN_WAVE) return 'normal';
  const eliteChance = Math.min(ELITE_CHANCE_BASE + game.wave * ELITE_CHANCE_PER_WAVE, ELITE_CHANCE_MAX);
  if (Math.random() < eliteChance) {
    return ELITE_KINDS[Math.floor(Math.random() * ELITE_KINDS.length)];
  }
  return 'normal';
}

function startNextWave() {
  game.wave++;
  game.waveBannerTimer = 1.6;
  if (game.wave === BOSS_WAVE) {
    game.cows.push(new Cow(1.0, 'boss'));
    for (let i = 0; i < 4; i++) game.cows.push(new Cow((1.05 + Math.random() * 0.5) * 0.3, 'normal'));
    return;
  }
  const size = 6 + game.wave * 4; // 웨이브가 지날수록 순차적으로 마리 수 증가 (난이도 상향)
  for (let i = 0; i < size; i++) {
    game.cows.push(new Cow((1.05 + Math.random() * 0.5) * 0.3, pickCowKind()));
  }
}

function resetGame() {
  game.paused = false;
  game.runRecorded = false;
  const pb = document.getElementById('btn-pause');
  if (pb) pb.textContent = 'Ⅱ';

  game.cows.forEach((c) => { if (c.body) World.remove(world, c.body); });
  game.cows = [];
  game.wave = 0;
  // 시작 직후 적이 튀어나오지 않도록 준비 시간을 둠 - 이후 웨이브 사이엔 기존 WAVE_GAP 사용
  game.waveTransition = FIRST_WAVE_DELAY;
  game.waveBannerTimer = 0;
  game.demoTipTimer = 5.0;

  Body.setPosition(player.body, { x: PEN.x + PEN.size / 2, y: PEN.y + PEN.size / 2 });
  Body.setVelocity(player.body, { x: 0, y: 0 });
  player.hp = player.maxHp;
  player.mana = player.maxMana;
  player.stamina = player.maxStamina;
  player.running = false;
  player.invuln = 0;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  player.currentAttackDuration = ATTACK_DURATION;
  player.combo = 0;
  player.comboTimer = 0;
  player.knockback = 0;
  player.flash = 0;
  player.alive = true;
  player.warcryCooldown = 0;
  player.whirlwindTimer = 0;
  player.whirlwindCooldown = 0;
  player.whirlAngle = 0;
  player.leapTimer = 0;
  player.leapCooldown = 0;
  player.rushTimer = 0;
  player.rushCooldown = 0;
  player.rushHitSet = null;
  player.smashTimer = 0;
  player.smashCooldown = 0;
  player.smashHitDone = false;
  player.moveOffsetX = 0;
  player.moveOffsetY = 0;
  player.moveOffsetVX = 0;
  player.moveOffsetVY = 0;
  player.moveLean = 0;
  player.moveLeanV = 0;
  player.moveFxCooldown = 0;
  player.moveReaction = 0;
  player.moveSpeedN = 0;
  player.moveInputActive = false;
  player.moveStep = 0;
  player.slowTimer = 0;
  player.bonusMaxHp = 0;
  player.vitalityTimer = 0;
  player.speedMult = 1;
  player.speedBuffTimer = 0;
  player.attackBonus = 0;
  player.attackBuffTimer = 0;
  player.defenseChance = 0;
  player.defenseBuffTimer = 0;
  player.equipment = { armor: null, weaponMain: null, weaponOff: null, greaves: null, boots: null, accessory1: null, accessory2: null };
  player.gearAtkSpeed = 0;
  player.gearAtkPower = 0;
  player.gearDefense = 0;
  player.gearEvasion = 0;
  player.gearSpeedMult = 1;
  player.gearMaxHp = 0;
  player.gearMaxMana = 0;
  player.materials = 0;
  player.inventory = [];
  player.potions = { heal: 2, mana: 2 };
  player.potionCd = { heal: 0, mana: 0 };
  giveStarterGear(); // gear 보너스 초기화 이후에 호출해야 장착 효과가 덮어써지지 않음
  giveTestStash(); // 장비 교체 테스트용 - 무기 종류별 1개 + 방패 + 양손무기를 가방에 바로 지급
  player.hp = player.maxHp + player.gearMaxHp;
  player.mana = player.maxMana + player.gearMaxMana;
  ui.identifyingItem = null;
  ui.identifyTimer = 0;
  ui.selectedInvIndex = null;
  ui.hoverInvIndex = null;
  ui.invPanelTab = 'equip';
  ui.invToast = null;
  ui.invReveal = null;
  player.level = 1;
  player.exp = 0;
  player.expToNext = expForLevel(1);
  player.statPoints = 0;
  player.levelStats = { atkPower: 0, defense: 0, evasion: 0, atkSpeed: 0, moveSpeed: 0, health: 0, mana: 0 };
  player.maxMana = MAX_MANA;

  game.particles = [];
  game.shockwaves = [];
  game.hazards = [];
  game.lightningBolts = [];
  game.items = [];
  game.floatTexts = [];
  game.shake = 0;
  game.hitstop = 0;
  game.impactFlash = 0;
  game.kills = 0;
  player.slot1 = 'attack';
  player.slot2 = 'warcry';
  input.holdSlot1 = false;
  input.holdSlot2 = false;
  const s1label = document.getElementById('slot1-label');
  const s2label = document.getElementById('slot2-label');
  const s1el = document.getElementById('slot1');
  const s2el = document.getElementById('slot2');
  if (s1label) s1label.textContent = SKILLS[player.slot1].label;
  if (s2label) s2label.textContent = SKILLS[player.slot2].label;
  if (s1el) s1el.style.background = SKILLS[player.slot1].color;
  if (s2el) s2el.style.background = SKILLS[player.slot2].color;
  game.gameState = 'playing';
}


function fixedUpdate(dt) {
  if (game.gameState === 'title') {
    updateTitleScene(dt);
    updateParticles(dt);
    if (game.impactFlash > 0) game.impactFlash = Math.max(0, game.impactFlash - dt * 2.8);
    return;
  }
  if (ui.showInventory) {
    // 장비창을 보는 동안은 전투/이동을 전부 멈춤 - 감정 진행만은 메뉴 안의 행동이라 계속 흐름
    updateIdentify(dt);
    updateParticles(dt);
    if (game.impactFlash > 0) game.impactFlash = Math.max(0, game.impactFlash - dt * 2.8);
    return;
  }
  if (game.paused) return;
  if (game.hitstop > 0) { game.hitstop--; return; }
  if (game.gameState === 'playing') {
    updatePlayer(dt);
    updateSkillSlots();
    game.cows.forEach((c) => c.update(dt));
    for (let i = game.cows.length - 1; i >= 0; i--) {
      if (game.cows[i].state === 'dead' && game.cows[i].deadTimer <= 0) game.cows.splice(i, 1);
    }
    if (game.cows.length === 0) {
      game.waveTransition -= dt;
      if (game.waveTransition <= 0) {
        startNextWave();
        game.waveTransition = WAVE_GAP;
      }
    }
    updateItems(dt);
    Engine.update(engine, STEP_MS);
  }
  updateParticles(dt);
  updateShockwaves(dt);
  updateHazards(dt);
  updateLightningBolts(dt);
  updateFloatTexts(dt);
  if (game.waveBannerTimer > 0) game.waveBannerTimer = Math.max(0, game.waveBannerTimer - dt);
  if (game.demoTipTimer > 0) game.demoTipTimer = Math.max(0, game.demoTipTimer - dt);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 40);
  if (game.impactFlash > 0) game.impactFlash = Math.max(0, game.impactFlash - dt * 2.8);
}

// hooks: 아직 main.js에 있는 DOM 버튼 동기화/캔버스 메뉴 (Step 6에서 ui/dom, ui/menu로 옮기면 직접 import)
function render(t, hooks) {
  ctx.fillStyle = '#0c1f10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const titleMode = game.gameState === 'title';
  document.body.classList.toggle('title-mode', titleMode);
  if (titleMode) {
    ctx.save();
    drawPen();
    drawTitleScene(t);
    drawParticles(ctx);
    ctx.restore();
    drawTitleOverlay(t);
    return;
  }

  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake * 2, (Math.random() - 0.5) * game.shake * 2);
  }
  drawPen();
  drawHazards(ctx);
  const drawables = game.cows.map((c) => ({ y: c.y, fn: () => drawMonster(c, ctx, t) }));
  drawables.push({ y: player.y, fn: () => drawPlayer(ctx, t) });
  drawables.sort((a, b) => a.y - b.y).forEach((d) => d.fn());
  drawItems(ctx, t);
  drawParticles(ctx);
  drawShockwaves(ctx);
  drawLightningBolts(ctx);
  drawFloatTexts(ctx);
  drawComboCounter(ctx);
  drawStartCountdown();
  drawWavePresentation(t);
  drawDemoTip();
  ctx.restore();

  drawHUD();
  hooks.syncDomButtons();
  if (ui.showInventory) hooks.drawMenu(ctx);
  if (game.paused) drawPauseOverlay();

  if (game.impactFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.20, game.impactFlash);
    ctx.fillStyle = '#fff0bf';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

// ===========================================================
// 캐릭터 메뉴 (장비 / 스탯 / 가방 / 강화) - 아이콘 없이 글자 위주로 정리
// 클릭 가능한 영역은 그릴 때마다 invButtons / invSlotRects / invTabRects에 등록함
// ===========================================================
const INV_TABS = [
  { key: 'equip', label: '장비' },
  { key: 'stats', label: '스탯' },
  { key: 'bag', label: '가방' },
  { key: 'upgrade', label: '강화' }
];

function showInvToast(text, color = '#ffe066') {
  ui.invToast = { text, color, until: performance.now() + 1600 };
}

// 가방에서 상세정보로 보여줄 칸: 클릭해서 고정한 것이 우선, 없으면 마우스가 올라가 있는 것
function getInvViewIndex() {
  if (ui.selectedInvIndex !== null && player.inventory[ui.selectedInvIndex]) return ui.selectedInvIndex;
  if (ui.hoverInvIndex !== null && player.inventory[ui.hoverInvIndex]) return ui.hoverInvIndex;
  return null;
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function wrapStatLines(ctx, stats, maxW) {
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

function getCompareItemForGear(it) {
  if (!it || it === 'LOCKED') return null;
  const eq = player.equipment;
  if (it.category === 'weapon') return eq.weaponMain && eq.weaponMain !== 'LOCKED' ? eq.weaponMain : null;
  if (it.category === 'shield') return eq.weaponOff && eq.weaponOff !== 'LOCKED' && eq.weaponOff.category === 'shield' ? eq.weaponOff : null;
  if (it.category === 'accessory') return eq.accessory1 || eq.accessory2 || null;
  return eq[it.category] && eq[it.category] !== 'LOCKED' ? eq[it.category] : null;
}

function drawInventoryPanel(ctx) {
  // 뒤쪽 웨이브 배너/HUD 텍스트가 비쳐 보이지 않도록 화면 전체를 먼저 어둡게 덮음
  ctx.fillStyle = 'rgba(4,6,5,0.82)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const w = Math.min(420, canvas.width - 24);
  const h = Math.min(640, canvas.height - 16);
  const x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;

  ctx.fillStyle = 'rgba(8,8,8,0.98)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ui.invSlotRects = [];
  ui.invTabRects = {};
  ui.invButtons = [];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('캐릭터 메뉴', x + 16, y + 24);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('I 또는 우측 상단 장비 버튼으로 닫기', x + 16, y + 40);
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`재료 ${player.materials}개`, x + w - 16, y + 24);
  if (ui.invToast && performance.now() < ui.invToast.until) {
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = ui.invToast.color;
    ctx.fillText(ui.invToast.text, x + w - 16, y + 41);
  }
  ctx.textAlign = 'left';

  const tabY = y + 50, tabH = 28, tabGap = 6;
  const tabW = (w - 32 - tabGap * (INV_TABS.length - 1)) / INV_TABS.length;
  INV_TABS.forEach((tab, i) => {
    const r = { x: x + 16 + i * (tabW + tabGap), y: tabY, w: tabW, h: tabH };
    ui.invTabRects[tab.key] = r;
    const active = ui.invPanelTab === tab.key;
    ctx.fillStyle = active ? 'rgba(255,224,102,0.25)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = active ? '#ffe066' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = active ? '#ffe066' : '#bbb';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tab.label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const contentTop = tabY + tabH + 20;
  const bottom = y + h - 12;
  // 내용이 패널 밖으로 삐져나가지 않도록 패널 안쪽으로만 그림
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, contentTop - 12, w - 4, y + h - contentTop + 10);
  ctx.clip();
  if (ui.invPanelTab === 'equip') drawEquipTab(ctx, x, contentTop, w);
  else if (ui.invPanelTab === 'stats') drawStatsTab(ctx, x, contentTop, w);
  else if (ui.invPanelTab === 'bag') drawBagTab(ctx, x, contentTop, w, bottom);
  else drawUpgradeTab(ctx, x, contentTop, w);
  ctx.restore();
}

function drawEquipTab(ctx, x, startRow, w) {
  let row = startRow;
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText('착용 장비', x + 16, row);
  row += 20;

  const textX = x + 92;
  const maxW = w - 92 - 16;
  GEAR_SLOTS.forEach((slot) => {
    const it = player.equipment[slot];
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
    ['공격속도', `+${Math.round(player.gearAtkSpeed * 100)}%`],
    ['공격력', `+${player.gearAtkPower}`],
    ['방어(블락)', `+${Math.round(player.gearDefense * 100)}%`],
    ['회피율', `+${Math.round(player.gearEvasion * 100)}%`],
    ['이동속도', `+${Math.round((player.gearSpeedMult - 1) * 100)}%`],
    ['체력/마나', `+${player.gearMaxHp}/+${player.gearMaxMana}`]
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

function drawStatsTab(ctx, x, startRow, w) {
  let row = startRow;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`Lv.${player.level}  (EXP ${player.exp}/${player.level >= MAX_LEVEL ? 'MAX' : player.expToNext})`, x + 16, row);
  row += 19;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = player.statPoints > 0 ? '#ffe066' : '#8a9a8a';
  ctx.fillText(`여유 포인트: ${player.statPoints}`, x + 16, row);
  row += 24;

  const statOrder = ['atkPower', 'defense', 'evasion', 'atkSpeed', 'moveSpeed', 'health', 'mana'];
  const keyByStat = {};
  Object.entries(LEVEL_STAT_KEYS).forEach(([k, v]) => { keyByStat[v] = k; });
  statOrder.forEach((sk) => {
    const pts = player.levelStats[sk] || 0;
    const canSpend = player.statPoints > 0;
    ctx.textAlign = 'left';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#dfe9d8';
    ctx.fillText(`[${keyByStat[sk].toUpperCase()}] ${STAT_DEF[sk].label}`, x + 16, row);

    const btn = { x: x + w - 16 - 36, y: row - 17, w: 36, h: 24 };
    ui.invButtons.push({ ...btn, fn: () => {
      if (player.statPoints <= 0) { showInvToast('여유 포인트가 없어', '#ff8a80'); return; }
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
  Object.keys(SKILL_UNLOCK_LEVEL).sort((a, b) => SKILL_UNLOCK_LEVEL[a] - SKILL_UNLOCK_LEVEL[b]).forEach((id, i) => {
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

function drawBagTab(ctx, x, startRow, w, bottom) {
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`가방 (${player.inventory.length}/${INVENTORY_SIZE})`, x + 16, startRow);
  ctx.textAlign = 'right';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('클릭하면 고정 · 올려두면 미리보기', x + w - 16, startRow);
  ctx.textAlign = 'left';

  if (ui.selectedInvIndex !== null && !player.inventory[ui.selectedInvIndex]) ui.selectedInvIndex = null;
  if (ui.hoverInvIndex !== null && !player.inventory[ui.hoverInvIndex]) ui.hoverInvIndex = null;

  const cols = 2, gapX = 6, gapY = 3, rowH = 24;
  const colW = (w - 32 - gapX) / cols;
  const listTop = startRow + 10;
  const count = player.inventory.length;
  const rows = Math.max(1, Math.ceil(count / cols));

  if (count === 0) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText('가방이 비어 있어', x + 16, listTop + 16);
  }
  player.inventory.forEach((g, i) => {
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
      const rDef = RARITY_DEF[g.rarity];
      text = `[${rDef.label}] ${gearDisplayName(g)}${g.upgradeLevel > 0 ? ` +${g.upgradeLevel}` : ''}`;
      color = rDef.color;
    } else {
      text = `${ui.identifyingItem === g ? '감정 중… ' : '미감정 '}${gearDisplayName(g)}`;
      color = '#a9a9a9';
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

function drawBagDetail(ctx, x, top, w, bottom) {
  const idx = getInvViewIndex();
  const pinned = idx !== null && idx === ui.selectedInvIndex;
  ctx.textAlign = 'left';
  if (idx === null) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('아이템을 누르면 옵션이 여기에 고정돼.', x + 16, top + 8);
    return;
  }
  const sel = player.inventory[idx];
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
    ctx.fillText(`미감정 ${gearDisplayName(sel)}`, x + 16, y);
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

  const rDef = RARITY_DEF[sel.rarity];
  const upgTxt = sel.upgradeLevel > 0 ? ` +${sel.upgradeLevel}` : '';
  const handTxt = sel.category === 'weapon' ? (sel.handedness === 'two' ? ' (양손)' : ' (한손)') : '';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = rDef.color;
  ctx.fillText(fitText(ctx, `[${rDef.label}] ${gearDisplayName(sel)}${handTxt}${upgTxt}`, w - 32), x + 16, y);
  y += 19;

  ctx.font = '11px sans-serif';
  Object.entries(sel.stats).forEach(([k, v]) => {
    ctx.fillStyle = '#dfe9d8';
    ctx.fillText(`${STAT_DEF[k].label} ${STAT_DEF[k].fmt(v)}`, x + 16, y);
    y += 15;
  });

  const equipped = getCompareItemForGear(sel);
  if (equipped && equipped !== sel) {
    y += 5;
    const eDef = RARITY_DEF[equipped.rarity];
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = eDef.color;
    ctx.fillText(fitText(ctx, `현재 장착: [${eDef.label}] ${gearDisplayName(equipped)}`, w - 32), x + 16, y);
    y += 15;
    ctx.font = '11px sans-serif';
    const keys = Array.from(new Set([...Object.keys(sel.stats || {}), ...Object.keys(equipped.stats || {})]));
    keys.forEach((k) => {
      const delta = +((sel.stats[k] || 0) - (equipped.stats[k] || 0)).toFixed(4);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#a8b8a0';
      ctx.fillText(`  ${STAT_DEF[k].label}`, x + 16, y);
      ctx.textAlign = 'right';
      // fmt 결과에 이미 '+'가 붙어 있으므로 떼고 부호를 직접 붙임 (그대로 쓰면 "++6"처럼 중복됨)
      const plain = (v) => STAT_DEF[k].fmt(v).replace(/^\+/, '');
      if (delta > 0) { ctx.fillStyle = '#7fe08a'; ctx.fillText(`▲ +${plain(delta)}`, x + w - 16, y); }
      else if (delta < 0) { ctx.fillStyle = '#ff6b6b'; ctx.fillText(`▼ -${plain(Math.abs(delta))}`, x + w - 16, y); }
      else { ctx.fillStyle = '#888'; ctx.fillText('동일', x + w - 16, y); }
      y += 14;
    });
    ctx.textAlign = 'left';
  }

  if (pinned) {
    const eq = player.equipment;
    let label = '장착하기';
    if (sel.category === 'weapon' && sel.handedness === 'two' && eq.weaponOff && eq.weaponOff !== 'LOCKED') label = '장착하기 (보조손 장비 해제)';
    if (sel.category === 'shield' && eq.weaponMain && eq.weaponMain !== 'LOCKED' && eq.weaponMain.handedness === 'two') label = '장착하기 (양손무기 해제)';
    addButton(label, () => {
      const g = player.inventory[ui.selectedInvIndex];
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

function drawUpgradeTab(ctx, x, startRow, w) {
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
    const it = player.equipment[slot];
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
      const rDef = RARITY_DEF[it.rarity];
      ctx.fillStyle = rDef.color;
      ctx.fillText(fitText(ctx, `[${rDef.label}] ${gearDisplayName(it)}${it.upgradeLevel > 0 ? ` +${it.upgradeLevel}` : ''}`, w - 32 - 80), x + 16, row + 14);
      const canTry = player.materials >= 1;
      const btn = { x: x + w - 16 - 66, y: row - 8, w: 66, h: 28 };
      ui.invButtons.push({ ...btn, fn: () => {
        const cur = player.equipment[slot];
        if (!cur || cur === 'LOCKED') return;
        const before = cur.upgradeLevel || 0, mats = player.materials;
        tryUpgradeSlot(i);
        if (player.materials === mats) showInvToast('재료 부족', '#ff8a80');
        else if ((cur.upgradeLevel || 0) > before) showInvToast(`강화 성공! +${cur.upgradeLevel}`, RARITY_DEF[cur.rarity].color);
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

const potCd = { heal: document.querySelector('#pot-heal .cd'), mana: document.querySelector('#pot-mana .cd') };
const potCnt = { heal: document.getElementById('pot-heal-cnt'), mana: document.getElementById('pot-mana-cnt') };
const potEl = { heal: document.getElementById('pot-heal'), mana: document.getElementById('pot-mana') };
function updatePotionButtonsUI() {
  ['heal', 'mana'].forEach((k) => {
    potCd[k].style.height = `${Math.max(0, Math.min(1, player.potionCd[k] / POTION_COOLDOWN)) * 100}%`;
    potCnt[k].textContent = `${player.potions[k]}개`; // 'x2'는 배수처럼 읽혀서 '2개'로 표시
    potEl[k].style.opacity = player.potions[k] > 0 ? '1' : '0.5';
  });
}

const cdSlot1 = document.querySelector('#slot1 .cd');
const cdSlot2 = document.querySelector('#slot2 .cd');
function updateSkillButtonsUI() {
  const s1 = SKILLS[player.slot1], s2 = SKILLS[player.slot2];
  cdSlot1.style.height = `${Math.max(0, Math.min(1, s1.cd() / s1.cdMax())) * 100}%`;
  cdSlot2.style.height = `${Math.max(0, Math.min(1, s2.cd() / s2.cdMax())) * 100}%`;
}

// ===========================================================
// 부트 - 순서 중요: 캔버스/벽 → 플레이어 바디 → 초기화 → 타이틀 → 루프
// ===========================================================
function boot() {
  resize();
  window.addEventListener('resize', resize);
  player.body = Bodies.circle(0, 0, 17, { frictionAir: 0.15, friction: 0, restitution: 0.1, label: 'player' });
  Body.setInertia(player.body, Infinity);
  World.add(world, player.body);

  resetGame();
  // 첫 로드는 바로 시작하지 않고 어트랙트 타이틀 화면을 보여줌
  game.gameState = 'title';
  initTitleScene();
  document.body.classList.add('title-mode');

  const renderHooks = {
    syncDomButtons() { updateSkillButtonsUI(); updatePotionButtonsUI(); },
    drawMenu: drawInventoryPanel
  };
  startLoop(fixedUpdate, (t) => render(t, renderHooks));
}
boot();
