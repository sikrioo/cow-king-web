// 맵 진행: 입장(인스턴스 - 들어갈 때마다 새로 배치), 파밍 맵 무리 배치, 클리어 판정, 맵별 입장 횟수
// 맵 수치는 data/maps.js, 난이도는 data/difficulty.js. 주인공 상태(레벨·장비)는 그대로 두고 맵 안의 것만 새로 만듦
// 입장/나가기 흐름(상태 전환)은 game.js의 enterMap/goHub
import { MAPS } from '../data/maps.js';
import { DIFFICULTY } from '../data/difficulty.js';
import { FIRST_WAVE_DELAY } from '../data/balance.js';
import { World, Body, world } from '../core/physics.js';
import { game } from '../state.js';
import { Monster } from '../entities/monster.js';
import { setMap, PEN, clampToPen, randomPointInPen } from '../world/arena.js';
import { floatText } from './fx.js';

// 맵 안의 것 전부 치움 (몬스터 바디, 바닥 아이템, 이펙트)
export function clearWorld() {
  game.cows.forEach((c) => { if (c.body) World.remove(world, c.body); });
  game.cows = [];
  game.items = [];
  game.particles = [];
  game.shockwaves = [];
  game.iceRings = [];
  game.hazards = [];
  game.meteors = [];
  game.groundSpells = [];
  game.throws = [];
  game.pendingSpawns = [];
  game.hellfires = [];
  game.corpses = [];
  game.actClear = 0;
  game.actScene = 0;
  game.invade = null;
  if (game.hero) { game.hero.weaponOut = false; game.hero.shieldOut = false; }
  game.decoy = null;
  game.projectiles = [];
  game.lightningBolts = [];
  game.floatTexts = [];
}

export function heroStartPoint(def) {
  return { x: PEN.x + PEN.size * def.start.x, y: PEN.y + PEN.size * def.start.y };
}

export const runKey = (mapId, difficulty) => `${mapId}:${difficulty}`;

// 입장: 맵 바꾸기 → 난이도 배율 → 주인공 시작 위치 → (웨이브) 1웨이브부터 / (파밍) 무리 배치. opts = { difficulty }
export function beginRun(mapId, opts = {}) {
  const def = MAPS[mapId] || MAPS.ranch;
  setMap(mapId);
  const farm = def.mode === 'farm';
  const diffKey = DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal';
  const d = DIFFICULTY[diffKey];
  game.run = {
    mapId, mode: def.mode, difficulty: diffKey, cleared: false, total: 0,
    hpMul: d.hp, dmgMul: d.dmg, expMul: d.exp, gearDropMul: d.gearDrop, rarityBoost: d.rarity,
    resistPenalty: d.resistPenalty || 0, armorPenalty: d.armorPenalty || 0 // 주인공 저항·방어력 패널티 (systems/elements.js)
  };
  const key = runKey(mapId, diffKey);
  game.hero.mapRuns[key] = (game.hero.mapRuns[key] || 0) + 1; // 같은 맵 몇 번째인지 (파밍 회차)

  const p = heroStartPoint(def);
  Body.setPosition(game.hero.body, p);
  Body.setVelocity(game.hero.body, { x: 0, y: 0 });
  game.hero.x = p.x; game.hero.y = p.y;

  if (farm) {
    game.wave = 0;
    game.waveTransition = Infinity; // 파밍 맵엔 웨이브 없음
    game.waveBannerTimer = 1.6; // 맵 이름 배너
    populateFarm(def, d, p);
    game.run.total = game.cows.length;
  } else {
    game.wave = 0; // 난이도마다 1웨이브부터 (1막부터)
    game.act = 0;
    game.waveTransition = FIRST_WAVE_DELAY; // 시작 직후 적이 튀어나오지 않도록 준비 시간
    game.waveBannerTimer = 0;
  }
}

function pickWeighted(weights) {
  const entries = Object.entries(weights);
  let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[0][0];
}

// 무리 자리: 시작 지점에서 멀고 서로 겹치지 않게 (몇 번 다시 뽑아 보고 안 되면 그냥 씀)
function packCenters(def, start) {
  const centers = [];
  for (let i = 0; i < def.packs; i++) {
    let p = null;
    for (let t = 0; t < 24; t++) {
      p = randomPointInPen();
      const farFromStart = Math.hypot(p.x - start.x, p.y - start.y) >= def.packMinDistFromStart;
      const apart = centers.every((c) => Math.hypot(c.x - p.x, c.y - p.y) >= def.packRadius * 3);
      if (farFromStart && apart) break;
    }
    centers.push(p);
  }
  // 시작 지점에서 가장 먼 무리가 우두머리 무리
  return centers.sort((a, b) => Math.hypot(b.x - start.x, b.y - start.y) - Math.hypot(a.x - start.x, a.y - start.y));
}

// 파밍 맵 몬스터 배치: 무리마다 종류를 비중대로 섞고, 난이도에 따라 무리 단위로 면역 하나
function populateFarm(def, d, start) {
  packCenters(def, start).forEach((c, i) => {
    const resist = def.immune && Math.random() < d.immunePack ? { [def.immune[Math.floor(Math.random() * def.immune.length)]]: 1 } : null;
    const base = { hpMul: d.hp, dmgMul: d.dmg, home: c, ...(resist ? { resist } : {}) };
    const [lo, hi] = def.packSize;
    const n = lo + Math.floor(Math.random() * (hi - lo + 1));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * def.packRadius;
      const pos = clampToPen(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, 40);
      game.cows.push(new Monster((1.05 + Math.random() * 0.5) * 0.3, pickWeighted(def.kinds), { ...base, pos }));
    }
    if (i === 0) {
      const b = def.boss;
      game.cows.push(new Monster(b.scale, b.kind, { ...base, pos: c, hpMul: d.hp * b.hpMul, dropCount: b.drops, mapBoss: true }));
    }
  });
}

// 파밍 맵: 다 잡으면 클리어 (한 번만)
export function updateFarmProgress() {
  if (game.run.mode !== 'farm' || game.run.cleared || game.cows.length > 0) return;
  game.run.cleared = true;
  floatText(game.hero.x, game.hero.y - 70, '맵 클리어!', '#ffe066');
  game.shake = Math.min(game.shake + 4, 12);
}
