// 장비: 굴리기(등급/옵션), 장착 규칙, 강화, 감정, 시작 장비/테스트 가방, 장비 스탯 합산
// 감정 대상은 인덱스가 아니라 객체 참조(ui.identifyingItem)
import {
  MAX_MANA, LEVEL_STAT_PER_POINT, INVENTORY_SIZE, IDENTIFY_DURATION, UPGRADE_SUCCESS_CHANCE
} from '../data/balance.js';
import {
  GEAR_SLOTS, GEAR_SLOT_LABEL, GEAR_CATEGORY_LABEL, GEAR_VARIANT_LABEL, WEAPON_VARIANTS, ACCESSORY_VARIANTS,
  STAT_DEF, RARITY_DEF, RARITY_TOTAL_WEIGHT
} from '../data/items.js';
import { game, ui, player } from '../state.js';
import { spawnHitParticles, spawnShockwave, floatText, showInvToast } from './fx.js';

export function gearDisplayName(gear) {
  return GEAR_VARIANT_LABEL[gear.variant] || GEAR_CATEGORY_LABEL[gear.category];
}

export function tryIdentify(index) {
  if (ui.identifyingItem !== null) return; // 이미 감정 중이면 중복 시작 방지
  const gear = player.inventory[index];
  if (!gear || gear.identified) return;
  ui.identifyingItem = gear;
  ui.identifyTimer = IDENTIFY_DURATION;
}

export function updateIdentify(dt) {
  if (ui.identifyingItem === null) return;
  if (!player.inventory.includes(ui.identifyingItem)) { ui.identifyingItem = null; return; } // 중간에 사라진 경우
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
  spawnHitParticles(player.x, player.y - 30, rDef.color, 4 + intensity * 4);
  if (gear.rarity === 'legendary') {
    spawnShockwave(player.x, player.y, 70, rDef.color);
    floatText(player.x, player.y - 60, '전설 등급 발견!', rDef.color);
  } else {
    floatText(player.x, player.y - 50, `[${rDef.label}] 감정 완료`, rDef.color);
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
      if (player.equipment.weaponMain && player.equipment.weaponMain !== 'LOCKED') replaced.push(player.equipment.weaponMain);
      if (player.equipment.weaponOff && player.equipment.weaponOff !== 'LOCKED') replaced.push(player.equipment.weaponOff);
      player.equipment.weaponMain = gear;
      player.equipment.weaponOff = 'LOCKED';
      slot = 'weaponMain';
    } else {
      const mainIsTwoHand = player.equipment.weaponMain && player.equipment.weaponMain !== 'LOCKED' && player.equipment.weaponMain.handedness === 'two';
      if (mainIsTwoHand) {
        replaced.push(player.equipment.weaponMain);
        player.equipment.weaponMain = gear;
        player.equipment.weaponOff = null;
        slot = 'weaponMain';
      } else if (!player.equipment.weaponMain) {
        slot = 'weaponMain';
        player.equipment[slot] = gear;
      } else if (!player.equipment.weaponOff) {
        slot = 'weaponOff';
        player.equipment[slot] = gear;
      } else {
        replaced.push(player.equipment.weaponMain);
        slot = 'weaponMain';
        player.equipment[slot] = gear;
      }
    }
  } else if (gear.category === 'shield') {
    const mainIsTwoHand = player.equipment.weaponMain && player.equipment.weaponMain !== 'LOCKED' && player.equipment.weaponMain.handedness === 'two';
    if (mainIsTwoHand) {
      replaced.push(player.equipment.weaponMain);
      player.equipment.weaponMain = null;
    }
    if (player.equipment.weaponOff && player.equipment.weaponOff !== 'LOCKED') replaced.push(player.equipment.weaponOff);
    player.equipment.weaponOff = gear;
    slot = 'weaponOff';
  } else if (gear.category === 'accessory') {
    if (!player.equipment.accessory1) {
      slot = 'accessory1';
    } else if (!player.equipment.accessory2) {
      slot = 'accessory2';
    } else {
      replaced.push(player.equipment.accessory1);
      slot = 'accessory1';
    }
    player.equipment[slot] = gear;
  } else {
    slot = gear.category;
    if (player.equipment[slot]) replaced.push(player.equipment[slot]);
    player.equipment[slot] = gear;
  }
  recalcGearStats();
  if (!opts.silent) {
    floatText(player.x, player.y - 44, `[${RARITY_DEF[gear.rarity].label}] ${GEAR_SLOT_LABEL[slot]} 장착!`, RARITY_DEF[gear.rarity].color);
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
    player.inventory.push(rollGearItem({ category: 'weapon', handedness: 'one', rarity: 'normal', variant: v, identified: true }));
  });
  player.inventory.push(rollGearItem({ category: 'weapon', handedness: 'two', rarity: 'normal', variant: 'sword', identified: true }));
  player.inventory.push(rollGearItem({ category: 'shield', rarity: 'normal', identified: true }));
}

export function equipFromInventory(index) {
  const gear = player.inventory[index];
  if (!gear || !gear.identified) return; // 미감정 장비는 장착 불가
  const replaced = equipItem(gear);
  player.inventory.splice(index, 1);
  replaced.forEach((old) => {
    if (old && old !== 'LOCKED' && player.inventory.length < INVENTORY_SIZE) player.inventory.push(old);
  });
  ui.selectedInvIndex = null;
}

export function tryUpgradeSlot(slotIndex) {
  const slot = GEAR_SLOTS[slotIndex];
  if (!slot) return;
  const it = player.equipment[slot];
  if (!it || it === 'LOCKED') return;
  if (player.materials < 1) {
    floatText(player.x, player.y - 40, '재료 부족', '#999');
    return;
  }
  player.materials -= 1;
  if (Math.random() < UPGRADE_SUCCESS_CHANCE) {
    const statKeys = Object.keys(it.stats);
    const k = statKeys[Math.floor(Math.random() * statKeys.length)];
    it.stats[k] *= 1.25;
    it.upgradeLevel = (it.upgradeLevel || 0) + 1;
    recalcGearStats();
    floatText(player.x, player.y - 40, `${GEAR_SLOT_LABEL[slot]} 업그레이드 성공 +${it.upgradeLevel}`, RARITY_DEF[it.rarity].color);
  } else {
    floatText(player.x, player.y - 40, '업그레이드 실패...', '#999');
  }
}

export function recalcGearStats() {
  let atkSpeed = 0, atkPower = 0, defense = 0, evasion = 0, moveSpeed = 0, health = 0, mana = 0;
  GEAR_SLOTS.forEach((slot) => {
    const it = player.equipment[slot];
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
  atkSpeed += (player.levelStats.atkSpeed || 0) * LEVEL_STAT_PER_POINT.atkSpeed;
  atkPower += (player.levelStats.atkPower || 0) * LEVEL_STAT_PER_POINT.atkPower;
  defense += (player.levelStats.defense || 0) * LEVEL_STAT_PER_POINT.defense;
  evasion += (player.levelStats.evasion || 0) * LEVEL_STAT_PER_POINT.evasion;
  moveSpeed += (player.levelStats.moveSpeed || 0) * LEVEL_STAT_PER_POINT.moveSpeed;
  health += (player.levelStats.health || 0) * LEVEL_STAT_PER_POINT.health;
  mana += (player.levelStats.mana || 0) * LEVEL_STAT_PER_POINT.mana;

  const oldEffectiveMax = player.maxHp + player.bonusMaxHp + player.gearMaxHp;
  player.gearAtkSpeed = atkSpeed;
  player.gearAtkPower = Math.round(atkPower);
  player.gearDefense = defense;
  player.gearEvasion = evasion;
  player.gearSpeedMult = 1 + moveSpeed;
  player.gearMaxHp = Math.round(health);
  player.gearMaxMana = Math.round(mana);

  const newEffectiveMax = player.maxHp + player.bonusMaxHp + player.gearMaxHp;
  if (newEffectiveMax > oldEffectiveMax) player.hp += (newEffectiveMax - oldEffectiveMax);
  player.hp = Math.min(player.hp, newEffectiveMax);
  player.maxMana = MAX_MANA + player.gearMaxMana;
  player.mana = Math.min(player.mana, player.maxMana);
}
