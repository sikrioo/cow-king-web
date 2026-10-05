// 무기 기본 속성: 종류별 피해 범위/속도, 등급·강화·양손 배율, 쌍수 번갈아 휘두르기, 피해 굴림 범위
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
    ...(await import('../src/data/items.js'))
  };
}
const weapon = (variant, extra = {}) => ({ category: 'weapon', handedness: 'one', rarity: 'normal', upgradeLevel: 0, variant, stats: {}, ...extra });

it('느린 무기일수록 한 방이 세고, 초당 피해는 비슷하다', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const list = Object.keys(m.WEAPON_BASE).map((v) => ({ v, ...m.weaponStats(weapon(v)) }));
    const bySpeed = [...list].sort((a, b) => a.interval - b.interval);
    for (let i = 1; i < bySpeed.length; i++) expect((bySpeed[i].min + bySpeed[i].max)).toBeGreaterThan(bySpeed[i - 1].min + bySpeed[i - 1].max);
    const dps = list.map((s) => (s.min + s.max) / 2 / s.interval);
    expect(Math.max(...dps) / Math.min(...dps)).toBeLessThan(1.1);
    expect(m.weaponStats({ category: 'shield', rarity: 'normal', stats: {} })).toBe(null);
  } finally { env.restore(); }
});

it('등급·강화는 피해만, 양손은 피해↑ 속도↓', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const base = m.weaponStats(weapon('sword'));
    const leg = m.weaponStats(weapon('sword', { rarity: 'legendary', upgradeLevel: 1 }));
    expect(leg.max).toBe(Math.round(m.WEAPON_BASE.sword.max * m.RARITY_DEF.legendary.mult * 1.25));
    expect(leg.interval).toBe(base.interval);
    const two = m.weaponStats(weapon('sword', { handedness: 'two' }));
    expect(two.max).toBe(Math.round(m.WEAPON_BASE.sword.max * m.TWO_HAND_DAMAGE_MULT));
    expect(two.interval).toBeGreaterThan(base.interval);
  } finally { env.restore(); }
});

it('쌍수면 주무기/보조무기를 번갈아 쓰고, 피해는 무기 범위 + 공격력', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    m.resetGame();
    const h = m.game.hero;
    h.equipment.weaponMain = weapon('mace');
    h.equipment.weaponOff = weapon('dagger');
    m.recalcGearStats();
    const cds = [];
    for (let i = 0; i < 4; i++) { h.attackCooldown = 0; m.tryPlayerAttack(); cds.push(+h.attackCooldown.toFixed(4)); }
    expect(cds[0]).not.toBe(cds[1]);
    expect(cds[0]).toBe(cds[2]);
    expect(cds[1]).toBe(cds[3]);
    const ws = h.weaponStats.main;
    for (let i = 0; i < 200; i++) {
      const d = m.heroHitDamage(ws) - h.attackBonus - h.gearAtkPower;
      expect(d >= ws.min && d <= ws.max && Number.isInteger(d)).toBe(true);
    }
  } finally { env.restore(); }
});

it('한손 무기는 주무기/보조무기 칸을 골라 장착하고, 바뀐 장비는 가방으로', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    m.resetGame();
    const h = m.game.hero;
    const main0 = h.equipment.weaponMain, shield = h.equipment.weaponOff; // 시작: 한손무기 + 방패
    const a = weapon('dagger', { identified: true }), b = weapon('mace', { identified: true });
    h.inventory.push(a, b);
    m.equipFromInventory(h.inventory.indexOf(a), 'weaponOff');
    expect(h.equipment.weaponMain).toBe(main0);
    expect(h.equipment.weaponOff).toBe(a);
    expect(h.inventory).toContain(shield);
    m.equipFromInventory(h.inventory.indexOf(b), 'weaponMain');
    expect(h.equipment.weaponMain).toBe(b);
    expect(h.equipment.weaponOff).toBe(a);
    expect(h.inventory).toContain(main0);
    expect(h.weaponStats.off).not.toBe(null); // 쌍수
  } finally { env.restore(); }
});
