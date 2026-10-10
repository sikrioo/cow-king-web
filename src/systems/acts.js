// 목장 3막 흐름 (data/acts.js): 보스 처치 → 전리품 + 상단 '다음 막으로' 버튼(누를 때까지 기다림 - 2026-10-11 사용자) → 막 전환 장면(ACT_SCENE초, 가운데에서 막이 바뀜) → 다음 웨이브
//   마지막 막의 보스 = 승리. 보스 행동(onDeath)이 bossDown을 부름 - 여기선 Monster를 만들지 않음(순환 import 없음)
import { ACTS, ACT_SCENE } from '../data/acts.js';
import { FIRST_WAVE_DELAY } from '../data/balance.js';
import { World, world } from '../core/physics.js';
import { game } from '../state.js';
import { recordRun } from '../save.js';
import { dropLoot } from './loot.js';
import { floatText, spawnShockwave } from './fx.js';

// 보스가 쓰러짐: 전리품(막마다 bossDrops번, 좋은 등급 비중 높음 - data/drops.js boss) + '다음 막으로' 버튼을 띄움(game.actClear). 반환 true = 기본 드랍 생략
export function bossDown(m) {
  const act = ACTS[game.act] || ACTS[0];
  dropLoot(m.x, m.y, 'boss', act.bossDrops, m.level);
  spawnShockwave(m.x, m.y, 220, '#c98bef');
  game.shake = Math.min(game.shake + 12, 12);
  if (game.run.mode !== 'wave' || game.sandbox) return true; // 파밍 맵·미리보기에선 막 진행 없음
  game.actClear = 1; // 버튼을 누를 때까지 (ui/overlays.drawActScene, Enter)
  floatText(game.hero.x, game.hero.y - 80, game.act >= ACTS.length - 1 ? '최종 보스 처치!' : '보스 처치!', '#ffe066');
  return true;
}

// 웨이브 모드 매 틱 (game.js): 막 대기·장면 중이면 true (웨이브를 진행하지 않음)
export function updateActFlow(dt) {
  if (game.actScene > 0) {
    const prev = game.actScene;
    game.actScene -= dt;
    if (prev > ACT_SCENE / 2 && game.actScene <= ACT_SCENE / 2) { // 화면이 가장 어두울 때 막을 바꿈
      game.act = Math.min(ACTS.length - 1, game.act + 1);
      game.cows.forEach((c) => { if (c.body) World.remove(world, c.body); }); // 남은 호위는 사라짐
      game.cows = [];
      game.hazards = []; game.hellfires = []; game.corpses = []; game.projectiles = [];
    }
    if (game.actScene <= 0) { game.actScene = 0; game.waveTransition = FIRST_WAVE_DELAY; }
    return true;
  }
  return game.actClear > 0; // 버튼을 기다리는 중엔 웨이브 진행 안 함 (전리품 줍기)
}

// '다음 막으로' 버튼 / Enter: 다음 막 장면 시작, 마지막 막이면 승리. 반환: 넘어갔는지
export function requestNextAct() {
  if (!(game.actClear > 0) || game.gameState !== 'playing') return false;
  game.actClear = 0;
  if (game.act >= ACTS.length - 1) { game.gameState = 'victory'; recordRun('victory'); }
  else game.actScene = ACT_SCENE;
  return true;
}
