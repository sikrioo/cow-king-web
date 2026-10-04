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
  ITEM_STYLE, GEAR_SLOTS, GEAR_SLOT_LABEL, GEAR_CATEGORY_LABEL, GEAR_VARIANT_LABEL, WEAPON_VARIANTS,
  ACCESSORY_VARIANTS, STAT_DEF, RARITY_DEF, RARITY_TOTAL_WEIGHT
} from './data/items.js';
import {
  MONSTERS, ELITE_KINDS, ELITE_MIN_WAVE, ELITE_CHANCE_BASE, ELITE_CHANCE_PER_WAVE, ELITE_CHANCE_MAX
} from './data/monsters.js';
import { PALETTE } from './data/palette.js';
import { SKILL_ORDER, SKILL_META, SKILL_UNLOCK_LEVEL } from './data/skills.js';
import { clamp01, lerpAngle, moveToward2D, distToSegment } from './util.js';
import { canvas, resize } from './core/context.js';
import { STEP_MS, startLoop } from './core/loop.js';
import { engine, world, PEN } from './core/physics.js';
import { game, ui, input, player } from './state.js';
import { render } from './render/renderer.js';
const { Engine, World, Bodies, Body } = Matter;

// ===========================================================
// 펜(사각형 목장) + 울타리
// ===========================================================

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

function spawnShockwave(x, y, maxRadius, color) {
  game.shockwaves.push({ x, y, maxRadius, age: 0, duration: 0.45, color });
}
function updateShockwaves(dt) {
  for (let i = game.shockwaves.length - 1; i >= 0; i--) {
    game.shockwaves[i].age += dt;
    if (game.shockwaves[i].age >= game.shockwaves[i].duration) game.shockwaves.splice(i, 1);
  }
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

// ===========================================================
// 플레이어 렌더링 - 같은 게임을 만든 다른 에이전트 버전에서 이식
// (추상적인 "조약돌+가면" 몸체 + 분리된 손/칼 표현, 스킬별 포즈 전환)
// ===========================================================

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
