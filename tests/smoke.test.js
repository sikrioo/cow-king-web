// 스모크 + 회귀: 같은 시드·같은 입력으로 게임을 돌려 300프레임마다 찍은 상태 지문을 스냅샷(__snapshots__/)과 비교한다.
// - 예외/NaN이 없어야 함 (그리기에 NaN이 들어가면 ctx 스텁이 throw)
// - 체력은 항상 정수 (×10 정수화 이후 규칙)
// 이력: v1-modular까지는 레거시(legacy/cow_pen.html)와 같은 입력으로 나란히 돌려 상태+그리기가 똑같은지 비교했고,
//      ×10 정수화 1단계까지 레거시와 상태가 같음을 확인한 뒤(커밋 9ec9ee6) 2단계(1 단위 정수)부터 이 스냅샷이 기준.
// 동작을 **의도적으로** 바꿨을 때만 사용자 확인 후 `npx vitest run -u`로 스냅샷 갱신. 의도하지 않은 불일치는 코드를 되돌린다.
// 시나리오: 일반(타이틀 → 시작 → 약 150초 무작위 입력: 이동/스킬/물약/레벨업/일시정지/장비창 클릭 난사), 몬스터 13종, 모바일 버튼/조이스틱
import { describe, it, expect, vi } from 'vitest';
import { installBrowserEnv, mulberry32 } from './helpers/browserEnv.js';


const FRAMES = 9000;
const CHECK_EVERY = 300;
const SEEDS = [1234, 777, 42];

const r4 = (v) => (typeof v === 'number' ? +v.toFixed(4) : v);
// view = { game, ui, player } → 비교용 지문 (레거시/새 코드 공통)
// view = { game, ui, player } → 비교용 지문
function fingerprint({ game, ui, player }) {
  return {
    gameState: game.gameState, paused: game.paused, wave: game.wave, waveTransition: r4(game.waveTransition), kills: game.kills,
    cows: game.cows.length, cowHp: r4(game.cows.reduce((s, c) => s + c.hp, 0)), cowXY: r4(game.cows.reduce((s, c) => s + c.x * 3 + c.y, 0)), cowStates: game.cows.map((c) => c.kind[0] + c.state[0]).join(''),
    items: game.items.length, particles: game.particles.length, floatTexts: game.floatTexts.length,
    hazards: game.hazards.length, bolts: game.lightningBolts.length, shockwaves: game.shockwaves.length, shake: r4(game.shake),
    level: player.level, exp: player.exp, statPoints: player.statPoints, hp: r4(player.hp), mana: r4(player.mana), stamina: r4(player.stamina),
    x: r4(player.x), y: r4(player.y), alive: player.alive, inventory: player.inventory.length, materials: player.materials,
    potions: JSON.stringify(player.potions), slots: player.slot1 + '/' + player.slot2,
    showInventory: ui.showInventory, invPanelTab: ui.invPanelTab, selectedInvIndex: ui.selectedInvIndex, hoverInvIndex: ui.hoverInvIndex,
    invButtons: ui.invButtons.length, titleCows: ui.titleCows.length, identifying: ui.identifyingItem !== null, identifyTimer: r4(ui.identifyTimer),
    equipped: Object.values(player.equipment).map((g) => (g === null ? '-' : g === 'LOCKED' ? 'L' : g.variant || g.category)).join(',')
  };
}

function runScenario(env, seed, view) {
  const rnd = mulberry32(seed + 1);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const prints = [];
  env.frame(60);                       // 타이틀 화면
  env.key(' '); env.key(' ', false);   // Space로 시작 → 맵 선택
  env.key(' '); env.key(' ', false);   // Space로 목장 입장
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

// 몬스터 11종 동물원: 시작 후 각 종류를 한 마리씩 소환해 900프레임 동안 싸우고, 남은 몬스터를 전부 처치(보스 승리 처리 포함)
const KINDS = ['normal', 'tough', 'fast', 'cold', 'charger', 'fanatic', 'burning', 'exploder', 'shaman', 'shocker', 'venom', 'pyro', 'boss'];
function runZoo(env, seed, view, spawn, killAll) {
  const rnd = mulberry32(seed + 7);
  const prints = [];
  const snap = (frame) => prints.push({ frame, ...fingerprint(view()) });
  env.frame(60); env.key(' '); env.key(' ', false); env.key(' '); env.key(' ', false); // 타이틀 → 맵 선택 → 목장
  env.frame(300); snap('start');
  KINDS.forEach((k) => spawn(k));
  const dirs = ['w', 'a', 's', 'd']; let cur = null;
  for (let i = 0; i < 900; i++) {
    if (view().game.gameState !== 'playing') { env.frame(1); if ((i + 1) % 30 === 0) snap(i + 1); continue; } // 사망/승리 후 키 입력은 재시작이 되므로 멈춤
    if (i % 40 === 0) { if (cur) env.key(cur, false); cur = dirs[Math.floor(rnd() * 4)]; env.key(cur); }
    if (i % 12 === 0) env.key(' '); if (i % 12 === 6) env.key(' ', false);
    if (i % 90 === 0) env.key('e'); if (i % 90 === 45) env.key('e', false);
    if (i === 100 || i === 200 || i === 300 || i === 400) env.key('l');
    if (i % 150 === 75) env.key('q');
    env.frame(1);
    if ((i + 1) % 30 === 0) snap(i + 1);
  }
  killAll();
  env.frame(60); snap('afterKillAll');
  return prints;
}

// 모바일: HTML 버튼(슬롯 길게/전환/물약/일시정지/장비)과 가상 조이스틱만으로 조작
function runMobile(env, seed, view) {
  const rnd = mulberry32(seed + 13);
  const prints = [];
  const snap = (frame) => prints.push({ frame, ...fingerprint(view()) });
  const ev = (extra = {}) => ({ preventDefault() {}, stopPropagation() {}, pointerId: 7, clientX: 50, clientY: 50, ...extra });
  const fire = (id, type, extra) => env.elCache[id]._fire(type, ev(extra));
  env.frame(60);
  fire('slot1', 'pointerdown'); fire('slot1', 'pointerup'); // 타이틀에서 버튼 = 시작 → 맵 선택
  fire('slot1', 'pointerdown'); fire('slot1', 'pointerup'); // 맵 선택에서 버튼 = 입장
  env.frame(300); snap('start');
  let joy = false;
  for (let i = 0; i < 3000; i++) {
    if (i % 50 === 0) {
      if (!joy) { fire('joystick-base', 'pointerdown', { clientX: 50, clientY: 50 }); joy = true; }
      fire('joystick-base', 'pointermove', { clientX: 50 + (rnd() - 0.5) * 120, clientY: 50 + (rnd() - 0.5) * 120 });
    }
    if (i % 230 === 200) { fire('joystick-base', i % 460 === 200 ? 'pointerup' : 'pointercancel'); joy = false; }
    if (i % 25 === 0) fire('slot1', 'pointerdown'); if (i % 25 === 15) fire('slot1', i % 50 === 15 ? 'pointerup' : 'pointerleave');
    if (i % 70 === 0) fire('slot2', 'pointerdown'); if (i % 70 === 40) fire('slot2', 'pointercancel');
    if (i % 160 === 80) fire('slot1-cycle', 'pointerdown');
    if (i % 190 === 95) fire('slot2-cycle', 'pointerdown');
    if (i % 140 === 30) fire('pot-heal', 'pointerdown');
    if (i % 150 === 60) fire('pot-mana', 'pointerdown');
    if ([500, 900, 1300].includes(i)) env.key('l');
    if (i === 1000 || i === 1060) fire('btn-pause', 'pointerdown');
    if (i === 1500 || i === 1700) fire('btn-inv', 'pointerdown');
    if (i === 1520) fire('btn-full', 'pointerdown');
    // 레벨업 카드: 화면의 카드를 탭해서 고름 (고르기 전엔 게임이 멈춤)
    const card = view().game.cardOffer && view().ui.cardRects[i % 3];
    if (card && i % 20 === 10) env.pointer('pointerdown', card.x + card.w / 2, card.y + card.h / 2, 0);
    env.frame(1);
    if ((i + 1) % 100 === 0) snap(i + 1);
  }
  return prints;
}

async function runModularZoo(seed) {
  const env = installBrowserEnv({ seed });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const state = await import('../src/state.js');
    const { Monster } = await import('../src/entities/monster.js');
    const { killCow } = await import('../src/systems/combat.js');
    return runZoo(env, seed, () => ({ game: state.game, ui: state.ui, player: state.game.hero }),
      (k) => { state.game.cows.push(new Monster(0.4, k)); },
      () => { state.game.cows.forEach((c) => { if (c.state !== 'dead') killCow(c); }); });
  } finally {
    env.restore();
  }
}

async function runModularMobile(seed) {
  const env = installBrowserEnv({ seed });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const state = await import('../src/state.js');
    return runMobile(env, seed, () => ({ game: state.game, ui: state.ui, player: state.game.hero }));
  } finally {
    env.restore();
  }
}

async function runModular(seed) {
  const env = installBrowserEnv({ seed });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const state = await import('../src/state.js');
    return runScenario(env, seed, () => ({ game: state.game, ui: state.ui, player: state.game.hero }));
  } finally {
    env.restore();
  }
}

const allHpInteger = (prints) => prints.every((p) => Number.isInteger(p.hp) && Number.isInteger(p.cowHp));

describe('smoke: 일반 플레이', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: ${FRAMES}프레임 동안 예외 없음 + 스냅샷과 같음`, async () => {
      const prints = await runModular(seed);
      expect(allHpInteger(prints), '체력은 정수').toBe(true);
      expect(prints).toMatchSnapshot();
    }, 120000);
  }
});

describe('smoke: 몬스터 13종 특수 행동/처치', () => {
  for (const seed of [5, 99]) {
    it(`zoo seed ${seed}`, async () => {
      const prints = await runModularZoo(seed);
      expect(prints[prints.length - 1].gameState).toBe('victory'); // 보스 처치까지 실제로 경유했는지
      expect(allHpInteger(prints), '체력은 정수').toBe(true);
      expect(prints).toMatchSnapshot();
    }, 120000);
  }
});

describe('smoke: 모바일 버튼/조이스틱 조작', () => {
  for (const seed of [3, 2024]) {
    it(`mobile seed ${seed}`, async () => {
      const prints = await runModularMobile(seed);
      // 전투가 실제로 일어났는지: 처치했거나 맞았는지 (2026-10-06 이동 속도 수정 후 주인공이 빨라져 처치 없이 끝나는 시드가 생김)
      // 2026-10-08: 카드·투지로 최대 체력이 늘 수 있어서 '시작 체력보다 낮음' 대신 '직전 기록보다 체력이 줄었음'으로 판정
      expect(prints.some((p, i) => p.kills > 0 || (i > 0 && p.hp < prints[i - 1].hp)), '전투가 실제로 일어났는지').toBe(true);
      expect(allHpInteger(prints), '체력은 정수').toBe(true);
      expect(prints).toMatchSnapshot();
    }, 120000);
  }
});
