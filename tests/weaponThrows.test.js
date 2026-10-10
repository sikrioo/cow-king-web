// 무기 특수기(던진 무기 - systems/weaponThrows.js) + 방패 마스터리: 해금(마스터리 Lv3), 무기 조건, 던진 동안 기본 공격 못 함, 종류별 규칙
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/levelCards.js')),
    ...(await import('../src/systems/weaponThrows.js')),
    ...(await import('../src/systems/gear.js')),
    ...(await import('../src/systems/combat.js')),
    ...(await import('../src/data/skills.js')),
    ...(await import('../src/data/items.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/world/arena.js')),
    ...(await import('../src/util.js'))
  };
  m.ui.selectedClass = 'warrior';
  m.resetGame();
  m.game.gameState = 'playing';
  m.game.waveTransition = 999;
  m.game.cows.length = 0;
  const h = m.game.hero;
  m.Body.setPosition(h.body, { x: m.PEN.size / 2, y: m.PEN.size / 2 }); h.x = m.PEN.size / 2; h.y = m.PEN.size / 2;
  h.mana = 999; h.facing = 0;
  m.wield = (variant) => {
    const two = m.TWO_HAND_ONLY.includes(variant);
    m.equipItem(m.rollGearItem({ category: 'weapon', handedness: two ? 'two' : 'one', rarity: 'normal', variant, identified: true, noElement: true }), { silent: true });
  };
  m.cow = (kind, dx, dy = 0, hp = 99999) => {
    const c = new m.Monster(0.4, kind);
    const p = { x: h.x + dx, y: h.y + dy };
    m.Body.setPosition(c.body, p); c.x = p.x; c.y = p.y;
    c.hp = c.maxHp = hp;
    m.game.cows.push(c);
    return c;
  };
  m.run = (sec) => { for (let i = 0; i < sec * 60; i++) m.updateThrows(1 / 60); };
  return m;
}

it('해금: 무기 마스터리 Lv3 전엔 특수기 카드가 안 나오고, Lv3부터 나옴', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const offered = () => { for (let i = 0; i < 40; i++) if (m.rollCards().some((c) => c.id === 'spinblade')) return true; return false; };
    h.masteries.sword = 2;
    expect(offered()).toBe(false);
    h.masteries.sword = m.SPECIAL_MASTERY_LEVEL;
    expect(offered()).toBe(true);
  } finally { env.restore(); }
});

it('맞는 무기가 아니면 안 써짐(마나 그대로) / 던진 동안 기본 공격 못 함, 돌아오면 다시 됨', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    const h = m.game.hero;
    m.wield('mace');
    m.trySpinBlade();
    expect(m.game.throws.length).toBe(0);
    expect(m.specialUsable(m.game.hero, 'spinblade')).toBe(false);
    m.wield('sword');
    expect(m.specialUsable(m.game.hero, 'spinblade')).toBe(true);
    const c = m.cow('normal', 120);
    const mana = h.mana;
    m.trySpinBlade();
    expect(h.mana).toBe(mana - m.SKILL_STATS.spinblade.mana);
    expect(h.weaponOut).toBe(true);
    h.attackCooldown = 0;
    m.tryPlayerAttack(() => {});
    expect(h.attackCooldown).toBe(0); // 손에 무기가 없어 휘두르지 않음
    m.run(2);
    expect(m.game.throws.length).toBe(0);
    expect(h.weaponOut).toBe(false);
    expect(c.hp).toBeLessThan(c.maxHp);
    expect(Number.isInteger(c.hp)).toBe(true);
  } finally { env.restore(); }
});

it('관통창: 지나가는 적마다 한 번 + 출혈, 돌아올 땐 안 맞음', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot();
    m.wield('spear');
    const a = m.cow('normal', 100), b = m.cow('normal', 250);
    m.tryPierceSpear();
    m.run(0.6);
    expect(a.hp).toBeLessThan(a.maxHp);
    expect(b.hp).toBeLessThan(b.maxHp);
    expect(a.bleed.timer).toBeGreaterThan(0);
    const hpA = a.hp - 0; a.bleed.timer = 0;
    m.run(2);
    expect(a.hp).toBe(hpA); // 돌아오는 창에는 안 맞음
  } finally { env.restore(); }
});

it('급소 투척: 엘리트에게 더 셈, 체력 30% 이하면 치명타', async () => {
  const env = installBrowserEnv({ seed: 4 });
  try {
    const m = await boot();
    m.wield('dagger');
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const hit = (kind, hpFrac) => {
      m.game.cows.length = 0; m.game.throws.length = 0; m.game.hero.spellCd.vitalthrow = 0; m.game.hero.weaponOut = false;
      const c = m.cow(kind, 200);
      c.hp = Math.round(c.maxHp * hpFrac);
      const before = c.hp;
      m.tryVitalThrow();
      m.run(1);
      return before - c.hp;
    };
    const normal = hit('normal', 1), elite = hit('tough', 1), crit = hit('normal', 0.2);
    expect(elite).toBeGreaterThan(normal * 1.3);
    expect(crit).toBeGreaterThan(normal * 1.8);
    m.game.cows.length = 0; m.game.hero.spellCd.vitalthrow = 0; m.game.throws.length = 0; m.game.hero.weaponOut = false;
    const mana = m.game.hero.mana;
    m.tryVitalThrow(); // 대상 없음 → 안 씀
    expect(m.game.hero.mana).toBe(mana);
  } finally { vi.restoreAllMocks(); env.restore(); }
});

it('튕기는 방패: 적 사이를 튕기고 마지막 적만 기절 / 방패 마스터리는 방패를 들었을 때만 블락', async () => {
  const env = installBrowserEnv({ seed: 5 });
  try {
    const m = await boot();
    const h = m.game.hero;
    // 시작 장비 = 한손 무기 + 방패
    expect(h.equipment.weaponOff.category).toBe('shield');
    const a = m.cow('normal', 100), b = m.cow('normal', 200), c = m.cow('normal', 300);
    m.tryShieldBounce();
    expect(h.shieldOut).toBe(true);
    m.run(2);
    [a, b, c].forEach((k) => expect(k.hp).toBeLessThan(k.maxHp));
    expect(c.stunTimer > 0 || c.ccKind === 'stun').toBe(true);
    expect(a.ccKind).toBeUndefined();
    expect(h.shieldOut).toBe(false);

    h.masteries.shield = 2;
    expect(m.masteryBonus(h, 'block')).toBeCloseTo(0.06);
    m.unequipSlot('weaponOff');
    expect(m.masteryBonus(h, 'block')).toBe(0);
  } finally { env.restore(); }
});

it('내려찍기·회전도끼·굴러가는 메이스: 피해가 들어가고 무기가 돌아옴', async () => {
  const env = installBrowserEnv({ seed: 6 });
  try {
    const m = await boot();
    const h = m.game.hero;
    m.wield('greatsword');
    const g = m.cow('normal', 200);
    h.aimX = g.x; h.aimY = g.y;
    m.trySkyfall();
    m.run(m.SKILL_STATS.skyfall.charge - 0.1);
    expect(g.hp).toBe(g.maxHp); // 충전 중엔 아직
    m.run(3);
    expect(g.hp).toBeLessThan(g.maxHp);
    expect(h.weaponOut).toBe(false);

    m.wield('axe');
    const a = m.cow('normal', 0, 150), a2 = m.cow('normal', 60, 230);
    m.tryWhirlAxe();
    m.run(3);
    expect(a.hp).toBeLessThan(a.maxHp);
    expect(a2.hp).toBeLessThan(a2.maxHp); // 번개 연쇄
    expect(h.weaponOut).toBe(false);

    m.game.cows.length = 0;
    m.wield('mace'); h.facing = 0;
    const big = m.cow('tough', 320);
    m.tryRollMace();
    m.run(4);
    expect(big.hp).toBeLessThan(big.maxHp);
    expect(h.weaponOut).toBe(false);
  } finally { env.restore(); }
});

it('특수기 원소: 검=화염(화상), 창=번개, 단검=독(중독), 메이스=냉기(둔화)', async () => {
  const env = installBrowserEnv({ seed: 7 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const fire = () => { m.wield('sword'); const c = m.cow('normal', 120); m.trySpinBlade(); m.run(2); return c; };
    expect(fire().burn.timer).toBeGreaterThan(0);
    m.game.cows.length = 0;
    m.wield('dagger'); const p = m.cow('normal', 150); h.aimX = null; m.tryVitalThrow(); m.run(1.5);
    expect(p.poison.timer).toBeGreaterThan(0);
    m.game.cows.length = 0;
    m.wield('mace'); h.facing = 0; const k = m.cow('normal', 200); m.tryRollMace(); m.run(1);
    expect(k.chillTimer).toBeGreaterThan(0);
    expect(m.SKILL_STATS.piercespear.elem).toBe('lightning');
    expect(m.SKILL_STATS.whirlaxe.elem).toBe('lightning');
    expect(m.SKILL_STATS.skyfall.elem).toBe('fire');
    expect(m.SKILL_STATS.shieldbounce.elem).toBe('cold');
  } finally { env.restore(); }
});

it('특수기는 그 무기를 들었을 때만 보임: 카드·Q/R 전환, 무기를 바꾸면 슬롯에서 빠짐', async () => {
  const env = installBrowserEnv({ seed: 8 });
  try {
    const m = await boot();
    const { cycleSkillSlot, validateSkillSlots } = await import('../src/systems/skills.js');
    const h = m.game.hero;
    h.masteries.spear = m.SPECIAL_MASTERY_LEVEL;
    m.wield('sword');
    const offered = () => { for (let i = 0; i < 40; i++) if (m.rollCards().some((c) => c.id === 'piercespear')) return true; return false; };
    expect(offered()).toBe(false); // 창을 안 들었으면 카드에 없음
    m.wield('spear');
    expect(offered()).toBe(true);
    h.skillLevels = { attack: 1, warcry: 1, piercespear: 1 };
    h.slot2 = 'piercespear';
    m.wield('sword');
    validateSkillSlots();
    expect(h.slot2).not.toBe('piercespear');
    for (let i = 0; i < 5; i++) { cycleSkillSlot(2); expect(h.slot2).not.toBe('piercespear'); }
    m.wield('spear');
    let seen = false;
    for (let i = 0; i < 5; i++) { cycleSkillSlot(2); if (h.slot2 === 'piercespear') seen = true; }
    expect(seen).toBe(true);
  } finally { env.restore(); }
});
