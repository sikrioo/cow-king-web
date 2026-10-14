// 개발자 패널 시나리오·소환 (2026-10-14): 모든 몬스터가 소환 목록에 있고, 시나리오는 그 상황을 만든 뒤 웨이브를 멈춤
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

it('소환 목록: 부서지는 물체(prop)를 뺀 모든 몬스터가 한 번씩 / 시나리오 몬스터는 실제 종류', async () => {
  const { MONSTERS } = await import('../src/data/monsters.js');
  const { DEV_SPAWN_GROUPS, SCENARIOS } = await import('../src/data/scenarios.js');
  const listed = DEV_SPAWN_GROUPS.flatMap((g) => g.kinds);
  const want = Object.keys(MONSTERS).filter((k) => !MONSTERS[k].prop);
  expect([...listed].sort()).toEqual([...want].sort());
  SCENARIOS.forEach((s) => s.spawns.forEach((sp) => expect(MONSTERS[sp.kind], `${s.id}: ${sp.kind}`).toBeTruthy()));
});

it('시나리오: 몬스터를 치우고 막을 맞춘 뒤 정한 수만큼 소환, 웨이브는 멈췄다가 재개', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const m = { ...(await import('../src/state.js')), ...(await import('../src/game.js')), ...(await import('../src/systems/dev.js')), ...(await import('../src/data/scenarios.js')) };
    m.ui.selectedClass = 'warrior';
    m.resetGame();
    m.game.gameState = 'playing';
    for (const sc of m.SCENARIOS) {
      m.devScenario(sc.id);
      const n = sc.spawns.reduce((s, sp) => s + sp.n, 0);
      expect(m.game.cows.length, sc.id).toBe(n);
      expect(m.game.act, sc.id).toBe(sc.act);
      expect(m.game.waveTransition).toBe(Infinity);
      for (let i = 0; i < 30; i++) m.fixedUpdate(1 / 60); // 예외 없이 돌아감
    }
    m.devKillAll();
    m.devResumeWaves();
    for (let i = 0; i < 60; i++) m.fixedUpdate(1 / 60);
    expect(m.game.cows.length).toBeGreaterThan(0); // 다음 웨이브가 나옴
  } finally { env.restore(); }
}, 60000);
