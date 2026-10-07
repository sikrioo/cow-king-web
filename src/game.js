// 게임 흐름: 새 게임 초기화, 상태(title → playing → gameover/victory, paused), 매 틱 갱신 순서, 입력 의도 처리
// 승패 기록은 save.js의 recordRun (사망: combat.hitPlayer, 승리: behaviors.boss.onDeath)
import { ATTACK_DURATION, MAX_MANA, expForLevel, LEVEL_STAT_KEYS, FIRST_WAVE_DELAY, WAVE_GAP } from './data/balance.js';
import { STEP_MS } from './core/loop.js';
import { Engine, World, Body, engine, world } from './core/physics.js';
import { game, ui, input } from './state.js';
import { updatePlayer } from './entities/hero.js';
import { updateHazards } from './systems/combat.js';
import { updateMeteors } from './systems/spells.js';
import { updateProjectiles } from './systems/projectiles.js';
import { updateParticles, updateLightningBolts, updateShockwaves, updateIceRings, updateFloatTexts } from './systems/fx.js';
import { updateIdentify, giveStarterGear, giveTestStash, tryUpgradeSlot, unarmedStats } from './systems/gear.js';
import { updateItems } from './systems/loot.js';
import { tryDrinkPotion } from './systems/potions.js';
import { gainExp, trySpendStatPoint } from './systems/progression.js';
import { SKILLS, cycleSkillSlot, updateSkillSlots, trySlot } from './systems/skills.js';
import { startNextWave } from './systems/waves.js';
import { showHelpPanel } from './ui/dom.js';
import { setInventoryOpen } from './ui/menu/panel.js';
import { PEN } from './world/arena.js';
import { isDevMode } from './config.js';
import { CLASSES, CLASS_ORDER } from './data/classes.js';
import { emptySpellCooldowns, updateSpellCooldowns } from './systems/sorcSkills.js';
import { updateDev } from './systems/dev.js';
import { toggleDevPanel } from './ui/devPanel.js';
import { updateHeroStatuses, emptyResist, emptyDot } from './systems/elements.js';
import { viewSize } from './world/camera.js';
import { resetSkillLevels, pickCard, rerollCards } from './systems/levelCards.js';

// 고른 캐릭터(ui.selectedClass)의 시작 수치/슬롯
function applyClass() {
  const key = CLASSES[ui.selectedClass] ? ui.selectedClass : 'warrior';
  const cls = CLASSES[key];
  game.hero.classKey = key;
  game.hero.maxHp = cls.hp;
  game.hero.baseMaxMana = cls.mana;
  game.hero.manaRegen = cls.manaRegen;
  game.hero.spellCd = emptySpellCooldowns();
  game.hero.noManaWarn = 0;
  resetSkillLevels(cls);
}

export function resetGame() {
  applyClass();
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
  game.hero.burn = emptyDot();
  game.hero.poison = emptyDot();
  game.hero.resist = emptyResist();
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
  game.hero.gearArmor = 0;
  game.hero.armorReduction = 0;
  game.hero.weaponStats = { main: unarmedStats(), off: null };
  game.hero.offHandNext = false;
  game.hero.attackCooldownMax = 0;
  game.hero.gearSpeedMult = 1;
  game.hero.gearMaxHp = 0;
  game.hero.gearMaxMana = 0;
  game.hero.materials = 0;
  game.hero.inventory = [];
  game.hero.potions = { heal: 2, mana: 2 };
  game.hero.potionCd = { heal: 0, mana: 0 };
  if (CLASSES[game.hero.classKey].starterGear) giveStarterGear(); // gear 보너스 초기화 이후에 호출해야 장착 효과가 덮어써지지 않음
  if (isDevMode()) giveTestStash(); // 개발자 모드: 장비 교체 테스트용 - 무기 종류별 1개 + 방패 + 양손무기를 가방에 바로 지급
  game.hero.hp = game.hero.maxHp + game.hero.gearMaxHp;
  game.hero.mana = game.hero.maxMana + game.hero.gearMaxMana;
  ui.identifyingItem = null;
  ui.identifyTimer = 0;
  ui.selectedInvIndex = null;
  ui.hoverInvIndex = null;
  ui.selectedEquipSlot = null;
  ui.hoverEquipSlot = null;
  ui.invPanelTab = 'equip';
  ui.invToast = null;
  ui.invReveal = null;
  game.hero.level = 1;
  game.hero.exp = 0;
  game.hero.expToNext = expForLevel(1);
  game.hero.statPoints = 0;
  game.hero.levelStats = { atkPower: 0, defense: 0, evasion: 0, atkSpeed: 0, castSpeed: 0, moveSpeed: 0, health: 0, mana: 0 };
  game.hero.gearCastSpeed = 0;
  game.hero.maxMana = game.hero.baseMaxMana;

  game.particles = [];
  game.shockwaves = [];
  game.iceRings = [];
  game.hazards = [];
  game.meteors = [];
  game.projectiles = [];
  game.lightningBolts = [];
  game.items = [];
  game.floatTexts = [];
  game.shake = 0;
  game.hitstop = 0;
  game.impactFlash = 0;
  game.kills = 0;
  game.hero.slot1 = CLASSES[game.hero.classKey].slots[0];
  game.hero.slot2 = CLASSES[game.hero.classKey].slots[1];
  input.holdSlot1 = false;
  input.holdSlot2 = false;
  input.moveTarget = null;
  input.mouseMoveHeld = false;
  input.attackTarget = null;
  input.attackHeld = false;
  input.standAttackHeld = false;
  ui.moveMarker = null;
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

export function setPaused(v) {
  if (game.gameState !== 'playing') { game.paused = false; return; }
  game.paused = !!v;
  const pb = document.getElementById('btn-pause');
  if (pb) pb.textContent = game.paused ? '▶' : 'Ⅱ';
}

// 타이틀 소들이 돌아다니는 영역: 목장 가운데의 화면에 보이는 만큼
function titleArea() {
  const v = viewSize();
  const w = Math.min(v.w, PEN.size), h = Math.min(v.h, PEN.size);
  return { x: PEN.x + (PEN.size - w) / 2, y: PEN.y + (PEN.size - h) / 2, w, h };
}

export function initTitleScene() {
  ui.titleCows = [];
  const area = titleArea();
  const count = Math.max(7, Math.min(12, Math.round(Math.min(area.w, area.h) / 70)));
  for (let i = 0; i < count; i++) {
    const p = { x: area.x + area.w * (0.1 + Math.random() * 0.8), y: area.y + area.h * (0.1 + Math.random() * 0.8) };
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

export function updateTitleScene(dt) {
  ui.titleTime += dt;
  if (!ui.titleCows.length) initTitleScene();
  const area = titleArea();
  const minX = area.x + 34, maxX = area.x + area.w - 34;
  const minY = area.y + 40, maxY = area.y + area.h - 32;
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

export function pressAction(fn) {
  if (game.gameState !== 'playing') { resetGame(); return; }
  if (game.paused || game.cardOffer) return;
  fn();
}

export function fixedUpdate(dt) {
  if (game.gameState === 'title') {
    updateTitleScene(dt);
    updateParticles(dt);
    if (game.impactFlash > 0) game.impactFlash = Math.max(0, game.impactFlash - dt * 2.8);
    return;
  }
  if (game.cardOffer) {
    // 레벨업 카드를 고르는 동안은 전부 멈춤 (화면 효과만)
    updateParticles(dt);
    updateFloatTexts(dt);
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
    updateHeroStatuses(dt);
    updateSpellCooldowns(dt);
    updateDev();
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
  updateIceRings(dt);
  updateHazards(dt);
  updateMeteors(dt);
  updateProjectiles(dt);
  updateLightningBolts(dt);
  updateFloatTexts(dt);
  if (game.waveBannerTimer > 0) game.waveBannerTimer = Math.max(0, game.waveBannerTimer - dt);
  if (game.demoTipTimer > 0) game.demoTipTimer = Math.max(0, game.demoTipTimer - dt);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 40);
  if (game.impactFlash > 0) game.impactFlash = Math.max(0, game.impactFlash - dt * 2.8);
}

// 타이틀 캐릭터 고르기 (키보드 ←/→, 카드 클릭은 input.js)
export function cycleTitleClass(dir) {
  const i = CLASS_ORDER.indexOf(ui.selectedClass);
  ui.selectedClass = CLASS_ORDER[(i + dir + CLASS_ORDER.length) % CLASS_ORDER.length];
}

// 키 의도 처리 - 순서가 의미: 메뉴 닫기/일시정지 → (일시정지 중이면 여기서 끝) → 나머지
export function handleKeyDown(intent, k, e) {
  if (intent === 'help') { setHelpOpen(!ui.showHelp); return; }
  if (intent === 'back' && ui.showHelp) { e.preventDefault(); setHelpOpen(false); return; }
  if (ui.showHelp) return; // 도움말 창이 열려 있는 동안 다른 입력은 무시
  if (game.gameState === 'title') {
    // 시작 화면: ←/→(A/D) 캐릭터 고르기, Space/Enter = 게임 시작, 그 밖의 키는 무시
    if (intent === 'devPanel' && isDevMode()) toggleDevPanel();
    else if (k === 'arrowleft' || k === 'a') cycleTitleClass(-1);
    else if (k === 'arrowright' || k === 'd') cycleTitleClass(1);
    else if (k === ' ' || k === 'enter') { e.preventDefault(); resetGame(); }
    return;
  }
  if (game.cardOffer && game.gameState === 'playing') {
    // 레벨업 카드: 1/2/3 = 고르기, R = 다시 뽑기 (그 밖의 키는 무시)
    if (intent === 'devPanel' && isDevMode()) toggleDevPanel();
    else if (intent === 'num') pickCard(Number(k) - 1);
    else if (k === 'r') rerollCards();
    else if (k === ' ' || intent === 'back') e.preventDefault();
    return;
  }
  if (intent === 'back') {
    e.preventDefault();
    if (ui.showInventory) { setInventoryOpen(false); return; }
    if (game.gameState === 'playing') { setPaused(!game.paused); return; }
  }
  if (intent === 'pause' && game.gameState === 'playing') { e.preventDefault(); setPaused(!game.paused); return; }
  if (game.paused) return;
  if (intent === 'devPanel' && isDevMode()) { toggleDevPanel(); return; }
  if (intent === 'debugLevelUp' && game.gameState === 'playing' && isDevMode()) gainExp(Math.max(1, game.hero.expToNext - game.hero.exp)); // 개발자 모드: L = 한 레벨 업
  const num = intent === 'num' ? Number(k) : 0;
  if (!ui.showInventory && game.gameState === 'playing') {
    if (num === 1) tryDrinkPotion('heal');
    if (num === 2) tryDrinkPotion('mana');
  }
  // 슬롯1 = Space(길게 누르면 계속 시전), 슬롯2 = E(길게)
  if (intent === 'slot1') {
    e.preventDefault();
    if (game.gameState !== 'playing') { resetGame(); }
    else if (!input.holdSlot1) { stopClickOrders(); input.holdSlot1 = true; trySlot(1); }
  }
  if (intent === 'slot2') {
    if (game.gameState !== 'playing') { resetGame(); }
    else if (!input.holdSlot2) { stopClickOrders(); input.holdSlot2 = true; trySlot(2); }
  }
  // Q/R = 슬롯1/슬롯2에 배정된 스킬을 다음 스킬로 전환(탭)
  if (intent === 'cycleSlot1') { if (game.gameState !== 'playing') resetGame(); else cycleSkillSlot(1); }
  if (intent === 'cycleSlot2') { if (game.gameState !== 'playing') resetGame(); else cycleSkillSlot(2); }
  if (intent === 'toggleMenu') setInventoryOpen(!ui.showInventory);
  if (ui.showInventory && num >= 1 && num <= 7) {
    tryUpgradeSlot(num - 1);
  }
  if (ui.showInventory && intent === 'stat') {
    trySpendStatPoint(LEVEL_STAT_KEYS[k]);
  }
}

// 스킬을 쓰면 클릭 이동/클릭 공격 명령은 취소 → 그 자리에 멈춰서 시전 (WASD 이동은 키를 누르는 동안 계속)
function stopClickOrders() {
  input.moveTarget = null;
  input.mouseMoveHeld = false;
  input.attackTarget = null;
  input.standAttackHeld = false;
}

// 캔버스 클릭으로 슬롯 시전 시작 (좌클릭/터치 = 1, 우클릭 = 2)
export function slotPress(slotNum) {
  if (game.gameState !== 'playing') { resetGame(); return; }
  if (game.paused || game.cardOffer) return;
  stopClickOrders();
  if (slotNum === 2) { if (!input.holdSlot2) { input.holdSlot2 = true; trySlot(2); } }
  else { if (!input.holdSlot1) { input.holdSlot1 = true; trySlot(1); } }
}

// 도움말 창: 플레이 중에 열면 일시정지하고, 닫으면 (도움말이 일시정지시킨 경우에만) 다시 진행
export function setHelpOpen(open) {
  if (open === ui.showHelp) return;
  ui.showHelp = open;
  if (open) {
    ui.helpPausedGame = game.gameState === 'playing' && !game.paused;
    if (ui.helpPausedGame) setPaused(true);
  } else {
    if (ui.helpPausedGame && game.gameState === 'playing') setPaused(false);
    ui.helpPausedGame = false;
  }
  showHelpPanel(open);
}
export function toggleHelp() { setHelpOpen(!ui.showHelp); }
