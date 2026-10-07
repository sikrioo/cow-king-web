// 주인공 → 몬스터 원소 피해: 카드 원소 강화(hero.cardBonus) → 몬스터 저항(data/monsters.js resist) → 피해 숫자(원소 색) → 상태 효과(화상/중독/둔화) → 처치
// 몬스터 상태 갱신(지속 피해 틱, 둔화 시간). 주인공이 받는 쪽은 systems/elements.js
import {
  ELEMENTS, BURN_RATIO, BURN_DURATION, POISON_RATIO, POISON_DURATION, DOT_TICK, MONSTER_CHILL_DURATION, ELEMENT_DEF
} from '../data/elements.js';
import { MONSTERS } from '../data/monsters.js';
import { game } from '../state.js';
import { applyKnockback } from '../entities/actor.js';
import { killCow, registerComboHit } from './combat.js';
import { damageColor } from './elements.js';
import { spawnDamageNumber, spawnHitParticles } from './fx.js';

// 레벨업 카드 강화 (없으면 0)
const cardBonus = (key) => (game.hero && game.hero.cardBonus && game.hero.cardBonus[key]) || 0;

function cowResist(c, el) {
  const r = (MONSTERS[c.kind] || MONSTERS.normal).resist;
  return (r && r[el]) || 0;
}

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
  if (packet.phys) add('phys', Math.round(packet.phys));
  ELEMENTS.forEach((el) => { if (packet[el]) add(el, Math.round(packet[el] * (1 + cardBonus(el)) * (1 - cowResist(c, el)))); });
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

function setCowDot(c, kind, total, duration) {
  const s = c[kind];
  const dps = total / duration;
  if (s.timer > 0 && s.dps >= dps) { s.timer = Math.max(s.timer, duration); return; }
  if (s.timer <= 0) s.tick = DOT_TICK;
  s.dps = dps;
  s.timer = duration;
}

const DOT_COLOR = { burn: ELEMENT_DEF.fire.color, poison: ELEMENT_DEF.poison.color };

// 매 틱 (Monster.update 처음): 둔화 시간, 화상/중독 피해
export function updateCowStatuses(c, dt) {
  if (c.chillTimer > 0) c.chillTimer = Math.max(0, c.chillTimer - dt);
  ['burn', 'poison'].forEach((kind) => {
    const s = c[kind];
    if (s.timer <= 0 || c.state === 'dead') return;
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
