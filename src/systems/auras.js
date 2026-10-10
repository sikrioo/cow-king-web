// 전사 오라 3종 (스킬 기획 정의서 v0.1): 가시(근접 반사) / 불꽃(주변 화염) / 빙결(주변 적 이동·공격속도 감소)
//   슬롯에 있는 동안만 켜짐 (2026-10-10 사용자 결정): 슬롯에 넣으면 AURA_SWITCH초 뒤 켜지고, 빼면 꺼짐. 하나만 - 두 슬롯 다 오라면 누른 쪽으로 바뀜. 마나 없음
//   수습생의 마법이 뽑은 오라는 tempAuras로 잠깐 따로 켜짐(겹칠 수 있음)
//   효과 적용: 가시 = entities/monster.js 근접 공격 → reflectThorns, 빙결 = behaviors.getAuraSpeedMult·monster 근접 공격 속도 → frostAuraSlow
import { SKILL_META, SKILL_STATS, SKILL_LEVEL_UP, AURA_SWITCH } from '../data/skills.js';
import { BOSS_SLOW_SCALE } from '../data/balance.js';
import { game } from '../state.js';
import { skillLevel } from '../util.js';
import { canHit, cowEdgeDist } from './combat.js';
import { damageCowPacket } from './elementCombat.js';
import { isBossCow } from './cc.js';
import { floatText, spawnHitParticles } from './fx.js';

export const isAura = (id) => !!(SKILL_META[id] && SKILL_META[id].aura);
// 레벨 lv일 때 수치: 배율 키는 × (1 + per × (lv-1)), add 키(reflect/slow)는 + per × (lv-1)
const lvMul = (id, key, lv) => 1 + ((SKILL_LEVEL_UP[id] && SKILL_LEVEL_UP[id][key]) || 0) * Math.max(0, lv - 1);
const lvAdd = (id, key, lv) => ((SKILL_LEVEL_UP[id] && SKILL_LEVEL_UP[id][key]) || 0) * Math.max(0, lv - 1);

// 지금 켜진 오라 [{ id, lv }] - 슬롯 오라 + 임시 오라 (같은 오라면 높은 레벨)
export function activeAuras(h = game.hero) {
  const list = {};
  if (h.aura) list[h.aura] = skillLevel(h, h.aura) || 1;
  for (const id in (h.tempAuras || {})) { const t = h.tempAuras[id]; if (t.timer > 0) list[id] = Math.max(list[id] || 0, t.lv); }
  return Object.entries(list).map(([id, lv]) => ({ id, lv }));
}
const auraLv = (h, id) => { const a = activeAuras(h).find((x) => x.id === id); return a ? a.lv : 0; };
export function auraRadius(id, lv) { return SKILL_STATS[id].radius ? SKILL_STATS[id].radius * lvMul(id, 'radius', lv) : 0; }

// 슬롯 키를 누름: 그 오라로 바꿈 (이미 켜져 있으면 그대로)
export function pickAura(id) {
  const h = game.hero;
  if (!h.alive || h.aura === id || h.auraPending === id) return;
  h.auraPending = id;
  h.auraSwitch = AURA_SWITCH;
}

// 수습생의 마법: 오라를 sec초 동안 임시로 켬
export function addTempAura(id, lv, sec) {
  const h = game.hero;
  h.tempAuras = h.tempAuras || {};
  h.tempAuras[id] = { timer: sec, lv: Math.max(lv, (h.tempAuras[id] && h.tempAuras[id].timer > 0 && h.tempAuras[id].lv) || 0), fireT: 0 };
}

export function updateAuras(dt) {
  const h = game.hero;
  const slotted = [h.slot1, h.slot2].filter(isAura);
  if (h.aura && !slotted.includes(h.aura)) h.aura = null;                         // 슬롯에서 빠지면 꺼짐
  if (h.auraPending && !slotted.includes(h.auraPending)) h.auraPending = null;
  if (!h.aura && !h.auraPending && slotted.length) { h.auraPending = slotted[0]; h.auraSwitch = AURA_SWITCH; } // 슬롯에 넣으면 잠깐 뒤 켜짐
  if (h.auraPending) {
    h.auraSwitch -= dt;
    if (h.auraSwitch <= 0) {
      h.aura = h.auraPending; h.auraPending = null; h.auraSwitch = 0;
      floatText(h.x, h.y - 60, `${SKILL_META[h.aura].label} 켜짐`, SKILL_STATS[h.aura].ring);
    }
  }
  for (const id in (h.tempAuras || {})) { if (h.tempAuras[id].timer > 0) h.tempAuras[id].timer -= dt; }
  if (!h.alive) return;
  // 불꽃 오라: tick초마다 반경 안 화염 (슬롯 오라·임시 오라 각자 시계)
  const fireLv = auraLv(h, 'aurafire');
  if (fireLv > 0) {
    const s = SKILL_STATS.aurafire;
    h.auraFireT = (h.auraFireT || 0) - dt;
    if (h.auraFireT <= 0) {
      h.auraFireT += s.tick;
      const r = auraRadius('aurafire', fireLv), dmg = Math.max(1, Math.round(s.damage * lvMul('aurafire', 'damage', fireLv)));
      game.cows.forEach((c) => {
        if (c.state === 'dead' || !canHit(h, c) || cowEdgeDist(c, h.x, h.y) > r) return;
        damageCowPacket(c, { fire: dmg }); // 버닝 카우는 화염 저항 50%라 절반 (기획서 규칙과 같음)
        spawnHitParticles(c.x, c.y - 10, '#ff8a3d', 2);
      });
    }
  } else h.auraFireT = 0;
}

// 가시 오라: 근접 공격으로 받은 피해(taken) × 반사율을 때린 적에게 물리로
export function reflectThorns(c, taken) {
  const lv = auraLv(game.hero, 'aurathorns');
  if (!lv || !(taken > 0) || !c || c.state === 'dead') return;
  const dmg = Math.max(1, Math.round(taken * (SKILL_STATS.aurathorns.reflect + lvAdd('aurathorns', 'reflect', lv))));
  damageCowPacket(c, { phys: dmg });
  spawnHitParticles(c.x, c.y - 20, '#c98a4d', 5);
}

// 빙결 오라: 이 몬스터가 받는 이동·공격속도 감소 (0이면 없음, 보스는 절반)
export function frostAuraSlow(c) {
  const h = game.hero;
  if (!h || !h.alive) return 0;
  const lv = auraLv(h, 'aurafrost');
  if (!lv || Math.hypot(c.x - h.x, c.y - h.y) > auraRadius('aurafrost', lv)) return 0;
  const slow = SKILL_STATS.aurafrost.slow + lvAdd('aurafrost', 'slow', lv);
  return isBossCow(c) ? slow * BOSS_SLOW_SCALE : slow;
}
