// 행동 기준선(골든 마스터) 생성기: 레거시 파일의 "지금 동작"을 JSON으로 뽑는다.
// - exact: 리팩토링 후에도 값이 정확히 같아야 하는 것 (수치 테이블, 규칙 판정)
// - statistical: 난수 기반이라 허용 오차 안에서만 같으면 되는 것 (드랍 분포 등, 시드 고정)
// 사용: node legacy/tools/baseline.cjs [--write docs/baseline.golden.json]
const fs = require('fs');
const path = require('path');
const { createSandbox } = require('./_sandbox.cjs');

const footer = `
globalThis.__baseline = () => {
  const out = { exact: {}, statistical: {} };
  const clearCows = () => { cows.forEach((c) => { if (c.body) World.remove(world, c.body); }); cows = []; };
  const fresh = () => { gameState = 'playing'; resetGame(); clearCows(); };
  const cum = []; { let s = 0; for (let L = 1; L <= 6; L++) { s += expForLevel(L); cum.push(s); } }

  // 1) 몬스터 수치 + 타수
  fresh();
  out.exact.monsters = {};
  ['normal','tough','fast','cold','charger','fanatic','burning','exploder','shaman','shocker','boss'].forEach((k) => {
    const c = new Cow(0.4, k);
    out.exact.monsters[k] = { hp: c.maxHp, meleeDmg: c.dmg, scaleRatio: +(c.scale / 0.4).toFixed(3) };
    World.remove(world, c.body);
  });
  out.exact.baseDamage = BASE_DAMAGE;
  out.exact.hitsToKill = {};
  [3, 4, 5, 6].forEach((d) => { out.exact.hitsToKill[d] = { small: Math.ceil(6 / d), big: Math.ceil(9 / d), boss: Math.ceil(78 / d) }; });

  // 2) 성장/해금
  out.exact.progression = { expToReach_cumulative: cum, pointsPerLevel: POINTS_PER_LEVEL, maxLevel: MAX_LEVEL, perPoint: LEVEL_STAT_PER_POINT, skillUnlockLevel: SKILL_UNLOCK_LEVEL };
  fresh();
  out.exact.start = { maxHp: player.maxHp, slots: [player.slot1, player.slot2], potions: { ...player.potions }, level: player.level, inventorySize: INVENTORY_SIZE, startWeaponIsOneHand: player.equipment.weaponMain.handedness === 'one', startOffIsShield: player.equipment.weaponOff.category === 'shield', startGearIdentified: player.equipment.weaponMain.identified && player.equipment.weaponOff.identified, testStashCount: player.inventory.length };
  const seen = (lv) => { fresh(); player.level = lv; const s = new Set(); for (let i = 0; i < 16; i++) { cycleSkillSlot(2); s.add(player.slot2); } return [...s].sort(); };
  out.exact.slot2OptionsByLevel = { 1: seen(1), 2: seen(2), 3: seen(3), 4: seen(4), 5: seen(5) };

  // 3) 무기 사거리 / 공격 각도 / 장착 규칙
  fresh();
  out.exact.weaponRange = {};
  WEAPON_VARIANTS.forEach((v) => { player.equipment.weaponMain = { category: 'weapon', variant: v, identified: true }; out.exact.weaponRange[v] = getWeaponRange(); });
  player.equipment.weaponMain = null; out.exact.weaponRange.unarmed = getWeaponRange();
  player.equipment.weaponOff = { category: 'shield' }; out.exact.arcDegSingle = +(getAttackArc() * 180 / Math.PI).toFixed(1);
  player.equipment.weaponOff = { category: 'weapon' };  out.exact.arcDegDual = +(getAttackArc() * 180 / Math.PI).toFixed(1);
  fresh();
  const two = rollGearItem({ category: 'weapon', handedness: 'two', rarity: 'normal', identified: true });
  const rep1 = equipItem(two, { silent: true });
  const shield = rollGearItem({ category: 'shield', rarity: 'normal', identified: true });
  const lockedBefore = player.equipment.weaponOff === 'LOCKED';
  const rep2 = equipItem(shield, { silent: true });
  out.exact.equipRules = { twoHandKickedOldMainAndShield: rep1.length === 2, offLockedAfterTwoHand: lockedBefore, shieldKickedTwoHand: rep2.includes(two) && player.equipment.weaponMain === null, shieldInOffSlot: player.equipment.weaponOff === shield };

  // 4) 감정 규칙
  fresh();
  const un = rollGearItem({ category: 'armor', rarity: 'rare' });
  player.inventory.push(un);
  const idx = player.inventory.indexOf(un);
  equipFromInventory(idx);
  const blocked = player.equipment.armor !== un;
  tryIdentify(idx); const t0 = IDENTIFY_DURATION; for (let i = 0; i < 60; i++) updateIdentify(1 / 60);
  out.exact.identify = { dropsUnidentified: un.identified === true, duration: t0, equipBlockedBeforeIdentify: blocked, identifiedAfter1s: un.identified };

  // 5) 물약
  fresh();
  const o = {}; showInventory = false;
  tryDrinkPotion('heal'); o.fullHpDoesNotConsume = player.potions.heal === 2;
  player.hp = 3; player.potionCd = { heal: 0, mana: 0 };
  const maxHp = player.maxHp + player.bonusMaxHp + player.gearMaxHp;
  tryDrinkPotion('heal'); o.healAmountIsHalfMaxCeil = (player.hp - 3) === Math.min(Math.ceil(maxHp * 0.5), maxHp - 3); o.healConsumed = player.potions.heal === 1;
  player.mana = 10; tryDrinkPotion('mana'); o.manaAdds60 = player.mana === 70; o.otherTypeNotBlockedByCooldown = player.potions.mana === 1;
  tryDrinkPotion('heal'); o.sameTypeBlockedByCooldown = player.potions.heal === 1;
  out.exact.potions = Object.assign(o, { max: POTION_MAX, cooldown: POTION_COOLDOWN, healRatio: POTION_HEAL_RATIO, manaAmount: POTION_MANA_AMOUNT, dropWeights: POTION_DROP_WEIGHTS });

  // 6) 휠윈드: 4마리를 반경 안에 가둔 최악 조건에서의 사망 시점
  fresh(); player.level = 5; player.attackBonus = 0; player.gearAtkPower = 0;
  const cx = PEN.x + PEN.size / 2, cy = PEN.y + PEN.size / 2;
  Body.setPosition(player.body, { x: cx, y: cy }); player.x = cx; player.y = cy;
  const offs = [[30, 0], [-30, 0], [0, 30], [0, -30]];
  const kinds4 = ['normal', 'normal', 'fast', 'tough'];
  kinds4.forEach((k, i) => { const c = new Cow(0.4, k); Body.setPosition(c.body, { x: cx + offs[i][0], y: cy + offs[i][1] }); c.x = cx + offs[i][0]; c.y = cy + offs[i][1]; cows.push(c); });
  player.mana = 100; player.whirlwindCooldown = 0; player.whirlwindTimer = 0; tryWhirlwind();
  let el = 0, tSmall = null, tBig = null;
  while (player.whirlwindTimer > 0 && el < 1.5) {
    player.whirlwindTimer -= 1 / 60; el += 1 / 60; updateWhirlwind(1 / 60); Engine.update(engine, 1000 / 60);
    cows.forEach((c, i) => { if (c.state !== 'dead') { Body.setPosition(c.body, { x: cx + offs[i][0], y: cy + offs[i][1] }); c.x = cx + offs[i][0]; c.y = cy + offs[i][1]; } });
    if (tSmall === null && cows.slice(0, 3).every((c) => c.state === 'dead')) tSmall = +el.toFixed(2);
    if (tBig === null && cows[3].state === 'dead') tBig = +el.toFixed(2);
  }
  out.exact.whirlwind = { tick: WHIRLWIND_TICK, allSmallDeadAt: tSmall, bigDeadAt: tBig };

  // 7) 웨이브 구성
  fresh(); wave = 0;
  const sizes = [];
  for (let w = 1; w <= 6; w++) { clearCows(); startNextWave(); sizes.push(cows.length); }
  out.exact.waveSizes = sizes; out.exact.bossWave = BOSS_WAVE;
  clearCows();

  // 8) 장비/스탯 테이블
  out.exact.rarity = Object.fromEntries(Object.entries(RARITY_DEF).map(([k, v]) => [k, { label: v.label, weight: v.weight, statMin: v.statMin, statMax: v.statMax, mult: v.mult }]));
  out.exact.statDef = Object.fromEntries(Object.entries(STAT_DEF).map(([k, v]) => [k, { label: v.label, min: v.min, max: v.max, fmtAtMax: v.fmt(v.max) }]));
  out.exact.dropConstants = { gear: GEAR_DROP_CHANCE, material: MATERIAL_DROP_CHANCE, upgradeSuccess: UPGRADE_SUCCESS_CHANCE };

  // 9) 통계: 드랍 분포 / 등급 분포 (시드 고정)
  fresh();
  const N = 30000; const c = {};
  for (let i = 0; i < N; i++) { items.length = 0; dropLoot(0, 0, false, 1); const k = items.length ? items[0].type : 'none'; c[k] = (c[k] || 0) + 1; }
  out.statistical.dropRatePercent = Object.fromEntries(Object.keys(c).sort().map((k) => [k, +(c[k] / N * 100).toFixed(1)]));
  const r = {}; for (let i = 0; i < 20000; i++) { const k = rollRarity(); r[k] = (r[k] || 0) + 1; }
  out.statistical.rarityPercent = Object.fromEntries(Object.keys(r).sort().map((k) => [k, +(r[k] / 20000 * 100).toFixed(1)]));
  out.statistical.tolerancePercentPoints = 1.0;
  return out;
};`;

const htmlPath = path.join(__dirname, '..', 'cow_pen.html');
const env = createSandbox({ htmlPath, footer, seed: 20240601 });
const result = env.sandbox.__baseline();
const text = JSON.stringify(result, null, 2);
const wi = process.argv.indexOf('--write');
const ci = process.argv.indexOf('--check');
if (wi > -1) { fs.writeFileSync(process.argv[wi + 1], text + '\n'); console.log('wrote', process.argv[wi + 1]); }
else if (ci > -1) {
  // 골든 파일과 비교: exact는 완전 일치, statistical은 허용 오차(%p) 이내
  const goldenPath = process.argv[ci + 1] && !process.argv[ci + 1].startsWith('--') ? process.argv[ci + 1] : path.join(__dirname, '..', '..', 'docs', 'baseline.golden.json');
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const diffs = [];
  const eq = (a, b, p) => {
    if (a && b && typeof a === 'object' && typeof b === 'object') new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => eq(a[k], b[k], p + '.' + k));
    else if (a !== b) diffs.push(p + ': golden=' + JSON.stringify(a) + ' actual=' + JSON.stringify(b));
  };
  eq(golden.exact, result.exact, 'exact');
  const tol = golden.statistical.tolerancePercentPoints;
  for (const sec of ['dropRatePercent', 'rarityPercent']) {
    new Set([...Object.keys(golden.statistical[sec]), ...Object.keys(result.statistical[sec])]).forEach((k) => {
      const g = golden.statistical[sec][k] ?? 0, a = result.statistical[sec][k] ?? 0;
      if (Math.abs(g - a) > tol) diffs.push('statistical.' + sec + '.' + k + ': golden=' + g + ' actual=' + a + ' (허용 ±' + tol + '%p)');
    });
  }
  if (diffs.length) { console.error('BASELINE MISMATCH\n' + diffs.join('\n')); process.exit(1); }
  console.log('BASELINE OK (' + goldenPath + ')');
}
else console.log(text);
