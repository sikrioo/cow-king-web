// 자동 조준: 커서 없음 → 가까운 적(바라보는 쪽 우선), PC → 커서 방향 근처 적에 흡착, 끄면 그대로, 순간이동은 적을 안 겨눔
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/session.js')),
    ...(await import('../src/systems/aim.js')),
    ...(await import('../src/systems/skills.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/world/camera.js')),
    ...(await import('../src/systems/combat.js'))
  };
  m.resetGame();
  m.game.waveTransition = 999;
  const h = m.game.hero;
  m.place = (dx, dy) => {
    const c = new m.Monster(0.4, 'normal');
    const p = { x: h.x + dx, y: h.y + dy };
    m.Body.setPosition(c.body, p); c.x = p.x; c.y = p.y; c.speed = 0;
    m.game.cows.push(c);
    return c;
  };
  m.angleTo = (c) => { const b = m.getCowBody(c); return Math.atan2(b.y - h.y, b.x - h.x); };
  return m;
}

it('커서 없음(모바일·키보드): 사거리 안 가까운 적, 바라보는 쪽 우선 / 없으면 그대로', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    m.input.mouseScreen = null;
    h.facing = 0;
    expect(m.aim()).toBe(null);
    expect(h.facing).toBe(0);
    const behind = m.place(-150, 0), front = m.place(180, 30);
    m.place(900, 0); // 사거리 밖
    expect(m.aim()).toBe(front); // 뒤가 더 가깝지만 바라보는 쪽 우선
    expect(h.facing).toBeCloseTo(m.angleTo(front), 5);
    expect(h.aimX).toBe(front.x);
    m.game.cows = [behind];
    expect(m.aim()).toBe(behind); // 앞에 없으면 뒤라도
  } finally { env.restore(); }
});

it('PC: 커서 방향 ±15° 안의 적에 흡착, 멀리 벗어나면 커서 그대로 / 자동 조준 끄면 커서 그대로 / 순간이동은 흡착 안 함', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const c = m.place(200, 40);
    // 커서: 주인공 오른쪽 (적과 약 11° 차이)
    const sx = m.screenToWorld(0, 0); // 화면 (0,0)의 월드 좌표 (테스트 화면은 줌 1) → 화면 좌표 = 월드 - 이 값
    const screenOf = (wx, wy) => ({ x: wx - sx.x, y: wy - sx.y });
    m.input.mouseScreen = screenOf(h.x + 300, h.y);
    expect(m.aim()).toBe(c);
    expect(h.facing).toBeCloseTo(m.angleTo(c), 5);
    m.input.mouseScreen = screenOf(h.x, h.y - 300); // 위쪽 - 적과 90° 이상 차이
    expect(m.aim()).toBe(null);
    expect(h.facing).toBeCloseTo(-Math.PI / 2, 2);
    m.input.mouseScreen = screenOf(h.x + 300, h.y);
    m.game.releaseMeta.autoAim = false;
    expect(m.aim()).toBe(null);
    expect(h.facing).toBeCloseTo(0, 2);
    m.game.releaseMeta.autoAim = true;
    expect(m.aim('free')).toBe(null); // 순간이동
    expect(h.facing).toBeCloseTo(0, 2);
  } finally { env.restore(); }
});

it('G로 자동 조준 켜기/끄기 (기록에 남음)', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    expect(m.autoAimOn()).toBe(true);
    env.key('g'); env.key('g', false);
    expect(m.autoAimOn()).toBe(false);
    env.key('g'); env.key('g', false);
    expect(m.autoAimOn()).toBe(true);
  } finally { env.restore(); }
});
