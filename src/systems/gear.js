// 장비: 장착 규칙, 강화, 감정, 시작 장비/테스트 가방, 장비 스탯 합산 (생성은 systems/itemGen.js - 여기서 다시 내보냄)
// 감정 대상은 인덱스가 아니라 객체 참조(ui.identifyingItem)
import {
  MAX_MANA, LEVEL_STAT_PER_POINT, INVENTORY_SIZE, IDENTIFY_DURATION, UPGRADE_SUCCESS_CHANCE, UPGRADE_STAT_MULT,
  ARMOR_K, ARMOR_MAX_REDUCTION, BASE_DAMAGE, ATTACK_COOLDOWN
} from '../data/balance.js';
import {
  GEAR_SLOTS, GEAR_SLOT_LABEL, WEAPON_VARIANTS, STAT_DEF, RARITY_DEF, GEAR_BASE_ARMOR,
  WEAPON_BASE, TWO_HAND_DAMAGE_MULT, TWO_HAND_SPEED_MULT, TEST_ELEMENT_WEAPON_DMG
} from '../data/items.js';
import { rollGearItem, nextItemUid } from './itemGen.js';

export { rollGearItem, rollRarity, nextItemUid } from './itemGen.js';
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

// opts.slot: 한손 무기를 넣을 칸 지정('weaponMain' | 'weaponOff'). 없으면 빈 칸 우선 자동 배치
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
      if (opts.slot === 'weaponOff' && game.hero.equipment.weaponMain && !mainIsTwoHand) {
        // 보조무기로 지정: 보조 칸(무기/방패)만 교체
        if (game.hero.equipment.weaponOff && game.hero.equipment.weaponOff !== 'LOCKED') replaced.push(game.hero.equipment.weaponOff);
        game.hero.equipment.weaponOff = gear;
        slot = 'weaponOff';
      } else if (opts.slot === 'weaponMain' && game.hero.equipment.weaponMain && !mainIsTwoHand) {
        // 주무기로 지정: 주 칸만 교체
        replaced.push(game.hero.equipment.weaponMain);
        game.hero.equipment.weaponMain = gear;
        slot = 'weaponMain';
      } else if (mainIsTwoHand) {
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
  const weaponVariant = Math.random() < 0.5 ? 'sword' : 'mace'; // 한손 무기 + 방패 (도끼는 양손 전용이 됨 - 2026-10-10)
  const weapon = rollGearItem({ category: 'weapon', handedness: 'one', rarity: 'normal', variant: weaponVariant, identified: true, noElement: true });
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
  // 원소별 테스트 무기 (한손검, 원소 피해 옵션 하나) - 전사로 면역 몬스터를 시험할 때
  Object.keys(STAT_DEF).filter((k) => STAT_DEF[k].element).forEach((k) => {
    game.hero.inventory.push({ category: 'weapon', handedness: 'one', rarity: 'magic', stats: { [k]: TEST_ELEMENT_WEAPON_DMG }, upgradeLevel: 0, identified: true, variant: 'sword', uid: nextItemUid() });
  });
}

// 착용 해제: 그 칸의 장비를 가방으로 (가방이 가득이면 못 함). 양손 무기를 빼면 잠긴 보조 칸도 풀림. 반환: 해제했는지
export function unequipSlot(slot) {
  const eq = game.hero.equipment;
  const it = eq[slot];
  if (!it || it === 'LOCKED') return false;
  if (game.hero.inventory.length >= INVENTORY_SIZE) { showInvToast('가방이 가득 차서 해제할 수 없어', '#ff8a80'); return false; }
  eq[slot] = null;
  if (slot === 'weaponMain' && eq.weaponOff === 'LOCKED') eq.weaponOff = null;
  game.hero.inventory.push(it);
  recalcGearStats();
  showInvToast(`${GEAR_SLOT_LABEL[slot]} 해제 → 가방`, '#c9d2c4');
  return true;
}

export function equipFromInventory(index, slot = null) {
  const gear = game.hero.inventory[index];
  if (!gear || !gear.identified) return; // 미감정 장비는 장착 불가
  const replaced = equipItem(gear, slot ? { slot } : {});
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
    // 옵션 하나가 커짐 (옵션이 없는 일반 장비는 베이스 성능만 - 강화 수치는 무기 피해·방어력에 곱해짐)
    const statKeys = Object.keys(it.stats);
    if (statKeys.length) {
      const k = statKeys[Math.floor(Math.random() * statKeys.length)];
      it.stats[k] = STAT_DEF[k].flat ? Math.round(it.stats[k] * UPGRADE_STAT_MULT) : it.stats[k] * UPGRADE_STAT_MULT;
    }
    it.upgradeLevel = (it.upgradeLevel || 0) + 1;
    recalcGearStats();
    floatText(game.hero.x, game.hero.y - 40, `${GEAR_SLOT_LABEL[slot]} 업그레이드 성공 +${it.upgradeLevel}`, RARITY_DEF[it.rarity].color);
  } else {
    floatText(game.hero.x, game.hero.y - 40, '업그레이드 실패...', '#999');
  }
}

// 방어구 기본 방어력 = 분류 기본값 × 등급 배율 × 강화(단계마다 ×1.25), 정수. 저장하지 않고 계산(아이템 데이터 그대로)
export function gearArmor(gear) {
  const base = GEAR_BASE_ARMOR[gear.category];
  if (!base) return 0;
  return Math.round(base * RARITY_DEF[gear.rarity].mult * UPGRADE_STAT_MULT ** (gear.upgradeLevel || 0));
}

// 무기 기본 속성 { min, max, interval(초) } - 무기가 아니면 null. 피해에만 등급 배율·강화를 곱함(정수)
export function weaponStats(gear) {
  const b = gear && gear !== 'LOCKED' && gear.category === 'weapon' ? WEAPON_BASE[gear.variant] : null;
  if (!b) return null;
  const two = gear.handedness === 'two';
  const m = RARITY_DEF[gear.rarity].mult * UPGRADE_STAT_MULT ** (gear.upgradeLevel || 0) * (two ? TWO_HAND_DAMAGE_MULT : 1);
  return { min: Math.round(b.min * m), max: Math.round(b.max * m), interval: 1 / (b.aps * (two ? TWO_HAND_SPEED_MULT : 1)) };
}

// 맨손
export function unarmedStats() {
  return { min: BASE_DAMAGE, max: BASE_DAMAGE, interval: ATTACK_COOLDOWN };
}

// 방어력 → 피해 감소율 (많이 쌓을수록 효율이 떨어지고 상한 있음)
export function armorReduction(armor) {
  return Math.min(armor / (armor + ARMOR_K), ARMOR_MAX_REDUCTION);
}

export function recalcGearStats() {
  const elemDmg = { fire: 0, cold: 0, lightning: 0, poison: 0 }; // 무기 원소 피해 (STAT_DEF의 element 옵션)
  let atkSpeed = 0, castSpeed = 0, atkPower = 0, defense = 0, evasion = 0, moveSpeed = 0, health = 0, mana = 0, armor = 0;
  GEAR_SLOTS.forEach((slot) => {
    const it = game.hero.equipment[slot];
    if (!it || it === 'LOCKED') return;
    armor += gearArmor(it);
    if (it.stats.atkSpeed) atkSpeed += it.stats.atkSpeed;
    if (it.stats.castSpeed) castSpeed += it.stats.castSpeed;
    if (it.stats.atkPower) atkPower += it.stats.atkPower;
    if (it.stats.defense) defense += it.stats.defense;
    if (it.stats.evasion) evasion += it.stats.evasion;
    if (it.stats.moveSpeed) moveSpeed += it.stats.moveSpeed;
    if (it.stats.health) health += it.stats.health;
    if (it.stats.mana) mana += it.stats.mana;
    for (const k in it.stats) { const el = STAT_DEF[k] && STAT_DEF[k].element; if (el) elemDmg[el] += it.stats[k]; }
  });

  // 레벨업으로 분배한 포인트도 같은 합계에 더함(아래 gearXXX 필드는 "장비+레벨+카드" 합산치)
  atkSpeed += (game.hero.levelStats.atkSpeed || 0) * LEVEL_STAT_PER_POINT.atkSpeed;
  castSpeed += (game.hero.levelStats.castSpeed || 0) * LEVEL_STAT_PER_POINT.castSpeed;
  atkPower += (game.hero.levelStats.atkPower || 0) * LEVEL_STAT_PER_POINT.atkPower;
  defense += (game.hero.levelStats.defense || 0) * LEVEL_STAT_PER_POINT.defense;
  evasion += (game.hero.levelStats.evasion || 0) * LEVEL_STAT_PER_POINT.evasion;
  moveSpeed += (game.hero.levelStats.moveSpeed || 0) * LEVEL_STAT_PER_POINT.moveSpeed;
  health += (game.hero.levelStats.health || 0) * LEVEL_STAT_PER_POINT.health;
  mana += (game.hero.levelStats.mana || 0) * LEVEL_STAT_PER_POINT.mana;
  // 레벨업 강화 카드 (systems/levelCards.js)
  const cb = game.hero.cardBonus;
  if (cb) {
    atkSpeed += cb.atkSpeed; castSpeed += cb.castSpeed; atkPower += cb.atkPower;
    moveSpeed += cb.moveSpeed; health += cb.health; mana += cb.mana;
  }

  const oldEffectiveMax = game.hero.maxHp + game.hero.bonusMaxHp + game.hero.gearMaxHp;
  game.hero.gearAtkSpeed = atkSpeed;
  game.hero.gearElemDmg = elemDmg;
  game.hero.gearCastSpeed = castSpeed;
  game.hero.gearAtkPower = Math.round(atkPower);
  game.hero.gearDefense = defense;
  game.hero.gearEvasion = evasion;
  game.hero.gearArmor = armor;
  game.hero.armorReduction = armorReduction(armor);
  // 주무기(없으면 맨손) + 쌍수일 때 보조무기 - 기본 공격은 둘을 번갈아 씀
  game.hero.weaponStats = {
    main: weaponStats(game.hero.equipment.weaponMain) || unarmedStats(),
    off: weaponStats(game.hero.equipment.weaponOff)
  };
  game.hero.gearSpeedMult = 1 + moveSpeed;
  game.hero.gearMaxHp = Math.round(health);
  game.hero.gearMaxMana = Math.round(mana);

  const newEffectiveMax = game.hero.maxHp + game.hero.bonusMaxHp + game.hero.gearMaxHp;
  if (newEffectiveMax > oldEffectiveMax) game.hero.hp += (newEffectiveMax - oldEffectiveMax);
  game.hero.hp = Math.min(game.hero.hp, newEffectiveMax);
  game.hero.maxMana = game.hero.baseMaxMana + game.hero.gearMaxMana;
  game.hero.mana = Math.min(game.hero.mana, game.hero.maxMana);
}
