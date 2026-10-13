// 구조물 (2026-10-14): 배치 규칙, 위치 밀어내기, 투사체 막기, 몬스터가 둘레로 비켜 감
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/world/arena.js')),
    ...(await import('../src/systems/obstacles.js')),
    ...(await import('../src/systems/projectiles.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/data/obstacles.js')),
    ...(await import('../src/data/maps.js'))
  };
  m.ui.selectedClass = 'warrior';
  m.resetGame();
  m.game.gameState = 'playing';
  m.game.waveTransition = 1e9;
  m.dev.god = true;
  return m;
}

it('배치: 맵마다 정한 개수 안에서, 시작 자리를 비우고 서로 띄움', async () => {
  const env = installBrowserEnv({ seed: 7 });
  try {
    const m = await boot();
    const R = m.OBSTACLE_RULES, start = { x: m.PEN.size * m.MAPS.ranch.start.x, y: m.PEN.size * m.MAPS.ranch.start.y };
    const want = Object.values(m.MAPS.ranch.obstacles).reduce((a, b) => a + b, 0);
    expect(m.obstacles.length).toBeGreaterThan(want * 0.6);
    expect(m.obstacles.length).toBeLessThanOrEqual(want);
    m.obstacles.forEach((o) => {
      const cx = (o.ax + o.bx) / 2, cy = (o.ay + o.by) / 2;
      expect(Math.hypot(cx - start.x, cy - start.y)).toBeGreaterThanOrEqual(R.startClear);
      m.obstacles.forEach((q) => { if (q !== o) expect(Math.hypot((q.ax + q.bx) / 2 - cx, (q.ay + q.by) / 2 - cy)).toBeGreaterThanOrEqual(R.apart); });
    });
  } finally { env.restore(); }
});

it('위치 밀어내기: clampToPen은 구조물 안의 점을 바깥으로 / 투사체는 구조물에 막힘', async () => {
  const env = installBrowserEnv({ seed: 7 });
  try {
    const m = await boot();
    m.setObstacles([{ kind: 'hay', ax: 600, ay: 600, bx: 600, by: 600, r: 30, seed: 1 }]);
    const p = m.clampToPen(605, 600, 12);
    expect(Math.hypot(p.x - 600, p.y - 600)).toBeGreaterThanOrEqual(30 + 12 - 0.01);
    m.game.projectiles = [];
    m.spawnProjectile({ kind: 'arrow', x: 500, y: 600, dirX: 1, dirY: 0, speed: 600, range: 400, radius: 6, packet: { phys: 10 }, color: '#fff' });
    for (let i = 0; i < 30 && m.game.projectiles.length; i++) m.updateProjectiles(1 / 60);
    expect(m.game.projectiles.length).toBe(0); // 사거리(400) 전에 건초더미(570)에서 끝
  } finally { env.restore(); }
});

it('비켜 가기: 주인공과 사이에 건초더미가 있어도 몬스터가 둘레로 돌아서 다가옴', async () => {
  const env = installBrowserEnv({ seed: 7 });
  try {
    const m = await boot();
    const h = m.game.hero, cx = m.PEN.size / 2, cy = m.PEN.size / 2;
    m.setObstacles([{ kind: 'hay', ax: cx, ay: cy, bx: cx, by: cy, r: 30, seed: 1 }]);
    m.game.cows = [];
    const c = new m.Monster(0.4, 'normal', { pos: { x: cx + 150, y: cy }, hunt: true });
    m.game.cows.push(c);
    const place = () => { m.Body.setPosition(h.body, { x: cx - 150, y: cy }); h.x = cx - 150; h.y = cy; };
    place();
    let best = Infinity;
    for (let i = 0; i < 600; i++) { place(); m.fixedUpdate(1 / 60); best = Math.min(best, c.x); }
    expect(best).toBeLessThan(cx - 40); // 건초더미(가운데)를 지나 주인공 쪽으로
  } finally { env.restore(); }
}, 60000);
