// 성장: 경험치/레벨업, 스탯 투자, 스킬 해금 판정 (해금 판정은 isSkillUnlocked 한 곳 - 스킬트리는 여기만 바꿈)
import { MAX_LEVEL, POINTS_PER_LEVEL, expForLevel } from '../data/balance.js';
import { STAT_DEF } from '../data/items.js';
import { SKILL_META, SKILL_UNLOCK_LEVEL } from '../data/skills.js';
import { game, player } from '../state.js';
import { floatText } from './fx.js';
import { recalcGearStats } from './gear.js';

export function gainExp(amount) {
  if (player.level >= MAX_LEVEL) return;
  player.exp += amount;
  while (player.level < MAX_LEVEL && player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    player.level++;
    player.statPoints += POINTS_PER_LEVEL;
    player.expToNext = expForLevel(player.level);
    floatText(player.x, player.y - 54, `LEVEL UP! Lv.${player.level}`, '#ffe066');
    Object.keys(SKILL_UNLOCK_LEVEL).forEach((id) => {
      if (SKILL_UNLOCK_LEVEL[id] === player.level) floatText(player.x, player.y - 74, `새 스킬 해금: ${SKILL_META[id].label}`, '#9be39b');
    });
    game.shake = Math.min(game.shake + 5, 12);
  }
  if (player.level >= MAX_LEVEL) player.exp = Math.min(player.exp, player.expToNext);
}

export function trySpendStatPoint(statKey) {
  if (player.statPoints <= 0) return;
  player.statPoints -= 1;
  player.levelStats[statKey] = (player.levelStats[statKey] || 0) + 1;
  recalcGearStats();
  floatText(player.x, player.y - 40, `${STAT_DEF[statKey].label} +1 (Lv)`, '#ffe066');
}

export function isSkillUnlocked(id) {
  return player.level >= (SKILL_UNLOCK_LEVEL[id] || 1);
}
