// 웨이브 구성: 엘리트 뽑기, 다음 웨이브 소환 (보스 웨이브 포함)
// 넓은 맵: 주인공 주변 링의 2~4곳에서 무리로 생성 → 주인공 쪽으로 몰려옴(Monster hunt)
import {
  BOSS_WAVE, WAVE_PACKS_MIN, WAVE_PACKS_MAX, WAVE_SPAWN_DIST_MIN, WAVE_SPAWN_DIST_MAX, WAVE_SPAWN_TOO_CLOSE,
  WAVE_PACK_RADIUS, WAVE_SPAWN_EDGE_MARGIN
} from '../data/balance.js';
import {
  ELITE_KINDS, ELITE_MIN_WAVE, ELITE_CHANCE_BASE, ELITE_CHANCE_PER_WAVE, ELITE_CHANCE_MAX
} from '../data/monsters.js';
import { game } from '../state.js';
import { Monster } from '../entities/monster.js';
import { clampToPen } from '../world/arena.js';

export function pickCowKind() {
  if (game.wave < ELITE_MIN_WAVE) return 'normal';
  const eliteChance = Math.min(ELITE_CHANCE_BASE + game.wave * ELITE_CHANCE_PER_WAVE, ELITE_CHANCE_MAX);
  if (Math.random() < eliteChance) {
    return ELITE_KINDS[Math.floor(Math.random() * ELITE_KINDS.length)];
  }
  return 'normal';
}

// 무리 중심: 주인공에서 링 거리만큼 떨어진 곳(목장 안). 맵 끝에 걸려 너무 가까우면 다른 방향으로 다시
export function pickPackCenter() {
  let best = null;
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = WAVE_SPAWN_DIST_MIN + Math.random() * (WAVE_SPAWN_DIST_MAX - WAVE_SPAWN_DIST_MIN);
    const p = clampToPen(game.hero.x + Math.cos(a) * d, game.hero.y + Math.sin(a) * d, WAVE_SPAWN_EDGE_MARGIN);
    const dist = Math.hypot(p.x - game.hero.x, p.y - game.hero.y);
    if (!best || dist > best.dist) best = { ...p, dist };
    if (dist >= WAVE_SPAWN_TOO_CLOSE) break;
  }
  return { x: best.x, y: best.y };
}

function packPoint(center) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * WAVE_PACK_RADIUS;
  return clampToPen(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r, WAVE_SPAWN_EDGE_MARGIN);
}

export function startNextWave() {
  game.wave++;
  game.hero.maxWave = Math.max(game.hero.maxWave || 0, game.wave); // 맵 선택 화면의 시작 웨이브 상한
  game.waveBannerTimer = 1.6;
  if (game.wave === BOSS_WAVE) {
    const c = pickPackCenter();
    game.cows.push(new Monster(1.0, 'boss', { pos: c, hunt: true }));
    for (let i = 0; i < 4; i++) game.cows.push(new Monster((1.05 + Math.random() * 0.5) * 0.3, 'normal', { pos: packPoint(c), hunt: true }));
    return;
  }
  const size = 6 + game.wave * 4; // 웨이브가 지날수록 순차적으로 마리 수 증가 (난이도 상향)
  const packs = WAVE_PACKS_MIN + Math.floor(Math.random() * (WAVE_PACKS_MAX - WAVE_PACKS_MIN + 1));
  const centers = Array.from({ length: packs }, () => pickPackCenter());
  for (let i = 0; i < size; i++) {
    game.cows.push(new Monster((1.05 + Math.random() * 0.5) * 0.3, pickCowKind(), { pos: packPoint(centers[i % packs]), hunt: true }));
  }
}
