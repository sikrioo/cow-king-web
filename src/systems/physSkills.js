// 물리 계열 보조 스킬: 투지(잠깐 최대 체력 증가). 수치는 data/skills.js의 SKILL_STATS.fortify, 레벨 보너스는 SKILL_LEVEL_UP
// 늘어난 체력은 hero.bonusMaxHp에 더했다가 끝나면 그만큼 뺌 (실제 최대 체력 = maxHp + bonusMaxHp + gearMaxHp)
import { SKILL_STATS } from '../data/skills.js';
import { game } from '../state.js';
import { castSpeedMul, skillBonus, skillMul } from '../util.js';
import { floatText, spawnHitParticles, spawnShockwave } from './fx.js';

const effectiveMaxHp = (h) => h.maxHp + h.bonusMaxHp + h.gearMaxHp;

export function noManaWarn(h) {
  if (!(h.noManaWarn > 0)) { floatText(h.x, h.y - 40, '마나 부족', '#7fa8ff'); h.noManaWarn = 1; }
}

export function tryFortify() {
  const h = game.hero, s = SKILL_STATS.fortify;
  if (!h.alive || h.spellCd.fortify > 0) return;
  if (h.mana < s.mana) { noManaWarn(h); return; }
  h.mana -= s.mana;
  h.spellCd.fortify = s.cooldown * castSpeedMul(h);
  // 이미 걸려 있으면 이전 몫을 빼고 새로 (겹쳐 쌓이지 않음)
  if (h.fortifyTimer > 0) h.bonusMaxHp = Math.max(0, h.bonusMaxHp - h.fortifyHp);
  const add = Math.max(1, Math.round((h.maxHp + h.gearMaxHp) * (s.life + skillBonus(h, 'fortify', 'life'))));
  h.fortifyHp = add;
  h.bonusMaxHp += add;
  h.hp = Math.min(effectiveMaxHp(h), h.hp + add);
  h.fortifyTimer = s.duration * skillMul(h, 'fortify', 'duration');
  h.fortifyMax = h.fortifyTimer;
  spawnShockwave(h.x, h.y, 70, '#ff6b6b');
  spawnHitParticles(h.x, h.y, '#ff8a80', 12);
  floatText(h.x, h.y - 50, `투지! 최대 체력 +${add}`, '#ff8a80');
  game.shake = Math.min(game.shake + 3, 12);
}

// 매 틱: 끝나면 늘었던 최대 체력을 되돌리고, 넘치는 체력은 잘라냄
export function updateFortify(dt) {
  const h = game.hero;
  if (!(h.fortifyTimer > 0)) return;
  h.fortifyTimer -= dt;
  if (h.fortifyTimer <= 0) {
    h.fortifyTimer = 0;
    h.bonusMaxHp = Math.max(0, h.bonusMaxHp - h.fortifyHp);
    h.fortifyHp = 0;
    h.hp = Math.min(h.hp, effectiveMaxHp(h));
  }
}
