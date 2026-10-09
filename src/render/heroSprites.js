// 주인공 그리기 (추상 히어로 포즈/스카프/손·무기/방패/베기 궤적) - 상태를 읽기만 함
import { LEAP_DURATION } from '../data/balance.js';
import { game, ui } from '../state.js';
import { CLASSES } from '../data/classes.js';
import { drawHeroStaff } from './heroStaff.js';
import { drawAbstractSword, drawHeldShield, drawAbstractSlashTrail, drawThrustTrail } from './heroWeapons.js';
import { getAbstractHeroPose, isTwoHanded, overheadSide, GREATSWORD_HANG } from './heroPose.js';

export { getAbstractHeroPose, isTwoHanded, overheadSide } from './heroPose.js';

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
    const side = overheadSide(h.facing), sb = side > 0 ? rightBase : leftBase; // 휘두를 쪽 어깨에 멤
    const gx = sb.x * 0.55 + fx * h.r * 0.15, gy = sb.y * 0.55 + fy * h.r * 0.15;
    const strap = (alpha) => drawAbstractSword(ctx, gx, gy, h.facing + side * (Math.PI + GREATSWORD_HANG), h.r, alpha, rightHeld.variant);
    strap(0.95);
    drawHandsAndBody(ctx, h, pose, leftBase, rightBase, leftDepth, rightDepth, { kind: 'none' }, { kind: 'none' }, () => drawAbstractHeroBody(ctx, fx, fy, sx, sy, h.r, speedN, t, h));
  } else if (isTwoHanded(h)) {
    // 양손 무기: 몸 가운데 앞에서 두 손으로 쥠 (왼손은 손잡이에 붙음). 위를 보면 칼이 몸 뒤, 아래를 보면 앞
    const centerBase = { x: fx * h.r * 0.12, y: fy * h.r * 0.12 };
    // 한 번 휘두르는 동안 순서를 바꾸지 않음(중간에 손이 앞뒤로 튀지 않게): 위를 보면 몸 뒤, 그 밖은 몸 앞
    const front = ui.heroTopView || fy > -0.25; // 탑뷰 비교 모드면 언제나 몸 위
    if (!front) drawTwoHandedGrip(ctx, centerBase, pose.right, h.r, 0.9, rightHeld.variant, h);
    drawAbstractHeroBody(ctx, fx, fy, sx, sy, h.r, speedN, t, h);
    if (front) drawTwoHandedGrip(ctx, centerBase, pose.right, h.r, 1, rightHeld.variant, h);
  } else {
    drawHandsAndBody(ctx, h, pose, leftBase, rightBase, leftDepth, rightDepth, leftHeld, rightHeld, () => drawAbstractHeroBody(ctx, fx, fy, sx, sy, h.r, speedN, t, h));
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

// 두 손 + 몸 그리기 순서
//   3/4 시점(기본): 화면 뒤쪽 손은 몸 뒤(흐리게), 앞쪽 손은 몸 위 - 위를 보면(등) 앞으로 내민 손이 가려짐
//   탑뷰 비교 모드(ui.heroTopView, 개발자 패널): 몸을 먼저 그리고 두 손 모두 몸 위
function drawHandsAndBody(ctx, h, pose, leftBase, rightBase, leftDepth, rightDepth, leftHeld, rightHeld, drawBody) {
  const hand = (side, alpha) => (side === 'left'
    ? drawFloatingHandAndBlade(ctx, leftBase, pose.left, h.r, alpha, leftHeld.kind, leftHeld.variant, h)
    : drawFloatingHandAndBlade(ctx, rightBase, pose.right, h.r, alpha, rightHeld.kind, rightHeld.variant, h));
  if (ui.heroTopView) { drawBody(); hand('left', 1); hand('right', 1); return; }
  hand(leftDepth < rightDepth ? 'left' : 'right', 0.86);
  drawBody();
  hand(leftDepth >= rightDepth ? 'left' : 'right', 1);
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

  if (handPose.trail && heldKind === 'weapon' && handPose.trail.thrust) {
    drawThrustTrail(ctx, hx, hy, handPose.bladeAngle, r * handPose.trail.len, handPose.trail.alpha * alpha); // 창 찌르기
  } else if (handPose.trail && heldKind === 'weapon') {
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
