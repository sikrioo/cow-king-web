// 아이템 데이터 규칙: 장비는 순수 데이터(JSON 왕복 시 그대로) + 고유 uid
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

it('장비는 uid가 겹치지 않고 JSON으로 그대로 직렬화된다', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game } = await import('../src/state.js');
    const { resetGame } = await import('../src/game.js');
    const { rollGearItem } = await import('../src/systems/gear.js');
    const gear = [];
    for (let i = 0; i < 3; i++) { resetGame(); gear.push(...Object.values(game.hero.equipment).filter((g) => g && g !== 'LOCKED'), ...game.hero.inventory); }
    for (let i = 0; i < 200; i++) gear.push(rollGearItem());
    const uids = gear.map((g) => g.uid);
    expect(uids.every((u) => Number.isInteger(u) && u > 0)).toBe(true);
    expect(new Set(uids).size).toBe(uids.length);
    gear.forEach((g) => expect(JSON.parse(JSON.stringify(g))).toEqual(g));
  } finally {
    env.restore();
  }
});
