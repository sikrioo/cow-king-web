// 몬스터 무기 동작 (2026-10-11 사용자: 무기 종류마다 휘두르는 동작을 다르게) - 그림만, 맞는 순간(hitAt)·게임 결과는 그대로
//   동작 종류는 data/monsters.js WEAPON_STYLE: thrust 찌르기 / chop 내려치기 / slash 베기 / cast 주문 / bow 활 (큰 무기 big은 monsterWeapons.bigSwingAngle)
//   공격 진행: 예비 동작(0 → hitAt, q 0→1) → 타격(hitAt 순간 가장 멀리) → 되돌아옴(hitAt → attackTime, r 0→1)
//   소 그림 좌표계(손 = (18,-38) 근처, +x = 앞). 난수 없음 - 시간·상태만
import { WEAPON_STYLE } from '../data/monsters.js';
import { drawMonsterWeapon } from './monsterWeapons.js';

const BASE = { x: 18, y: -38, a: -Math.PI / 4 };
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const CAST_GLOW = { staff: '#c9a8ff', rod: '#fff066', firestaff: '#ffb02e', torch: '#ffb02e' };

// 지금 자세: { x, y, a(무기 각도), lunge(몸이 앞으로 쏠림 px), trail: [from, to, alpha] | null, dust(0~1), glow(0~1) }
export function weaponPose(style, attacking, elapsed, motion = {}) {
  const hitAt = motion.hitAt || 0.12, attackTime = motion.attackTime || 0.6;
  if (style === 'cast') { // 지팡이: 평소엔 세워 듦, 마법 쓰는 중엔 치켜들고 끝이 빛남, 근접은 끝으로 툭
    if (motion.casting) return { x: 16, y: -46, a: -1.57, lunge: 0, trail: null, dust: 0, glow: 0.6 + Math.sin(elapsed * 12) * 0.4 };
    if (!attacking) return { x: 18, y: -38, a: -1.3, lunge: 0, trail: null, dust: 0, glow: 0 };
    const poke = Math.sin(Math.min(elapsed / hitAt, 1) * Math.PI / 2) * (elapsed < hitAt ? 1 : Math.max(0, 1 - (elapsed - hitAt) / 0.2));
    return { x: 18 + poke * 10, y: -38, a: -1.3 + poke * 1.1, lunge: poke * 3, trail: null, dust: 0, glow: 0 };
  }
  if (style === 'bow') { // 활: 지금처럼 (조준 중엔 앞으로 겨눔 - 그림에서 attack 상태로 들어옴)
    const poke = attacking ? Math.sin(Math.min(elapsed * 10, Math.PI)) : 0;
    return { x: 18 + poke * 16, y: -38, a: BASE.a + poke * (Math.PI / 4), lunge: 0, trail: null, dust: 0, glow: 0 };
  }
  if (!attacking) return { x: BASE.x, y: BASE.y, a: style === 'thrust' ? -0.08 : BASE.a, lunge: 0, trail: null, dust: 0, glow: 0, idleThrust: style === 'thrust' };
  const q = Math.min(1, elapsed / hitAt);                                        // 예비 동작
  const r = elapsed < hitAt ? -1 : Math.min(1, (elapsed - hitAt) / Math.max(0.05, attackTime - hitAt)); // 되돌아옴
  if (style === 'thrust') { // 찌르기: 뒤로 살짝 당겼다 → 앞으로 쭉 → 천천히 돌아옴
    const x = r < 0 ? BASE.x - 9 * easeOut(q) : BASE.x + 30 * Math.max(0, 1 - r * 1.6);
    return { x, y: BASE.y + 6, a: -0.08, lunge: r < 0 ? -2 * q : 5 * Math.max(0, 1 - r * 2), trail: null, dust: 0, glow: 0 };
  }
  if (style === 'chop') { // 내려치기: 머리 위로 들어 올림 → 위에서 아래로 쾅(흙먼지) → 돌아옴
    let a, y = BASE.y - 8 * (r < 0 ? q : Math.max(0, 1 - r * 3));
    if (r < 0) a = BASE.a + (-1.95 - BASE.a) * easeOut(q);                       // 들어 올림 (거의 수직 위)
    else if (r < 0.15) a = -1.95 + (0.75 + 1.95) * (r / 0.15);                   // 순식간에 내려침
    else a = 0.75 + (BASE.a - 0.75) * ((r - 0.15) / 0.85);                       // 천천히 돌아옴
    const trail = r >= 0 && r < 0.45 ? [-1.95, Math.min(a, 0.75), 0.55 * (1 - r / 0.45)] : null;
    return { x: BASE.x, y, a, lunge: r < 0 ? -2 * q : 4 * Math.max(0, 1 - r * 2), trail, dust: r >= 0.12 && r < 0.5 ? 1 - (r - 0.12) / 0.38 : 0, glow: 0 };
  }
  // slash 베기: 몸 뒤쪽으로 크게 젖혔다 → 앞으로 반원을 그리며 휘두름(궤적) → 돌아옴
  let a;
  if (r < 0) a = BASE.a + (-2.7 - BASE.a) * easeOut(q);
  else if (r < 0.2) a = -2.7 + (1.0 + 2.7) * (r / 0.2);
  else a = 1.0 + (BASE.a - 1.0) * ((r - 0.2) / 0.8);
  const trail = r >= 0 && r < 0.5 ? [-2.7, Math.min(a, 1.0), 0.6 * (1 - r / 0.5)] : null;
  return { x: BASE.x - 4, y: BASE.y + 6, a, lunge: r < 0 ? -2 * q : 5 * Math.max(0, 1 - r * 2), trail, dust: 0, glow: 0 };
}

// 휘두른 궤적: 손을 중심으로 반투명 부채꼴 띠 (주인공 공격 궤적과 같은 느낌)
function drawTrail(ctx, x, y, [from, to, alpha], radius) {
  if (to <= from || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(x, y, radius, from, to);
  ctx.arc(x, y, radius * 0.55, to, from, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 이 무기의 지금 자세 (그리기 전에 먼저 - 몸 쏠림 lunge를 몸에도 적용하려고)
export function poseOf(weapon, attacking, elapsed, motion) {
  return weaponPose(WEAPON_STYLE[weapon] || 'chop', attacking, elapsed, motion);
}

// 무기 하나를 자세(poseOf)대로 그림 + 궤적·지팡이 빛·흙먼지 (소·해골 그림이 같이 씀)
export function drawStyledWeapon(ctx, weapon, p, animT, size = 1) {
  if (p.trail) drawTrail(ctx, p.x, p.y, p.trail, 58 * size);
  drawMonsterWeapon(ctx, weapon, p.x, p.y, 0, animT, size, p.a);
  if (p.glow > 0) { // 지팡이 끝 빛 (지팡이 그림 끝 ≈ 손에서 앞으로 50)
    const tx = p.x + Math.cos(p.a) * 50 * size, ty = p.y + Math.sin(p.a) * 50 * size;
    ctx.save();
    ctx.fillStyle = CAST_GLOW[weapon] || '#ffffff';
    [[12, 0.25], [7, 0.5], [3.5, 0.9]].forEach(([rr, al]) => { ctx.globalAlpha = al * p.glow; ctx.beginPath(); ctx.arc(tx, ty, rr * size, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }
  if (p.dust > 0) { // 내려친 자리 흙먼지 (앞쪽 땅)
    ctx.save();
    ctx.fillStyle = '#c9b48a';
    [[44, 0, 7], [52, -3, 5], [38, -2, 4]].forEach(([dx, dy, rr], i) => {
      ctx.globalAlpha = 0.5 * p.dust;
      ctx.beginPath(); ctx.arc(dx + (1 - p.dust) * (i - 1) * 6, dy - (1 - p.dust) * 6, rr * (1.4 - p.dust * 0.4), 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
}
