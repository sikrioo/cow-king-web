// 이펙트 생성/갱신 (파티클·불바닥·번개·충격파·떠오르는 글자·이동 반응·메뉴 안내) - 그리기는 render/fx.js
import { MOVE_DUST_COLOR } from '../data/balance.js';
import { game, ui } from '../state.js';

export function spawnHitParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 100;
    game.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35, maxLife: 0.35, color });
  }
}

export function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.life -= dt;
    if (p.life <= 0) { game.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.9;
    p.vy *= 0.9;
  }
}

export function emitMoveReaction(dirX, dirY, strength = 1) {
  if (game.hero.moveFxCooldown > 0) return;
  const px = game.hero.x - dirX * game.hero.r * 0.35;
  const py = game.hero.y - dirY * game.hero.r * 0.20 + game.hero.r * 0.55;
  spawnHitParticles(px, py, MOVE_DUST_COLOR, strength > 0.8 ? 5 : 3);
  game.hero.moveReaction = Math.max(game.hero.moveReaction, strength);
  game.hero.moveFxCooldown = strength > 0.8 ? 0.11 : 0.16;
  game.shake = Math.min(game.shake + 0.55 * strength, 12);
}

export function spawnFireHazard(x, y) {
  game.hazards.push({ x, y, r: 24, life: 2.2, maxLife: 2.2, tickTimer: 0 });
}

// 번개카우가 쏘는 전기 줄기 - 아주 짧게 번쩍이는 시각 효과
export function spawnLightningBolt(x1, y1, x2, y2) {
  game.lightningBolts.push({ x1, y1, x2, y2, life: 0.18, maxLife: 0.18 });
}

export function updateLightningBolts(dt) {
  for (let i = game.lightningBolts.length - 1; i >= 0; i--) {
    game.lightningBolts[i].life -= dt;
    if (game.lightningBolts[i].life <= 0) game.lightningBolts.splice(i, 1);
  }
}

export function spawnShockwave(x, y, maxRadius, color) {
  game.shockwaves.push({ x, y, maxRadius, age: 0, duration: 0.45, color });
}

export function updateShockwaves(dt) {
  for (let i = game.shockwaves.length - 1; i >= 0; i--) {
    game.shockwaves[i].age += dt;
    if (game.shockwaves[i].age >= game.shockwaves[i].duration) game.shockwaves.splice(i, 1);
  }
}

export function floatText(x, y, text, color) {
  game.floatTexts.push({ x, y, text, color, life: 0.8, maxLife: 0.8, big: false });
}

export function spawnDamageNumber(x, y, text, color) {
  game.floatTexts.push({
    x: x + (Math.random() - 0.5) * 16, y, text, color,
    life: 0.65, maxLife: 0.65, big: true
  });
}

export function updateFloatTexts(dt) {
  for (let i = game.floatTexts.length - 1; i >= 0; i--) {
    game.floatTexts[i].life -= dt;
    game.floatTexts[i].y -= dt * (game.floatTexts[i].big ? 36 : 28);
    if (game.floatTexts[i].life <= 0) game.floatTexts.splice(i, 1);
  }
}

export function showInvToast(text, color = '#ffe066') {
  ui.invToast = { text, color, until: performance.now() + 1600 };
}
