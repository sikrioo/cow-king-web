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

it('버리기: 발밑에 떨어지고, 바로 다시 줍지 않으며, 벗어났다 돌아오면 다시 주움', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game } = await import('../src/state.js');
    const { resetGame } = await import('../src/game.js');
    const { discardFromInventory, updateItems } = await import('../src/systems/loot.js');
    const { Body } = await import('../src/core/physics.js');
    resetGame(); game.gameState = 'playing';
    const h = game.hero;
    const gear = h.inventory[0];
    const n = h.inventory.length;
    discardFromInventory(0);
    expect(h.inventory.length).toBe(n - 1);
    expect(game.items.some((it) => it.gearData === gear)).toBe(true);
    updateItems(1 / 60);
    expect(h.inventory).not.toContain(gear); // 바로 다시 줍지 않음
    const move = (x, y) => { Body.setPosition(h.body, { x, y }); h.x = x; h.y = y; };
    const ox = h.x, oy = h.y;
    move(ox + 120, oy); updateItems(1 / 60);
    move(ox, oy); updateItems(1 / 60);
    expect(h.inventory).toContain(gear);
  } finally {
    env.restore();
  }
});
