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
    env.frame(30); env.key(' '); env.key(' ', false); env.frame(30);
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
