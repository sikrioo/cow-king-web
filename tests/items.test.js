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

it('옵션 굴림: 낮은 값이 흔하고 최상은 드묾(꽝/최상 표시), 원소 피해 옵션은 무기에만', async () => {
  const env = installBrowserEnv({ seed: 9 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { rollGearItem } = await import('../src/systems/gear.js');
    const { rollTag, optionText } = await import('../src/ui/itemView.js');
    const { STAT_DEF, ROLL_QUALITY } = await import('../src/data/items.js');
    let n = 0, dud = 0, top = 0;
    for (let i = 0; i < 1500; i++) {
      const g = rollGearItem();
      Object.keys(g.stats).forEach((k) => {
        if (STAT_DEF[k].element) expect(g.category).toBe('weapon');
        const q = g.quality[k];
        expect(q).toBeGreaterThanOrEqual(0); expect(q).toBeLessThanOrEqual(1);
        n++; if (q <= ROLL_QUALITY.dud) dud++; if (q >= ROLL_QUALITY.top) top++;
      });
    }
    expect(dud / n).toBeGreaterThan(top / n * 2); // 꽝이 최상보다 훨씬 흔함
    expect(top).toBeGreaterThan(0);
    const g = { stats: { health: 30 }, quality: { health: 0.95 } };
    expect(rollTag(g, 'health').tag).toBe('최상');
    expect(optionText(g, 'health', 30)).toContain('최상');
    expect(rollTag({ stats: { health: 1 } }, 'health')).toBe(null); // quality 없는 장비
    let weaponElem = 0;
    for (let i = 0; i < 400; i++) { const w = rollGearItem({ category: 'weapon' }); if (Object.keys(w.stats).some((k) => STAT_DEF[k].element)) weaponElem++; }
    expect(weaponElem).toBeGreaterThan(0);
  } finally { env.restore(); }
});
