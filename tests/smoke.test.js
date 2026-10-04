// 스모크 + 동등성: 레거시(legacy/cow_pen.html)와 새 모듈 코드를 같은 시드·같은 입력으로 돌려서
// 300프레임마다 찍은 상태 지문이 처음부터 끝까지 같아야 한다. (예외/NaN이 없어야 하는 것은 기본)
// 입력 시나리오는 legacy/tools/smoke.cjs와 동일: 타이틀 → 시작 → 약 150초 무작위 입력(이동/스킬/물약/레벨업/일시정지/장비창 클릭 난사)
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installBrowserEnv, mulberry32 } from './helpers/browserEnv.js';

const require = createRequire(import.meta.url);
const { createSandbox } = require('../legacy/tools/_sandbox.cjs');
const LEGACY_HTML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../legacy/cow_pen.html');

const FRAMES = 9000;
const CHECK_EVERY = 300;
const SEEDS = [1234, 777, 42];

const r4 = (v) => (typeof v === 'number' ? +v.toFixed(4) : v);
// view = { game, player } → 비교용 지문 (레거시/새 코드 공통)
function fingerprint({ game, player }) {
  return {
    gameState: game.gameState, paused: game.paused, wave: game.wave, waveTransition: r4(game.waveTransition), kills: game.kills,
    cows: game.cows.length, cowHp: r4(game.cows.reduce((s, c) => s + c.hp, 0)), cowStates: game.cows.map((c) => c.kind[0] + c.state[0]).join(''),
    items: game.items.length, particles: game.particles.length, floatTexts: game.floatTexts.length,
    hazards: game.hazards.length, bolts: game.lightningBolts.length, shockwaves: game.shockwaves.length, shake: r4(game.shake),
    level: player.level, exp: player.exp, statPoints: player.statPoints, hp: r4(player.hp), mana: r4(player.mana), stamina: r4(player.stamina),
    x: r4(player.x), y: r4(player.y), alive: player.alive, inventory: player.inventory.length, materials: player.materials,
    potions: JSON.stringify(player.potions), slots: player.slot1 + '/' + player.slot2
  };
}

function runScenario(env, seed, view) {
  const rnd = mulberry32(seed + 1);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const prints = [];
  env.frame(60);                       // 타이틀 화면
  env.key(' '); env.key(' ', false);   // Space로 시작
  const dirs = ['w', 'a', 's', 'd']; let cur = null; let spaceDown = false; let eDown = false; let invOpen = false;
  for (let i = 0; i < FRAMES; i++) {
    if (i % 45 === 0) { if (cur) env.key(cur, false); cur = pick(dirs); env.key(cur); }
    if (i % 20 === 0) { spaceDown ? env.key(' ', false) : env.key(' '); spaceDown = !spaceDown; }
    if (i % 33 === 0) { eDown ? env.key('e', false) : env.key('e'); eDown = !eDown; }
    if (i % 150 === 0) env.key('q');
    if (i % 210 === 0) env.key('r');
    if (i % 170 === 0) env.key('1');
    if (i % 230 === 0) env.key('2');
    if ([600, 1500, 2400, 3300].includes(i)) env.key('l');
    if (i % 17 === 0) env.pointer('pointerdown', 500, 300, 0);
    if (i % 29 === 0) env.pointer('pointerdown', 500, 300, 2);
    if (i % 50 === 0) env.windowPointerUp(0);
    if (i === 5200) env.key('p');
    if (i === 5260) env.key('p');
    if (i === 4000 || i === 7000) { env.key('i'); invOpen = true; }
    if (invOpen && ((i >= 4000 && i < 4400) || (i >= 7000 && i < 7300))) {
      const x = 300 + rnd() * 424, y = 60 + rnd() * 650;
      env.pointer('pointermove', x, y);
      if (i % 3 === 0) env.pointer('pointerdown', x, y, 0);
    }
    if (i === 4400 || i === 7300) { env.key('i'); invOpen = false; }
    env.frame(1);
    if ((i + 1) % CHECK_EVERY === 0) prints.push({ frame: i + 1, ...fingerprint(view()) });
  }
  return prints;
}

function runLegacy(seed) {
  const footer = 'globalThis.__view = () => ({ game: { gameState, paused, wave, waveTransition, kills, cows, items, particles, floatTexts, hazards, lightningBolts, shockwaves, shake }, player });';
  const env = createSandbox({ htmlPath: LEGACY_HTML, footer, seed });
  return runScenario(env, seed, () => env.sandbox.__view());
}

async function runModular(seed) {
  const env = installBrowserEnv({ seed });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const state = await import('../src/state.js');
    return runScenario(env, seed, () => ({ game: state.game, player: state.player }));
  } finally {
    env.restore();
  }
}

describe('smoke: 레거시와 동일하게 동작', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: ${FRAMES}프레임 동안 예외 없음 + 상태 지문이 레거시와 같음`, async () => {
      const legacy = runLegacy(seed);
      const modular = await runModular(seed);
      expect(modular.length).toBe(legacy.length);
      for (let i = 0; i < legacy.length; i++) expect(modular[i]).toEqual(legacy[i]); // 처음 어긋난 지점에서 멈춤
    }, 120000);
  }
});
