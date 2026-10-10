// 주인공 저주 (악마 저주 카우): 하나만 걸림(새로 걸면 바뀜), CURSE_DURATION초. 저주를 건 몬스터가 죽으면 바로 풀림
//   효과 적용 한 곳씩: weak = elements.heroDamageTaken(받는 피해), slow = entities/hero(이동), hex = util.castSpeedMul(스킬 대기시간)
//   표시: 머리 위 보라 문양(render/demonFx.js) + 버프 줄(render/hud.js)
import { CURSES, CURSE_DURATION, CURSE_COLOR } from '../data/balance.js';
import { game } from '../state.js';
import { floatText, spawnHitParticles } from './fx.js';

export function applyCurse(kind, source = null, sec = CURSE_DURATION) {
  const h = game.hero;
  if (!h.alive || !CURSES[kind]) return;
  h.curse = { kind, timer: sec, max: sec, source };
  floatText(h.x, h.y - 70, CURSES[kind].label, CURSE_COLOR);
  spawnHitParticles(h.x, h.y - 30, CURSE_COLOR, 10);
}

export function updateCurses(dt) {
  const h = game.hero, c = h.curse;
  if (!c) return;
  c.timer -= dt;
  if (c.timer <= 0 || !h.alive || (c.source && c.source.state === 'dead')) h.curse = null; // 건 몬스터가 죽으면 풀림
}

// 지금 걸린 저주의 배율 (없으면 1)
export function curseMul(h, kind) {
  return h.curse && h.curse.kind === kind && h.curse.timer > 0 ? CURSES[kind].mul : 1;
}

// 주인공 기절 (도살자): sec초 동안 움직이지도 공격·스킬을 쓰지도 못함 - entities/hero.js·systems/skills.js가 읽음, 머리 위 별(render/demonFx.js)
export function stunHero(sec) {
  const h = game.hero;
  if (!h.alive) return;
  h.stunTimer = Math.max(h.stunTimer || 0, sec);
  floatText(h.x, h.y - 70, '기절!', '#ffe066');
}
