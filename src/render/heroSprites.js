// 주인공 그리기 (추상 히어로 포즈/스카프/손·무기/방패/베기 궤적) - 상태를 읽기만 함
import { LEAP_DURATION, SMASH_DURATION, SMASH_IMPACT_TIME } from '../data/balance.js';
import { clamp01, lerpAngle, easeOutCubic } from '../util.js';
import { game } from '../state.js';
import { CLASSES } from '../data/classes.js';
import { drawHeroStaff } from './heroStaff.js';
import { drawAbstractSword, drawHeldShield, drawAbstractSlashTrail } from './heroWeapons.js';
import { WEAPON_HEAVY } from '../data/items.js';

const heroClass = () => CLASSES[game.hero.classKey] || CLASSES.warrior;
const look = () => heroClass().look;

export function drawPlayer(ctx, t = 0, h = game.hero) {
  if (!h.alive) return;
  const flashBlink = h.invuln > 0 && Math.floor(h.invuln * 12) % 2 === 0;

  let jumpHeight = 0;
  if (h.leapTimer > 0) {
    const jt = 1 - h.leapTimer / LEAP_DURATION;
    jumpHeight = Math.sin(jt * Math.PI) * 40;
  }

  const speedN = h.moveSpeedN;
  const fx = Math.cos(h.facing);
  const fy = Math.sin(h.facing);
  const sx = -fy;
  const sy = fx;
  const idle = Math.sin(t * 2.0) * 0.35;
  const rigidBob = Math.abs(Math.sin(h.moveStep)) * speedN * 0.7 + idle;
  const pose = getAbstractHeroPose(t, speedN, h);

  ctx.save();
  ctx.globalAlpha = flashBlink ? 0.35 : 1;
  if (h.flash > 0) ctx.filter = 'brightness(2.15) saturate(0.45)';
  ctx.translate(h.x, h.y);

  const shadowScale = 1 - Math.min(jumpHeight / 60, 0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(0, h.r * 0.90, h.r * (0.95 + speedN * 0.12) * shadowScale,
    h.r * (0.33 - speedN * 0.02) * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (h.moveReaction > 0 && jumpHeight <= 0) {
    ctx.save();
    ctx.globalAlpha = h.moveReaction * 0.16;
    ctx.strokeStyle = '#efe3ca';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, h.r * 0.83,
      h.r * (1.08 + h.moveReaction * 0.50),
      h.r * (0.35 + h.moveReaction * 0.09), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.translate(0, -jumpHeight + rigidBob * 0.2);
  if (h.leapTimer <= 0) {
    ctx.translate(h.moveOffsetX * 0.72, h.moveOffsetY * 0.72);
    ctx.rotate(h.moveLean * 0.75 + pose.bodyTwist);
  }

  drawAbstractScarf(ctx, fx, fy, sx, sy, h.r, speedN, t, h);

  const leftBase = { x: -sx * h.r * 0.67, y: -sy * h.r * 0.67 };
  const rightBase = { x: sx * h.r * 0.67, y: sy * h.r * 0.67 };
  const leftDepth = (-sy > 0 ? 1 : 0);
  const rightDepth = (sy > 0 ? 1 : 0);

  // 오른손 = 주무기, 왼손 = 보조무기 또는 방패 (실제 장착한 것을 그대로 반영)
  const mainGear = h.equipment.weaponMain;
  const offGear = h.equipment.weaponOff;
  const rightHeld = mainGear && mainGear !== 'LOCKED' ? { kind: 'weapon', variant: mainGear.variant || 'sword' }
    : heroClass().staff ? { kind: 'staff', variant: null } : { kind: 'none', variant: null }; // 마법사는 빈손이면 지팡이
  const leftHeld = offGear && offGear !== 'LOCKED'
    ? (offGear.category === 'shield' ? { kind: 'shield', variant: null } : { kind: 'weapon', variant: offGear.variant || 'sword' })
    : { kind: 'none', variant: null };

  if (pose.carry) {
    // 대검을 메고 있음: 칼은 등에 비스듬히 (손잡이는 오른쪽 어깨 위, 칼날은 등을 가로질러 반대쪽 뒤로), 두 손은 빈손으로 몸 옆
    //   칼은 언제나 몸 뒤에 그림 - 위를 볼 때 몸 위에 그리면 칼날이 몸통을 가로질러 캐릭터를 덮음 (사용자 피드백)
    const gx = rightBase.x * 0.55 + fx * h.r * 0.15, gy = rightBase.y * 0.55 + fy * h.r * 0.15;
    const strap = (alpha) => drawAbstractSword(ctx, gx, gy, h.facing + Math.PI - 0.6, h.r, alpha, rightHeld.variant);
    strap(0.95);
    if (leftDepth < rightDepth) drawFloatingHandAndBlade(ctx, leftBase, pose.left, h.r, 0.86, 'none', null, h);
    else drawFloatingHandAndBlade(ctx, rightBase, pose.right, h.r, 0.86, 'none', null, h);
    drawAbstractHeroBody(ctx, fx, fy, sx, sy, h.r, speedN, t, h);
    if (leftDepth >= rightDepth) drawFloatingHandAndBlade(ctx, leftBase, pose.left, h.r, 1, 'none', null, h);
    else drawFloatingHandAndBlade(ctx, rightBase, pose.right, h.r, 1, 'none', null, h);
  } else if (isTwoHanded(h)) {
    // 양손 무기: 몸 가운데 앞에서 두 손으로 쥠 (왼손은 손잡이에 붙음). 위를 보면 칼이 몸 뒤, 아래를 보면 앞
    const centerBase = { x: fx * h.r * 0.12, y: fy * h.r * 0.12 };
    // 한 번 휘두르는 동안 순서를 바꾸지 않음(중간에 손이 앞뒤로 튀지 않게): 위를 보면 몸 뒤, 그 밖은 몸 앞
    const front = fy > -0.25;
    if (!front) drawTwoHandedGrip(ctx, centerBase, pose.right, h.r, 0.9, rightHeld.variant, h);
    drawAbstractHeroBody(ctx, fx, fy, sx, sy, h.r, speedN, t, h);
    if (front) drawTwoHandedGrip(ctx, centerBase, pose.right, h.r, 1, rightHeld.variant, h);
  } else {
    if (leftDepth < rightDepth) drawFloatingHandAndBlade(ctx, leftBase, pose.left, h.r, 0.86, leftHeld.kind, leftHeld.variant, h);
    else drawFloatingHandAndBlade(ctx, rightBase, pose.right, h.r, 0.86, rightHeld.kind, rightHeld.variant, h);

    drawAbstractHeroBody(ctx, fx, fy, sx, sy, h.r, speedN, t, h);

    if (leftDepth >= rightDepth) drawFloatingHandAndBlade(ctx, leftBase, pose.left, h.r, 1, leftHeld.kind, leftHeld.variant, h);
    else drawFloatingHandAndBlade(ctx, rightBase, pose.right, h.r, 1, rightHeld.kind, rightHeld.variant, h);
  }

  if (h.rushTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#ffd27a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-fx * h.r * 1.35, -fy * h.r * 1.35);
    ctx.lineTo(fx * h.r * 1.75, fy * h.r * 1.75);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// 주무기가 양손 무기인지 (대검 등 - 보조 칸이 잠김)
export function isTwoHanded(h = game.hero) {
  const w = h.equipment && h.equipment.weaponMain;
  return !!(w && w !== 'LOCKED' && w.handedness === 'two');
}

// 양손 무기: 오른손 + 칼을 그리고, 왼손을 손잡이(오른손 바로 아래쪽)에 붙여 그림
function drawTwoHandedGrip(ctx, base, handPose, r, alpha, variant, h) {
  drawFloatingHandAndBlade(ctx, base, handPose, r, alpha, 'weapon', variant, h);
  const hx = base.x + Math.cos(handPose.handAngle) * handPose.handDist;
  const hy = base.y + Math.sin(handPose.handAngle) * handPose.handDist;
  const grip = r * handPose.bladeScale * 0.34;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = look().hand;
  ctx.strokeStyle = '#e2ddd1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx - Math.cos(handPose.bladeAngle) * grip, hy - Math.sin(handPose.bladeAngle) * grip, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function getAbstractHeroPose(t, speedN, h = game.hero) {
  // 왼손(보조)에 실제로 무기가 들려있을 때만 "쌍수"로 보고 양손 다 휘두름 - 방패/빈손이면 주무기 쪽만 동작
  const offGear = h.equipment.weaponOff;
  const dualWield = !!(offGear && offGear !== 'LOCKED' && offGear.category === 'weapon');
  const drift = Math.sin(h.moveStep) * speedN * 0.08;
  const pose = {
    bodyTwist: Math.sin(t * 1.4) * 0.008,
    left:  { handAngle: h.facing - 1.02 + drift, handDist: h.r * 0.40, bladeAngle: h.facing - 0.62 + drift, bladeScale: 0.95, trail: null },
    right: { handAngle: h.facing + 1.02 - drift, handDist: h.r * 0.40, bladeAngle: h.facing + 0.62 - drift, bladeScale: 0.95, trail: null }
  };

  if (h.leapTimer > 0) {
    pose.left  = { handAngle: h.facing - 0.24, handDist: h.r * 0.62, bladeAngle: h.facing - 0.10, bladeScale: 1.05, trail: null };
    pose.right = { handAngle: h.facing + 0.24, handDist: h.r * 0.62, bladeAngle: h.facing + 0.10, bladeScale: 1.05, trail: null };
  } else if (h.rushTimer > 0) {
    pose.bodyTwist = 0;
    pose.left  = { handAngle: h.facing - 0.20, handDist: h.r * 0.74, bladeAngle: h.facing - 0.08, bladeScale: 1.08, trail: null };
    pose.right = { handAngle: h.facing + 0.20, handDist: h.r * 0.74, bladeAngle: h.facing + 0.08, bladeScale: 1.08, trail: null };
  } else if (h.smashTimer > 0) {
    const elapsed = SMASH_DURATION - h.smashTimer;
    const p = Math.min(elapsed / SMASH_IMPACT_TIME, 1);
    const open = (1 - p) * 1.20 + 0.22;
    pose.bodyTwist = (1 - p) * -0.08;
    pose.left  = { handAngle: h.facing - open, handDist: h.r * (0.44 + p * 0.28), bladeAngle: h.facing - open * 0.82, bladeScale: 1.02, trail: null };
    pose.right = { handAngle: h.facing + open, handDist: h.r * (0.44 + p * 0.28), bladeAngle: h.facing + open * 0.82, bladeScale: 1.02, trail: null };
  } else if (h.whirlwindTimer > 0) {
    const a = h.whirlAngle;
    pose.bodyTwist = Math.sin(a * 2) * 0.045;
    if (dualWield) {
      pose.left  = { handAngle: a, handDist: h.r * 0.75, bladeAngle: a + 0.15, bladeScale: 1.02, trail: { from: a - 0.55, to: a + 0.14, alpha: 0.18 } };
    } else {
      // 한손무기 + 방패(또는 빈손) - 왼손은 회전시키지 않고 몸 앞에 붙여서 버팀
      pose.left = { handAngle: h.facing - Math.PI * 0.6, handDist: h.r * 0.40, bladeAngle: h.facing - Math.PI * 0.6, bladeScale: 1.0, trail: null };
    }
    pose.right = { handAngle: a + Math.PI, handDist: h.r * 0.75, bladeAngle: a + Math.PI + 0.15, bladeScale: 1.02, trail: { from: a + Math.PI - 0.55, to: a + Math.PI + 0.14, alpha: 0.18 } };
  } else if (h.attackTimer > 0) {
    // h.currentAttackDuration은 콤보로 빨라진 실제 스윙 시간(공격속도 스탯 반영) - 기존 ATTACK_DURATION 대신 사용
    const at = 1 - h.attackTimer / h.currentAttackDuration;
    const wind = easeOutCubic(clamp01(at / 0.18));
    const hit = easeOutCubic(clamp01((at - 0.18) / 0.72));
    const settle = easeOutCubic(clamp01((at - 0.82) / 0.18));

    const l0 = h.facing - 1.55 - wind * 0.16;
    const l1 = h.facing + 0.58;
    const r0 = h.facing + 1.55 + wind * 0.16;
    const r1 = h.facing - 0.58;
    const ra = lerpAngle(r0, r1, hit);
    const ext = h.r * (0.50 + hit * 0.28 - settle * 0.10);

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
      const braceAngle = h.facing - Math.PI * 0.62;
      pose.left = {
        handAngle: braceAngle,
        handDist: h.r * (0.42 + hit * 0.06),
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

  // 양손 무기 (스킬 동작 중이 아닐 때): 평소엔 몸 앞에 비스듬히 세워 들고, 공격은 뒤로 크게 젖혔다가 앞으로 넓게 휩쓺
  const mainW = h.equipment && h.equipment.weaponMain;
  const heavy = isTwoHanded(h) && WEAPON_HEAVY[mainW.variant];
  if (heavy && !(h.leapTimer > 0) && !(h.rushTimer > 0) && !(h.smashTimer > 0) && !(h.whirlwindTimer > 0) && !(h.flurryTimer > 0)) {
    // 대검: 평소엔 등에 멤(칼날이 어깨 너머 뒤로). 공격 = 더 들어 올림 → 멈칫(딜레이) → 뒤에서 오른쪽을 지나 앞으로 크게 내리침 → 앞 아래로 늘어짐
    //   피해가 들어가는 순간 = windup 지점 (combat.updatePendingSwing)과 맞춤
    const carry = h.facing + Math.PI - 0.45;
    if (h.attackTimer > 0) {
      const at = 1 - h.attackTimer / h.currentAttackDuration, w = heavy.windup;
      const raise = easeOutCubic(clamp01(at / (w * 0.5)));               // 들어 올리기 (0 ~ 0.5w)
      const strike = easeOutCubic(clamp01((at - w * 0.77) / 0.22));      // 0.5w ~ 0.77w 멈칫, 그다음 빠르게 내리침 - windup 지점에서 칼이 거의 정면
      const back = h.facing + Math.PI - 0.15;
      const end = h.facing - 0.4;
      const a = strike > 0 ? back + (end - back) * strike : carry + (back - carry) * raise; // 각도를 그대로 보간 → 오른쪽을 지나 휩쓺
      pose.bodyTwist = -0.14 * raise * (1 - strike) + strike * 0.22;
      pose.right = { handAngle: h.facing + 1.2 - strike * 1.3, handDist: h.r * (0.4 + strike * 0.3), bladeAngle: a, bladeScale: 1.0,
        trail: strike > 0 ? { from: a + 0.9, to: a + 0.06, alpha: Math.min(0.4, strike * 0.5) * (1 - clamp01((at - w - 0.2) / 0.2)) } : null };
    } else {
      pose.carry = true; // 메고 있음 - 손은 기본(빈손) 자세 그대로, 칼은 drawPlayer가 등에 그림
    }
  } else if (isTwoHanded(h) && !(h.leapTimer > 0) && !(h.rushTimer > 0) && !(h.smashTimer > 0) && !(h.whirlwindTimer > 0)) {
    if (h.attackTimer > 0) {
      const at = 1 - h.attackTimer / h.currentAttackDuration;
      const wind = easeOutCubic(clamp01(at / 0.25));
      const hit = easeOutCubic(clamp01((at - 0.25) / 0.6));
      const ra = lerpAngle(h.facing + 1.7 + wind * 0.45, h.facing - 1.3, hit);
      pose.bodyTwist = -0.12 * wind + hit * 0.24;
      pose.right = { handAngle: ra + 0.5, handDist: h.r * (0.42 + hit * 0.22), bladeAngle: ra, bladeScale: 1.0,
        trail: { from: ra + 0.75, to: ra + 0.08, alpha: Math.min(0.34, hit * 0.4) } };
    } else {
      const drift = Math.sin(h.moveStep) * speedN * 0.06;
      pose.right = { handAngle: h.facing + 0.9 + drift, handDist: h.r * 0.5, bladeAngle: h.facing - 0.55 + drift * 0.5, bladeScale: 1.0, trail: null };
    }
  }

  return pose;
}

export function drawAbstractScarf(ctx, fx, fy, sx, sy, r, speedN, t, h = game.hero) {
  const sway = Math.sin(t * 4.0 + h.moveStep * 0.35) * r * (0.06 + speedN * 0.08);
  const backX = -fx * r * 0.56;
  const backY = -fy * r * 0.56;
  const tailX = -fx * r * (1.25 + speedN * 0.32) + sx * sway;
  const tailY = -fy * r * (1.25 + speedN * 0.32) + sy * sway;
  ctx.save();
  ctx.strokeStyle = look().scarf[0];
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(backX, backY);
  ctx.quadraticCurveTo(-fx * r * 0.92 + sx * sway * 0.4, -fy * r * 0.92 + sy * sway * 0.4, tailX, tailY);
  ctx.stroke();
  ctx.fillStyle = look().scarf[1];
  ctx.beginPath();
  ctx.moveTo(tailX + sx * r * 0.10, tailY + sy * r * 0.10);
  ctx.lineTo(tailX - fx * r * 0.28, tailY - fy * r * 0.28);
  ctx.lineTo(tailX - sx * r * 0.10, tailY - sy * r * 0.10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawFloatingHandAndBlade(ctx, base, handPose, r, alpha = 1, heldKind = 'weapon', heldVariant = 'sword', h = game.hero) {
  const hx = base.x + Math.cos(handPose.handAngle) * handPose.handDist;
  const hy = base.y + Math.sin(handPose.handAngle) * handPose.handDist;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (handPose.trail && heldKind === 'weapon') {
    drawAbstractSlashTrail(ctx, hx, hy, r * (heldVariant === 'greatsword' ? 3.4 : 2.25), handPose.trail.from, handPose.trail.to, handPose.trail.alpha * alpha);
  }

  ctx.fillStyle = look().hand;
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
  } else if (heldKind === 'staff') {
    drawHeroStaff(ctx, hx, hy, handPose.bladeAngle, r * handPose.bladeScale, alpha, h.renderBreath);
  }
  ctx.restore();
}

export function drawAbstractHeroBody(ctx, fx, fy, sx, sy, r, speedN, t, h = game.hero) {
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
  const lk = look();
  g.addColorStop(0, lk.body[0]);
  g.addColorStop(0.50, lk.body[1]);
  g.addColorStop(1, lk.body[2]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = lk.trim;
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
  ctx.rotate(h.facing);
  ctx.fillStyle = '#12161b';
  ctx.beginPath();
  ctx.roundRect(-r * 0.40, -r * 0.16, r * 0.80, r * 0.32, r * 0.15);
  ctx.fill();

  ctx.fillStyle = lk.eyes;
  ctx.beginPath();
  ctx.ellipse(-r * 0.16, 0, r * 0.075, r * 0.052, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.16, 0, r * 0.075, r * 0.052, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = lk.gem;
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
