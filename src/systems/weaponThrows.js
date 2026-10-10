// 무기 특수기 (전사, 스킬 기획 정의서 v0.1): 무기 자체가 날아가고 돌고 돌아옴 - 던진 무기 하나 = game.throws 항목 하나, 종류별로 이동 방식만 다름
//   회전검(왕복) / 내려찍기(대검 낙하) / 회전도끼(내 주위 궤도) / 튕기는 방패(적 사이) / 굴러가는 메이스(포물선→굴림) / 관통창(관통→멈춤→복귀) / 급소 투척(단검, 한 명)
//   피해 = 무기 한 타(combat.heroHitDamage) × 배율 × 스킬 레벨. 주무기가 손을 떠난 동안 hero.weaponOut(기본 공격 못 함, 그림에서 무기 숨김), 방패는 hero.shieldOut
//   수치는 data/skills.js SKILL_STATS, 그림은 render/throwFx.js. 해금(마스터리 Lv)은 systems/levelCards.js
import { SKILL_META, SKILL_STATS, THROW_RETURN_SPEED } from '../data/skills.js';
import { GEAR_VARIANT_LABEL } from '../data/items.js';
import { game } from '../state.js';
import { castSpeedMul, skillMul, specialUsable as usableFor } from '../util.js';
import { THROW_TRAIL } from '../data/skills.js';
import { ELEMENT_DEF } from '../data/elements.js';
import { rollLightning } from './elements.js';
import { canHit, getCowHitRadius, getCowBody, heroHitDamage, cowEdgeDist } from './combat.js';
import { damageCowPacket, weaponElementHit, bleedCow } from './elementCombat.js';
import { applyCC, isBossCow } from './cc.js';
import { spawnHitParticles, spawnShockwave, spawnLightningBolt, floatText, spawnDamageNumber } from './fx.js';
import { clampToPen } from '../world/arena.js';

const h = () => game.hero;
const alive = () => game.cows.filter((c) => c.state !== 'dead' && canHit(game.hero, c));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const touching = (c, t, r) => dist(c, t) <= r + getCowHitRadius(c);

// 이 특수기를 지금 쓸 수 있는 무기를 들었는지 (규칙은 util.specialUsable)
export const specialUsable = (id) => usableFor(game.hero, id);

// 시전 조건(무기·이미 던짐·마나·대기시간) 확인 후 소모. 대상 확인이 먼저 필요한 스킬은 check()가 false면 아무것도 안 씀
function begin(id, check) {
  const hero = h(), s = SKILL_STATS[id], meta = SKILL_META[id];
  if (!hero.alive || hero.spellCd[id] > 0) return false;
  const warn = (text) => { if (!(hero.noManaWarn > 0)) { floatText(hero.x, hero.y - 40, text, '#ffd36a'); hero.noManaWarn = 1; } return false; };
  if (!specialUsable(id)) return warn(`${meta.weapon ? GEAR_VARIANT_LABEL[meta.weapon] : '방패'}을(를) 들어야 함`);
  if (meta.offhand ? hero.shieldOut : hero.weaponOut) return false; // 이미 던져서 손에 없음
  if (check && !check()) return warn('대상 없음');
  if (hero.mana < s.mana) return warn('마나 부족');
  hero.mana -= s.mana;
  hero.spellCd[id] = s.cooldown * castSpeedMul(hero);
  hero.currentAttackDuration = 0.22;
  hero.attackTimer = 0.22; // 던지는 자세 (기본 공격 동작 재사용)
  return true;
}

function launch(t) {
  const hero = h();
  const w = hero.equipment.weaponMain;
  game.throws.push({
    age: 0, phase: 'out', x: hero.x, y: hero.y, z: 20, spin: hero.facing, hits: new Map(), done: false,
    variant: SKILL_META[t.id].offhand ? 'shield' : (w && w.variant) || 'sword', hand: SKILL_META[t.id].offhand ? 'off' : 'main', ...t
  });
  syncHands();
}

// 던진 무기 한 번의 피해: 무기 한 타 × ratio × 스킬 레벨 + 특수기 원소(× elemRatio - 화염/번개/독/냉기), 무기 원소 옵션도 같이
//   opts.lightning = 번개만 따로(회전도끼 연쇄), 원소 효과(화상·둔화·중독)는 elementCombat이 붙임
function strike(t, c, ratio, opts = {}) {
  if (!c || c.state === 'dead') return 0;
  const s = SKILL_STATS[t.id];
  const base = heroHitDamage() * skillMul(h(), t.id, 'damage');
  const packet = {};
  const mul = opts.mul || 1;
  if (ratio > 0) packet.phys = Math.max(1, Math.round(base * ratio * mul)); // ratio 0 = 번개만 (회전도끼 연쇄)
  if (ratio > 0 && s.elem) packet[s.elem] = Math.max(1, Math.round(base * ratio * mul * s.elemRatio));
  if (opts.lightning) packet.lightning = (packet.lightning || 0) + Math.max(1, Math.round(base * opts.lightning));
  if (packet.lightning) packet.lightning = rollLightning(packet.lightning);
  const boss = isBossCow(c);
  const dealt = damageCowPacket(c, packet, { knock: boss ? 0 : (opts.knock != null ? opts.knock : 3), fromX: opts.fromX != null ? opts.fromX : t.x, fromY: opts.fromY != null ? opts.fromY : t.y });
  weaponElementHit(c);
  spawnHitParticles(c.x, c.y - 10, opts.color || (s.elem ? ELEMENT_DEF[s.elem].color : '#e8e2d0'), 6);
  if (opts.stun) applyCC(c, 'stun', opts.stun);
  return dealt;
}

// 돌아오기: 주인공 쪽으로 THROW_RETURN_SPEED - 닿으면 끝
function goHome(t, dt) {
  const hero = h();
  const dx = hero.x - t.x, dy = hero.y - t.y, d = Math.hypot(dx, dy);
  const step = THROW_RETURN_SPEED * dt;
  if (d <= step + 16) { t.done = true; return; }
  t.x += (dx / d) * step; t.y += (dy / d) * step;
  t.z += (20 - t.z) * Math.min(1, dt * 8);
}
function moveToward(t, tx, ty, speed, dt) { // 닿았으면 true
  const dx = tx - t.x, dy = ty - t.y, d = Math.hypot(dx, dy), step = speed * dt;
  if (d <= step) { t.x = tx; t.y = ty; return true; }
  t.x += (dx / d) * step; t.y += (dy / d) * step;
  return false;
}

// ---- 회전검: 곧게 갔다가 돌아옴, 갈 때·올 때 같은 적 tick초마다 최대 maxTicks번 ----
export function trySpinBlade() {
  if (!begin('spinblade')) return;
  const hero = h();
  launch({ id: 'spinblade', dirX: Math.cos(hero.facing), dirY: Math.sin(hero.facing), traveled: 0 });
}
function updateSpinBlade(t, dt) {
  const s = SKILL_STATS.spinblade;
  t.spin += dt * 30;
  if (t.phase === 'out') {
    t.x += t.dirX * s.speed * dt; t.y += t.dirY * s.speed * dt; t.traveled += s.speed * dt;
    const c = clampToPen(t.x, t.y, 10);
    if (t.traveled >= s.range || c.x !== t.x || c.y !== t.y) { t.phase = 'back'; t.hits = new Map(); }
  } else goHome(t, dt);
  alive().forEach((c) => {
    if (!touching(c, t, s.radius)) return;
    const rec = t.hits.get(c) || { n: 0, last: -9 };
    if (rec.n >= s.maxTicks || t.age - rec.last < s.tick) return;
    rec.n++; rec.last = t.age; t.hits.set(c, rec);
    strike(t, c, s.ratio, { knock: 1 });
  });
}

// ---- 내려찍기(대검): 지점 위에서 커지다가 낙하 → 착지 피해 + 앞쪽 충격파 → 꽂혀 있다가 돌아옴 ----
export function trySkyfall() {
  const s = SKILL_STATS.skyfall, hero = h();
  if (!begin('skyfall')) return;
  let px = hero.aimX != null ? hero.aimX : hero.x + Math.cos(hero.facing) * s.range * 0.6;
  let py = hero.aimY != null ? hero.aimY : hero.y + Math.sin(hero.facing) * s.range * 0.6;
  const d = Math.hypot(px - hero.x, py - hero.y);
  if (d > s.range) { px = hero.x + (px - hero.x) * s.range / d; py = hero.y + (py - hero.y) * s.range / d; } // 사거리 끝으로
  const p = clampToPen(px, py, 20);
  launch({ id: 'skyfall', x: p.x, y: p.y, z: s.height, dir: Math.atan2(p.y - hero.y, p.x - hero.x), radius: s.radius * skillMul(hero, 'skyfall', 'radius'), phase: 'charge' });
}
function updateSkyfall(t, dt) {
  const s = SKILL_STATS.skyfall;
  if (t.phase === 'charge') {
    if (t.age < s.charge + s.hang + s.fall) return; // 충전 → 멈칫 → 낙하 (그림이 나이로 나눠 그림)
    t.phase = 'stuck'; t.z = 0; t.stuckAt = t.age;
    const fx = Math.cos(t.dir), fy = Math.sin(t.dir);
    alive().forEach((c) => {
      const dx = c.x - t.x, dy = c.y - t.y, d = Math.hypot(dx, dy);
      if (d <= t.radius + getCowHitRadius(c)) { strike(t, c, s.ratio, { knock: 8 }); return; }
      if (d > s.waveRange + getCowHitRadius(c)) return;
      let diff = Math.abs(Math.atan2(dy, dx) - Math.atan2(fy, fx));
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff <= s.waveArc / 2) strike(t, c, s.waveRatio, { knock: 6 });
    });
    spawnShockwave(t.x, t.y, t.radius, '#ff9a3d'); // 불의 대검 - 화염 충격파
    spawnShockwave(t.x + fx * s.waveRange * 0.5, t.y + fy * s.waveRange * 0.5, s.waveRange * 0.5, '#ff7a1a');
    spawnHitParticles(t.x, t.y, '#ffb347', 18);
    game.shake = Math.min(game.shake + 10, 12);
    game.hitstop = Math.max(game.hitstop, 4);
    game.impactFlash = Math.max(game.impactFlash, 0.15);
    return;
  }
  if (t.phase === 'stuck') { if (t.age - t.stuckAt >= s.stick) t.phase = 'back'; return; }
  t.spin += dt * 18;
  goHome(t, dt);
}

// ---- 회전도끼: 내 주위를 한 바퀴 (반경이 spread초 동안 벌어짐), 같은 적 한 번 - 물리 + 번개, 맞은 적에서 번개가 chain명에게 튐 ----
export function tryWhirlAxe() {
  if (!begin('whirlaxe')) return;
  launch({ id: 'whirlaxe', start: h().facing });
}
function updateWhirlAxe(t, dt) {
  const s = SKILL_STATS.whirlaxe, hero = h();
  t.spin += dt * 24;
  if (t.phase === 'back') { goHome(t, dt); return; }
  const k = Math.min(1, t.age / s.spread), a = t.start + (t.age / s.time) * Math.PI * 2;
  t.x = hero.x + Math.cos(a) * s.orbit * k; t.y = hero.y + Math.sin(a) * s.orbit * k;
  if (t.age >= s.time) t.phase = 'back';
  alive().forEach((c) => {
    if (t.hits.has(c) || !touching(c, t, s.radius)) return;
    t.hits.set(c, true);
    strike(t, c, s.ratio, { knock: 4 });
    const from = getCowBody(c), done = new Set([c]);
    for (let j = 0, cur = from; j < s.chain; j++) { // 번개 연쇄 (연쇄번개와 같은 그림)
      const next = alive().filter((o) => !done.has(o) && dist(getCowBody(o), cur) <= s.chainRange).sort((a2, b2) => dist(getCowBody(a2), cur) - dist(getCowBody(b2), cur))[0];
      if (!next) break;
      const to = getCowBody(next);
      spawnLightningBolt(cur.x, cur.y, to.x, to.y);
      done.add(next);
      strike(t, next, 0, { lightning: s.chainRatio, knock: 0, color: '#fff066' });
      cur = to;
    }
  });
}

// ---- 튕기는 방패: 가까운 적 → 적 사이를 튕김(같은 적 다시 안 감) → 마지막 적 기절 → 돌아옴 ----
const nearestFrom = (p, range, skip) => alive().filter((c) => !skip.has(c) && dist(c, p) <= range).sort((a, b) => dist(a, p) - dist(b, p))[0] || null;
export function tryShieldBounce() {
  const s = SKILL_STATS.shieldbounce;
  let first = null;
  if (!begin('shieldbounce', () => (first = nearestFrom(h(), s.first, new Set())))) return;
  launch({ id: 'shieldbounce', target: first, count: 0 });
}
function updateShieldBounce(t, dt) {
  const s = SKILL_STATS.shieldbounce;
  t.spin += dt * 20;
  if (t.phase === 'back') { goHome(t, dt); return; }
  const c = t.target;
  const tx = c ? c.x : t.x, ty = c ? c.y : t.y;
  if (!moveToward(t, tx, ty, s.speed, dt)) return;
  t.count++;
  t.hits.set(c, true);
  const next = c && t.count < s.bounces ? nearestFrom(c, s.seek, t.hits) : null;
  if (c && c.state !== 'dead') {
    if (next) strike(t, c, s.ratio, { knock: 3, color: '#e8d8b0' });
    else strike(t, c, s.lastRatio, { knock: 5, stun: s.stun, color: '#ffe08a' }); // 마지막 타격 (대상이 더 없으면 그 자리에서)
  }
  spawnHitParticles(t.x, t.y - 10, '#e8d8b0', 4);
  if (next) t.target = next; else t.phase = 'back';
}

// ---- 굴러가는 메이스: 포물선으로 던짐 → 착지 피해 → 앞으로 굴러감(작은 카우는 밀고, 큰 적에 부딪히면 멈추며 큰 피해) → 돌아옴 ----
export function tryRollMace() {
  if (!begin('rollmace')) return;
  const s = SKILL_STATS.rollmace, hero = h();
  const dx = Math.cos(hero.facing), dy = Math.sin(hero.facing);
  const land = clampToPen(hero.x + dx * s.throw, hero.y + dy * s.throw, 20);
  launch({ id: 'rollmace', sx: hero.x, sy: hero.y, lx: land.x, ly: land.y, dirX: dx, dirY: dy, rolled: 0 });
}
function updateRollMace(t, dt) {
  const s = SKILL_STATS.rollmace;
  if (t.phase === 'out') { // 포물선
    const k = Math.min(1, t.age / s.flight);
    t.x = t.sx + (t.lx - t.sx) * k; t.y = t.sy + (t.ly - t.sy) * k; t.z = 20 * (1 - k) + Math.sin(k * Math.PI) * s.arc;
    t.spin += dt * 14;
    if (k < 1) return;
    t.phase = 'roll'; t.z = 0;
    alive().forEach((c) => { if (touching(c, t, s.landRadius)) { t.hits.set(c, true); strike(t, c, s.landRatio, { knock: 4 }); } });
    spawnShockwave(t.x, t.y, s.landRadius, '#bfeaff'); // 얼음 메이스
    game.shake = Math.min(game.shake + 4, 12);
    return;
  }
  if (t.phase === 'roll') {
    const step = s.rollSpeed * dt;
    t.x += t.dirX * step; t.y += t.dirY * step; t.rolled += step; t.spin += step / 12;
    const c0 = clampToPen(t.x, t.y, 12);
    let stop = t.rolled >= s.roll || c0.x !== t.x || c0.y !== t.y;
    alive().forEach((c) => {
      if (stop || !touching(c, t, s.radius)) return;
      if (c.kind === 'normal') { // 작은 카우: 밀어냄 (한 번씩 피해)
        if (t.hits.get(c) !== 'roll') { t.hits.set(c, 'roll'); strike(t, c, s.rollRatio, { knock: s.knock, stun: s.stun, fromX: t.x - t.dirX * 30, fromY: t.y - t.dirY * 30 }); }
        return;
      }
      strike(t, c, s.stopRatio, { knock: s.knock, stun: s.stun, color: '#ffd36a' }); // 큰 적: 멈추며 충돌 피해
      spawnShockwave(t.x, t.y, 40, '#ffd36a');
      game.shake = Math.min(game.shake + 5, 12);
      game.hitstop = Math.max(game.hitstop, 3);
      stop = true;
    });
    if (stop) { t.phase = 'rest'; t.restAt = t.age; }
    return;
  }
  if (t.phase === 'rest') { if (t.age - t.restAt >= 0.2) t.phase = 'back'; return; }
  t.spin += dt * 14;
  goHome(t, dt);
}

// ---- 관통창: 곧게 날아가며 지나가는 적마다 피해 + 출혈 → 끝에서 멈춤 → 돌아옴(안 맞음) ----
export function tryPierceSpear() {
  if (!begin('piercespear')) return;
  const hero = h();
  launch({ id: 'piercespear', dirX: Math.cos(hero.facing), dirY: Math.sin(hero.facing), angle: hero.facing, traveled: 0 });
}
function updatePierceSpear(t, dt) {
  const s = SKILL_STATS.piercespear;
  if (t.phase === 'out') {
    t.x += t.dirX * s.speed * dt; t.y += t.dirY * s.speed * dt; t.traveled += s.speed * dt;
    alive().forEach((c) => {
      if (t.hits.has(c) || !touching(c, t, s.radius)) return;
      t.hits.set(c, true);
      strike(t, c, s.ratio, { knock: 2 });
      bleedCow(c, heroHitDamage() * skillMul(h(), 'piercespear', 'damage') * s.bleed, s.bleedTime);
    });
    const c0 = clampToPen(t.x, t.y, 10);
    if (t.traveled >= s.range || c0.x !== t.x || c0.y !== t.y) { t.phase = 'pause'; t.pauseAt = t.age; }
    return;
  }
  if (t.phase === 'pause') { if (t.age - t.pauseAt >= s.pause) t.phase = 'back'; return; }
  t.angle = Math.atan2(t.y - h().y, t.x - h().x); // 뒤로 끌려오듯 (끝이 바깥을 향함)
  goHome(t, dt);
}

// ---- 급소 투척(단검): 커서 위 적(조준 지점 근처) 없으면 가까운 적 하나 → 잠깐 겨눴다가 초고속 → 꽂힘 → 돌아옴 ----
export function tryVitalThrow() {
  const s = SKILL_STATS.vitalthrow, hero = h();
  let target = null;
  const pick = () => {
    const cows = alive().filter((c) => dist(c, hero) <= s.range);
    if (hero.aimX != null) target = cows.find((c) => cowEdgeDist(c, hero.aimX, hero.aimY) <= 8) || null; // 자동 조준이 정한 적
    if (!target) target = cows.sort((a, b) => dist(a, hero) - dist(b, hero))[0] || null;
    return !!target;
  };
  if (!begin('vitalthrow', pick)) return;
  launch({ id: 'vitalthrow', target, phase: 'charge', angle: Math.atan2(target.y - hero.y, target.x - hero.x) });
}
function updateVitalThrow(t, dt) {
  const s = SKILL_STATS.vitalthrow, hero = h(), c = t.target;
  if (t.phase === 'charge') {
    t.x = hero.x + Math.cos(t.angle) * hero.r; t.y = hero.y + Math.sin(t.angle) * hero.r;
    if (c && c.state !== 'dead') t.angle = Math.atan2(c.y - t.y, c.x - t.x);
    if (t.age >= s.charge) { t.phase = 'out'; t.lastX = c.x; t.lastY = c.y; }
    return;
  }
  if (t.phase === 'out') {
    if (c && c.state !== 'dead') { t.lastX = c.x; t.lastY = c.y; }
    t.angle = Math.atan2(t.lastY - t.y, t.lastX - t.x);
    if (!moveToward(t, t.lastX, t.lastY, s.speed, dt)) return;
    t.phase = 'stuck'; t.stuckAt = t.age;
    if (!c || c.state === 'dead') return; // 날아가는 동안 죽음 - 빈 자리에 꽂힘
    const elite = c.kind !== 'normal';
    const crit = c.hp <= c.maxHp * s.execute;
    strike(t, c, s.ratio, { mul: (elite ? 1 + s.eliteBonus : 1) * (crit ? s.crit : 1), knock: 2 });
    if (crit) spawnDamageNumber(c.x, c.y - 60 * c.scale, '치명타!', '#ffe066');
    game.hitstop = Math.max(game.hitstop, 3);
    return;
  }
  if (t.phase === 'stuck') {
    if (c && c.state !== 'dead') { t.x = c.x; t.y = c.y; }
    if (t.age - t.stuckAt >= s.stick) t.phase = 'back';
    return;
  }
  t.angle = Math.atan2(t.y - hero.y, t.x - hero.x);
  goHome(t, dt);
}

const UPDATE = {
  spinblade: updateSpinBlade, skyfall: updateSkyfall, whirlaxe: updateWhirlAxe, shieldbounce: updateShieldBounce,
  rollmace: updateRollMace, piercespear: updatePierceSpear, vitalthrow: updateVitalThrow
};

// 손에 무기가 있는지 (기본 공격·그림이 읽음)
function syncHands() {
  const hero = h();
  hero.weaponOut = game.throws.some((t) => t.hand === 'main');
  hero.shieldOut = game.throws.some((t) => t.hand === 'off');
}

export function updateThrows(dt) {
  for (let i = game.throws.length - 1; i >= 0; i--) {
    const t = game.throws[i];
    t.age += dt;
    if (!game.hero.alive) t.done = true;
    else UPDATE[t.id](t, dt);
    (t.trail || (t.trail = [])).push({ x: t.x, y: t.y - t.z }); // 원소 꼬리 (그림용 지난 위치)
    if (t.trail.length > THROW_TRAIL) t.trail.shift();
    if (t.done) game.throws.splice(i, 1);
  }
  syncHands();
}
