// 주인공 → 몬스터 원소 피해: 원소 마스터리(util.masteryBonus) → 몬스터 저항(data/monsters.js resist) → 피해 숫자(원소 색) → 상태 효과(화상/중독/둔화) → 처치
// 몬스터 상태 갱신(지속 피해 틱, 둔화 시간). 주인공이 받는 쪽은 systems/elements.js
import {
  ELEMENTS, BURN_RATIO, BURN_DURATION, POISON_RATIO, POISON_DURATION, DOT_TICK, MONSTER_CHILL_DURATION, ELEMENT_DEF, BLEED_COLOR
} from '../data/elements.js';
import { game } from '../state.js';
import { masteryBonus } from '../util.js';
import { applyKnockback } from '../entities/actor.js';
import { killCow, registerComboHit, cowResist } from './combat.js';
import { damageColor } from './elements.js';
import { spawnDamageNumber, spawnHitParticles } from './fx.js';

// 원소 마스터리 (없으면 0)
const cardBonus = (key) => masteryBonus(game.hero, key);

// packet = { phys, fire, cold, lightning, poison }, opts = { knock(밀어내는 힘), fromX, fromY } → 준 피해
export function damageCowPacket(c, packet, opts = {}) {
  if (!c || c.state === 'dead') return 0;
  const parts = {};
  let total = 0, dominant = 'phys', best = -1;
  const add = (key, v) => {
    parts[key] = v;
    total += v;
    if (v > best) { best = v; dominant = key; }
  };
  if (packet.phys) add('phys', Math.round(packet.phys * (1 - Math.min(1, cowResist(c, 'phys')))));
  ELEMENTS.forEach((el) => { if (packet[el]) add(el, Math.round(packet[el] * (1 + cardBonus(el)) * (1 - Math.min(1, cowResist(c, el))))); });
  // 맞힌 속성이 전부 면역이면 피해 0 + '면역' (그 밖엔 최소 1)
  const immune = ['phys', ...ELEMENTS].every((k) => !packet[k] || cowResist(c, k) >= 1);
  if (immune) {
    spawnDamageNumber(c.x, c.y - 40 * c.scale, '면역', '#9a9a9a');
    return 0;
  }
  total = Math.max(1, total);
  c.hp -= total;
  c.flash = 0.12;
  spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${total}`, dominant === 'phys' ? '#fff' : damageColor(dominant));
  if (opts.knock) {
    applyKnockback(c.body, opts.fromX, opts.fromY, opts.knock);
    c.knockback = Math.max(c.knockback || 0, 0.15);
  }
  if (parts.fire) setCowDot(c, 'burn', parts.fire * BURN_RATIO * (1 + cardBonus('burn')), BURN_DURATION);
  if (parts.poison) setCowDot(c, 'poison', parts.poison * POISON_RATIO, POISON_DURATION);
  if (parts.cold) c.chillTimer = Math.max(c.chillTimer, MONSTER_CHILL_DURATION * (1 + cardBonus('chill')));
  registerComboHit();
  if (c.hp <= 0 && c.state !== 'dead') killCow(c);
  return total;
}

// 무기 원소 피해 (장비 원소 옵션 합계 hero.gearElemDmg): 물리 타격과 따로 한 번 더 들어감 (숫자도 따로)
// 근접 타격/스킬 타격을 한 곳(skills.js)에서 부름 - 원소 옵션이 없으면 아무 일 없음
export function weaponElementHit(c) {
  const e = game.hero.gearElemDmg;
  if (!e || !c || c.state === 'dead') return;
  if (!(e.fire || e.cold || e.lightning || e.poison)) return;
  damageCowPacket(c, { fire: e.fire, cold: e.cold, lightning: e.lightning, poison: e.poison });
}

function setCowDot(c, kind, total, duration) {
  const s = c[kind];
  const dps = total / duration;
  if (s.timer > 0 && s.dps >= dps) { s.timer = Math.max(s.timer, duration); return; }
  if (s.timer <= 0) s.tick = DOT_TICK;
  s.dps = dps;
  s.timer = duration;
}

const DOT_COLOR = { burn: ELEMENT_DEF.fire.color, poison: ELEMENT_DEF.poison.color, bleed: BLEED_COLOR };

// 출혈: 초당 dps를 duration초 - 겹치지 않고 새로 맞으면 갱신 (물리 저항 적용)
export function bleedCow(c, dps, duration) {
  if (!c || c.state === 'dead' || !c.bleed) return;
  const d = dps * (1 - Math.min(1, cowResist(c, 'phys')));
  if (d <= 0) return;
  if (c.bleed.timer <= 0) c.bleed.tick = DOT_TICK;
  c.bleed.dps = d;
  c.bleed.timer = duration;
}

// 매 틱 (Monster.update 처음): 둔화 시간, 화상/중독 피해
export function updateCowStatuses(c, dt) {
  if (c.chillTimer > 0) c.chillTimer = Math.max(0, c.chillTimer - dt);
  ['burn', 'poison', 'bleed'].forEach((kind) => {
    const s = c[kind];
    if (!s || s.timer <= 0 || c.state === 'dead') return;
    s.timer -= dt;
    s.tick -= dt;
    if (s.tick <= 0) {
      s.tick += DOT_TICK;
      const dmg = Math.max(1, Math.round(s.dps * DOT_TICK));
      c.hp -= dmg;
      spawnDamageNumber(c.x, c.y - 40 * c.scale, `-${dmg}`, DOT_COLOR[kind]);
      spawnHitParticles(c.x, c.y - 10, DOT_COLOR[kind], 2);
      if (c.hp <= 0 && c.state !== 'dead') killCow(c);
    }
    if (s.timer <= 0) { s.timer = 0; s.dps = 0; s.tick = 0; }
  });
}
