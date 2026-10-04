import {
  ATTACK_DURATION, MAX_MANA, MAX_LEVEL, POINTS_PER_LEVEL, expForLevel, LEVEL_STAT_PER_POINT, LEVEL_STAT_KEYS,
  INVENTORY_SIZE, IDENTIFY_DURATION, UPGRADE_SUCCESS_CHANCE, POTION_COOLDOWN, FIRST_WAVE_DELAY, WAVE_GAP,
  BOSS_WAVE
} from './data/balance.js';
import { GEAR_SLOTS, GEAR_SLOT_LABEL, STAT_DEF, RARITY_DEF } from './data/items.js';
import {
  ELITE_KINDS, ELITE_MIN_WAVE, ELITE_CHANCE_BASE, ELITE_CHANCE_PER_WAVE, ELITE_CHANCE_MAX
} from './data/monsters.js';
import { SKILL_UNLOCK_LEVEL } from './data/skills.js';
import { canvas, resize } from './core/context.js';
import { STEP_MS, startLoop } from './core/loop.js';
import { Engine, World, Body, engine, world, PEN } from './core/physics.js';
import { game, ui, input } from './state.js';
import { createHero, updatePlayer } from './entities/hero.js';
import { Monster } from './entities/monster.js';
import { render } from './render/renderer.js';
import { loadReleaseMeta } from './save.js';
import { updateHazards } from './systems/combat.js';
import {
  updateParticles, updateLightningBolts, updateShockwaves, updateFloatTexts, showInvToast
} from './systems/fx.js';
import {
  gearDisplayName, tryIdentify, updateIdentify, giveStarterGear, giveTestStash, equipFromInventory,
  tryUpgradeSlot
} from './systems/gear.js';
import { updateItems } from './systems/loot.js';
import { tryDrinkPotion } from './systems/potions.js';
import { gainExp, trySpendStatPoint, isSkillUnlocked } from './systems/progression.js';
import { SKILLS, cycleSkillSlot, updateSkillSlots } from './systems/skills.js';
import { randomPointInPen } from './world/arena.js';

// ===========================================================
// 펜(사각형 목장) + 울타리
// ===========================================================

// ===========================================================
// 타이틀 화면 / 일시정지 / 로컬 기록 - 다른 에이전트의 릴리즈 버전에서 이식
// ===========================================================
loadReleaseMeta();
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

// ===========================================================
// 플레이어
// ===========================================================

// ===========================================================
// 장비 시스템 (갑옷/무기/각반/신발/장신구2)
// ===========================================================

// ===========================================================
// 레벨업 & 스탯 분배
// ===========================================================

// 장비창 UI 상호작용 상태 (탭/선택/히트박스) - 마우스 호버와 모바일 탭을 동일하게 처리

// ===========================================================
// 아이템 감정(식별) 시스템 - 드랍된 장비는 전부 미감정 상태로 시작
// ===========================================================


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
  if (k === 'l' && game.gameState === 'playing') gainExp(Math.max(1, game.hero.expToNext - game.hero.exp)); // 테스트용: L = 한 레벨 업 (밸런스/스킬 해금 확인용)
  if (!ui.showInventory && game.gameState === 'playing') {
    if (k === '1') tryDrinkPotion('heal');
    if (k === '2') tryDrinkPotion('mana');
  }
  // 슬롯1 = Space(길게 누르면 계속 시전), 슬롯2 = E(길게)
  if (k === ' ') {
    e.preventDefault();
    if (game.gameState !== 'playing') { resetGame(); }
    else if (!input.holdSlot1) { input.holdSlot1 = true; SKILLS[game.hero.slot1].try(); }
  }
  if (k === 'e') {
    if (game.gameState !== 'playing') { resetGame(); }
    else if (!input.holdSlot2) { input.holdSlot2 = true; SKILLS[game.hero.slot2].try(); }
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
  if (e.button === 2) { if (!input.holdSlot2) { input.holdSlot2 = true; SKILLS[game.hero.slot2].try(); } }
  else { if (!input.holdSlot1) { input.holdSlot1 = true; SKILLS[game.hero.slot1].try(); } }
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
  const skillKey = () => (slotNum === 1 ? game.hero.slot1 : game.hero.slot2);
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

// ===========================================================
// 리프 어택 (도약 강타) - 바바리안 대표 스킬
// ===========================================================

// ===========================================================
// 함성 충격파 시각 효과
// ===========================================================
// 버닝소울이 지나간 자리에 남기는 불바닥 - 밟고 있으면 주기적으로 피해

// ===========================================================
// 소비 아이템 드롭/픽업 시스템
// ===========================================================

// ===========================================================
// 플레이어 렌더링 - 같은 게임을 만든 다른 에이전트 버전에서 이식
// (추상적인 "조약돌+가면" 몸체 + 분리된 손/칼 표현, 스킬별 포즈 전환)
// ===========================================================

// ===========================================================
// 러시 / 그라운드 스매시 스킬 - 같은 게임을 만든 다른 에이전트 버전에서 이식
// ===========================================================

// ===========================================================
// 디아블로식 2슬롯 스킬 시스템 - 슬롯에 스킬을 배정하고 누르고 있으면 시전
// (각 스킬의 try* 함수가 자체 쿨다운/마나 체크를 하므로 매 프레임 호출해도 안전함)
// ===========================================================


// ===========================================================
// 카우 AI + 물리 바디
// ===========================================================

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
    game.cows.push(new Monster(1.0, 'boss'));
    for (let i = 0; i < 4; i++) game.cows.push(new Monster((1.05 + Math.random() * 0.5) * 0.3, 'normal'));
    return;
  }
  const size = 6 + game.wave * 4; // 웨이브가 지날수록 순차적으로 마리 수 증가 (난이도 상향)
  for (let i = 0; i < size; i++) {
    game.cows.push(new Monster((1.05 + Math.random() * 0.5) * 0.3, pickCowKind()));
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

  Body.setPosition(game.hero.body, { x: PEN.x + PEN.size / 2, y: PEN.y + PEN.size / 2 });
  Body.setVelocity(game.hero.body, { x: 0, y: 0 });
  game.hero.hp = game.hero.maxHp;
  game.hero.mana = game.hero.maxMana;
  game.hero.stamina = game.hero.maxStamina;
  game.hero.running = false;
  game.hero.invuln = 0;
  game.hero.attackTimer = 0;
  game.hero.attackCooldown = 0;
  game.hero.currentAttackDuration = ATTACK_DURATION;
  game.hero.combo = 0;
  game.hero.comboTimer = 0;
  game.hero.knockback = 0;
  game.hero.flash = 0;
  game.hero.alive = true;
  game.hero.warcryCooldown = 0;
  game.hero.whirlwindTimer = 0;
  game.hero.whirlwindCooldown = 0;
  game.hero.whirlAngle = 0;
  game.hero.leapTimer = 0;
  game.hero.leapCooldown = 0;
  game.hero.rushTimer = 0;
  game.hero.rushCooldown = 0;
  game.hero.rushHitSet = null;
  game.hero.smashTimer = 0;
  game.hero.smashCooldown = 0;
  game.hero.smashHitDone = false;
  game.hero.moveOffsetX = 0;
  game.hero.moveOffsetY = 0;
  game.hero.moveOffsetVX = 0;
  game.hero.moveOffsetVY = 0;
  game.hero.moveLean = 0;
  game.hero.moveLeanV = 0;
  game.hero.moveFxCooldown = 0;
  game.hero.moveReaction = 0;
  game.hero.moveSpeedN = 0;
  game.hero.moveInputActive = false;
  game.hero.moveStep = 0;
  game.hero.slowTimer = 0;
  game.hero.bonusMaxHp = 0;
  game.hero.vitalityTimer = 0;
  game.hero.speedMult = 1;
  game.hero.speedBuffTimer = 0;
  game.hero.attackBonus = 0;
  game.hero.attackBuffTimer = 0;
  game.hero.defenseChance = 0;
  game.hero.defenseBuffTimer = 0;
  game.hero.equipment = { armor: null, weaponMain: null, weaponOff: null, greaves: null, boots: null, accessory1: null, accessory2: null };
  game.hero.gearAtkSpeed = 0;
  game.hero.gearAtkPower = 0;
  game.hero.gearDefense = 0;
  game.hero.gearEvasion = 0;
  game.hero.gearSpeedMult = 1;
  game.hero.gearMaxHp = 0;
  game.hero.gearMaxMana = 0;
  game.hero.materials = 0;
  game.hero.inventory = [];
  game.hero.potions = { heal: 2, mana: 2 };
  game.hero.potionCd = { heal: 0, mana: 0 };
  giveStarterGear(); // gear 보너스 초기화 이후에 호출해야 장착 효과가 덮어써지지 않음
  giveTestStash(); // 장비 교체 테스트용 - 무기 종류별 1개 + 방패 + 양손무기를 가방에 바로 지급
  game.hero.hp = game.hero.maxHp + game.hero.gearMaxHp;
  game.hero.mana = game.hero.maxMana + game.hero.gearMaxMana;
  ui.identifyingItem = null;
  ui.identifyTimer = 0;
  ui.selectedInvIndex = null;
  ui.hoverInvIndex = null;
  ui.invPanelTab = 'equip';
  ui.invToast = null;
  ui.invReveal = null;
  game.hero.level = 1;
  game.hero.exp = 0;
  game.hero.expToNext = expForLevel(1);
  game.hero.statPoints = 0;
  game.hero.levelStats = { atkPower: 0, defense: 0, evasion: 0, atkSpeed: 0, moveSpeed: 0, health: 0, mana: 0 };
  game.hero.maxMana = MAX_MANA;

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
  game.hero.slot1 = 'attack';
  game.hero.slot2 = 'warcry';
  input.holdSlot1 = false;
  input.holdSlot2 = false;
  const s1label = document.getElementById('slot1-label');
  const s2label = document.getElementById('slot2-label');
  const s1el = document.getElementById('slot1');
  const s2el = document.getElementById('slot2');
  if (s1label) s1label.textContent = SKILLS[game.hero.slot1].label;
  if (s2label) s2label.textContent = SKILLS[game.hero.slot2].label;
  if (s1el) s1el.style.background = SKILLS[game.hero.slot1].color;
  if (s2el) s2el.style.background = SKILLS[game.hero.slot2].color;
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

// 가방에서 상세정보로 보여줄 칸: 클릭해서 고정한 것이 우선, 없으면 마우스가 올라가 있는 것
function getInvViewIndex() {
  if (ui.selectedInvIndex !== null && game.hero.inventory[ui.selectedInvIndex]) return ui.selectedInvIndex;
  if (ui.hoverInvIndex !== null && game.hero.inventory[ui.hoverInvIndex]) return ui.hoverInvIndex;
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
  const eq = game.hero.equipment;
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
  ctx.fillText(`재료 ${game.hero.materials}개`, x + w - 16, y + 24);
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

function drawStatsTab(ctx, x, startRow, w) {
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
      const rDef = RARITY_DEF[it.rarity];
      ctx.fillStyle = rDef.color;
      ctx.fillText(fitText(ctx, `[${rDef.label}] ${gearDisplayName(it)}${it.upgradeLevel > 0 ? ` +${it.upgradeLevel}` : ''}`, w - 32 - 80), x + 16, row + 14);
      const canTry = game.hero.materials >= 1;
      const btn = { x: x + w - 16 - 66, y: row - 8, w: 66, h: 28 };
      ui.invButtons.push({ ...btn, fn: () => {
        const cur = game.hero.equipment[slot];
        if (!cur || cur === 'LOCKED') return;
        const before = cur.upgradeLevel || 0, mats = game.hero.materials;
        tryUpgradeSlot(i);
        if (game.hero.materials === mats) showInvToast('재료 부족', '#ff8a80');
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
    potCd[k].style.height = `${Math.max(0, Math.min(1, game.hero.potionCd[k] / POTION_COOLDOWN)) * 100}%`;
    potCnt[k].textContent = `${game.hero.potions[k]}개`; // 'x2'는 배수처럼 읽혀서 '2개'로 표시
    potEl[k].style.opacity = game.hero.potions[k] > 0 ? '1' : '0.5';
  });
}

const cdSlot1 = document.querySelector('#slot1 .cd');
const cdSlot2 = document.querySelector('#slot2 .cd');
function updateSkillButtonsUI() {
  const s1 = SKILLS[game.hero.slot1], s2 = SKILLS[game.hero.slot2];
  cdSlot1.style.height = `${Math.max(0, Math.min(1, s1.cd() / s1.cdMax())) * 100}%`;
  cdSlot2.style.height = `${Math.max(0, Math.min(1, s2.cd() / s2.cdMax())) * 100}%`;
}

// ===========================================================
// 부트 - 순서 중요: 캔버스/벽 → 플레이어 바디 → 초기화 → 타이틀 → 루프
// ===========================================================
function boot() {
  resize();
  window.addEventListener('resize', resize);
  game.hero = createHero();

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
