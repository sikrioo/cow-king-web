// 입력: 한글 입력 상태에서도 키가 동작하는지, 도움말 창과 일시정지 연동
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

it('keyOf: 글자/숫자 키는 물리 위치(e.code)로, 나머지는 e.key 소문자', async () => {
  const env = installBrowserEnv({ seed: 1 });
  vi.resetModules();
  const { keyOf } = await import('../src/input.js'); // 캔버스 모듈이 document를 쓰므로 스텁 설치 후
  env.restore();
  expect(keyOf({ code: 'KeyW', key: 'ㅈ' })).toBe('w');   // 한글 입력 상태
  expect(keyOf({ code: 'KeyZ', key: 'ㅋ' })).toBe('z');
  expect(keyOf({ code: 'Digit1', key: '!' })).toBe('1');  // Shift+1
  expect(keyOf({ code: 'Space', key: ' ' })).toBe(' ');
  expect(keyOf({ code: 'ShiftLeft', key: 'Shift' })).toBe('shift');
  expect(keyOf({ code: 'ArrowUp', key: 'ArrowUp' })).toBe('arrowup');
  expect(keyOf({ key: 'W' })).toBe('w');                  // code가 없는 환경
});

it('한글 입력 상태에서 WASD로 이동하고, 키를 떼면 멈춘다 / 도움말은 일시정지와 연동', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game, ui, input } = await import('../src/state.js');
    env.frame(30); env.key(' '); env.key(' ', false); env.key(' '); env.key(' ', false); env.frame(30);
    const x0 = game.hero.x;
    env.keyEvent(true, { key: 'ㅇ', code: 'KeyD' });
    expect(input.keys.d).toBe(true);
    env.frame(30);
    expect(game.hero.x).toBeGreaterThan(x0 + 5);
    env.keyEvent(false, { key: 'ㅇ', code: 'KeyD' });
    expect(input.keys.d).toBe(false);

    env.keyEvent(true, { key: 'ㅗ', code: 'KeyH' });
    expect(ui.showHelp).toBe(true);
    expect(game.paused).toBe(true);
    env.keyEvent(true, { key: ' ', code: 'Space' }); // 도움말 중 다른 입력 무시
    expect(input.holdSlot1).toBe(false);
    env.keyEvent(true, { key: 'Escape', code: 'Escape' });
    expect(ui.showHelp).toBe(false);
    expect(game.paused).toBe(false);

    env.key('p'); expect(game.paused).toBe(true);    // 원래 일시정지 중이면 도움말을 닫아도 그대로
    env.key('h'); env.key('h');
    expect(game.paused).toBe(true);
  } finally {
    env.restore();
  }
});

it('마우스 좌클릭 이동: 찍은 지점까지 가서 멈추고, 끌면 따라가고, WASD를 쓰면 취소된다 / 터치는 슬롯1', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game, input } = await import('../src/state.js');
    const { canvas } = await import('../src/core/context.js');
    const { screenToWorld } = await import('../src/world/camera.js');
    env.frame(30); env.key(' '); env.key(' ', false); env.key(' '); env.key(' ', false); env.frame(30);
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const goal = screenToWorld(cx + 200, cy);
    env.pointer('pointerdown', cx + 200, cy, 0);
    env.windowPointerUp(0);
    expect(input.holdSlot1).toBe(false); // 좌클릭은 공격이 아니라 이동
    expect(input.moveTarget).not.toBe(null);
    env.frame(240);
    expect(Math.hypot(game.hero.x - goal.x, game.hero.y - goal.y)).toBeLessThan(25);
    expect(input.moveTarget).toBe(null); // 도착하면 목표 해제

    env.pointer('pointerdown', cx - 200, cy, 0);
    env.pointer('pointermove', cx, cy + 200, 0); // 누른 채 끌기 → 목표 갱신
    const dragGoal = screenToWorld(cx, cy + 200);
    expect(Math.abs(input.moveTarget.y - dragGoal.y)).toBeLessThan(1);
    env.windowPointerUp(0);
    env.key('w'); env.frame(2);
    expect(input.moveTarget).toBe(null); // 키보드 이동이 클릭 이동을 취소
    env.key('w', false);

    const h = canvasHandler(env, 'pointerdown');
    h({ button: 0, pointerType: 'touch', clientX: cx, clientY: cy, preventDefault() {} });
    expect(input.holdSlot1).toBe(true); // 터치는 그대로 슬롯1
  } finally {
    env.restore();
  }
});

// 테스트 도우미: pointerType이 있는 캔버스 이벤트를 직접 보냄
function canvasHandler(env, type) {
  return (evt) => env.pointerEvent(type, evt);
}

it('적 좌클릭: 사거리까지 걸어가서 공격 - 떼면 한 번, 누르고 있으면 계속. 자동으로 다음 적을 치지 않음', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game, input } = await import('../src/state.js');
    const { canvas } = await import('../src/core/context.js');
    const { camera } = await import('../src/world/camera.js');
    const { Monster } = await import('../src/entities/monster.js');
    const { Body } = await import('../src/core/physics.js');
    env.frame(30); env.key(' '); env.key(' ', false); env.key(' '); env.key(' ', false); env.frame(10);
    game.waveTransition = 999; // 웨이브가 끼어들지 않게
    const place = (dx) => {
      const c = new Monster(0.4, 'normal');
      c.hp = c.maxHp = 100000; c.speed = 0; // 안 죽고 안 움직이게
      const p = { x: game.hero.x + dx, y: game.hero.y };
      Body.setPosition(c.body, p); c.x = p.x; c.y = p.y;
      game.cows.push(c);
      return c;
    };
    const cow = place(160);
    env.frame(1);
    const toScreen = (c) => [canvas.width / 2 + (c.x - camera.x) * camera.zoom, canvas.height / 2 + (c.y - camera.y) * camera.zoom];

    // 클릭 후 바로 뗌 → 다가가서 한 번만
    env.pointer('pointerdown', ...toScreen(cow), 0);
    env.windowPointerUp(0);
    expect(input.attackTarget).toBe(cow);
    expect(input.moveTarget).toBe(null);
    let hits = 0, last = cow.hp;
    for (let i = 0; i < 900; i++) { env.frame(1); if (cow.hp < last) { hits++; last = cow.hp; } }
    expect(hits).toBe(1);
    expect(input.attackTarget).toBe(null);

    // 누르고 있으면 계속
    env.pointer('pointerdown', ...toScreen(cow), 0);
    hits = 0; last = cow.hp;
    for (let i = 0; i < 180; i++) { env.frame(1); if (cow.hp < last) { hits++; last = cow.hp; } }
    expect(hits).toBeGreaterThan(2);
    env.windowPointerUp(0);
    env.frame(60);
    expect(input.attackTarget).toBe(null);
  } finally {
    env.restore();
  }
});

it('클릭 이동 중 Space를 누르면 멈춰서 시전, WASD 이동 중에는 계속 이동', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game, input } = await import('../src/state.js');
    const { canvas } = await import('../src/core/context.js');
    env.frame(30); env.key(' '); env.key(' ', false); env.key(' '); env.key(' ', false); env.frame(30);
    game.waveTransition = 999;
    env.pointer('pointerdown', canvas.width / 2 + 300, canvas.height / 2, 0);
    env.windowPointerUp(0);
    env.frame(30);
    env.key(' '); env.key(' ', false);
    expect(input.moveTarget).toBe(null);
    env.frame(40);
    const x1 = game.hero.x; env.frame(30);
    expect(Math.abs(game.hero.x - x1)).toBeLessThan(1); // 멈춤

    env.key('d'); env.frame(20);
    env.key(' '); env.key(' ', false);
    const x2 = game.hero.x; env.frame(30);
    expect(game.hero.x - x2).toBeGreaterThan(20); // WASD는 계속 이동
    env.key('d', false);
  } finally {
    env.restore();
  }
});

it('Shift+좌클릭 = 제자리에서 커서 방향 기본 공격(누르는 동안 계속), Space = 커서 방향 시전', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game, input } = await import('../src/state.js');
    const { canvas } = await import('../src/core/context.js');
    env.frame(30); env.key(' '); env.key(' ', false); env.key(' '); env.key(' ', false); env.frame(30);
    game.waveTransition = 999;
    const h = game.hero;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const shiftDown = (x, y) => env.pointerEvent('pointerdown', { button: 0, shiftKey: true, clientX: x, clientY: y, preventDefault() {} });

    // 커서가 주인공 바로 위쪽 → 위를 보고 공격, 제자리
    const x0 = h.x, y0 = h.y;
    shiftDown(cx, cy - 150);
    expect(input.standAttackHeld).toBe(true);
    let swings = 0, prev = 0;
    for (let i = 0; i < 120; i++) { env.frame(1); if (h.attackTimer > prev) swings++; prev = h.attackTimer; }
    expect(swings).toBeGreaterThan(2);
    expect(Math.abs(h.facing - (-Math.PI / 2))).toBeLessThan(0.05);
    expect(Math.hypot(h.x - x0, h.y - y0)).toBeLessThan(3);
    env.windowPointerUp(0);
    expect(input.standAttackHeld).toBe(false);

    // Space: 커서(오른쪽) 방향으로 시전
    env.pointerEvent('pointermove', { clientX: cx + 200, clientY: cy, preventDefault() {} });
    env.frame(40);
    env.key(' ');
    expect(Math.abs(h.facing)).toBeLessThan(0.05);
    env.key(' ', false);
  } finally {
    env.restore();
  }
});

it('시작 화면: 카드 클릭은 고르기만, 게임 시작 버튼(또는 Space/Enter)을 눌러야 시작', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game, ui } = await import('../src/state.js');
    env.frame(5);
    expect(game.gameState).toBe('title');
    const center = (r) => [r.x + r.w / 2, r.y + r.h / 2];
    const sorcCard = ui.titleCardRects.find((r) => r.key === 'sorc');
    env.pointer('pointerdown', ...center(sorcCard), 0);
    expect(ui.selectedClass).toBe('sorc');
    expect(game.gameState).toBe('title');
    env.pointer('pointerdown', 5, 5, 0); // 빈 곳
    env.key('e'); env.key('e', false);   // 다른 키
    env.frame(2);
    expect(game.gameState).toBe('title');
    env.pointer('pointerdown', ...center(ui.titleStartRect), 0);
    expect(game.gameState).toBe('hub'); // 맵 선택 화면
    env.key(' '); env.key(' ', false);
    expect(game.gameState).toBe('playing');
    expect(game.hero.classKey).toBe('sorc');
  } finally {
    env.restore();
  }
});
