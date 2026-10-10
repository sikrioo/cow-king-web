// 수습생의 마법 (공통, 스킬 기획 정의서 v0.1 - 2026-10-10 사용자 결정: 공통 스킬): 여러 스킬이 무작위로 연달아 나감
//   시전 개수·위력은 스킬 레벨로 정해지고(개수 = min(maxCasts, Lv), 나오는 스킬 레벨 = Lv), 어떤 스킬인지만 랜덤(게임 난수)
//   실제 시전은 skills.castFree(레벨 지정·마나/대기시간 없이) - 순환 import를 피하려고 game.js가 updateApprentice에 넘겨 줌
import { SKILL_META, SKILL_STATS } from '../data/skills.js';
import { game } from '../state.js';
import { castSpeedMul, skillLevel } from '../util.js';
import { floatText } from './fx.js';
import { noManaWarn } from './physSkills.js';

// 한 번에 나올 스킬 목록: 같은 스킬 maxSame번까지, once 스킬은 한 번만
export function rollApprentice(count) {
  const s = SKILL_STATS.apprentice, out = [];
  for (let i = 0; i < count; i++) {
    const pool = s.pool.filter((id) => {
      const n = out.filter((x) => x === id).length;
      return n < (s.once.includes(id) ? 1 : s.maxSame);
    });
    if (!pool.length) break;
    out.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return out;
}

export function tryApprentice() {
  const h = game.hero, s = SKILL_STATS.apprentice;
  if (!h.alive || h.spellCd.apprentice > 0 || h.apprentice) return;
  if (h.mana < s.mana) { noManaWarn(h); return; }
  h.mana -= s.mana;
  h.spellCd.apprentice = s.cooldown * castSpeedMul(h);
  const lv = Math.max(1, skillLevel(h, 'apprentice'));
  const queue = rollApprentice(Math.min(s.maxCasts, lv));
  h.apprentice = { queue, level: lv, t: 0, n: 0, total: queue.length };
  h.currentAttackDuration = 0.25;
  h.attackTimer = 0.25;
}

// 매 틱: interval초마다 하나씩 시전 - 머리 위에 스킬 이름, 5개째(최대)면 화면이 번쩍
export function updateApprentice(dt, castFree) {
  const h = game.hero, a = h.apprentice;
  if (!a) return;
  if (!h.alive) { h.apprentice = null; return; }
  a.t -= dt;
  if (a.t > 0) return;
  a.t += SKILL_STATS.apprentice.interval;
  const id = a.queue.shift();
  a.n++;
  floatText(h.x, h.y - 70 - (a.n % 2) * 14, `${a.n}. ${SKILL_META[id].label}`, '#ffd666');
  if (a.n >= SKILL_STATS.apprentice.maxCasts) {
    game.impactFlash = Math.max(game.impactFlash, 0.22);
    game.shake = Math.min(game.shake + 4, 12);
  }
  castFree(id, a.level);
  if (!a.queue.length) h.apprentice = null;
}
