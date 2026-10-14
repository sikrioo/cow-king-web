// 타격 옵션 (2026-10-12): 강타·밀쳐내기·생명력 흡수·마나 흡수 - 명중한 물리 타격마다, 맞은 몬스터마다 (combat.applyOnHit)
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/combat.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/data/balance.js'))
  };
  m.resetGame(); m.game.waveTransition = 999;
  return m;
}

it('흡수: 준 피해의 비율만큼 체력·마나 회복(최대치까지), 물리 면역(0)이면 없음', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const c = new m.Monster(0.4, 'normal'); c.hp = c.maxHp = 100000;
    h.gearOnHit = { crushBlow: 0, knockback: 0, lifeLeech: 0.05, manaLeech: 0.04 };
    h.hp = 10; h.mana = 0;
    m.applyOnHit(c, 200);
    expect(h.hp).toBe(20);
    expect(h.mana).toBe(8);
    m.applyOnHit(c, 0);
    expect(h.hp).toBe(20);
    m.applyOnHit(c, 10000000);
    expect(h.hp).toBe(h.maxHp + h.bonusMaxHp + h.gearMaxHp);
    expect(h.mana).toBe(h.maxMana);
  } finally { env.restore(); }
});

it('강타: 현재 체력의 1/4 (보스 1/8), 밀쳐내기: 경직 - 보스는 면역', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    h.gearOnHit = { crushBlow: 1, knockback: 1, lifeLeech: 0, manaLeech: 0 };
    const c = new m.Monster(0.4, 'normal'); c.hp = c.maxHp = 1000;
    m.applyOnHit(c, 1);
    expect(c.hp).toBe(1000 - Math.floor(1000 * m.ON_HIT.crushFrac));
    expect(c.ccKind).toBe('stagger');
    expect(c.stunTimer).toBeGreaterThan(0);
    const b = new m.Monster(1, 'boss'); b.hp = b.maxHp = 1000;
    m.applyOnHit(b, 1);
    expect(b.hp).toBe(1000 - Math.floor(1000 * m.ON_HIT.crushBossFrac));
    expect(b.stunTimer || 0).toBe(0);
  } finally { env.restore(); }
});

it('신성 피해: 해골·영혼·악마에게 +50%, 일반 카우는 그대로 (전사 신성 스킬)', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const { damageCowPacket } = await import('../src/systems/elementCombat.js');
    const { HOLY } = await import('../src/data/elements.js');
    const cow = new m.Monster(0.4, 'normal'); cow.hp = cow.maxHp = 100000;
    const skel = new m.Monster(0.4, 'skeleton'); skel.hp = skel.maxHp = 100000;
    expect(damageCowPacket(cow, { holy: 100 })).toBe(100);
    expect(damageCowPacket(skel, { holy: 100 })).toBe(Math.round(100 * (1 + HOLY.undeadBonus)));
  } finally { env.restore(); }
});

it('회복 옵션: 체력 회복은 초당 고정(체력은 정수 - 소수는 쌓았다가), 마나 회복은 기본 회복에 %', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    h.devStats = { lifeRegen: 6, manaRegenPct: 1 };
    (await import('../src/systems/gear.js')).recalcGearStats();
    m.game.cows = [];
    h.hp = 50; h.mana = 0;
    for (let i = 0; i < 120; i++) m.fixedUpdate(1 / 60); // 2초
    expect(Number.isInteger(h.hp)).toBe(true);
    expect(h.hp).toBe(50 + 12);
    expect(h.mana).toBeCloseTo(h.manaRegen * 2 * 2, 0); // +100% = 두 배
  } finally { env.restore(); }
});
