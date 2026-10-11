// 웨이브 구성: 엘리트 뽑기, 다음 웨이브 소환 (보스 웨이브 포함)
// 넓은 맵: 주인공 주변 링의 2~4곳에서 무리로 생성 → 주인공 쪽으로 몰려옴(Monster hunt)
import {
  WAVE_PACKS_MIN, WAVE_PACKS_MAX, WAVE_SPAWN_DIST_MIN, WAVE_SPAWN_DIST_MAX, WAVE_SPAWN_TOO_CLOSE,
  WAVE_PACK_RADIUS, WAVE_SPAWN_EDGE_MARGIN
} from '../data/balance.js';
import {
  ELITE_KINDS, ELITE_MIN_WAVE, ELITE_CHANCE_BASE, ELITE_CHANCE_PER_WAVE, ELITE_CHANCE_MAX
} from '../data/monsters.js';
import { game } from '../state.js';
import { Monster } from '../entities/monster.js';
import { clampToPen } from '../world/arena.js';
import { ACT_WAVE_SIZE, BOSS_ESCORTS, INVADE } from '../data/acts.js';
import { waveInfo } from '../util.js';

// 이번 막에서 나올 종류: 엘리트 확률(웨이브가 갈수록) → 막의 엘리트 목록, 아니면 막의 일반 비중대로 (data/acts.js)
export function pickCowKind(def = null) {
  const normals = (def && def.normals) || { normal: 1 };
  const pickNormal = () => {
    const keys = Object.keys(normals), total = keys.reduce((s, k) => s + normals[k], 0);
    let r = Math.random() * total;
    for (const k of keys) { r -= normals[k]; if (r < 0) return k; }
    return keys[0];
  };
  if (game.wave < ELITE_MIN_WAVE) return pickNormal();
  const eliteChance = Math.min(ELITE_CHANCE_BASE + game.wave * ELITE_CHANCE_PER_WAVE, ELITE_CHANCE_MAX);
  if (Math.random() < eliteChance) {
    const elites = (def && def.elites) || ELITE_KINDS;
    return elites[Math.floor(Math.random() * elites.length)];
  }
  return pickNormal();
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

// 난이도 배율 (game.run - 보통이면 1 = 기본 수치)
const diffOpts = () => ({ hpMul: game.run.hpMul, dmgMul: game.run.dmgMul });

// 다음 웨이브: 막(data/acts.js)의 마지막 웨이브면 그 막 보스 + 호위, 아니면 막의 몬스터 무리
export function startNextWave() {
  game.wave++;
  game.waveBannerTimer = 1.6;
  const info = waveInfo(game.wave);
  game.act = info.act;
  if (info.isBoss) {
    const c = pickPackCenter();
    game.cows.push(new Monster(info.def.boss === 'boss' ? 1.0 : 0.4, info.def.boss, { pos: c, hunt: true, ...diffOpts() }));
    for (let i = 0; i < BOSS_ESCORTS; i++) game.cows.push(new Monster((1.05 + Math.random() * 0.5) * 0.3, pickCowKind({ normals: info.def.normals }), { pos: packPoint(c), hunt: true, ...diffOpts() }));
    return;
  }
  // 난입 도살자: 이번 웨이브 도중 어느 순간 (경고 없음)
  game.invade = info.actWave >= INVADE.minActWave && info.def.invader && Math.random() < INVADE.chance
    ? { t: INVADE.delay[0] + Math.random() * (INVADE.delay[1] - INVADE.delay[0]), kind: info.def.invader } : null;
  const size = ACT_WAVE_SIZE.base + info.actWave * ACT_WAVE_SIZE.perWave + info.act * ACT_WAVE_SIZE.perAct; // 막 안에서 웨이브마다 늘어남
  const packs = WAVE_PACKS_MIN + Math.floor(Math.random() * (WAVE_PACKS_MAX - WAVE_PACKS_MIN + 1));
  const centers = Array.from({ length: packs }, () => pickPackCenter());
  for (let i = 0; i < size; i++) {
    game.cows.push(new Monster((1.05 + Math.random() * 0.5) * 0.3, pickCowKind(info.def), { pos: packPoint(centers[i % packs]), hunt: true, ...diffOpts() }));
  }
}

// 난입 도살자 (game.invade): 시간이 되면 주인공 주변 링에 불쑥 - 경고 없이 (웨이브가 이미 끝났으면 취소)
export function updateInvade(dt) {
  const v = game.invade;
  if (!v) return;
  if (!game.cows.some((c) => c.state !== 'dead')) { game.invade = null; return; }
  v.t -= dt;
  if (v.t > 0) return;
  game.invade = null;
  game.cows.push(new Monster((1.05 + Math.random() * 0.5) * 0.3, v.kind, { pos: pickPackCenter(), hunt: true, ...diffOpts() }));
}
