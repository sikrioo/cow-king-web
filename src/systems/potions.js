// 물약: 보관 물약 마시기(생명/마나), 바닥 소모품 효과(applyItem)
import {
  VITALITY_DURATION, SPEED_BUFF_DURATION, ATTACK_BUFF_DURATION, DEFENSE_BUFF_DURATION, POTION_COOLDOWN,
  POTION_HEAL_RATIO, POTION_MANA_AMOUNT
} from '../data/balance.js';
import { ITEM_STYLE } from '../data/items.js';
import { player } from '../state.js';
import { spawnHitParticles, floatText } from './fx.js';

export function tryDrinkPotion(kind) {
  if (!player.alive || player.potionCd[kind] > 0) return;
  const label = kind === 'heal' ? '생명' : '마나';
  if ((player.potions[kind] || 0) <= 0) {
    floatText(player.x, player.y - 40, `${label} 물약 없음`, '#999');
    return;
  }
  const color = ITEM_STYLE[kind].color;
  if (kind === 'heal') {
    const maxHp = player.maxHp + player.bonusMaxHp + player.gearMaxHp;
    if (player.hp >= maxHp) { floatText(player.x, player.y - 40, '체력이 가득 차 있어', '#999'); return; }
    const amount = Math.max(1, Math.ceil(maxHp * POTION_HEAL_RATIO));
    player.hp = Math.min(maxHp, player.hp + amount);
    floatText(player.x, player.y - 40, `+${amount} HP`, color);
  } else {
    if (player.mana >= player.maxMana) { floatText(player.x, player.y - 40, '마나가 가득 차 있어', '#999'); return; }
    player.mana = Math.min(player.maxMana, player.mana + POTION_MANA_AMOUNT);
    floatText(player.x, player.y - 40, `+${POTION_MANA_AMOUNT} MP`, color);
  }
  player.potions[kind] -= 1;
  player.potionCd[kind] = POTION_COOLDOWN;
  spawnHitParticles(player.x, player.y, color, 8);
}

export function applyItem(type) {
  // 생명/마나 물약은 줍는 즉시 쓰지 않고 보관함 - tryDrinkPotion으로 마심 (여기는 즉시 효과형 버프 물약만)
  if (type === 'vitality') {
    player.bonusMaxHp = 6;
    player.vitalityTimer = VITALITY_DURATION;
    player.hp = Math.min(player.hp + 6, player.maxHp + player.bonusMaxHp + player.gearMaxHp);
    floatText(player.x, player.y - 40, '최대체력 +6', ITEM_STYLE.vitality.color);
  } else if (type === 'speed') {
    player.speedMult = 1.35;
    player.speedBuffTimer = SPEED_BUFF_DURATION;
    floatText(player.x, player.y - 40, '이동속도 UP', ITEM_STYLE.speed.color);
  } else if (type === 'attack') {
    player.attackBonus = 3;
    player.attackBuffTimer = ATTACK_BUFF_DURATION;
    floatText(player.x, player.y - 40, '공격력 UP', ITEM_STYLE.attack.color);
  } else if (type === 'defense') {
    player.defenseChance = 0.5;
    player.defenseBuffTimer = DEFENSE_BUFF_DURATION;
    floatText(player.x, player.y - 40, '방어력 UP', ITEM_STYLE.defense.color);
  }
}
