// 개발자 모드 기능: 레벨, 무적, 웨이브 이동, 소환, 장비 지급
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

it('개발자 기능', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game, dev } = await import('../src/state.js');
    const { resetGame, fixedUpdate } = await import('../src/game.js');
    const d = await import('../src/systems/dev.js');
    const { hitPlayer } = await import('../src/systems/combat.js');
    const { MAX_LEVEL } = await import('../src/data/balance.js');
    const { isDevMode } = await import('../src/config.js');
    expect(isDevMode()).toBe(true); // 테스트/개발 서버에서는 켜짐
    resetGame(); game.gameState = 'playing';
    const h = game.hero;

    d.devMaxLevel();
    expect(h.level).toBe(MAX_LEVEL);

    d.devToggle('god');
    h.hp = 50; h.invuln = 0;
    hitPlayer(h.x + 5, h.y, 999);
    expect(h.hp).toBe(50);
    d.devToggle('god');

    d.devToggle('infiniteMana'); h.mana = 0; fixedUpdate(1 / 60);
    expect(h.mana).toBe(h.maxMana);
    d.devToggle('infiniteMana');
    expect(dev.infiniteMana).toBe(false);

    d.devJumpWave(4);
    for (let i = 0; i < 60 && game.wave < 4; i++) fixedUpdate(1 / 60);
    expect(game.wave).toBe(4);
    expect(game.cows.length).toBeGreaterThan(0);

    d.devKillAll();
    expect(game.cows.length).toBe(0);
    d.devSpawn('pyro');
    expect(game.cows[0].kind).toBe('pyro');

    const n = h.inventory.length;
    d.devGiveGear('legendary');
    expect(h.inventory.length).toBe(n + 1);
    expect(h.inventory[n].rarity).toBe('legendary');
    expect(h.inventory[n].identified).toBe(true);
  } finally {
    env.restore();
  }
});
