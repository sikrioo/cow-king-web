// 세션 흐름: 새 캐릭터(타이틀에서 고른 직업) → 맵 선택(hub) → 맵 입장(enterMap) → 죽음/승리/나가기 → 다시 맵 선택
// 캐릭터(레벨·스탯·스킬·카드·장비·가방)는 맵을 오가도 그대로 - 영구 저장은 나중에 서버(docs/SERVER_DESIGN.md)
// 맵 안의 진행(배치·클리어)은 systems/mapRun.js
import { ATTACK_DURATION, expForLevel } from './data/balance.js';
import { CLASSES } from './data/classes.js';
import { MAPS, MAP_ORDER } from './data/maps.js';
import { DIFFICULTY_ORDER } from './data/difficulty.js';
import { Body } from './core/physics.js';
import { game, ui, input } from './state.js';
import { giveStarterGear, giveTestStash, unarmedStats, recalcGearStats } from './systems/gear.js';
import { emptySpellCooldowns } from './systems/sorcSkills.js';
import { emptyResist, emptyDot } from './systems/elements.js';
import { resetSkillLevels } from './systems/levelCards.js';
import { beginRun, clearWorld } from './systems/mapRun.js';
import { floatText } from './systems/fx.js';
import { setMap } from './world/arena.js';
import { syncSlotLabels } from './ui/dom.js';
import { setInventoryOpen } from './ui/menu/panel.js';
import { isDevMode } from './config.js';

// 새 캐릭터: 고른 직업(ui.selectedClass)의 시작 수치·슬롯·장비, 레벨 1
export function newCharacter() {
  const h = game.hero;
  const key = CLASSES[ui.selectedClass] ? ui.selectedClass : 'warrior';
  const cls = CLASSES[key];
  h.classKey = key;
  h.maxHp = cls.hp;
  h.baseMaxMana = cls.mana;
  h.maxMana = cls.mana;
  h.manaRegen = cls.manaRegen;
  resetSkillLevels(cls);
  h.level = 1;
  h.exp = 0;
  h.expToNext = expForLevel(1);
  h.statPoints = 0;
  h.levelStats = { atkPower: 0, defense: 0, evasion: 0, atkSpeed: 0, castSpeed: 0, moveSpeed: 0, health: 0, mana: 0 };
  h.bonusMaxHp = 0;
  h.equipment = { armor: null, weaponMain: null, weaponOff: null, greaves: null, boots: null, accessory1: null, accessory2: null };
  h.gearAtkSpeed = 0;
  h.gearCastSpeed = 0;
  h.gearAtkPower = 0;
  h.gearDefense = 0;
  h.gearEvasion = 0;
  h.gearArmor = 0;
  h.armorReduction = 0;
  h.weaponStats = { main: unarmedStats(), off: null };
  h.gearElemDmg = { fire: 0, cold: 0, lightning: 0, poison: 0 };
  h.offHandNext = false;
  h.attackCooldownMax = 0;
  h.gearSpeedMult = 1;
  h.gearMaxHp = 0;
  h.gearMaxMana = 0;
  h.materials = 0;
  h.inventory = [];
  h.potions = { heal: 2, mana: 2 };
  h.potionCd = { heal: 0, mana: 0 };
  if (cls.starterGear) giveStarterGear(); // gear 보너스 초기화 이후에 호출해야 장착 효과가 덮어써지지 않음
  if (isDevMode()) giveTestStash(); // 개발자 모드: 장비 교체 테스트용 무기/방패 + 원소 테스트 무기
  recalcGearStats();
  h.slot1 = cls.slots[0];
  h.slot2 = cls.slots[1];
  h.mapRuns = {}; // 맵·난이도별 입장 횟수 (systems/mapRun.runKey)
  ui.identifyingItem = null;
  ui.identifyTimer = 0;
  ui.selectedInvIndex = null;
  ui.hoverInvIndex = null;
  ui.selectedEquipSlot = null;
  ui.hoverEquipSlot = null;
  ui.invPanelTab = 'equip';
  ui.invToast = null;
  ui.invReveal = null;
  ui.hubMap = MAP_ORDER[0];
  ui.hubDifficulty = DIFFICULTY_ORDER[0];
}

// 맵 안에서만의 주인공 상태 초기화 (위치는 beginRun) - 체력·마나 가득, 쿨다운·버프·상태이상 없음
function resetHeroRuntime() {
  const h = game.hero;
  h.spellCd = emptySpellCooldowns();
  h.noManaWarn = 0;
  h.stamina = h.maxStamina;
  h.running = false;
  h.invuln = 0;
  h.attackTimer = 0;
  h.attackCooldown = 0;
  h.currentAttackDuration = ATTACK_DURATION;
  h.combo = 0;
  h.comboTimer = 0;
  h.knockback = 0;
  h.flash = 0;
  h.alive = true;
  h.warcryCooldown = 0;
  h.whirlwindTimer = 0;
  h.whirlwindCooldown = 0;
  h.whirlAngle = 0;
  h.leapTimer = 0;
  h.leapCooldown = 0;
  h.rushTimer = 0;
  h.rushCooldown = 0;
  h.rushHitSet = null;
  h.smashTimer = 0;
  h.smashCooldown = 0;
  h.smashHitDone = false;
  h.moveOffsetX = 0;
  h.moveOffsetY = 0;
  h.moveOffsetVX = 0;
  h.moveOffsetVY = 0;
  h.moveLean = 0;
  h.moveLeanV = 0;
  h.moveFxCooldown = 0;
  h.moveReaction = 0;
  h.moveSpeedN = 0;
  h.moveInputActive = false;
  h.moveStep = 0;
  h.slowTimer = 0;
  h.burn = emptyDot();
  h.poison = emptyDot();
  h.resist = emptyResist();
  h.bonusMaxHp = 0;
  h.vitalityTimer = 0;
  h.speedMult = 1;
  h.speedBuffTimer = 0;
  h.attackBonus = 0;
  h.attackBuffTimer = 0;
  h.defenseChance = 0;
  h.defenseBuffTimer = 0;
  h.fortifyTimer = 0;
  h.fortifyMax = 0;
  h.fortifyHp = 0;
  h.flurryTimer = 0;
  h.flurryHits = 0;
  h.berserkTimer = 0;
  h.shieldTimer = 0;
  h.shieldHp = 0;
  h.tempAuras = {};
  h.apprentice = null;
  h.sheepTimer = 0;
  h.curse = null;
  h.aimX = null;
  h.aimY = null;
  h.potionCd = { heal: 0, mana: 0 };
  h.pendingSwing = null;
  h.pendingCards = 0;
  game.cardOffer = null;
  h.hp = h.maxHp + h.gearMaxHp;
  h.mana = h.maxMana;
}

function clearInput() {
  input.holdSlot1 = false;
  input.holdSlot2 = false;
  input.moveTarget = null;
  input.mouseMoveHeld = false;
  input.attackTarget = null;
  input.attackHeld = false;
  input.standAttackHeld = false;
  ui.moveMarker = null;
}

// 맵 입장 (인스턴스: 매번 새로). opts = { difficulty }
export function enterMap(mapId, opts = {}) {
  clearWorld();
  game.paused = false;
  game.runRecorded = false;
  const pb = document.getElementById('btn-pause');
  if (pb) pb.textContent = 'Ⅱ';
  resetHeroRuntime();
  beginRun(mapId, opts);
  game.demoTipTimer = MAPS[mapId].mode === 'wave' ? 5.0 : 0;
  game.shake = 0;
  game.hitstop = 0;
  game.impactFlash = 0;
  game.kills = 0;
  ui.exitArmedUntil = 0;
  clearInput();
  syncSlotLabels();
  game.gameState = 'playing';
}

// 새 게임 = 새 캐릭터 + 목장 1웨이브 (테스트·개발자 패널이 씀. 실제 플레이는 타이틀 → 맵 선택)
export function resetGame() {
  newCharacter();
  enterMap('ranch');
}

// 맵 선택 화면으로 (맵 안의 것은 치움, 캐릭터는 그대로)
export function goHub() {
  clearWorld();
  setMap('ranch'); // 맵 선택 화면 배경은 목장
  Body.setVelocity(game.hero.body, { x: 0, y: 0 });
  game.paused = false;
  game.cardOffer = null;
  game.shake = 0;
  game.impactFlash = 0;
  clearInput();
  setInventoryOpen(false);
  game.gameState = 'hub';
}

// 맵 선택 화면 → 타이틀 (캐릭터를 버리고 새로 고르기)
export function goTitle() {
  clearWorld();
  setMap('ranch');
  setInventoryOpen(false);
  game.gameState = 'title';
}

// 타이틀에서 '게임 시작' → 고른 직업으로 새 캐릭터 → 맵 선택
export function startFromTitle() {
  newCharacter();
  goHub();
}

// 맵 선택 화면에서 고른 맵으로 입장
export function enterSelectedMap() {
  enterMap(ui.hubMap, { difficulty: ui.hubDifficulty });
}

// 플레이 중이 아닐 때 '행동' 입력(Space/클릭/버튼): 타이틀 → 시작, 맵 선택 → 입장, 죽음/승리 화면 → 맵 선택
export function advanceScreen() {
  if (game.gameState === 'title') startFromTitle();
  else if (game.gameState === 'hub') enterSelectedMap();
  else if (game.gameState === 'gameover' || game.gameState === 'victory') goHub();
}

// 맵 나가기 (T / ⇦ 버튼): 실수 방지로 2초 안에 한 번 더 눌러야 나감
export function requestExitMap() {
  if (game.gameState !== 'playing' || game.cardOffer) return;
  const now = performance.now();
  if (ui.exitArmedUntil > now) { goHub(); return; }
  ui.exitArmedUntil = now + 2000;
  floatText(game.hero.x, game.hero.y - 60, '한 번 더 누르면 맵 선택으로', '#ffe066');
}

// 맵 선택 화면 조작 (키보드/클릭 공통): 맵 고르기, 옵션(시작 웨이브/난이도) 바꾸기
export function hubSelectMap(id) {
  if (MAPS[id]) ui.hubMap = id;
}
export function hubCycleMap(dir) {
  const i = MAP_ORDER.indexOf(ui.hubMap);
  ui.hubMap = MAP_ORDER[(i + dir + MAP_ORDER.length) % MAP_ORDER.length];
}
// 난이도 바꾸기 (목장·파밍 맵 공통)
export function hubChangeOption(dir) {
  const i = DIFFICULTY_ORDER.indexOf(ui.hubDifficulty);
  ui.hubDifficulty = DIFFICULTY_ORDER[Math.max(0, Math.min(DIFFICULTY_ORDER.length - 1, i + dir))];
}
