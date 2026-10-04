// 웨이브 구성: 엘리트 뽑기, 다음 웨이브 소환 (보스 웨이브 포함)
import { BOSS_WAVE } from '../data/balance.js';
import {
  ELITE_KINDS, ELITE_MIN_WAVE, ELITE_CHANCE_BASE, ELITE_CHANCE_PER_WAVE, ELITE_CHANCE_MAX
} from '../data/monsters.js';
import { game } from '../state.js';
import { Monster } from '../entities/monster.js';

export function pickCowKind() {
  if (game.wave < ELITE_MIN_WAVE) return 'normal';
  const eliteChance = Math.min(ELITE_CHANCE_BASE + game.wave * ELITE_CHANCE_PER_WAVE, ELITE_CHANCE_MAX);
  if (Math.random() < eliteChance) {
    return ELITE_KINDS[Math.floor(Math.random() * ELITE_KINDS.length)];
  }
  return 'normal';
}

export function startNextWave() {
  game.wave++;
  game.waveBannerTimer = 1.6;
  if (game.wave === BOSS_WAVE) {
    game.cows.push(new Monster(1.0, 'boss'));
    for (let i = 0; i < 4; i++) game.cows.push(new Monster((1.05 + Math.random() * 0.5) * 0.3, 'normal'));
    return;
  }
  const size = 6 + game.wave * 4; // 웨이브가 지날수록 순차적으로 마리 수 증가 (난이도 상향)
  for (let i = 0; i < size; i++) {
    game.cows.push(new Monster((1.05 + Math.random() * 0.5) * 0.3, pickCowKind()));
  }
}
