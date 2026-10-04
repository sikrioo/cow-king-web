// 골든(docs/baseline.golden.json)의 규칙 판정 키(exact)와 드랍/등급 분포(statistical)를 새 모듈 코드로 계산해 비교한다.
// 절차·순서·시드는 legacy/tools/baseline.cjs와 같게 (기대값은 골든 JSON에서만 읽음 - 숫자를 테스트에 복사하지 말 것)
import { describe, it, expect, beforeAll, vi } from 'vitest';
import golden from '../docs/baseline.golden.json';
import { installBrowserEnv } from './helpers/browserEnv.js';

const BASELINE_SEED = 20240601; // legacy/tools/baseline.cjs와 같은 시드
const G = golden.exact;
let out;

beforeAll(async () => {
  const env = installBrowserEnv({ seed: BASELINE_SEED });
  try {
    vi.resetModules();
    await import('../src/main.js'); // boot(): 레거시와 같은 초기화 → 타이틀
    const { game, ui } = await import('../src/state.js');
    const { World, Body, Engine, engine, world } = await import('../src/core/physics.js');
    const { PEN } = await import('../src/world/arena.js');
    const { resetGame } = await import('../src/game.js');
    const { Monster } = await import('../src/entities/monster.js');
    const { getWeaponRange, getAttackArc } = await import('../src/systems/combat.js');
    const { cycleSkillSlot, tryWhirlwind, updateWhirlwind } = await import('../src/systems/skills.js');
    const { rollGearItem, equipItem, equipFromInventory, tryIdentify, updateIdentify, rollRarity } = await import('../src/systems/gear.js');
    const { tryDrinkPotion } = await import('../src/systems/potions.js');
    const { startNextWave } = await import('../src/systems/waves.js');
    const { dropLoot } = await import('../src/systems/loot.js');
    const { WEAPON_VARIANTS } = await import('../src/data/items.js');
    const { INVENTORY_SIZE, IDENTIFY_DURATION, POTION_MAX, POTION_COOLDOWN, POTION_HEAL_RATIO, POTION_MANA_AMOUNT, WHIRLWIND_TICK, BOSS_WAVE } = await import('../src/data/balance.js');
    const { POTION_DROP_WEIGHTS } = await import('../src/data/drops.js');

    out = { exact: {}, statistical: {} };
    const hero = () => game.hero;
    const clearCows = () => { game.cows.forEach((c) => { if (c.body) World.remove(world, c.body); }); game.cows = []; };
    const fresh = () => { game.gameState = 'playing'; resetGame(); clearCows(); };

    // 1) 몬스터 수치 (생성자가 data를 제대로 읽는지)
    fresh();
    out.exact.monsters = {};
    Object.keys(G.monsters).forEach((k) => {
      const c = new Monster(0.4, k);
      out.exact.monsters[k] = { hp: c.maxHp, meleeDmg: c.dmg, scaleRatio: +(c.scale / 0.4).toFixed(3) };
      World.remove(world, c.body);
    });

    // 2) 시작 상태 / 레벨별 슬롯2 스킬
    fresh();
    const h = hero();
    out.exact.start = { maxHp: h.maxHp, slots: [h.slot1, h.slot2], potions: { ...h.potions }, level: h.level, inventorySize: INVENTORY_SIZE, startWeaponIsOneHand: h.equipment.weaponMain.handedness === 'one', startOffIsShield: h.equipment.weaponOff.category === 'shield', startGearIdentified: h.equipment.weaponMain.identified && h.equipment.weaponOff.identified, testStashCount: h.inventory.length };
    const seen = (lv) => { fresh(); hero().level = lv; const s = new Set(); for (let i = 0; i < 16; i++) { cycleSkillSlot(2); s.add(hero().slot2); } return [...s].sort(); };
    out.exact.slot2OptionsByLevel = { 1: seen(1), 2: seen(2), 3: seen(3), 4: seen(4), 5: seen(5) };

    // 3) 무기 사거리 / 공격 각도 / 장착 규칙
    fresh();
    out.exact.weaponRange = {};
    WEAPON_VARIANTS.forEach((v) => { hero().equipment.weaponMain = { category: 'weapon', variant: v, identified: true }; out.exact.weaponRange[v] = getWeaponRange(); });
    hero().equipment.weaponMain = null; out.exact.weaponRange.unarmed = getWeaponRange();
    hero().equipment.weaponOff = { category: 'shield' }; out.exact.arcDegSingle = +(getAttackArc() * 180 / Math.PI).toFixed(1);
    hero().equipment.weaponOff = { category: 'weapon' }; out.exact.arcDegDual = +(getAttackArc() * 180 / Math.PI).toFixed(1);
    fresh();
    const two = rollGearItem({ category: 'weapon', handedness: 'two', rarity: 'normal', identified: true });
    const rep1 = equipItem(two, { silent: true });
    const shield = rollGearItem({ category: 'shield', rarity: 'normal', identified: true });
    const lockedBefore = hero().equipment.weaponOff === 'LOCKED';
    const rep2 = equipItem(shield, { silent: true });
    out.exact.equipRules = { twoHandKickedOldMainAndShield: rep1.length === 2, offLockedAfterTwoHand: lockedBefore, shieldKickedTwoHand: rep2.includes(two) && hero().equipment.weaponMain === null, shieldInOffSlot: hero().equipment.weaponOff === shield };

    // 4) 감정 규칙
    fresh();
    const un = rollGearItem({ category: 'armor', rarity: 'rare' });
    hero().inventory.push(un);
    const idx = hero().inventory.indexOf(un);
    equipFromInventory(idx);
    const blocked = hero().equipment.armor !== un;
    tryIdentify(idx); const t0 = IDENTIFY_DURATION; for (let i = 0; i < 60; i++) updateIdentify(1 / 60);
    out.exact.identify = { dropsUnidentified: un.identified === true, duration: t0, equipBlockedBeforeIdentify: blocked, identifiedAfter1s: un.identified };

    // 5) 물약
    fresh();
    const o = {}; ui.showInventory = false;
    tryDrinkPotion('heal'); o.fullHpDoesNotConsume = hero().potions.heal === 2;
    hero().hp = 3; hero().potionCd = { heal: 0, mana: 0 };
    const maxHp = hero().maxHp + hero().bonusMaxHp + hero().gearMaxHp;
    tryDrinkPotion('heal'); o.healAmountIsHalfMaxCeil = (hero().hp - 3) === Math.min(Math.ceil(maxHp * 0.5), maxHp - 3); o.healConsumed = hero().potions.heal === 1;
    hero().mana = 10; tryDrinkPotion('mana'); o.manaAdds60 = hero().mana === 70; o.otherTypeNotBlockedByCooldown = hero().potions.mana === 1;
    tryDrinkPotion('heal'); o.sameTypeBlockedByCooldown = hero().potions.heal === 1;
    out.exact.potions = Object.assign(o, { max: POTION_MAX, cooldown: POTION_COOLDOWN, healRatio: POTION_HEAL_RATIO, manaAmount: POTION_MANA_AMOUNT, dropWeights: POTION_DROP_WEIGHTS });

    // 6) 휠윈드: 4마리를 반경 안에 가둔 최악 조건에서의 사망 시점
    fresh(); hero().level = 5; hero().attackBonus = 0; hero().gearAtkPower = 0;
    const cx = PEN.x + PEN.size / 2, cy = PEN.y + PEN.size / 2;
    Body.setPosition(hero().body, { x: cx, y: cy }); hero().x = cx; hero().y = cy;
    const offs = [[30, 0], [-30, 0], [0, 30], [0, -30]];
    ['normal', 'normal', 'fast', 'tough'].forEach((k, i) => { const c = new Monster(0.4, k); Body.setPosition(c.body, { x: cx + offs[i][0], y: cy + offs[i][1] }); c.x = cx + offs[i][0]; c.y = cy + offs[i][1]; game.cows.push(c); });
    hero().mana = 100; hero().whirlwindCooldown = 0; hero().whirlwindTimer = 0; tryWhirlwind();
    let el = 0, tSmall = null, tBig = null;
    while (hero().whirlwindTimer > 0 && el < 1.5) {
      hero().whirlwindTimer -= 1 / 60; el += 1 / 60; updateWhirlwind(1 / 60); Engine.update(engine, 1000 / 60);
      game.cows.forEach((c, i) => { if (c.state !== 'dead') { Body.setPosition(c.body, { x: cx + offs[i][0], y: cy + offs[i][1] }); c.x = cx + offs[i][0]; c.y = cy + offs[i][1]; } });
      if (tSmall === null && game.cows.slice(0, 3).every((c) => c.state === 'dead')) tSmall = +el.toFixed(2);
      if (tBig === null && game.cows[3].state === 'dead') tBig = +el.toFixed(2);
    }
    out.exact.whirlwind = { tick: WHIRLWIND_TICK, allSmallDeadAt: tSmall, bigDeadAt: tBig };

    // 7) 웨이브 구성
    fresh(); game.wave = 0;
    const sizes = [];
    for (let w = 1; w <= 6; w++) { clearCows(); startNextWave(); sizes.push(game.cows.length); }
    out.exact.waveSizes = sizes; out.exact.bossWave = BOSS_WAVE;
    clearCows();

    // 9) 통계: 드랍 분포 / 등급 분포 (시드 고정)
    fresh();
    const N = 30000; const cnt = {};
    for (let i = 0; i < N; i++) { game.items.length = 0; dropLoot(0, 0, false, 1); const k = game.items.length ? game.items[0].type : 'none'; cnt[k] = (cnt[k] || 0) + 1; }
    out.statistical.dropRatePercent = Object.fromEntries(Object.keys(cnt).sort().map((k) => [k, +(cnt[k] / N * 100).toFixed(1)]));
    const r = {}; for (let i = 0; i < 20000; i++) { const k = rollRarity(); r[k] = (r[k] || 0) + 1; }
    out.statistical.rarityPercent = Object.fromEntries(Object.keys(r).sort().map((k) => [k, +(r[k] / 20000 * 100).toFixed(1)]));
  } finally {
    env.restore();
  }
}, 120000);

describe('golden: 규칙 판정 (exact)', () => {
  for (const key of ['monsters', 'start', 'slot2OptionsByLevel', 'weaponRange', 'arcDegSingle', 'arcDegDual', 'equipRules', 'identify', 'potions', 'whirlwind', 'waveSizes', 'bossWave']) {
    it(key, () => { expect(out.exact[key]).toEqual(G[key]); });
  }
});

describe('golden: 드랍/등급 분포 (statistical, 허용 오차 이내)', () => {
  const tol = golden.statistical.tolerancePercentPoints;
  for (const sec of ['dropRatePercent', 'rarityPercent']) {
    it(sec, () => {
      const g = golden.statistical[sec], a = out.statistical[sec];
      for (const k of new Set([...Object.keys(g), ...Object.keys(a)])) {
        expect(Math.abs((g[k] ?? 0) - (a[k] ?? 0)), `${sec}.${k}: golden=${g[k]} actual=${a[k]}`).toBeLessThanOrEqual(tol);
      }
    });
  }
});
