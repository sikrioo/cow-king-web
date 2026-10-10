// 원소 피해 규칙: 피해 묶음 → 방어력/저항 적용, 상태 효과(화상/중독/둔화), 지속 피해 틱, 주인공 사망 처리
// 수치는 data/elements.js. 피해 묶음 = { phys, fire, cold, lightning, poison } (없는 항목은 0, 숫자 하나면 물리)
import { SKILL_STATS } from '../data/skills.js';
import {
  ELEMENTS, ELEMENT_DEF, PHYSICAL_COLOR, RESIST_CAP, DOT_TICK, BURN_RATIO, BURN_DURATION,
  POISON_RATIO, POISON_DURATION, CHILL_DURATION, LIGHTNING_MIN, LIGHTNING_MAX
} from '../data/elements.js';
import { Body } from '../core/physics.js';
import { game, dev } from '../state.js';
import { recordRun } from '../save.js';
import { spawnDamageNumber, spawnHitParticles, spawnShockwave, floatText } from './fx.js';
import { curseMul } from './curses.js';

export function toPacket(dmg) {
  return typeof dmg === 'number' ? { phys: dmg } : dmg;
}

// 번개 피해 굴림: 기준값의 LIGHTNING_MIN~MAX배 (정수)
// minBonus: 하한을 올림(주인공 번개 마스터리 - 편차가 위로, 상한은 그대로)
export function rollLightning(base, minBonus = 0) {
  const lo = Math.min(LIGHTNING_MAX, LIGHTNING_MIN + minBonus);
  return Math.max(1, Math.round(base * (lo + Math.random() * (LIGHTNING_MAX - lo))));
}

export function heroResist(el) {
  return Math.min(game.hero.resist[el] || 0, RESIST_CAP);
}

// 주인공이 받는 피해: 물리 = 방어력, 원소 = 저항 → { total(최소 1), parts: { phys|원소: 정수 }, dominant(가장 큰 항목) }
export function resolveHeroDamage(packet) {
  const parts = {};
  let total = 0, dominant = 'phys', best = -1;
  const add = (key, v) => {
    parts[key] = v;
    total += v;
    if (v > best) { best = v; dominant = key; }
  };
  if (packet.phys) add('phys', Math.round(packet.phys * (1 - game.hero.armorReduction)));
  ELEMENTS.forEach((el) => { if (packet[el]) add(el, Math.round(packet[el] * (1 - heroResist(el)))); });
  return { total: Math.max(1, total), parts, dominant };
}

export function damageColor(key) {
  return key === 'phys' ? PHYSICAL_COLOR : ELEMENT_DEF[key].color;
}

// 원소 피해를 받은 뒤 상태 효과 (parts = 저항 적용 후 받은 피해)
export function applyHeroStatuses(parts) {
  if (parts.fire) setDot('burn', parts.fire * BURN_RATIO, BURN_DURATION);
  if (parts.poison) setDot('poison', parts.poison * POISON_RATIO, POISON_DURATION);
  if (parts.cold) applyChill(CHILL_DURATION);
}

// 둔화: 냉기 저항만큼 짧아짐, 이미 걸려 있으면 긴 쪽
export function applyChill(duration) {
  const d = duration * (1 - heroResist('cold'));
  game.hero.slowTimer = Math.max(game.hero.slowTimer, d);
}

// 독 구름처럼 직접 거는 중독 - 막기/회피 없음, 독 저항으로 줄어듦
export function applyPoisonDirect(amount) {
  const v = amount * (1 - heroResist('poison'));
  if (v > 0) setDot('poison', v * POISON_RATIO, POISON_DURATION);
}

// 지속 피해 걸기: 더 센 쪽으로 갱신, 같거나 약하면 남은 시간만 늘림 (겹치지 않음)
function setDot(kind, total, duration) {
  const s = game.hero[kind];
  const dps = total / duration;
  if (s.timer > 0 && s.dps >= dps) { s.timer = Math.max(s.timer, duration); return; }
  if (s.timer <= 0) s.tick = DOT_TICK;
  s.dps = dps;
  s.timer = duration;
}

const DOT_COLOR = { burn: ELEMENT_DEF.fire.color, poison: ELEMENT_DEF.poison.color };

// 매 틱: 화상/중독 피해
export function updateHeroStatuses(dt) {
  ['burn', 'poison'].forEach((kind) => {
    const s = game.hero[kind];
    if (s.timer <= 0 || !game.hero.alive) return;
    s.timer -= dt;
    s.tick -= dt;
    if (s.tick <= 0) {
      s.tick += DOT_TICK;
      damageHeroDirect(Math.max(1, Math.round(s.dps * DOT_TICK)), DOT_COLOR[kind]);
      spawnHitParticles(game.hero.x, game.hero.y - 14, DOT_COLOR[kind], 2);
    }
    if (s.timer <= 0) { s.timer = 0; s.dps = 0; s.tick = 0; }
  });
}

// 체력만 바로 깎음 (무적시간/넉백 없음) - 지속 피해용
export function damageHeroDirect(amount, color) {
  if (dev.god) return;
  amount = heroDamageTaken(amount);
  if (amount <= 0) return;
  game.hero.hp -= amount;
  spawnDamageNumber(game.hero.x, game.hero.y - 34, `-${amount}`, color);
  checkHeroDeath();
}

// 받는 피해 마지막 단계: 버서커 중이면 더 받고, 에너지 쉴드가 켜져 있으면 일부를 마나로 대신 받음 (마나가 모자라면 그만큼만)
export function heroDamageTaken(total) {
  const h = game.hero;
  if (h.berserkTimer > 0) total = Math.round(total * (1 + SKILL_STATS.berserk.taken));
  const weak = curseMul(h, 'weak'); // 약화 저주
  if (weak !== 1) total = Math.round(total * weak);
  // 에너지 쉴드: 남은 흡수량까지 전부 먼저 막음 → 다 막으면 깨짐
  if (h.shieldTimer > 0 && h.shieldHp > 0 && total > 0) {
    const absorbed = Math.min(total, h.shieldHp);
    h.shieldHp -= absorbed;
    total -= absorbed;
    spawnDamageNumber(h.x + 16, h.y - 50, `막음 ${absorbed}`, '#7fa8ff');
    if (h.shieldHp <= 0) {
      h.shieldTimer = 0;
      spawnShockwave(h.x, h.y - h.r * 0.4, h.r * 2.4, '#bcd2ff');
      spawnHitParticles(h.x, h.y - h.r * 0.4, '#bcd2ff', 16);
      floatText(h.x, h.y - 64, '보호막 깨짐', '#9fc0ff');
    }
  }
  return total;
}

export function checkHeroDeath() {
  if (game.hero.hp > 0 || !game.hero.alive) return;
  game.hero.hp = 0;
  game.hero.alive = false;
  game.gameState = 'gameover';
  recordRun('gameover');
  Body.setVelocity(game.hero.body, { x: 0, y: 0 });
}

export function emptyResist() {
  return { fire: 0, cold: 0, lightning: 0, poison: 0 };
}

export function emptyDot() {
  return { dps: 0, timer: 0, tick: 0 };
}
