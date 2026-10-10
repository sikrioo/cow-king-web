// 장비 스킬 레벨 옵션: 모든/직업/원소/무기 특수기 - 배운 스킬에만, 카드 최대 레벨을 넘어감(장비 몫은 제한 없음), 카드는 배운 레벨만 봄, 강화해도 안 오름
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot(cls) {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/gear.js')),
    ...(await import('../src/systems/levelCards.js')),
    ...(await import('../src/data/skills.js')),
    ...(await import('../src/data/items.js')),
    ...(await import('../src/data/affixes.js')),
    ...(await import('../src/util.js'))
  };
  m.ui.selectedClass = cls;
  m.resetGame();
  m.item = (category, stats, extra = {}) => ({ category, handedness: 'one', rarity: 'rare', stats, upgradeLevel: 0, identified: true, uid: m.nextItemUid(), ...extra });
  return m;
}

it('마법사: 모든 스킬 + 마법사 스킬 + 화염 스킬 - 배운 화염 스킬만 오르고, 최대 레벨을 넘어감', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero;
    h.skillLevels.fireball = m.SKILL_MAX_LEVEL;
    m.equipItem(m.item('accessory', { skillAll: 1, skillFire: 2 }, { variant: 'amulet' }), { silent: true });
    m.equipItem(m.item('weapon', { skillSorc: 1 }, { variant: 'sword' }), { silent: true });
    expect(m.learnedLevel(h, 'fireball')).toBe(m.SKILL_MAX_LEVEL);
    expect(m.skillLevel(h, 'fireball')).toBe(m.SKILL_MAX_LEVEL + 4); // 1 + 2 + 1, 상한 없음
    expect(m.skillLevel(h, 'frostnova')).toBe(0);                  // 안 배운 스킬엔 안 붙음
    h.skillLevels.frostnova = 1;
    expect(m.skillLevel(h, 'frostnova')).toBe(1 + 1 + 1);           // 냉기는 화염 옵션 안 받음
    expect(m.skillMul(h, 'fireball', 'damage')).toBeCloseTo(1 + m.SKILL_LEVEL_UP.fireball.damage * (m.SKILL_MAX_LEVEL + 3));
    // 카드는 배운 레벨만 봄: 화염구는 Lv5라 강화 카드가 더 안 나옴
    for (let i = 0; i < 30; i++) expect(m.rollCards().some((c) => c.id === 'fireball')).toBe(false);
  } finally { env.restore(); }
});

it('전사: 전사 스킬은 물리 스킬에, 무기 특수기 옵션은 그 장비 종류의 특수기에만', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot('warrior');
    const h = m.game.hero;
    h.skillLevels.spinblade = 1; h.skillLevels.piercespear = 1; h.skillLevels.shieldbounce = 1;
    m.equipItem(m.item('weapon', { skillWarrior: 2, skillWeapon: 3 }, { variant: 'sword' }), { slot: 'weaponMain', silent: true });
    expect(m.skillLevel(h, 'attack')).toBe(1 + 2);
    expect(m.skillLevel(h, 'spinblade')).toBe(1 + 2 + 3);
    expect(m.skillLevel(h, 'piercespear')).toBe(1 + 2); // 창 특수기는 검 옵션 안 받음
    expect(m.skillLevel(h, 'teleport')).toBe(0);
    // 강화해도 스킬 옵션은 그대로
    vi.spyOn(Math, 'random').mockReturnValue(0);
    h.materials = 5;
    m.tryUpgradeSlot(m.GEAR_SLOTS.indexOf('weaponMain'));
    expect(h.equipment.weaponMain.upgradeLevel).toBe(1); // 강화는 성공 (옵션 중 스킬 옵션만 있으면 베이스만 오름)
    expect(h.equipment.weaponMain.stats.skillWarrior).toBe(2);
    expect(h.equipment.weaponMain.stats.skillWeapon).toBe(3);
  } finally { vi.restoreAllMocks(); env.restore(); }
});

it('접사 드랍 차등: 무기 특수기 > 원소 > 직업 > 모든 스킬 (1티어 가중치), 모든 스킬은 장신구에만', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot('warrior');
    const w = (fam) => m.AFFIXES.find((a) => a.family === fam && a.tier === 1).weight;
    expect(w('skillWeapon')).toBeGreaterThan(w('skillFire'));
    expect(w('skillFire')).toBeGreaterThan(w('skillSorc'));
    expect(w('skillSorc')).toBeGreaterThan(w('skillAll'));
    expect(m.AFFIXES.find((a) => a.family === 'skillAll').types).toEqual(['accessory']);
  } finally { env.restore(); }
});
