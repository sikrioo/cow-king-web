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

it('개발자 소환: 고른 면역이 개체에만 붙고(종류 기본값은 그대로), 원소 테스트 무기로 전사가 면역 몬스터를 잡음', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game } = await import('../src/state.js');
    const { resetGame } = await import('../src/game.js');
    const { devSpawn } = await import('../src/systems/dev.js');
    const { resistOf } = await import('../src/util.js');
    const { equipFromInventory } = await import('../src/systems/gear.js');
    const { SKILLS } = await import('../src/systems/skills.js');
    const { Body } = await import('../src/core/physics.js');
    resetGame(); game.waveTransition = 999;
    const h = game.hero;

    const c = devSpawn('burning', ['phys', 'cold']);
    expect(resistOf(c, 'phys')).toBe(1);
    expect(resistOf(c, 'cold')).toBe(1);
    expect(resistOf(c, 'fire')).toBe(0.5); // 버닝 카우 기본 화염 저항 그대로
    expect(resistOf(devSpawn('burning'), 'phys')).toBe(0); // 다른 개체는 영향 없음

    // 원소 테스트 무기 4종이 가방에
    const fireIdx = h.inventory.findIndex((it) => it.stats.fireDmg);
    expect(['fireDmg', 'coldDmg', 'lightningDmg', 'poisonDmg'].every((k) => h.inventory.some((it) => it.stats[k]))).toBe(true);
    equipFromInventory(fireIdx, 'weaponMain');
    expect(h.gearElemDmg.fire).toBeGreaterThan(0);

    // 물리 면역 몬스터 앞에서 기본 공격 → 화염 피해만 들어감
    game.cows = [c];
    c.hp = c.maxHp = 100000; c.speed = 0;
    const p = { x: h.x + 40, y: h.y }; Body.setPosition(c.body, p); c.x = p.x; c.y = p.y;
    h.facing = 0;
    SKILLS.attack.try();
    expect(c.hp).toBeLessThan(100000);
    expect(c.burn.timer).toBeGreaterThan(0);
  } finally { env.restore(); }
});
