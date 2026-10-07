// 부트: 화면 → 목장 → 주인공 → 입력 연결 → 새 게임 → 타이틀 → 루프
// 순서 중요 - 벽 다음에 주인공 바디를 만들어야 물리 바디 id/월드 순서가 같고,
// 모듈을 불러오는 동안에는 아무것도 실행하지 않는다(초기화 순서 버그 방지). 전부 boot()에서.
import { resizeCanvas } from './core/context.js';
import { startLoop } from './core/loop.js';
import { game, ui } from './state.js';
import { createHero } from './entities/hero.js';
import {
  resetGame, setPaused, initTitleScene, pressAction, fixedUpdate, handleKeyDown, slotPress, toggleHelp
} from './game.js';
import { bindInput } from './input.js';
import { render } from './render/renderer.js';
import { loadReleaseMeta } from './save.js';
import { bindDomButtons } from './ui/dom.js';
import { bindDevButton } from './ui/devPanel.js';
import { isDevMode } from './config.js';
import { layoutArena } from './world/arena.js';

function boot() {
  loadReleaseMeta();
  resizeCanvas(); // 화면 크기는 보이는 범위(카메라)만 바꿈 - 목장 크기는 고정
  window.addEventListener('resize', resizeCanvas);
  layoutArena();
  game.hero = createHero();
  bindInput({ keyDown: handleKeyDown, slotPress });
  bindDomButtons({ restart: resetGame, pressAction, setPaused, toggleHelp });
  if (isDevMode()) {
    bindDevButton({ newGameAs: (key) => { ui.selectedClass = key; resetGame(); } });
  }

  resetGame();
  // 첫 로드는 바로 시작하지 않고 어트랙트 타이틀 화면을 보여줌
  game.gameState = 'title';
  initTitleScene();
  document.body.classList.add('title-mode');

  startLoop(fixedUpdate, render);
}
boot();
