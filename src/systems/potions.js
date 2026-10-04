// 물약: 보관 물약 마시기(생명/마나), 바닥 소모품 효과(applyItem)
import {
  VITALITY_DURATION, SPEED_BUFF_DURATION, ATTACK_BUFF_DURATION, DEFENSE_BUFF_DURATION, POTION_COOLDOWN,
  POTION_HEAL_RATIO, POTION_MANA_AMOUNT
} from '../data/balance.js';
import { ITEM_STYLE } from '../data/items.js';
import { game } from '../state.js';
import { spawnHitParticles, floatText } from './fx.js';

export function tryDrinkPotion(kind) {
  if (!game.hero.alive || game.hero.potionCd[kind] > 0) return;
  const label = kind === 'heal' ? '생명' : '마나';
  if ((game.hero.potions[kind] || 0) <= 0) {
    floatText(game.hero.x, game.hero.y - 40, `${label} 물약 없음`, '#999');
    return;
  }
  const color = ITEM_STYLE[kind].color;
  if (kind === 'heal') {
    const maxHp = game.hero.maxHp + game.hero.bonusMaxHp + game.hero.gearMaxHp;
    if (game.hero.hp >= maxHp) { floatText(game.hero.x, game.hero.y - 40, '체력이 가득 차 있어', '#999'); return; }
    const amount = Math.max(1, Math.ceil(maxHp * POTION_HEAL_RATIO));
    game.hero.hp = Math.min(maxHp, game.hero.hp + amount);
    floatText(game.hero.x, game.hero.y - 40, `+${amount} HP`, color);
  } else {
    if (game.hero.mana >= game.hero.maxMana) { floatText(game.hero.x, game.hero.y - 40, '마나가 가득 차 있어', '#999'); return; }
    game.hero.mana = Math.min(game.hero.maxMana, game.hero.mana + POTION_MANA_AMOUNT);
    floatText(game.hero.x, game.hero.y - 40, `+${POTION_MANA_AMOUNT} MP`, color);
  }
  game.hero.potions[kind] -= 1;
  game.hero.potionCd[kind] = POTION_COOLDOWN;
  spawnHitParticles(game.hero.x, game.hero.y, color, 8);
}

export function applyItem(type) {
  // 생명/마나 물약은 줍는 즉시 쓰지 않고 보관함 - tryDrinkPotion으로 마심 (여기는 즉시 효과형 버프 물약만)
  if (type === 'vitality') {
    game.hero.bonusMaxHp = 6;
    game.hero.vitalityTimer = VITALITY_DURATION;
    game.hero.hp = Math.min(game.hero.hp + 6, game.hero.maxHp + game.hero.bonusMaxHp + game.hero.gearMaxHp);
    floatText(game.hero.x, game.hero.y - 40, '최대체력 +6', ITEM_STYLE.vitality.color);
  } else if (type === 'speed') {
    game.hero.speedMult = 1.35;
    game.hero.speedBuffTimer = SPEED_BUFF_DURATION;
    floatText(game.hero.x, game.hero.y - 40, '이동속도 UP', ITEM_STYLE.speed.color);
  } else if (type === 'attack') {
    game.hero.attackBonus = 3;
    game.hero.attackBuffTimer = ATTACK_BUFF_DURATION;
    floatText(game.hero.x, game.hero.y - 40, '공격력 UP', ITEM_STYLE.attack.color);
  } else if (type === 'defense') {
    game.hero.defenseChance = 0.5;
    game.hero.defenseBuffTimer = DEFENSE_BUFF_DURATION;
    floatText(game.hero.x, game.hero.y - 40, '블락률 UP', ITEM_STYLE.defense.color);
  }
}
