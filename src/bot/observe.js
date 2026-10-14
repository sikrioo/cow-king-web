// 봇 관측 (2026-10-14 사용자: 직접 조작이 귀찮음 → 봇이 대신 플레이) - 게임 상태를 '읽기만' 해서 판단에 필요한 것만 묶음
//   observe()는 몬스터 객체 참조(ref)를 담아 휴리스틱 봇이 바로 씀, toJSON(obs)은 참조를 빼고 번호(id)로 - 외부 의사결정 모델(JEV 등)에 보낼 때
//   새 위험(예고·지역 공격)을 만들면 DANGER/THREAT에 추가할 것
import { MONSTERS } from '../data/monsters.js';
import { MONSTER_MOVE } from '../data/balance.js';
import { SKILL_META } from '../data/skills.js';
import { game } from '../state.js';
import { PEN, obstacles } from '../world/arena.js';
import { SKILLS } from '../systems/skills.js';
import { basicAttackReach } from '../systems/skills.js';

// 이 상태면 곧 크게 때림 (돌진 예고·똬리·주문·충전) - 봇이 피하거나 끊음
export const THREAT_STATES = ['telegraph', 'chargePrep', 'coil', 'casting', 'charging', 'aiming', 'leapPrep', 'slamPrep', 'fusing', 'zapping'];
// 직선으로 들이받는 상태 (방향: chargeDir / heading / chargeDirX·Y)
const LINE_STATES = ['telegraph', 'chargePrep', 'coil', 'charging', 'bossCharging', 'butcherCharge', 'strike'];

function lineDir(c) {
  if (c.chargeDir) return c.chargeDir;
  if (c.chargeDirX != null) return { x: c.chargeDirX, y: c.chargeDirY };
  if (c.kind === 'snake' && c.heading != null) return { x: Math.cos(c.heading), y: Math.sin(c.heading) };
  if (c.chargeTarget) { const dx = c.chargeTarget.x - c.x, dy = c.chargeTarget.y - c.y, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d }; }
  return null;
}

export function observe() {
  const h = game.hero;
  const alive = game.cows.filter((c) => c.state !== 'dead');
  const jail = alive.find((c) => MONSTERS[c.kind].prop && c.prison && c.risen && Math.hypot(h.x - c.prison.x, h.y - c.prison.y) < c.prison.r);
  const slot = (n) => {
    const id = n === 1 ? h.slot1 : h.slot2;
    const s = id && SKILLS[id];
    return s ? { id, ready: s.cd() <= 0 && (!s.usable || s.usable()), aura: !!SKILL_META[id].aura } : null;
  };
  return {
    screen: game.gameState, paused: !!game.paused, mode: game.run && game.run.mode, act: game.act, wave: game.wave,
    canNextAct: game.actClear > 0, actScene: game.actScene > 0,
    cards: game.cardOffer ? game.cardOffer.cards.map((c) => ({ type: c.type, id: c.id })) : null,
    hero: {
      x: h.x, y: h.y, r: h.r, alive: h.alive, cls: h.classKey, level: h.level,
      hp: h.hp, maxHp: h.maxHp + h.bonusMaxHp + h.gearMaxHp, mana: h.mana, maxMana: h.maxMana,
      potions: { ...h.potions }, potionReady: { heal: !(h.potionCd.heal > 0), mana: !(h.potionCd.mana > 0) },
      stunned: h.stunTimer > 0, busy: h.leapTimer > 0 || h.rushTimer > 0 || h.whirlwindTimer > 0 || h.flurryTimer > 0 || h.smashTimer > 0,
      slot1: slot(1), slot2: slot(2), jail: jail ? jail.prison : null, statPoints: h.statPoints, pendingCards: h.pendingCards || 0
    },
    monsters: alive.map((c) => {
      const def = MONSTERS[c.kind];
      return {
        ref: c, kind: c.kind, x: c.x, y: c.y, r: c.r, hp: c.hp, maxHp: c.maxHp, dist: Math.hypot(c.x - h.x, c.y - h.y),
        prop: !!def.prop, boss: !!def.boss || c.kind === 'boss', ranged: !!MONSTER_MOVE[c.kind] || !!(c.behavior && c.behavior.ranged),
        threat: THREAT_STATES.includes(c.state) ? c.state : null,
        line: LINE_STATES.includes(c.state) ? lineDir(c) : null,
        reach: def.prop ? 0 : basicAttackReach(c)
      };
    }),
    shots: game.projectiles.filter((p) => p.team !== 'hero').map((p) => ({ x: p.x, y: p.y, dx: p.dirX, dy: p.dirY, r: p.radius + (p.explodeRadius || 0) })),
    dangers: [
      ...game.meteors.filter((m) => !m.onImpact).map((m) => ({ x: m.x, y: m.y, r: m.r })), // 몬스터 메테오 (주인공 것은 onImpact가 있음)
      ...game.hazards.map((z) => ({ x: z.x, y: z.y, r: z.r })),
      ...game.hellfires.map((f) => ({ x: f.x, y: f.y, r: f.r }))
    ],
    items: game.items.map((it) => ({ x: it.x, y: it.y, type: it.type })), // type: gear | material | heal | mana
    obstacles: obstacles.map((o) => ({ ax: o.ax, ay: o.ay, bx: o.bx, by: o.by, r: o.r })),
    pen: { x: PEN.x, y: PEN.y, size: PEN.size }
  };
}

// 외부 모델로 보낼 때: 몬스터 참조를 빼고 번호로, 소수는 줄임 (행동의 attack은 이 번호로 받음 - bot/act.js)
export function toJSON(obs) {
  const r = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v);
  return {
    ...obs,
    hero: Object.fromEntries(Object.entries(obs.hero).map(([k, v]) => [k, r(v)])),
    monsters: obs.monsters.map(({ ref, ...m }, id) => ({ id, ...Object.fromEntries(Object.entries(m).map(([k, v]) => [k, r(v)])) }))
  };
}
