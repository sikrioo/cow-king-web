// 몬스터(카우) 그리기 - 상태를 읽기만 함
import { MONSTERS, FLASH_COLORS } from '../data/monsters.js';
import { PALETTE } from '../data/palette.js';
import { drawMonsterWeapon } from './monsterWeapons.js';

export function drawCow(ctx, x, y, scale, state, animT, facing = 1, stateElapsed = 0, colors = null, weapon = 'halberd') {
  const hideColor  = colors ? colors.hide  : PALETTE.hide;
  const hornColor  = colors ? colors.horn  : PALETTE.horn;
  const snoutColor = colors ? colors.snout : PALETTE.snout;
  const eyeColor   = colors ? colors.eye   : PALETTE.eye;

  const bob   = state === 'walk'    ? Math.abs(Math.sin(animT * 8)) * 8
              : state === 'idle'   ? Math.abs(Math.sin(animT * 2.2)) * 2
              : 0;
  const shake = state === 'stunned' ? Math.sin(animT * 45) * 3 : 0;
  const poke  = state === 'attack'  ? Math.sin(Math.min(stateElapsed * 10, Math.PI)) : 0;

  ctx.save();
  ctx.translate(x + shake, y - bob);
  ctx.scale(scale * facing, scale);

  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  drawMonsterWeapon(ctx, weapon, 18 + poke * 16, -38, poke, animT);

  ctx.fillStyle = hideColor;
  ctx.beginPath();
  ctx.arc(0, -40, 30, 0, Math.PI * 2);
  ctx.fill();

  drawHorn(ctx, -1, hornColor);
  drawHorn(ctx, 1, hornColor);

  ctx.fillStyle = snoutColor;
  ctx.beginPath();
  ctx.ellipse(0, -20, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.dark;
  ctx.beginPath();
  ctx.ellipse(-4, -19, 1.5, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(4, -19, 1.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.ellipse(-12, -46, 3.6, 2.6, -0.15, 0, Math.PI * 2);
  ctx.ellipse(12, -46, 3.6, 2.6, 0.15, 0, Math.PI * 2);
  ctx.fill();

  if (state === 'stunned') drawStunDots(ctx, animT);

  ctx.restore();
}

export function drawStunDots(ctx, animT) {
  const n = 3;
  for (let i = 0; i < n; i++) {
    const a = animT * 6 + (i * Math.PI * 2) / n;
    ctx.fillStyle = '#e8dcc8';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 14, -88 + Math.sin(a) * 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawHorn(ctx, side, color) {
  ctx.save();
  ctx.strokeStyle = color || PALETTE.horn;
  ctx.lineCap = 'round';

  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(side * 14, -46);
  ctx.quadraticCurveTo(side * 34, -58, side * 34, -80);
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(side * 34, -80);
  ctx.quadraticCurveTo(side * 34, -92, side * 19, -96);
  ctx.stroke();

  ctx.restore();
}

// 몬스터 그리기 (예전 Cow.draw - this → c)
export function drawMonster(c, ctx, t) {
  if (c.state === 'dead') {
    const prog = 1 - Math.max(c.deadTimer, 0) / 0.3; // 0→1
    const pop = prog < 0.25 ? 1 + Math.sin((prog / 0.25) * Math.PI / 2) * 0.22
                            : Math.max(0, 1.22 * (1 - (prog - 0.25) / 0.75));
    const fade = prog < 0.25 ? 1 : Math.max(0, 1 - (prog - 0.25) / 0.75);
    const p = c.deadPos;
    ctx.save();
    ctx.globalAlpha = fade;
    drawCow(ctx, p.x, p.y, c.scale * pop, 'idle', t + c.phase, c.facing, 0, null, c.weapon);
    ctx.restore();
    return;
  }

  const style = MONSTERS[c.kind];

  // 종류별 몸 아래 그림 (광신/주술사 오라, 돌진 예고선, 자폭 점화, 번개 충전) - behaviors[kind].drawUnder
  const b = c.behavior;
  if (b && b.drawUnder) b.drawUnder(c, ctx, t, style);

  if (style.ring) {
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(t * 4) * 0.25;
    ctx.strokeStyle = style.ring;
    ctx.lineWidth = c.kind === 'boss' ? 3 : 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, (c.kind === 'boss' ? 34 : 20) * c.scale + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (c.chillTimer > 0) {
    // 둔화(냉기) - 발밑 서리 고리
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#bfeaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + c.r * 0.5, c.r * 1.05, c.r * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const visualState = c.state === 'charging' ? 'attack'
                     : (c.state === 'telegraph' || c.state === 'recover' || c.state === 'fusing' || c.state === 'zapping') ? 'idle'
                     : c.state;
  const visualElapsed = c.state === 'charging' ? 0.16 : c.stateElapsed;

  ctx.save();
  const colors = c.flash > 0 ? FLASH_COLORS : style.colors;
  drawCow(ctx, c.x, c.y, c.scale, visualState, t + c.phase, c.facing, visualElapsed, colors, c.weapon);
  ctx.restore();

  if (c.state === 'attack' && c.attackingPlayer && c.stateElapsed < 0.16) {
    const warnScale = 1 + Math.sin((c.stateElapsed / 0.16) * Math.PI) * 0.5;
    ctx.save();
    ctx.translate(c.x, c.y - 78 * c.scale);
    ctx.font = `bold ${Math.round(20 * warnScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText('!', 0, 0);
    ctx.fillStyle = '#ff3b30';
    ctx.fillText('!', 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // 종류별 몸 위 그림 (보스: 타격점 보석 + 큰 체력바) - 없으면 기본 체력바
  if (b && b.drawOver) {
    b.drawOver(c, ctx, t, style);
  } else if (c.maxHp > 1) {
    const w = 26 * c.scale;
    const barY = c.y - 96 * c.scale - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(c.x - w / 2, barY, w, 4);
    ctx.fillStyle = style.ring || '#e05b4d';
    ctx.fillRect(c.x - w / 2, barY, w * (c.hp / c.maxHp), 4);
  }
}
