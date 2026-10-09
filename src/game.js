// 게임 흐름: 상태(title → hub → playing → gameover/victory, paused), 매 틱 갱신 순서, 입력 의도 처리
// 새 캐릭터·맵 입장·맵 선택 화면 흐름은 session.js, 맵 안의 진행은 systems/mapRun.js
// 승패 기록은 save.js의 recordRun (사망: elements.checkHeroDeath, 승리: behaviors.boss.onDeath)
import { LEVEL_STAT_KEYS, WAVE_GAP } from './data/balance.js';
import { STEP_MS } from './core/loop.js';
import { Engine, engine } from './core/physics.js';
import { game, ui, input } from './state.js';
import { updatePlayer } from './entities/hero.js';
import { updateHazards } from './systems/combat.js';
import { updateMeteors } from './systems/spells.js';
import { updateProjectiles } from './systems/projectiles.js';
import { updateParticles, updateLightningBolts, updateShockwaves, updateIceRings, updateFloatTexts, floatText } from './systems/fx.js';
import { updateIdentify, tryUpgradeSlot } from './systems/gear.js';
import { updateItems } from './systems/loot.js';
import { tryDrinkPotion } from './systems/potions.js';
import { gainExp, trySpendStatPoint } from './systems/progression.js';
import { cycleSkillSlot, updateSkillSlots, trySlot } from './systems/skills.js';
import { startNextWave } from './systems/waves.js';
import { updateFarmProgress } from './systems/mapRun.js';
import { showHelpPanel } from './ui/dom.js';
import { setInventoryOpen } from './ui/menu/panel.js';
import { isDevMode } from './config.js';
import { updateSpellCooldowns } from './systems/sorcSkills.js';
import { updateDev } from './systems/dev.js';
import { toggleDevPanel } from './ui/devPanel.js';
import { updateHeroStatuses } from './systems/elements.js';
import { pickCard, rerollCards } from './systems/levelCards.js';
import { updateSkillBuffs } from './systems/physSkills.js';
import { updateGroundSpells } from './systems/groundSpells.js';
import { updateSandbox } from './systems/sandbox.js';
import { autoAimOn } from './systems/aim.js';
import { saveReleaseMeta } from './save.js';
import { updateTitleScene, cycleTitleClass } from './ui/titleScene.js';
import {
  advanceScreen, startFromTitle, enterSelectedMap, requestExitMap, hubCycleMap, hubChangeOption
} from './session.js';

export { resetGame } from './session.js';
export { initTitleScene, updateTitleScene, cycleTitleClass } from './ui/titleScene.js';

export function setPaused(v) {
  if (game.gameState !== 'playing') { game.paused = false; return; }
  game.paused = !!v;
  const pb = document.getElementById('btn-pause');
  if (pb) pb.textContent = game.paused ? '▶' : 'Ⅱ';
}

export function pressAction(fn) {
  if (game.gameState !== 'playing') { advanceScreen(); return; }
  if (game.paused || game.cardOffer) return;
  fn();
}

export function fixedUpdate(dt) {
  if (game.gameState === 'title' || game.gameState === 'hub') {
    updateTitleScene(dt);
    if (ui.showInventory) updateIdentify(dt); // 맵 선택 화면에서도 장비창(감정) 사용
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
    updateSkillBuffs(dt); // 투지·버서커·에너지 쉴드 시간, 미끼
    updateDev();
    if (game.sandbox) updateSandbox(dt); // 관리자 미리보기
    updateSkillSlots();
    game.cows.forEach((c) => c.update(dt));
    for (let i = game.cows.length - 1; i >= 0; i--) {
      if (game.cows[i].state === 'dead' && game.cows[i].deadTimer <= 0) game.cows.splice(i, 1);
    }
    if (game.run.mode === 'farm') updateFarmProgress(); // 파밍 맵: 다 잡으면 클리어
    else if (game.cows.length === 0) {
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
  updateGroundSpells(dt);
  updateProjectiles(dt);
  updateLightningBolts(dt);
  updateFloatTexts(dt);
  if (game.waveBannerTimer > 0) game.waveBannerTimer = Math.max(0, game.waveBannerTimer - dt);
  if (game.demoTipTimer > 0) game.demoTipTimer = Math.max(0, game.demoTipTimer - dt);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 40);
  if (game.impactFlash > 0) game.impactFlash = Math.max(0, game.impactFlash - dt * 2.8);
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
    else if (k === ' ' || k === 'enter') { e.preventDefault(); startFromTitle(); }
    return;
  }
  if (game.gameState === 'hub' && !ui.showInventory) {
    // 맵 선택: ↑/↓(W/S) 맵, ←/→(A/D) 시작 웨이브·난이도, Space/Enter 입장, I 장비창
    if (intent === 'devPanel' && isDevMode()) toggleDevPanel();
    else if (intent === 'toggleMenu') setInventoryOpen(true);
    else if (k === 'arrowup' || k === 'w') hubCycleMap(-1);
    else if (k === 'arrowdown' || k === 's') hubCycleMap(1);
    else if (k === 'arrowleft' || k === 'a') hubChangeOption(-1);
    else if (k === 'arrowright' || k === 'd') hubChangeOption(1);
    else if (k === ' ' || k === 'enter') { e.preventDefault(); enterSelectedMap(); }
    return;
  }
  if ((game.gameState === 'gameover' || game.gameState === 'victory') && k === 'enter') { advanceScreen(); return; }
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
  if (intent === 'exitMap') { requestExitMap(); return; }
  if (intent === 'toggleAutoAim') {
    game.releaseMeta.autoAim = !autoAimOn();
    saveReleaseMeta();
    floatText(game.hero.x, game.hero.y - 60, `자동 조준 ${autoAimOn() ? '켬' : '끔'}`, '#ffe066');
    return;
  }
  if (intent === 'debugLevelUp' && game.gameState === 'playing' && isDevMode()) gainExp(Math.max(1, game.hero.expToNext - game.hero.exp)); // 개발자 모드: L = 한 레벨 업
  const num = intent === 'num' ? Number(k) : 0;
  if (!ui.showInventory && game.gameState === 'playing') {
    if (num === 1) tryDrinkPotion('heal');
    if (num === 2) tryDrinkPotion('mana');
  }
  // 슬롯1 = Space(길게 누르면 계속 시전), 슬롯2 = E(길게)
  const menuOnly = ui.showInventory && game.gameState !== 'playing'; // 맵 선택 화면의 장비창: 행동 키는 무시
  if (intent === 'slot1' && !menuOnly) {
    e.preventDefault();
    if (game.gameState !== 'playing') { advanceScreen(); }
    else if (!input.holdSlot1) { stopClickOrders(); input.holdSlot1 = true; trySlot(1); }
  }
  if (intent === 'slot2' && !menuOnly) {
    if (game.gameState !== 'playing') { advanceScreen(); }
    else if (!input.holdSlot2) { stopClickOrders(); input.holdSlot2 = true; trySlot(2); }
  }
  // Q/R = 슬롯1/슬롯2에 배정된 스킬을 다음 스킬로 전환(탭)
  if (intent === 'cycleSlot1' && !menuOnly) { if (game.gameState !== 'playing') advanceScreen(); else cycleSkillSlot(1); }
  if (intent === 'cycleSlot2' && !menuOnly) { if (game.gameState !== 'playing') advanceScreen(); else cycleSkillSlot(2); }
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
  if (game.gameState !== 'playing') { advanceScreen(); return; }
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
