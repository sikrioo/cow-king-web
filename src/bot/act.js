// 봇 행동 적용 - 사람이 누르는 것과 같은 길로 (클릭 이동·클릭 공격 = input.moveTarget/attackTarget, 슬롯 = trySlot, 물약·카드·막 넘기기)
//   행동 = { move: {x, y}(가려는 방향, 단위 벡터) | null, run, attack: 몬스터(또는 toJSON 번호) | null, cast: 0|1|2,
//            potion: 'heal'|'mana'|null, card: 번호|null, nextAct, flow: 'advance'|'enter'|'start'|null }
//   봇은 게임 난수(Math.random)를 쓰지 않음 - 같은 시드면 같은 결과
import { game, input } from '../state.js';
import { trySlot } from '../systems/skills.js';
import { tryDrinkPotion } from '../systems/potions.js';
import { pickCard } from '../systems/levelCards.js';
import { requestNextAct } from '../systems/acts.js';
import { advanceScreen, enterSelectedMap } from '../session.js';

export const IDLE = { move: null, run: false, attack: null, cast: 0, potion: null, card: null, nextAct: false, flow: null };

export function applyAction(a, obs) {
  if (a.flow === 'advance') { advanceScreen(); return; }
  if (a.flow === 'enter') { enterSelectedMap(); return; }
  if (game.gameState !== 'playing') return;
  if (a.card != null && game.cardOffer) { pickCard(a.card); return; }
  if (a.nextAct) requestNextAct();
  if (game.paused || game.cardOffer) return;
  const h = game.hero;
  if (a.potion) tryDrinkPotion(a.potion);
  const target = typeof a.attack === 'number' ? obs && obs.monsters[a.attack] && obs.monsters[a.attack].ref : a.attack;
  input.keys.shift = !!a.run;
  if (a.move) { // 클릭 이동처럼: 조금 앞을 목표로 (도착하면 멈춤 - 매 틱 갱신)
    input.attackTarget = null;
    input.moveTarget = { x: h.x + a.move.x * 60, y: h.y + a.move.y * 60 };
  } else if (target) { // 클릭 공격: 사거리 밖이면 다가가고 안이면 휘두름 (entities/hero.js clickAttackStep)
    input.moveTarget = null;
    input.attackTarget = target;
    input.attackHeld = true;
  } else { input.moveTarget = null; input.attackTarget = null; }
  if (a.cast) { input.mouseScreen = null; trySlot(a.cast); } // 커서 없음 = 자동 조준(가까운 적)
}

// 봇을 끌 때: 남아 있는 가짜 입력 지우기
export function releaseInput() {
  input.moveTarget = null; input.attackTarget = null; input.attackHeld = false; input.keys.shift = false;
}
