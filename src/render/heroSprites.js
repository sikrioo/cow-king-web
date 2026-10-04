// 주인공 그리기 (추상 히어로 포즈/스카프/손·무기/방패/베기 궤적) - 상태를 읽기만 함
import { LEAP_DURATION, SMASH_DURATION, SMASH_IMPACT_TIME } from '../data/balance.js';
import { clamp01, lerpAngle, easeOutCubic } from '../util.js';
import { game } from '../state.js';

export function drawPlayer(ctx, t = 0) {
  if (!game.hero.alive) return;
  const flashBlink = game.hero.invuln > 0 && Math.floor(game.hero.invuln * 12) % 2 === 0;

  let jumpHeight = 0;
  if (game.hero.leapTimer > 0) {
    const jt = 1 - game.hero.leapTimer / LEAP_DURATION;
    jumpHeight = Math.sin(jt * Math.PI) * 40;
  }

  const speedN = game.hero.moveSpeedN;
  const fx = Math.cos(game.hero.facing);
  const fy = Math.sin(game.hero.facing);
  const sx = -fy;
  const sy = fx;
  const idle = Math.sin(t * 2.0) * 0.35;
  const rigidBob = Math.abs(Math.sin(game.hero.moveStep)) * speedN * 0.7 + idle;
  const pose = getAbstractHeroPose(t, speedN);

  ctx.save();
  ctx.globalAlpha = flashBlink ? 0.35 : 1;
  if (game.hero.flash > 0) ctx.filter = 'brightness(2.15) saturate(0.45)';
  ctx.translate(game.hero.x, game.hero.y);

  const shadowScale = 1 - Math.min(jumpHeight / 60, 0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(0, game.hero.r * 0.90, game.hero.r * (0.95 + speedN * 0.12) * shadowScale,
    game.hero.r * (0.33 - speedN * 0.02) * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (game.hero.moveReaction > 0 && jumpHeight <= 0) {
    ctx.save();
    ctx.globalAlpha = game.hero.moveReaction * 0.16;
    ctx.strokeStyle = '#efe3ca';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, game.hero.r * 0.83,
      game.hero.r * (1.08 + game.hero.moveReaction * 0.50),
      game.hero.r * (0.35 + game.hero.moveReaction * 0.09), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.translate(0, -jumpHeight + rigidBob * 0.2);
  if (game.hero.leapTimer <= 0) {
    ctx.translate(game.hero.moveOffsetX * 0.72, game.hero.moveOffsetY * 0.72);
    ctx.rotate(game.hero.moveLean * 0.75 + pose.bodyTwist);
  }

  drawAbstractScarf(ctx, fx, fy, sx, sy, game.hero.r, speedN, t);

  const leftBase = { x: -sx * game.hero.r * 0.67, y: -sy * game.hero.r * 0.67 };
  const rightBase = { x: sx * game.hero.r * 0.67, y: sy * game.hero.r * 0.67 };
  const leftDepth = (-sy > 0 ? 1 : 0);
  const rightDepth = (sy > 0 ? 1 : 0);

  // 오른손 = 주무기, 왼손 = 보조무기 또는 방패 (실제 장착한 것을 그대로 반영)
  const mainGear = game.hero.equipment.weaponMain;
  const offGear = game.hero.equipment.weaponOff;
  const rightHeld = mainGear && mainGear !== 'LOCKED' ? { kind: 'weapon', variant: mainGear.variant || 'sword' } : { kind: 'none', variant: null };
  const leftHeld = offGear && offGear !== 'LOCKED'
    ? (offGear.category === 'shield' ? { kind: 'shield', variant: null } : { kind: 'weapon', variant: offGear.variant || 'sword' })
    : { kind: 'none', variant: null };

  if (leftDepth < rightDepth) drawFloatingHandAndBlade(ctx, leftBase, pose.left, game.hero.r, 0.86, leftHeld.kind, leftHeld.variant);
  else drawFloatingHandAndBlade(ctx, rightBase, pose.right, game.hero.r, 0.86, rightHeld.kind, rightHeld.variant);

  drawAbstractHeroBody(ctx, fx, fy, sx, sy, game.hero.r, speedN, t);

  if (leftDepth >= rightDepth) drawFloatingHandAndBlade(ctx, leftBase, pose.left, game.hero.r, 1, leftHeld.kind, leftHeld.variant);
  else drawFloatingHandAndBlade(ctx, rightBase, pose.right, game.hero.r, 1, rightHeld.kind, rightHeld.variant);

  if (game.hero.rushTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#ffd27a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-fx * game.hero.r * 1.35, -fy * game.hero.r * 1.35);
    ctx.lineTo(fx * game.hero.r * 1.75, fy * game.hero.r * 1.75);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export function getAbstractHeroPose(t, speedN) {
  // 왼손(보조)에 실제로 무기가 들려있을 때만 "쌍수"로 보고 양손 다 휘두름 - 방패/빈손이면 주무기 쪽만 동작
  const offGear = game.hero.equipment.weaponOff;
  const dualWield = !!(offGear && offGear !== 'LOCKED' && offGear.category === 'weapon');
  const drift = Math.sin(game.hero.moveStep) * speedN * 0.08;
  const pose = {
    bodyTwist: Math.sin(t * 1.4) * 0.008,
    left:  { handAngle: game.hero.facing - 1.02 + drift, handDist: game.hero.r * 0.40, bladeAngle: game.hero.facing - 0.62 + drift, bladeScale: 0.95, trail: null },
    right: { handAngle: game.hero.facing + 1.02 - drift, handDist: game.hero.r * 0.40, bladeAngle: game.hero.facing + 0.62 - drift, bladeScale: 0.95, trail: null }
  };

  if (game.hero.leapTimer > 0) {
    pose.left  = { handAngle: game.hero.facing - 0.24, handDist: game.hero.r * 0.62, bladeAngle: game.hero.facing - 0.10, bladeScale: 1.05, trail: null };
    pose.right = { handAngle: game.hero.facing + 0.24, handDist: game.hero.r * 0.62, bladeAngle: game.hero.facing + 0.10, bladeScale: 1.05, trail: null };
  } else if (game.hero.rushTimer > 0) {
    pose.bodyTwist = 0;
    pose.left  = { handAngle: game.hero.facing - 0.20, handDist: game.hero.r * 0.74, bladeAngle: game.hero.facing - 0.08, bladeScale: 1.08, trail: null };
    pose.right = { handAngle: game.hero.facing + 0.20, handDist: game.hero.r * 0.74, bladeAngle: game.hero.facing + 0.08, bladeScale: 1.08, trail: null };
  } else if (game.hero.smashTimer > 0) {
    const elapsed = SMASH_DURATION - game.hero.smashTimer;
    const p = Math.min(elapsed / SMASH_IMPACT_TIME, 1);
    const open = (1 - p) * 1.20 + 0.22;
    pose.bodyTwist = (1 - p) * -0.08;
    pose.left  = { handAngle: game.hero.facing - open, handDist: game.hero.r * (0.44 + p * 0.28), bladeAngle: game.hero.facing - open * 0.82, bladeScale: 1.02, trail: null };
    pose.right = { handAngle: game.hero.facing + open, handDist: game.hero.r * (0.44 + p * 0.28), bladeAngle: game.hero.facing + open * 0.82, bladeScale: 1.02, trail: null };
  } else if (game.hero.whirlwindTimer > 0) {
    const a = game.hero.whirlAngle;
    pose.bodyTwist = Math.sin(a * 2) * 0.045;
    if (dualWield) {
      pose.left  = { handAngle: a, handDist: game.hero.r * 0.75, bladeAngle: a + 0.15, bladeScale: 1.02, trail: { from: a - 0.55, to: a + 0.14, alpha: 0.18 } };
    } else {
      // 한손무기 + 방패(또는 빈손) - 왼손은 회전시키지 않고 몸 앞에 붙여서 버팀
      pose.left = { handAngle: game.hero.facing - Math.PI * 0.6, handDist: game.hero.r * 0.40, bladeAngle: game.hero.facing - Math.PI * 0.6, bladeScale: 1.0, trail: null };
    }
    pose.right = { handAngle: a + Math.PI, handDist: game.hero.r * 0.75, bladeAngle: a + Math.PI + 0.15, bladeScale: 1.02, trail: { from: a + Math.PI - 0.55, to: a + Math.PI + 0.14, alpha: 0.18 } };
  } else if (game.hero.attackTimer > 0) {
    // game.hero.currentAttackDuration은 콤보로 빨라진 실제 스윙 시간(공격속도 스탯 반영) - 기존 ATTACK_DURATION 대신 사용
    const at = 1 - game.hero.attackTimer / game.hero.currentAttackDuration;
    const wind = easeOutCubic(clamp01(at / 0.18));
    const hit = easeOutCubic(clamp01((at - 0.18) / 0.72));
    const settle = easeOutCubic(clamp01((at - 0.82) / 0.18));

    const l0 = game.hero.facing - 1.55 - wind * 0.16;
    const l1 = game.hero.facing + 0.58;
    const r0 = game.hero.facing + 1.55 + wind * 0.16;
    const r1 = game.hero.facing - 0.58;
    const ra = lerpAngle(r0, r1, hit);
    const ext = game.hero.r * (0.50 + hit * 0.28 - settle * 0.10);

    pose.bodyTwist = -0.09 + hit * 0.18 - settle * 0.09;
    if (dualWield) {
      const la = lerpAngle(l0, l1, hit);
      pose.left = {
        handAngle: la - 0.15,
        handDist: ext,
        bladeAngle: la,
        bladeScale: 1.04,
        trail: { from: la - 0.55, to: la - 0.06, alpha: Math.min(0.30, hit * 0.34) }
      };
    } else {
      // 한손무기 + 방패(또는 빈손) - 왼손은 휘두르지 않고 몸 앞으로 살짝 당겨 막는 자세만
      const braceAngle = game.hero.facing - Math.PI * 0.62;
      pose.left = {
        handAngle: braceAngle,
        handDist: game.hero.r * (0.42 + hit * 0.06),
        bladeAngle: braceAngle,
        bladeScale: 1.0,
        trail: null
      };
    }
    pose.right = {
      handAngle: ra + 0.15,
      handDist: ext,
      bladeAngle: ra,
      bladeScale: 1.04,
      trail: { from: ra + 0.55, to: ra + 0.06, alpha: Math.min(0.30, hit * 0.34) }
    };
  }

  return pose;
}

export function drawAbstractScarf(ctx, fx, fy, sx, sy, r, speedN, t) {
  const sway = Math.sin(t * 4.0 + game.hero.moveStep * 0.35) * r * (0.06 + speedN * 0.08);
  const backX = -fx * r * 0.56;
  const backY = -fy * r * 0.56;
  const tailX = -fx * r * (1.25 + speedN * 0.32) + sx * sway;
  const tailY = -fy * r * (1.25 + speedN * 0.32) + sy * sway;
  ctx.save();
  ctx.strokeStyle = '#5a1721';
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(backX, backY);
  ctx.quadraticCurveTo(-fx * r * 0.92 + sx * sway * 0.4, -fy * r * 0.92 + sy * sway * 0.4, tailX, tailY);
  ctx.stroke();
  ctx.fillStyle = '#862534';
  ctx.beginPath();
  ctx.moveTo(tailX + sx * r * 0.10, tailY + sy * r * 0.10);
  ctx.lineTo(tailX - fx * r * 0.28, tailY - fy * r * 0.28);
  ctx.lineTo(tailX - sx * r * 0.10, tailY - sy * r * 0.10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawFloatingHandAndBlade(ctx, base, handPose, r, alpha = 1, heldKind = 'weapon', heldVariant = 'sword') {
  const hx = base.x + Math.cos(handPose.handAngle) * handPose.handDist;
  const hy = base.y + Math.sin(handPose.handAngle) * handPose.handDist;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (handPose.trail && heldKind === 'weapon') {
    drawAbstractSlashTrail(ctx, hx, hy, r * 2.25, handPose.trail.from, handPose.trail.to, handPose.trail.alpha * alpha);
  }

  ctx.fillStyle = '#a3abb4';
  ctx.strokeStyle = '#e2ddd1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx, hy, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 실제 장착한 장비(무기 종류 / 방패)에 맞춰 그림 - 빈손이면 아무것도 쥐지 않음
  if (heldKind === 'shield') {
    drawHeldShield(ctx, hx, hy, handPose.bladeAngle, r * handPose.bladeScale, alpha);
  } else if (heldKind === 'weapon') {
    drawAbstractSword(ctx, hx, hy, handPose.bladeAngle, r * handPose.bladeScale, alpha, heldVariant);
  }
  ctx.restore();
}

export function drawAbstractHeroBody(ctx, fx, fy, sx, sy, r, speedN, t) {
  ctx.save();

  ctx.beginPath();
  ctx.moveTo(-r * 0.58, -r * 0.72);
  ctx.quadraticCurveTo(0, -r * 1.00, r * 0.58, -r * 0.72);
  ctx.quadraticCurveTo(r * 0.96, -r * 0.22, r * 0.82, r * 0.48);
  ctx.quadraticCurveTo(r * 0.48, r * 0.94, 0, r * 0.96);
  ctx.quadraticCurveTo(-r * 0.48, r * 0.94, -r * 0.82, r * 0.48);
  ctx.quadraticCurveTo(-r * 0.96, -r * 0.22, -r * 0.58, -r * 0.72);
  ctx.closePath();

  const g = ctx.createLinearGradient(-r * 0.75, -r, r * 0.75, r);
  g.addColorStop(0, '#7a8088');
  g.addColorStop(0.50, '#2e3137');
  g.addColorStop(1, '#101216');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#d5d0c4';
  ctx.lineWidth = 2.6;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.16, -r * 0.70);
  ctx.lineTo(0, -r * 0.54);
  ctx.lineTo(r * 0.16, -r * 0.70);
  ctx.stroke();

  const vx = fx * r * 0.19;
  const vy = fy * r * 0.19 - r * 0.10;
  ctx.save();
  ctx.translate(vx, vy);
  ctx.rotate(game.hero.facing);
  ctx.fillStyle = '#12161b';
  ctx.beginPath();
  ctx.roundRect(-r * 0.40, -r * 0.16, r * 0.80, r * 0.32, r * 0.15);
  ctx.fill();

  ctx.fillStyle = '#ffb65c';
  ctx.beginPath();
  ctx.ellipse(-r * 0.16, 0, r * 0.075, r * 0.052, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.16, 0, r * 0.075, r * 0.052, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#8a2331';
  ctx.beginPath();
  ctx.moveTo(fx * r * 0.08 - sx * r * 0.10, fy * r * 0.08 - sy * r * 0.10 + r * 0.25);
  ctx.lineTo(fx * r * 0.08 + sx * r * 0.10, fy * r * 0.08 + sy * r * 0.10 + r * 0.25);
  ctx.lineTo(fx * r * 0.20, fy * r * 0.20 + r * 0.38);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.11;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-r * 0.30, -r * 0.42, r * 0.20, r * 0.11, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawAbstractSword(ctx, x, y, angle, r, alpha = 1, variant = 'sword') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  if (variant === 'axe') {
    ctx.strokeStyle = '#8d623e';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.10, 0);
    ctx.lineTo(r * 0.80, 0);
    ctx.stroke();
    ctx.fillStyle = '#c7cdd4';
    ctx.beginPath();
    ctx.moveTo(r * 0.42, -r * 0.04);
    ctx.quadraticCurveTo(r * 1.08, -r * 0.56, r * 0.98, -r * 0.02);
    ctx.quadraticCurveTo(r * 1.02, r * 0.48, r * 0.48, r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  } else if (variant === 'mace') {
    ctx.strokeStyle = '#8d623e';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.10, 0);
    ctx.lineTo(r * 0.92, 0);
    ctx.stroke();
    ctx.fillStyle = '#9aa1a8';
    ctx.beginPath();
    ctx.arc(r * 1.08, 0, r * 0.30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5f656b';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(r * 1.08 + Math.cos(a) * r * 0.30, Math.sin(a) * r * 0.30, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (variant === 'dagger') {
    ctx.strokeStyle = '#373d46';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, 0);
    ctx.lineTo(r * 0.14, 0);
    ctx.stroke();
    ctx.strokeStyle = '#c78b34';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.13, -r * 0.11);
    ctx.lineTo(r * 0.13, r * 0.11);
    ctx.stroke();
    ctx.fillStyle = '#d7dde2';
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.16, -r * 0.07);
    ctx.lineTo(r * 0.62, -r * 0.045);
    ctx.lineTo(r * 0.76, 0);
    ctx.lineTo(r * 0.62, r * 0.045);
    ctx.lineTo(r * 0.16, r * 0.07);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (variant === 'spear') {
    ctx.strokeStyle = '#8d623e';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, 0);
    ctx.lineTo(r * 1.05, 0);
    ctx.stroke();
    ctx.fillStyle = '#d7dde2';
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.98, -r * 0.09);
    ctx.lineTo(r * 1.42, 0);
    ctx.lineTo(r * 0.98, r * 0.09);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // 기본값(검)
    ctx.strokeStyle = '#373d46';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.10, 0);
    ctx.lineTo(r * 0.34, 0);
    ctx.stroke();

    ctx.strokeStyle = '#c78b34';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.31, -r * 0.20);
    ctx.lineTo(r * 0.31, r * 0.20);
    ctx.stroke();

    ctx.fillStyle = '#d7dde2';
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.38, -r * 0.15);
    ctx.lineTo(r * 1.36, -r * 0.11);
    ctx.lineTo(r * 1.66, 0);
    ctx.lineTo(r * 1.36, r * 0.11);
    ctx.lineTo(r * 0.38, r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

// 보조손에 방패가 장착된 경우 전용 드로잉 - 칼날 대신 몸 앞을 막아선 방패 모양
export function drawHeldShield(ctx, x, y, angle, r, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * 0.3); // 방패는 칼날만큼 크게 회전하지 않게 완화
  ctx.globalAlpha = alpha;
  const s = r * 1.25;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.46);
  ctx.lineTo(s * 0.34, -s * 0.30);
  ctx.lineTo(s * 0.30, s * 0.10);
  ctx.quadraticCurveTo(s * 0.24, s * 0.38, 0, s * 0.50);
  ctx.quadraticCurveTo(-s * 0.24, s * 0.38, -s * 0.30, s * 0.10);
  ctx.lineTo(-s * 0.34, -s * 0.30);
  ctx.closePath();
  ctx.fillStyle = '#8a6a44';
  ctx.fill();
  ctx.strokeStyle = '#3d2c1a';
  ctx.lineWidth = r * 0.09;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.30);
  ctx.lineTo(0, s * 0.26);
  ctx.stroke();
  ctx.fillStyle = '#d7a14c';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawAbstractSlashTrail(ctx, cx, cy, radius, angleFrom, angleTo, alpha) {
  ctx.save();
  ctx.strokeStyle = `rgba(255,230,170,${alpha})`;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.70, angleFrom, angleTo);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.55})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.78, angleFrom, angleTo);
  ctx.stroke();
  ctx.restore();
}
