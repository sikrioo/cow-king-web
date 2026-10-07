// 성장: 경험치/레벨업, 스탯 투자, 스킬 해금 판정 (해금 판정은 isSkillUnlocked 한 곳 - 스킬트리는 여기만 바꿈)
import { MAX_LEVEL, POINTS_PER_LEVEL, expForLevel } from '../data/balance.js';
import { STAT_DEF } from '../data/items.js';
import { SKILL_META, SKILL_UNLOCK_LEVEL } from '../data/skills.js';
import { CLASSES } from '../data/classes.js';
import { game } from '../state.js';
import { floatText } from './fx.js';
import { recalcGearStats } from './gear.js';

export function gainExp(amount) {
  if (game.hero.level >= MAX_LEVEL) return;
  game.hero.exp += amount;
  while (game.hero.level < MAX_LEVEL && game.hero.exp >= game.hero.expToNext) {
    game.hero.exp -= game.hero.expToNext;
    game.hero.level++;
    game.hero.statPoints += POINTS_PER_LEVEL;
    game.hero.expToNext = expForLevel(game.hero.level);
    floatText(game.hero.x, game.hero.y - 54, `LEVEL UP! Lv.${game.hero.level}`, '#ffe066');
    (CLASSES[game.hero.classKey] || CLASSES.warrior).skills.forEach((id) => {
      if (SKILL_UNLOCK_LEVEL[id] === game.hero.level) floatText(game.hero.x, game.hero.y - 74, `새 스킬 해금: ${SKILL_META[id].label}`, '#9be39b');
    });
    game.shake = Math.min(game.shake + 5, 12);
  }
  if (game.hero.level >= MAX_LEVEL) game.hero.exp = Math.min(game.hero.exp, game.hero.expToNext);
}

export function trySpendStatPoint(statKey) {
  if (game.hero.statPoints <= 0) return;
  game.hero.statPoints -= 1;
  game.hero.levelStats[statKey] = (game.hero.levelStats[statKey] || 0) + 1;
  recalcGearStats();
  floatText(game.hero.x, game.hero.y - 40, `${STAT_DEF[statKey].label} +1 (Lv)`, '#ffe066');
}

export function isSkillUnlocked(id) {
  return game.hero.level >= (SKILL_UNLOCK_LEVEL[id] || 1);
}
