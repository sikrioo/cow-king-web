// 몬스터(카우) 그리기 - 상태를 읽기만 함
import { MONSTERS, FLASH_COLORS, weaponScaleOf } from '../data/monsters.js';
import { PALETTE } from '../data/palette.js';
import { drawBigWeapon, bigSwingAngle, BIG_WEAPONS } from './monsterWeapons.js';
import { poseOf, drawStyledWeapon } from './weaponMotion.js';
import { gaitOf, gaitPose } from './gait.js';
import { BOSS_SLAM_TELEGRAPH } from '../data/balance.js';
import { drawSkeletonCow } from './skeletonSprites.js';
import { demonDecor } from './demonSprites.js';
import { drawSoul } from './soulSprites.js';
import { butcherDecor } from './butcherSprites.js';

// decor: { back(ctx, animT), front(ctx, animT) } - 몸 뒤/앞 덧그림 (악마 날개·꼬리·문양 - render/demonSprites.js)
//   weaponSize: 무기 크기 배율 (data/monsters.js WEAPON_SCALE)
//   motion: { hitAt, attackTime, casting } - 무기 동작(render/weaponMotion.js)과 큰 무기 휘두르기의 맞는 순간
export function drawCow(ctx, x, y, scale, state, animT, facing = 1, stateElapsed = 0, colors = null, weapon = 'halberd', decor = null, weaponSize = 1, motion = {}) {
  const hitAt = motion.hitAt || 0.12;
  const hideColor  = colors ? colors.hide  : PALETTE.hide;
  const hornColor  = colors ? colors.horn  : PALETTE.horn;
  const snoutColor = colors ? colors.snout : PALETTE.snout;
  const eyeColor   = colors ? colors.eye   : PALETTE.eye;

  const g = gaitPose(motion.gait || 'hop', state, animT, motion.seed || 0); // 걸음걸이 (render/gait.js)
  const bob = g.bob;
  const shake = state === 'stunned' ? Math.sin(animT * 45) * 3 : 0;
  const big = BIG_WEAPONS.includes(weapon);
  const pose = big ? null : poseOf(weapon, state === 'attack', stateElapsed, motion); // 무기 종류별 동작

  ctx.save();
  ctx.translate(x + shake, y);
  ctx.scale(scale * facing, scale);
  ctx.fillStyle = PALETTE.shadow; // 그림자는 땅에 (몸만 뜸)
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -bob / scale); // 걸음 자세: 뜸·기울기·눌림 (발이 원점 - render/gait.js)
  if (g.tilt) ctx.rotate(g.tilt);
  if (g.sx !== 1 || g.sy !== 1) ctx.scale(g.sx, g.sy);
  if (pose && pose.lunge) ctx.translate(pose.lunge, 0); // 공격 순간 몸이 앞으로 쏠림 (예비 동작엔 살짝 뒤로)

  if (decor && decor.back) decor.back(ctx, animT);
  if (big) drawBigWeapon(ctx, weapon, 26, -32, bigSwingAngle(state === 'attack', stateElapsed, hitAt), weaponSize, animT); // 큰 무기도 몸 뒤 (2026-10-11 사용자)
  else drawStyledWeapon(ctx, weapon, pose, animT, weaponSize);

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

  if (decor && decor.front) decor.front(ctx, animT);
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

// 마법을 쓰는 중인 상태 (지팡이를 치켜들고 끝이 빛남 - render/weaponMotion.js cast)
const CAST_STATES = ['casting', 'zapping', 'nova', 'charging'];

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
    if (c.sheepDead) drawSheep(ctx, p.x, p.y, c.scale * pop, t + c.phase, c.facing, false); // 양 모습 그대로 쓰러짐
    else if (MONSTERS[c.kind] && MONSTERS[c.kind].soul) drawSoul(ctx, p.x, p.y, c.scale * pop, t + c.phase, c.facing, MONSTERS[c.kind].soul);
    else if (MONSTERS[c.kind] && MONSTERS[c.kind].skeleton) drawSkeletonCow(ctx, p.x, p.y, c.scale * pop, 'idle', t + c.phase, c.facing, 0, { king: !!MONSTERS[c.kind].boss, weapon: c.weapon });
    else drawCow(ctx, p.x, p.y, c.scale * pop, 'idle', t + c.phase, c.facing, 0, null, c.weapon);
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

  if (c.excitedTimer > 0) { // 흥분(카우킹 함성) - 발밑 붉은 고리
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(t * 12) * 0.2;
    ctx.strokeStyle = '#ff5b4d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + c.r * 0.5, c.r * 1.1, c.r * 0.5, 0, 0, Math.PI * 2);
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

  const visualState = c.state === 'charging' || c.state === 'aiming' || c.state === 'leaping' || c.state === 'bossCharging' || c.state === 'butcherCharge' ? 'attack' // 돌진(카우킹·도살자)·조준·도약
                     : c.state === 'slamPrep' ? 'attack' // 카우킹 대지 강타: 무기를 치켜들었다 내리침
                     : c.state === 'dazed' ? 'stunned' // 카우킹 벽에 부딪혀 멍함
                     : (c.state === 'telegraph' || c.state === 'recover' || c.state === 'fusing' || c.state === 'zapping') ? 'idle'
                     : c.state;
  const visualElapsed = c.state === 'charging' || c.state === 'aiming' || c.state === 'leaping' || c.state === 'bossCharging' || c.state === 'butcherCharge' ? 0.16 : c.stateElapsed;

  if (c.ccKind === 'poly' && c.stunTimer > 0) { // 변이: 소 대신 양 (체력바는 그대로)
    drawSheep(ctx, c.x, c.y, c.scale, t + c.phase, c.facing, true, c.flash > 0);
  } else {
  ctx.save();
  const colors = c.flash > 0 ? FLASH_COLORS : style.colors;
  if (style.soul) drawSoul(ctx, c.x, c.y, c.scale, t + c.phase, c.facing, style.soul, c.flash > 0, c.state === 'charging' ? Math.min(1, c.stateElapsed / 0.5) : c.state === 'beaming' ? 1 : 0); // 영혼: 불꽃 기둥 (번개를 모으거나 쏘는 동안 밝아짐)
  else if (style.skeleton) drawSkeletonCow(ctx, c.x, c.y, c.scale, visualState, t + c.phase, c.facing, visualElapsed, { king: !!style.boss, flash: c.flash > 0, weapon: c.weapon, stunFn: drawStunDots, shield: !!style.shield, hitAt: c.hitAt, attackTime: c.attackTime, casting: CAST_STATES.includes(c.state), weaponSize: weaponScaleOf(c.kind), gait: gaitOf(c.kind, c.phase), seed: c.phase }); // 해골 카우: 전용 그림
  else drawCow(ctx, c.x, c.y, c.scale, visualState, t + c.phase, c.facing, visualElapsed, colors, c.weapon, style.butcher ? butcherDecor(style.butcher) : style.demon ? demonDecor(style.demon, c) : null, weaponScaleOf(c.kind), { hitAt: c.state === 'slamPrep' ? BOSS_SLAM_TELEGRAPH : c.hitAt, attackTime: c.attackTime, casting: CAST_STATES.includes(c.state), gait: gaitOf(c.kind, c.phase), seed: c.phase }); // 악마: 날개·꼬리·문양, 보스는 큰 무기 (data/monsters.js WEAPON_SCALE), 대지 강타 예고 = 치켜들었다 첫 고리에 내리침
  ctx.restore();
  }

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

// 양 (대규모 변이): 하얀 털뭉치(원 여러 개) + 검은 얼굴·귀·다리. 걸으면 통통 튐. 몸통 높이는 소와 비슷하게(맞는 판정이 그림과 맞게)
export function drawSheep(ctx, x, y, scale, animT, facing = 1, walking = true, flash = false) {
  const bob = walking ? Math.abs(Math.sin(animT * 9)) * 5 : 0;
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale(scale * facing, scale);
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath(); ctx.ellipse(0, 2 + bob / scale, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
  const step = walking ? Math.sin(animT * 9) * 3 : 0;
  ctx.fillStyle = '#2a2a2a'; // 다리
  [[-12, step], [-4, -step], [6, step], [14, -step]].forEach(([lx, dy]) => ctx.fillRect(lx - 2, -14 + dy * 0.3, 4, 14));
  ctx.fillStyle = flash ? '#ffffff' : '#f4f2ec'; // 털
  ctx.strokeStyle = '#d6d2c6';
  ctx.lineWidth = 1.5;
  [[-14, -30, 12], [0, -36, 15], [13, -30, 12], [-7, -22, 11], [8, -21, 11], [0, -27, 14]].forEach(([fx, fy, r]) => {
    ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle = '#2f2b28'; // 얼굴
  ctx.beginPath(); ctx.ellipse(22, -30, 8, 10, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(17, -38, 6, 3, -0.6, 0, Math.PI * 2); ctx.fill(); // 귀
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(24, -32, 1.8, 0, Math.PI * 2); ctx.fill(); // 눈
  ctx.fillStyle = '#f4f2ec';
  ctx.beginPath(); ctx.arc(19, -40, 5, 0, Math.PI * 2); ctx.fill(); // 머리 털
  ctx.restore();
}

