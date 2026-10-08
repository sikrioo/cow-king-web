// 물리 저항/면역: 근접·스킬·물리 투사체 모두 같은 규칙 (resist.phys, 1이면 면역 → 피해 0 + '면역'), 원소는 그대로 들어감
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

it('물리 면역/저항', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game } = await import('../src/state.js');
    const { resetGame } = await import('../src/game.js');
    const { MONSTERS } = await import('../src/data/monsters.js');
    const { Monster } = await import('../src/entities/monster.js');
    const combat = await import('../src/systems/combat.js');
    const { damageCowPacket } = await import('../src/systems/elementCombat.js');
    const { whirlwindHit, leapHitCow } = await import('../src/systems/skills.js');
    resetGame();
    MONSTERS.tough.resist = { phys: 1 };
    const c = new Monster(0.4, 'tough'); c.hp = c.maxHp = 1000; game.cows.push(c);

    combat.damageCow(c, 50);
    combat.skillDamageCow(c, 50, 1);
    whirlwindHit(c);
    leapHitCow(c);
    expect(damageCowPacket(c, { phys: 50 })).toBe(0);
    expect(c.hp).toBe(1000);
    expect(game.floatTexts.some((f) => f.text === '면역')).toBe(true);
    expect(damageCowPacket(c, { phys: 50, fire: 40 })).toBe(40); // 원소는 들어감

    MONSTERS.tough.resist = { phys: 0.5 };
    c.hp = 1000;
    combat.damageCow(c, 50);
    expect(c.hp).toBe(975);
    expect(combat.physDamageTo(c, 1)).toBe(1); // 저항이어도 최소 1
    delete MONSTERS.tough.resist;
  } finally { env.restore(); }
});
