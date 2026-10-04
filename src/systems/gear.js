// 장비: 굴리기(등급/옵션), 장착 규칙, 강화, 감정, 시작 장비/테스트 가방, 장비 스탯 합산
// 감정 대상은 인덱스가 아니라 객체 참조(ui.identifyingItem)
import {
  MAX_MANA, LEVEL_STAT_PER_POINT, INVENTORY_SIZE, IDENTIFY_DURATION, UPGRADE_SUCCESS_CHANCE
} from '../data/balance.js';
import {
  GEAR_SLOTS, GEAR_SLOT_LABEL, WEAPON_VARIANTS, ACCESSORY_VARIANTS, STAT_DEF, RARITY_DEF, RARITY_TOTAL_WEIGHT
} from '../data/items.js';
import { game, ui } from '../state.js';
import { spawnHitParticles, spawnShockwave, floatText, showInvToast } from './fx.js';


export function tryIdentify(index) {
  if (ui.identifyingItem !== null) return; // 이미 감정 중이면 중복 시작 방지
  const gear = game.hero.inventory[index];
  if (!gear || gear.identified) return;
  ui.identifyingItem = gear;
  ui.identifyTimer = IDENTIFY_DURATION;
}

export function updateIdentify(dt) {
  if (ui.identifyingItem === null) return;
  if (!game.hero.inventory.includes(ui.identifyingItem)) { ui.identifyingItem = null; return; } // 중간에 사라진 경우
  ui.identifyTimer -= dt;
  if (ui.identifyTimer <= 0) {
    ui.identifyingItem.identified = true;
    revealIdentifiedGear(ui.identifyingItem);
    ui.identifyingItem = null;
  }
}

export function revealIdentifiedGear(gear) {
  const rDef = RARITY_DEF[gear.rarity];
  // 등급이 높을수록 연출을 크게 - "감정의 기쁨"을 등급에 비례해서 전달
  const intensity = { normal: 1, magic: 2, rare: 3, legendary: 5 }[gear.rarity] || 1;
  game.shake = Math.min(game.shake + intensity * 2, 12);
  game.impactFlash = Math.max(game.impactFlash, Math.min(0.06 * intensity, 0.22));
  spawnHitParticles(game.hero.x, game.hero.y - 30, rDef.color, 4 + intensity * 4);
  if (gear.rarity === 'legendary') {
    spawnShockwave(game.hero.x, game.hero.y, 70, rDef.color);
    floatText(game.hero.x, game.hero.y - 60, '전설 등급 발견!', rDef.color);
  } else {
    floatText(game.hero.x, game.hero.y - 50, `[${rDef.label}] 감정 완료`, rDef.color);
  }
  // 메뉴가 월드를 덮고 있어서 월드 연출은 안 보이니, 메뉴 안에서도 등급색 번쩍임 + 안내를 보여줌
  showInvToast(gear.rarity === 'legendary' ? '전설 등급 발견!' : `[${rDef.label}] 감정 완료`, rDef.color);
  ui.invReveal = { item: gear, color: rDef.color, until: performance.now() + 1100 };
}

export function rollRarity() {
  let roll = Math.random() * RARITY_TOTAL_WEIGHT;
  for (const key of Object.keys(RARITY_DEF)) {
    roll -= RARITY_DEF[key].weight;
    if (roll <= 0) return key;
  }
  return 'normal';
}

export function rollGearItem(opts = {}) {
  const categories = ['armor', 'weapon', 'greaves', 'boots', 'accessory', 'shield'];
  const category = opts.category || categories[Math.floor(Math.random() * categories.length)];
  const handedness = category === 'weapon' ? (opts.handedness || (Math.random() < 0.5 ? 'two' : 'one')) : null;
  const rarity = opts.rarity || rollRarity();
  const rDef = RARITY_DEF[rarity];

  const statKeys = Object.keys(STAT_DEF);
  const numStats = rDef.statMin + Math.floor(Math.random() * (rDef.statMax - rDef.statMin + 1));
  const chosen = [];
  while (chosen.length < numStats) {
    const k = statKeys[Math.floor(Math.random() * statKeys.length)];
    if (!chosen.includes(k)) chosen.push(k);
  }
  const stats = {};
  chosen.forEach((k) => {
    const d = STAT_DEF[k];
    stats[k] = (d.min + Math.random() * (d.max - d.min)) * rDef.mult;
  });
  let variant = opts.variant || null;
  if (!variant) {
    if (category === 'weapon') variant = WEAPON_VARIANTS[Math.floor(Math.random() * WEAPON_VARIANTS.length)];
    else if (category === 'accessory') variant = ACCESSORY_VARIANTS[Math.floor(Math.random() * ACCESSORY_VARIANTS.length)];
  }
  return { category, handedness, rarity, stats, upgradeLevel: 0, identified: !!opts.identified, variant };
}

export function equipItem(gear, opts = {}) {
  let slot;
  const replaced = [];
  if (gear.category === 'weapon') {
    if (gear.handedness === 'two') {
      if (game.hero.equipment.weaponMain && game.hero.equipment.weaponMain !== 'LOCKED') replaced.push(game.hero.equipment.weaponMain);
      if (game.hero.equipment.weaponOff && game.hero.equipment.weaponOff !== 'LOCKED') replaced.push(game.hero.equipment.weaponOff);
      game.hero.equipment.weaponMain = gear;
      game.hero.equipment.weaponOff = 'LOCKED';
      slot = 'weaponMain';
    } else {
      const mainIsTwoHand = game.hero.equipment.weaponMain && game.hero.equipment.weaponMain !== 'LOCKED' && game.hero.equipment.weaponMain.handedness === 'two';
      if (mainIsTwoHand) {
        replaced.push(game.hero.equipment.weaponMain);
        game.hero.equipment.weaponMain = gear;
        game.hero.equipment.weaponOff = null;
        slot = 'weaponMain';
      } else if (!game.hero.equipment.weaponMain) {
        slot = 'weaponMain';
        game.hero.equipment[slot] = gear;
      } else if (!game.hero.equipment.weaponOff) {
        slot = 'weaponOff';
        game.hero.equipment[slot] = gear;
      } else {
        replaced.push(game.hero.equipment.weaponMain);
        slot = 'weaponMain';
        game.hero.equipment[slot] = gear;
      }
    }
  } else if (gear.category === 'shield') {
    const mainIsTwoHand = game.hero.equipment.weaponMain && game.hero.equipment.weaponMain !== 'LOCKED' && game.hero.equipment.weaponMain.handedness === 'two';
    if (mainIsTwoHand) {
      replaced.push(game.hero.equipment.weaponMain);
      game.hero.equipment.weaponMain = null;
    }
    if (game.hero.equipment.weaponOff && game.hero.equipment.weaponOff !== 'LOCKED') replaced.push(game.hero.equipment.weaponOff);
    game.hero.equipment.weaponOff = gear;
    slot = 'weaponOff';
  } else if (gear.category === 'accessory') {
    if (!game.hero.equipment.accessory1) {
      slot = 'accessory1';
    } else if (!game.hero.equipment.accessory2) {
      slot = 'accessory2';
    } else {
      replaced.push(game.hero.equipment.accessory1);
      slot = 'accessory1';
    }
    game.hero.equipment[slot] = gear;
  } else {
    slot = gear.category;
    if (game.hero.equipment[slot]) replaced.push(game.hero.equipment[slot]);
    game.hero.equipment[slot] = gear;
  }
  recalcGearStats();
  if (!opts.silent) {
    floatText(game.hero.x, game.hero.y - 44, `[${RARITY_DEF[gear.rarity].label}] ${GEAR_SLOT_LABEL[slot]} 장착!`, RARITY_DEF[gear.rarity].color);
  }
  return replaced;
}

// 시작할 때 맨손 대신 기본 장비를 쥐어줌 - 한손검+방패 또는 도끼+방패 중 랜덤
export function giveStarterGear() {
  const weaponVariant = Math.random() < 0.5 ? 'sword' : 'axe';
  const weapon = rollGearItem({ category: 'weapon', handedness: 'one', rarity: 'normal', variant: weaponVariant, identified: true });
  const shield = rollGearItem({ category: 'shield', rarity: 'normal', identified: true });
  equipItem(weapon, { silent: true });
  equipItem(shield, { silent: true });
}

// 장비를 바꿔가며 테스트할 수 있도록 가방에 종류별로 하나씩 넣어줌 (전부 감정된 일반 등급)
// 데모/테스트 편의 기능 - 나중에 진짜 파밍만으로 얻게 하고 싶으면 resetGame에서 이 호출만 지우면 됨
export function giveTestStash() {
  WEAPON_VARIANTS.forEach((v) => {
    game.hero.inventory.push(rollGearItem({ category: 'weapon', handedness: 'one', rarity: 'normal', variant: v, identified: true }));
  });
  game.hero.inventory.push(rollGearItem({ category: 'weapon', handedness: 'two', rarity: 'normal', variant: 'sword', identified: true }));
  game.hero.inventory.push(rollGearItem({ category: 'shield', rarity: 'normal', identified: true }));
}

export function equipFromInventory(index) {
  const gear = game.hero.inventory[index];
  if (!gear || !gear.identified) return; // 미감정 장비는 장착 불가
  const replaced = equipItem(gear);
  game.hero.inventory.splice(index, 1);
  replaced.forEach((old) => {
    if (old && old !== 'LOCKED' && game.hero.inventory.length < INVENTORY_SIZE) game.hero.inventory.push(old);
  });
  ui.selectedInvIndex = null;
}

export function tryUpgradeSlot(slotIndex) {
  const slot = GEAR_SLOTS[slotIndex];
  if (!slot) return;
  const it = game.hero.equipment[slot];
  if (!it || it === 'LOCKED') return;
  if (game.hero.materials < 1) {
    floatText(game.hero.x, game.hero.y - 40, '재료 부족', '#999');
    return;
  }
  game.hero.materials -= 1;
  if (Math.random() < UPGRADE_SUCCESS_CHANCE) {
    const statKeys = Object.keys(it.stats);
    const k = statKeys[Math.floor(Math.random() * statKeys.length)];
    it.stats[k] *= 1.25;
    it.upgradeLevel = (it.upgradeLevel || 0) + 1;
    recalcGearStats();
    floatText(game.hero.x, game.hero.y - 40, `${GEAR_SLOT_LABEL[slot]} 업그레이드 성공 +${it.upgradeLevel}`, RARITY_DEF[it.rarity].color);
  } else {
    floatText(game.hero.x, game.hero.y - 40, '업그레이드 실패...', '#999');
  }
}

export function recalcGearStats() {
  let atkSpeed = 0, atkPower = 0, defense = 0, evasion = 0, moveSpeed = 0, health = 0, mana = 0;
  GEAR_SLOTS.forEach((slot) => {
    const it = game.hero.equipment[slot];
    if (!it || it === 'LOCKED') return;
    if (it.stats.atkSpeed) atkSpeed += it.stats.atkSpeed;
    if (it.stats.atkPower) atkPower += it.stats.atkPower;
    if (it.stats.defense) defense += it.stats.defense;
    if (it.stats.evasion) evasion += it.stats.evasion;
    if (it.stats.moveSpeed) moveSpeed += it.stats.moveSpeed;
    if (it.stats.health) health += it.stats.health;
    if (it.stats.mana) mana += it.stats.mana;
  });

  // 레벨업으로 분배한 포인트도 같은 합계에 더함(아래 gearXXX 필드는 "장비+레벨" 합산치)
  atkSpeed += (game.hero.levelStats.atkSpeed || 0) * LEVEL_STAT_PER_POINT.atkSpeed;
  atkPower += (game.hero.levelStats.atkPower || 0) * LEVEL_STAT_PER_POINT.atkPower;
  defense += (game.hero.levelStats.defense || 0) * LEVEL_STAT_PER_POINT.defense;
  evasion += (game.hero.levelStats.evasion || 0) * LEVEL_STAT_PER_POINT.evasion;
  moveSpeed += (game.hero.levelStats.moveSpeed || 0) * LEVEL_STAT_PER_POINT.moveSpeed;
  health += (game.hero.levelStats.health || 0) * LEVEL_STAT_PER_POINT.health;
  mana += (game.hero.levelStats.mana || 0) * LEVEL_STAT_PER_POINT.mana;

  const oldEffectiveMax = game.hero.maxHp + game.hero.bonusMaxHp + game.hero.gearMaxHp;
  game.hero.gearAtkSpeed = atkSpeed;
  game.hero.gearAtkPower = Math.round(atkPower);
  game.hero.gearDefense = defense;
  game.hero.gearEvasion = evasion;
  game.hero.gearSpeedMult = 1 + moveSpeed;
  game.hero.gearMaxHp = Math.round(health);
  game.hero.gearMaxMana = Math.round(mana);

  const newEffectiveMax = game.hero.maxHp + game.hero.bonusMaxHp + game.hero.gearMaxHp;
  if (newEffectiveMax > oldEffectiveMax) game.hero.hp += (newEffectiveMax - oldEffectiveMax);
  game.hero.hp = Math.min(game.hero.hp, newEffectiveMax);
  game.hero.maxMana = MAX_MANA + game.hero.gearMaxMana;
  game.hero.mana = Math.min(game.hero.mana, game.hero.maxMana);
}
