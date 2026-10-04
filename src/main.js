import { LEVEL_STAT_KEYS, POTION_COOLDOWN, WAVE_GAP } from './data/balance.js';
import { canvas, resizeCanvas } from './core/context.js';
import { STEP_MS, startLoop } from './core/loop.js';
import { Engine, engine } from './core/physics.js';
import { game, ui, input } from './state.js';
import { createHero, updatePlayer } from './entities/hero.js';
import { resetGame } from './game.js';
import { render } from './render/renderer.js';
import { loadReleaseMeta } from './save.js';
import { updateHazards } from './systems/combat.js';
import { updateParticles, updateLightningBolts, updateShockwaves, updateFloatTexts } from './systems/fx.js';
import { updateIdentify, tryUpgradeSlot } from './systems/gear.js';
import { updateItems } from './systems/loot.js';
import { tryDrinkPotion } from './systems/potions.js';
import { gainExp, trySpendStatPoint } from './systems/progression.js';
import { SKILLS, cycleSkillSlot, updateSkillSlots } from './systems/skills.js';
import { startNextWave } from './systems/waves.js';
import { pointInRect } from './ui/menu/common.js';
import { setInventoryOpen, invPanelHandlePoint, drawInventoryPanel } from './ui/menu/panel.js';
import { PEN, layoutArena, randomPointInPen } from './world/arena.js';

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
// 화면 크기 변경: 캔버스 → 목장 배치/벽
function resize() {
  resizeCanvas();
  layoutArena(canvas.width, canvas.height);
}

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
