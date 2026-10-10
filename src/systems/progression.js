// 성장: 경험치/레벨업(→ 레벨업 카드), 스탯 투자, 스킬을 쓸 수 있는지 판정(isSkillUnlocked 한 곳)
import { MAX_LEVEL, POINTS_PER_LEVEL, expForLevel } from '../data/balance.js';
import { STAT_DEF } from '../data/items.js';
import { game } from '../state.js';
import { floatText } from './fx.js';
import { recalcGearStats } from './gear.js';
import { queueLevelCard } from './levelCards.js';
import { learnedLevel } from '../util.js';

export function gainExp(amount) {
  if (game.sandbox) return; // 관리자 미리보기에선 레벨업(카드) 없음
  if (game.hero.level >= MAX_LEVEL) return;
  game.hero.exp += amount;
  while (game.hero.level < MAX_LEVEL && game.hero.exp >= game.hero.expToNext) {
    game.hero.exp -= game.hero.expToNext;
    game.hero.level++;
    game.hero.statPoints += POINTS_PER_LEVEL;
    game.hero.expToNext = expForLevel(game.hero.level);
    floatText(game.hero.x, game.hero.y - 54, `LEVEL UP! Lv.${game.hero.level}`, '#ffe066');
    queueLevelCard(); // 레벨마다 카드 한 번 (systems/levelCards.js)
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

// 배운 스킬(스킬 레벨 1 이상)만 슬롯에 넣을 수 있음 - 배우는 건 레벨업 카드
export function isSkillUnlocked(id) {
  return learnedLevel(game.hero, id) > 0;
}
