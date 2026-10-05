// 방어력(피해 감소) 규칙: 방어구 기본값 × 등급 × 강화, 감소율 공식/상한, 피격 시 적용
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  return {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/gear.js')),
    ...(await import('../src/systems/combat.js')),
    ...(await import('../src/data/items.js')),
    ...(await import('../src/data/balance.js'))
  };
}

it('방어구만 기본 방어력이 있고 등급·강화에 비례한다', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const g = (category, rarity, upgradeLevel = 0) => ({ category, rarity, upgradeLevel, stats: {} });
    expect(m.gearArmor(g('armor', 'normal'))).toBe(m.GEAR_BASE_ARMOR.armor);
    expect(m.gearArmor(g('weapon', 'legendary'))).toBe(0);
    expect(m.gearArmor(g('accessory', 'rare'))).toBe(0);
    expect(m.gearArmor(g('shield', 'legendary'))).toBe(Math.round(m.GEAR_BASE_ARMOR.shield * m.RARITY_DEF.legendary.mult));
    expect(m.gearArmor(g('boots', 'normal', 2))).toBe(Math.round(m.GEAR_BASE_ARMOR.boots * m.UPGRADE_STAT_MULT ** 2));
    for (const c of Object.keys(m.GEAR_BASE_ARMOR)) for (const r of Object.keys(m.RARITY_DEF)) {
      expect(Number.isInteger(m.gearArmor(g(c, r, 3)))).toBe(true);
    }
  } finally {
    env.restore();
  }
});

it('감소율 = 방어력/(방어력+K), 상한 있음', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    expect(m.armorReduction(0)).toBe(0);
    expect(m.armorReduction(100)).toBeCloseTo(100 / (100 + m.ARMOR_K));
    expect(m.armorReduction(1e6)).toBe(m.ARMOR_MAX_REDUCTION);
  } finally {
    env.restore();
  }
});

it('장착 방어구 합계가 주인공에 반영되고, 블락/회피 실패 시 피해가 줄어든다(최소 1)', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    m.resetGame();
    const h = m.game.hero;
    const expected = Object.values(h.equipment).filter((x) => x && x !== 'LOCKED').reduce((s, x) => s + m.gearArmor(x), 0);
    expect(h.gearArmor).toBe(expected);
    expect(h.gearArmor).toBeGreaterThan(0); // 시작 방패
    expect(h.armorReduction).toBe(m.armorReduction(expected));

    // 회피/블락이 절대 안 나게 해서 순수 피해만 확인
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    h.hp = 100; h.invuln = 0; h.alive = true;
    m.hitPlayer(h.x + 10, h.y, 30);
    expect(h.hp).toBe(100 - Math.max(1, Math.round(30 * (1 - h.armorReduction))));
    h.armorReduction = m.ARMOR_MAX_REDUCTION; h.hp = 100; h.invuln = 0;
    m.hitPlayer(h.x + 10, h.y, 1);
    expect(h.hp).toBe(99); // 최소 1
    rnd.mockRestore();
  } finally {
    env.restore();
  }
});
