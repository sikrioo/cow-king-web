// 공통 스킬(모든 캐릭터, 공통 슬롯 F): 순간이동. 수치는 data/skills.js의 SKILL_STATS.teleport, 레벨 보너스는 SKILL_LEVEL_UP
import { SKILL_STATS } from '../data/skills.js';
import { Body } from '../core/physics.js';
import { game, input } from '../state.js';
import { castSpeedMul, skillBonus, skillMul } from '../util.js';
import { clampToPen } from '../world/arena.js';
import { screenToWorld } from '../world/camera.js';
import { spawnHitParticles, spawnShockwave } from './fx.js';
import { noManaWarn } from './physSkills.js';

// 다른 동작(휠윈드/리프/러시/강타) 중에는 못 씀
const busy = (h) => h.whirlwindTimer > 0 || h.leapTimer > 0 || h.rushTimer > 0 || h.smashTimer > 0;

// 순간이동: PC는 커서 지점(사거리까지), 모바일은 바라보는 방향으로 사거리만큼. 목장 안쪽으로 제한
export function tryTeleport() {
  const h = game.hero, s = SKILL_STATS.teleport;
  if (!h.alive || h.spellCd.teleport > 0 || busy(h)) return;
  if (h.mana < s.mana) { noManaWarn(h); return; }
  const range = s.range * skillMul(h, 'teleport', 'range');
  let dx = Math.cos(h.facing) * range, dy = Math.sin(h.facing) * range;
  if (input.mouseScreen) {
    const w = screenToWorld(input.mouseScreen.x, input.mouseScreen.y);
    const mx = w.x - h.x, my = w.y - h.y, d = Math.hypot(mx, my);
    if (d > 4) { const k = Math.min(1, range / d); dx = mx * k; dy = my * k; }
  }
  const to = clampToPen(h.x + dx, h.y + dy, h.r + 10);
  h.mana -= s.mana;
  h.spellCd.teleport = s.cooldown * (1 - skillBonus(h, 'teleport', 'cdr')) * castSpeedMul(h);
  spawnHitParticles(h.x, h.y, '#b8a4ff', 10);
  spawnShockwave(h.x, h.y, 34, '#a08cff');
  Body.setPosition(h.body, { x: to.x, y: to.y });
  Body.setVelocity(h.body, { x: 0, y: 0 });
  h.x = to.x; h.y = to.y;
  // 클릭 이동/공격 명령은 취소 (옛 목표로 걸어가지 않게)
  input.moveTarget = null;
  input.mouseMoveHeld = false;
  input.attackTarget = null;
  spawnHitParticles(h.x, h.y, '#e0d8ff', 12);
  spawnShockwave(h.x, h.y, 46, '#a08cff');
}
