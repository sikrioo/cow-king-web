// 몬스터(카우) 그리기 - 상태를 읽기만 함
import { CHARGE_WIDTH, EXPLODER_FUSE_TIME, EXPLODER_BLAST_RADIUS, AURA_RADIUS } from '../data/balance.js';
import { MONSTERS, FLASH_COLORS } from '../data/monsters.js';
import { PALETTE } from '../data/palette.js';
import { getHitPoint } from '../util.js';

export function drawCow(ctx, x, y, scale, state, animT, facing = 1, stateElapsed = 0, colors = null) {
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

  drawHalberd(ctx, 18 + poke * 16, -38, poke);

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

export function drawHalberd(ctx, x, y, poke = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4 + poke * (Math.PI / 4));

  ctx.strokeStyle = PALETTE.shaft;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-42, 0);
  ctx.lineTo(58, 0);
  ctx.stroke();

  ctx.fillStyle = PALETTE.blade;
  ctx.beginPath();
  ctx.moveTo(66, 0);
  ctx.lineTo(48, 14);
  ctx.lineTo(38, 0);
  ctx.lineTo(48, -14);
  ctx.closePath();
  ctx.fill();

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
    drawCow(ctx, p.x, p.y, c.scale * pop, 'idle', t + c.phase, c.facing, 0);
    ctx.restore();
    return;
  }

  const style = MONSTERS[c.kind];

  if (c.kind === 'fanatic') {
    ctx.save();
    ctx.globalAlpha = 0.12 + Math.sin(t * 3) * 0.05;
    ctx.fillStyle = style.ring;
    ctx.beginPath();
    ctx.arc(c.x, c.y, AURA_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (c.kind === 'shaman') {
    ctx.save();
    ctx.globalAlpha = 0.10 + Math.sin(t * 2.2) * 0.04;
    ctx.fillStyle = style.ring;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (c.state === 'telegraph') {
    const dx = c.chargeTarget.x - c.x, dy = c.chargeTarget.y - c.y;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const pulse = 0.3 + Math.sin(t * 22) * 0.15;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(ang);
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.fillRect(0, -CHARGE_WIDTH / 2, dist, CHARGE_WIDTH);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -CHARGE_WIDTH / 2, dist, CHARGE_WIDTH);
    ctx.restore();
  }

  if (c.state === 'fusing') {
    const pulse = Math.sin((c.stateElapsed / EXPLODER_FUSE_TIME) * Math.PI * 7) * 0.5 + 0.5;
    ctx.save();
    ctx.globalAlpha = 0.25 + pulse * 0.45;
    ctx.fillStyle = '#ff2d2d';
    ctx.beginPath();
    ctx.arc(c.x, c.y, EXPLODER_BLAST_RADIUS * (0.3 + c.stateElapsed / EXPLODER_FUSE_TIME * 0.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (c.state === 'zapping' && Math.random() < 0.6) {
    // 번개카우 충전 중 - 뿔 끝에서 지지직거리는 스파크
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.random() * 0.4;
    ctx.strokeStyle = '#fff9b0';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      const ang = Math.random() * Math.PI * 2;
      const len = 10 + Math.random() * 14;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 22 * c.scale);
      ctx.lineTo(c.x + Math.cos(ang) * len, c.y - 22 * c.scale + Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

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

  const visualState = c.state === 'charging' ? 'attack'
                     : (c.state === 'telegraph' || c.state === 'recover' || c.state === 'fusing' || c.state === 'zapping') ? 'idle'
                     : c.state;
  const visualElapsed = c.state === 'charging' ? 0.16 : c.stateElapsed;

  ctx.save();
  const colors = c.flash > 0 ? FLASH_COLORS : style.colors;
  drawCow(ctx, c.x, c.y, c.scale, visualState, t + c.phase, c.facing, visualElapsed, colors);
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

  if (c.kind === 'boss') {
    const wp = getHitPoint(c);
    const gemR = 9 + Math.sin(t * 5) * 2;

    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(t * 5) * 0.08;
    ctx.fillStyle = '#4dfff0';
    ctx.beginPath();
    ctx.arc(wp.x, wp.y, gemR * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(wp.x, wp.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#4dfff0';
    ctx.fillRect(-gemR, -gemR, gemR * 2, gemR * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-gemR, -gemR, gemR * 2, gemR * 2);
    ctx.restore();

    const w = 74;
    const barY = c.y - 34 * c.scale - 96;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(c.x - w / 2, barY, w, 8);
    ctx.fillStyle = style.ring;
    ctx.fillRect(c.x - w / 2, barY, w * (c.hp / c.maxHp), 8);
  } else if (c.maxHp > 1) {
    const w = 26 * c.scale;
    const barY = c.y - 96 * c.scale - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(c.x - w / 2, barY, w, 4);
    ctx.fillStyle = style.ring || '#e05b4d';
    ctx.fillRect(c.x - w / 2, barY, w * (c.hp / c.maxHp), 4);
  }
}
