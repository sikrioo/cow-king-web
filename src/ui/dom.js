// HTML 버튼(모바일 슬롯/전환/물약/일시정지/전체화면/장비) 바인딩과 쿨다운·개수·title-mode 동기화
// 비플레이 상태에서 누르면 재시작, 일시정지 중이면 무시 (pressAction 패턴)
import { POTION_COOLDOWN } from '../data/balance.js';
import { game, ui, input } from '../state.js';
import { tryDrinkPotion } from '../systems/potions.js';
import { SKILLS, cycleSkillSlot } from '../systems/skills.js';
import { setInventoryOpen } from './menu/panel.js';

export async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch (_) {}
}

export function bindHoldSlot(slotId, slotNum, actions) {
  const el = document.getElementById(slotId);
  const setHold = slotNum === 1 ? (v) => { input.holdSlot1 = v; } : (v) => { input.holdSlot2 = v; };
  const skillKey = () => (slotNum === 1 ? game.hero.slot1 : game.hero.slot2);
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (game.gameState !== 'playing') { actions.restart(); return; }
    if (game.paused || game.cardOffer) return;
    setHold(true);
    SKILLS[skillKey()].try();
  });
  const release = (e) => { e.preventDefault(); setHold(false); };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', release);
}

export function bindCycle(id, slotNum, actions) {
  document.getElementById(id).addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (game.gameState !== 'playing') { actions.restart(); return; }
    if (game.paused || game.cardOffer) return;
    cycleSkillSlot(slotNum);
  });
}

export const potCd = { heal: document.querySelector('#pot-heal .cd'), mana: document.querySelector('#pot-mana .cd') };

export const potCnt = { heal: document.getElementById('pot-heal-cnt'), mana: document.getElementById('pot-mana-cnt') };

export const potEl = { heal: document.getElementById('pot-heal'), mana: document.getElementById('pot-mana') };

export function updatePotionButtonsUI() {
  ['heal', 'mana'].forEach((k) => {
    potCd[k].style.height = `${Math.max(0, Math.min(1, game.hero.potionCd[k] / POTION_COOLDOWN)) * 100}%`;
    potCnt[k].textContent = `${game.hero.potions[k]}개`; // 'x2'는 배수처럼 읽혀서 '2개'로 표시
    potEl[k].style.opacity = game.hero.potions[k] > 0 ? '1' : '0.5';
  });
}

export const cdSlot1 = document.querySelector('#slot1 .cd');

export const cdSlot2 = document.querySelector('#slot2 .cd');

export function updateSkillButtonsUI() {
  const s1 = SKILLS[game.hero.slot1], s2 = SKILLS[game.hero.slot2];
  cdSlot1.style.height = `${Math.max(0, Math.min(1, s1.cd() / s1.cdMax())) * 100}%`;
  cdSlot2.style.height = `${Math.max(0, Math.min(1, s2.cd() / s2.cdMax())) * 100}%`;
}

// HTML 버튼 연결. actions: { restart, pressAction, setPaused, toggleHelp } - game.js
export function bindDomButtons(actions) {
  bindHoldSlot('slot1', 1, actions);
  bindHoldSlot('slot2', 2, actions);
  bindCycle('slot1-cycle', 1, actions);
  bindCycle('slot2-cycle', 2, actions);
  ['heal', 'mana'].forEach((kind) => {
    document.getElementById(`pot-${kind}`).addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      actions.pressAction(() => tryDrinkPotion(kind));
    });
  });
  document.getElementById('btn-pause').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); actions.setPaused(!game.paused); });
  document.getElementById('btn-full').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); toggleFullscreen(); });
  document.getElementById('btn-inv').addEventListener('pointerdown', (e) => { e.preventDefault(); if (!game.cardOffer) setInventoryOpen(!ui.showInventory); });
  document.getElementById('btn-help').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); actions.toggleHelp(); });
  document.getElementById('help-panel').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); actions.toggleHelp(); });
}

// 타이틀 화면에서는 조작 버튼 숨김 (styles.css의 body.title-mode)
export function syncTitleModeClass(titleMode) {
  document.body.classList.toggle('title-mode', titleMode);
}

// 도움말 창 보이기/숨기기
export function showHelpPanel(open) {
  document.getElementById('help-panel').classList.toggle('open', open);
}
