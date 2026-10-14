// 뼈 감옥 (2026-10-14): 해골 감옥지기가 주인공 둘레에 창살 → 솟으면 못 나감, 하나 부수면 그 칸으로 나감, 투사체는 통과, 시간이 지나면 무너짐
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/data/balance.js')),
    ...(await import('../src/world/arena.js')),
    ...(await import('../src/systems/projectiles.js')),
    ...(await import('../src/systems/combat.js'))
  };
  m.ui.selectedClass = 'warrior';
  m.resetGame();
  m.game.gameState = 'playing';
  m.game.waveTransition = 1e9;
  m.game.cows = [];
  m.setObstacles([]);
  m.dev.god = true;
  return m;
}

it('뼈 감옥: 창살 10개가 둘레에 솟고, 솟으면 못 나가고, 하나 부수면 그 칸으로 나가고, 시간이 지나면 무너짐', async () => {
  const env = installBrowserEnv({ seed: 5 });
  try {
    const m = await boot();
    const h = m.game.hero, cx = m.PEN.size / 2, cy = m.PEN.size / 2, P = m.PRISON;
    m.Body.setPosition(h.body, { x: cx, y: cy }); h.x = cx; h.y = cy;
    const j = new m.Monster(0.4, 'skeletonJailer', { pos: { x: cx + 250, y: cy } }); j.prisonCd = 0;
    m.game.cows.push(j);
    let bars = [];
    for (let i = 0; i < 120 && bars.length < P.bars; i++) { m.fixedUpdate(1 / 60); bars = m.game.cows.filter((c) => c.kind === 'boneBar'); }
    expect(bars.length).toBe(P.bars);
    const pr = bars[0].prison;
    bars.forEach((b) => expect(Math.hypot(b.x - pr.x, b.y - pr.y)).toBeCloseTo(P.radius, 0));
    j.state = 'dead'; // 감옥지기는 빼고 (다시 걸지 않게)
    m.game.cows = m.game.cows.filter((c) => c !== j);
    for (let i = 0; i < Math.ceil(P.warn * 60) + 5; i++) m.fixedUpdate(1 / 60);
    expect(bars.every((b) => b.risen)).toBe(true);

    // 오른쪽으로 계속 걸어도 감옥 밖으로 못 나감
    m.Body.setPosition(h.body, { x: pr.x, y: pr.y }); h.x = pr.x; h.y = pr.y;
    for (let i = 0; i < 40; i++) { m.Body.setVelocity(h.body, { x: 4, y: 0 }); m.fixedUpdate(1 / 60); }
    expect(Math.hypot(h.x - pr.x, h.y - pr.y)).toBeLessThan(P.radius);

    // 투사체는 창살을 지나감 (몬스터 화살이 감옥 밖에서 안으로)
    m.game.projectiles = [];
    m.Body.setPosition(h.body, { x: pr.x, y: pr.y }); h.x = pr.x; h.y = pr.y; // 가운데에서 맞게
    m.spawnProjectile({ kind: 'arrow', x: pr.x + 200, y: pr.y, dirX: -1, dirY: 0, speed: 600, range: 400, radius: 6, packet: { phys: 10 }, color: '#fff' });
    let reached = false;
    for (let i = 0; i < 40 && m.game.projectiles.length; i++) { m.updateProjectiles(1 / 60); const p = m.game.projectiles[0]; if (p && p.x < pr.x + P.radius - 15) reached = true; }
    expect(reached).toBe(true);

    // 오른쪽 창살(각도 0)을 부수면 그쪽으로 나갈 수 있음
    const right = bars.find((b) => b.barAngle === 0);
    m.killCow(right);
    m.Body.setPosition(h.body, { x: pr.x, y: pr.y }); h.x = pr.x; h.y = pr.y;
    for (let i = 0; i < 40; i++) { m.Body.setVelocity(h.body, { x: 4, y: 0 }); m.fixedUpdate(1 / 60); }
    expect(h.x - pr.x).toBeGreaterThan(P.radius);

    // 시간이 지나면 전부 무너짐 (경험치 없음)
    const exp = h.exp, lv = h.level;
    for (let i = 0; i < Math.ceil(P.duration * 60) + 30; i++) m.fixedUpdate(1 / 60);
    expect(m.game.cows.filter((c) => c.kind === 'boneBar').length).toBe(0);
    expect(h.exp === exp && h.level === lv).toBe(true);
  } finally { env.restore(); }
}, 60000);

it('해골 감옥지기: 사거리 안이면 뼈 창을 쏘고, 주인공이 갇히면 더 빠르게', async () => {
  const env = installBrowserEnv({ seed: 6 });
  try {
    const m = await boot();
    const h = m.game.hero, cx = m.PEN.size / 2, cy = m.PEN.size / 2;
    m.Body.setPosition(h.body, { x: cx, y: cy }); h.x = cx; h.y = cy;
    const j = new m.Monster(0.4, 'skeletonJailer', { pos: { x: cx + 250, y: cy } }); j.prisonCd = 99; j.spearCd = 0;
    m.game.cows.push(j); m.game.projectiles = [];
    let shots = 0;
    for (let i = 0; i < 60 * 3; i++) { const n = m.game.projectiles.length; m.fixedUpdate(1 / 60); if (m.game.projectiles.length > n) shots++; }
    expect(shots).toBeGreaterThanOrEqual(1);
    expect(shots).toBeLessThanOrEqual(2); // 평소엔 느리게 (2.6초마다)
  } finally { env.restore(); }
}, 60000);
